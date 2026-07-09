// Tender Sweeper — daily EP-curated discovery sweep
// Runs at 07:00 UK time every day
// Searches Contracts Finder + Find a Tender with FCDO-aligned keywords
// Scores results via scoreTender() and seeds saas_tenders for all active orgs
// Goal: catch tenders like FCDO £150M Event Production Framework before deadline

import { db } from "./db";
import { sql } from "drizzle-orm";
import { evaluateRelevance, pgTextArray, type FinderStatus, type NormalisedTender, type RelevanceVerdict } from "./tender-finder-service";
import { RELEVANCE_THRESHOLD, SEED_CPV_CODES, LOT_SUFFIX_RE } from "./tender-discovery-config";
import { fetchTedV3ByCpv, fetchContractsFinderByBuyer, MONITORED_BUYERS, EP_DISCOVERY_KEYWORDS } from "./tender-sources-v2";
import { fetchNigeriaTenders } from "./ng-tender-sources";
import { recordSweepHealth, computeOverall, alertMissedSweep, type SourceHealth, type SourceStatus, type SweepHealth } from "./tender-health";
import { sweepWebSearch, webDiscoveryEnabled } from "./tender-web-discovery";

const SWEEP_LOG_PREFIX = "[TenderSweeper]";

export interface SweepResult {
  title: string;
  buyer: string;
  value_amount: number | null;
  value_currency: string;
  deadline: string;
  published: string;
  source_url: string;
  source: string;
  status: string;
  description: string;
  country?: string;
  cpv_codes?: string;
  ocid?: string;
}

// ─── Contracts Finder sweep ────────────────────────────────────────────────
async function sweepContractsFinder(keywords: string[]): Promise<SweepResult[]> {
  const now = new Date();
  const results: SweepResult[] = [];
  const seen = new Set<string>();
  const closedStatuses = ["closed", "cancelled", "complete", "awarded", "unsuccessful", "withdrawn"];
  let okResponses = 0;   // track live responses so a wholly-down endpoint can throw

  for (const keyword of keywords) {
    try {
      const url = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?queryString=${encodeURIComponent(keyword)}&stage=tender&output=json&publishedFrom=${now.getFullYear()}-01-01&size=100`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      okResponses++;
      const data = await res.json() as any;
      for (const r of (data?.releases || [])) {
        const tender = r.tender || {};
        const status = (tender.status || "").toLowerCase();
        if (closedStatuses.includes(status)) continue;
        const deadlineStr = tender.tenderPeriod?.endDate || "";
        if (!deadlineStr || new Date(deadlineStr) <= now) continue;
        const title = (tender.title || "").trim();
        if (!title || seen.has(title)) continue;
        seen.add(title);
        const buyer = r.buyer || {};
        const value = tender.value || tender.minValue || {};
        const cpvCodes: string[] = [];
        for (const item of (tender.items || [])) {
          const c = item.classification?.id || item.additionalClassifications?.[0]?.id;
          if (c) cpvCodes.push(String(c));
        }
        const idParts = (r.id || "").split("-");
        const guid = idParts.length >= 5 ? idParts.slice(0, 5).join("-") : r.id || "";
        results.push({
          title,
          description: (tender.description || "").slice(0, 400),
          buyer: buyer.name || "Not specified",
          value_amount: value.amount || null,
          value_currency: value.currency || "GBP",
          deadline: deadlineStr.split("T")[0],
          published: r.date ? r.date.split("T")[0] : "",
          source_url: guid
            ? `https://www.contractsfinder.service.gov.uk/Notice/${guid}`
            : `https://www.contractsfinder.service.gov.uk/Search?&keywords=${encodeURIComponent(title)}`,
          source: "Contracts Finder",
          status: "Open",
          ocid: r.ocid || "",
          cpv_codes: cpvCodes.join(","),
        });
      }
    } catch (err: any) {
      console.warn(`${SWEEP_LOG_PREFIX} CF keyword "${keyword}" failed:`, err.message);
    }
    await new Promise(r => setTimeout(r, 300)); // polite rate limiting
  }
  // Every request failed → the endpoint is down. Throw so the source is marked
  // failed (and retried/alerted) rather than masquerading as a quiet day.
  if (keywords.length > 0 && okResponses === 0) throw new Error("Contracts Finder: all requests failed");
  return results;
}

// ─── Find a Tender sweep ───────────────────────────────────────────────────
async function sweepFindATender(_keywords: string[]): Promise<SweepResult[]> {
  const now = new Date();
  const results: SweepResult[] = [];
  const seen = new Set<string>();

  // The FTS OCDS API has NO keyword search (the old queryString/stage/size params
  // are rejected with HTTP 400 "Request parameters unknown"), so `_keywords` can't
  // be pushed to the server. Instead it serves recently updated release packages
  // that we page through (cursor in links.next); the shared local relevance gate
  // (scoreAndFilter → evaluateRelevance, lane keywords + CPV + exclude + live-only)
  // does the filtering downstream — the single chokepoint every source funnels
  // through. We only window on updatedFrom (last 2 days — overlaps the daily sweep
  // so nothing is missed across runs) and cap the page count so a busy day can
  // never run the sweep unbounded.
  const fmt = (d: Date) => d.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS — API rejects ms/zone
  const updatedFrom = fmt(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000));
  let url: string | null =
    `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?updatedFrom=${encodeURIComponent(updatedFrom)}&limit=100`;

  const MAX_PAGES = 50;
  let page = 0;
  let okResponses = 0;
  while (url && page < MAX_PAGES) {
    page++;
    try {
      const res: Response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      // First page failing means the API is down/changed — surface it so health
      // can flag the source. A later page failing just truncates the run.
      if (!res.ok) {
        if (page === 1) throw new Error(`Find a Tender: HTTP ${res.status}`);
        break;
      }
      okResponses++;
      const data = await res.json() as any;
      const releases: any[] = Array.isArray(data?.releases) ? data.releases : [];
      for (const r of releases) {
        const tags: string[] = Array.isArray(r.tag) ? r.tag : [];
        // Open opportunities only — skip awards, planning, updates, cancellations,
        // frameworks, and any non-live stage.
        if (!tags.includes("tender")) continue;
        if (tags.includes("award") || tags.includes("planning")) continue;
        const tender = r.tender || {};
        const title = (tender.title || "").trim();
        if (!title || seen.has(title)) continue;
        const deadlineStr = tender.tenderPeriod?.endDate || "";
        if (!deadlineStr || new Date(deadlineStr) <= now) continue;
        seen.add(title);
        const buyer = r.buyer || {};
        const value = tender.value || {};
        const cpvCodes: string[] = [];
        for (const item of (tender.items || [])) {
          const c = item.classification?.id || item.additionalClassifications?.[0]?.id;
          if (c) cpvCodes.push(String(c));
        }
        const noticeId = r.id || "";
        results.push({
          title,
          description: (tender.description || "").slice(0, 400),
          buyer: buyer.name || "Not specified",
          value_amount: value.amount || null,
          value_currency: value.currency || "GBP",
          deadline: deadlineStr.split("T")[0],
          published: r.date ? r.date.split("T")[0] : "",
          source_url: noticeId ? `https://www.find-tender.service.gov.uk/Notice/${noticeId}` : "https://www.find-tender.service.gov.uk/",
          source: "Find a Tender",
          status: "Open",
          ocid: r.ocid || "",
          cpv_codes: cpvCodes.join(","),
        });
      }
      url = (typeof data?.links?.next === "string" && data.links.next) ? data.links.next : null;
    } catch (err: any) {
      if (page === 1) throw err;
      console.warn(`${SWEEP_LOG_PREFIX} FTS page ${page} failed:`, err.message);
      break;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  if (okResponses === 0) throw new Error("Find a Tender: all requests failed");
  return results;
}

// ─── TED EU sweep — CPV-filtered (Phase 2, Task 4) ─────────────────────────
// One CPV-filtered v3 query (not per-keyword) so TED doesn't flood the pipeline
// with EU noise. Dedup by TED publication number (carried as `ocid: ted:<pub>`).
// Throws on a hard API failure so the source-level retry/health can see it.
async function sweepTedEU(): Promise<SweepResult[]> {
  const sinceDate = `${new Date().getFullYear()}-01-01`;
  const notices = await fetchTedV3ByCpv(SEED_CPV_CODES, { limit: 100, sinceDate });
  const results: SweepResult[] = [];
  const seen = new Set<string>();
  for (const n of notices) {
    const key = (n.ocid && n.ocid.trim()) ? n.ocid.trim() : (n.title || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(n as SweepResult);
  }
  return results;
}

// ─── Monitored buyer sweep — direct buyer-specific search ─────────────────
async function sweepMonitoredBuyers(): Promise<SweepResult[]> {
  const results: SweepResult[] = [];
  const seen = new Set<string>();
  for (const buyer of MONITORED_BUYERS) {
    try {
      const tenders = await fetchContractsFinderByBuyer(buyer, 20);
      for (const t of tenders) {
        if (!t.title || seen.has(t.title)) continue;
        seen.add(t.title);
        results.push(t as SweepResult);
      }
    } catch {}
    await new Promise(r => setTimeout(r, 400));
  }
  return results;
}

// ─── Score + gate + deduplicate results ───────────────────────────────────
// Phase-1 relevance gate: keep a tender ONLY if its best-of-six-lanes score
// >= threshold AND it contains no exclude keyword. Keywords raise score; they
// can never bypass the gate. Returns kept items (with verdict) + sweep stats.
type KeptResult = SweepResult & {
  verdict: RelevanceVerdict;
  lotCount?: number;          // # of lots collapsed into this row (Fix 2); 1 = single
  collapsedTitle?: string;    // display title, e.g. "<base> (3 lots)" when lotCount > 1
};
interface ScanStats {
  raw: number;
  deduped: number;
  excluded: number;
  excludedByKeyword: number;
  excludedByAdvisory: number;
  excludedByGeography: number;
  excludedByDecor: number;
  excludedBySize: number;
  passedGate: number;
  staleDropped: number;
  tooSoon: number;
  exclusionLog: Array<{ title: string; reason: string | null }>;
}

// True if any of the tender's CPV codes matches a seed CPV (exact, or same
// 5-digit CPV group — CPV is hierarchical). Used as a recall signal in the gate.
function cpvMatches(cpvCsv?: string): boolean {
  if (!cpvCsv) return false;
  const codes = cpvCsv.split(",").map(s => s.trim()).filter(Boolean);
  return codes.some(tc => SEED_CPV_CODES.some(sc => tc === sc || tc.slice(0, 5) === sc.slice(0, 5)));
}

/** Minimum lead time: 30 days from today. Tenders closing sooner than this are
 * dropped at the gate so they never enter the bid workflow.
 * 30 days = qualification, evidence, compliance checks, bid writing, approvals. */
const MIN_LEAD_DAYS = 30;

export function scoreAndFilter(results: SweepResult[]): { kept: KeptResult[]; stats: ScanStats } {
  // key -> index into `kept` for lot-collapse merging (earliest deadline, lot count).
  const seen = new Map<string, number>();
  const kept: KeptResult[] = [];
  let deduped = 0;
  let excluded = 0;
  let excludedByKeyword = 0;
  let excludedByAdvisory = 0;
  let excludedByGeography = 0;
  let excludedByDecor = 0;
  let excludedBySize = 0;
  let staleDropped = 0;
  let tooSoon = 0;
  const exclusionLog: Array<{ title: string; reason: string | null }> = [];

  // LIVE-ONLY gate (product rule): the portal only ever holds live, open tenders.
  // Anything with no deadline, an unparseable deadline, a deadline that has
  // already passed, or less than MIN_LEAD_DAYS remaining is dropped here — the
  // single chokepoint every source funnels through.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const minLeadMs = todayMs + MIN_LEAD_DAYS * 24 * 60 * 60 * 1000;

  for (const r of results) {
    const dl = (r.deadline || "").trim();
    const dlMs = dl ? Date.parse(dl) : NaN;
    if (!dl || Number.isNaN(dlMs) || dlMs < todayMs) { staleDropped++; continue; }
    if (dlMs < minLeadMs) { tooSoon++; continue; } // < 30 days left = can't prepare

    // Dedup by OCID when present — same opportunity across sources/stages.
    // Multi-lot frameworks (Fix 2): strip "Lot N" suffix from title for dedup key
    // so all lots collapse to one line in the digest.
    // Same title + different buyer = kept separate (Fix 2 collision guard).
    const baseTitle = r.title.replace(LOT_SUFFIX_RE, "").trim();
    const isLot = baseTitle.toLowerCase() !== r.title.toLowerCase();
    const normalisedTitle = baseTitle.toLowerCase();
    const key = (r.ocid && r.ocid.trim())
      ? `ocid:${r.ocid.trim()}`
      : `title:${normalisedTitle}|buyer:${(r.buyer || "").toLowerCase().trim()}`;

    // Multi-lot collapse (Fix 2): a repeat key is not a silent drop — merge it into
    // the row already kept, counting lots and keeping the EARLIEST deadline.
    if (seen.has(key)) {
      deduped++;
      const idx = seen.get(key)!;
      const existing = kept[idx];
      if (existing) {
        existing.lotCount = (existing.lotCount || 1) + 1;
        const exMs = Date.parse((existing.deadline || "").trim());
        if (!Number.isNaN(dlMs) && (Number.isNaN(exMs) || dlMs < exMs)) existing.deadline = dl;
        existing.collapsedTitle = `${baseTitle} (${existing.lotCount} lots)`;
      }
      continue;
    }

    // Pass country through for geography screening (Fix 5).
    const verdict = evaluateRelevance({
      title: r.title,
      buyer: r.buyer,
      description: r.description,
      country: r.country || null,
      value_amount: r.value_amount ?? null,
    });

    if (verdict.excluded) {
      excluded++;
      if (verdict.sizeFlag === "over-sme-capacity") { excludedBySize++; }
      else if (verdict.geoFlag === "out-of-geography") { excludedByGeography++; }
      else if (verdict.exclusionReason === "advisory-no-delivery") { excludedByAdvisory++; }
      else if (verdict.exclusionReason === "decor-no-event") { excludedByDecor++; }
      else { excludedByKeyword++; }
      exclusionLog.push({ title: r.title, reason: verdict.exclusionReason });
      continue;   // hard reject regardless of score
    }
    // CPV is a strong procurement signal: a tender coded with a seed CPV is kept
    // even if its keyword score is just under threshold (recall). Exclude always wins.
    if (!verdict.passes && !cpvMatches(r.cpv_codes)) continue;
    seen.set(key, kept.length);
    kept.push({ ...r, verdict, lotCount: isLot ? 1 : undefined });
  }
  kept.sort((a, b) => b.verdict.score - a.verdict.score);
  return {
    kept,
    stats: {
      raw: results.length,
      deduped,
      excluded,
      excludedByKeyword,
      excludedByAdvisory,
      excludedByGeography,
      excludedByDecor,
      excludedBySize,
      passedGate: kept.length,
      staleDropped,
      tooSoon,
      exclusionLog,
    },
  };
}

// ─── Expiry pass — keep the portal live-only ───────────────────────────────
// Tenders whose deadline has passed are no longer live opportunities. We mark
// them 'Expired' (a non-destructive status change — rows are retained for
// history/reporting, never deleted) so they drop out of the default portal view
// and the digest. Terminal/manual outcomes are left untouched.
async function expireStaleTenders(): Promise<number> {
  try {
    const r = await db.execute(sql`
      UPDATE saas_tenders
      SET status = 'Expired', updated_at = NOW()
      WHERE deadline IS NOT NULL AND deadline <> ''
        AND deadline::date < CURRENT_DATE
        AND LOWER(status) NOT IN ('won','lost','expired','submitted','cancelled','withdrawn','closed','no bid','declined')
    `);
    const n = (r as any).rowCount || 0;
    if (n > 0) console.log(`${SWEEP_LOG_PREFIX} Expired ${n} past-deadline tender(s)`);
    return n;
  } catch (err: any) {
    console.warn(`${SWEEP_LOG_PREFIX} expireStaleTenders failed:`, err.message);
    return 0;
  }
}

// ─── Seed results to DB for all active orgs ───────────────────────────────
// Maps the six lanes onto the legacy ep/alli/pmo columns (kept, NOT dropped, per
// the brief): ep = best of events/design/merchandise, pmo = pmo, alli = best of
// development/charity. The winning lane label is stored in the additive `lane`
// column. All seeded tenders have already passed the relevance gate.
async function seedToAllOrgs(tenders: KeptResult[]): Promise<number> {
  if (tenders.length === 0) return 0;
  // Safe additive migrations — winning lane, OCID, and the full six-lane score map.
  await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS lane TEXT`).catch(() => {});
  await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS ocid TEXT`).catch(() => {});
  await db.execute(sql`ALTER TABLE saas_tenders ADD COLUMN IF NOT EXISTS lane_scores JSONB DEFAULT '{}'::jsonb`).catch(() => {});
  // Collapse any pre-existing OCID duplicates (keep the lowest id) so the composite
  // unique index can be created and the cross-run OCID upsert can rely on it.
  await db.execute(sql`
    DELETE FROM saas_tenders a USING saas_tenders b
    WHERE a.id > b.id AND a.org_id = b.org_id AND a.ocid = b.ocid
      AND a.ocid IS NOT NULL AND a.ocid != ''
  `).catch(() => {});
  // Composite (org_id, ocid) — NOT ocid alone; partial so many null-OCID rows are allowed.
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS ux_saas_tenders_org_ocid ON saas_tenders(org_id, ocid) WHERE ocid IS NOT NULL AND ocid != ''`).catch(() => {});

  const orgs = await db.execute(sql`SELECT DISTINCT org_id FROM saas_search_config`).catch(() => ({ rows: [] }));
  let inserted = 0;
  for (const org of orgs.rows as any[]) {
    const orgId = org.org_id;
    for (const t of tenders) {
      try {
        const ls = (k: string) => t.verdict.lanes.find(l => l.key === k)?.score || 0;
        // All six lane scores in one JSONB column (no longer overloading ep/alli/pmo).
        const laneScores = {
          events: ls("events"), design: ls("design"), merch: ls("merchandise"),
          pmo: ls("pmo"), development: ls("development"), charity: ls("charity"),
          education: ls("education"),
        };
        // Shared SET clause — updates only the new lane/ocid fields; legacy
        // ep/alli/pmo columns are kept but no longer written by the sweep.
        const setClause = sql`
          updated_at = NOW(),
          lane = EXCLUDED.lane,
          lane_scores = EXCLUDED.lane_scores,
          ocid = CASE WHEN EXCLUDED.ocid IS NOT NULL AND EXCLUDED.ocid != '' THEN EXCLUDED.ocid ELSE saas_tenders.ocid END,
          deadline = CASE WHEN EXCLUDED.deadline IS NOT NULL AND EXCLUDED.deadline != '' THEN EXCLUDED.deadline ELSE saas_tenders.deadline END,
          status = CASE WHEN saas_tenders.status IN ('Won','Lost','Cancelled','Withdrawn','Submitted') THEN saas_tenders.status ELSE EXCLUDED.status END`;
        // Dedup across sources/runs by OCID; fall back to title only for rows with no OCID.
        const conflict = (t.ocid && t.ocid.trim())
          ? sql`ON CONFLICT (org_id, ocid) WHERE ocid IS NOT NULL AND ocid != '' DO UPDATE SET ${setClause}`
          : sql`ON CONFLICT (org_id, title) DO UPDATE SET ${setClause}`;
        const result = await db.execute(sql`
          INSERT INTO saas_tenders (
            org_id, title, buyer, description, value_amount, value_text, value_currency,
            deadline, published, status, source, source_url, country, portal, lane, ocid, lane_scores,
            updated_at
          ) VALUES (
            ${orgId}, ${t.collapsedTitle || t.title}, ${t.buyer}, ${t.description || ""},
            ${t.value_amount || null},
            ${t.value_amount ? `£${Math.round(t.value_amount).toLocaleString()}` : ""},
            ${t.value_currency || "GBP"},
            ${t.deadline || null}, ${t.published || null},
            ${"Auto-Discovered"}, ${t.source}, ${t.source_url},
            ${t.country || "UK"}, ${"Daily Sweep"}, ${t.verdict.laneLabel || null}, ${t.ocid || null},
            ${JSON.stringify(laneScores)}::jsonb,
            NOW()
          )
          ${conflict}
        `);
        if ((result as any).rowCount > 0) inserted++;
      } catch {}
    }
  }
  return inserted;
}

// ─── T7: persist a per-sweep verification summary to saas_automation_log ────
async function logSweepSummary(stats: ScanStats, sources: string): Promise<string> {
  // Summary header (machine-parseable) + exclusion audit (human-readable)
  const header = `sources=[${sources}] raw=${stats.raw} passedGate=${stats.passedGate} excluded=${stats.excluded} excludedByKeyword=${stats.excludedByKeyword} excludedByAdvisory=${stats.excludedByAdvisory} excludedByGeography=${stats.excludedByGeography} excludedByDecor=${stats.excludedByDecor} excludedBySize=${stats.excludedBySize} staleDropped=${stats.staleDropped} tooSoon=${stats.tooSoon} deduped=${stats.deduped} threshold=${RELEVANCE_THRESHOLD}`;
  // Truncate exclusion log to 25 items (the patch brief's audit window) to keep row size sane.
  const audit = stats.exclusionLog.slice(0, 25).map(e => `${e.reason || "unknown"}: ${e.title.slice(0, 80)}`).join("\n");
  const full = audit ? `${header}\n\n— Exclusion audit (top 25) —\n${audit}` : header;
  const orgs = await db.execute(sql`SELECT DISTINCT org_id FROM saas_search_config`).catch(() => ({ rows: [] }));
  for (const org of orgs.rows as any[]) {
    await db.execute(sql`
      INSERT INTO saas_automation_log (org_id, entity, action, result, email_sent)
      VALUES (${org.org_id}, ${"GB"}, ${"sweep"}, ${full}, false)
    `).catch(() => {});
  }
  return header;
}

// ─── Nigeria sweep — converts NormalisedTender[] to SweepResult[] ──────────
const NG_SWEEP_KEYWORDS = ["event management", "conference", "Nigeria government", "capacity building", "training"];

async function sweepNigeria(): Promise<SweepResult[]> {
  try {
    const ngTenders = await fetchNigeriaTenders(NG_SWEEP_KEYWORDS);
    return ngTenders.map(t => ({
      title: t.title,
      description: t.description || "",
      buyer: t.buyer || "Nigeria Government",
      value_amount: t.value ?? null,
      value_currency: t.currency || "NGN",
      deadline: t.deadline || "",
      published: t.published_date || "",
      source_url: t.url || "",
      source: t.source_label || "NGTenders",
      status: t.status || "open",
      country: "NG",
      cpv_codes: Array.isArray(t.cpv_codes) ? t.cpv_codes.join(",") : "",
    }));
  } catch (err: any) {
    console.warn(`${SWEEP_LOG_PREFIX} Nigeria sweep failed:`, err.message);
    return [];
  }
}

// ─── Per-source retry with exponential backoff ─────────────────────────────
// Retries transient failures up to `attempts` times (500ms, 1s, 2s…). Re-throws
// the last error so the caller can mark the source failed and carry on.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (i < attempts - 1) {
        const backoff = 500 * Math.pow(2, i);
        console.warn(`${SWEEP_LOG_PREFIX} retry ${i + 1}/${attempts - 1} after ${backoff}ms:`, err.message);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }
  throw lastErr;
}

// Sources that are HTML scrapers — when they return 0 rows it usually means the
// page structure/selectors changed, not a genuinely quiet day, so we flag them
// degraded (Phase 2, Task 3) instead of treating the empty list as success.
const SCRAPER_SOURCES = new Set(["Nigeria"]);

// ─── Main sweep function ────────────────────────────────────────────────────
// Each source runs independently with its own retry; one source throwing never
// aborts the others. Per-source health is recorded and alerted (Task 1 + 2).
export async function runTenderSweep(opts?: { trigger?: string }): Promise<{ ok: boolean; found: number; saved: number; highScore: number; health: SweepHealth; error?: string }> {
  const startedAt = Date.now();
  console.log(`${SWEEP_LOG_PREFIX} Sweep starting (${opts?.trigger || "schedule"}) — ${new Date().toISOString()}`);

  const sourceDefs: { name: string; fn: () => Promise<SweepResult[]> }[] = [
    { name: "ContractsFinder", fn: () => sweepContractsFinder(EP_DISCOVERY_KEYWORDS) },
    { name: "FindATender",     fn: () => sweepFindATender(EP_DISCOVERY_KEYWORDS) },
    { name: "MonitoredBuyers", fn: () => sweepMonitoredBuyers() },
    { name: "TED",             fn: () => sweepTedEU() },
    { name: "Nigeria",         fn: () => sweepNigeria() },
  ];
  // Open-internet AI search — second discovery method, additive and opt-in
  // (TENDER_WEB_SEARCH_ENABLED). Verified candidates funnel through the SAME
  // scoreAndFilter (relevance + strategic anchor + exclude + live-only) and dedup
  // below, so nothing reaches the bid pipeline without passing the existing gate.
  if (webDiscoveryEnabled()) {
    sourceDefs.push({ name: "WebSearch", fn: () => sweepWebSearch() });
  }

  // Run all sources concurrently but isolate each: a thrown source becomes a
  // "failed" health entry; it never rejects the whole sweep.
  const settled = await Promise.all(sourceDefs.map(async def => {
    try {
      const res = await withRetry(def.fn, 3);
      return { def, res, err: null as any };
    } catch (err: any) {
      console.error(`${SWEEP_LOG_PREFIX} source ${def.name} failed after retries:`, err.message);
      return { def, res: [] as SweepResult[], err };
    }
  }));

  const allResults: SweepResult[] = [];
  const sources: SourceHealth[] = [];
  for (const { def, res, err } of settled) {
    let status: SourceStatus = "ok";
    if (err) status = "failed";
    else if (res.length === 0 && SCRAPER_SOURCES.has(def.name)) status = "degraded";
    sources.push({ name: def.name, status, count: res.length, error: err ? err.message : undefined });
    allResults.push(...res);
  }
  console.log(`${SWEEP_LOG_PREFIX} Raw per source: ${sources.map(s => `${s.name}=${s.count}${s.status !== "ok" ? `(${s.status})` : ""}`).join(", ")}`);

  let stats: ScanStats = { raw: 0, deduped: 0, excluded: 0, excludedByKeyword: 0, excludedByAdvisory: 0, excludedByGeography: 0, excludedByDecor: 0, excludedBySize: 0, passedGate: 0, staleDropped: 0, tooSoon: 0, exclusionLog: [] };
  let saved = 0;
  let kept: KeptResult[] = [];
  try {
    const scored = scoreAndFilter(allResults);
    kept = scored.kept;
    stats = scored.stats;
    const summary = await logSweepSummary(stats, sources.map(s => s.name).join(", "));
    console.log(`${SWEEP_LOG_PREFIX} ${summary}`);
    if (kept.length > 0) {
      const top = kept[0];
      console.log(`${SWEEP_LOG_PREFIX} Top: "${top.title}" (lane: ${top.verdict.laneLabel}, score: ${top.verdict.score}) from ${top.source}`);
    }
    saved = await seedToAllOrgs(kept);
    console.log(`${SWEEP_LOG_PREFIX} Saved ${saved} new/updated records across all orgs`);
  } catch (err: any) {
    console.error(`${SWEEP_LOG_PREFIX} Scoring/seeding failed:`, err.message);
  }

  // Retire any tender whose deadline has now passed — keeps the portal live-only.
  await expireStaleTenders();

  // Build + record health (writes saas_health_status per org and alerts if needed).
  const overall = computeOverall(sources, stats.raw);
  const health: SweepHealth = {
    at: new Date().toISOString(),
    overall,
    sources,
    totalQualifying: kept.length,
    rawTotal: stats.raw,
    durationMs: Date.now() - startedAt,
    trigger: opts?.trigger || "schedule",
  };
  await recordSweepHealth(health).catch(e => console.error(`${SWEEP_LOG_PREFIX} health record failed:`, e?.message));

  return {
    ok: overall !== "failed",
    found: stats.raw,
    saved,
    highScore: kept[0]?.verdict.score ?? 0,
    health,
  };
}

// ─── Boot catch-up — survives restarts (Phase 2, Task 1) ───────────────────
// A bare timer resets to "tomorrow" on every restart, so a deploy/crash at the
// wrong time silently skips a day. On boot we check the last sweep time; if it
// has been >24h (or never), we alert ops and run a catch-up sweep immediately.
async function bootCatchUp(): Promise<void> {
  try {
    const r = await db.execute(sql`SELECT MAX(timestamp) AS last FROM saas_automation_log WHERE action = 'sweep'`)
      .catch(() => ({ rows: [] as any[] }));
    const last = (r.rows?.[0] as any)?.last;
    const lastMs = last ? new Date(last).getTime() : 0;
    const hoursSince = lastMs ? (Date.now() - lastMs) / 3_600_000 : Infinity;
    if (hoursSince > 24) {
      console.log(`${SWEEP_LOG_PREFIX} Catch-up: last sweep ${isFinite(hoursSince) ? Math.round(hoursSince) + "h ago" : "never"} — running now`);
      await alertMissedSweep(hoursSince);
      await runTenderSweep({ trigger: "boot-catchup" });
    } else {
      console.log(`${SWEEP_LOG_PREFIX} Catch-up: last sweep ${Math.round(hoursSince)}h ago — within 24h, no catch-up needed`);
    }
  } catch (err: any) {
    console.error(`${SWEEP_LOG_PREFIX} Boot catch-up failed:`, err.message);
  }
}

// ─── Scheduler — runs at 07:00 UK time daily ───────────────────────────────
let sweeperStarted = false;

export function startTenderSweeper() {
  if (sweeperStarted) return;
  sweeperStarted = true;

  // Retire past-deadline tenders on boot so the portal is live-only immediately,
  // even on days when no catch-up sweep is due.
  void expireStaleTenders();

  // Catch up on any missed run first (don't block scheduling on it).
  void bootCatchUp();

  const scheduleNext = () => {
    const now = new Date();
    // Target 07:00 UK — approximate as UTC+0 in winter, UTC+1 in summer
    const ukOffset = isDaylightSaving(now) ? 1 : 0;
    const target = new Date(now);
    target.setUTCHours(7 - ukOffset, 0, 0, 0); // 07:00 UK = 06:00 UTC winter / 06:00 UTC summer
    if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
    const delay = target.getTime() - now.getTime();
    console.log(`${SWEEP_LOG_PREFIX} Next sweep scheduled at ${target.toISOString()} (in ${Math.round(delay / 60000)} min)`);
    setTimeout(() => {
      runTenderSweep().catch(e => console.error(`${SWEEP_LOG_PREFIX} Scheduled sweep error:`, e.message));
      scheduleNext(); // Re-schedule for the next day
    }, delay);
  };

  scheduleNext();
}

function isDaylightSaving(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) !== date.getTimezoneOffset();
}
