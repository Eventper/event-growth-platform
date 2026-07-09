// ── Growth pipeline service layer ──────────────────────────────────────────
// Owner-scoped, Express-free implementations of every pipeline step. Both the
// HTTP routes (growth-platform-routes.ts) and Elizabeth's orchestrator
// (elizabeth-orchestrator.ts) call these — one implementation, no drift.
//
// HARD RULE carried over from the platform: nothing here sends anything.
// generateOutreach only drafts into the `pending` approval queue. Sending stays
// human-only in the /outreach UI.

import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  growthEvents,
  growthProspects,
  growthProspectScores,
  growthOutreach,
  growthUserPreferences,
} from "@workspace/db";
import { logger } from "./lib/logger";
import { apolloSearchAll, apolloEnrich } from "./apollo-source";
import { inferGender, inferGenderBatch } from "./gender-inference";
import { callOpenRouter, logSpend, MODELS } from "./ai-shared";
import { generateCommunication } from "./comms-core";
import { buildPartnerTouch, isPartnerProspect } from "./growth-partner";
import { recallMemory, scopeChain } from "./memory-service";
import { growthPersonas } from "@workspace/db";

function parseJsonLoose(content: string): any {
  try {
    return JSON.parse(content.replace(/^```json\s*/, "").replace(/\s*```$/, ""));
  } catch {
    const m = content.match(/\{[\s\S]*\}/) || content.match(/\[[\s\S]*\]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

// ── 1. Wizard interview ─────────────────────────────────────────────────────
export async function conductInterview(
  ownerId: string | undefined,
  args: { messages?: any[]; eventId?: string; goal?: string }
): Promise<{ result: any; cost: number; model: string }> {
  const { messages = [], eventId, goal } = args;

  let existingPrefs: any = null;
  if (ownerId) {
    const prefs = await db
      .select()
      .from(growthUserPreferences)
      .where(eq(growthUserPreferences.ownerId, ownerId));
    if (prefs.length > 0) existingPrefs = prefs[0];
  }

  const systemPrompt = `You are an expert event strategist. Your job is to interview the user to understand their event, audience, and goals so we can build a strategy pack.

TIER SYSTEM — establish this first, before anything else:
- **Mass-market** — high volume (200+), low price (under £50), broad audience, urgent/scarcity language.
- **Mid-market / professional** — moderate price (£50–£200), targeted audience, value-led language.
- **Premium / luxury** — high price (£200+), invitation-only or curated, small exclusive audience (often under 80), restrained and elevated language, premium venue, status and access as the value.

If the user does NOT explicitly state their tier, you MUST ask: price point, venue type, open vs invitation-only/curated, and target headcount. Those four answers determine the tier.

${existingPrefs ? `OWNER PREFERENCES (from previous events):
- Preferred tier: ${existingPrefs.tier || "not set"}
- House style: ${existingPrefs.houseStyle ? JSON.parse(existingPrefs.houseStyle).tagline || "set" : "not set"}
- Excluded industries: ${existingPrefs.excludedIndustries || "none"}
Use these preferences as defaults. If the user wants something different, ask them to clarify. Do NOT re-ask questions already answered in previous events.` : ""}

Interview rules:
1. Ask **one focused follow-up question at a time**. Be conversational and warm.
2. Ask questions only when the user's input is incomplete. Do NOT ask obvious questions they already answered.
3. When you have enough information, output the structured summary as JSON.
4. If the input is incomplete, output ONLY: {"interview_complete":false,"next_question":"your question here"}
5. If you have enough information, output ONLY: {"interview_complete":true,"event_name":"...","event_type":"...","location":"...","target_audience":"...","estimated_capacity":123,"goals":["..."],"budget_range":"...","known_sponsors":["..."],"timeline":"...","content_themes":["..."],"pricing_estimate":"...","positioning_tier":"mass-market|mid-market|premium","ticket_price":"exact price stated by user","venue_type":"...","format":"open|invitation-only|curated"}
6. CRITICAL: If the user states a price (e.g. £360), a venue type (e.g. "luxury hotel"), a format ("invitation-only"), or a headcount (e.g. 60), those are FACTS. Record them exactly. Never override them.
7. CRITICAL: Return ONLY the JSON object. No markdown, no extra text, no conversation, no preamble. Just the raw JSON object.

Current context: ${eventId ? `This is for event ID ${eventId}.` : "No event selected yet."}`;

  const claudeMessages = [
    { role: "system", content: systemPrompt },
    ...(goal ? [{ role: "user", content: goal }] : []),
    ...messages,
  ];

  const { content, usage, cost, model } = await callOpenRouter(
    MODELS.interview,
    claudeMessages,
    { maxTokens: 1200, temperature: 0.7 }
  );

  await logSpend("wizard_interview", model, cost, { eventId, goal, messages: messages.length, usage }, "openrouter", ownerId);

  let result = parseJsonLoose(content);
  if (!result) result = { interview_complete: false, next_question: content, raw_response: true };

  return { result, cost, model };
}

// ── 2. Market scan ──────────────────────────────────────────────────────────
export async function conductMarketScan(
  args: { eventType?: string; location?: string; audience?: string; capacity?: any; positioningTier?: string },
  ownerId?: string
): Promise<{ result: any; cost: number; model: string }> {
  const { eventType, location, audience, capacity, positioningTier } = args;

  const systemPrompt = `You are a market research analyst. Scan the market for events, competitors, audience insights, and sponsor opportunities.

Respond with a valid JSON object matching this exact schema:
{
  "demand_score": "number (1-10)",
  "competitor_events": [
    { "name": "string", "organiser": "string", "frequency": "string", "audience": "string", "what_works": "string", "what_gaps": "string" }
  ],
  "audience_pain_points": ["string"],
  "relevant_industries": ["string"],
  "candidate_sponsor_types": [
    { "type": "string (e.g. 'HR consultancy', 'SaaS vendor')", "why": "string", "examples": ["string"] }
  ],
  "trending_themes": ["string"],
  "pricing_benchmarks": [
    { "event_type": "string", "price_range": "string", "notes": "string" }
  ],
  "opportunity_score": "number (1-10)",
  "market_opportunity_note": "string (2-3 sentences explaining the opportunity score)"
}

Guidelines:
- Be specific. Name real events if you know them.
- If you are unsure about a real-world fact, be honest rather than invent.
- The opportunity score should reflect the gap between audience demand and event supply.
- Return ONLY the JSON object, no markdown, no extra text.`;

  const prompt = `Please scan the market for: ${eventType} events in ${location}.
Target audience: ${audience}
Estimated capacity: ${capacity || "not specified"}
Positioning tier: ${positioningTier || "not specified"}

CRITICAL: If the interview data indicates this is a PREMIUM / LUXURY event (high price, invitation-only, small curated audience, luxury venue), the market scan must reflect that:
- Competitor benchmarks should reference premium events, not mass-market ones
- Pricing benchmarks should reflect premium positioning, not mass-market
- Sponsor types should focus on brands seeking access to a curated exclusive audience, not mass reach
- Do NOT suggest mass-market competitors or pricing for a premium event.`;

  const { content, usage, cost, model } = await callOpenRouter(
    MODELS.drafting,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    { maxTokens: 3000, temperature: 0.5, jsonMode: true }
  );

  await logSpend("wizard_market_scan", model, cost, { eventType, location, audience, usage }, "openrouter", ownerId);

  let result = parseJsonLoose(content);
  if (!result) result = { raw_response: content, parse_error: true };

  return { result, cost, model };
}

// ── 3. Strategy pack generation ──────────────────────────────────────────────
export async function generateStrategy(
  eventId: string,
  args: { interviewData: any; marketScan: any },
  ownerId?: string
): Promise<{ result: any; cost: number; model: string }> {
  const { interviewData, marketScan } = args;

  const systemPrompt = `You are a senior event strategist. Synthesize interview data and market research into a structured strategy pack.

TIER SYSTEM — you must respect the event's positioning tier:
- **Mass-market** — high volume (200+), low price (under £50), broad audience, urgency/scarcity language, mass reach.
- **Mid-market / professional** — moderate price (£50–£200), targeted audience, value-led language.
- **Premium / luxury** — high price (£200+), invitation-only or curated, small exclusive audience (often under 80), restrained and elevated language, premium venue, status and access as the value. Brands sponsor for access to a curated audience, not mass reach.

TIER ENFORCEMENT RULES:
1. **Pricing** — if the user stated a ticket price (e.g. £360), use it exactly. If they stated a budget range, use it. Do NOT override with a different tier's pricing. Anchor to the user's stated price.
2. **Language / tagline** — premium events get restrained, elevated, specific messaging. Do NOT use generic empowerment clichés ("Empowering Women, Leading Change", "Unlock Your Potential", "Connect, Inspire, Lead", etc.) for premium positioning. Premium language is specific, concrete, status-oriented, and avoids generic inspirational platitudes. A good premium tagline names the specific value (e.g. "Access. Influence. Advancement.") rather than abstract verbs like "inspire" or "empower". Think magazine masthead or invitation card, not conference poster.
3. **Audience personas** — premium = small, high-fit, senior/established (e.g. CEOs, Directors, Founders of established companies). Mid-market = managers, team leads. Mass-market = broad, early-career. Produce multiple personas where the audience has real texture.
4. **Sponsors** — premium events attract brands buying access to a curated audience. Sponsor personas should reflect that (e.g. luxury brands, executive coaching firms, boutique consultancies, not mass-market SaaS vendors).
5. **User facts override AI guesses** — if the interview data states a price, venue, format, headcount, or any other fact, use it exactly. The AI fills gaps, it never overrides stated facts.

Respond with valid JSON matching this exact schema:
{
  "audience_personas": [
    { "name": "string (e.g. 'Senior HR Leaders')", "job_titles": ["string"], "sectors": ["string"], "locations": ["string"], "company_size": "string (e.g. '50+ employees')", "pain_points": ["string"], "why_attend": "string" }
  ],
  "sponsor_personas": [
    { "type": "string (e.g. 'HR Consultancy')", "job_titles": ["string (titles to target for outreach)"], "sectors": ["string"], "locations": ["string"], "company_size": "string", "why_sponsor": "string", "budget_expectation": "string" }
  ],
  "media_personas": [
    { "type": "string (e.g. 'Tech Journalist')", "job_titles": ["string"], "sectors": ["string"], "locations": ["string"], "outlet_types": ["string (e.g. 'blog', 'podcast', 'newsletter')"], "why_cover": "string", "reach_estimate": "string" }
  ],
  "exclusion_rules": {
    "job_titles": ["string (e.g. 'Coach', 'Influencer', 'Community Builder')"],
    "sectors": ["string"],
    "keywords": ["string (red flags in bio/description)"],
    "reason": "string (why these are excluded)"
  },
  "messaging_recommendations": { "tagline": "string", "key_messages": ["string"], "tone": "string" },
  "pricing_recommendations": { "ticket_price": "string — user's stated price or tier-appropriate", "sponsor_tier_1": "string", "sponsor_tier_2": "string", "sponsor_tier_3": "string", "notes": "string" },
  "content_themes": [ { "theme": "string", "rationale": "string" } ],
  "market_opportunity_score": "number (1-10)",
  "positioning_tier": "string (mass-market|mid-market|premium)",
  "juno_placeholder": "string (explain what Juno human insights would add here)"
}

Rules:
- Use real data from the interview and market scan. Do not invent facts.
- Company size, job titles, and locations must be structured so Phase 2 sourcing can read them directly.
- The sponsor_personas job_titles array is what Phase 2 will use for LinkedIn search targeting.
- Return ONLY the JSON object, no markdown, no extra text.`;

  const prompt = `INTERVIEW DATA:
${JSON.stringify(interviewData, null, 2)}

MARKET SCAN:
${JSON.stringify(marketScan, null, 2)}

Please synthesize this into a complete strategy pack.`;

  const { content, usage, cost, model } = await callOpenRouter(
    MODELS.drafting,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    // The strategy schema is large (audience/sponsor/media personas + rules +
    // messaging + pricing + themes); 2000 tokens truncates it and breaks JSON.
    { maxTokens: 6000, temperature: 0.6, jsonMode: true }
  );

  await logSpend("generate_strategy", model, cost, { eventId, usage }, "openrouter", ownerId);

  let result = parseJsonLoose(content);
  if (!result) result = { raw_response: content, parse_error: true };

  return { result, cost, model };
}

// Persist a generated strategy pack onto the event and auto-save owner prefs.
// Mirrors the POST /growth/events/:id/strategy-pack route behaviour.
export async function saveStrategyPack(
  eventId: string,
  ownerId: string | undefined,
  strategyPack: any,
  approved: boolean
): Promise<any> {
  if (approved && ownerId && strategyPack) {
    const pack = strategyPack as any;
    const existing = await db
      .select()
      .from(growthUserPreferences)
      .where(eq(growthUserPreferences.ownerId, ownerId));
    const houseStyle = JSON.stringify({
      tagline: pack.messaging_recommendations?.tagline || "",
      tone: pack.messaging_recommendations?.tone || "",
      excludedWords: pack.exclusion_rules?.keywords || [],
    });
    const values = {
      tier: pack.positioning_tier || "mid-market",
      houseStyle,
      excludedIndustries: (pack.exclusion_rules?.sectors || []).join(","),
      updatedAt: new Date(),
    };
    if (existing.length > 0) {
      await db.update(growthUserPreferences).set(values).where(eq(growthUserPreferences.ownerId, ownerId));
    } else {
      await db.insert(growthUserPreferences).values({ ownerId, ...values, createdAt: new Date() });
    }
  }

  const [event] = await db
    .update(growthEvents)
    .set({ strategyPack, status: approved ? "approved" : "strategy_ready", updatedAt: new Date() })
    .where(eq(growthEvents.id, eventId))
    .returning();
  return event;
}

// ── Apollo search param builder (pure) ───────────────────────────────────────
export function buildSearchParams(personas: any[], _type: "audience" | "sponsor", location: string) {
  const titles: string[] = [];
  const industries: string[] = [];
  const locations = [location];

  personas.forEach((p) => {
    if (p.job_titles) titles.push(...p.job_titles);
    if (p.sectors) industries.push(...p.sectors);
    if (p.locations) locations.push(...p.locations);
  });

  const uniqueTitles = [...new Set(titles)].slice(0, 10);
  const uniqueLocations = [...new Set(locations)].slice(0, 5);

  if (uniqueTitles.length > 0) {
    return { personTitles: uniqueTitles, personLocations: uniqueLocations };
  }
  const uniqueKeywords = [...new Set(industries)].slice(0, 5);
  if (uniqueKeywords.length > 0) {
    return { qKeywords: uniqueKeywords, personLocations: uniqueLocations };
  }
  return { personLocations: uniqueLocations };
}

function isDuplicate(existing: any[], person: { name: string; company: string }): boolean {
  return existing.some(
    (e) =>
      e.name?.toLowerCase() === person.name?.toLowerCase() &&
      e.company?.toLowerCase() === person.company?.toLowerCase()
  );
}

// ── 4. Prospect discovery (Apollo search + store) ─────────────────────────────
export async function searchAndStoreProspects(
  eventId: string,
  prospectType: "audience" | "sponsor",
  ownerId?: string
): Promise<{ found: number; stored: number; skipped: number; excluded: number; filteredMen: number; prospects: any[] }> {
  const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
  if (!event) throw new Error("Event not found");
  if (!event.strategyPack) throw new Error("No strategy pack approved. Run the wizard first.");

  const pack = event.strategyPack as any;
  const personas = prospectType === "sponsor" ? pack.sponsor_personas : pack.audience_personas;
  if (!personas?.length) throw new Error(`No ${prospectType} personas in strategy pack`);

  const searchParams = buildSearchParams(personas, prospectType, event.location || "UK");
  const result = await apolloSearchAll({
    ...searchParams,
    perPage: 25,
    maxPages: 12,
    maxPeople: 300,
  });

  const existing = await db
    .select()
    .from(growthProspects)
    .where(and(eq(growthProspects.eventId, eventId), eq(growthProspects.prospectType, prospectType)));

  const exclusionRules = pack.exclusion_rules || {};
  const excludedTitles = (exclusionRules.job_titles || []).map((t: string) => t.toLowerCase());
  const excludedKeywords = (exclusionRules.keywords || []).map((k: string) => k.toLowerCase());
  const excludedSectors = (exclusionRules.sectors || []).map((s: string) => s.toLowerCase());

  function isExcluded(person: any): boolean {
    const title = (person.title || "").toLowerCase();
    const bio = (person.headline || person.title || "").toLowerCase();
    const industry = (person.organization?.industry || "").toLowerCase();
    if (excludedTitles.some((t: string) => title.includes(t))) return true;
    if (excludedKeywords.some((k: string) => bio.includes(k))) return true;
    if (excludedSectors.some((s: string) => industry.includes(s))) return true;
    return false;
  }

  const stored: any[] = [];
  let skipped = 0;
  let excluded = 0;
  let filteredMen = 0;

  // Women-first audience discovery (I Am Her). Apollo can't filter by gender, so
  // we infer it from the first name and, for AUDIENCE prospects, drop likely men.
  // Ambiguous/unisex names resolve to "unknown" and are KEPT for human review —
  // we never silently exclude a possible woman. Sponsors are companies, so the
  // gender of the named contact isn't a screen there — we still tag it.
  const womenFirst = prospectType === "audience";

  // Classify the whole batch up front in ONE AI call (cheap, cached). Falls back
  // to the offline heuristic automatically if the AI is unavailable.
  const genderMap = await inferGenderBatch(result.people.map((p) => p.first_name || p.name || ""));

  for (const p of result.people) {
    const company = p.organization?.name || "";
    const name = p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
    if (!name) continue;
    if (isDuplicate(existing, { name, company })) {
      skipped++;
      continue;
    }
    if (isExcluded(p)) {
      excluded++;
      continue;
    }
    const g = genderMap[p.first_name || p.name || ""] || inferGender(p.first_name || name);
    if (womenFirst && g.gender === "male" && g.confidence >= 0.6) {
      filteredMen++;
      continue;
    }
    const [inserted] = await db
      .insert(growthProspects)
      .values({
        eventId,
        ...(ownerId ? { ownerId } : {}),
        prospectType,
        name,
        title: p.title || "",
        company,
        companySize: p.organization?.employee_count || "",
        industry: p.organization?.industry || "",
        location: p.location || p.city || "",
        profileUrl: p.linkedin_url || "",
        source: "apollo",
        sourceReference: p.id || "",
        confidenceLevel: p.email ? "medium" : "low",
        verified: false,
        enriched: false,
        individualOrCorporate:
          p.organization?.employee_count && parseInt(p.organization.employee_count) < 10 ? "individual" : "corporate",
        likelyGender: g.gender,
        genderConfidence: g.confidence.toFixed(2),
        status: "new",
        metadata: { apolloRaw: p, confidenceScore: p.email ? 50 : 20, genderMethod: g.method },
      })
      .returning();
    stored.push(inserted);
  }

  await logSpend(
    "prospect_search",
    "apollo",
    0,
    { eventId, prospectType, found: result.people.length, stored: stored.length, skipped, excluded, filteredMen },
    "apollo",
    ownerId
  );

  return { found: result.people.length, stored: stored.length, skipped, excluded, filteredMen, prospects: stored };
}

// ── 5. Prospect enrichment (Apollo — costs 1 credit) ──────────────────────────
export async function enrichProspect(
  prospectId: string,
  ownerId?: string
): Promise<{ prospect: any; creditsUsed: number }> {
  const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, prospectId));
  if (!prospect) throw new Error("Prospect not found");
  if (!prospect.sourceReference) throw new Error("No Apollo reference for this prospect");
  if (prospect.enriched) return { prospect, creditsUsed: 0 };

  const result = await apolloEnrich(prospect.sourceReference);
  if (!result.person) throw new Error("Apollo could not enrich this person");

  const p = result.person;
  const [updated] = await db
    .update(growthProspects)
    .set({
      email: p.email || prospect.email,
      phone: p.phone || prospect.phone,
      title: p.title || prospect.title,
      company: p.organization?.name || prospect.company,
      companySize: p.organization?.employee_count || prospect.companySize,
      industry: p.organization?.industry || prospect.industry,
      location: p.location || p.city || prospect.location,
      profileUrl: p.linkedin_url || prospect.profileUrl,
      enriched: true,
      enrichmentCost: String(result.cost),
      verified: !!p.email,
      confidenceLevel: p.email ? "high" : "medium",
      metadata: {
        ...((prospect.metadata as any) || {}),
        enriched: true,
        enrichmentCost: result.cost,
        enrichedAt: new Date().toISOString(),
      },
    })
    .where(eq(growthProspects.id, prospectId))
    .returning();

  await logSpend(
    "prospect_enrich",
    "apollo",
    result.cost,
    { prospectId, eventId: prospect.eventId, personId: prospect.sourceReference },
    "apollo",
    ownerId
  );

  return { prospect: updated, creditsUsed: result.cost };
}

// ── 6. Prospect scoring ───────────────────────────────────────────────────────
export async function scoreProspect(
  prospectId: string,
  ownerId?: string
): Promise<{ score: any; cost: number }> {
  const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, prospectId));
  if (!prospect) throw new Error("Prospect not found");

  const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, prospect.eventId!));
  if (!event || !event.strategyPack) throw new Error("No strategy pack for this event");

  const pack = event.strategyPack as any;
  const personas = prospect.prospectType === "sponsor" ? pack.sponsor_personas : pack.audience_personas;
  if (!personas?.length) throw new Error("No personas in strategy pack");

  const systemPrompt = `You are a prospect scoring analyst. Score this prospect against the target persona and explain why.

Return ONLY JSON: {"score": 0-100, "reasons": ["reason 1", "reason 2", ...]}

Score factors: location fit, industry fit, company size match, seniority, strategic fit to persona. Be honest — a low score is fine if the fit is weak.`;

  const prompt = `TARGET PERSONA:
${JSON.stringify(personas[0], null, 2)}

PROSPECT:
Name: ${prospect.name}
Title: ${prospect.title}
Company: ${prospect.company}
Location: ${prospect.location}
Industry: ${prospect.industry}
Company size: ${prospect.companySize}

Score this prospect (0-100) with reasons.`;

  const { content, usage, cost, model } = await callOpenRouter(
    MODELS.classify,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    { maxTokens: 800, temperature: 0.3, jsonMode: true }
  );

  await logSpend("prospect_score", model, cost, { prospectId: prospect.id, eventId: event.id, usage }, "openrouter", ownerId);

  let result = parseJsonLoose(content);
  if (!result) result = { score: 50, reasons: ["Could not parse score"], raw: content };

  const [scoreRecord] = await db
    .insert(growthProspectScores)
    .values({
      prospectId: prospect.id,
      score: Math.max(0, Math.min(100, result.score || 50)),
      scoreType: prospect.prospectType,
      reasons: result.reasons || [],
    })
    .returning();

  return { score: scoreRecord, cost };
}

// ── 7. Outreach context + per-touch drafting (shared, unified core) ───────────
// Both the manual 4-touch cadence and Elizabeth's autonomous drafting build the
// same brand/recipient/persona/memory context and run every touch through
// comms-core — there is no legacy prompt path left.
interface OutreachContext {
  prospect: any;
  event: any;
  pack: any;
  isSponsor: boolean;
  channel: string;
  brand: any;
  recipient: any;
  persona: any;
  memoryContext: string;
  baseExclusions: string[];
}

async function buildOutreachContext(prospectId: string, eventId: string, ownerId?: string): Promise<OutreachContext> {
  const [prospect] = await db.select().from(growthProspects).where(eq(growthProspects.id, prospectId));
  if (!prospect) throw new Error("Prospect not found");
  // Accept the screen status ("approved") OR the Outreach Intelligence Module's
  // gate status ("approved_for_outreach" — "Approved for Outreach, Pending Preview").
  if (!["approved", "approved_for_outreach"].includes(prospect.status || "")) {
    throw new Error("Prospect must be approved first");
  }

  const [event] = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId));
  // The reusable module is driven by the project's outreachConfig. A strategy
  // pack is no longer required when the project has approved outreach config.
  const cfg = (event as any)?.outreachConfig || null;
  if (!event || (!event.strategyPack && !cfg)) throw new Error("No project outreach config or strategy pack");

  const pack = (event.strategyPack as any) || {};
  const isSponsor = prospect.prospectType === "sponsor";
  const tier = String(pack.positioning_tier || (cfg ? "premium" : "mid-market")).toLowerCase();
  const channel = prospect.individualOrCorporate === "individual" ? "linkedin" : "email";

  // Project-level approved/banned language and reply-based CTA win when present.
  const approvedPhrases = [
    ...(cfg?.approvedLanguage || pack.messaging_recommendations?.key_messages || []),
    ...(cfg?.approvedProofPoints || []),
  ];
  const bannedPhrases = [
    ...(cfg?.bannedLanguage || pack.exclusion_rules?.keywords || []),
    ...(cfg?.bannedCtaPhrases || []),
  ];
  const brand = {
    name: cfg?.projectName || event.name,
    brandVoice: tier === "premium" ? "luxury" : tier === "mass-market" ? "warm" : "professional",
    approvedPhrases,
    bannedPhrases,
    commercialRules: { pricingVisible: false, defaultCta: cfg?.defaultCta ? "reply" : "learn_more" },
    sector: prospect.industry || "",
    brandPositioning: cfg?.positioning || pack.messaging_recommendations?.tagline || "",
    websiteUrl: cfg?.websiteUrl || (event as any).websiteUrl || pack.website_url || undefined,
  };

  // Approved LOCKED fields — the Email AI assembles from these and must not
  // invent the ask, the benefits or the reason. (Email AI assembles; it doesn't
  // discover.) If they're absent, the upstream gate is what blocks the send.
  const locked = [
    prospect.whyThem ? `Why this prospect fits (approved): ${prospect.whyThem}` : null,
    prospect.specificAsk ? `Specific ask — use this exact ask, do not invent: ${prospect.specificAsk}` : null,
    prospect.whatTheyReceive ? `What they receive — use these exact benefits, do not invent: ${prospect.whatTheyReceive}` : null,
    cfg?.ecosystemParagraph && cfg?.ecosystemRequiresApproval === false ? `Ecosystem framing: ${cfg.ecosystemParagraph}` : null,
  ].filter(Boolean).join("\n");
  const recipient = {
    name: prospect.name || "there",
    role: isSponsor ? "sponsor decision-maker" : "prospective guest",
    title: prospect.title || undefined,
    company: prospect.company || undefined,
    sector: prospect.industry || undefined,
    context: [
      prospect.location,
      isSponsor ? "Potential commercial partner." : "Potential attendee.",
      locked || null,
    ].filter(Boolean).join(" — "),
  };

  let persona: any = null;
  if (ownerId) {
    const personas = await db.select().from(growthPersonas).where(eq(growthPersonas.ownerId, ownerId));
    const wantRole = isSponsor ? "sponsor" : "community";
    persona = personas.find((p) => p.role === wantRole && p.isActive) || personas.find((p) => p.isActive) || null;
  }

  const memoryContext = ownerId ? await recallMemory(ownerId, scopeChain(ownerId, { eventId })) : "";

  return { prospect, event, pack, isSponsor, channel, brand, recipient, persona, memoryContext, baseExclusions: bannedPhrases };
}

// Draft one touch through comms-core and store it as a pending draft.
async function draftTouch(
  ctx: OutreachContext,
  eventId: string,
  sequencePosition: number,
  outcome: string,
  angle: string,
  maxWords: number,
  ownerId?: string
): Promise<{ outreach: any; cost: number; quality: any }> {
  const objective = {
    desiredOutcome: outcome,
    angle,
    priority: (ctx.isSponsor ? "commercial" : "relationship") as "commercial" | "relationship",
    exclusions: ctx.baseExclusions,
    maxWords,
  };
  const result = await generateCommunication({
    ownerId: ownerId || "",
    brand: ctx.brand,
    recipient: ctx.recipient,
    objective,
    persona: ctx.persona,
    memoryContext: ctx.memoryContext,
  });
  const [outreach] = await db
    .insert(growthOutreach)
    .values({
      prospectId: ctx.prospect.id,
      eventId,
      sequencePosition,
      channel: ctx.channel,
      subject: result.subject,
      body: result.body,
      status: "pending",
      generatedBy: "comms-core",
      metadata: {
        engine: "comms-core",
        touch: sequencePosition,
        reasoning: result.reasoningSummary,
        quality: result.quality,
        trust: result.trust, // branded engines + chosen/rejected angles + scorecard (vision #4-7)
        layoutType: result.layoutType,
        ctaLabel: result.ctaLabel,
        themeName: result.themeName,
        personaUsed: ctx.persona?.name || null,
        html: result.html,
      },
    })
    .returning();
  return { outreach, cost: result.cost || 0, quality: result.quality };
}

// ── 7-partner. Founding-partner / sponsor cadence — LOCKED templates, no AI ───
// Sponsor/partner prospects bypass comms-core entirely: their bodies are assembled
// from the two locked templates (first-touch + follow-up) with approved merge
// fields substituted in. Two touches only — a first touch and a single follow-up —
// to keep the cadence deliberate, never a flood. Throws (caller surfaces it) when a
// required field is missing, so a vague or half-filled partner email cannot be drafted.
async function generatePartnerOutreach(
  ctx: OutreachContext,
  eventId: string,
  positions: number[]
): Promise<{ messages: any[]; count: number; cost: number }> {
  const p = ctx.prospect;
  const stored: any[] = [];
  for (const pos of positions) {
    const { subject, body } = buildPartnerTouch(p, pos);
    const [outreach] = await db
      .insert(growthOutreach)
      .values({
        prospectId: p.id,
        eventId,
        sequencePosition: pos,
        channel: ctx.channel,
        subject,
        body,
        status: "pending",
        generatedBy: "partner-template",
        metadata: {
          engine: "partner-template",
          touch: pos,
          kind: pos > 1 ? "followup" : "first-touch",
          lockedFields: {
            prospect_reason: p.whyThem,
            specific_ask: p.specificAsk,
            what_they_receive: p.whatTheyReceive,
          },
        },
      })
      .returning();
    stored.push(outreach);
  }
  return { messages: stored, count: stored.length, cost: 0 };
}

// ── 7a. Full 4-touch cadence (manual route) — every touch through comms-core ──
export async function generateOutreach(
  args: { prospectId: string; eventId: string },
  ownerId?: string
): Promise<{ messages: any[]; count: number; cost: number }> {
  const ctx = await buildOutreachContext(args.prospectId, args.eventId, ownerId);
  // Sponsor/partner: deterministic locked templates (first-touch + one follow-up).
  if (isPartnerProspect(ctx.prospect)) {
    return generatePartnerOutreach(ctx, args.eventId, [1, 2]);
  }
  const li = ctx.channel === "linkedin";
  const intro = ctx.isSponsor
    ? "Open a conversation about partnering with / sponsoring the event"
    : "Spark genuine interest in attending the event";
  const touches = [
    { outcome: intro, angle: "First contact — earn attention with the single most relevant hook for this person.", maxWords: li ? 90 : 170 },
    {
      outcome: ctx.isSponsor ? "Re-engage with a sharper commercial angle" : "Re-engage with a fresh, specific reason to attend",
      angle: "Second touch (a few days later) — assume they're busy; a new angle, not a nag.",
      maxWords: li ? 80 : 140,
    },
    {
      outcome: ctx.isSponsor ? "Demonstrate concrete partnership value" : "Share a concrete proof point of who is in the room",
      angle: "Third touch — lead with a specific value or proof point.",
      maxWords: li ? 80 : 150,
    },
    { outcome: "A gracious final nudge that leaves the door open", angle: "Final touch — brief, warm, no pressure; make it easy to say yes later.", maxWords: li ? 70 : 120 },
  ];
  const stored: any[] = [];
  let cost = 0;
  for (let i = 0; i < touches.length; i++) {
    const t = touches[i];
    const r = await draftTouch(ctx, args.eventId, i + 1, t.outcome, t.angle, t.maxWords, ownerId);
    stored.push(r.outreach);
    cost += r.cost;
  }
  await logSpend("outreach_generate", "comms-core", cost, { prospectId: args.prospectId, eventId: args.eventId, touches: stored.length }, "openrouter", ownerId);
  return { messages: stored, count: stored.length, cost };
}

// ── 7b. Single reasoned first-touch (Elizabeth's autonomous drafting) ─────────
// Same context + core as the manual cadence — just one high-quality first touch.
export async function generateReasonedOutreach(
  args: { prospectId: string; eventId: string },
  ownerId?: string
): Promise<{ messages: any[]; count: number; quality: any; cost: number }> {
  const ctx = await buildOutreachContext(args.prospectId, args.eventId, ownerId);
  // Sponsor/partner: single first-touch from the locked template, no AI.
  if (isPartnerProspect(ctx.prospect)) {
    const t = await generatePartnerOutreach(ctx, args.eventId, [1]);
    return { messages: t.messages, count: t.count, quality: null, cost: 0 };
  }
  const outcome = ctx.isSponsor
    ? "Open a conversation about partnering with / sponsoring the event"
    : "Invite them to attend the event";
  const r = await draftTouch(ctx, args.eventId, 1, outcome, "First contact — earn attention with the most relevant hook for this person.", 180, ownerId);
  await logSpend("outreach_reasoned", "comms-core", r.cost, { prospectId: args.prospectId, eventId: args.eventId, quality: r.quality?.total }, "openrouter", ownerId);
  return { messages: [r.outreach], count: 1, quality: r.quality, cost: r.cost };
}
