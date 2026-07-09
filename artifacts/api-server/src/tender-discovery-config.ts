// ─── Tender Discovery Config ─────────────────────────────────────────────────
// Single source of truth for the discovery loop's thresholds, lane keyword sets,
// exclude keywords, and CPV codes. Kept out of the scoring functions themselves
// (per the build brief: "do not hardcode them inside functions") so they can be
// tuned in one place — and later overridden per-org from saas_search_config.
//
// Phase 1 scope only. Does NOT touch Remittance / Africa / TwinPay / Nigeria /
// SAM.gov discovery — those use their own paths and are intentionally untouched.

// Minimum lane score (0-100) a tender must reach to pass the relevance gate.
// Overridable via env for quick tuning without a redeploy of logic.
export const RELEVANCE_THRESHOLD = Number(process.env.TENDER_RELEVANCE_THRESHOLD || 30);

// SME size ceiling: EP is a small consultancy (first-year turnover ~£14k; flagship
// CEFAS call-off ~£130k via the commission model). Public buyers commonly set a
// minimum-turnover / financial-standing bar around ~2× contract value, so very large
// contracts are out of reach on our own. A tender with a KNOWN value above this
// ceiling is flagged "over-sme-capacity" and dropped from auto-qualify (consortium /
// parent-guarantee bids are a manual decision, not an auto-surface). Tenders with no
// stated value are kept (can't tell). Default £250k; override via env.
export const SME_MAX_CONTRACT_VALUE = Number(process.env.SME_MAX_CONTRACT_VALUE || 250000);

// Hard exclusions: a tender whose title+description contains ANY of these
// (case-insensitive, substring) is rejected outright, regardless of score.
// Keywords RAISE score elsewhere; these can only REJECT.
// Delivery terms that can OVERRIDE an advisory exclusion (Fix 4).
// If the tender mentions BOTH an advisory term and a delivery term, it may still
// qualify. Advisory term WITHOUT a delivery term = hard drop.
export const DELIVERY_KEYWORDS: string[] = [
  "event", "events", "workshop", "conference", "summit", "logistics",
  "programme delivery", "stakeholder engagement", "training event",
  "convening", "facilitation", "roadshow", "exhibition", "ceremony",
  "gala", "launch event", "experiential", "delegate management",
];

// Advisory terms that should be excluded UNLESS a delivery term co-occurs (Fix 4).
// Advisory-only work (capacity building, standards, policy) is not EP's delivery lane.
export const ADVISORY_KEYWORDS: string[] = [
  "institutional capacity building", "capacity enhancement", "standards adoption",
  "issb", "technical assistance programme", "technical assistance project",
  "advisory services", "policy reform", "institutional strengthening",
  "sector reform", "capacity development", "advisory framework",
  "technical assistance", "advisory programme", "policy development",
];

export const EXCLUDE_KEYWORDS: string[] = [
  "cleaning", "consumables", "janitorial", "catering supplies", "food supply",
  "heating", "boiler", "hvac", "refurbishment", "construction", "works", "civils",
  "groundworks", "demolition", "fit-out", "plumbing", "electrical install",
  "facilities management", "grounds maintenance", "fleet", "vehicles", "ppe",
  "recruitment panel", "staffing agency", "temporary staffing", "agency staff",
  "locum", "software licence", "it hardware", "stationery",
  // Operational / facilities / clinical noise that scored on a generic word
  // ("Events Department", "Trainer Programme") but is never EP delivery work.
  "marquee", "first aid", "first-aid", "cpr", "defibrillator", "lifeguard",
  "arboricultural", "tree works", "tree surgery", "taxi", "gully", "precast",
  "surface works", "sports coaching", "apprenticeship", "diagnostic imaging",
  "cardiac", "pharmacy", "dispensary", "diving equipment", "playground",
  "play equipment",
  // Construction / building work + furnishing false friends — must stay excluded
  // even with a décor signal. Décor = EVENT venue styling only, never property work.
  "painting and decorating", "painting & decorating", "painting", "interior decoration",
  "redecoration", "decorator", "building works", "construction works",
  "house repairs", "home repairs", "property repairs", "property maintenance",
  "furnishing", "furnishings", "soft furnishings", "furniture supply", "reupholstery",
  "flooring", "carpeting", "window furnishing", "curtains and blinds",
  // Framework-only notices (not live call-offs, ITTs, or mini-competitions)
  "framework agreement only", "sole supplier framework",
  "standing offer", "catalogue", "supplier list", "pre-qualified",
  "dynamic purchasing system", "dps notice", "dps award",
  "contract award notice", "contract award", "award notice", "awarded to",
  "result of award", "tender award", "award summary", "award of contract",
  "contract has been awarded", "contract awarded",
  // Planning-stage-only notices
  "prior information notice", "pin only", "early engagement", "market sounding",
  "prior indication", "procurement strategy", "contract notice forthcoming",
  // NOTE: advisory / standards-development terms (ISSB, capacity building, technical
  // assistance, advisory services, policy reform, …) are intentionally NOT hard-listed
  // here — they live in ADVISORY_KEYWORDS and are handled by the OVERRIDABLE lane-
  // discipline check (Fix 4), so an advisory tender that ALSO has a delivery term
  // (e.g. "technical assistance delivered via workshops") can still qualify.
];

// Geography allow-list: delivery country must be one of these for auto-qualify (Fix 5).
// UK + EP's active African footprint + explicit diaspora relevance.
// Tenders outside this list get geo_flag = "out-of-geography" and are never auto-qualified.
export const ALLOWED_COUNTRIES: string[] = [
  "GB", "UK", "NG", "GH", "UG", "SN", "ZM", "ZA", "SL", "MZ", "KE",
  "RW", "TZ", "ET",
];

// Multi-lot framework detection: strip "Lot N" suffixes from title for dedup key (Fix 2).
// Example: "Framework X — Lot 2 Business Growth" and "Framework X — Lot 5 Events"
// collapse to one line in the digest. Handles both separator forms ("— Lot 2",
// ": Lot 2") AND a bare space before the lot ("T25-0047 Lot 3", Northumbria case).
// The \blot\b boundary stops "pilot"/"ballot" false matches.
export const LOT_SUFFIX_RE = /[\s:—–-]+\blot\b\s*\d+.*$/i;

// Décor terms that qualify ONLY when an event term co-occurs (Fix: décor gating).
// Décor = EVENT venue styling / set-up. Painting, house repairs and furnishing are
// hard-excluded above; a décor term with NO event/delivery term is dropped as
// "decor-no-event". Note "event decoration"/"event décor" carry "event" inside them,
// so those self-satisfy the co-occurrence check — only bare styling/dressing is gated.
export const DECOR_KEYWORDS: string[] = [
  "event decoration", "event theming", "event styling", "venue dressing",
  "venue styling", "set dressing", "stage décor", "stage decor", "draping",
  "backdrop design", "marquee dressing", "prop hire", "themed event",
  "event décor", "event decor", "floral styling", "décor", "decor",
  "styling", "theming",
];

// EP's full-confidence GB geographies (Fix 5b): the locality / local-presence flag
// must NOT fire for place-based tenders in these regions — EP has genuine ties.
// Only GB place-based tenders OUTSIDE these get "local-presence-required".
export const GB_NATURAL_FIT_LOCALITIES: string[] = [
  "london", "greater london", "city of london",
  "milton keynes", "northampton", "northamptonshire", "oxfordshire", "oxford",
  "bedford", "bedfordshire", "luton", "south east midlands",
];

// ─── Strategic-fit anchors (the "high-value only" gate) ──────────────────────
// A tender qualifies only if it carries a STRATEGIC ANCHOR — a recognised
// high-value buyer (gov / international development / event-framework body) OR a
// strategic theme. This is what separates "FCDO UK-Africa programme" from "tents
// for the council Events Department": both may mention "event(s)", but only the
// former is EP's market. Matched case-insensitively against buyer + title + desc.
export const STRATEGIC_BUYERS: string[] = [
  "fcdo", "foreign commonwealth", "foreign, commonwealth", "british council",
  "commonwealth secretariat", "united nations", "un capital", "uncdf", "undp",
  "unicef", "unhcr", "iom", "international organisation for migration",
  "international organization for migration", "world bank", "african development",
  "afdb", "giz", "ecowas", "palladium", "chemonics", "dai global", "mott macdonald",
  "crown agents", "adam smith international", "dcms", "department for culture",
  "cabinet office", "defra", "cefas", "ukhsa", "uk health security",
  "greater london authority", "mayor of london", "gla ",
  "ghana ministry", "nigeria ministry",
];
export const STRATEGIC_THEMES: string[] = [
  "africa", "nigeria", "ghana", "kenya", "senegal", "mozambique", "zambia",
  "rwanda", "uganda", "tanzania", "ethiopia", "diaspora", "remittance",
  "financial inclusion", "cross-border", "international development",
  "overseas development", "programme delivery", "capacity building",
  "stakeholder engagement", "event production", "event management",
  "conference management", "delivery framework", "event framework", "asean",
  "commonwealth", "ministerial", "summit",
  "graduation", "alumni", "donor", "venue dressing", "event theming",
  "event decoration", "event styling", "stage décor", "décor",
  // Education / international student recruitment (EP sector capability — universities)
  "student recruitment", "international student", "international students",
  "overseas recruitment", "in-country representation", "in-market representation",
  "widening participation", "international recruitment",
];

// Six-lane scoring model. Each lane is scored 0-100 independently; a tender's
// score is its BEST lane score. "primary" lanes stand alone; "secondary" lanes
// only qualify under an extra condition (see require* fields below).
export type LaneKind = "primary" | "secondary";

export interface LaneDef {
  key: string;
  label: string;
  kind: LaneKind;
  keywords: string[];
  // Secondary lanes only: buyer must match one of these (case-insensitive substring).
  requireBuyerAnyOf?: string[];
  // Secondary lanes only: the tender must ALSO hit one of these lanes' keywords.
  requireAlsoLaneAnyOf?: string[];
}

export const LANES: LaneDef[] = [
  {
    key: "events",
    label: "Events",
    kind: "primary",
    keywords: [
      "event", "events", "conference", "summit", "exhibition", "expo", "congress",
      "ceremony", "awards", "gala", "launch", "product launch", "experiential",
      "roadshow", "exhibition stand", "delegate", "registration", "rsvp",
      "hospitality", "agm", "open day", "graduation", "careers fair",
      "stakeholder engagement", "community engagement", "festival",
      "graduation", "congregation", "degree ceremony", "alumni event", "alumni reunion",
      "alumni engagement", "university conference", "freshers fair", "awards ceremony",
      "gala dinner", "fundraising gala", "donor event", "commemoration event",
    ],
  },
  {
    key: "design",
    label: "Design",
    kind: "primary",
    keywords: [
      "creative", "branding", "design", "décor", "decor", "styling", "signage",
      "exhibition stand",
      "event decoration", "event theming", "event styling", "venue dressing",
      "venue styling", "set dressing", "stage décor", "draping", "backdrop design",
      "marquee dressing", "prop hire", "themed event", "event décor",
      "floral styling (events)",
    ],
  },
  {
    key: "merchandise",
    label: "Merchandise",
    kind: "primary",
    keywords: [
      "merchandise", "promotional", "branded", "gifting", "corporate gift",
      "print", "fulfilment",
    ],
  },
  {
    // Education / international student recruitment (EP sector capability). Specific
    // multi-word phrases only — "university"/"college" alone must NEVER qualify.
    key: "education",
    label: "Education",
    kind: "primary",
    keywords: [
      "student recruitment", "international student recruitment", "international student",
      "international students", "overseas student recruitment", "overseas recruitment",
      "student recruitment agent", "recruitment agent", "education agent",
      "in-country representation", "in-market representation", "international recruitment",
      "widening participation", "student enquiry management", "student conversion",
      "international officer", "student pathway",
    ],
  },
  {
    key: "pmo",
    label: "PMO",
    kind: "primary",
    keywords: [
      "programme management", "project management", "pmo", "portfolio",
      "governance", "delivery partner", "change management",
    ],
  },
  {
    key: "development",
    label: "Development",
    kind: "secondary",
    keywords: [
      "diaspora", "international development", "programme delivery", "convening",
      "technical assistance",
    ],
    // Only counts when the buyer is one of these development bodies.
    requireBuyerAnyOf: [
      "fcdo", "british council", "commonwealth secretariat", "fcdo services",
    ],
  },
  {
    key: "charity",
    label: "Charity",
    kind: "secondary",
    keywords: [
      "charity", "fundraising", "donor", "third sector", "voluntary sector",
    ],
    // Only counts when combined with an events/design/merchandise signal.
    requireAlsoLaneAnyOf: ["events", "design", "merchandise"],
  },
];

// Seed CPV codes for procurement filtering (expandable). Used to pre-filter at
// source (Contracts Finder) and client-side in the shared normaliser (Find a
// Tender, which has no server-side CPV filter).
export const SEED_CPV_CODES: string[] = [
  "79952000", "79951000", "79950000", "79953000", "79954000", "79956000",
  "79822500", "79931000", "79932000", "79933000", "18530000", "22462000",
  "39294100", "79342200", "79800000", "79421000", "79420000", "79411000",
  "79410000", "79400000", "72413000", "63510000", "79961000", "80500000",
];

// Single recipient for the consolidated daily digest (Task 5). A group alias is
// expected (forwards to the team) so only ONE email is sent per day.
// Default is the UK admin inbox (the address the digest historically went to);
// override with DIGEST_RECIPIENT to point at a group alias.
export const DIGEST_RECIPIENT = process.env.DIGEST_RECIPIENT || "adminuk@eventperfekt.com";

// ─── Phase 2 — operational config ────────────────────────────────────────────
// Recipient for sweep health / failure alerts (the "⚠️ Tender sweep" emails).
// Defaults to the digest alias so ops alerts reach the same team inbox.
export const OPS_RECIPIENT = process.env.OPS_RECIPIENT || DIGEST_RECIPIENT;

// TED (EU) v3 search API — free, anonymous (a key is only needed to SUBMIT
// notices, not to search). Base URL overridable for the test/preview env.
export const TED_API_BASE = process.env.TED_API_BASE || "https://api.ted.europa.eu";
