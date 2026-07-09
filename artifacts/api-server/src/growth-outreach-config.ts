// ── Growth outreach module — controlled, invitation-led config ──────────────
// Single source of truth for categories, statuses, senders, signatures, daily
// caps, and follow-up cadence. The EP engine is ported onto the growth* tables;
// this file holds the I Am Her / Event Perfekt specifics.

// 1. Prospect categories (7-way).
export const PROSPECT_CATEGORIES = [
  "guest",
  "sponsor",
  "media",
  "hotel",
  "civic",
  "introducer",
  "do_not_contact",
] as const;
export type ProspectCategory = (typeof PROSPECT_CATEGORIES)[number];

// 3. Controlled prospect statuses (12-value state machine).
export const PROSPECT_STATUSES = [
  "new",
  "research_needed",
  "verified",
  "approved_for_outreach",
  "in_sequence",
  "replied",
  "interested",
  "declined",
  "follow_up_needed",
  "send_information",
  "needs_call",
  "do_not_contact",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

// Reply classification buckets (manual close).
export const REPLY_CLASSIFICATIONS = [
  "interested",
  "not_now",
  "declined",
  "needs_call",
  "send_information",
  "manual_follow_up",
  "do_not_contact",
] as const;
export type ReplyClassification = (typeof REPLY_CLASSIFICATIONS)[number];

// 5. Sender profiles — exactly two, Lynda is default.
export type SenderId = "lynda" | "admin";
export interface SenderProfile {
  id: SenderId;
  name: string;
  email: string;
  isDefault: boolean;
  /** signature lines below the name; phone appended when included */
  signatureLines: string[];
  phone: string | null;
}

export const SENDERS: Record<SenderId, SenderProfile> = {
  lynda: {
    id: "lynda",
    name: "Lynda Johnson",
    email: "lyndajohnson@eventperfekt.com",
    isDefault: true,
    // Approved visible signature — no email line (the sender email is already in
    // the email header). Phone is appended when shouldIncludePhone is true.
    signatureLines: [
      "Lynda Johnson",
      "Founder, Event Perfekt Global",
      "The Woman Who Leads The Room",
      "www.eventperfekt.net/iamher",
    ],
    phone: "07984 331 651",
  },
  admin: {
    id: "admin",
    name: "Event Perfekt Admin",
    email: "adminuk@eventperfekt.com",
    isDefault: false,
    signatureLines: ["Event Perfekt Global", "Admin Team", "adminuk@eventperfekt.com", "www.eventperfekt.net/iamher"],
    phone: null,
  },
};

export const DEFAULT_SENDER: SenderId = "lynda";

export function resolveSender(id?: string | null): SenderProfile {
  if (id && (id === "lynda" || id === "admin")) return SENDERS[id];
  return SENDERS[DEFAULT_SENDER];
}

// 6. Signature rendering — phone optional by template.
// Guest cold Email 1: phone OFF by default. Partner/sponsor/media/hotel/civic: phone ON.
export function shouldIncludePhone(category: string | null | undefined, sequencePosition: number): boolean {
  const c = (category || "").toLowerCase();
  if (c === "guest") return sequencePosition > 1; // off for the cold first touch
  if (["sponsor", "media", "hotel", "civic"].includes(c)) return true;
  return false;
}

export function renderSignature(senderId: string | null | undefined, includePhone: boolean): string {
  const s = resolveSender(senderId);
  const lines = [...s.signatureLines];
  if (includePhone && s.phone) lines.push(s.phone);
  return lines.join("\n");
}

// Any trailing sign-off a template/body may already carry (so we never double it).
const TRAILING_SIGNOFF_RE = /\n+\s*(warm regards|kind regards|best regards|best wishes|many thanks|warmly|sincerely)\b[\s\S]*$/i;

// Append EXACTLY ONE sign-off + signature. Strips any sign-off already present in
// the body first, so an email can never show "Warm regards," twice or a duplicate
// name line. The signature ends at the website (phone only when includePhone).
export function appendSignoff(body: string, senderId: string | null | undefined, includePhone: boolean): string {
  const stripped = String(body || "").replace(TRAILING_SIGNOFF_RE, "").replace(/\s+$/, "");
  return `${stripped}\n\nWarm regards,\n${renderSignature(senderId, includePhone)}`;
}

// Soft opt-out lines — human, never a marketing unsubscribe footer.
export const SOFT_OPT_OUT_PARTNER = `If this is not relevant, just reply "not relevant" and I won't follow up.`;
export const SOFT_OPT_OUT_GUEST = `If this is not relevant for you, no problem — just let me know and I won't follow up.`;

// No soft opt-out line is appended to any outreach — every email (guest and
// partner/sponsor/media alike) ends at the sign-off. Kept as a pass-through so
// existing call sites need no change. Inbound replies like "not relevant" are
// still honoured for suppression in the reply poller.
export function ensureSoftOptOut(body: string, _category?: string | null, _cfg?: any): string {
  return body;
}

// 9. Daily send caps, per category. null = manual-send only (no automated send).
export const DAILY_SEND_CAPS: Record<string, number | null> = {
  guest: 20, // first test batch
  sponsor: 5,
  media: 5,
  hotel: 3,
  civic: null, // manual only
  introducer: 5,
  do_not_contact: 0,
};

// 7. Follow-up cadence — BUSINESS days (skip weekends). Cumulative offset from
// Email 1 per touch: Email 1 (Day 0) → Follow-up 1 (+2 business days) → Final
// (+3 more business days = +5 total). Partner/sponsor/media/hotel use the brisk
// default; guests are configurable separately.
export const FOLLOWUP_BUSINESS_DAYS: Record<string, number[]> = {
  guest: [0, 5, 10],
  default: [0, 2, 5], // partner | sponsor | media | hotel | civic | introducer
};
export const MAX_SEQUENCE_TOUCHES = 3;

export function followupOffsetBusinessDays(category: string | null | undefined, position: number): number {
  const arr = FOLLOWUP_BUSINESS_DAYS[(category || "").toLowerCase()] || FOLLOWUP_BUSINESS_DAYS.default;
  return arr[position - 1] ?? (position - 1) * 3;
}

// Per-project cadence override. A project's outreachConfig.cadenceBusinessDays
// ({ default: [0,2,5], media: [...] }) wins; otherwise fall back to the global
// default. Keeps the Outreach Intelligence Module reusable per project without
// code changes.
export function projectCadenceOffset(outreachConfig: any, category: string | null | undefined, position: number): number {
  const map = outreachConfig?.cadenceBusinessDays;
  if (map && typeof map === "object") {
    const arr = map[(category || "").toLowerCase()] || map.default;
    if (Array.isArray(arr) && arr[position - 1] != null) return arr[position - 1];
  }
  return followupOffsetBusinessDays(category, position);
}

// Add N business days to a date, skipping Saturdays and Sundays.
export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

// ── 8. Scheduler statuses, send window, staggering, idempotency ─────────────

// All statuses an outreach row can hold. A *scheduled* email is not *sent*: it
// only counts as sent once status === "sent".
export const OUTREACH_STATUSES = [
  "pending", "approved", "rejected",
  "scheduled", "scheduled_pending_approval",
  "sent", "paused", "cancelled", "failed",
  "replied", "bounced", "positive", "not_now",
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

// Audit actions written to growth_outreach_audit.
export const AUDIT_ACTIONS = [
  "scheduled", "schedule_pending_approval", "rescheduled", "cancelled",
  "sent", "blocked", "failed", "stop_sequence", "cancel_followups",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Default sending window. The *preferred* window is Tue–Thu 09:00–11:30; the
// *hard* guardrail (08:00–16:00, no weekends/bank holidays) is the outer bound
// the backend will not auto-send outside of without an explicit override.
export const SEND_WINDOW = {
  preferredDays: [2, 3, 4],      // Tue, Wed, Thu (0 = Sun)
  preferredStartMin: 9 * 60,     // 09:00
  preferredEndMin: 11 * 60 + 30, // 11:30
  hardStartMin: 8 * 60,          // 08:00 — never before
  hardEndMin: 16 * 60,           // 16:00 — never after
  blockWeekends: true,
};

// England & Wales bank holidays around the campaign window (extend as needed).
export const UK_BANK_HOLIDAYS = [
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04",
  "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
];

function minutesOfDay(d: Date): number { return d.getHours() * 60 + d.getMinutes(); }
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function isWeekend(d: Date): boolean { const g = d.getDay(); return g === 0 || g === 6; }
export function isBankHoliday(d: Date): boolean { return UK_BANK_HOLIDAYS.includes(toISODate(d)); }

// Inside the HARD guardrail window the backend will auto-send within.
export function isWithinSendWindow(d: Date): boolean {
  if (SEND_WINDOW.blockWeekends && isWeekend(d)) return false;
  if (isBankHoliday(d)) return false;
  const m = minutesOfDay(d);
  return m >= SEND_WINDOW.hardStartMin && m <= SEND_WINDOW.hardEndMin;
}

// Inside the SOFT preferred window (Tue–Thu mornings).
export function isWithinPreferredWindow(d: Date): boolean {
  if (!SEND_WINDOW.preferredDays.includes(d.getDay())) return false;
  if (isBankHoliday(d)) return false;
  const m = minutesOfDay(d);
  return m >= SEND_WINDOW.preferredStartMin && m <= SEND_WINDOW.preferredEndMin;
}

// Next preferred send slot at/after `from`: Tue–Thu 09:00, skipping weekends and
// bank holidays. Used for "schedule for tomorrow morning" style defaults.
export function nextPreferredSlot(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setSeconds(0, 0);
  const validToday =
    SEND_WINDOW.preferredDays.includes(d.getDay()) && !isWeekend(d) && !isBankHoliday(d) &&
    minutesOfDay(d) < SEND_WINDOW.preferredStartMin;
  if (!validToday) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 21; i++) {
    if (SEND_WINDOW.preferredDays.includes(d.getDay()) && !isWeekend(d) && !isBankHoliday(d)) {
      d.setHours(9, 0, 0, 0);
      return d;
    }
    d.setDate(d.getDate() + 1);
  }
  d.setHours(9, 0, 0, 0);
  return d;
}

// Per-category minimum gap between staggered sends in a batch (minutes).
export const STAGGER_MINUTES: Record<string, number> = {
  guest: 6,
  default: 20, // partner/sponsor/media/hotel: 15–30 → 20
};
export function staggerMinutesFor(category: string | null | undefined): number {
  return STAGGER_MINUTES[(category || "").toLowerCase()] ?? STAGGER_MINUTES.default;
}

// Build `count` staggered send times from `start`, `gapMin` apart, each kept
// inside the hard send window (rolls into the next preferred slot when a day
// fills up). Default batch behaviour is staggered, never all-at-once.
export function buildStaggerSlots(start: Date, count: number, gapMin: number): Date[] {
  const slots: Date[] = [];
  let cursor = new Date(start);
  for (let i = 0; i < count; i++) {
    if (!isWithinSendWindow(cursor)) cursor = nextPreferredSlot(cursor);
    slots.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + gapMin * 60_000);
  }
  return slots;
}

// Anti-duplicate key: one send per prospect + campaign + sequence step. Unique
// in the DB, so a second scheduler pass for the same step cannot create/send a
// duplicate. "Only one email sends. Ever."
export function buildIdempotencyKey(
  prospectId: string,
  campaignId: string | null | undefined,
  step: number,
): string {
  return `${prospectId}:${campaignId || "nocampaign"}:step${step}`;
}
