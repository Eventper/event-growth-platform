import { Router } from "express";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import {
  growthClients,
  growthWorkspaces,
  growthCommsCampaigns,
  growthPersonas,
  growthCommunications,
  growthCommunicationAnalytics,
  growthSpendLogs,
  growthBrandThemes,
  growthSuppressions,
} from "@workspace/db";
import { getTransporter } from "./emailService";
import { authenticateToken } from "./auth";
import { logger } from "./lib/logger";
import {
  BRAND_PRESETS,
  resolveTheme,
  resolveSmartCta,
  buildEmailHtml,
  type BrandTheme,
  type EmailContent,
} from "./email-design-system";
import { generateCommunication } from "./comms-core";
import { recallMemory, scopeChain } from "./memory-service";

const router = Router();

// All AI Communications routes are owner-scoped and require a valid JWT, except
// public reference endpoints (health + static theme presets). Without this,
// every request fell back to a shared "anonymous" owner (multi-tenancy hole).
router.use((req: any, res: any, next: any) => {
  // Only guard this router's own routes. It is mounted at "/api" (not
  // "/api/ai-comms"), so without this prefix check the catch-all would 401
  // every other /api/* route registered after it (tender SaaS, growth, etc.).
  if (!req.path.startsWith("/ai-comms")) return next();
  if (req.path === "/ai-comms/health" || req.path === "/ai-comms/brand-themes/presets") return next();
  return authenticateToken(req, res, next);
});

// ── Global SaaS Rules ────────────────────────────────────────────────────
const GLOBAL_RULES = {
  neverGeneric: true,
  neverWeakLead: true,
  angleFirst: true,
  audienceAdaptive: true,
  noPricingDefault: true,
  softCtaOnly: true,
  brandProtection: true,
  seniorWriting: true,
  bannedOpeners: [
    "We are hosting", "We are excited", "Don't miss out", "Hurry",
    "Act now", "Limited time", "Amazing opportunity", "Unforgettable",
    "Once in a lifetime",
  ],
  weakPhrases: [
    "We are hosting", "We are thrilled", "We are pleased", "We are delighted",
    "We are excited to announce", "We would like to invite", "Please join us",
    "Come and join us", "You are invited", "We hope you can", "We are writing to",
    "I hope this email finds you", "Following up on", "Circling back",
    "Touching base", "Just checking in",
  ],
  softCtas: [
    "Learn more", "View details", "Request access", "Request the partnership pack",
    "Register interest", "Book a call", "Explore more", "See what we are building",
    "Find out more", "Discover the programme", "Request the brochure",
    "View the media kit", "Request the speaker pack",
  ],
};

// ── OpenRouter integration (with timeout + retry) ──────────────────────────────
const OPENROUTER_TIMEOUT = 30000; // 30 seconds
const OPENROUTER_MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function jitter(baseMs: number, variance = 0.3): number {
  const v = baseMs * variance * (Math.random() * 2 - 1);
  return Math.round(baseMs + v);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function callOpenRouter(
  model: string,
  messages: { role: string; content: string }[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<{ content: string; cost: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.Open_router_AI;
  if (!apiKey) throw new Error("OpenRouter authentication not configured. Please add an API key.");

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= OPENROUTER_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://eventperfekt.com",
          "X-Title": "AI Communications Engine",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: opts.maxTokens || 700,
          temperature: opts.temperature ?? 0.6,
        }),
        signal: AbortSignal.timeout(OPENROUTER_TIMEOUT),
      });

      if (!res.ok) {
        const status = res.status;
        const body = await res.text().catch(() => "");
        // Do not retry client errors (4xx except 429) or auth errors
        if (status === 401 || status === 403) {
          throw new Error(`OpenRouter authentication failed (${status}). Please verify your API key.`);
        }
        if (status === 400) {
          throw new Error(`OpenRouter request rejected (${status}): ${body || "Bad request"}`);
        }
        if (!RETRYABLE_STATUS_CODES.has(status)) {
          throw new Error(`OpenRouter error ${status}: ${body || res.statusText}`);
        }
        // Retryable error — throw and let the loop catch it
        throw new Error(`OpenRouter retryable error ${status}: ${body || res.statusText}`);
      }

      const data: any = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      const cost = data.usage?.total_cost || data.usage?.prompt_tokens * 0.000003 || 0;
      return { content, cost };
    } catch (err: any) {
      lastError = err;
      const isRetryable = err.message?.includes("retryable") ||
        err.name === "AbortError" ||
        err.name === "TimeoutError" ||
        err.message?.includes("fetch");
      if (!isRetryable || attempt === OPENROUTER_MAX_RETRIES) {
        break;
      }
      // Exponential backoff: 1s, 2s, 4s with jitter
      const backoff = jitter(1000 * Math.pow(2, attempt - 1));
      await sleep(backoff);
    }
  }

  // Final error — clear operational message
  if (lastError?.name === "AbortError" || lastError?.message?.includes("timeout")) {
    throw new Error("AI generation timed out. Please retry.");
  }
  if (lastError?.message?.includes("429")) {
    throw new Error("AI service rate limit exceeded. Please wait a moment and retry.");
  }
  if (lastError?.message?.includes("50") || lastError?.message?.includes("gateway")) {
    throw new Error("AI service temporarily unavailable. Please retry.");
  }
  throw new Error(`AI generation failed after ${OPENROUTER_MAX_RETRIES} attempts: ${lastError?.message}`);
}

async function logSpend(operation: string, model: string, cost: number, metadata: any, vendor = "openrouter") {
  await db.insert(growthSpendLogs).values({
    operation, vendor, cost: cost.toString(), model, metadata,
  });
}

// ── Reasoning Layer: Determines communication strategy BEFORE writing ──────
export interface RecipientIntelligence {
  name: string;
  role: string;
  title?: string;
  company?: string;
  sector?: string;
  publication?: string;
  editorialFocus?: string;
  brandValues?: string[];
  expertise?: string[];
  knownInterests?: string[];
  previousInteractions?: string;
  context?: string;
}

export interface CommunicationObjective {
  desiredOutcome: string;
  urgency?: "low" | "medium" | "high";
  priority?: "relationship" | "commercial" | "visibility";
  angle?: string;
  keyMessage?: string;
  exclusions?: string[];
  maxWords?: number;
}

export interface ConsideredAngle {
  angle: string;
  why: string; // why this angle would or wouldn't land
  chosen: boolean;
}

export interface CommunicationStrategy {
  recipientProfile: string;
  storyAngle: string;
  consideredAngles: ConsideredAngle[]; // the chosen angle + the ones rejected, with reasoning (vision #4)
  subject: string;
  openingHook: string;
  supportingNarrative: string;
  cta: string;
  tone: string;
  maxWords: number;
  exclusions: string[];
}

// Step 1: Determine the optimal strategy
export async function buildCommunicationStrategy(
  client: any,
  campaign: any,
  recipient: RecipientIntelligence,
  objective: CommunicationObjective,
  persona: any,
  memoryContext?: string
): Promise<{ strategy: CommunicationStrategy; cost: number }> {
  const clientName = client?.name || "The client";
  const brandVoice = client?.brandVoice || "professional";
  const approvedPhrases = client?.approvedPhrases || [];
  const bannedPhrases = client?.bannedPhrases || [];

  const reasoningPrompt = `You are an experienced Communications Strategist writing for ${clientName}. Brand voice: ${brandVoice}. Tone: ${persona?.tone || "professional"}.

You are planning a communication — NOT writing it yet. First, determine the strategy.

## RECIPIENT
Name: ${recipient.name}
Role: ${recipient.role}
${recipient.title ? `Title: ${recipient.title}` : ""}
${recipient.company ? `Company: ${recipient.company}` : ""}
${recipient.sector ? `Sector: ${recipient.sector}` : ""}
${recipient.publication ? `Publication: ${recipient.publication}` : ""}
${recipient.editorialFocus ? `They cover: ${recipient.editorialFocus}` : ""}
${recipient.brandValues ? `Brand values: ${recipient.brandValues.join(", ")}` : ""}
${recipient.expertise ? `Expertise: ${recipient.expertise.join(", ")}` : ""}
${recipient.knownInterests ? `Known interests: ${recipient.knownInterests.join(", ")}` : ""}
${recipient.previousInteractions ? `Previous interactions: ${recipient.previousInteractions}` : ""}
${recipient.context ? `Context: ${recipient.context}` : ""}

## OBJECTIVE
Desired outcome: ${objective.desiredOutcome}
Priority: ${objective.priority || "relationship"}
Urgency: ${objective.urgency || "medium"}
${objective.angle ? `Suggested angle: ${objective.angle}` : ""}
${objective.keyMessage ? `Key message: ${objective.keyMessage}` : ""}
${objective.exclusions?.length ? `Exclusions: ${objective.exclusions.join(", ")}` : ""}

## CAMPAIGN CONTEXT
${campaign?.objective ? `Campaign objective: ${campaign.objective}` : ""}
${campaign?.keyMessages?.length ? `Key messages: ${campaign.keyMessages.join(", ")}` : ""}
${campaign?.storyAngles?.length ? `Story angles: ${campaign.storyAngles.map((a: any) => a.angle).join(", ")}` : ""}
${campaign?.targetAudience?.length ? `Target audience: ${campaign.targetAudience.map((a: any) => a.segment).join(", ")}` : ""}

${approvedPhrases.length ? `Approved phrases: ${approvedPhrases.join(", ")}` : ""}
${bannedPhrases.length ? `Banned phrases (NEVER use): ${bannedPhrases.join(", ")}` : ""}

${memoryContext ? `## INSTITUTIONAL MEMORY (account knowledge — honour these absolutely)\n${memoryContext}\n` : ""}
## GLOBAL RULES
- The subject line is an EDITORIAL HOOK. It is NOT the campaign name. It is NOT a generic label.
- NEVER use internal category names like "PR Pitch", "Sponsor Email", "Outreach", "Guest Invitation" in the subject.
- The campaign name should almost never appear in the subject unless it is already a recognised brand.
- Lead with the story angle, not the event/campaign name.
- Every message must be unique. Never template.
- Never include pricing, dates, or venue details unless explicitly requested.

## YOUR TASK
Brainstorm THREE distinct angles you could take with this person, then deliberately choose the strongest and reject the other two — recording WHY each was kept or dropped. This reasoning is shown to the user, so be honest and specific about the trade-offs.

Return ONLY a JSON object with this exact shape:

{
  "recipientProfile": "2-3 sentence profile of who this person is and what they care about",
  "consideredAngles": [
    {"angle": "Candidate angle A — a specific way in", "why": "why it could land for THIS person", "chosen": true},
    {"angle": "Candidate angle B you deliberately rejected", "why": "why it is weaker for this person", "chosen": false},
    {"angle": "Candidate angle C you deliberately rejected", "why": "why it is weaker for this person", "chosen": false}
  ],
  "storyAngle": "The specific angle that will resonate with this person — MUST equal the 'chosen' angle above. Be specific, not generic.",
  "subject": "The subject line — an editorial hook. NO campaign names. NO generic labels.",
  "openingHook": "The first sentence/paragraph. Must lead with the angle, not with 'We are...'",
  "supportingNarrative": "The main body narrative — what we say to build the case. 2-3 sentences max.",
  "cta": "The single soft next action. One of: Learn more, View details, Request access, Register interest, Book a call, Explore more, See what we are building, Find out more, Discover the programme, Request the brochure, View the media kit, Request the speaker pack, Request the partnership pack.",
  "tone": "The tone for this message: warm, formal, editorial, direct, casual, etc.",
  "maxWords": ${objective.maxWords || 200},
  "exclusions": [${(objective.exclusions || []).map((e: string) => `"${e}"`).join(", ") || "\"pricing\""}]
}`;

  const { content, cost } = await callOpenRouter(
    "anthropic/claude-sonnet-4.6",
    [{ role: "system", content: reasoningPrompt }, { role: "user", content: "Plan the optimal communication strategy for this recipient and objective." }],
    { maxTokens: 900, temperature: 0.6 }
  );

  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Failed to parse communication strategy from AI");
  }
  const parsed = JSON.parse(match[0]);

  const consideredAngles: ConsideredAngle[] = Array.isArray(parsed.consideredAngles)
    ? parsed.consideredAngles
        .filter((a: any) => a && a.angle)
        .map((a: any) => ({ angle: String(a.angle), why: String(a.why || ""), chosen: !!a.chosen }))
    : [];
  // Guarantee exactly one chosen angle that matches storyAngle.
  const chosenAngle = parsed.storyAngle || objective.angle || consideredAngles.find((a) => a.chosen)?.angle || "";
  if (consideredAngles.length && !consideredAngles.some((a) => a.chosen)) {
    consideredAngles[0].chosen = true;
  }

  const strategy: CommunicationStrategy = {
    recipientProfile: parsed.recipientProfile || "",
    storyAngle: chosenAngle,
    consideredAngles,
    subject: parsed.subject || "",
    openingHook: parsed.openingHook || "",
    supportingNarrative: parsed.supportingNarrative || "",
    cta: parsed.cta || "Learn more",
    tone: parsed.tone || persona?.tone || "professional",
    maxWords: parsed.maxWords || objective.maxWords || 200,
    exclusions: parsed.exclusions || objective.exclusions || ["pricing"],
  };
  return { strategy, cost };
}

export interface GeneratedEmail {
  subject: string;
  preheader?: string;
  headline?: string;
  opening?: string;
  paragraphs: string[];
  story?: string;
  signature?: { name?: string; title?: string; org?: string };
  body: string; // opening + paragraphs + story joined — for quality gate & storage
}

// Step 2: Generate the actual email based on the strategy
export async function generateEmail(
  strategy: CommunicationStrategy,
  client: any,
  campaign: any,
  recipient: RecipientIntelligence,
  persona: any
): Promise<{ email: GeneratedEmail; cost: number }> {
  const clientName = client?.name || "";
  const brandVoice = client?.brandVoice || "professional";
  const approvedPhrases = client?.approvedPhrases || [];
  const bannedPhrases = client?.bannedPhrases || [];
  const approvedLinks = campaign?.approvedLinks || [];

  const writingPrompt = `You are an experienced ${persona?.title || "Communications Adviser"}. Brand voice: ${brandVoice}. Tone: ${strategy.tone}.

## STRATEGY
Recipient profile: ${strategy.recipientProfile}
Story angle: ${strategy.storyAngle}
Subject: ${strategy.subject}
Opening hook: ${strategy.openingHook}
Supporting narrative: ${strategy.supportingNarrative}
CTA: ${strategy.cta}
Max words: ${strategy.maxWords}
Exclusions: ${strategy.exclusions.join(", ")}

${approvedPhrases.length ? `Approved phrases: ${approvedPhrases.join(", ")}` : ""}
${bannedPhrases.length ? `Banned phrases (NEVER use): ${bannedPhrases.join(", ")}` : ""}
${approvedLinks.length ? `Approved links: ${approvedLinks.map((l: any) => `${l.label} (${l.url})`).join(", ")}` : ""}

## GLOBAL RULES
1. NEVER write generic emails. Every word must earn its place.
2. NEVER lead with weak phrases like "We are hosting..." or "We are excited...".
3. ALWAYS lead with the angle — recipient value first, not event details.
4. NEVER include campaign name in the subject unless it's a recognised brand.
5. NEVER use internal category names ("PR Pitch", "Sponsor Email", "Outreach") anywhere.
6. NEVER include prices, dates, or venue details unless explicitly permitted.
7. Write like a senior communications professional — not an AI assistant.
8. Every message must be completely unique. Never use templates.

## OUTPUT
Write the email to ${recipient.name}.

Return ONLY a JSON object with this exact shape:
{
  "subject": "${strategy.subject}",
  "preheader": "one-line preview text (max ~90 chars)",
  "headline": "the in-email headline — may differ from the subject",
  "opening": "the opening paragraph — lead with the story angle",
  "paragraphs": ["body paragraph 1", "body paragraph 2"],
  "story": "optional pull-quote / human-interest line, or empty string",
  "signature": { "name": "sender name or empty", "title": "", "org": "" }
}
Keep the whole body within ${strategy.maxWords} words. Do not include a greeting line or a sign-off CTA — those are composed by the platform.`;

  const { content, cost } = await callOpenRouter(
    "anthropic/claude-sonnet-4.6",
    [{ role: "system", content: writingPrompt }, { role: "user", content: `Write the email to ${recipient.name} at ${recipient.company || "their organisation"}.` }],
    { maxTokens: 700, temperature: 0.65 }
  );

  return { email: parseEmail(content, strategy), cost };
}

// Step 2b: Refine a draft that failed the quality gate, addressing the feedback.
export async function refineEmail(
  strategy: CommunicationStrategy,
  feedback: string,
  recipientName: string
): Promise<{ email: GeneratedEmail; cost: number }> {
  const refinePrompt = `The previous draft failed quality review with these issues:
${feedback}

Strategy: ${strategy.storyAngle}
Subject: ${strategy.subject}
Opening: ${strategy.openingHook}

Rewrite the email for ${recipientName}, addressing ALL issues. Keep the same strategy but improve the execution.

Return ONLY a JSON object with:
{
  "subject": "editorial hook subject",
  "preheader": "one-line preview",
  "headline": "in-email headline",
  "opening": "opening paragraph",
  "paragraphs": ["body 1", "body 2"],
  "story": "pull-quote or empty",
  "signature": { "name": "", "title": "", "org": "" }
}`;
  const { content, cost } = await callOpenRouter(
    "anthropic/claude-sonnet-4.6",
    [{ role: "system", content: refinePrompt }, { role: "user", content: `Rewrite for ${recipientName}` }],
    { maxTokens: 700, temperature: 0.65 }
  );
  return { email: parseEmail(content, strategy), cost };
}

/** Parse the model's JSON email output into structured blocks, with a plain-text fallback. */
export function parseEmail(content: string, strategy: CommunicationStrategy): GeneratedEmail {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    const lines = content.trim().split("\n").map(l => l.trim()).filter(Boolean);
    const subject = (lines[0] || strategy.subject).replace(/^Subject:?\s*/i, "").trim();
    const paragraphs = lines.slice(1);
    return { subject, paragraphs, body: paragraphs.join("\n\n") };
  }
  let parsed: any = {};
  try { parsed = JSON.parse(match[0]); } catch { parsed = {}; }
  const opening = parsed.opening ? String(parsed.opening).trim() : undefined;
  const paragraphs = Array.isArray(parsed.paragraphs)
    ? parsed.paragraphs.map((p: any) => String(p).trim()).filter(Boolean)
    : [];
  const story = parsed.story ? String(parsed.story).trim() : undefined;
  const body = [opening, ...paragraphs, story].filter(Boolean).join("\n\n");
  return {
    subject: (parsed.subject || strategy.subject || "").trim(),
    preheader: parsed.preheader ? String(parsed.preheader).trim() : undefined,
    headline: parsed.headline ? String(parsed.headline).trim() : undefined,
    opening,
    paragraphs,
    story,
    signature: parsed.signature && typeof parsed.signature === "object" ? parsed.signature : undefined,
    body,
  };
}

/**
 * Infer an INTERNAL layout/communication type from the recipient and objective.
 * This is never shown to the user — it only selects the email's design language
 * and is stored for analytics. There is no user-facing "message type" dropdown.
 */
export function inferLayoutType(recipient: RecipientIntelligence, objective: CommunicationObjective): string {
  const hay = `${recipient.role || ""} ${recipient.title || ""} ${recipient.publication || ""} ${recipient.sector || ""} ${objective.desiredOutcome || ""}`.toLowerCase();
  const has = (...words: string[]) => words.some(w => hay.includes(w));
  if (has("thank")) return "thank_you";
  if (recipient.publication || has("journalist", "editor", "press", "reporter", "podcast", "media", "correspondent", "columnist", "broadcast")) return "pr_pitch";
  if (has("speaker", "panellist", "panelist", "keynote", "moderator")) return "speaker_invitation";
  if (has("invest")) return "investor_update";
  if (has("sponsor", "partnership", "brand partner", "commercial partner")) return "sponsor_pitch";
  if (has("corporate", "procurement", "csr", "head of", "director of people", "chief people", "hr ", "l&d")) return "corporate_partnership";
  if (has("guest", "attendee", "member", "vip", "nominee", "delegate")) return "guest_invitation";
  if (objective.priority === "commercial") return "sponsor_pitch";
  if (objective.priority === "visibility") return "pr_pitch";
  return "guest_invitation";
}

// ── Quality Gate ────────────────────────────────────────────────────────────
export function runQualityGate(
  subject: string,
  body: string,
  strategy: CommunicationStrategy,
  client: any,
  campaign: any
): {
  passed: boolean; total: number; generic: number; relevant: number;
  hook: number; value: number; brand: number; pricing: number; cta: number; human: number;
  subjectQuality: number; infoDump: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  const lowerBody = body.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  let generic = 100;
  const genericPhrases = [
    "we are hosting", "we are excited", "don't miss out", "amazing opportunity",
    "unforgettable", "once in a lifetime", "join us", "come and", "please join",
    "we would like to invite", "we are writing to", "we are thrilled", "we are pleased",
    "we are delighted", "we hope you can", "following up", "circling back",
    "touching base", "just checking in", "i hope this email finds you",
  ];
  for (const phrase of genericPhrases) {
    if (lowerBody.includes(phrase)) {
      generic -= 15;
      feedback.push(`Remove generic phrase: "${phrase}"`);
    }
  }
  generic = Math.max(0, generic);

  let relevant = 90;

  let hook = 80;
  const firstSentence = body.split(/[.!?]/)[0] || "";
  if (firstSentence.length < 30) hook = 50;
  if (firstSentence.length > 200) hook = 60;
  if (firstSentence.toLowerCase().startsWith("we ")) {
    hook -= 20;
    feedback.push("Lead sentence starts with 'We'. Lead with the recipient's angle instead.");
  }
  if (firstSentence.includes("?")) hook += 10;
  hook = Math.min(100, Math.max(0, hook));

  let value = 85;
  const valueWords = ["because", "which means", "you will", "result", "outcome", "deliver"];
  const hasValueWord = valueWords.some(w => lowerBody.includes(w));
  if (!hasValueWord) {
    value -= 10;
    feedback.push("Add explicit value: what does the recipient gain?");
  }
  value = Math.max(0, Math.min(100, value));

  let brand = 95;
  const banned = client?.bannedPhrases || [];
  for (const phrase of banned) {
    if (lowerBody.includes(phrase.toLowerCase())) {
      brand -= 20;
      feedback.push(`Remove banned phrase: "${phrase}"`);
    }
  }
  brand = Math.max(0, brand);

  let pricing = 100;
  const priceWords = ["£", "$", "€", "price", "cost", "fee", "ticket", "rate", "sponsorship", "package"];
  if (strategy.exclusions.includes("pricing")) {
    for (const word of priceWords) {
      if (lowerBody.includes(word.toLowerCase())) {
        pricing -= 25;
        feedback.push(`Remove pricing reference: "${word}"`);
      }
    }
  }
  pricing = Math.max(0, pricing);

  let cta = 85;
  const ctaWords = ["learn more", "view details", "request access", "request the", "register interest", "book a call", "explore", "discover", "find out", "see what"];
  const hasGoodCta = ctaWords.some(w => lowerBody.includes(w.toLowerCase()));
  if (!hasGoodCta) {
    cta -= 15;
    feedback.push("Add a soft CTA: Learn more, Request access, or Book a call.");
  }
  cta = Math.max(0, Math.min(100, cta));

  let human = 75;
  const hasNaturalLanguage = lowerBody.includes("\u2019") || lowerBody.includes("\u2018") || lowerBody.includes("\u201c");
  if (hasNaturalLanguage) human += 10;
  const hasSpecifics = /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|london|new york|milton keynes|hotel|conference|summit|\d+\s*(?:am|pm|year|years|month|months|week|weeks))\b/i.test(body);
  if (hasSpecifics) human += 10;
  const hasContraction = /\b(?:we're|you're|it's|that's|they're|i'm|can't|won't|don't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|wouldn't|shouldn't|couldn't|mustn't|let's|there's|here's|who's|what's|where's|when's|why's|how's)\b/i.test(body);
  if (hasContraction) human += 10;
  human = Math.max(0, Math.min(100, human));

  let subjectQuality = 100;
  const genericLabels = ["pr pitch", "sponsor pitch", "sponsor email", "outreach email", "guest email", "guest invitation", "press release", "follow up", "follow-up", "thank you", "invitation", "media pitch", "partnership pitch", "story pitch", "event pitch"];
  for (const label of genericLabels) {
    if (lowerSubject === label || lowerSubject.startsWith(label + " ") || lowerSubject.includes(`: ${label}`)) {
      subjectQuality -= 40;
      feedback.push(`Subject reads like an internal label ("${label}"). Use an editorial hook instead.`);
      break;
    }
  }
  const campaignName = (campaign?.name || "").toLowerCase().trim();
  if (campaignName && campaignName.length > 3 && lowerSubject.includes(campaignName)) {
    subjectQuality -= 25;
    feedback.push("Subject leads with the campaign name; lead with the story angle instead.");
  }
  subjectQuality = Math.max(0, subjectQuality);

  let infoDump = 100;
  const dumpPatterns = [/\bdate\s*:/i, /\bvenue\s*:/i, /\btime\s*:/i, /\bticket\s*price\s*:/i, /\bcategory\s*:/i, /\bprice\s*:/i, /\bcampaign\s*:/i, /\baddress\s*:/i];
  for (const re of dumpPatterns) {
    if (re.test(body)) {
      infoDump -= 25;
      feedback.push(`Remove information-dump line matching ${re}. Link to the campaign page instead.`);
    }
  }
  infoDump = Math.max(0, infoDump);

  const total = Math.round((generic + relevant + hook + value + brand + pricing + cta + human + subjectQuality + infoDump) / 10);
  const passed = total >= 80 && pricing >= 80 && brand >= 70 && subjectQuality >= 60 && infoDump >= 75;

  return { passed, total, generic, relevant, hook, value, brand, pricing, cta, human, subjectQuality, infoDump, feedback };
}

// ── Helper functions ──────────────────────────────────────────────────────────────────
export function resolveCtaUrl(client: any, campaign: any): string {
  const links = (campaign?.approvedLinks as any[]) || [];
  const byType = links.find(l => l.type === campaign?.cta);
  return byType?.url || links[0]?.url || client?.websiteUrl || "#";
}

export function resolveCampaignLink(campaign: any): { label?: string; url?: string } {
  const links = (campaign?.approvedLinks as any[]) || [];
  const details = links.find(l => l.type === "view_details" || l.type === "learn_more") || links[0];
  if (!details?.url) return {};
  return { label: details.label || "View details", url: details.url };
}

// ── Workspaces ──────────────────────────────────────────────────────────────
// The tier between the account and a Brand. Every owner has at least one (a
// "Default Workspace" auto-provisioned on first access); brands belong to one.
export async function ensureDefaultWorkspace(ownerId: string): Promise<string> {
  const existing = await db.select().from(growthWorkspaces).where(eq(growthWorkspaces.ownerId, ownerId));
  if (existing.length) return (existing.find((w) => w.isDefault) || existing[0]).id;
  const [created] = await db
    .insert(growthWorkspaces)
    .values({ ownerId, name: "Default Workspace", description: "Your default workspace", isDefault: true })
    .returning();
  return created.id;
}

router.get("/ai-comms/workspaces", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    await ensureDefaultWorkspace(ownerId); // guarantee at least one exists
    const workspaces = await db.select().from(growthWorkspaces).where(eq(growthWorkspaces.ownerId, ownerId));
    return res.json({ ok: true, workspaces });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list workspaces");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/ai-comms/workspaces", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const [workspace] = await db
      .insert(growthWorkspaces)
      .values({ ownerId, name: req.body?.name || "New Workspace", description: req.body?.description || null })
      .returning();
    return res.json({ ok: true, workspace });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create workspace");
    return res.status(500).json({ error: err.message });
  }
});

// ── Clients CRUD ──────────────────────────────────────────────────────────────────
router.get("/ai-comms/clients", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const clients = await db.select().from(growthClients).where(eq(growthClients.ownerId, ownerId));
    return res.json({ ok: true, clients });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list clients");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/ai-comms/clients", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    // Every brand belongs to a workspace — default it if the caller doesn't pick one.
    const workspaceId = req.body?.workspaceId || (await ensureDefaultWorkspace(ownerId));
    const [client] = await db.insert(growthClients).values({ ...req.body, ownerId, workspaceId }).returning();
    return res.json({ ok: true, client });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create client");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/ai-comms/clients/:id", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthClients).where(eq(growthClients.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    const [updated] = await db.update(growthClients).set(req.body).where(eq(growthClients.id, id)).returning();
    return res.json({ ok: true, client: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update client");
    return res.status(500).json({ error: err.message });
  }
});

// ── Campaigns CRUD ───────────────────────────────────────────────────────────
router.get("/ai-comms/campaigns", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { clientId } = req.query;
    let campaigns;
    if (clientId) {
      campaigns = await db.select().from(growthCommsCampaigns).where(eq(growthCommsCampaigns.clientId, clientId));
    } else {
      campaigns = await db.select().from(growthCommsCampaigns).where(eq(growthCommsCampaigns.ownerId, ownerId));
    }
    return res.json({ ok: true, campaigns });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list campaigns");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/ai-comms/campaigns", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const [campaign] = await db.insert(growthCommsCampaigns).values({ ...req.body, ownerId }).returning();
    return res.json({ ok: true, campaign });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create campaign");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/ai-comms/campaigns/:id", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthCommsCampaigns).where(eq(growthCommsCampaigns.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    const [updated] = await db.update(growthCommsCampaigns).set(req.body).where(eq(growthCommsCampaigns.id, id)).returning();
    return res.json({ ok: true, campaign: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update campaign");
    return res.status(500).json({ error: err.message });
  }
});

// ── Personas CRUD ─────────────────────────────────────────────────────────────
router.get("/ai-comms/personas", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const personas = await db.select().from(growthPersonas).where(eq(growthPersonas.ownerId, ownerId));
    return res.json({ ok: true, personas });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list personas");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/ai-comms/personas", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const [persona] = await db.insert(growthPersonas).values({ ...req.body, ownerId }).returning();
    return res.json({ ok: true, persona });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create persona");
    return res.status(500).json({ error: err.message });
  }
});

// ── Communications CRUD ──────────────────────────────────────────────────────────
router.get("/ai-comms/communications", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { clientId, campaignId, status } = req.query;
    let comms = await db.select().from(growthCommunications).where(eq(growthCommunications.ownerId, ownerId));
    if (clientId) comms = comms.filter(c => c.clientId === clientId);
    if (campaignId) comms = comms.filter(c => c.campaignId === campaignId);
    if (status) comms = comms.filter(c => c.status === status);
    return res.json({ ok: true, communications: comms });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list communications");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/ai-comms/communications/:id", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const [comm] = await db.select().from(growthCommunications).where(eq(growthCommunications.id, req.params.id));
    if (!comm || comm.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    return res.json({ ok: true, communication: comm });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get communication");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/ai-comms/communications/:id", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthCommunications).where(eq(growthCommunications.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    const [updated] = await db.update(growthCommunications).set(req.body).where(eq(growthCommunications.id, id)).returning();
    return res.json({ ok: true, communication: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update communication");
    return res.status(500).json({ error: err.message });
  }
});

// ── AI Generate: Reasoning-first ──────────────────────────────────────────────────────────
router.post("/ai-comms/generate", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { clientId, campaignId, recipient, objective, personaId } = req.body;

    if (!clientId || !campaignId || !recipient || !objective || !objective.desiredOutcome) {
      return res.status(400).json({ error: "Missing clientId, campaignId, recipient, or objective.desiredOutcome" });
    }

    const [client] = await db.select().from(growthClients).where(eq(growthClients.id, clientId));
    const [campaign] = await db.select().from(growthCommsCampaigns).where(eq(growthCommsCampaigns.id, campaignId));
    if (!client || client.ownerId !== ownerId) return res.status(403).json({ error: "Client access denied" });
    if (!campaign || campaign.ownerId !== ownerId) return res.status(403).json({ error: "Campaign access denied" });

    // Select persona
    let persona: any = null;
    if (personaId) {
      const [p] = await db.select().from(growthPersonas).where(eq(growthPersonas.id, personaId));
      if (p && p.ownerId === ownerId) persona = p;
    }
    if (!persona) {
      const roleMap: Record<string, string> = {
        journalist: "pr", media: "pr", editor: "pr",
        sponsor: "sponsor", brand: "sponsor",
        speaker: "creative", expert: "creative",
        corporate: "corporate", partner: "corporate",
        prospect: "sales", lead: "sales",
        investor: "corporate",
        community: "community",
        vip: "executive",
        referral: "community",
        executive: "executive",
      };
      const [autoPersona] = await db.select().from(growthPersonas)
        .where(eq(growthPersonas.role, roleMap[recipient.role] || "executive"));
      if (!autoPersona) {
        const [fallback] = await db.select().from(growthPersonas).where(eq(growthPersonas.role, "executive"));
        persona = fallback;
      } else {
        persona = autoPersona;
      }
    }

    // Resolve the campaign/client brand theme row (if any) to pass to the core.
    const themeId = (campaign as any).brandThemeId || (client as any).defaultThemeId || null;
    let themeRow: any = null;
    if (themeId) {
      const [t] = await db.select().from(growthBrandThemes).where(eq(growthBrandThemes.id, themeId));
      if (t && (t.ownerId === ownerId || t.isPreset)) themeRow = t;
    }

    // Institutional memory: account → workspace → brand (client) → campaign.
    const workspaceId = (client as any).workspaceId || null;
    const memoryContext = await recallMemory(ownerId, scopeChain(ownerId, { workspaceId, brandId: clientId, campaignId }));

    // ── UNIFIED CORE: reasoning → write → quality gate → branded HTML ──
    const result = await generateCommunication({
      ownerId, brand: client, campaign, recipient, objective, persona, themeRow, memoryContext,
    });
    const { strategy, quality, layoutType, ctaLabel, ctaUrl, html, themeName } = result;
    const email = { subject: result.subject, body: result.body, preheader: result.preheader, headline: result.headline };

    await logSpend("ai_comms_generate", "comms-core", result.cost, { clientId, campaignId, quality: quality.total }, "openrouter");

    // Duplicate protection: check for existing draft or sent communication
    const existing = await db.select()
      .from(growthCommunications)
      .where(and(
        eq(growthCommunications.clientId, clientId),
        eq(growthCommunications.campaignId, campaignId),
        eq(growthCommunications.recipientEmail, recipient.email),
        eq(growthCommunications.messageType, layoutType),
        eq(growthCommunications.status, "draft")
      ))
      .limit(1);
    if (existing.length > 0) {
      logger.info({ communicationId: existing[0].id }, "Duplicate draft found — returning existing communication");
      return res.json({ ok: true, communication: existing[0], duplicate: true, message: "Draft already exists for this recipient." });
    }
    const alreadySent = await db.select()
      .from(growthCommunications)
      .where(and(
        eq(growthCommunications.clientId, clientId),
        eq(growthCommunications.campaignId, campaignId),
        eq(growthCommunications.recipientEmail, recipient.email),
        eq(growthCommunications.messageType, layoutType),
        eq(growthCommunications.status, "sent")
      ))
      .limit(1);
    if (alreadySent.length > 0 && !req.body.forceResend) {
      return res.status(409).json({ error: "Already sent to this recipient. Use forceResend=true to override." });
    }

    // Store
    const [communication] = await db.insert(growthCommunications).values({
      clientId,
      campaignId,
      ownerId,
      messageType: layoutType,
      recipientId: recipient.id,
      recipientType: recipient.role || "prospect",
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      recipientTitle: recipient.title,
      recipientCompany: recipient.company,
      recipientContext: recipient,
      subject: email.subject,
      body: email.body,
      html,
      status: "draft",
      qualityScore: quality.total,
      reasoningSummary: `Angle: ${strategy.storyAngle}. CTA: ${ctaLabel}. Theme: ${themeName}. Tone: ${strategy.tone}.`,
      personaUsed: persona?.name,
      ctaUsed: ctaLabel,
      preWritingIntelligence: { ...strategy, layoutType, themeName, themeId, ctaUrl },
      qualityGateResult: quality,
    }).returning();

    return res.json({
      ok: true,
      communication: {
        id: communication.id,
        subject: email.subject,
        body: email.body,
        html,
        qualityScore: quality.total,
        reasoningSummary: communication.reasoningSummary,
        personaUsed: persona?.name,
        ctaUsed: ctaLabel,
        ctaLabel,
        themeName,
        qualityGate: quality,
        preWritingIntelligence: communication.preWritingIntelligence,
        strategy,
        trust: result.trust, // branded engines + chosen/rejected angles + scorecard (vision #4-7)
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "AI Communications generate failed");
    return res.status(500).json({ error: err.message });
  }
});

// ── Send Communication ──────────────────────────────────────────────────────────────────
// Gmail-only sender for AI Communications. Sends the themed HTML directly via
// Gmail (service:"gmail" + app password) — deliberately NOT the shared sendMail,
// which tries Namecheap SMTP first. Same GMAIL_* env vars used across the repo.
async function sendCommViaProvider(to: string, subject: string, html: string, fromName: string, fromEmail?: string): Promise<{ provider: string; messageId: string | undefined }> {
  const provider = await getTransporter();
  if (!provider) throw new Error("No email provider available. Check NAMECHEAP_EMAIL + NAMECHEAP_PASSWORD.");

  const info = await provider.transporter.sendMail({
    from: `"${fromName}" <${fromEmail || provider.smtpUser}>`,
    to,
    subject,
    html,
    text: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
  });
  return { provider: provider.smtpUser.includes("privateemail") ? "namecheap" : "gmail", messageId: info.messageId };
}

router.post("/ai-comms/communications/:id/send", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { id } = req.params;
    const [comm] = await db.select().from(growthCommunications).where(eq(growthCommunications.id, id));
    if (!comm || comm.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    if (comm.status !== "draft" && comm.status !== "approved") return res.status(400).json({ error: "Communication must be draft or approved" });
    if (!comm.recipientEmail) return res.status(400).json({ error: "No recipient email" });

    // Hard gate: never email a suppressed (unsubscribed) address.
    const suppressed = await db.select().from(growthSuppressions).where(eq(growthSuppressions.email, comm.recipientEmail));
    if (suppressed.length > 0) return res.status(400).json({ error: "Recipient is suppressed (unsubscribed)" });

    const [client] = await db.select().from(growthClients).where(eq(growthClients.id, comm.clientId!));

    let html = comm.html;
    if (!html) {
      const [campaign] = await db.select().from(growthCommsCampaigns).where(eq(growthCommsCampaigns.id, comm.campaignId!));
      const theme = resolveTheme(client, campaign);
      html = buildEmailHtml(comm.messageType, {
        subject: comm.subject,
        paragraphs: (comm.body || "").split(/\n{2,}/).map(s => s.trim()).filter(Boolean),
        clientName: client?.name || "",
        websiteUrl: client?.websiteUrl || undefined,
      }, theme, { label: "Learn more", url: client?.websiteUrl || "#" });
    }

    const sendResult = await sendCommViaProvider(comm.recipientEmail, comm.subject, html, client?.name || "Event Perfekt");
    await logSpend("ai_comms_send", sendResult.provider, 0, { communicationId: id, clientId: comm.clientId, campaignId: comm.campaignId, recipient: comm.recipientEmail }, sendResult.provider);

    const [updated] = await db.update(growthCommunications)
      .set({ status: "sent", sentAt: new Date(), deliveryStatus: "sent", provider: sendResult.provider, providerMessageId: sendResult.messageId || undefined })
      .where(eq(growthCommunications.id, id))
      .returning();

    return res.json({ ok: true, sent: true, recipient: comm.recipientEmail, communication: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "AI Communications send failed");
    const statusCode = err.message?.includes("unavailable") || err.message?.includes("timed out") || err.message?.includes("failed") ? 503 : 500;
    return res.status(statusCode).json({ error: err.message || "Send failed. Please retry." });
  }
});

// ── Health Check ────────────────────────────────────────────────────────────────
router.get("/ai-comms/health", async (_req: any, res) => {
  const results: Record<string, { status: string; message: string; lastChecked?: string }> = {};
  const now = new Date().toISOString();

  try {
    await db.execute(sql`SELECT 1`);
    results.db = { status: "healthy", message: "Connected", lastChecked: now };
  } catch (err: any) {
    results.db = { status: "unhealthy", message: "Connection failed: " + err.message, lastChecked: now };
  }

  try {
    const provider = await getTransporter();
    if (provider) {
      results.email = { status: "healthy", message: `Provider: ${provider.smtpUser.includes("privateemail") ? "Namecheap" : "Gmail"} (${provider.smtpUser})`, lastChecked: now };
    } else {
      results.email = { status: "unhealthy", message: "No email provider configured. Set NAMECHEAP_EMAIL + NAMECHEAP_PASSWORD or GMAIL_APP_PASSWORD.", lastChecked: now };
    }
  } catch (err: any) {
    results.email = { status: "unhealthy", message: err.message, lastChecked: now };
  }

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.Open_router_AI;
  if (apiKey) {
    try {
      const check = await fetch("https://openrouter.ai/api/v1/auth/key", { headers: { "Authorization": `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) });
      if (check.ok) {
        results.openrouter = { status: "healthy", message: "Key valid", lastChecked: now };
      } else {
        results.openrouter = { status: "unhealthy", message: `Key invalid (${check.status})`, lastChecked: now };
      }
    } catch (err: any) {
      results.openrouter = { status: "unhealthy", message: "Connection failed: " + err.message, lastChecked: now };
    }
  } else {
    results.openrouter = { status: "unhealthy", message: "API key not configured. Set OPENROUTER_API_KEY.", lastChecked: now };
  }

  const apolloKey = process.env.APOLLO_AI || process.env.APOLLO_API_KEY;
  if (apolloKey && !apolloKey.startsWith("sk-")) {
    results.apollo = { status: "healthy", message: "API key configured", lastChecked: now };
  } else {
    results.apollo = {
      status: "unhealthy",
      message: "Apollo key missing or invalid. Set APOLLO_AI or APOLLO_API_KEY to a valid Apollo key (not sk-...).",
      lastChecked: now,
    };
  }

  const overall = Object.values(results).every(r => r.status === "healthy") ? "healthy" : "degraded";
  return res.json({ status: overall, services: results, checkedAt: now });
});

// ── Analytics ───────────────────────────────────────────────────────────────────
router.get("/ai-comms/analytics", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { clientId, campaignId } = req.query;
    let analytics = await db.select().from(growthCommunicationAnalytics).where(eq(growthCommunicationAnalytics.ownerId, ownerId));
    if (clientId) analytics = analytics.filter(a => a.clientId === clientId);
    if (campaignId) analytics = analytics.filter(a => a.campaignId === campaignId);
    return res.json({ ok: true, analytics });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list analytics");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/ai-comms/analytics", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const [record] = await db.insert(growthCommunicationAnalytics).values({ ...req.body, ownerId }).returning();
    return res.json({ ok: true, analytics: record });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create analytics");
    return res.status(500).json({ error: err.message });
  }
});

// ── Brand Themes ────────────────────────────────────────────────────────────────────
router.get("/ai-comms/brand-themes/presets", (_req, res) => {
  res.json({ ok: true, presets: BRAND_PRESETS });
});

router.get("/ai-comms/brand-themes", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { clientId } = req.query;
    let themes = await db.select().from(growthBrandThemes).where(eq(growthBrandThemes.ownerId, ownerId));
    if (clientId) themes = themes.filter(t => t.clientId === clientId || t.clientId === null);
    return res.json({ ok: true, themes });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list brand themes");
    return res.status(500).json({ error: err.message });
  }
});

router.post("/ai-comms/brand-themes", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const [theme] = await db.insert(growthBrandThemes).values({ ...req.body, ownerId, isPreset: false }).returning();
    return res.json({ ok: true, theme });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create brand theme");
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/ai-comms/brand-themes/:id", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthBrandThemes).where(eq(growthBrandThemes.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    const [updated] = await db.update(growthBrandThemes).set({ ...req.body, updatedAt: new Date() }).where(eq(growthBrandThemes.id, id)).returning();
    return res.json({ ok: true, theme: updated });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update brand theme");
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/ai-comms/brand-themes/:id", async (req: any, res) => {
  try {
    const ownerId = req.user!.userId;
    const { id } = req.params;
    const [existing] = await db.select().from(growthBrandThemes).where(eq(growthBrandThemes.id, id));
    if (!existing || existing.ownerId !== ownerId) return res.status(403).json({ error: "Access denied" });
    await db.delete(growthBrandThemes).where(eq(growthBrandThemes.id, id));
    return res.json({ ok: true, deleted: true });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to delete brand theme");
    return res.status(500).json({ error: err.message });
  }
});

// ── Basic health check (legacy/minimal) ────────────────────────────────────────────
router.get("/ai-comms/health/basic", async (_req, res) => {
  try {
    const personas = await db.select().from(growthPersonas);
    res.json({ status: "ok", personas: personas.length });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

export function registerAiCommunicationsRoutes(app: any) {
  app.use("/api", router);
}

export default router;
