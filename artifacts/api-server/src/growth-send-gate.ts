// ── Growth outreach: shared send gate + audit ──────────────────────────────
// One gate, re-checked immediately before EVERY send — manual click, scheduled
// cron send, or Elizabeth-confirmed send. The core rule: "scheduled does not
// mean guaranteed send." A row can sit scheduled for days; the world may change
// (reply, bounce, Do Not Contact, un-approval), so the full gate runs again at
// the moment of sending, not just when the email was scheduled.

import { db } from "./db";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  growthOutreach, growthProspects, growthReplies, growthSuppressions, growthOutreachAudit,
} from "@workspace/db";
import { isSuppressed } from "./suppression";
import { DAILY_SEND_CAPS, type AuditAction } from "./growth-outreach-config";
import { findOutreachContentIssues } from "./outreach-format";
import { logger } from "./lib/logger";

export interface GateResult { ok: boolean; failures: string[]; }

// Statuses at which a message must NOT send (already terminal or held).
const NON_SENDABLE_STATUSES = new Set(["sent", "rejected", "cancelled", "failed", "paused", "replied", "bounced"]);

// Full backend gate — the single source of truth for "may this email send now?".
// Pass the outreach row and its prospect (already loaded by the caller).
export async function evaluateSendGate(msg: any, prospect: any): Promise<GateResult> {
  const failures: string[] = [];
  if (!prospect) return { ok: false, failures: ["Prospect not found"] };

  // Do Not Contact (category or status).
  if (prospect.status === "do_not_contact" || prospect.category === "do_not_contact") {
    failures.push("Not Do Not Contact");
  }
  // Verification + human approval.
  if (!prospect.emailVerified) failures.push("Email Verified = Yes");
  if (!prospect.contactRouteVerified) failures.push("Contact Route Verified = Yes");
  if (!prospect.approvedBy) failures.push("Approved by Lynda = Yes");
  // Prospect must be approved for outreach, or already moving through the
  // sequence (its follow-ups are legitimately scheduled).
  if (!["approved_for_outreach", "in_sequence"].includes(prospect.status || "")) {
    failures.push("Status = Approved for Outreach or Scheduled");
  }
  if (!prospect.email) failures.push("Recipient email present");

  // Message-level: not paused/stopped/cancelled, this step not already sent, no bounce.
  if (NON_SENDABLE_STATUSES.has(msg.status)) {
    failures.push(msg.status === "sent" ? "This step has not already been sent" : "Sequence not paused or stopped");
  }
  if (msg.bounced) failures.push("No bounce recorded");

  // Global outreach content rules (single source of truth in outreach-format):
  // unresolved placeholder (both {{field}} and {Field}), bad dummy data, duplicate
  // sign-off, marketing/unsubscribe footer, and phone on a cold guest first-touch.
  for (const issue of findOutreachContentIssues(msg.subject, msg.body, {
    category: prospect.category,
    sequencePosition: msg.sequencePosition,
  })) {
    failures.push(issue);
  }

  // Guest intelligence gate — a guest invitation may only be sent from approved,
  // locked research fields (never generic copy). If any locked field is missing,
  // block and require human approval. (Email/route verification + Lynda approval
  // are already enforced above.)
  if ((prospect.category || "").toLowerCase() === "guest") {
    // Mirrors the master guest template's merge fields. role_context was removed
    // from the template, so it is no longer required to send.
    const guestLocked: Record<string, any> = {
      first_name: prospect.name,
      company: prospect.company,
      guest_reason: prospect.guestReason,
      room_contribution: prospect.roomContribution,
      why_this_room_matters_to_her: prospect.whyThisRoomMattersToHer,
    };
    const missingGuest = Object.entries(guestLocked)
      .filter(([, v]) => !v || !String(v).trim())
      .map(([k]) => k);
    if (missingGuest.length > 0) {
      failures.push("Missing guest intelligence — human approval needed");
    }
  }

  // Suppression — growth list OR global.
  if (prospect.email) {
    const inGrowth = await db.select({ id: growthSuppressions.id }).from(growthSuppressions)
      .where(eq(growthSuppressions.email, prospect.email));
    if (inGrowth.length > 0 || (await isSuppressed(prospect.email))) {
      failures.push("Not suppressed / unsubscribed");
    }
  }

  // Any reply on ANY of this prospect's outreach stops the whole sequence.
  if (prospect.id) {
    const ids = (await db.select({ id: growthOutreach.id }).from(growthOutreach)
      .where(eq(growthOutreach.prospectId, prospect.id))).map((r) => r.id);
    if (ids.length > 0) {
      const replies = await db.select({ id: growthReplies.id }).from(growthReplies)
        .where(inArray(growthReplies.outreachId, ids));
      if (replies.length > 0) failures.push("No reply captured");
    }
  }

  return { ok: failures.length === 0, failures };
}

// Per-category daily send cap. null cap = manual-only (never auto-sends).
export async function dailyCapReached(category: string | null | undefined): Promise<{ reached: boolean; cap: number | null }> {
  const cap = DAILY_SEND_CAPS[category || ""];
  if (cap === undefined || cap === null) return { reached: false, cap: cap ?? null };
  const rows = await db.select({ id: growthOutreach.id }).from(growthOutreach)
    .innerJoin(growthProspects, eq(growthOutreach.prospectId, growthProspects.id))
    .where(and(
      eq(growthProspects.category, category!),
      eq(growthOutreach.status, "sent"),
      sql`${growthOutreach.sentAt} >= CURRENT_DATE`,
    ));
  return { reached: rows.length >= cap, cap };
}

// Append-only audit write. Never throws into the caller — a failed audit must
// not block (or un-block) a send decision, but every action is attempted.
export async function writeAudit(entry: {
  action: AuditAction;
  outreachId?: string | null;
  prospectId?: string | null;
  campaignId?: string | null;
  actor?: string | null;
  sequenceStep?: number | null;
  oldScheduledFor?: Date | null;
  newScheduledFor?: Date | null;
  reason?: string | null;
  idempotencyKey?: string | null;
  metadata?: any;
}): Promise<void> {
  try {
    await db.insert(growthOutreachAudit).values({
      action: entry.action,
      outreachId: entry.outreachId ?? null,
      prospectId: entry.prospectId ?? null,
      campaignId: entry.campaignId ?? null,
      actor: entry.actor ?? "system",
      sequenceStep: entry.sequenceStep ?? null,
      oldScheduledFor: entry.oldScheduledFor ?? null,
      newScheduledFor: entry.newScheduledFor ?? null,
      reason: entry.reason ?? null,
      idempotencyKey: entry.idempotencyKey ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err: any) {
    logger.warn({ err: err.message, action: entry.action }, "growth audit write failed (non-critical)");
  }
}
