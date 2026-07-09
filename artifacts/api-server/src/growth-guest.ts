// ── Guest Email AI (Workflow: assemble, do not invent) ──────────────────────
// A guest invitation is NOT free-generated. It is assembled strictly from the
// approved MASTER guest template (growth_email_templates, category 'guest_invite')
// with the prospect's LOCKED, human-approved guest-intelligence fields merged in.
// No browsing, no invention, no generic filler. If a locked field is missing the
// draft is refused: "Missing guest intelligence — human approval needed".
//
// Research AI proposes the fields → Lynda approves/locks → THIS assembles → the
// send gate (growth-send-gate) re-checks before anything leaves.
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { growthProspects, growthOutreach, growthEmailTemplates, growthEvents } from "@workspace/db";
import { logger } from "./lib/logger";
import { callOpenRouter, MODELS, logSpend } from "./ai-shared";

const GUEST_MASTER_CATEGORY = "guest_invite";

// Block BOTH formats, same rule as the send gate.
const PLACEHOLDER = /\{\{\s*[\w.]+\s*\}\}|\{\s*[A-Za-z][\w.\s]*\}/;

// Honorifics to skip when deriving a first name ("Dr Sarah Jenkins" -> "Sarah").
const HONORIFICS = new Set(["dr", "dr.", "prof", "prof.", "professor", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "miss", "sir", "dame", "rev", "rev.", "hon"]);

export function firstNameOf(name?: string | null): string {
  const tokens = (name || "").trim().split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (!HONORIFICS.has(t.toLowerCase())) return t;
  }
  return tokens[0] || "";
}

// The locked fields a guest invitation requires — mirrors the guest send gate so
// "can generate" and "can send" never disagree.
export function missingGuestIntelligence(p: any): string[] {
  // Mirrors the merge fields the master guest template actually uses. role_context
  // was dropped from the template, so it is no longer a required locked field.
  const need: Record<string, any> = {
    first_name: firstNameOf(p?.name),
    company: p?.company,
    guest_reason: p?.guestReason,
    room_contribution: p?.roomContribution,
    why_this_room_matters_to_her: p?.whyThisRoomMattersToHer,
  };
  return Object.entries(need)
    .filter(([, v]) => !v || !String(v).trim())
    .map(([k]) => k);
}

// Pure substitution of the approved double-brace merge fields from locked fields.
// Only known fields are substituted; anything unknown is left intact so the
// caller's placeholder check can refuse it (defence in depth).
export function assembleGuestInvitation(
  p: any,
  tpl: { subject?: string | null; body: string }
): { subject: string; body: string } {
  const map: Record<string, string> = {
    first_name: firstNameOf(p.name),
    company: p.company || "",
    guest_reason: p.guestReason || "",
    role_context: p.roleContext || "",
    room_contribution: p.roomContribution || "",
    why_this_room_matters_to_her: p.whyThisRoomMattersToHer || "",
  };
  const sub = (s: string) =>
    (s || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k) => (k in map ? map[k] : `{{${k}}}`));
  return { subject: sub(tpl.subject || ""), body: sub(tpl.body || "") };
}

export interface GuestDraftResult {
  ok: boolean;
  generated: boolean;
  status: string;
  reason?: string;
  draftId?: string;
  subject?: string;
  body?: string;
  templateId?: string;
  wordCount?: number;
  note?: string;
}

// Generate (assemble) a guest invitation draft into the 'pending' approval queue.
// Never sends. Returns a stop-condition status if research/approval is incomplete.
export async function generateGuestDraft(
  args: { prospectId: string; eventId?: string },
  _ownerId?: string
): Promise<GuestDraftResult> {
  const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, args.prospectId));
  if (!prospect) return { ok: false, generated: false, status: "Prospect not found" };

  // Do Not Contact — refuse to generate.
  if (prospect.status === "do_not_contact" || prospect.category === "do_not_contact") {
    return { ok: true, generated: false, status: "Do not generate", reason: "Prospect is marked Do Not Contact" };
  }
  // This path is guest-only; partner/sponsor use the existing comms engine.
  if ((prospect.category || "").toLowerCase() !== "guest") {
    return { ok: true, generated: false, status: "Not a guest prospect", reason: `category=${prospect.category || "none"}` };
  }
  // Stop condition: locked guest intelligence must be present and approved.
  const missing = missingGuestIntelligence(prospect);
  if (missing.length > 0) {
    return { ok: true, generated: false, status: "Missing guest intelligence — human approval needed", reason: `missing: ${missing.join(", ")}` };
  }

  // Load the approved MASTER guest template (most recent guest_invite).
  const [tpl] = await db
    .select()
    .from(growthEmailTemplates)
    .where(eq(growthEmailTemplates.category, GUEST_MASTER_CATEGORY))
    .orderBy(desc(growthEmailTemplates.updatedAt))
    .limit(1);
  if (!tpl) return { ok: false, generated: false, status: "No master guest template found" };

  const { subject, body } = assembleGuestInvitation(prospect, tpl);

  // Defence in depth: never store a draft with an unresolved placeholder.
  if (PLACEHOLDER.test(subject) || PLACEHOLDER.test(body)) {
    return { ok: false, generated: false, status: "Merge field error — unresolved placeholder found" };
  }

  // Length guard — a guest invite should read as a researched note, not a dossier.
  // 500 words is a hard ceiling; under 350 is allowed but flagged for review.
  const wordCount = (body.trim().match(/\S+/g) || []).length;
  if (wordCount > 500) {
    return { ok: false, generated: false, status: `Guest invitation too long — ${wordCount} words (max 500). Tighten the locked fields.` };
  }
  const lengthNote = wordCount < 350 ? `Note: body is ${wordCount} words (under the 350 guide).` : undefined;

  const eventId = args.eventId || prospect.eventId || null;

  // Clear stale pending guest drafts so re-generating doesn't pile up duplicates.
  await db.delete(growthOutreach).where(and(eq(growthOutreach.prospectId, args.prospectId), eq(growthOutreach.status, "pending")));

  const [draft] = await db
    .insert(growthOutreach)
    .values({
      prospectId: prospect.id,
      eventId,
      sequencePosition: tpl.sequenceStep || 1,
      channel: "email",
      subject,
      body,
      status: "pending",
      senderEmail: tpl.senderId || "lynda",
      generatedBy: `guest-master-template:${tpl.id}`,
      metadata: {
        engine: "guest-email-ai",
        source: "locked-fields",
        templateId: tpl.id,
        wordCount,
        lockedFields: {
          guest_reason: prospect.guestReason,
          role_context: prospect.roleContext,
          room_contribution: prospect.roomContribution,
          why_this_room_matters_to_her: prospect.whyThisRoomMattersToHer,
        },
      },
    })
    .returning();

  logger.info({ prospectId: prospect.id, draftId: draft.id, templateId: tpl.id, wordCount }, "guest invitation assembled from master template");
  return { ok: true, generated: true, status: "Ready for review", draftId: draft.id, subject, body, templateId: tpl.id, wordCount, note: lengthNote };
}

// ── Guest Research AI (Workflow: discover, recommend — never approve) ────────
// Reasons over the prospect's ALREADY-KNOWN data + project context and PROPOSES
// the guest-intelligence locked fields. It does NOT browse, does NOT invent facts
// beyond what is supplied, and does NOT approve: it never sets approvedBy/status,
// so the send gate still blocks until Lynda reviews and locks. Proposed values are
// written to the columns (so the Email AI can render a preview) plus a metadata
// audit marking them AI-proposed and pending human approval.

export interface GuestResearchResult {
  ok: boolean;
  researched: boolean;
  status: string;
  reason?: string;
  proposed?: Record<string, any>;
  cost?: number;
}

const GUEST_RESEARCH_SYSTEM = `You are the Guest Research AI for "The Woman Who Leads The Room" (I Am Her) — a private leadership dinner for 100 accomplished women across the UK (founders, directors, executives, business owners and senior decision-makers).

Your job: from ONLY the supplied facts about a prospect, PROPOSE the guest-intelligence fields a human (Lynda) will review and approve. You do NOT browse, you do NOT invent facts that are not supported by the input, and you do NOT approve anyone. If the input is thin, say so in the field rather than fabricating specifics.

Write in Lynda's senior, warm, peer-to-peer voice. Each field is dropped verbatim into an invitation template, so phrase them to fit their sentence:
- guest_reason: completes "your work at [company] stood out because ___" (a specific, grounded reason; may begin with "you" or "of"; no leading capital, no full stop)
- room_contribution: completes "You bring ___" (a NOUN PHRASE, e.g. "the perspective of a leader scaling a mission-led organisation in a complex, regulated sector"; do NOT start with "you"; no leading capital; no full stop)
- why_this_room_matters_to_her: completes "This room gives you ___" (a NOUN PHRASE, e.g. "a table of genuine peers who understand the weight of leadership without needing it explained"; do NOT start with "you"; no leading capital; no full stop)
- role_context: her role/title only, e.g. "Chief Executive" (optional; not shown in the current template)
- company_context: one neutral sentence on what the company is/does.
- approved_proof_points: one short line on the calibre of women she'd be among (no invented names).
- attendance_likelihood: one of "high" | "medium" | "low".
- fit_score: integer 0-100.

USE this language: private leadership dinner, curated room, accomplished women, founders/directors/executives/business owners/senior decision-makers, carried responsibility.
NEVER use: networking event, wellbeing, empowerment, community, conference, workshop, coaching room.
NEVER hedge or soften — banned phrases: "I think", "I believe", "I'd love", "maybe", "possibly", "could be valuable", "if useful". Write assertive, direct, premium, concise copy.
Do not use partner/sponsor language. Do not ask for a call.

STYLE — human and concise, like a researched note, NOT a dossier:
- Each field is ONE tight sentence in plain, direct language. No flowery metaphors or over-polished AI phrasing (never write things like "a lens that sharpens the thinking of any curated room").
- NO repetition: do not reuse the same words or ideas across fields, and do NOT use the word "responsibility" anywhere (the template already uses it once).
- Keep guest_reason, room_contribution and why_this_room_matters_to_her brief so the whole assembled email reads at roughly 350–500 words.

Return ONLY a JSON object with exactly these keys: guest_reason, role_context, room_contribution, why_this_room_matters_to_her, company_context, approved_proof_points, attendance_likelihood, fit_score.`;

export async function researchGuest(
  args: { prospectId: string; eventId?: string; force?: boolean },
  ownerId?: string
): Promise<GuestResearchResult> {
  const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, args.prospectId));
  if (!prospect) return { ok: false, researched: false, status: "Prospect not found" };

  if (prospect.status === "do_not_contact" || prospect.category === "do_not_contact") {
    return { ok: true, researched: false, status: "Do not research", reason: "Prospect is marked Do Not Contact" };
  }
  if ((prospect.category || "").toLowerCase() !== "guest") {
    return { ok: true, researched: false, status: "Not a guest prospect", reason: `category=${prospect.category || "none"}` };
  }
  // Don't clobber human-approved (locked) intelligence unless explicitly forced.
  if (prospect.approvedBy && !args.force) {
    return { ok: true, researched: false, status: "Already approved — locked", reason: "Intelligence is approved; pass force=true to re-research" };
  }

  // Project context (positioning / proof points / banned language) if present.
  const eventId = args.eventId || prospect.eventId || null;
  let projectCtx = "";
  if (eventId) {
    const [ev] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
    const cfg: any = ev?.outreachConfig || null;
    if (ev?.name) projectCtx += `Project: ${ev.name}\n`;
    if (cfg?.positioning) projectCtx += `Positioning: ${cfg.positioning}\n`;
    if (cfg?.proofPoints) projectCtx += `Proof points: ${JSON.stringify(cfg.proofPoints)}\n`;
  }

  const facts = [
    `Name: ${prospect.name}`,
    prospect.title ? `Title: ${prospect.title}` : "",
    prospect.company ? `Company: ${prospect.company}` : "",
    prospect.industry ? `Industry: ${prospect.industry}` : "",
    prospect.sector ? `Sector: ${prospect.sector}` : "",
    prospect.location ? `Location: ${prospect.location}` : "",
    prospect.companySize ? `Company size: ${prospect.companySize}` : "",
    prospect.whyThem ? `Prior note (why them): ${prospect.whyThem}` : "",
    prospect.profileUrl ? `Profile: ${prospect.profileUrl}` : "",
    prospect.linkedinUrl ? `LinkedIn: ${prospect.linkedinUrl}` : "",
  ].filter(Boolean).join("\n");

  const userMsg = `${projectCtx ? projectCtx + "\n" : ""}Known facts about the prospect (use ONLY these — do not invent):\n${facts}\n\nPropose the guest-intelligence fields as JSON.`;

  let parsed: any;
  let cost = 0;
  try {
    const r = await callOpenRouter(
      MODELS.drafting,
      [
        { role: "system", content: GUEST_RESEARCH_SYSTEM },
        { role: "user", content: userMsg },
      ],
      { jsonMode: true, temperature: 0.4, maxTokens: 900 }
    );
    cost = r.cost || 0;
    // Some models wrap JSON in a ```json fence despite json mode — strip it, and
    // fall back to the outermost {...} block.
    let raw = String(r.content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (raw[0] !== "{") {
      const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
      if (a >= 0 && b > a) raw = raw.slice(a, b + 1);
    }
    parsed = JSON.parse(raw);
  } catch (err: any) {
    logger.error({ err: err.message, prospectId: prospect.id }, "guest research failed");
    return { ok: false, researched: false, status: "Research failed", reason: err.message };
  }

  const str = (v: any) => (v == null ? null : String(v).trim() || null);
  const fitScore = Number.isFinite(Number(parsed.fit_score)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.fit_score)))) : null;

  const proposed = {
    guestReason: str(parsed.guest_reason),
    roleContext: str(parsed.role_context),
    roomContribution: str(parsed.room_contribution),
    whyThisRoomMattersToHer: str(parsed.why_this_room_matters_to_her),
    companyContext: str(parsed.company_context),
    approvedProofPoints: str(parsed.approved_proof_points),
    attendanceLikelihood: str(parsed.attendance_likelihood),
    fitScore,
  };

  // Write proposals (NOT approval). approvedBy/status are left untouched, so the
  // send gate still requires Lynda's sign-off before anything can go out.
  await db
    .update(growthProspects)
    .set({
      ...proposed,
      verificationNotes: `Guest intelligence proposed by Research AI (${MODELS.drafting}) — pending Lynda review/approval.`,
      metadata: { ...(prospect.metadata as any || {}), guestResearch: { proposedAt: new Date().toISOString(), model: MODELS.drafting, source: "structure-existing-data" } },
    })
    .where(eq(growthProspects.id, prospect.id));

  await logSpend("guest_research", "guest-research-ai", cost, { prospectId: prospect.id }, "openrouter", ownerId);
  logger.info({ prospectId: prospect.id, fitScore }, "guest intelligence proposed (pending approval)");
  return { ok: true, researched: true, status: "Proposed — pending Lynda approval", proposed, cost };
}
