// EventPerfekt — Tender Targeting & Pipeline Spec (v1.0).
//
// The rules the discovery engine filters on and the context the Bid/No-Bid Qualifier
// (ep-tender-prompts.ts §2) is injected with. Source of truth for lanes, CPV codes,
// monitored buyers, keyword sets, the qualification rule + hard score gate, the
// evidence-fit gate, win-probability bands and warning flags.
//
// Provenance: user-supplied Targeting Spec v1.0 (2026-06-27). Two fragments in the
// source paste were corrupted in transit (the §6 EXCLUDE list opener and the §12/§13
// boundary) and have been reconstructed conservatively from context.

// Machine-usable CPV families (filter API queries to these — stop junk at source).
export const EP_TARGET_CPV: Record<string, string[]> = {
  events: ["79952000", "79952100", "79951000", "79953000", "79954000", "79955000", "79956000", "79950000"],
  creative_design: ["79822500", "79931000", "79932000", "79933000"],
  merchandise_gifting: ["18530000", "22462000", "39294100", "79342200", "79800000", "18000000"],
  pmo_consulting: ["79421000", "79420000", "79411000", "79410000", "79400000", "72224000"],
  event_tech: ["72413000", "72420000"],
  adjacencies: ["79340000", "79341000", "79342000", "79416000", "63510000", "79961000", "92111000", "80500000", "80510000", "80570000"],
  development: ["75211200", "75211000", "73210000", "79419000"],
  youth_community: ["85300000", "80000000"],
  remittance_specialism: ["66170000", "66172000"], // specialism, NOT a lane (§12)
};

// Positive keyword signals (secondary layer over CPV; for Lanes E/F use with buyer match).
export const EP_INCLUDE_KEYWORDS = [
  // Events
  "event", "events", "conference", "summit", "exhibition", "exhibitor", "expo", "congress", "ceremony", "awards", "gala", "launch", "product launch", "experiential", "roadshow", "stand", "delegate", "registration", "rsvp", "hospitality", "agm", "open day", "graduation", "careers fair", "stakeholder engagement", "public engagement", "community engagement", "festival",
  // Design / merch
  "creative", "branding", "design", "décor", "decor", "styling", "signage", "exhibition stand", "merchandise", "promotional", "branded", "gifting", "print", "fulfilment",
  // PMO
  "programme management", "project management", "pmo", "portfolio", "governance", "delivery partner", "change management", "programme support", "project support", "programme office", "secretariat", "monitoring and evaluation", "mel", "assurance", "transformation", "delivery support",
  // Development (Lane E only, with buyer match)
  "diaspora", "international development", "programme delivery", "convening", "technical assistance",
  // Remittance specialism (mention only)
  "remittance", "cross-border payment", "money transfer", "financial inclusion",
];

// EXCLUDE: if any appears in title/scope, reject outright (anti-targets, §12).
export const EP_EXCLUDE_KEYWORDS = [
  "cleaning", "consumables", "janitorial", "catering supplies", "food supply",
  "heating", "boiler", "hvac", "refurbishment", "construction", "works", "civils",
  "groundworks", "demolition", "fit-out", "plumbing", "electrical install",
  "facilities management", "grounds maintenance", "fleet", "vehicles", "ppe",
  "uniforms", "it hardware", "software licences", "software licenses",
  "recruitment panel", "staffing agency", "temporary staffing", "agency staff",
  "locum", "stationery",
];

export const EP_TARGETING_SPEC = `# EventPerfekt — Tender Targeting & Pipeline Spec (v1.0)

## 1. Strategy in one paragraph
EventPerfekt is an end-to-end corporate and experiential EVENTS agency with creative-design, merchandise/gifting and project/PMO capability — the engine: high volume, winnable, well-served by UK public procurement. Two secondary tracks: international development (events/programme management FOR development buyers, relationship-led, not a scraper lane) and charity/third-sector. Community, youth and diaspora credentials are social-value scoring power that lifts events bids, not a separate business. We win on PRECISION, not volume.

## 2-3. Target lanes & win angles
A — Events & Experiential (PRIMARY): corporate events, launches, conferences, exhibitions, awards, engagement events, festivals. Lead bids here.
B — Creative & Design (PRIMARY): event branding, set/décor/styling, graphic design, stand design. Bundle into events; bid standalone where tendered.
C — Merchandise & Gifting (PRIMARY): branded merch, gifting, promo products, print/apparel. Recurring spend.
D — Consulting / Project & PMO (PRIMARY): programme/project management, PMO setup, governance, change. Keystone CPV 79421000. Position on governance/delivery assurance, not generic consultancy.
E — Development & International (SECONDARY): events/convenings/programme management/diaspora engagement FOR FCDO/British Council/Commonwealth. Relationship-led; win the events/PMO slices, NEVER head-to-head on aid delivery (incumbents: Oxford Policy Management, DAI, Palladium). UK aid budget shrinking — keep effort proportionate.
F — Charity / Third Sector (SECONDARY): galas, donor events, AGMs, conferences, launches, charity merch/design. Lead with mission alignment and value, not lowest price. Often off Contracts Finder.
Event-tech (websites, invitations, RSVP, registration, delegate management) sits across A–F and makes us more competitive everywhere (one supplier for the whole lifecycle).

## 4. CPV master list — see EP_TARGET_CPV export (filter at source; buyers mis-code, so keep the keyword layer as a safety net).

## 5. Monitored buyers (for Lanes E/F the buyer match matters more than CPV)
Central gov & central buying: Government Commercial Agency (GCA — formerly CCS, rebranded 1 Apr 2026, gca.gov.uk; existing CCS framework appointments remain valid), Cabinet Office, DBT (trade events/missions), DCMS, DfE, Home Office, FCDO.
Defra family — warm route via the CEFAS win: Cefas (existing client), JNCC, APHA, Marine Management Organisation, Environment Agency, Natural England. Prioritise their events/PMO/programme-support notices.
Local government: all LAs; prioritise large metros (GLA/London boroughs, Greater Manchester, Birmingham, West Midlands, West Yorkshire).
HE consortia (prolific events/print/merch buyers): LUPC, SUPC, NWUPC, NEUPC, APUC, HEPCW.
Health: NHS England, NHS trusts, NHS Supply Chain.
Development (Lane E): FCDO and FCDO Services, British Council, Commonwealth Secretariat.
Community safety (ALLI — mostly grants, §13): PCCs, regional VRUs, Youth Endowment Fund, National Lottery Community Fund.
Charities (Lane F): track major charities' own procurement/"work with us" pages + sector RFP boards.

## 6. Keyword sets — see EP_INCLUDE_KEYWORDS and EP_EXCLUDE_KEYWORDS exports.
A tender like "agency staffing panel," "cleaning consumables," or "heating system" must be excluded outright — it matched on weak words like "training"/"panel" and should never have scored. [§6 EXCLUDE-list opener reconstructed]

## 7. Qualification rule & scoring
QUALIFIES if ANY: (1) CPV in target list (§4) for Lanes A–D; OR (2) buyer is monitored (§5) AND a theme keyword (§6) appears (how Lane E/F qualify when coded generically); OR (3) a high-specificity keyword appears in the TITLE (e.g. "event services", "exhibition organisation", "project management services", "diaspora") regardless of CPV.
AND must NOT contain an EXCLUDE keyword in title/scope.
PLACE-BASED FLAG: if the buyer is a specific city/region council and the scope is locality-rooted, tag local-presence-required rather than auto-bidding (Swansea/Didcot/Sefton losses). EP's natural-fit geographies: London/Greater London and Africa/diaspora.
HARD GATE: score 0–100; anything BELOW the relevance threshold is NOT saved, NOT shown, NOT emailed — sub-threshold items drop out entirely. (Current build wrongly showed 10–20 scored tenders as "Included" — fix.) Dashboard "Candidates/Committed/Auto-Drafted" counters must read from the SAME dataset the results table renders.

### 7a. Evidence-fit gate
Score the opportunity against the playbook evidence base: relevant case study (CEFAS-001/WIN-002/WIN-003); relevant policies (DP/IM/IT-security + Modern Slavery/EDI/H&S); insurance (EL/PL/PI); social-value examples (SV-001..003); named delivery team (§8); local partner (only if required). RULE: if more than two ESSENTIAL evidence items are missing → NO-BID, unless closeable before deadline.

### 7b. Win-probability bands (beside the relevance score)
80–100% strong → prioritise; 60–79% good → pursue if capacity; 40–59% marginal → only with a strategic reason; <40% weak → normally decline. Pull-down factors: no local presence; financial-standing/min-turnover bar above EP's turnover; price-heavy weighting; design/creative-portfolio-led brief; strategic-consultancy emphasis.

### 7c. Lessons-learned warning flags (auto-flag at discovery)
local delivery/presence required → locality lesson; named local case study expected → regional-relevance gap; creative portfolio/visuals expected → Didcot lesson; strategy authorship weighted → Swansea lesson; heavy price weighting → Sefton/GM lesson (needs ROI-backed tiered price); min-turnover/financial-standing threshold → standing note (parent guarantee or consortium).

## 8. Framework hit-list (route to scale)
RM6124 Communications Marketplace (DPS) — joinable any time; fastest legitimate entry; IMMEDIATE target.
RM6364 Media and Creative Services — Lots 1–2 awarded Dec 2025 (start Jun 2026); Lots 3–8 from Jan 2026–Jan 2030; main intake largely passed, watch re-procurement/sub-contract.
RM6297 Print & Digital Communications — print/branded materials.
University consortia (LUPC/SUPC/NWUPC etc.) — apply as they re-procure.
FCDO eSourcing (Jaggaer) + FCDO DPSs — register; join relevant DPS; FCDO Supplier Engagement Newsletter.
Mechanics: GCA/CCS run through Jaggaer — register, express interest, complete the Procurement Selection Questionnaire (PSQ). ~75% of suppliers are SMEs; many frameworks are SME-structured.

## 9. Social value = our multiplier
Public buyers must weight social value ≥10% (mandatory for central government from 1 Oct 2025). National-mission outcomes map to EP strengths: crime reduction via community cohesion → ALLI youth-violence work; employment/training for those facing barriers → diaspora/community work; SME/VCSE support, fair work, sustainability. The Procurement Act lets authorities reserve contracts for SMEs/VCSEs and local suppliers. Build a reusable social-value evidence pack and weave into EVERY events bid; assess whether a VCSE/social-enterprise structure unlocks reserved contracts.

## 10. Data sources & discovery fix
Contracts Finder (OCDS API) — free, no key, server-side CPV/keyword/stage filter, 100/page — PRIMARY; filter at source by CPV.
Find a Tender (OCDS API) — free; migrated to Central Digital Platform 24 Feb 2025; use current endpoint /api/1.0/ocdsReleasePackages (pre-2025 endpoints = stale-data cause).
TED (EU) v3 — free anonymous search (keys only for SUBMITTING); re-enable but ONLY with CPV filtering (else ~50k EU notices/yr of noise).
GCA/CCS frameworks — monitor gca.gov.uk. FCDO eSourcing (Jaggaer) — register; join DPSs.
SAM.gov (US federal) — LEAVE OFF (irrelevant to a UK events business).
Scrape sources (NGTenders, bidstats) — deprioritise; fragile, break silently; prefer official OCDS APIs.
DEDUPLICATION: the same opportunity appears across Contracts Finder, Find a Tender and planning/tender/award stages sharing the same OCID — dedupe on OCID (kills duplicate alerts).

## 11. Notification fix
One daily digest, sent once (07:30), to ONE group alias (not three mailboxes). Include only tenders that pass the gate (§7), deduped by OCID. APPEND "deadlines this week" to that same digest (no separate 7/3/1-day mailers). Add a health check: if the sweep returns zero/errors, alert the team — silent failure is worse than noise.

## 12. What NOT to chase (anti-targets) — see EP_EXCLUDE_KEYWORDS
Cleaning/janitorial consumables, catering/food supply; heating/boilers/HVAC, construction/works/refurbishment/FM/grounds maintenance; staffing/recruitment panels, temporary/agency staffing, locums; IT hardware, software licences, fleet/vehicles, bulk stationery/PPE. Remittances are NOT a standalone lane — the UK public pool is thin (IFAD/World Bank/UNGM via managing agents); keep "remittance/cross-border/financial inclusion" as a thematic specialism mentioned in diaspora/development bids only.

## 13. Grants vs tenders [§12/§13 boundary reconstructed]
Youth/violence-reduction/safeguarding work (Youth Endowment Fund, VRUs, National Lottery Community Fund, trusts and foundations) is overwhelmingly GRANT-FUNDED, not tendered. Grant applications are a different discipline from tender writing (different documents, criteria, rhythm). If pursued seriously, resource it as a distinct grants function — don't blur the tender and grants pipelines in one workflow.

## 14. Priority order (first 90 days)
1. Fix discovery precision: CPV filtering at source + EXCLUDE list + enforce the score gate (kills ~80% of junk).
2. Fix the dashboard counter bug and the email digest (one deduped daily email).
3. Apply to RM6124 Communications Marketplace DPS (fastest live entry).
4. Build the social-value evidence pack and bake into every events bid.
5. Register on FCDO Jaggaer + Supplier Engagement Newsletter (Lane E groundwork).
6. Re-enable TED (free) with CPV filtering once the UK feed is clean.
`;
