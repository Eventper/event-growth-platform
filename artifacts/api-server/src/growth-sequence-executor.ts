// ── Growth sequence executor — ported from the EP engine ────────────────────
// Sends scheduled follow-up touches for the growth outreach module. Mirrors the
// manual send path in growth-platform-routes.ts (sender + signature, no
// marketing footer), but runs the cadence automatically.
//
// The core safety rule: SCHEDULED ≠ GUARANTEED SEND. Every due row is put back
// through the SAME gate the manual send uses (evaluateSendGate), re-checked at
// send time — reply, bounce, Do Not Contact, un-approval, suppression — plus the
// daily cap and the safe send window. Sends are atomically claimed (scheduled ->
// sent) so a row can never send twice. Every outcome is written to the audit log.
//
// Style matches EP: setInterval, not node-cron. Never throws out of the timer.

import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { growthProspects, growthOutreach, growthEvents } from "@workspace/db";
import { logger } from "./lib/logger";
import { sendMail } from "./emailService";
import { resolveSender, shouldIncludePhone, appendSignoff, buildIdempotencyKey, isWithinSendWindow } from "./growth-outreach-config";
import { evaluateSendGate, dailyCapReached, writeAudit } from "./growth-send-gate";
import { normalizeOutreachText } from "./outreach-format";

// Clean Poppins letter, with real bullet lists and generous whitespace — kept
// in step with the manual-send renderer so follow-ups read identically.
// No marketing-style unsubscribe footer. The body carries any human opt-out line.
function nl2brHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Same global readability pass as the manual-send renderer, so scheduled
  // follow-ups read identically: sentence capitals, bullet capitals, clean spacing.
  const lines = normalizeOutreachText(text).replace(/\r/g, "").split("\n");
  let inner = "";
  let para: string[] = [];
  let bullets: string[] = [];
  const fp = () => { if (para.length) { inner += `<p style="margin:0 0 16px;line-height:1.6;">${para.map(esc).join("<br>")}</p>`; para = []; } };
  const fb = () => { if (bullets.length) { inner += `<ul style="margin:0 0 18px 22px;padding:0;">${bullets.map((b) => `<li style="margin:0 0 7px;line-height:1.55;">${esc(b)}</li>`).join("")}</ul>`; bullets = []; } };
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { fb(); fp(); continue; }
    const m = l.match(/^[-*•]\s+(.*)$/);
    if (m) { fp(); bullets.push(m[1]); } else { fb(); para.push(l); }
  }
  fb(); fp();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#330311;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#330311;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;">
<tr><td style="padding:34px 38px;font-family:'Poppins','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#1A1714;">
${inner}
</td></tr></table></td></tr></table></body></html>`;
}

export async function runGrowthSequenceExecutor(): Promise<{ checked: number; sent: number; skipped: number; errors: number }> {
  let checked = 0, sent = 0, skipped = 0, errors = 0;

  // Only auto-send inside the safe window (Tue–Thu 08:00–16:00, no weekends or
  // bank holidays). Outside it, leave everything scheduled for the next run.
  if (!isWithinSendWindow(new Date())) {
    return { checked, sent, skipped, errors };
  }

  // Only "scheduled" rows are due. "scheduled_pending_approval" is deliberately
  // excluded — it must be human-confirmed first.
  let due: any[] = [];
  try {
    due = await db.select().from(growthOutreach)
      .where(and(eq(growthOutreach.status, "scheduled"), sql`${growthOutreach.scheduledFor} <= NOW()`));
  } catch (err: any) {
    logger.error({ err: err.message }, "growth-executor: failed to load due messages");
    return { checked, sent, skipped, errors: 1 };
  }

  for (const msg of due) {
    checked++;
    try {
      const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, msg.prospectId!));

      // GATE RE-CHECK AT SEND TIME — identical to the manual path. Any failure
      // (reply, bounce, DNC, un-approval, suppression, stopped) pauses the row
      // and is audited as blocked, rather than silently sending.
      const gate = await evaluateSendGate(msg, prospect);
      if (!gate.ok) {
        await db.update(growthOutreach).set({ status: "paused" }).where(eq(growthOutreach.id, msg.id));
        await writeAudit({ action: "blocked", outreachId: msg.id, prospectId: msg.prospectId, campaignId: msg.campaignId, sequenceStep: msg.sequencePosition, actor: "system", reason: gate.failures.join(", ") });
        skipped++;
        logger.info({ msgId: msg.id, failures: gate.failures }, "growth-executor: gate blocked");
        continue;
      }

      // Daily cap per category. null cap = manual only — never auto-send.
      const { reached, cap } = await dailyCapReached(prospect.category);
      if (cap === null) { skipped++; continue; }      // leave scheduled (manual only)
      if (reached) { skipped++; continue; }            // leave scheduled for tomorrow

      // ATOMIC CLAIM before sending — flip scheduled -> sent in one guarded
      // update so a follow-up can never send twice (overlap/retry safe). Only the
      // pass that wins this transition proceeds to send.
      const sender = resolveSender(msg.senderEmail);
      const idemKey = msg.idempotencyKey || buildIdempotencyKey(prospect.id, msg.campaignId, msg.sequencePosition);
      const claim = await db.update(growthOutreach)
        .set({ status: "sent", sentAt: new Date(), senderEmail: sender.id, idempotencyKey: idemKey })
        .where(and(eq(growthOutreach.id, msg.id), eq(growthOutreach.status, "scheduled")))
        .returning();
      if (!claim.length) { skipped++; continue; } // already claimed by another pass

      // SEND — mirror the manual send path. A send error marks the row failed and
      // does NOT retry, so the one-and-only claim still holds: only one email
      // sends, ever.
      try {
        const includePhone = shouldIncludePhone(prospect.category, msg.sequencePosition);
        let event: any = null;
        if (msg.eventId) {
          const events = await db.select().from(growthEvents).where(eq(growthEvents.id, msg.eventId));
          event = events[0] ?? null;
        }
        // One canonical sign-off + signature (strips any sign-off already in the body).
        const bodyWithSig = appendSignoff(msg.body, sender.id, includePhone);
        const html = nl2brHtml(bodyWithSig);
        await sendMail(
          prospect.email!, // gate guarantees a recipient email
          msg.subject || "I Am Her",
          html,
          undefined,
          "GB",
          undefined,
          undefined,
          { name: sender.name, email: sender.email },
        );
        await writeAudit({ action: "sent", outreachId: msg.id, prospectId: prospect.id, campaignId: msg.campaignId, sequenceStep: msg.sequencePosition, actor: "system", idempotencyKey: idemKey, metadata: { path: "scheduler" } });
        sent++;
      } catch (sendErr: any) {
        await db.update(growthOutreach).set({ status: "failed", failedReason: sendErr.message }).where(eq(growthOutreach.id, msg.id));
        await writeAudit({ action: "failed", outreachId: msg.id, prospectId: prospect.id, campaignId: msg.campaignId, sequenceStep: msg.sequencePosition, actor: "system", reason: sendErr.message });
        logger.error({ err: sendErr.message, msgId: msg.id }, "growth-executor: send failed");
        errors++;
      }
    } catch (err: any) {
      errors++;
      logger.error({ err: err.message, msgId: msg.id }, "growth-executor: error processing message");
    }
  }

  if (checked > 0) logger.info({ checked, sent, skipped, errors }, "growth-executor: run complete");
  return { checked, sent, skipped, errors };
}

export function startGrowthSequenceExecutor() {
  const tick = () => { runGrowthSequenceExecutor().catch((err) => logger.error({ err: err?.message }, "growth-executor: tick crashed")); };
  setTimeout(tick, 60_000); // first run after 60s
  setInterval(tick, 15 * 60_000); // every 15 minutes
  logger.info("growth-executor: started (every 15m)");
}
