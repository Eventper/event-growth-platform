// ── Growth reply poller — ported from the EP IMAP poller ────────────────────
// Polls the shared marketing inbox, matches replies to growth prospects, records
// them, STOPS the sequence, and suppresses on unsubscribe / auto-reply.
// Defensive: if IMAP creds are missing or the read fails, it logs once and
// returns zeros — it must never crash the server.
//
// reply-poller.ts's parseHeaders/extractBody/classifyReply are not exported, so
// this module carries its own minimal parse + keyword classifier mapped to the
// growth reply buckets.

import { db } from "./db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { growthProspects, growthOutreach, growthReplies, growthSuppressions } from "@workspace/db";
import { logger } from "./lib/logger";
import { addSuppression } from "./suppression";
import { readMarketingInbox } from "./marketing-email";
import { callOpenRouter, logSpend, getOpenRouterKey, MODELS } from "./ai-shared";

// Growth reply buckets (manual close) + the two that trigger suppression.
type Bucket =
  | "interested" | "not_now" | "declined" | "needs_call"
  | "send_information" | "manual_follow_up" | "do_not_contact"
  | "unsubscribe" | "auto_reply";

function header(raw: string, name: string): string {
  const m = raw.match(new RegExp(`^${name}:\\s*(.*)$`, "im"));
  return m ? m[1].trim() : "";
}

function senderEmail(raw: string): string | null {
  const from = header(raw, "From");
  const angle = from.match(/<([^>]+)>/);
  const addr = (angle ? angle[1] : from).trim().toLowerCase();
  return /\S+@\S+\.\S+/.test(addr) ? addr : null;
}

function bodyText(raw: string): string {
  // Minimal: strip headers (everything before the first blank line), de-HTML.
  const split = raw.indexOf("\r\n\r\n") >= 0 ? raw.indexOf("\r\n\r\n") + 4 : raw.indexOf("\n\n") + 2;
  const body = split > 1 ? raw.slice(split) : raw;
  return body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
}

// Keyword classifier — deliberately conservative; defaults to manual_follow_up
// so a human always decides anything ambiguous. Used as the fallback whenever
// the LLM is unavailable or returns something invalid.
function keywordClassify(subject: string, body: string): Bucket {
  const t = `${subject}\n${body}`.toLowerCase();
  if (/\b(unsubscribe|opt[\s-]?out|remove me|stop emailing|do not (contact|email))\b/.test(t)) return "unsubscribe";
  if (/(out of (the )?office|automatic reply|auto[\s-]?reply|on (annual )?leave|away until|vacation)/.test(t)) return "auto_reply";
  if (/\b(not interested|no thank|unfortunately|we'll pass|decline|not a fit|not for us)\b/.test(t)) return "declined";
  if (/\b(call|phone|speak|chat|discuss on a call|hop on a call|schedule a call)\b/.test(t)) return "needs_call";
  if (/\b(send (me )?(more )?(info|information|details|the deck|brochure)|tell me more|share details)\b/.test(t)) return "send_information";
  if (/\b(not (right )?now|later|next (year|quarter|month)|circle back|reach out (again )?in|too early|busy at the moment)\b/.test(t)) return "not_now";
  if (/\b(interested|yes|love to|count me in|sounds (great|good)|happy to|i'?d like|keen)\b/.test(t)) return "interested";
  return "manual_follow_up";
}

const MANUAL_BUCKETS = ["interested", "not_now", "declined", "needs_call", "send_information", "manual_follow_up", "do_not_contact"];

// AI classifier (Haiku) into the 7 manual-close buckets, with keyword fallback.
// Unsubscribe / auto-reply stay keyword-driven — they're reliable signals that
// trigger suppression, so we don't spend a model call on them.
async function classify(subject: string, body: string): Promise<Bucket> {
  const keyword = keywordClassify(subject, body);
  if (keyword === "unsubscribe" || keyword === "auto_reply") return keyword;

  let hasKey = false;
  try { hasKey = !!getOpenRouterKey(); } catch { hasKey = false; }
  if (!hasKey) return keyword;

  try {
    const sys =
      "You classify a single email reply to a cold outreach message. Respond with EXACTLY one of these labels and nothing else: " +
      "interested, not_now, declined, needs_call, send_information, manual_follow_up, do_not_contact. " +
      "Use needs_call if they want to talk by phone; send_information if they ask for more info/a deck; " +
      "not_now if they're positive but later; do_not_contact if they ask never to be contacted; " +
      "manual_follow_up if genuinely ambiguous.";
    const r = await callOpenRouter(
      MODELS.classify,
      [{ role: "system", content: sys }, { role: "user", content: `Subject: ${subject}\n\n${body}`.slice(0, 4000) }],
      { maxTokens: 8, temperature: 0 },
    );
    try { await logSpend("reply_classify", "openrouter", r.cost, { model: MODELS.classify }); } catch {}
    const out = (r.content || "").trim().toLowerCase().replace(/[^a-z_]/g, "");
    if (MANUAL_BUCKETS.includes(out)) return out as Bucket;
    return keyword;
  } catch (err: any) {
    logger.warn({ err: err.message }, "growth-reply-poller: AI classify failed, using keyword");
    return keyword;
  }
}

export async function pollGrowthReplies(): Promise<{ processed: number; matched: number; errors: number }> {
  // Read replies from the inbox(es) outreach is SENT FROM. Replies to Lynda's
  // emails land in Lynda's inbox — read that primarily; also read the marketing
  // inbox when configured. If no creds at all, skip.
  const mailboxes: Array<{ user: string; password: string }> = [];
  if (process.env.LYNDA_EMAIL && process.env.LYNDA_EMAIL_PASSWORD) {
    mailboxes.push({ user: process.env.LYNDA_EMAIL, password: process.env.LYNDA_EMAIL_PASSWORD });
  }
  if (process.env.MARKETING_EMAIL_USER && process.env.MARKETING_EMAIL_PASSWORD) {
    mailboxes.push({ user: process.env.MARKETING_EMAIL_USER, password: process.env.MARKETING_EMAIL_PASSWORD });
  }
  if (mailboxes.length === 0) {
    logger.warn("growth-reply-poller: no inbox creds (LYNDA_EMAIL / MARKETING_EMAIL) — skipping");
    return { processed: 0, matched: 0, errors: 0 };
  }

  let inbox: any[] = [];
  let readErrors = 0;
  for (const mb of mailboxes) {
    try {
      inbox = inbox.concat(await readMarketingInbox(mb));
    } catch (err: any) {
      readErrors++;
      logger.warn({ err: err.message, user: mb.user }, "growth-reply-poller: inbox read failed");
    }
  }

  let processed = 0, matched = 0, errors = readErrors;
  for (const item of inbox) {
    processed++;
    try {
      const raw: string = item.raw || "";
      const from = senderEmail(raw);
      if (!from) continue;

      const [prospect] = await db.select().from(growthProspects)
        .where(eq(growthProspects.email, from));
      // case-insensitive fallback
      const match = prospect ?? (await db.select().from(growthProspects))
        .find((p) => (p.email || "").toLowerCase() === from);
      if (!match) continue;
      matched++;

      const subject = header(raw, "Subject");
      const body = bodyText(raw);
      const bucket = await classify(subject, body);

      // Most recent outreach message for this prospect = the one being replied to.
      const [latest] = await db.select({ id: growthOutreach.id }).from(growthOutreach)
        .where(eq(growthOutreach.prospectId, match.id))
        .orderBy(desc(growthOutreach.createdAt)).limit(1);

      await db.insert(growthReplies).values({
        outreachId: latest?.id ?? null,
        content: body || "(no body)",
        classification: bucket,
      });

      // STOP THE SEQUENCE: mark prospect replied, pause any pending/scheduled touches.
      const newStatus = bucket === "unsubscribe" || bucket === "do_not_contact" ? "do_not_contact" : "replied";
      await db.update(growthProspects).set({ status: newStatus }).where(eq(growthProspects.id, match.id));
      await db.update(growthOutreach)
        .set({ status: "paused" })
        .where(and(eq(growthOutreach.prospectId, match.id), inArray(growthOutreach.status, ["scheduled", "pending"])));

      // Suppress on unsubscribe / auto-reply.
      if ((bucket === "unsubscribe" || bucket === "auto_reply") && match.email) {
        const reason = bucket === "unsubscribe" ? "unsubscribe" : "auto_reply";
        try { await addSuppression({ email: match.email, reason, source: "growth_reply_poller" }); } catch {}
        const exists = await db.select().from(growthSuppressions).where(eq(growthSuppressions.email, match.email));
        if (exists.length === 0) await db.insert(growthSuppressions).values({ email: match.email, reason });
      }
    } catch (err: any) {
      errors++;
      logger.error({ err: err.message }, "growth-reply-poller: failed to process message");
    }
  }

  if (processed > 0) logger.info({ processed, matched, errors }, "growth-reply-poller: run complete");
  return { processed, matched, errors };
}

export function startGrowthReplyPoller() {
  const tick = () => { pollGrowthReplies().catch((err) => logger.error({ err: err?.message }, "growth-reply-poller: tick crashed")); };
  setTimeout(tick, 90_000); // first run after 90s
  setInterval(tick, 15 * 60_000); // every 15 minutes
  logger.info("growth-reply-poller: started (every 15m)");
}
