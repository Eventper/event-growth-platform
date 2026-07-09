import { type Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { authenticateToken } from "./auth";

const EVENT_KEY = "iamher-2026-08-28";
const ipSubmitCounts = new Map<string, { count: number; resetAt: number }>();

function appBaseUrl(): string {
  // Where the deployed Planning App lives. Override with APP_BASE_URL in Replit Secrets if needed.
  const v = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  return v || "https://eventperfekt.net";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipSubmitCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipSubmitCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
  "throwaway.email", "yopmail.com", "dispostable.com", "getnada.com",
  "sharklasers.com", "fakeinbox.com", "trashmail.com", "maildrop.cc",
]);
const isDisposable = (e: string) => {
  const d = e.split("@")[1]?.toLowerCase();
  return !!d && DISPOSABLE_DOMAINS.has(d);
};

async function sendEmail(to: string, subject: string, html: string, extraCc?: string) {
  try {
    const { sendMail } = await import("./emailService");
    await sendMail(to, subject, html, extraCc, "GB");
  } catch (err: any) {
    // Log every failure here so a swallowed `.catch(() => {})` at the call site
    // can't silently lose a critical email (acceptance, payment confirmation,
    // applicant question). Re-throw to preserve existing call-site behaviour.
    console.error(`[event-applications] email "${subject}" → ${to} FAILED:`, err?.message);
    throw err;
  }
}

// ── Agent enrichment (Edition 1: manual link surfacing + heuristic score) ─────
type EnrichResult = {
  score: number;
  notes: string;
  linkedinData: any;
  instagramData: any;
  companyData: any;
};

function enrichApplication(input: {
  first_name: string; last_name: string; email: string; role: string;
  company?: string; phone?: string; linkedin_url?: string; heard_from?: string;
}): EnrichResult {
  const fullName = `${input.first_name} ${input.last_name}`.trim();
  const co = (input.company || "").trim();
  const roleLower = (input.role || "").toLowerCase();

  // Heuristic 1-5 score (Edition 1 — no scraping, just signal density)
  let score = 1.0;
  if (/director|founder|ceo|owner|head\b|chief|partner|principal|managing/i.test(roleLower)) score += 1.5;
  else if (/manager|lead\b|senior/i.test(roleLower)) score += 0.7;
  if (input.linkedin_url?.trim()) score += 1.0;
  if (co) score += 1.0;
  if (input.phone?.trim()) score += 0.3;
  if (input.heard_from && /referral|invitation|client|partner/i.test(input.heard_from)) score += 0.5;
  score = Math.min(5.0, Math.max(1.0, Math.round(score * 10) / 10));

  // Manual-link surfacing
  const enc = encodeURIComponent;
  const linkedinUrl = input.linkedin_url?.trim() ||
    `https://www.linkedin.com/search/results/people/?keywords=${enc(fullName + (co ? " " + co : ""))}`;
  const instagramSearchUrl = `https://www.google.com/search?q=${enc(`site:instagram.com "${fullName}"${co ? ` "${co}"` : ""}`)}`;
  const companiesHouseUrl = co
    ? `https://find-and-update.company-information.service.gov.uk/search/companies?q=${enc(co)}`
    : null;
  const websiteSearchUrl = co
    ? `https://www.google.com/search?q=${enc(`"${co}" official website`)}`
    : null;

  const provided = input.linkedin_url?.trim() ? "provided by applicant" : "search link suggested";
  const notes = [
    `Applicant: ${fullName}${input.role ? ` — ${input.role}` : ""}${co ? ` at ${co}` : ""}.`,
    `LinkedIn: ${provided}. Instagram + Companies House links surfaced for manual verification.`,
    `Heuristic score ${score}/5 from role seniority signal, link density and referral source.`,
  ].join("\n");

  return {
    score,
    notes,
    linkedinData: { url: linkedinUrl, source: input.linkedin_url ? "applicant" : "search" },
    instagramData: { search_url: instagramSearchUrl, note: "Search result requires manual review (private accounts must be flagged)." },
    companyData: co ? { name: co, companies_house_url: companiesHouseUrl, website_search_url: websiteSearchUrl } : null,
  };
}

// ── Auth guards ───────────────────────────────────────────────────────────────
function requireReviewer(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!["admin", "planner", "manager"].includes(req.user.role)) return res.status(403).json({ message: "Reviewer access required" });
  next();
}
function requireApprover(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Final Approver (admin) access required" });
  next();
}

// ── Email shell ────────────────────────────────────────────────────────────────
function emailShell(body: string) {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.85;background:#ffffff;padding:40px 28px;">
    ${body}
    <hr style="border:none;border-top:1px solid #e8e0d5;margin:36px 0 20px;"/>
    <p style="color:#aaa;font-size:12px;margin:0;font-family:Arial,sans-serif;line-height:1.6;">
      Event Perfekt Global Ltd &middot; 20 Wenlock Road, London, N1 7PG<br/>
      <a href="mailto:adminuk@eventperfekt.com" style="color:#aaa;text-decoration:none;">adminuk@eventperfekt.com</a>
    </p>
  </div>`;
}

// ── ICS calendar invite ────────────────────────────────────────────────────────
function generateICS(): string {
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Event Perfekt//The Woman Who Leads The Room//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `DTSTAMP:${now}`,
    "DTSTART:20260828T173000Z",
    "DTEND:20260828T213000Z",
    "SUMMARY:The Woman Who Leads The Room",
    "DESCRIPTION:An evening for women who lead the room.\\nCurated by Event Perfekt.\\nMilton Keynes.",
    "LOCATION:Milton Keynes\\, UK",
    "ORGANIZER;CN=Event Perfekt:mailto:adminuk@eventperfekt.com",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

async function sendEmailWithIcs(to: string, subject: string, html: string) {
  try {
    const { sendMail } = await import("./emailService");
    await sendMail(to, subject, html, undefined, "GB", [
      {
        filename: "the-woman-who-leads-the-room.ics",
        content: generateICS(),
        contentType: "text/calendar; method=REQUEST",
      },
    ]);
  } catch (err: any) {
    console.error(`[event-applications] calendar email "${subject}" → ${to} FAILED:`, err?.message);
    throw err;
  }
}

// ── Email templates (locked copy) ─────────────────────────────────────────────

// a. Submission acknowledgement
const tplSubmissionAck = (firstName: string) => emailShell(`
  <p style="margin:0 0 20px;">Dear ${firstName},</p>
  <p style="margin:0 0 16px;">Thank you for applying.</p>
  <p style="margin:0 0 16px;">Applications for the evening of <strong>Friday 30 October 2026</strong> are reviewed weekly. You'll hear from us within 7 days.</p>
  <p style="margin:0;">Event Perfekt</p>
`);

// b. Acceptance (token expires 14 days after send)
const tplAcceptance = (firstName: string, inviteUrl: string) => emailShell(`
  <p style="margin:0 0 20px;">Dear ${firstName},</p>
  <p style="margin:0 0 16px;"><strong>Congratulations.</strong></p>
  <p style="margin:0 0 20px;">You have been selected as an esteemed guest of <strong>The Woman Who Leads The Room</strong> — an evening curated for women whose presence shapes the rooms they enter.</p>
  <p style="text-align:center;margin:0 0 20px;">
    <a href="${inviteUrl}" style="display:inline-block;background:#330311;color:#ffffff;text-decoration:none;padding:16px 34px;font-family:Arial,sans-serif;font-weight:bold;font-size:13px;letter-spacing:0.1em;">
      OPEN YOUR PAPERLESS INVITATION
    </a>
  </p>
  <p style="background:#330311;color:#ffffff;padding:14px 20px;text-align:center;font-family:Arial,sans-serif;font-size:13px;letter-spacing:0.08em;margin:0 0 20px;">
    FRIDAY 30 OCTOBER 2026 &nbsp;&middot;&nbsp; MILTON KEYNES &nbsp;&middot;&nbsp; FROM 6:30PM
  </p>
  <p style="margin:0 0 16px;">Your invitation opens with the full animated paperless experience, then your RSVP follows from within the invitation.</p>
  <p style="color:#888;font-size:12px;text-align:center;margin:0 0 20px;">If the button does not work, copy this link: <a href="${inviteUrl}" style="color:#330311;">${inviteUrl}</a></p>
  <p style="margin:0 0 16px;">Your formal invitation follows in June, with everything you need to know about the evening.</p>
  <p style="margin:0 0 20px;">The room is fixed. We look forward to welcoming you.</p>
  <p style="margin:0;">Event Perfekt</p>
`);

// c. Decline
const tplDecline = (firstName: string) => emailShell(`
  <p style="margin:0 0 20px;">Dear ${firstName},</p>
  <p style="margin:0 0 16px;">Thank you for your interest in <strong>The Woman Who Leads The Room</strong>.</p>
  <p style="margin:0 0 16px;">The room is fixed at 100, and on this occasion we are unable to extend an invitation. We curate carefully and decisions reflect fit for this particular room, not merit.</p>
  <p style="margin:0;">Event Perfekt</p>
`);

// d. Need more info
const tplNeedMoreInfo = (firstName: string, question: string, responseUrl: string) => emailShell(`
  <p style="margin:0 0 20px;">Dear ${firstName},</p>
  <p style="margin:0 0 16px;">Thank you for applying. Before we progress, could you share a little more context?</p>
  <blockquote style="background:#f7f3f0;border-left:3px solid #330311;padding:16px 20px;margin:20px 0;font-style:italic;color:#330311;">
    ${question.replace(/\n/g, "<br/>")}
  </blockquote>
  <p style="text-align:center;margin:32px 0;">
    <a href="${responseUrl}" style="background:#330311;color:#ffffff;text-decoration:none;padding:14px 32px;font-family:Arial,sans-serif;font-weight:bold;font-size:13px;letter-spacing:0.08em;display:inline-block;">
      ANSWER THE QUESTION
    </a>
  </p>
  <p style="color:#888;font-size:12px;">Or copy this link: <a href="${responseUrl}" style="color:#330311;">${responseUrl}</a></p>
  <p style="margin:0 0 16px;">A short reply is all we need. Once you reply, your application returns to the review queue immediately.</p>
  <p style="margin:0;">Event Perfekt</p>
`);

// e. Payment confirmation (sent with .ics calendar attachment)
const tplPaymentConfirmation = (firstName: string) => emailShell(`
  <p style="margin:0 0 20px;">Dear ${firstName},</p>
  <p style="margin:0 0 16px;">Your place is confirmed.</p>
  <p style="background:#330311;color:#ffffff;padding:14px 20px;text-align:center;font-family:Arial,sans-serif;font-size:13px;letter-spacing:0.08em;margin:0 0 20px;">
    FRIDAY 30 OCTOBER 2026 &nbsp;&middot;&nbsp; MILTON KEYNES &nbsp;&middot;&nbsp; FROM 6:30PM
  </p>
  <p style="margin:0 0 16px;">Your formal invitation follows in June with everything you need to know — the venue, what to expect, and the women you'll be in the room with.</p>
  <p style="margin:0 0 20px;">Until then, the room thanks you.</p>
  <p style="margin:0;">Event Perfekt</p>
`);

// f. Decline by applicant (applicant steps back from confirmed place)
const tplApplicantDecline = (firstName: string) => emailShell(`
  <p style="margin:0 0 20px;">Dear ${firstName},</p>
  <p style="margin:0 0 16px;">Thank you for letting us know.</p>
  <p style="margin:0 0 20px;">When the timing is right, we would be glad to welcome you to a future edition.</p>
  <p style="margin:0;">Event Perfekt</p>
`);

// ── Routes ────────────────────────────────────────────────────────────────────
export async function registerEventApplicationsRoutes(app: Express) {
  // Migrations — CREATE first, ALTER second (idempotent)
  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_applications (
    id SERIAL PRIMARY KEY,
    event_key TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    linkedin_url TEXT,
    heard_from TEXT,
    marketing_consent BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMP DEFAULT NOW(),
    agent_enriched_at TIMESTAMP,
    agent_score NUMERIC(3,1),
    agent_notes TEXT,
    linkedin_data JSONB,
    instagram_data JSONB,
    company_data JSONB,
    first_reviewer_decision TEXT,
    first_reviewer_note TEXT,
    first_reviewer_actioned_at TIMESTAMP,
    first_reviewer_user_id TEXT,
    final_approver_decision TEXT,
    final_approver_note TEXT,
    final_approver_actioned_at TIMESTAMP,
    final_approver_user_id TEXT,
    final_status TEXT NOT NULL DEFAULT 'pending',
    confirmation_token TEXT UNIQUE,
    confirmed_at TIMESTAMP,
    ip_address TEXT,
    source TEXT
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS event_application_decision_audit (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL,
    actor_user_id TEXT,
    actor_email TEXT,
    actor_role TEXT,
    decision TEXT NOT NULL,
    note TEXT,
    disagrees_with_first_reviewer BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )`);

  // Spec-aligned extensions (idempotent ALTERs — ordered AFTER CREATE)
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS event_id INTEGER`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS held_until TIMESTAMP`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS question_text TEXT`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS question_asked_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS question_answered_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS applicant_response TEXT`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS applicant_response_token TEXT UNIQUE`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS applicant_declined_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS applicant_question TEXT`);
  await db.execute(sql`ALTER TABLE event_applications ADD COLUMN IF NOT EXISTS applicant_question_asked_at TIMESTAMP`);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_event_apps_event_key ON event_applications(event_key)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_event_apps_status ON event_applications(final_status, submitted_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_event_apps_first_decision ON event_applications(first_reviewer_decision)`);

  // ── Public: submit application ───────────────────────────────────────────
  app.post("/api/event-applications/submit", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const { first_name, last_name, email, role, company, phone, linkedin_url, heard_from, marketing_consent, source } = req.body;
      if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !role?.trim()) {
        return res.status(400).json({ message: "Name, email and role are required" });
      }
      if (!marketing_consent) return res.status(400).json({ message: "Please tick the consent box to continue" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });
      if (isDisposable(email)) return res.status(400).json({ message: "Please use a real email address — your formal invitation will be sent here in June 2026." });

      const enriched = enrichApplication({
        first_name, last_name, email, role,
        company, phone, linkedin_url, heard_from,
      });

      const inserted = await db.execute(sql`
        INSERT INTO event_applications (
          event_key, first_name, last_name, email, role, company, phone,
          linkedin_url, heard_from, marketing_consent, ip_address, source,
          agent_enriched_at, agent_score, agent_notes,
          linkedin_data, instagram_data, company_data
        )
        VALUES (
          ${EVENT_KEY},
          ${first_name.trim()}, ${last_name.trim()}, ${email.toLowerCase().trim()}, ${role.trim()},
          ${company?.trim() || null}, ${phone?.trim() || null},
          ${linkedin_url?.trim() || null}, ${heard_from?.trim() || null},
          ${!!marketing_consent}, ${ip}, ${source?.trim() || "direct"},
          NOW(), ${enriched.score}, ${enriched.notes},
          ${JSON.stringify(enriched.linkedinData)}::jsonb,
          ${JSON.stringify(enriched.instagramData)}::jsonb,
          ${enriched.companyData ? JSON.stringify(enriched.companyData) : null}::jsonb
        )
        RETURNING id
      `);

      const appId = (inserted.rows[0] as any).id;

      // Submission acknowledgement
      sendEmail(email.toLowerCase().trim(),
        "Your application — The Woman Who Leads The Room",
        tplSubmissionAck(first_name.trim()),
      ).catch((e) => console.warn("[event-applications] ack email failed:", e.message));

      // Notify reviewer team
      const adminBody = `<div style="font-family:sans-serif;">
        <h3>New application — The Woman Who Leads The Room (30 Oct 2026)</h3>
        <p><strong>Name:</strong> ${first_name} ${last_name}</p>
        <p><strong>Role:</strong> ${role}${company ? ` at ${company}` : ""}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
        ${linkedin_url ? `<p><strong>LinkedIn:</strong> ${linkedin_url}</p>` : ""}
        ${heard_from ? `<p><strong>Heard from:</strong> ${heard_from}</p>` : ""}
        <p><strong>Agent score:</strong> ${enriched.score}/5</p>
        <p style="color:#888;">Review at <a href="${appBaseUrl()}/admin/applications">${appBaseUrl()}/admin/applications</a></p>
      </div>`;
      sendEmail("adminuk@eventperfekt.com",
        `Application — ${first_name} ${last_name}${company ? ` (${company})` : ""}`,
        adminBody,
      ).catch(() => {});

      return res.json({ success: true, application_id: appId });
    } catch (err: any) {
      console.error("[event-applications/submit]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Public: lightweight listing for I Am Her dashboard ───────────────────
  app.get("/api/event-applications", async (req: any, res) => {
    try {
      const eventKey = String(req.query?.eventKey || EVENT_KEY).trim();
      if (eventKey !== EVENT_KEY) {
        return res.status(400).json({ message: "Unsupported eventKey" });
      }

      const rows = await db.execute(sql`
        SELECT id, first_name, last_name, email, company, submitted_at, final_status
        FROM event_applications
        WHERE event_key = ${EVENT_KEY}
        ORDER BY CASE WHEN final_status = 'pending' THEN 0 ELSE 1 END, submitted_at DESC
        LIMIT 500
      `);

      return res.json(rows.rows);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Reviewer queue ───────────────────────────────────────────────────────
  app.get("/api/event-applications/reviewer/queue", authenticateToken, requireReviewer, async (_req: any, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM event_applications
        WHERE event_key = ${EVENT_KEY}
          AND first_reviewer_decision IS NULL
          AND final_status = 'pending'
        ORDER BY submitted_at ASC
      `);
      res.json(rows.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/event-applications/reviewer/decide", authenticateToken, requireReviewer, async (req: any, res) => {
    try {
      const { application_id, decision, note } = req.body;
      if (!application_id || !decision) return res.status(400).json({ message: "application_id and decision are required" });
      if (!["recommend_yes", "recommend_no", "need_more_info"].includes(decision)) {
        return res.status(400).json({ message: "Invalid decision" });
      }
      if (!note?.trim()) return res.status(400).json({ message: "A one-line note is required" });

      const userEmail = req.user.email || req.user.username || "unknown";
      const userId = String(req.user.id || req.user.userId || "");

      if (decision === "need_more_info") {
        // Send question to applicant; do NOT advance status — stays pending until they reply
        const appRow = await db.execute(sql`SELECT first_name, email FROM event_applications WHERE id = ${application_id}`);
        const a: any = appRow.rows[0];
        if (!a) return res.status(404).json({ message: "Application not found" });

        const responseToken = randomUUID();
        await db.execute(sql`UPDATE event_applications SET
          first_reviewer_decision = 'need_more_info',
          first_reviewer_note = ${note.trim()},
          first_reviewer_actioned_at = NOW(),
          first_reviewer_user_id = ${userId},
          question_text = ${note.trim()},
          question_asked_at = NOW(),
          applicant_response_token = ${responseToken}
          WHERE id = ${application_id}`);

        const responseUrl = `${appBaseUrl()}/iamher/apply/respond?token=${responseToken}`;
        sendEmail(a.email,
          "A quick question about your application",
          tplNeedMoreInfo(a.first_name, note.trim(), responseUrl),
        ).catch(() => {});
      } else {
        await db.execute(sql`UPDATE event_applications SET
          first_reviewer_decision = ${decision},
          first_reviewer_note = ${note.trim()},
          first_reviewer_actioned_at = NOW(),
          first_reviewer_user_id = ${userId}
          WHERE id = ${application_id}`);
      }

      await db.execute(sql`INSERT INTO event_application_decision_audit
        (application_id, actor_user_id, actor_email, actor_role, decision, note)
        VALUES (${application_id}, ${userId}, ${userEmail}, 'first_reviewer', ${decision}, ${note.trim()})`);

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[event-applications/reviewer/decide]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Final Approver queue ─────────────────────────────────────────────────
  app.get("/api/event-applications/director/queue", authenticateToken, requireApprover, async (_req: any, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM event_applications
        WHERE event_key = ${EVENT_KEY}
          AND first_reviewer_decision IN ('recommend_yes', 'recommend_no')
          AND final_approver_decision IS NULL
          AND final_status = 'pending'
        ORDER BY first_reviewer_actioned_at ASC
      `);
      res.json(rows.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/event-applications/director/decide", authenticateToken, requireApprover, async (req: any, res) => {
    try {
      const { application_id, decision, note } = req.body;
      if (!application_id || !decision) return res.status(400).json({ message: "application_id and decision are required" });
      if (!["approve", "decline", "override"].includes(decision)) {
        return res.status(400).json({ message: "Invalid decision" });
      }

      const appRow = await db.execute(sql`SELECT * FROM event_applications WHERE id = ${application_id}`);
      const a: any = appRow.rows[0];
      if (!a) return res.status(404).json({ message: "Application not found" });

      // Stage-gate: must have a final reviewer recommendation, must not be finalized
      if (!a.first_reviewer_decision || !["recommend_yes", "recommend_no"].includes(a.first_reviewer_decision)) {
        return res.status(409).json({ message: "Application has not been reviewed by First Reviewer yet" });
      }
      if (a.final_status !== "pending" || a.final_approver_decision) {
        return res.status(409).json({ message: "Application is already finalized" });
      }

      const userEmail = req.user.email || req.user.username || "unknown";
      const userId = String(req.user.id || req.user.userId || "");

      let finalStatus: string;
      let approverDecision: string;
      let disagrees = false;

      if (decision === "approve") {
        finalStatus = "accepted"; approverDecision = "approved";
      } else if (decision === "decline") {
        finalStatus = "declined"; approverDecision = "declined";
      } else { // override — director disagrees with reviewer
        if (a.first_reviewer_decision === "recommend_yes") {
          finalStatus = "declined"; approverDecision = "overridden_decline";
        } else {
          finalStatus = "accepted"; approverDecision = "overridden_accept";
        }
        disagrees = true;
      }

      let confirmationToken: string | null = null;
      if (finalStatus === "accepted") {
        confirmationToken = randomUUID();
        await db.execute(sql`UPDATE event_applications SET
          final_approver_decision = ${approverDecision},
          final_approver_note = ${note?.trim() || null},
          final_approver_actioned_at = NOW(),
          final_approver_user_id = ${userId},
          final_status = ${finalStatus},
          confirmation_token = ${confirmationToken},
          token_expires_at = NOW() + INTERVAL '14 days'
          WHERE id = ${application_id}`);

        const confirmUrl = `${appBaseUrl()}/iamher/apply/confirm?token=${confirmationToken}`;
        sendEmail(a.email,
          "Congratulations — your invitation to The Woman Who Leads The Room",
          tplAcceptance(a.first_name, confirmUrl),
        ).catch(() => {});
      } else {
        await db.execute(sql`UPDATE event_applications SET
          final_approver_decision = ${approverDecision},
          final_approver_note = ${note?.trim() || null},
          final_approver_actioned_at = NOW(),
          final_approver_user_id = ${userId},
          final_status = ${finalStatus}
          WHERE id = ${application_id}`);

        sendEmail(a.email,
          "Thank you for applying",
          tplDecline(a.first_name),
        ).catch(() => {});
      }

      await db.execute(sql`INSERT INTO event_application_decision_audit
        (application_id, actor_user_id, actor_email, actor_role, decision, note, disagrees_with_first_reviewer)
        VALUES (${application_id}, ${userId}, ${userEmail}, 'final_approver', ${decision}, ${note?.trim() || null}, ${disagrees})`);

      return res.json({ success: true, final_status: finalStatus });
    } catch (err: any) {
      console.error("[event-applications/director/decide]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  // ── All processed (for transparency / audit view) ────────────────────────
  app.get("/api/event-applications/all", authenticateToken, requireReviewer, async (_req: any, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM event_applications
        WHERE event_key = ${EVENT_KEY}
        ORDER BY submitted_at DESC
      `);
      res.json(rows.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Public: applicant answers a Need-More-Info question ─────────────────
  app.get("/api/event-applications/respond", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      // Rate-limit to deter token probing
      if (!checkRateLimit(ip)) return res.status(429).json({ success: false, message: "Too many requests. Please try again in a minute." });

      const { token } = req.query;
      if (!token || typeof token !== "string") return res.status(400).json({ success: false, message: "Invalid link." });

      // Only show the question if the application is still pending (not finalized)
      const r = await db.execute(sql`SELECT id, first_name, question_text, applicant_response, question_answered_at
        FROM event_applications
        WHERE applicant_response_token = ${token} AND final_status = 'pending'
        LIMIT 1`);
      if (!r.rows.length) return res.status(404).json({ success: false, message: "This link is invalid or has expired." });
      const a: any = r.rows[0];
      return res.json({
        success: true,
        firstName: a.first_name,
        question: a.question_text,
        alreadyAnswered: !!a.question_answered_at,
        previousResponse: a.applicant_response || null,
      });
    } catch (err: any) { return res.status(500).json({ success: false, message: err.message }); }
  });

  app.post("/api/event-applications/respond", async (req: any, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) return res.status(429).json({ message: "Too many submissions. Please try again in a minute." });

      const { token, response } = req.body;
      if (!token || typeof token !== "string") return res.status(400).json({ message: "Invalid link." });
      if (!response?.trim() || response.trim().length < 5) return res.status(400).json({ message: "Please provide a meaningful response." });

      const r = await db.execute(sql`SELECT id, first_name, email, first_reviewer_note FROM event_applications
        WHERE applicant_response_token = ${token} AND final_status = 'pending' LIMIT 1`);
      if (!r.rows.length) return res.status(404).json({ message: "This link is invalid or has expired." });
      const a: any = r.rows[0];

      // Re-queue: clear first_reviewer_decision so it returns to pending queue, append answer to notes
      await db.execute(sql`UPDATE event_applications SET
        applicant_response = ${response.trim()},
        question_answered_at = NOW(),
        first_reviewer_decision = NULL,
        first_reviewer_note = NULL,
        first_reviewer_actioned_at = NULL,
        first_reviewer_user_id = NULL,
        agent_notes = COALESCE(agent_notes, '') || E'\n\n--- Applicant response (' || NOW()::text || ') ---\n' || ${response.trim()}
        WHERE id = ${a.id}`);

      await db.execute(sql`INSERT INTO event_application_decision_audit
        (application_id, actor_email, actor_role, decision, note)
        VALUES (${a.id}, ${a.email}, 'applicant', 'answered_question', ${response.trim()})`);

      // Notify reviewers
      sendEmail("adminuk@eventperfekt.com",
        `Reply received — application #${a.id} (${a.first_name})`,
        `<div style="font-family:sans-serif;">
          <h3>${a.first_name} has answered your Need-More-Info question</h3>
          <p><strong>Question:</strong><br/>${(a.first_reviewer_note || "(see application)").replace(/\n/g, "<br/>")}</p>
          <p><strong>Reply:</strong><br/>${response.trim().replace(/\n/g, "<br/>")}</p>
          <p>Application is back in the First Reviewer queue: <a href="${appBaseUrl()}/admin/applications">${appBaseUrl()}/admin/applications</a></p>
        </div>`,
      ).catch(() => {});

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[event-applications/respond]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Admin: fire all 6 email templates to adminuk@ for preview ───────────
  app.post("/api/event-applications/test-emails", authenticateToken, requireApprover, async (_req: any, res) => {
    const TO = "adminuk@eventperfekt.com";
    const FIRST = "Tolu";
    const confirmUrl = `${appBaseUrl()}/iamher/apply/confirm?token=PREVIEW-TOKEN`;
    const responseUrl = `${appBaseUrl()}/iamher/apply/respond?token=PREVIEW-TOKEN`;
    try {
      await sendEmail(TO, "[TEST a] Your application — The Woman Who Leads The Room", tplSubmissionAck(FIRST));
      await sendEmail(TO, "[TEST b] Congratulations — your invitation to The Woman Who Leads The Room", tplAcceptance(FIRST, confirmUrl));
      await sendEmail(TO, "[TEST c] Thank you for applying", tplDecline(FIRST));
      await sendEmail(TO, "[TEST d] A quick question about your application", tplNeedMoreInfo(FIRST, "Could you tell us a little more about your current role and what brings you to this particular evening?", responseUrl));
      await sendEmailWithIcs(TO, "[TEST e] Confirmed — we'll see you on the 6th", tplPaymentConfirmation(FIRST));
      await sendEmail(TO, "[TEST f] Until next time", tplApplicantDecline(FIRST));
      res.json({ success: true, message: "All 6 test emails sent to adminuk@eventperfekt.com" });
    } catch (err: any) {
      console.error("[test-emails]", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ── Public: load confirmation page state (non-destructive) ──────────────
  app.get("/api/event-applications/confirm-details", async (req: any, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") return res.status(400).json({ success: false, reason: "invalid" });

      const result = await db.execute(sql`
        SELECT id, first_name, last_name, email, role, company,
               paid_at, confirmed_at, applicant_declined_at,
               held_until, token_expires_at, final_status
        FROM event_applications
        WHERE confirmation_token = ${token} LIMIT 1
      `);
      if (!result.rows.length) return res.status(404).json({ success: false, reason: "invalid" });

      const row: any = result.rows[0];

      if (row.final_status !== "accepted") {
        return res.status(410).json({ success: false, reason: "not_accepted" });
      }
      if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
        return res.status(410).json({ success: false, reason: "expired" });
      }
      if (row.applicant_declined_at) {
        return res.json({ success: true, reason: "applicant_declined", firstName: row.first_name });
      }
      if (row.paid_at) {
        return res.json({ success: true, reason: "paid", firstName: row.first_name });
      }

      return res.json({
        success: true,
        reason: "ready",
        firstName: row.first_name,
        lastName: row.last_name,
        heldUntil: row.held_until || null,
        tokenExpiresAt: row.token_expires_at || null,
      });
    } catch (err: any) { return res.status(500).json({ success: false, reason: "error", message: err.message }); }
  });

  // ── Public: legacy confirm GET (kept for backward compat) ────────────────
  app.get("/api/event-applications/confirm", async (req: any, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") return res.status(400).json({ success: false, message: "Invalid confirmation link." });

      const result = await db.execute(sql`
        SELECT id, first_name, paid_at, applicant_declined_at, token_expires_at, final_status
        FROM event_applications
        WHERE confirmation_token = ${token} LIMIT 1
      `);
      if (!result.rows.length) return res.status(404).json({ success: false, message: "This confirmation link is invalid or has expired." });

      const row: any = result.rows[0];
      if (row.final_status !== "accepted") return res.status(410).json({ success: false, message: "This link is no longer valid." });
      if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
        return res.status(410).json({ success: false, message: "This confirmation link has expired. Please contact adminuk@eventperfekt.com." });
      }
      if (row.paid_at) return res.json({ success: true, alreadyConfirmed: true, firstName: row.first_name });

      return res.json({ success: true, alreadyConfirmed: false, firstName: row.first_name });
    } catch (err: any) { return res.status(500).json({ success: false, message: err.message }); }
  });

  // ── Public: create Stripe checkout session ───────────────────────────────
  app.post("/api/event-applications/checkout", async (req: any, res) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") return res.status(400).json({ success: false, message: "Invalid token." });

      const result = await db.execute(sql`
        SELECT id, first_name, email, paid_at, applicant_declined_at, token_expires_at, final_status
        FROM event_applications WHERE confirmation_token = ${token} LIMIT 1
      `);
      if (!result.rows.length) return res.status(404).json({ success: false, message: "Invitation not found." });
      const row: any = result.rows[0];
      if (row.final_status !== "accepted") return res.status(410).json({ success: false, message: "This invitation is no longer valid." });
      if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
        return res.status(410).json({ success: false, message: "This invitation has expired." });
      }
      if (row.paid_at) return res.status(409).json({ success: false, message: "Your place is already confirmed." });
      if (row.applicant_declined_at) return res.status(409).json({ success: false, message: "You have already declined this invitation." });

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(503).json({
          success: false,
          message: "Online payment is not yet active. Please contact adminuk@eventperfekt.com to arrange your £100 attendance fee.",
          contactOnly: true,
        });
      }

      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as any });

      const base = appBaseUrl();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: {
              name: "The Woman Who Leads The Room — Attendance",
              description: "Friday 30 October 2026 · Milton Keynes · From 6:30pm",
            },
            unit_amount: 10000, // £100 in pence
          },
          quantity: 1,
        }],
        mode: "payment",
        customer_email: row.email,
        success_url: `${base}/iamher/apply/confirm?token=${encodeURIComponent(token)}&paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/iamher/apply/confirm?token=${encodeURIComponent(token)}`,
        metadata: { confirmation_token: token, application_id: String(row.id) },
      });

      return res.json({ success: true, url: session.url });
    } catch (err: any) {
      console.error("[event-applications/checkout]", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // ── Public: verify Stripe payment and confirm place ──────────────────────
  app.post("/api/event-applications/verify-payment", async (req: any, res) => {
    try {
      const { token, session_id } = req.body;
      if (!token || !session_id) return res.status(400).json({ success: false, message: "Missing token or session." });

      const result = await db.execute(sql`
        SELECT id, first_name, email, paid_at, final_status, token_expires_at
        FROM event_applications WHERE confirmation_token = ${token} LIMIT 1
      `);
      if (!result.rows.length) return res.status(404).json({ success: false, message: "Invitation not found." });
      const row: any = result.rows[0];
      if (row.paid_at) return res.json({ success: true, alreadyPaid: true, firstName: row.first_name });

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(503).json({ success: false, message: "Payment verification unavailable." });

      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as any });

      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status !== "paid") {
        return res.status(400).json({ success: false, message: "Payment has not completed." });
      }
      if ((session.metadata as any)?.confirmation_token !== token) {
        return res.status(400).json({ success: false, message: "Session mismatch." });
      }

      await db.execute(sql`UPDATE event_applications SET
        paid_at = NOW(),
        confirmed_at = NOW(),
        stripe_session_id = ${session_id},
        stripe_payment_intent_id = ${String(session.payment_intent || "")}
        WHERE confirmation_token = ${token}`);

      // Send payment confirmation email with .ics calendar attachment
      sendEmailWithIcs(
        row.email,
        "Confirmed — we'll see you on the 6th",
        tplPaymentConfirmation(row.first_name),
      ).catch((e) => console.warn("[verify-payment] confirmation email failed:", e.message));

      // Notify admin
      sendEmail("adminuk@eventperfekt.com",
        `Payment received — ${row.first_name} (application #${row.id})`,
        `<div style="font-family:sans-serif;"><p><strong>${row.first_name}</strong> has paid £100 and confirmed their place.</p>
        <p>Email: ${row.email}</p><p>Stripe session: ${session_id}</p></div>`,
      ).catch(() => {});

      return res.json({ success: true, firstName: row.first_name });
    } catch (err: any) {
      console.error("[event-applications/verify-payment]", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // ── Public: applicant asks a question (holds place 3 days) ───────────────
  app.post("/api/event-applications/ask-question", async (req: any, res) => {
    try {
      const { token, question } = req.body;
      if (!token || typeof token !== "string") return res.status(400).json({ success: false, message: "Invalid token." });
      if (!question?.trim() || question.trim().length < 5) {
        return res.status(400).json({ success: false, message: "Please provide your question (at least 5 characters)." });
      }

      const result = await db.execute(sql`
        SELECT id, first_name, email, paid_at, applicant_declined_at, token_expires_at, final_status
        FROM event_applications WHERE confirmation_token = ${token} LIMIT 1
      `);
      if (!result.rows.length) return res.status(404).json({ success: false, message: "Invitation not found." });
      const row: any = result.rows[0];
      if (row.final_status !== "accepted") return res.status(410).json({ success: false, message: "This invitation is no longer valid." });
      if (row.paid_at) return res.status(409).json({ success: false, message: "You've already confirmed your place." });
      if (row.applicant_declined_at) return res.status(409).json({ success: false, message: "You have already declined this invitation." });

      // Extend token by 3 days from now (hold the place)
      await db.execute(sql`UPDATE event_applications SET
        held_until = NOW() + INTERVAL '3 days',
        token_expires_at = GREATEST(COALESCE(token_expires_at, NOW()), NOW()) + INTERVAL '3 days',
        applicant_question = ${question.trim()},
        applicant_question_asked_at = NOW()
        WHERE confirmation_token = ${token}`);

      // Route question to adminuk
      sendEmail("adminuk@eventperfekt.com",
        `Question before confirming — ${row.first_name} (application #${row.id})`,
        `<div style="font-family:sans-serif;">
          <p><strong>${row.first_name}</strong> has asked a question before confirming their place.</p>
          <p><strong>Email:</strong> ${row.email}</p>
          <p><strong>Question:</strong><br/>${question.trim().replace(/\n/g, "<br/>")}</p>
          <p style="color:#888;">Their place is held for 3 days.</p>
        </div>`,
      ).catch(() => {});

      // Acknowledge to applicant
      sendEmail(row.email,
        "We've received your question",
        emailShell(`
          <p style="margin:0 0 20px;">Dear ${row.first_name},</p>
          <p style="margin:0 0 16px;">Thank you — we have your question and will reply by email within 24 hours.</p>
          <p style="margin:0 0 16px;">Your place is held for 3 days while we respond.</p>
          <p style="margin:0;">Event Perfekt</p>
        `),
      ).catch(() => {});

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[event-applications/ask-question]", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // ── Public: applicant declines confirmed invitation ──────────────────────
  app.post("/api/event-applications/applicant-decline", async (req: any, res) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") return res.status(400).json({ success: false, message: "Invalid token." });

      const result = await db.execute(sql`
        SELECT id, first_name, email, paid_at, applicant_declined_at, final_status
        FROM event_applications WHERE confirmation_token = ${token} LIMIT 1
      `);
      if (!result.rows.length) return res.status(404).json({ success: false, message: "Invitation not found." });
      const row: any = result.rows[0];
      if (row.final_status !== "accepted") return res.status(410).json({ success: false, message: "This invitation is no longer valid." });
      if (row.paid_at) return res.status(409).json({ success: false, message: "You have already confirmed. Please email adminuk@eventperfekt.com if you need to cancel." });
      if (row.applicant_declined_at) return res.json({ success: true, alreadyDeclined: true, firstName: row.first_name });

      await db.execute(sql`UPDATE event_applications SET
        applicant_declined_at = NOW(),
        final_status = 'applicant_declined'
        WHERE confirmation_token = ${token}`);

      // Email f — decline by applicant
      sendEmail(row.email,
        "Until next time",
        tplApplicantDecline(row.first_name),
      ).catch(() => {});

      // Notify admin so the place can be reallocated
      sendEmail("adminuk@eventperfekt.com",
        `Place released — ${row.first_name} declined (application #${row.id})`,
        `<div style="font-family:sans-serif;">
          <p><strong>${row.first_name}</strong> (${row.email}) has declined their invitation.</p>
          <p>Their place is now available for reallocation.</p>
        </div>`,
      ).catch(() => {});

      return res.json({ success: true, firstName: row.first_name });
    } catch (err: any) {
      console.error("[event-applications/applicant-decline]", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });
}

// Helper used by the legacy /interest mirror
export async function mirrorInterestToApplications(input: {
  first_name: string; last_name: string; email: string; role: string;
  company?: string; phone?: string; linkedin?: string; source?: string;
  consent_marketing: boolean; ip_address: string;
}): Promise<number | null> {
  try {
    const enriched = enrichApplication({
      first_name: input.first_name, last_name: input.last_name,
      email: input.email, role: input.role,
      company: input.company, phone: input.phone,
      linkedin_url: input.linkedin, heard_from: input.source,
    });

    const r = await db.execute(sql`
      INSERT INTO event_applications (
        event_key, first_name, last_name, email, role, company, phone,
        linkedin_url, heard_from, marketing_consent, ip_address, source,
        agent_enriched_at, agent_score, agent_notes,
        linkedin_data, instagram_data, company_data
      ) VALUES (
        ${EVENT_KEY}, ${input.first_name}, ${input.last_name},
        ${input.email.toLowerCase()}, ${input.role},
        ${input.company || null}, ${input.phone || null},
        ${input.linkedin || null}, ${input.source || null},
        ${input.consent_marketing}, ${input.ip_address}, ${input.source || "iamher-interest"},
        NOW(), ${enriched.score}, ${enriched.notes},
        ${JSON.stringify(enriched.linkedinData)}::jsonb,
        ${JSON.stringify(enriched.instagramData)}::jsonb,
        ${enriched.companyData ? JSON.stringify(enriched.companyData) : null}::jsonb
      )
      RETURNING id
    `);
    return (r.rows[0] as any)?.id || null;
  } catch (err: any) {
    console.warn("[mirrorInterestToApplications] failed:", err.message);
    return null;
  }
}
