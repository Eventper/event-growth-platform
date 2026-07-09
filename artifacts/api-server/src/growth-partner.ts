// ── Partner / Sponsor Email AI (assemble from locked templates, do not invent) ──
// Founding-partner outreach is NOT free-generated. It is assembled from two LOCKED
// code templates (first-touch + follow-up) with the prospect's approved merge
// fields substituted in — no AI, no vague sponsor language. If a required field is
// missing, the draft is refused. The sign-off ("Warm regards," + Lynda's signature)
// is NOT part of the template body — it is added downstream by appendSignoff at
// send time, so an email can never carry a duplicate sign-off.
//
// Mirrors the guest template path (growth-guest.ts): assemble → the send gate
// (growth-send-gate) re-checks unresolved placeholders before anything leaves.
import { firstNameOf } from "./growth-guest";

// Block BOTH placeholder formats, same rule as the send gate.
const PLACEHOLDER = /\{\{\s*[\w.]+\s*\}\}|\{\s*[A-Za-z][\w.\s]*\}/;

// Subjects are fixed (no merge fields). The follow-up threads the first touch.
export const PARTNER_FIRST_TOUCH_SUBJECT = "Founding Partner Opportunity — The Woman Who Leads The Room";
export const PARTNER_FOLLOWUP_SUBJECT = "Re: Founding Partner Opportunity — The Woman Who Leads The Room";

// Media partners (partnershipType contains "media") get a media-framed subject.
// Same locked body — the media angle already lives in specific_ask / what_they_receive.
export const PARTNER_MEDIA_FIRST_TOUCH_SUBJECT = "Media Partnership — The Woman Who Leads The Room";
export const PARTNER_MEDIA_FOLLOWUP_SUBJECT = "Re: Media Partnership — The Woman Who Leads The Room";

export function isMediaPartner(p: any): boolean {
  return (p?.partnershipType || "").toLowerCase().includes("media");
}

// Plain text only — bodyToHtml/nl2brHtml escape everything, so no markdown (**bold**,
// [links]) and no line may start with -, * or • (those become bullet lists). The
// body ENDS before the sign-off; appendSignoff adds "Warm regards," + the signature.
export const PARTNER_FIRST_TOUCH_BODY = `Hi {{first_name}},

I'm Lynda Johnson, founder of The Woman Who Leads The Room.

I'm reaching out because I'm curating a small number of founding partners for the first edition, a private leadership dinner for 100 accomplished women across the UK, hosted in Milton Keynes.

The room is being built for women who lead, buy, influence and carry responsibility across business, leadership and life: founders, directors, executives, business owners and senior decision-makers from different industries.

These women are not just guests. They are an ecosystem of decision-makers, buyers, founders, employers, community leaders and senior professionals with purchasing power, trusted networks and influence beyond the room itself.

This is not traditional sponsorship. It is not a logo on a flyer.

It is a chance for selected partners to be meaningfully aligned with a national-calibre room of women who make decisions, shape conversations, influence purchasing and carry leadership responsibility.

I thought {{company}} could be a strong fit because {{prospect_reason}}.

The specific opportunity I'd like to put forward is:

{{specific_ask}}

In return, {{company}} would receive:

{{what_they_receive}}

Because this is the first edition, founding partners will be positioned early in the story of the platform, not added at the end as suppliers. The value is association, visibility, access, credibility and meaningful placement within a curated leadership experience.

I've prepared a short one-page partner outline with the full context, audience, partner benefits and suggested route for {{company}}.

If this feels aligned, reply and I'll send it over for your team to review.`;

export const PARTNER_FOLLOWUP_BODY = `Hi {{first_name}},

I'm following up on my note below.

I'm curating a small number of founding partners for The Woman Who Leads The Room, a private leadership dinner for 100 accomplished women across the UK, hosted in Milton Keynes.

The room brings together founders, directors, executives, business owners and senior decision-makers from different industries: women who lead, buy, influence, employ, recommend and shape conversations beyond the room itself.

I thought {{company}} had a clear fit because {{prospect_reason}}.

This is not standard sponsorship or logo placement.

The specific opportunity I'd like to put forward is:

{{specific_ask}}

In return, {{company}} would receive:

{{what_they_receive}}

Because this is the first edition, the value is early founding-partner positioning, meaningful alignment with the platform and visibility around a national-calibre room of accomplished women.

I've prepared a short one-page partner outline with the full context, audience, partner benefits and suggested route for {{company}}.

Reply and I'll send it over for your team to review.`;

// A prospect is treated as a partner/founding-partner (uses these templates) when
// its category OR its prospectType is "sponsor". Generation branches historically
// on prospectType while caps/signature branch on category, so accept either.
export function isPartnerProspect(p: any): boolean {
  return (p?.category || "").toLowerCase() === "sponsor" || p?.prospectType === "sponsor";
}

// The required merge fields, in placeholder terms. Generation is blocked unless all
// are present — mirrors the send gate so "can generate" and "can send" never disagree.
export function missingPartnerFields(p: any): string[] {
  const need: Record<string, any> = {
    first_name: firstNameOf(p?.name),
    company: p?.company,
    prospect_reason: p?.whyThem,
    specific_ask: p?.specificAsk,
    what_they_receive: p?.whatTheyReceive,
  };
  return Object.entries(need)
    .filter(([, v]) => !v || !String(v).trim())
    .map(([k]) => k);
}

// Pure substitution of the double-brace merge fields from approved locked fields.
// Unknown placeholders are left intact so the caller's placeholder check refuses
// them (defence in depth). sequencePosition > 1 selects the follow-up template.
export function assemblePartnerOutreach(p: any, sequencePosition: number): { subject: string; body: string } {
  const followup = (sequencePosition || 1) > 1;
  const map: Record<string, string> = {
    first_name: firstNameOf(p?.name),
    company: p?.company || "",
    prospect_reason: (p?.whyThem || "").replace(/\.+$/, ""),
    specific_ask: p?.specificAsk || "",
    what_they_receive: p?.whatTheyReceive || "",
  };
  const sub = (s: string) =>
    (s || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k) => (k in map ? map[k] : `{{${k}}}`));
  const media = isMediaPartner(p);
  const subject = media
    ? (followup ? PARTNER_MEDIA_FOLLOWUP_SUBJECT : PARTNER_MEDIA_FIRST_TOUCH_SUBJECT)
    : (followup ? PARTNER_FOLLOWUP_SUBJECT : PARTNER_FIRST_TOUCH_SUBJECT);
  return {
    subject,
    body: sub(followup ? PARTNER_FOLLOWUP_BODY : PARTNER_FIRST_TOUCH_BODY),
  };
}

// Build one validated partner touch. Throws (caller surfaces the message) when a
// required field is missing or an unresolved placeholder survives — so a vague or
// half-filled sponsor email can never be drafted or sent.
export function buildPartnerTouch(p: any, sequencePosition: number): { subject: string; body: string } {
  const missing = missingPartnerFields(p);
  if (missing.length > 0) {
    throw new Error(`Missing required partner fields — human approval needed: ${missing.join(", ")}`);
  }
  const { subject, body } = assemblePartnerOutreach(p, sequencePosition);
  if (PLACEHOLDER.test(subject) || PLACEHOLDER.test(body)) {
    throw new Error("Merge field error — unresolved placeholder found");
  }
  return { subject, body };
}
