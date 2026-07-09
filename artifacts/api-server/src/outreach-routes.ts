// Outreach Routes — Contact Finding, Approval Queue, Sender Profiles, Morning Briefing
import type { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { findDecisionMaker, type DecisionMaker } from "./contact-finder";
import {
  mapMilestoneToTrigger,
  getCountryRegion,
  personaliseEmail,
  buildEmailWithSender,
} from "./prospect-email-templates";
import { emailService } from "./emailService";
import nodemailer from "nodemailer";
import { isSuppressed } from "./suppression";
import crypto from "crypto";
import { authenticateToken } from "./auth";
const authenticateRead = authenticateToken;

// ─── Gmail transporter (per sender) ──────────────────────────────────────────
async function getTransporter() {
  const user = process.env.GMAIL_ADDRESS || process.env.GMAIL_USER || "tolz@eventperfekt.com";
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;
  if (!pass) return null;
  try {
    const t = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await t.verify();
    return t;
  } catch { return null; }
}

// ─── Sender Profile helpers ───────────────────────────────────────────────────
export async function getSenderProfile(country: string | null): Promise<any> {
  const profiles = await db.execute(sql`SELECT * FROM sender_profiles ORDER BY is_default DESC`);
  const rows = profiles.rows as any[];
  if (!rows.length) return null;

  const c = (country || "").toLowerCase().trim();
  const match = rows.find(p =>
    (p.country_codes as string[] || []).some(code => code.toLowerCase() === c)
  );
  return match || rows.find(p => p.is_default) || rows[0];
}

// ─── Draft outreach email ────────────────────────────────────────────────────
export async function draftOutreachEmail(
  prospect: any,
  contact: DecisionMaker
): Promise<{ subject: string; body: string; fromEmail: string; fromName: string; countryGroup: string } | null> {
  try {
    const region = getCountryRegion(prospect.country);
    const trigger = mapMilestoneToTrigger(prospect.milestone_type || "general");
    const sender = await getSenderProfile(prospect.country);
    if (!sender) return null;

    // Get template
    const { getTemplate } = await import("./prospect-email-templates");
    const template = getTemplate(trigger, region);

    // Calculate years if anniversary
    const currentYear = new Date().getFullYear();
    const foundedYear = prospect.founded_year || prospect.foundedYear;
    const years = foundedYear ? currentYear - foundedYear : null;

    // Fill placeholders
    const city = prospect.location || prospect.city || (region === "Nigeria" ? "Lagos" : "London");
    const personalised = personaliseEmail(template, {
      firstName: contact.firstName || contact.name?.split(" ")[0] || "there",
      company: prospect.company_name || prospect.companyName,
      years,
      sector: prospect.industry,
      city,
      milestoneDetail: prospect.milestone_detail,
    });

    // Add AI personalisation sentence (one sentence only)
    let bodyWithPersonalisation = personalised.body;
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 60,
          messages: [
            { role: "system", content: "You are an outreach personalization assistant. Return only one sentence." },
            { role: "user", content: `Add ONE sentence (max 20 words) to personalise an outreach email for ${prospect.company_name || prospect.companyName}, a ${prospect.industry || "business"} company in ${city}. Their trigger: ${prospect.milestone_type}. The sentence should feel natural after the opening paragraph. Return ONLY the sentence, nothing else.` },
          ],
        }),
      });
      const data = await response.json() as any;
      const personSentence = data.choices?.[0]?.message?.content?.trim() || "";
      if (personSentence) {
        const paragraphs = bodyWithPersonalisation.split("\n\n");
        paragraphs.splice(1, 0, personSentence);
        bodyWithPersonalisation = paragraphs.join("\n\n");
      }
    } catch {}

    // Append signature
    const { fullBody } = buildEmailWithSender(personalised.subject, bodyWithPersonalisation, {
      region: sender.region,
      from_email: sender.from_email,
      sender_name: sender.sender_name,
      sender_title: sender.sender_title,
      company_name: sender.company_name,
      website: sender.website,
      signature_block: sender.signature_block,
    });

    return {
      subject: personalised.subject,
      body: fullBody,
      fromEmail: sender.from_email,
      fromName: sender.sender_name,
      countryGroup: region,
    };
  } catch (err: any) {
    console.error("draftOutreachEmail error:", err.message);
    return null;
  }
}

// ─── Unsubscribe token helpers ────────────────────────────────────────────────
function getUnsubSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("UNSUBSCRIBE_SECRET environment variable is required for unsubscribe operations");
  }
  return "dev-only-insecure-unsub-secret";
}

export function makeUnsubscribeToken(email: string): string {
  return crypto.createHmac("sha256", getUnsubSecret()).update(email.toLowerCase()).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = makeUnsubscribeToken(email);
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token)); } catch { return false; }
}

// ─── Send actual email via Gmail ─────────────────────────────────────────────
async function sendViaGmail(opts: {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string; suppressed?: boolean }> {
  // ── Suppression guard (belt-and-braces at SMTP layer) ──────────────────
  if (await isSuppressed(opts.to)) {
    console.warn(`[Suppression] Blocked send to ${opts.to}`);
    return { ok: false, suppressed: true, error: `${opts.to} is on the suppression list` };
  }

  const transporter = await getTransporter();
  if (!transporter) {
    console.warn("⚠️  Gmail not configured — email not sent to", opts.to);
    return { ok: false, error: "Gmail credentials not configured" };
  }
  try {
    const token = makeUnsubscribeToken(opts.to);
    const unsubUrl = `https://eventperfekt.net/unsubscribe?email=${encodeURIComponent(opts.to)}&token=${token}`;
    const unsubMailto = `mailto:marketing@eventperfekt.com?subject=unsubscribe`;

    // Plain text body → convert line breaks to <br> for HTML
    const htmlBody = opts.body.replace(/\n/g, "<br>");
    const unsubFooter = `<br><br><hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="font-size:11px;color:#999;text-align:center;">You received this because we thought your company might be interested in our event planning services.<br><a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></p>`;

    const info = await transporter.sendMail({
      from: `"${opts.fromName}" <${opts.from}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.body + `\n\n---\nTo unsubscribe: ${unsubUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.7;">${htmlBody}${unsubFooter}</div>`,
      headers: {
        "List-Unsubscribe": `<${unsubMailto}>, <${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ─── Morning Briefing ────────────────────────────────────────────────────────
export async function sendMorningBriefing(results: {
  prospectsAdded: number;
  contactsFound: number;
  emailsDrafted: number;
  prospects: Array<{ company_name: string; milestone_type: string; industry: string; location: string; priority: string; }>;
}) {
  try {
    const managers = await db.execute(sql`SELECT id, email, first_name FROM users WHERE role IN ('admin','planner') AND email IS NOT NULL`);
    const rows = managers.rows as any[];

    const highPriority = results.prospects.filter(p => p.priority === "high").slice(0, 5);
    const highRows = highPriority.map(p =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${p.company_name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${p.milestone_type}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${p.industry || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${p.location || "—"}</td>
      </tr>`
    ).join("");

    for (const mgr of rows) {
      const firstName = mgr.first_name || "there";
      const subject = `Good morning — ${results.prospectsAdded} new prospect${results.prospectsAdded !== 1 ? "s" : ""} found today`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
          <div style="background:#330311;color:white;padding:24px 28px;">
            <h1 style="margin:0;font-size:22px;">Event Perfekt</h1>
            <p style="margin:6px 0 0;opacity:0.8;font-size:13px;">Prospecting Agent — Daily Briefing</p>
          </div>
          <div style="padding:28px;background:#fff;">
            <p style="font-size:16px;">Good morning ${firstName},</p>
            <p>Your prospecting agent ran this morning and here's what it found:</p>
            <div style="display:flex;gap:20px;margin:20px 0;">
              <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#330311;">${results.prospectsAdded}</div>
                <div style="color:#666;font-size:13px;">New Prospects</div>
              </div>
              <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#330311;">${results.contactsFound}</div>
                <div style="color:#666;font-size:13px;">Contacts Found</div>
              </div>
              <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#330311;">${results.emailsDrafted}</div>
                <div style="color:#666;font-size:13px;">Emails Ready</div>
              </div>
            </div>
            ${highPriority.length > 0 ? `
              <h3 style="color:#330311;margin-bottom:8px;">High Priority Prospects</h3>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                  <tr style="background:#f0f0f0;">
                    <th style="padding:8px;text-align:left;">Company</th>
                    <th style="padding:8px;text-align:left;">Trigger</th>
                    <th style="padding:8px;text-align:left;">Sector</th>
                    <th style="padding:8px;text-align:left;">Location</th>
                  </tr>
                </thead>
                <tbody>${highRows}</tbody>
              </table>
            ` : ""}
            <div style="margin:28px 0;text-align:center;">
              <a href="https://eventperfekt.net/prospect-finder?tab=approval"
                 style="background:#8B1538;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">
                Review &amp; Approve Emails
              </a>
            </div>
            <p style="color:#999;font-size:12px;">Event Perfekt | www.eventperfekt.com</p>
          </div>
        </div>`;

      // Send via internal email service
      await emailService.sendEmail(mgr.email, subject, html);
    }

    // In-app notification
    await db.execute(sql`
      INSERT INTO notifications (type, message, created_at)
      VALUES ('prospect_briefing', ${`${results.prospectsAdded} new prospects found this morning. ${results.emailsDrafted} emails ready for approval.`}, NOW())
    `).catch(() => {});

    console.log(`✅ Morning briefing sent to ${rows.length} manager(s)`);
  } catch (err: any) {
    console.error("Morning briefing error:", err.message);
  }
}

// ─── Run contact finding + email drafting for a prospect ─────────────────────
export async function runContactAndDraftForProspect(prospectId: number, campaignId?: number | null): Promise<{ contactFound: boolean; emailDrafted: boolean }> {
  let contactFound = false;
  let emailDrafted = false;
  try {
    const res = await db.execute(sql`SELECT * FROM company_prospects WHERE id = ${prospectId}`);
    const prospect = res.rows[0] as any;
    if (!prospect) return { contactFound, emailDrafted };

    // Find contact
    const contact = await findDecisionMaker(
      prospect.company_name,
      prospect.website || null,
      prospect.country || null,
      null
    );

    // Store contact on prospect
    await db.execute(sql`
      UPDATE company_prospects SET
        contact_name = ${contact.name},
        contact_email = ${contact.email ?? null},
        contact_title = ${contact.title},
        contact_linkedin = ${contact.linkedIn ?? null},
        contact_source = ${contact.source},
        contact_confidence = ${contact.confidence},
        contact_data = ${JSON.stringify(contact)}::jsonb,
        contact_found_at = NOW()
      WHERE id = ${prospectId}
    `);
    contactFound = true;

    // Only draft if we have a real email
    const toEmail = contact.email;
    if (!toEmail) return { contactFound, emailDrafted };

    // Draft email
    const draft = await draftOutreachEmail(prospect, contact);
    if (!draft) return { contactFound, emailDrafted };

    // Save as pending approval
    await db.execute(sql`
      INSERT INTO pending_outreach_emails
        (prospect_id, company_name, contact_name, contact_title, to_email, from_email, from_name, subject, body, trigger_type, country_group, campaign_id, status)
      VALUES
        (${prospectId}, ${prospect.company_name}, ${contact.name}, ${contact.title},
         ${toEmail}, ${draft.fromEmail}, ${draft.fromName}, ${draft.subject}, ${draft.body},
         ${mapMilestoneToTrigger(prospect.milestone_type)}, ${draft.countryGroup}, ${campaignId ?? prospect.campaign_id ?? null}, 'pending')
      ON CONFLICT DO NOTHING
    `);
    emailDrafted = true;
  } catch (err: any) {
    console.error(`Contact/draft error for prospect ${prospectId}:`, err.message);
  }
  return { contactFound, emailDrafted };
}

// ─── Schedule follow-up sequence after touch-1 is sent ───────────────────────
// Called by the approve handler once touch 1 is successfully sent.
// Finds the existing AI-generated prospect_sequences row (or creates a simple one)
// and marks it 'active' with a started_at timestamp so the executor can fire.
export async function scheduleSequenceFromApproval(email: any): Promise<void> {
  const prospectId = email.prospect_id;
  if (!prospectId) return;

  // Check if a sequence already exists for this prospect
  const existing = await db.execute(sql`
    SELECT id, status FROM prospect_sequences WHERE prospect_id = ${prospectId} LIMIT 1
  `);
  const existingRow = existing.rows[0] as any;

  if (existingRow) {
    // Activate it, mark started today
    await db.execute(sql`
      UPDATE prospect_sequences
      SET status = 'active', paused = FALSE, started_at = NOW()
      WHERE id = ${existingRow.id}
        AND (status = 'draft' OR status IS NULL OR status = 'pending')
    `);
    console.log(`[Sequence] Activated sequence ${existingRow.id} for prospect ${prospectId}`);
    return;
  }

  // No sequence exists — create a minimal 4-touch placeholder.
  // The executor will draft the actual email copy on each step.
  const seqRes = await db.execute(sql`
    INSERT INTO prospect_sequences (prospect_id, status, started_at, created_at)
    VALUES (${prospectId}, 'active', NOW(), NOW())
    RETURNING id
  `);
  const seqId = seqRes.rows[0] ? (seqRes.rows[0] as any).id : null;
  if (!seqId) return;

  const touchDays = [0, 4, 9, 14];
  const subjects = [null, "Following up", "One more thought", "Should I close the file?"];
  const bodies = [null,
    "Hi {{firstName}},\n\nJust wanted to make sure my previous email landed. We'd love to help make your event truly special.\n\nWould a quick 15-minute call work this week?",
    "Hi {{firstName}},\n\nI wanted to reach out one more time — we've recently delivered some incredible events for companies in your sector and I thought it might be relevant.\n\nHappy to share examples if useful.",
    "Hi {{firstName}},\n\nI don't want to keep filling your inbox, so this will be my last note for now. If timing is ever right to explore what we do, you know where to find us.\n\nAll the best,",
  ];

  for (let i = 1; i <= 4; i++) {
    await db.execute(sql`
      INSERT INTO sequenced_messages (sequence_id, touch_number, channel, scheduled_day, subject, body, status, created_at)
      VALUES (${seqId}, ${i}, 'email', ${touchDays[i - 1]}, ${subjects[i - 1]}, ${bodies[i - 1]}, ${i === 1 ? 'sent' : 'pending'}, NOW())
    `).catch(() => {});
  }

  console.log(`[Sequence] Created 4-touch sequence ${seqId} for prospect ${prospectId}`);
}

// ─── Standalone approve-and-send (used by campaign scheduler + bulk approve) ──
export async function approveAndSendEmail(
  emailId: number,
  approvedBy?: number | null
): Promise<{ ok: boolean; sent: boolean; suppressed?: boolean; warning?: string; error?: string }> {
  const emailRow = await db.execute(sql`SELECT * FROM pending_outreach_emails WHERE id = ${emailId}`);
  const email = emailRow.rows[0] as any;
  if (!email) return { ok: false, sent: false, error: "Email not found" };
  if (email.status !== "pending") return { ok: false, sent: false, error: "Email is not pending" };

  if (await isSuppressed(email.to_email)) {
    await db.execute(sql`
      UPDATE pending_outreach_emails
      SET status = 'rejected', approved_by = ${approvedBy ?? null}, approved_at = NOW(),
          rejection_reason = 'suppressed'
      WHERE id = ${emailId}
    `);
    return { ok: false, sent: false, suppressed: true, warning: `${email.to_email} is on the suppression list` };
  }

  const result = await sendViaGmail({
    to: email.to_email,
    from: email.from_email || "admin@eventperfekt.com",
    fromName: email.from_name || "Event Perfekt",
    subject: email.subject,
    body: email.body,
  });

  if (result.suppressed) {
    await db.execute(sql`
      UPDATE pending_outreach_emails SET status = 'rejected', rejection_reason = 'suppressed',
        approved_by = ${approvedBy ?? null}, approved_at = NOW() WHERE id = ${emailId}
    `);
    return { ok: false, sent: false, suppressed: true, warning: result.error };
  }

  if (!result.ok) {
    await db.execute(sql`
      UPDATE pending_outreach_emails
      SET status = 'approved', approved_by = ${approvedBy ?? null}, approved_at = NOW()
      WHERE id = ${emailId}
    `);
    return { ok: true, sent: false, warning: result.error };
  }

  await db.execute(sql`
    UPDATE pending_outreach_emails
    SET status = 'sent', approved_by = ${approvedBy ?? null}, approved_at = NOW(), sent_at = NOW()
    WHERE id = ${emailId}
  `);

  const touch = email.sequence_touch || 1;
  if (touch === 1) {
    await scheduleSequenceFromApproval(email).catch((err: any) =>
      console.warn("[Sequence] scheduleSequenceFromApproval failed:", err.message)
    );
  }

  await db.execute(sql`
    INSERT INTO prospect_activities (prospect_id, type, subject, content, created_at)
    VALUES (${email.prospect_id}, 'email_sent', ${email.subject},
      ${"Sent to " + email.to_email + " from " + (email.from_name || "Event Perfekt") + " <" + (email.from_email || "") + ">"},
      NOW())
  `).catch(() => {});

  return { ok: true, sent: true };
}

// ─── Register all outreach routes ─────────────────────────────────────────────
export function registerOutreachRoutes(app: Express, authenticateToken: any, optionalAuth?: any) {
  // ── Pending Outreach Emails ──────────────────────────────────────────────
  app.get("/api/pending-outreach", authenticateRead, async (req: any, res) => {
    try {
      const { status = "pending", campaign_id } = req.query;
      let rows;
      if (campaign_id) {
        rows = await db.execute(sql`
          SELECT poe.*, cp.country, cp.industry, cp.milestone_type, cp.location
          FROM pending_outreach_emails poe
          LEFT JOIN company_prospects cp ON cp.id = poe.prospect_id
          WHERE poe.status = ${status} AND poe.campaign_id = ${Number(campaign_id)}
          ORDER BY poe.created_at DESC
        `);
      } else {
        rows = await db.execute(sql`
          SELECT poe.*, cp.country, cp.industry, cp.milestone_type, cp.location
          FROM pending_outreach_emails poe
          LEFT JOIN company_prospects cp ON cp.id = poe.prospect_id
          WHERE poe.status = ${status}
          ORDER BY poe.created_at DESC
        `);
      }
      res.json(rows.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/pending-outreach/count", authenticateRead, async (req: any, res) => {
    try {
      const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM pending_outreach_emails WHERE status = 'pending'`);
      res.json({ count: Number((r.rows[0] as any)?.cnt || 0) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/pending-outreach/:id", authenticateToken, async (req: any, res) => {
    try {
      const { subject, body } = req.body;
      await db.execute(sql`
        UPDATE pending_outreach_emails
        SET subject = COALESCE(${subject ?? null}, subject),
            body = COALESCE(${body ?? null}, body)
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/pending-outreach/:id/approve", authenticateToken, async (req: any, res) => {
    try {
      const emailRow = await db.execute(sql`
        SELECT * FROM pending_outreach_emails WHERE id = ${req.params.id}
      `);
      const email = emailRow.rows[0] as any;
      if (!email) return res.status(404).json({ error: "Email not found" });
      if (email.status !== "pending") return res.status(400).json({ error: "Email is not pending" });

      // ── Route-level suppression guard ────────────────────────────────────
      if (await isSuppressed(email.to_email)) {
        await db.execute(sql`
          UPDATE pending_outreach_emails
          SET status = 'rejected', approved_by = ${req.user?.id ?? null}, approved_at = NOW(),
              rejection_reason = 'suppressed'
          WHERE id = ${req.params.id}
        `);
        return res.json({ ok: false, sent: false, suppressed: true, warning: `${email.to_email} is on the suppression list — email blocked` });
      }

      // Send via Gmail
      const result = await sendViaGmail({
        to: email.to_email,
        from: email.from_email || "admin@eventperfekt.com",
        fromName: email.from_name || "Event Perfekt",
        subject: email.subject,
        body: email.body,
      });

      if (result.suppressed) {
        await db.execute(sql`
          UPDATE pending_outreach_emails SET status = 'rejected', rejection_reason = 'suppressed',
            approved_by = ${req.user?.id ?? null}, approved_at = NOW() WHERE id = ${req.params.id}
        `);
        return res.json({ ok: false, sent: false, suppressed: true, warning: result.error });
      }

      if (!result.ok) {
        // Mark as approved but not sent (no SMTP configured)
        await db.execute(sql`
          UPDATE pending_outreach_emails
          SET status = 'approved', approved_by = ${req.user?.id ?? null}, approved_at = NOW()
          WHERE id = ${req.params.id}
        `);
        return res.json({ ok: true, sent: false, warning: result.error });
      }

      // Mark as sent
      await db.execute(sql`
        UPDATE pending_outreach_emails
        SET status = 'sent', approved_by = ${req.user?.id ?? null}, approved_at = NOW(), sent_at = NOW()
        WHERE id = ${req.params.id}
      `);

      // If this is touch 1 of a sequence, schedule the follow-up steps
      const touch = email.sequence_touch || 1;
      if (touch === 1) {
        await scheduleSequenceFromApproval(email).catch(err =>
          console.warn("[Sequence] scheduleSequenceFromApproval failed:", err.message)
        );
      }

      // Log activity
      await db.execute(sql`
        INSERT INTO prospect_activities (prospect_id, type, subject, content, created_at)
        VALUES (${email.prospect_id}, 'email_sent', ${email.subject},
          ${"Sent to " + email.to_email + " from " + (email.from_name || "Event Perfekt") + " <" + (email.from_email || "") + ">"},
          NOW())
      `).catch(() => {});

      return res.json({ ok: true, sent: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/pending-outreach/:id/reject", authenticateToken, async (req: any, res) => {
    try {
      const { reason } = req.body;
      await db.execute(sql`
        UPDATE pending_outreach_emails
        SET status = 'rejected', approved_by = ${req.user?.id ?? null}, approved_at = NOW(), rejection_reason = ${reason ?? null}
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/company-prospects/:id/sequences", authenticateToken, async (req: any, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM prospect_sequences WHERE prospect_id = ${req.params.id} ORDER BY created_at DESC
      `);
      res.json(rows.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Sender Profiles ──────────────────────────────────────────────────────
  app.get("/api/sender-profiles", authenticateToken, async (_req, res) => {
    try {
      const rows = await db.execute(sql`SELECT * FROM sender_profiles ORDER BY id`);
      res.json(rows.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/sender-profiles/:id", authenticateToken, async (req: any, res) => {
    try {
      const { from_email, sender_name, sender_title, company_name, website, signature_block, country_codes } = req.body;
      await db.execute(sql`
        UPDATE sender_profiles SET
          from_email = COALESCE(${from_email ?? null}, from_email),
          sender_name = COALESCE(${sender_name ?? null}, sender_name),
          sender_title = COALESCE(${sender_title ?? null}, sender_title),
          company_name = COALESCE(${company_name ?? null}, company_name),
          website = COALESCE(${website ?? null}, website),
          signature_block = COALESCE(${signature_block ?? null}, signature_block),
          country_codes = COALESCE(${country_codes ? JSON.stringify(country_codes) + '::text[]' : null}, country_codes),
          updated_at = NOW()
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sender-profiles/:id/test", authenticateToken, async (req: any, res) => {
    try {
      const spRes = await db.execute(sql`SELECT * FROM sender_profiles WHERE id = ${req.params.id}`);
      const sp = spRes.rows[0] as any;
      if (!sp) return res.status(404).json({ error: "Sender profile not found" });

      const testEmail = req.user?.email || "admin@eventperfekt.com";
      const result = await sendViaGmail({
        to: testEmail,
        from: sp.from_email,
        fromName: sp.sender_name,
        subject: `Test email from ${sp.sender_name} (${sp.region})`,
        body: `This is a test email sent from the ${sp.region} sender profile.\n\n${sp.signature_block}`,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Manual contact finding ───────────────────────────────────────────────
  app.post("/api/company-prospects/:id/find-contact", authenticateToken, async (req: any, res) => {
    try {
      const { contactFound, emailDrafted } = await runContactAndDraftForProspect(Number(req.params.id));

      // Return updated prospect
      const updated = await db.execute(sql`SELECT * FROM company_prospects WHERE id = ${req.params.id}`);
      res.json({ ok: true, contactFound, emailDrafted, prospect: updated.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Suppression management routes ────────────────────────────────────────
  app.get("/api/suppressions", authenticateRead, async (req: any, res) => {
    try {
      const { listSuppressions } = await import("./suppression");
      const search = req.query.search as string | undefined;
      const rows = await listSuppressions(search);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/suppressions", authenticateToken, async (req: any, res) => {
    try {
      const { addSuppression } = await import("./suppression");
      const { email, reason, source, notes } = req.body;
      if (!email) return res.status(400).json({ error: "email required" });
      await addSuppression({ email, reason: reason || "manual", source: source || `manual: ${req.user?.email || "admin"}`, notes });
      return res.json({ ok: true });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/suppressions/:email", authenticateToken, async (req: any, res) => {
    try {
      const { removeSuppression } = await import("./suppression");
      await removeSuppression(decodeURIComponent(req.params.email));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Replies inbox routes ─────────────────────────────────────────────────
  app.get("/api/replies", authenticateRead, async (_req: any, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT r.*, cp.company_name FROM inbound_replies r
        LEFT JOIN company_prospects cp ON cp.id = r.prospect_id
        ORDER BY r.received_at DESC LIMIT 200
      `);
      res.json(rows.rows);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/replies/:id", authenticateToken, async (req: any, res) => {
    try {
      const { classification, actioned, notes } = req.body;
      await db.execute(sql`
        UPDATE inbound_replies SET
          classification = COALESCE(${classification ?? null}, classification),
          actioned = COALESCE(${actioned ?? null}, actioned),
          notes = COALESCE(${notes ?? null}, notes),
          classified_at = NOW()
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Trigger a manual inbox poll
  app.post("/api/replies/poll", authenticateToken, async (_req: any, res) => {
    try {
      const { pollMarketingInbox } = await import("./reply-poller");
      const result = await pollMarketingInbox();
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Pause a sequence manually
  app.post("/api/sequences/:id/pause", authenticateToken, async (req: any, res) => {
    try {
      await db.execute(sql`
        UPDATE prospect_sequences
        SET paused = TRUE, paused_reason = 'paused_manual', status = 'paused'
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/sequences/:id/resume", authenticateToken, async (req: any, res) => {
    try {
      await db.execute(sql`
        UPDATE prospect_sequences
        SET paused = FALSE, paused_reason = NULL, status = 'active'
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Draft email for a specific prospect (manual) ─────────────────────────
  app.post("/api/company-prospects/:id/draft-outreach", authenticateToken, async (req: any, res) => {
    try {
      const pRes = await db.execute(sql`SELECT * FROM company_prospects WHERE id = ${req.params.id}`);
      const prospect = pRes.rows[0] as any;
      if (!prospect) return res.status(404).json({ error: "Prospect not found" });

      const contact: DecisionMaker = {
        name: req.body.contactName || prospect.contact_name || "Decision Maker",
        firstName: (req.body.contactName || prospect.contact_name || "").split(" ")[0] || "Decision",
        lastName: (req.body.contactName || prospect.contact_name || "").split(" ").slice(1).join(" ") || "Maker",
        title: prospect.contact_title || "Director",
        email: req.body.toEmail || prospect.contact_email,
        emailPattern: null,
        emailGrade: null,
        linkedIn: prospect.contact_linkedin || null,
        linkedInSearch: "",
        confidence: (prospect.contact_confidence as any) || "Medium",
        source: prospect.contact_source || "Manual",
        sourceNote: "Manually specified",
        alternativeContacts: [],
      };

      const draft = await draftOutreachEmail(prospect, contact);
      if (!draft) return res.status(500).json({ error: "Failed to draft email" });

      return res.json(draft);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}
