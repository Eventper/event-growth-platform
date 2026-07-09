/**
 * Reply Poller — polls the marketing inbox every 15 minutes
 * ---------------------------------------------------------
 * Reads unseen messages via IMAP, matches them to outbound emails,
 * classifies them with AI, and applies action rules (suppress, pause, engage).
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { readMarketingInbox } from "./marketing-email";
import { addSuppression } from "./suppression";

// Track last poll time to limit IMAP fetch scope
let lastPollAt: Date = new Date(Date.now() - 24 * 60 * 60 * 1000); // start: 24h ago

export type ReplyClassification =
  | "positive"
  | "not_now"
  | "unsubscribe"
  | "out_of_office"
  | "auto_reply"
  | "unclassified";

// ─── Minimal RFC 2822 header parser ─────────────────────────────────────────
function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let current = "";
  for (const line of lines) {
    if (line === "") break; // end of headers
    if (/^\s/.test(line) && current) {
      // Continuation
      headers[current] = (headers[current] || "") + " " + line.trim();
    } else {
      const colon = line.indexOf(":");
      if (colon > 0) {
        current = line.slice(0, colon).trim().toLowerCase();
        headers[current] = line.slice(colon + 1).trim();
      }
    }
  }
  return headers;
}

function extractBody(raw: string): string {
  const parts = raw.replace(/\r\n/g, "\n").split("\n\n");
  // Skip header block, return first non-empty body part (plain text preferred)
  const body = parts.slice(1).join("\n\n").slice(0, 2000);
  // Strip MIME boundaries and HTML tags crudely
  return body.replace(/<[^>]+>/g, "").replace(/--[A-Za-z0-9_-]+/g, "").trim();
}

// ─── AI classifier ───────────────────────────────────────────────────────────
async function classifyReply(subject: string, bodyText: string): Promise<ReplyClassification> {
  const OPENAI_KEY =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY;

  if (!OPENAI_KEY) return "unclassified";

  const prompt = `Classify this email reply into EXACTLY one of these categories and respond with ONLY the category word:
- positive: shows genuine interest, asks questions, wants to talk or meet
- not_now: polite decline, asks to contact later, not right now
- unsubscribe: any "remove me", "stop", "unsubscribe", "do not contact", "take me off", "not relevant", "don't contact me", "no longer relevant", "opt out"
- out_of_office: standard vacation, OOO, annual leave, maternity/paternity auto-reply
- auto_reply: other automated system reply, delivery notification, bounce message
- unclassified: none of the above, needs human review

Subject: ${subject.slice(0, 200)}

Body: ${bodyText.slice(0, 600)}

Classification:`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 10,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json()) as any;
    const raw = (data.choices?.[0]?.message?.content || "").trim().toLowerCase();
    const valid: ReplyClassification[] = [
      "positive", "not_now", "unsubscribe", "out_of_office", "auto_reply", "unclassified",
    ];
    return valid.includes(raw as ReplyClassification)
      ? (raw as ReplyClassification)
      : "unclassified";
  } catch {
    return "unclassified";
  }
}

// ─── Match from_email to a prospect ─────────────────────────────────────────
async function matchProspect(fromEmail: string): Promise<number | null> {
  const rows = await db.execute(sql`
    SELECT id FROM company_prospects
    WHERE LOWER(contact_email) = LOWER(${fromEmail})
    LIMIT 1
  `);
  const row = rows.rows[0] as any;
  return row?.id ?? null;
}

// ─── Match In-Reply-To against sent outbound emails ─────────────────────────
async function matchOutboundEmail(inReplyTo: string | null): Promise<number | null> {
  if (!inReplyTo) return null;
  const rows = await db.execute(sql`
    SELECT id FROM pending_outreach_emails
    WHERE smtp_message_id = ${inReplyTo}
    LIMIT 1
  `);
  const row = rows.rows[0] as any;
  return row?.id ?? null;
}

// ─── Apply action rules after classification ─────────────────────────────────
async function applyAction(
  classification: ReplyClassification,
  fromEmail: string,
  prospectId: number | null
): Promise<void> {
  if (classification === "unsubscribe") {
    await addSuppression({
      email: fromEmail,
      reason: "unsubscribe",
      source: "reply: unsubscribe request",
    });
    if (prospectId) {
      // Pause active sequences for this prospect
      await db.execute(sql`
        UPDATE prospect_sequences SET status = 'cancelled', paused = TRUE, paused_reason = 'unsubscribed'
        WHERE prospect_id = ${prospectId} AND status IN ('active', 'draft', 'pending')
      `);
    }
    console.log(`[Reply] Unsubscribe action for ${fromEmail}: suppressed + sequences cancelled`);
    return;
  }

  if (classification === "positive") {
    if (prospectId) {
      await db.execute(sql`
        UPDATE company_prospects SET status = 'contacted' WHERE id = ${prospectId}
      `).catch(() => {});
      // Pause sequence so Tolu can take it from here
      await db.execute(sql`
        UPDATE prospect_sequences SET status = 'paused', paused = TRUE, paused_reason = 'positive_reply'
        WHERE prospect_id = ${prospectId} AND status = 'active'
      `).catch(() => {});
    }
    console.log(`[Reply] Positive reply from ${fromEmail} — sequence paused, flagged for review`);
    return;
  }

  if (classification === "not_now") {
    if (prospectId) {
      // Pause + set re-engage date 90 days out
      const reEngageAt = new Date();
      reEngageAt.setDate(reEngageAt.getDate() + 90);
      await db.execute(sql`
        UPDATE prospect_sequences SET status = 'paused', paused = TRUE, paused_reason = 'not_now'
        WHERE prospect_id = ${prospectId} AND status = 'active'
      `).catch(() => {});
      await db.execute(sql`
        UPDATE company_prospects SET re_engage_at = ${reEngageAt.toISOString()}
        WHERE id = ${prospectId}
      `).catch(() => {});
    }
    console.log(`[Reply] Not-now reply from ${fromEmail} — re-engage in 90 days`);
    return;
  }

  if (classification === "auto_reply") {
    await addSuppression({
      email: fromEmail,
      reason: "auto_reply",
      source: "reply: automated system reply / bot",
    });
    console.log(`[Reply] Auto-suppressed ${fromEmail} — automated reply detected`);
    return;
  }

  // out_of_office, unclassified → no sequence change (OOO = they'll be back)
  console.log(`[Reply] Classification ${classification} for ${fromEmail} — no action taken`);
}

// ─── Main polling function ────────────────────────────────────────────────────
export async function pollMarketingInbox(): Promise<{
  processed: number;
  errors: number;
  classifications: Record<string, number>;
}> {
  const since = lastPollAt;
  const processed: { classification: ReplyClassification }[] = [];
  let errors = 0;

  let messages: any[] = [];
  try {
    messages = await readMarketingInbox({ since });
  } catch (err: any) {
    console.error("[ReplyPoller] IMAP connect error:", err.message);
    return { processed: 0, errors: 1, classifications: {} };
  }

  console.log(`[ReplyPoller] Fetched ${messages.length} message(s) since ${since.toISOString()}`);

  for (const msg of messages) {
    try {
      const raw: string = msg.raw || "";
      const headers = parseHeaders(raw);
      const fromEmail = (headers["from"] || "").match(/<([^>]+)>/)?.[1] || headers["from"] || "";
      const subject = headers["subject"] || "(no subject)";
      const inReplyTo = headers["in-reply-to"] || null;
      const messageId = headers["message-id"] || null;
      const bodyText = extractBody(raw);

      if (!fromEmail) continue;

      // Deduplicate: skip if message_id already in DB
      if (messageId) {
        const exists = await db.execute(sql`
          SELECT id FROM inbound_replies WHERE message_id = ${messageId} LIMIT 1
        `);
        if ((exists.rows as any[]).length > 0) continue;
      }

      // Match to prospect and outbound email
      const prospectId = await matchProspect(fromEmail);
      const outboundEmailId = await matchOutboundEmail(inReplyTo);

      // Classify
      const classification = await classifyReply(subject, bodyText);

      // Insert reply record
      await db.execute(sql`
        INSERT INTO inbound_replies
          (message_id, in_reply_to, from_email, subject, body_text, received_at,
           prospect_id, outbound_email_id, classification, classified_at)
        VALUES
          (${messageId}, ${inReplyTo}, ${fromEmail.toLowerCase()}, ${subject}, ${bodyText.slice(0, 4000)},
           NOW(), ${prospectId}, ${outboundEmailId}, ${classification}, NOW())
      `);

      // Apply actions
      await applyAction(classification, fromEmail, prospectId);

      processed.push({ classification });
    } catch (err: any) {
      console.error("[ReplyPoller] Error processing message:", err.message);
      errors++;
    }
  }

  // Update last poll time
  lastPollAt = new Date();

  // Tally classifications
  const counts: Record<string, number> = {};
  for (const p of processed) {
    counts[p.classification] = (counts[p.classification] || 0) + 1;
  }

  console.log(`[ReplyPoller] Done — ${processed.length} processed, ${errors} errors`, counts);
  return { processed: processed.length, errors, classifications: counts };
}

// ─── Schedule to run every 15 minutes ────────────────────────────────────────
export function startReplyPoller() {
  // Run immediately on start (but after a 30s delay to let IMAP settle)
  setTimeout(() => {
    pollMarketingInbox().catch(err => console.error("[ReplyPoller] Initial poll error:", err.message));
  }, 30_000);

  // Then every 15 minutes
  setInterval(() => {
    pollMarketingInbox().catch(err => console.error("[ReplyPoller] Scheduled poll error:", err.message));
  }, 15 * 60 * 1000);

  console.log("[ReplyPoller] Started — polls every 15 minutes");
}
