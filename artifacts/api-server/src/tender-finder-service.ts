// Tender Finder Service — aggregates Contracts Finder + Find a Tender, scores, dedupes.
// Normalised tender shape is shared with the client dashboard.

import { RELEVANCE_THRESHOLD, SME_MAX_CONTRACT_VALUE, EXCLUDE_KEYWORDS, ADVISORY_KEYWORDS, DELIVERY_KEYWORDS, DECOR_KEYWORDS, ALLOWED_COUNTRIES, GB_NATURAL_FIT_LOCALITIES, LANES, STRATEGIC_BUYERS, STRATEGIC_THEMES } from "./tender-discovery-config";

export type FinderStatus = "open" | "awarded" | "closed" | "planned" | "cancelled";

export type NormalisedTender = {
  id: string;
  title: string;
  description: string;
  buyer: string;
  value: number | null;
  value_estimated: boolean;
  currency: string;
  published_date: string | null;
  deadline: string | null;
  status: FinderStatus;
  source: "CF" | "FTS";
  source_label: string;
  region: string | null;
  category: string | null;
  url: string;
  cpv_codes: string[];
  procedure_type: string | null;
  sme_suitable: boolean | null;
  winner: string | null;
  award_date: string | null;
  award_value: number | null;
  duration_months: number | null;
  match_score: number;
  match_tier: "excellent" | "strong" | "good" | "possible" | "low";
  ep_relevant?: boolean;
  ep_relevance_score?: number;
  ep_matched_keywords?: string[];
  alli_relevant?: boolean;
  alli_relevance_score?: number;
  alli_matched_keywords?: string[];
  pmo_relevant?: boolean;
  pmo_relevance_score?: number;
  pmo_matched_keywords?: string[];
};

// ─── Org Relevance Scoring — Three-Lane System ────────────────────────────────
// Each lane (EP / ALLI / PMO) is independently scored 0-100.
// Title and buyer matches carry 3× weight vs description matches.
// relevant = true when score ≥ 30.
// matched_keywords stores the 8 strongest keyword hits for explainability.

export type OrgRelevanceResult = {
  relevant: boolean;
  score: number;
  matched_keywords: string[];
};

type TenderText = {
  title?: string | null;
  buyer?: string | null;
  description?: string | null;
  category?: string | null;
};

// ── EP Keywords — Event Perfekt Group ─────────────────────────────────────────
const EP_KEYWORDS = [
  // Core event delivery
  "event production", "event management", "events delivery", "event services framework",
  "events framework", "event coordination", "event operations", "events management",
  "conference management", "conference services", "conference production",
  "delegate management", "delegate experience", "venue management",
  "gala dinner", "awards ceremony", "awards dinner", "exhibition management",
  "summit", "ministerial event", "diplomatic event", "high-level event",
  "virtual event", "hybrid event", "live event", "event logistics",
  // Programme & stakeholder delivery
  "programme delivery", "programme support", "programme management",
  "programme coordination", "delivery support", "stakeholder engagement",
  "stakeholder management", "convening", "facilitation", "workshop facilitation",
  "communications and outreach", "strategic communications", "outreach delivery",
  "community engagement", "public engagement", "framework agreement",
  // Africa & international delivery
  "africa", "sub-saharan africa", "uk-africa", "west africa", "east africa",
  "nigeria", "kenya", "ghana", "senegal", "zambia", "ethiopia",
  "mozambique", "sierra leone", "cameroon",
  "fcdo", "defra", "british council", "dcms", "cabinet office",
  "international development", "overseas development", "oda", "uk aid",
  "capacity building", "training delivery", "technical assistance",
  // Cross-border payments & financial inclusion
  "cross-border payment", "cross-border payments", "remittance",
  "financial inclusion", "diaspora", "diaspora engagement", "diaspora finance",
  "mobile money", "digital payments", "payment infrastructure",
  "fintech", "africa fintech", "africa digital finance",
  "money transfer", "international money transfer", "payment reform",
  "remittance corridor", "uk-africa corridor",
];

// ── ALLI Keywords — ALLI Foundation ───────────────────────────────────────────
const ALLI_KEYWORDS = [
  // Violence & youth crime
  "youth violence", "serious youth violence", "syv", "youth crime",
  "knife crime", "knife enabled crime", "knife offence",
  "gang exit", "gang prevention", "gang affiliation", "county lines",
  "drug exploitation", "criminal exploitation", "cse", "cce",
  "violence reduction", "violence prevention", "vru",
  // Substance use & mental health
  "drug and alcohol", "substance misuse", "addiction recovery", "harm reduction",
  "drug rehabilitation", "alcohol misuse", "needle exchange",
  "youth mental health", "young people mental health", "community mental health",
  "mental health support", "mental health intervention",
  // Young people & safeguarding
  "safeguarding", "child safeguarding", "safeguarding children", "safeguarding young people",
  "young person", "young people", "children in care", "care leaver",
  "adverse childhood experiences", "aces", "trauma-informed", "trauma informed",
  "youth offending", "yot", "youth justice", "restorative justice",
  "neet", "school exclusion", "pupil referral unit", "pru", "alternative provision",
  "behaviour intervention", "inclusion programme", "early intervention",
  // Mentoring & community support
  "mentoring", "role model", "lived experience", "peer support", "peer mentor",
  "outreach worker", "street outreach", "detached outreach",
  "cohort delivery", "group programme", "1-2-1 mentoring", "one to one",
  "key worker", "support worker", "caseworker", "caseload",
  // Third sector & VCSE
  "vcse", "vcs", "voluntary sector", "community sector", "third sector",
  "charity-led", "charity sector", "charity delivery",
  "referral pathway", "multi-agency", "partnership delivery",
  // Abuse & exploitation prevention
  "vawg", "violence against women and girls",
  "domestic abuse", "domestic violence", "perpetrator programme",
  "crisis line", "24/7 support", "drop-in support",
  "exploitation prevention", "modern slavery",
  // Recovery & rehabilitation
  "addiction recovery", "rehabilitation", "recovery programme",
  "criminal justice recovery", "probation", "resettlement",
];

// ── PMO Keywords — Tolu's PMO / Consulting career ─────────────────────────────
const PMO_KEYWORDS = [
  // PMO & portfolio
  "pmo", "programme management office", "portfolio management office",
  "portfolio governance", "portfolio assurance", "portfolio reporting",
  "portfolio management", "programme portfolio",
  // Programme & project management roles
  "programme manager", "senior programme manager", "programme management consultant",
  "programme management", "programme leadership", "programme director",
  "senior project manager", "lead project manager", "interim project manager",
  "specialist contractor", "day rate", "interim resource",
  "contract programme", "contract project", "contract delivery",
  // Change & transformation
  "change management", "business change", "change lead", "change practitioner",
  "transformation programme", "digital transformation", "business transformation",
  "operational transformation", "agile transformation", "organisational change",
  "change delivery", "change leadership",
  // Governance & assurance
  "programme assurance", "project assurance", "portfolio assurance",
  "ipa assurance", "ipa-style assurance", "gateway review", "stage gate",
  "ogc gateway", "governance framework", "programme governance", "project governance",
  "benefits realisation", "benefits management", "outcomes management",
  // Methodologies & certifications
  "prince2", "pmp", "msp", "p3o", "safe agile", "scrum", "itil",
  "agile delivery", "scaled agile", "agile programme",
  // CCS frameworks
  "rm6187", "rm6309", "rm6313", "rm6126", "rm6303",
  "multidisciplinary consultancy", "management consultancy framework",
  // Management consulting
  "management consultancy", "management consulting",
  "strategic delivery", "delivery leadership", "delivery director",
  "target operating model", "tom", "operating model design",
  "pmo setup", "pmo capability", "programme establishment",
  "risk and issue", "raid management", "service management",
  "operational governance", "service transition",
  // Financial services
  "banking transformation", "insurance transformation", "wealth management transformation",
  "financial services regulatory", "fca", "pra", "bank of england",
  "basel", "ifrs", "sox", "gdpr programme",
  // Government buyers (strong PMO signals)
  "nhsx", "nhse", "hmrc", "dwp", "dfe", "mod",
  "home office transformation", "government transformation",
  // Named financial services buyers
  "lloyds banking group", "barclays", "hsbc", "natwest", "santander uk",
  "nationwide", "standard chartered", "aviva", "legal & general", "prudential",
];

// ─── Utility: serialize a JS string[] to a PostgreSQL TEXT[] literal ──────────
// Use this when inserting/updating TEXT[] columns via Drizzle sql`` templates.
export function pgTextArray(arr: string[]): string {
  return "{" + arr.map(s => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",") + "}";
}

// ─── Core scoring helper — used by all three lane functions ──────────────────
// Strip HTML tags and decode common entities so keyword matching works on plain text
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Threshold: score out of 100 (3 pts per title/buyer keyword match, 1 pt per desc/category match).
// 9 = requires 3 title keyword hits — practical threshold for meaningful signal.
const ORG_RELEVANCE_THRESHOLD = 9;
const EP_EVENT_KEYWORDS = [
  "event", "events", "conference", "summit", "exhibition", "gala", "awards", "festival",
  "venue", "delegate", "hospitality", "catering", "production", "logistics", "coordination",
  "campaign", "communications", "engagement", "workshop", "facilitation", "activation",
  "launch", "tour", "roadshow", "hybrid", "virtual"
];

function scoreOrgRelevance(keywords: string[], t: TenderText): OrgRelevanceResult {
  const title  = stripHtml(t.title  || "").toLowerCase();
  const buyer  = stripHtml(t.buyer  || "").toLowerCase();
  const desc   = stripHtml(t.description || "").toLowerCase();
  const cat    = (t.category || "").toLowerCase();

  const hits: Array<{ kw: string; pts: number }> = [];

  for (const kw of keywords) {
    const k = kw.toLowerCase();
    let pts = 0;
    // Title or buyer match = 3×
    if (title.includes(k) || buyer.includes(k)) pts += 3;
    // Description or category match = 1×
    if (desc.includes(k) || cat.includes(k)) pts += 1;
    if (pts > 0) hits.push({ kw, pts });
  }

  // Sort strongest hits first (title matches before desc-only)
  hits.sort((a, b) => b.pts - a.pts);

  const rawScore = hits.reduce((sum, h) => sum + h.pts, 0);
  const score = Math.min(100, rawScore);
  const matched_keywords = hits.slice(0, 8).map(h => h.kw);

  return { relevant: score >= ORG_RELEVANCE_THRESHOLD, score, matched_keywords };
}

export function isEpRelevant(t: TenderText): OrgRelevanceResult {
  const base = scoreOrgRelevance(EP_KEYWORDS, t);
  const text = `${stripHtml(t.title || "")} ${stripHtml(t.buyer || "")} ${stripHtml(t.description || "")} ${(t.category || "").toLowerCase()}`.toLowerCase();
  const hasEventSignal = EP_EVENT_KEYWORDS.some(k => text.includes(k));
  const score = hasEventSignal ? base.score : Math.min(base.score, 2);
  return {
    relevant: hasEventSignal && score >= ORG_RELEVANCE_THRESHOLD,
    score,
    matched_keywords: base.matched_keywords,
  };
}

export function isAlliRelevant(t: TenderText): OrgRelevanceResult {
  return scoreOrgRelevance(ALLI_KEYWORDS, t);
}

export function isPmoRelevant(t: TenderText): OrgRelevanceResult {
  return scoreOrgRelevance(PMO_KEYWORDS, t);
}

// Convenience — run all three lanes at once
export function computeOrgTags(t: TenderText): {
  ep_relevant: boolean; ep_relevance_score: number; ep_matched_keywords: string[];
  alli_relevant: boolean; alli_relevance_score: number; alli_matched_keywords: string[];
  pmo_relevant: boolean; pmo_relevance_score: number; pmo_matched_keywords: string[];
} {
  const ep   = isEpRelevant(t);
  const alli = isAlliRelevant(t);
  const pmo  = isPmoRelevant(t);
  return {
    ep_relevant: ep.relevant,     ep_relevance_score: ep.score,     ep_matched_keywords: ep.matched_keywords,
    alli_relevant: alli.relevant, alli_relevance_score: alli.score, alli_matched_keywords: alli.matched_keywords,
    pmo_relevant: pmo.relevant,   pmo_relevance_score: pmo.score,   pmo_matched_keywords: pmo.matched_keywords,
  };
}

// ─── Six-Lane Discovery Scoring + Relevance Gate (Phase 1) ───────────────────
// Replaces the EP/ALLI/PMO lanes for the discovery sweep. Each lane scores 0-100
// (title/buyer match = 3pts, desc/category = 1pt). A tender's score is its BEST
// lane score. Keyword sets, exclude list, and threshold live in the config module
// (not hardcoded here). Keywords RAISE score; they can never bypass the gate.

export interface LaneScore { key: string; label: string; score: number; matched: string[]; }
export interface RelevanceVerdict {
  passes: boolean;          // score >= threshold AND not excluded AND lane discipline AND geography
  score: number;            // best lane score
  lane: string | null;      // best lane key
  laneLabel: string | null; // best lane label
  matched_keywords: string[];
  excluded: boolean;        // an exclude keyword matched (hard reject)
  exclusionReason: string | null; // which exclude term fired (Fix 6: audit logging)
  lanes: LaneScore[];       // per-lane breakdown (explainability)
  geoFlag: string | null;   // "out-of-geography" if country not in allow-list (Fix 5)
  geoReason: string | null; // which country triggered the flag
  localityFlag: string | null; // "local-presence-required" for GB place-based tenders outside natural-fit regions (Fix 5b)
  localityReason: string | null; // which GB locality triggered the flag
  sizeFlag: string | null;   // "over-sme-capacity" when a KNOWN value exceeds the SME ceiling
  sizeReason: string | null; // e.g. "value=1500000 > 250000"
}

function rawLaneScore(keywords: string[], title: string, buyer: string, desc: string, cat: string): { score: number; matched: string[] } {
  const hits: Array<{ kw: string; pts: number }> = [];
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    let pts = 0;
    if (title.includes(k) || buyer.includes(k)) pts += 3;
    if (desc.includes(k) || cat.includes(k)) pts += 1;
    if (pts > 0) hits.push({ kw, pts });
  }
  hits.sort((a, b) => b.pts - a.pts);
  // Scale raw points (3 per title/buyer hit, 1 per desc/category hit) onto a
  // 0-100 lane score so ONE strong title keyword (3 raw) reaches the default
  // gate of 30. Keywords raise the score; the gate (threshold) is applied later.
  const raw = hits.reduce((s, h) => s + h.pts, 0);
  return { score: Math.min(100, raw * 10), matched: hits.slice(0, 8).map(h => h.kw) };
}

// True if the tender contains any hard-exclude keyword (title + description).
// Returns the matched term so we can log WHY each tender was dropped (Fix 6).
export function hasExcludedKeyword(t: TenderText): { excluded: boolean; matchedTerm: string | null } {
  const text = `${stripHtml(t.title || "")} ${stripHtml(t.description || "")}`.toLowerCase();
  for (const k of EXCLUDE_KEYWORDS) {
    const kLower = k.toLowerCase();
    // Multi-word phrases = exact substring; single-word = word boundary so "works"
    // does not false-positive on "workshops" / "framework" / "networking".
    const isMultiWord = kLower.includes(" ");
    const matched = isMultiWord
      ? text.includes(kLower)
      : new RegExp(`\\b${kLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
    if (matched) return { excluded: true, matchedTerm: k };
  }
  return { excluded: false, matchedTerm: null };
}

// Fix 4: Lane discipline — advisory terms are excluded unless a delivery term co-occurs.
// An advisory-only tender (e.g. ISSB capacity building) is NOT EP event delivery work.
// Returns the advisory term that fired, or null if no advisory conflict.
function checkLaneDiscipline(t: TenderText): { advisoryFired: boolean; matchedTerm: string | null; overridden: boolean } {
  const text = `${stripHtml(t.title || "")} ${stripHtml(t.description || "")}`.toLowerCase();
  for (const k of ADVISORY_KEYWORDS) {
    if (text.includes(k.toLowerCase())) {
      // Check if a delivery term also appears — if so, override the exclusion
      const overridden = DELIVERY_KEYWORDS.some(d => text.includes(d.toLowerCase()));
      return { advisoryFired: true, matchedTerm: k, overridden };
    }
  }
  return { advisoryFired: false, matchedTerm: null, overridden: false };
}

// Fix 5: Geography screen. Returns a geo flag and reason if country is outside the allow-list.
function checkGeography(t: TenderText & { country?: string | null; region?: string | null }): { flag: string | null; reason: string | null } {
  const c = (t.country || "").trim().toUpperCase();
  if (c && !ALLOWED_COUNTRIES.includes(c)) {
    return { flag: "out-of-geography", reason: `country=${c}` };
  }
  return { flag: null, reason: null };
}

// Décor gating: décor = EVENT venue styling/set-up only. A décor term qualifies
// ONLY when an event/delivery term co-occurs. "venue dressing"/"draping"/"prop hire"
// alone → dropped as "decor-no-event". Painting/furnishing are hard-excluded earlier,
// so this never fires on property work. ("event decoration" carries "event", so it
// self-satisfies and is not gated.)
function checkDecorGate(t: TenderText): { decorFired: boolean; matchedTerm: string | null; overridden: boolean } {
  const text = `${stripHtml(t.title || "")} ${stripHtml(t.description || "")}`.toLowerCase();
  for (const k of DECOR_KEYWORDS) {
    if (text.includes(k.toLowerCase())) {
      const overridden = DELIVERY_KEYWORDS.some(d => text.includes(d.toLowerCase()));
      return { decorFired: true, matchedTerm: k, overridden };
    }
  }
  return { decorFired: false, matchedTerm: null, overridden: false };
}

// Fix 5b: GB place-based locality flag. When a GB tender's buyer is a specific
// city/region council OUTSIDE EP's natural-fit regions (London + South East
// Midlands corridor), flag "local-presence-required" (a soft warning, not a hard
// drop). Tenders in the natural-fit regions never get the flag — EP has real ties.
function checkLocality(t: TenderText & { country?: string | null }): { flag: string | null; reason: string | null } {
  const c = (t.country || "").trim().toUpperCase();
  if (c && c !== "GB" && c !== "UK") return { flag: null, reason: null }; // non-GB handled by geography screen
  const buyer = stripHtml(t.buyer || "").toLowerCase();
  const hay = `${buyer} ${stripHtml(t.title || "")}`.toLowerCase();
  // Only place-based buyers (councils / boroughs / county / city authorities) are screened.
  const placeBased = /\b(council|borough|county|city of|combined authority|metropolitan|district|unitary)\b/i.test(hay);
  if (!placeBased) return { flag: null, reason: null };
  const naturalFit = GB_NATURAL_FIT_LOCALITIES.some(loc => hay.includes(loc));
  if (naturalFit) return { flag: null, reason: null };
  return { flag: "local-presence-required", reason: "gb-place-based-outside-natural-fit" };
}

// True if the tender carries a STRATEGIC ANCHOR — a high-value buyer or a
// strategic theme. This is the "high-value only" gate: a tender can score on a
// generic lane word ("event(s)") yet still be a small local-council operational
// buy; without an anchor it is not EP's market and is dropped. Matched across
// buyer + title + description (case-insensitive substring).
export function hasStrategicAnchor(t: TenderText): boolean {
  const buyer = stripHtml(t.buyer || "").toLowerCase();
  const hay = `${stripHtml(t.title || "")} ${buyer} ${stripHtml(t.description || "")}`.toLowerCase();
  if (STRATEGIC_BUYERS.some(b => buyer.includes(b) || hay.includes(b))) return true;
  if (STRATEGIC_THEMES.some(s => hay.includes(s))) return true;
  return false;
}

// Score all six lanes and apply the relevance gate.
// Now includes lane discipline (Fix 4), geography screening (Fix 5), and
// exclusion audit logging (Fix 6).
export function evaluateRelevance(t: TenderText & { country?: string | null; region?: string | null; value_amount?: number | null }): RelevanceVerdict {
  const title = stripHtml(t.title || "").toLowerCase();
  const buyer = stripHtml(t.buyer || "").toLowerCase();
  const desc  = stripHtml(t.description || "").toLowerCase();
  const cat   = (t.category || "").toLowerCase();

  // Raw-score every lane first (needed so secondary lanes can require another lane).
  const raw: Record<string, { score: number; matched: string[] }> = {};
  for (const lane of LANES) raw[lane.key] = rawLaneScore(lane.keywords, title, buyer, desc, cat);

  // Apply secondary-lane conditions: they cannot qualify on their own.
  const lanes: LaneScore[] = LANES.map((lane) => {
    let { score, matched } = raw[lane.key];
    if (lane.kind === "secondary") {
      const buyerOk = !lane.requireBuyerAnyOf || lane.requireBuyerAnyOf.some(b => buyer.includes(b.toLowerCase()));
      const alsoOk  = !lane.requireAlsoLaneAnyOf || lane.requireAlsoLaneAnyOf.some(k => (raw[k]?.score || 0) > 0);
      if (!buyerOk || !alsoOk) { score = 0; matched = []; }
    }
    return { key: lane.key, label: lane.label, score, matched };
  });

  const best = lanes.reduce((a, b) => (b.score > a.score ? b : a), lanes[0]);

  // Exclusion audit (Fix 6) — log which term fired.
  const excl = hasExcludedKeyword(t);
  let excluded = excl.excluded;
  let exclusionReason = excl.matchedTerm;

  // Lane discipline (Fix 4): advisory terms are excluded unless a delivery term co-occurs.
  const laneCheck = checkLaneDiscipline(t);
  if (laneCheck.advisoryFired && !laneCheck.overridden) {
    excluded = true;
    exclusionReason = "advisory-no-delivery";
  }

  // Décor gating: décor (event venue styling) qualifies only with an event term.
  const decorCheck = checkDecorGate(t);
  if (!excluded && decorCheck.decorFired && !decorCheck.overridden) {
    excluded = true;
    exclusionReason = "decor-no-event";
  }

  // Geography screen (Fix 5): out-of-allow-list countries are excluded.
  const geo = checkGeography(t);
  let geoFlag = geo.flag;
  let geoReason = geo.reason;
  if (geoFlag === "out-of-geography") {
    excluded = true;
    if (!exclusionReason) exclusionReason = "out-of-geography"; // don't mask a more specific reason (advisory/décor/keyword)
  }

  // SME size ceiling: a KNOWN contract value above the ceiling is out of EP's
  // financial-standing reach — dropped from auto-qualify (consortium/parent bids are
  // a manual call). Unknown/zero value is kept (can't tell).
  let sizeFlag: string | null = null;
  let sizeReason: string | null = null;
  const val = typeof t.value_amount === "number" ? t.value_amount : null;
  if (val !== null && val > SME_MAX_CONTRACT_VALUE) {
    excluded = true;
    sizeFlag = "over-sme-capacity";
    sizeReason = `value=${Math.round(val)} > ${SME_MAX_CONTRACT_VALUE}`;
    if (!exclusionReason) exclusionReason = "over-sme-capacity";
  }

  // GB place-based locality flag (Fix 5b): a soft warning, never auto-excludes.
  const loc = checkLocality(t);

  // "High-value only" gate: must clear the lane threshold AND carry a strategic
  // anchor (recognised buyer or strategic theme). Drops generic local-council /
  // operational notices that score on a bare "event(s)" hit but aren't EP's market.
  const passes = !excluded && best.score >= RELEVANCE_THRESHOLD && hasStrategicAnchor(t);
  return {
    passes,
    excluded,
    exclusionReason,
    score: best.score,
    lane: best.score > 0 ? best.key : null,
    laneLabel: best.score > 0 ? best.label : null,
    matched_keywords: best.matched,
    lanes,
    geoFlag,
    geoReason,
    localityFlag: loc.flag,
    localityReason: loc.reason,
    sizeFlag,
    sizeReason,
  };
}

export type FinderFilters = {
  keywords?: string;
  statuses?: FinderStatus[]; // empty = all
  sme_only?: boolean;
  winner?: string;
  cpv_code?: string;
  procedure_type?: string;
  regions?: string[]; // ITL codes: UKC, UKD, ...
  published_from?: string; // YYYY-MM-DD
  published_to?: string;
  buyer_name?: string; // BuyerName filter — passed directly to CF PublicSearch
  source?: "cf" | "fts" | "both";
  country?: "GB" | "NG" | "both";
  sort?: "best_match" | "newest" | "oldest" | "deadline_asc" | "deadline_desc" | "value_desc" | "value_asc";
  page?: number;
  page_size?: number;
};

export type FinderResponse = {
  results: NormalisedTender[];
  stats: {
    total: number;
    active: number;
    average_value: number | null;
    closing_soon: number; // within 7 days
  };
  status_counts: Record<FinderStatus | "all", number>;
  pagination: {
    page: number;
    page_size: number;
    total_pages: number;
    total_results: number;
  };
  sources: {
    cf_count: number;
    fts_count: number;
    fts_enabled: boolean;
  };
  warnings: string[];
};

const UK_REGION_NAMES: Record<string, string> = {
  UKC: "North East", UKD: "North West", UKE: "Yorkshire and The Humber",
  UKF: "East Midlands", UKG: "West Midlands", UKH: "East of England",
  UKI: "London", UKJ: "South East", UKK: "South West",
  UKL: "Wales", UKM: "Scotland", UKN: "Northern Ireland",
};

function parseDate(s: string | null | undefined): string | null {
  if (!s) return null;
  try { return new Date(s).toISOString(); } catch { return null; }
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function safeDateValue(value: any): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  const time = d.getTime();
  return Number.isNaN(time) ? null : time;
}

// ─── Contracts Finder ────────────────────────────────────────────────────────
// Official endpoint: GET /Published/Notices/PublicSearch/Search
// Params: Keyword, NoticeType (1=notice, 2=award), PostedFrom, PostedTo,
//         RegionCodes (multi), CPVCodes (multi), BuyerName
// Returns: JSON { releases: [...] } (OCDS) OR { results: [...] } (flat)

async function fetchContractsFinder(filters: FinderFilters & { buyer_name?: string }): Promise<NormalisedTender[]> {
  const results: NormalisedTender[] = [];
  const keyword = (filters.keywords || "").trim();
  const statuses = filters.statuses || [];

  // NoticeType: 1 = contract/tender notice, 2 = contract award notice
  const wantOpen  = statuses.length === 0 || statuses.some(s => s === "open" || s === "planned" || s === "closed" || s === "cancelled");
  const wantAward = statuses.length === 0 || statuses.includes("awarded");

  const pageSize = 100;
  const noticeTypes: Array<{ code: number; awarded: boolean }> = [];
  if (wantOpen)  noticeTypes.push({ code: 1, awarded: false });
  if (wantAward) noticeTypes.push({ code: 2, awarded: true });

  const BASE = "https://www.contractsfinder.service.gov.uk/Published/Notices";

  for (const nt of noticeTypes) {
    try {
      // Build PublicSearch params exactly as documented
      const params = new URLSearchParams();
      if (keyword)             params.set("Keyword",    keyword);
      params.set("NoticeType", String(nt.code));
      if (filters.published_from) params.set("PostedFrom", filters.published_from);
      if (filters.published_to)   params.set("PostedTo",   filters.published_to);
      if (filters.regions?.length) {
        for (const r of filters.regions) params.append("RegionCodes", r);
      }
      if (filters.cpv_code)        params.append("CPVCodes",  filters.cpv_code);
      if ((filters as any).buyer_name) params.set("BuyerName", (filters as any).buyer_name);
      params.set("Page",     "1");
      params.set("PageSize", String(pageSize));

      const publicSearchUrl = `${BASE}/PublicSearch/Search?${params.toString()}`;
      // OCDS fallback — reliable JSON, no BuyerName filter but keyword-searched
      const ocdsUrl = `${BASE}/OCDS/Search?queryString=${encodeURIComponent(keyword || "")}&stage=${nt.awarded ? "award" : "tender"}&output=json&size=${pageSize}${filters.published_from ? `&publishedFrom=${filters.published_from}` : ""}${filters.published_to ? `&publishedTo=${filters.published_to}` : ""}`;

      let releases: any[] = [];
      let usedFlat = false;

      // 1. Try the official PublicSearch endpoint
      try {
        const res = await fetch(publicSearchUrl, {
          headers: { Accept: "application/json", "User-Agent": "EventPerfekt-TenderFinder/1.0" },
          signal: AbortSignal.timeout(20000),
        });
        if (res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("json")) {
            const data = await res.json() as any;
            if (Array.isArray(data?.releases) && data.releases.length > 0) {
              releases = data.releases;               // OCDS envelope
            } else if (Array.isArray(data?.results) && data.results.length > 0) {
              releases = data.results;                // flat envelope
              usedFlat = true;
            } else if (Array.isArray(data?.Results) && data.Results.length > 0) {
              releases = data.Results;
              usedFlat = true;
            } else if (Array.isArray(data) && data.length > 0) {
              releases = data;
              usedFlat = true;
            }
          }
        }
      } catch (e: any) {
        console.warn("[TenderFinder] CF PublicSearch failed, trying OCDS fallback:", e.message);
      }

      // 2. OCDS fallback if PublicSearch returned nothing
      if (releases.length === 0) {
        try {
          const res = await fetch(ocdsUrl, {
            headers: { Accept: "application/json", "User-Agent": "EventPerfekt-TenderFinder/1.0" },
            signal: AbortSignal.timeout(20000),
          });
          if (res.ok) {
            const data = await res.json() as any;
            releases = data?.releases || [];
          }
        } catch (e: any) {
          console.warn("[TenderFinder] CF OCDS fallback also failed:", e.message);
        }
      }

      for (const release of releases) {
        const normalised = usedFlat
          ? normaliseCfFlat(release, nt.awarded)
          : normaliseCfRelease(release, nt.awarded);
        if (normalised) results.push(normalised);
      }
    } catch (err: any) {
      console.error(`[TenderFinder] CF error (NoticeType=${nt.code}):`, err.message);
    }
  }
  return results;
}

// Normaliser for flat PublicSearch JSON (non-OCDS)
function normaliseCfFlat(n: any, isAward: boolean): NormalisedTender | null {
  const title = n.Title || n.title || n.name || "";
  if (!title) return null;

  const guid = n.ID || n.id || n.NoticeIdentifier || n.noticeIdentifier || "";
  const url  = guid
    ? `https://www.contractsfinder.service.gov.uk/Notice/${guid}`
    : `https://www.contractsfinder.service.gov.uk/Search?Keywords=${encodeURIComponent(title)}`;

  const deadlineStr = n.ClosingDate || n.closingDate || n.deadline || null;
  const deadlineDate = safeDateValue(deadlineStr);
  const now = new Date();

  let status: FinderStatus;
  if (isAward || n.AwardedTo || n.awardedTo) status = "awarded";
  else if (deadlineDate && deadlineDate < now.getTime()) status = "closed";
  else status = "open";

  const rawValue = n.Value || n.value || n.ContractValue || n.contractValue;
  const value_amount = typeof rawValue === "number" ? rawValue
    : typeof rawValue?.Amount === "number" ? rawValue.Amount
    : typeof rawValue?.amount === "number" ? rawValue.amount
    : null;

  const buyer = n.BuyerName || n.buyerName || n.Buyer?.Name || n.buyer?.name || n.OrganisationName || "Not specified";

  const cpvRaw = n.CPVCodes || n.cpvCodes || n.CpvCodes || [];
  const cpvCodes: string[] = Array.isArray(cpvRaw)
    ? cpvRaw.map((c: any) => String(c?.Code || c?.code || c).trim()).filter(Boolean)
    : [];

  const region = n.Region || n.region || n.RegionName || null;

  return {
    id: `cf-${guid || title}`,
    title,
    description: (n.Description || n.description || n.Summary || "").slice(0, 1000),
    buyer,
    value: value_amount,
    value_estimated: value_amount != null,
    currency: n.Currency || n.currency || "GBP",
    published_date: n.PublishedDate || n.publishedDate ? String(n.PublishedDate || n.publishedDate).split("T")[0] : null,
    deadline: deadlineStr ? String(deadlineStr).split("T")[0] : null,
    status,
    source: "CF",
    source_label: "Contracts Finder",
    region,
    category: n.Category || n.category || null,
    url,
    cpv_codes: cpvCodes,
    procedure_type: n.ProcedureType || n.procedureType || null,
    sme_suitable: n.SmeSuitable ?? n.smeSuitable ?? null,
    winner: n.AwardedTo || n.awardedTo || null,
    award_date: n.AwardDate || n.awardDate ? (n.AwardDate || n.awardDate).split("T")[0] : null,
    award_value: n.AwardValue || n.awardValue || null,
    duration_months: null,
    match_score: 0,
    match_tier: "low",
  };
}

function normaliseCfRelease(release: any, isAward: boolean): NormalisedTender | null {
  const tender = release.tender || {};
  const buyer = release.buyer || {};
  const value = tender.value || tender.minValue || {};
  const awards = Array.isArray(release.awards) ? release.awards : [];
  const firstAward = awards[0] || null;
  const now = new Date();

  const title = tender.title || release.title || "";
  if (!title) return null;

  const idParts = (release.id || release.ocid || "").split("-");
  const noticeGuid = idParts.length >= 5 ? idParts.slice(0, 5).join("-") : (release.id || "");
  const url = noticeGuid
    ? `https://www.contractsfinder.service.gov.uk/Notice/${noticeGuid}`
    : `https://www.contractsfinder.service.gov.uk/Search?Keywords=${encodeURIComponent(title)}`;

  const deadline = tender.tenderPeriod?.endDate || null;
  const deadlineDate = safeDateValue(deadline);

  const rawStatus = (tender.status || "").toLowerCase();
  let status: FinderStatus;
  if (isAward || firstAward) status = "awarded";
  else if (rawStatus === "cancelled" || rawStatus === "withdrawn") status = "cancelled";
  else if (rawStatus === "planning" || rawStatus === "planned") status = "planned";
  else if (rawStatus === "complete" || (deadlineDate && deadlineDate < now.getTime())) status = "closed";
  else status = "open";

  const cpvCodes: string[] = [];
  const items = tender.items || [];
  for (const it of items) {
    const c = it.classification?.id || it.additionalClassifications?.[0]?.id;
    if (c) cpvCodes.push(String(c));
  }

  const deliveryAddresses = tender.items?.[0]?.deliveryAddresses || tender.deliveryAddresses || [];
  const region = deliveryAddresses?.[0]?.region || tender.deliveryAddresses?.[0]?.region || null;

  const value_amount = typeof value.amount === "number" ? value.amount : null;
  const awardValue = firstAward?.value?.amount ?? null;
  const winner = firstAward?.suppliers?.[0]?.name ?? null;
  const awardDate = firstAward?.date ?? null;

  const contractPeriod = tender.contractPeriod || {};
  let duration: number | null = null;
  if (contractPeriod.startDate && contractPeriod.endDate) {
    const s = new Date(contractPeriod.startDate);
    const e = new Date(contractPeriod.endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      duration = Math.max(1, Math.round(daysBetween(s, e) / 30));
    }
  }

  const procedure = tender.procurementMethodDetails || tender.procurementMethod || null;
  const sme = typeof tender.suitability?.sme === "boolean"
    ? tender.suitability.sme
    : (typeof tender.smeSuitable === "boolean" ? tender.smeSuitable : null);

  return {
    id: `cf-${noticeGuid || release.id || title}`,
    title,
    description: (tender.description || "").slice(0, 1000),
    buyer: buyer.name || "Not specified",
    value: awardValue ?? value_amount,
    value_estimated: value_amount != null && awardValue == null,
    currency: value.currency || firstAward?.value?.currency || "GBP",
    published_date: release.date ? release.date.split("T")[0] : null,
    deadline: deadline ? deadline.split("T")[0] : null,
    status,
    source: "CF",
    source_label: "Contracts Finder",
    region: region || null,
    category: items?.[0]?.classification?.description || null,
    url,
    cpv_codes: cpvCodes,
    procedure_type: procedure,
    sme_suitable: sme,
    winner,
    award_date: awardDate ? awardDate.split("T")[0] : null,
    award_value: awardValue,
    duration_months: duration,
    match_score: 0,
    match_tier: "low",
  };
}

// ─── Find a Tender (OCDS) ────────────────────────────────────────────────────
async function fetchFindATender(filters: FinderFilters, cdpKey: string): Promise<NormalisedTender[]> {
  const results: NormalisedTender[] = [];
  const keyword = (filters.keywords || "").trim();
  const pageSize = 100;

  const params = new URLSearchParams();
  if (keyword) params.set("q", keyword);
  if (filters.published_from) params.set("published_from", filters.published_from);
  if (filters.published_to) params.set("published_to", filters.published_to);
  if (filters.regions && filters.regions.length) {
    params.set("region", filters.regions.join(","));
  }
  const ftsStatus = ftsStatusFilter(filters.statuses || []);
  if (ftsStatus) params.set("status", ftsStatus);
  params.set("limit", String(pageSize));

  const url = `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "EventPerfekt-TenderFinder/1.0",
        "CDP-Api-Key": cdpKey,
      },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      console.log(`[TenderFinder] Find a Tender API returned ${res.status}`);
      return results;
    }
    const data = await res.json() as any;
    const packages = Array.isArray(data) ? data : (data?.releasePackages || data?.results || [data]);
    for (const pkg of packages) {
      const releases = pkg?.releases || (pkg?.tender ? [pkg] : []);
      for (const release of releases) {
        const normalised = normaliseFtsRelease(release);
        if (!normalised) continue;
        results.push(normalised);
      }
    }
  } catch (err: any) {
    console.error("[TenderFinder] Find a Tender error:", err.message);
  }
  return results;
}

function ftsStatusFilter(statuses: FinderStatus[]): string | null {
  if (!statuses.length) return null;
  if (statuses.length === 1) {
    if (statuses[0] === "open" || statuses[0] === "planned") return "active";
    if (statuses[0] === "awarded" || statuses[0] === "closed") return "complete";
    if (statuses[0] === "cancelled") return "cancelled";
  }
  return null;
}

function normaliseFtsRelease(release: any): NormalisedTender | null {
  const tender = release.tender || {};
  const buyer = release.buyer || {};
  const value = tender.value || tender.minValue || {};
  const awards = Array.isArray(release.awards) ? release.awards : [];
  const firstAward = awards[0] || null;
  const now = new Date();

  const title = tender.title || release.title || "";
  if (!title) return null;

  const noticeId = tender.id || release.id || release.ocid || "";
  const idGuid = (noticeId.split("-").slice(0, 5).join("-")) || noticeId;
  const url = idGuid
    ? `https://www.find-tender.service.gov.uk/Notice/${idGuid}`
    : `https://www.find-tender.service.gov.uk/Search?Keywords=${encodeURIComponent(title)}`;

  const deadline = tender.tenderPeriod?.endDate || null;
  const deadlineDate = safeDateValue(deadline);

  const rawStatus = (tender.status || "").toLowerCase();
  let status: FinderStatus;
  if (firstAward) status = "awarded";
  else if (rawStatus === "cancelled") status = "cancelled";
  else if (rawStatus === "planning" || rawStatus === "planned") status = "planned";
  else if (rawStatus === "complete" || (deadlineDate && deadlineDate < now.getTime())) status = "closed";
  else status = "open";

  const cpvCodes: string[] = [];
  const items = tender.items || [];
  for (const it of items) {
    const c = it.classification?.id;
    if (c) cpvCodes.push(String(c));
  }

  const region = tender.items?.[0]?.deliveryAddresses?.[0]?.region
    || tender.deliveryAddresses?.[0]?.region
    || null;

  const value_amount = typeof value.amount === "number" ? value.amount : null;
  const awardValue = firstAward?.value?.amount ?? null;
  const winner = firstAward?.suppliers?.[0]?.name ?? null;
  const awardDate = firstAward?.date ?? null;

  const contractPeriod = tender.contractPeriod || {};
  let duration: number | null = null;
  if (contractPeriod.startDate && contractPeriod.endDate) {
    const s = new Date(contractPeriod.startDate);
    const e = new Date(contractPeriod.endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      duration = Math.max(1, Math.round(daysBetween(s, e) / 30));
    }
  }

  const sme = typeof tender.suitability?.sme === "boolean" ? tender.suitability.sme : null;

  return {
    id: `fts-${idGuid || title}`,
    title,
    description: (tender.description || "").slice(0, 1000),
    buyer: buyer.name || "Not specified",
    value: awardValue ?? value_amount,
    value_estimated: value_amount != null && awardValue == null,
    currency: value.currency || firstAward?.value?.currency || "GBP",
    published_date: release.date ? release.date.split("T")[0] : null,
    deadline: deadline ? deadline.split("T")[0] : null,
    status,
    source: "FTS",
    source_label: "Find a Tender",
    region,
    category: items?.[0]?.classification?.description || null,
    url,
    cpv_codes: cpvCodes,
    procedure_type: tender.procurementMethodDetails || tender.procurementMethod || null,
    sme_suitable: sme,
    winner,
    award_date: awardDate ? awardDate.split("T")[0] : null,
    award_value: awardValue,
    duration_months: duration,
    match_score: 0,
    match_tier: "low",
  };
}

// ─── Match Scoring (weighted keyword / profile signal) ───────────────────────
export type MatchContext = {
  keywords: string[];
  categories: string[];
  active_contracts?: string[];
  sme?: boolean;
};

export function scoreTender(t: NormalisedTender, ctx: MatchContext): { score: number; tier: NormalisedTender["match_tier"] } {
  const haystack = [
    t.title, t.description, t.buyer, t.category,
    (t.cpv_codes || []).join(" "),
  ].filter(Boolean).join(" ").toLowerCase();

  let score = 0;
  const keywordHits = (ctx.keywords || []).filter(k => k && haystack.includes(k.toLowerCase())).length;
  score += Math.min(45, keywordHits * 10);

  const categoryHits = (ctx.categories || []).filter(c => c && haystack.includes(c.toLowerCase())).length;
  score += Math.min(18, categoryHits * 6);

  // Freshness — published within last 30 days wins points
  if (t.published_date) {
    const days = (Date.now() - new Date(t.published_date).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 7) score += 10;
    else if (days <= 30) score += 6;
  }

  // Open tenders > closed/awarded for match priority
  if (t.status === "open") score += 8;
  else if (t.status === "planned") score += 4;

  // SME alignment
  if (ctx.sme && t.sme_suitable === true) score += 5;

  // Value sanity — avoid gigantic contracts for SMEs
  if (t.value != null) {
    if (t.value >= 50000 && t.value <= 2_000_000) score += 5;
    else if (t.value > 2_000_000 && ctx.sme) score -= 5;
  }

  const eventSignals = [
    "event management", "event production", "event delivery", "conference", "conferencing",
    "delegate", "delegate management", "venue", "venue management", "hospitality",
    "hospitality services", "catering", "banqueting", "gala", "awards ceremony",
    "exhibition", "expo", "summit", "forum", "workshop", "training", "facilitation",
    "programme delivery", "programme support", "programme management", "project management",
    "stakeholder engagement", "marketing services", "communications", "brand", "branding",
    "creative services", "campaign", "public engagement", "community engagement",
  ];
  const eventHits = eventSignals.filter(sig => haystack.includes(sig)).length;
  score += Math.min(36, eventHits * 5);

  // Africa / FCDO / international delivery — EP's strongest capability signals
  const africaInternationalSignals = [
    "africa", "nigeria", "kenya", "ghana", "senegal", "zambia", "ethiopia",
    "mozambique", "sierra leone", "cameroon", "west africa", "east africa",
    "sub-saharan", "fcdo", "cefas", "ukhsa", "defra africa", "british council",
    "international development", "oda", "overseas development", "uk aid",
    "cross-border", "africa regional", "africa programme", "overseas event",
    "global development", "nest programme", "apha", "mmo", "jncc",
  ];
  const africaHits = africaInternationalSignals.filter(sig => haystack.includes(sig)).length;
  score += Math.min(30, africaHits * 10);

  // Remittance & cross-border payment signals — second major growth vertical
  const remittanceSignals = [
    "remittance", "remittances", "cross-border payment", "cross-border payments",
    "diaspora remittance", "money transfer", "international money transfer",
    "remittance corridor", "migrant remittance", "financial inclusion",
    "mobile money", "digital payments", "payment systems", "payment infrastructure",
    "fintech", "gsma", "uncdf", "iom remittance", "ifc payment",
    "world bank payment", "commonwealth fintech", "reducing cost of remittance",
    "uk-africa corridor", "africa fintech", "africa digital finance",
    "payment reform", "financial corridor",
  ];
  const remittanceHits = remittanceSignals.filter(sig => haystack.includes(sig)).length;
  score += Math.min(24, remittanceHits * 9);

  // UK event framework signals
  const eventPerfektSignals = [
    "event management", "conference management", "event framework",
    "summit", "gala", "awards ceremony", "workshop facilitation",
    "programme delivery", "project management", "stakeholder engagement",
    "venue", "delegate management", "logistics", "campaign",
    "programme support", "programme management", "pmo",
    "training services", "capacity building", "consultancy", "facilitation",
  ];
  const signalHits = eventPerfektSignals.filter(signal => haystack.includes(signal)).length;
  score += Math.min(28, signalHits * 5);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier: NormalisedTender["match_tier"] =
    score >= 95 ? "excellent" :
    score >= 80 ? "strong" :
    score >= 65 ? "good" :
    score >= 50 ? "possible" : "low";
  return { score, tier };
}

// Hard-block terms: tenders containing ANY of these return score 0 — EP/ALLI/PMO would never bid.
const HARD_BLOCK_TERMS = [
  // Construction & civil works
  "construction works", "civil engineering", "groundworks", "drainage works",
  "highways maintenance", "road maintenance", "pavement works", "tarmac",
  "demolition", "scaffolding", "structural works", "reinforced concrete",
  "brickwork", "masonry", "roofing works", "cladding works", "glazing works",
  // Building services
  "plumbing works", "plumbing services", "hvac", "mechanical and electrical",
  "electrical installation", "electrical works", "gas installation",
  "fire suppression", "sprinkler systems",
  // Quantity surveying / architecture
  "quantity surveying", "architectural services", "structural engineering",
  "building regulations",
  // Defence & weapons
  "defence equipment", "military equipment", "weapons system", "ammunition",
  "armaments", "firearms", "ordnance", "naval vessel", "military vehicle",
  "explosives",
  // Pharmaceutical & clinical
  "pharmaceutical supply", "clinical trial", "medical devices", "medicinal products",
  "in vitro diagnostic", "drug procurement",
  // Waste & grounds
  "waste collection", "refuse collection", "recycling collection",
  "grounds maintenance", "horticulture", "arboriculture", "tree surgery",
  "street cleansing",
  // Cleaning & guarding
  "cleaning services", "commercial cleaning", "janitorial", "domestic cleaning",
  "security guarding", "manned guarding", "door supervision",
  // Food supply (not events catering)
  "food supply", "grocery supply", "catering supplies procurement",
  // Fleet
  "vehicle fleet", "fleet management", "vehicle hire", "bus service",
  "taxi service",
  // Heavy infrastructure
  "water treatment", "sewerage", "utilities infrastructure", "power generation",
  "substation", "pylons", "rail infrastructure", "bridge construction",
  // Out of scope for Event Perfekt / ALLI
  "after-school", "after school", "holiday club", "holiday clubs",
  "child friendly", "child-friendly", "children's services", "children services",
  "child care", "childcare", "children's centre", "children centre",
  "school", "schools", "education", "educational", "academy", "academies",
  "early years", "nursery", "nurseries", "primary school", "secondary school",
  "temporary accommodation", "supported accommodation", "residential care",
  "foster care", "nursery", "nurseries", "primary school", "secondary school",
  "young person", "young people", "youth club", "youth clubs",
  "looked after children", "care leaver", "care leavers",
  "social and emotional support", "emotional support", "support programmes",
  "community programme", "community programmes", "thriving together",
  "mens sheds", "men's sheds", "shared bench",
  "social support", "community support", "wellbeing support",
  "family support", "youth support", "support service", "support services",
  "mental health support", "public health support",
];

const EP_BUSINESS_FIT_TERMS = [
  { terms: ["event management", "event delivery", "event production", "conference management", "conference services", "delegate management", "gala dinner", "awards ceremony", "summit management", "ministerial event", "hybrid event", "live event"], weight: 5 },
  { terms: ["pmo", "portfolio governance", "portfolio management", "programme governance", "programme management office", "programme management"], weight: 5 },
  { terms: ["programme management", "programme delivery", "programme support", "programme coordination", "delivery support"], weight: 4 },
  { terms: ["stakeholder engagement", "stakeholder management", "convening", "facilitation", "public engagement", "community engagement", "outreach delivery"], weight: 4 },
  { terms: ["africa", "sub-saharan africa", "west africa", "east africa", "nigeria", "ghana", "kenya", "cef as", "cefas", "cross-border", "overseas development", "international development", "uk aid", "oda"], weight: 4 },
  { terms: ["capacity building", "training delivery", "training", "technical assistance", "learning programme"], weight: 3 },
  { terms: ["marketing", "brand", "branding", "design", "creative", "gifts", "corporate gifts", "lightbulb"], weight: 3 },
];

export function scoreEpBusinessFit(t: Pick<NormalisedTender, "title" | "description" | "buyer" | "category">): number {
  const text = `${t.title || ""} ${t.description || ""} ${t.buyer || ""} ${t.category || ""}`.toLowerCase();
  // Hard-block: if any block term appears in title or description, score is 0
  if (HARD_BLOCK_TERMS.some(term => text.includes(term))) return 0;
  let score = 0;
  for (const group of EP_BUSINESS_FIT_TERMS) {
    if (group.terms.some(term => text.includes(term))) score = Math.max(score, group.weight);
  }
  if (text.includes("event") && text.includes("management")) score = Math.max(score, 5);
  return Math.min(5, score);
}

// ─── Deduplicate ─────────────────────────────────────────────────────────────
function dedupeTenders(tenders: NormalisedTender[]): NormalisedTender[] {
  const byKey = new Map<string, NormalisedTender>();
  for (const t of tenders) {
    const key = `${t.title.trim().toLowerCase()}|${t.buyer.trim().toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, t);
      continue;
    }
    // Prefer the richer record: FTS over CF if it has an award; otherwise keep first.
    if ((t.winner && !existing.winner) || (t.status === "awarded" && existing.status !== "awarded")) {
      byKey.set(key, t);
    }
  }
  return Array.from(byKey.values());
}

// ─── Apply post-fetch filters (winner, sme, procedure, status-subset) ────────
function applyClientFilters(tenders: NormalisedTender[], filters: FinderFilters): NormalisedTender[] {
  let out = tenders;
  if (filters.sme_only) out = out.filter(t => t.sme_suitable === true);
  if (filters.winner) {
    const w = filters.winner.trim().toLowerCase();
    out = out.filter(t => (t.winner || "").toLowerCase().includes(w));
  }
  if (filters.procedure_type) {
    const p = filters.procedure_type.toLowerCase();
    out = out.filter(t => (t.procedure_type || "").toLowerCase().includes(p));
  }
  if (filters.cpv_code) {
    out = out.filter(t => t.cpv_codes.some(c => c.startsWith(filters.cpv_code!)));
  }
  if (filters.regions && filters.regions.length) {
    out = out.filter(t => t.region && filters.regions!.some(r => t.region!.startsWith(r)));
  }
  return out;
}

// ─── Sorting ─────────────────────────────────────────────────────────────────
function sortTenders(tenders: NormalisedTender[], sort: FinderFilters["sort"] = "best_match"): NormalisedTender[] {
  const copy = [...tenders];
  const byDateAsc = (a: string | null, b: string | null) =>
    (a ? new Date(a).getTime() : Number.POSITIVE_INFINITY) -
    (b ? new Date(b).getTime() : Number.POSITIVE_INFINITY);
  switch (sort) {
    case "newest":      copy.sort((a, b) => byDateAsc(b.published_date, a.published_date)); break;
    case "oldest":      copy.sort((a, b) => byDateAsc(a.published_date, b.published_date)); break;
    case "deadline_asc": copy.sort((a, b) => byDateAsc(a.deadline, b.deadline)); break;
    case "deadline_desc": copy.sort((a, b) => byDateAsc(b.deadline, a.deadline)); break;
    case "value_desc":  copy.sort((a, b) => (b.value ?? -1) - (a.value ?? -1)); break;
    case "value_asc":   copy.sort((a, b) => (a.value ?? Number.POSITIVE_INFINITY) - (b.value ?? Number.POSITIVE_INFINITY)); break;
    case "best_match":
    default:            copy.sort((a, b) => b.match_score - a.match_score); break;
  }
  return copy;
}

// ─── Aggregate stats & status counts ─────────────────────────────────────────
function computeStats(tenders: NormalisedTender[]) {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  let sum = 0;
  let valueCount = 0;
  let active = 0;
  let closingSoon = 0;
  const counts: Record<FinderStatus | "all", number> = {
    all: tenders.length, open: 0, awarded: 0, closed: 0, planned: 0, cancelled: 0,
  };
  for (const t of tenders) {
    counts[t.status] += 1;
    if (t.status === "open") active++;
    const v = t.value;
    if (v != null) { sum += v; valueCount++; }
    if (t.deadline) {
      const diff = new Date(t.deadline).getTime() - now;
      if (diff > 0 && diff <= sevenDays) closingSoon++;
    }
  }
  return {
    stats: {
      total: tenders.length,
      active,
      average_value: valueCount ? Math.round(sum / valueCount) : null,
      closing_soon: closingSoon,
    },
    status_counts: counts,
  };
}

// ─── Main orchestrator ───────────────────────────────────────────────────────
export async function searchTenders(filters: FinderFilters, match: MatchContext): Promise<FinderResponse> {
  const warnings: string[] = [];
  const cdpKey = process.env.FIND_A_TENDER_CDP_KEY || "";
  const source = filters.source || "both";
  const country = filters.country || "GB";
  const includeGB = country === "GB" || country === "both";
  const includeNG = country === "NG" || country === "both";

  const tasks: Array<Promise<NormalisedTender[]>> = [];
  if (includeGB && source !== "fts") tasks.push(fetchContractsFinder(filters));
  if (includeGB && source !== "cf") {
    if (cdpKey) tasks.push(fetchFindATender(filters, cdpKey));
    else warnings.push("FIND_A_TENDER_CDP_KEY not set — Find a Tender results unavailable");
  }
  if (includeNG) {
    const { fetchNigeriaTenders } = await import("./ng-tender-sources");
    const ngKeywords = filters.keywords ? [filters.keywords] : (match.keywords || []);
    tasks.push(fetchNigeriaTenders(ngKeywords));
  }

  const settled = await Promise.allSettled(tasks);
  const rawResults: NormalisedTender[] = [];
  for (const r of settled) if (r.status === "fulfilled") rawResults.push(...r.value);

  const cfCount = rawResults.filter(t => t.source === "CF").length;
  const ftsCount = rawResults.filter(t => t.source === "FTS").length;

  const deduped = dedupeTenders(rawResults);
  const filtered = applyClientFilters(deduped, filters);

  for (const t of filtered) {
    const { score, tier } = scoreTender(t, match);
    t.match_score = score;
    t.match_tier = tier;
    const tags = computeOrgTags(t);
    t.ep_relevant = tags.ep_relevant;
    t.ep_relevance_score = tags.ep_relevance_score;
    t.ep_matched_keywords = tags.ep_matched_keywords;
    t.alli_relevant = tags.alli_relevant;
    t.alli_relevance_score = tags.alli_relevance_score;
    t.alli_matched_keywords = tags.alli_matched_keywords;
    t.pmo_relevant = tags.pmo_relevant;
    t.pmo_relevance_score = tags.pmo_relevance_score;
    t.pmo_matched_keywords = tags.pmo_matched_keywords;
  }

  // Status tab filtering (applied AFTER fetching both notice types from CF)
  let statusFiltered = filtered;
  if (filters.statuses && filters.statuses.length > 0) {
    statusFiltered = filtered.filter(t => filters.statuses!.includes(t.status));
  }

  const sorted = sortTenders(statusFiltered, filters.sort);
  const { stats, status_counts } = computeStats(filtered); // counts reflect ALL results, not just current tab
  // Overwrite 'all' to reflect full filtered set
  status_counts.all = filtered.length;

  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.max(5, Math.min(100, filters.page_size || 20));
  const start = (page - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  return {
    results: paged,
    stats,
    status_counts,
    pagination: {
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(sorted.length / pageSize)),
      total_results: sorted.length,
    },
    sources: {
      cf_count: cfCount,
      fts_count: ftsCount,
      fts_enabled: Boolean(cdpKey),
    },
    warnings,
  };
}

// ─── Competitive Intelligence — buyer procurement history ────────────────────
export async function getBuyerIntelligence(buyerName: string): Promise<{
  buyer: string;
  period_years: number;
  total_contracts_awarded: number;
  average_contract_value: number | null;
  top_suppliers: Array<{ name: string; wins: number; total_value: number }>;
  top_categories: Array<{ category: string; count: number }>;
  upcoming_renewals: NormalisedTender[];
  similar_open_tenders: NormalisedTender[];
}> {
  const periodYears = 2;
  const now = new Date();
  const from = new Date(now.getFullYear() - periodYears, now.getMonth(), now.getDate()).toISOString().split("T")[0];

  // Pull both award notices and open tenders for the buyer via keyword search (buyer name as keyword).
  const awardRuns = await fetchContractsFinder({
    keywords: buyerName,
    statuses: ["awarded"],
    published_from: from,
    source: "cf",
    page_size: 100,
  } as any);

  const openRuns = await fetchContractsFinder({
    keywords: buyerName,
    statuses: ["open"],
    source: "cf",
    page_size: 100,
  } as any);

  const awardsForBuyer = awardRuns.filter(t => (t.buyer || "").toLowerCase() === buyerName.toLowerCase());
  const openForBuyer = openRuns.filter(t => (t.buyer || "").toLowerCase() === buyerName.toLowerCase());

  const supplierMap = new Map<string, { wins: number; total_value: number }>();
  const categoryMap = new Map<string, number>();
  let totalValue = 0;
  let valueSamples = 0;

  for (const a of awardsForBuyer) {
    if (a.winner) {
      const prev = supplierMap.get(a.winner) || { wins: 0, total_value: 0 };
      prev.wins += 1;
      prev.total_value += a.award_value ?? 0;
      supplierMap.set(a.winner, prev);
    }
    if (a.category) categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);
    if (a.value != null) { totalValue += a.value; valueSamples++; }
  }

  const top_suppliers = Array.from(supplierMap.entries())
    .map(([name, v]) => ({ name, wins: v.wins, total_value: v.total_value }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5);

  const top_categories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Upcoming renewals = awards whose contractPeriod ends within next 12 months
  const in12Months = now.getTime() + 365 * 24 * 60 * 60 * 1000;
  const upcoming = awardsForBuyer.filter(a => {
    if (!a.award_date || !a.duration_months) return false;
    const endMs = new Date(a.award_date).getTime() + a.duration_months * 30 * 24 * 60 * 60 * 1000;
    return endMs > now.getTime() && endMs <= in12Months;
  }).slice(0, 10);

  return {
    buyer: buyerName,
    period_years: periodYears,
    total_contracts_awarded: awardsForBuyer.length,
    average_contract_value: valueSamples ? Math.round(totalValue / valueSamples) : null,
    top_suppliers,
    top_categories,
    upcoming_renewals: upcoming,
    similar_open_tenders: openForBuyer.slice(0, 10),
  };
}

export function tendersToCsv(tenders: NormalisedTender[]): string {
  const header = [
    "Title", "Buyer", "Value", "Published", "Deadline", "Status",
    "Source", "Region", "Category", "URL",
  ];
  const escape = (v: any) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const rows = tenders.map(t => [
    t.title, t.buyer,
    t.value != null ? `${t.currency} ${t.value}` : "Not specified",
    t.published_date || "",
    t.deadline || "",
    t.status,
    t.source_label,
    t.region ? `${t.region}${UK_REGION_NAMES[t.region] ? ` (${UK_REGION_NAMES[t.region]})` : ""}` : "",
    t.category || "",
    t.url,
  ].map(escape).join(","));
  return [header.join(","), ...rows].join("\n");
}

export { UK_REGION_NAMES };
