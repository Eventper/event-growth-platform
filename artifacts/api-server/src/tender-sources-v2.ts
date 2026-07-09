// Tender Discovery Sources v2 — fixed and new sources
// Replaces: UNGM (returns HTML), SAM.gov (no key), Devex (paywalled)
// Adds: TED EU (real API), bidstats.uk (award intelligence), gov.uk search

// ─── TED EU — Tenders Electronic Daily (Official EU procurement portal) ──────
// Re-enabled on the v3 Search API (Phase 2, Task 4). The v3 *search* endpoint is
// free and anonymous — an API key is only required to SUBMIT notices, not to
// search. Endpoint: POST {TED_API_BASE}/v3/notices/search with an expert query.
// Docs: https://docs.ted.europa.eu/api/latest/search.html
//
// We request a defensive superset of field names (TED field naming has shifted
// across eForms SDK versions) and parse multilingual values leniently. Every
// result is still run through the shared gate/exclude/6-lane scoring downstream,
// so imperfect field extraction can never let junk into the pipeline.
import { TED_API_BASE } from "./tender-discovery-config";

// Pull a usable string out of TED's mixed value shapes: plain string, array, or
// a multilingual map like { eng: "..." } / { "eng": ["..."] }.
function tedText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.length ? tedText(v[0]) : "";
  if (typeof v === "object") {
    const pref = v.eng ?? v.en ?? v.ENG ?? v.EN ?? Object.values(v)[0];
    return tedText(pref);
  }
  return "";
}

function tedFirst(n: any, keys: string[]): any {
  for (const k of keys) if (n[k] != null) return n[k];
  return null;
}

// TED dates arrive as "2027-01-15T..." or "2027-01-15+01:00" — take YYYY-MM-DD.
function tedDate(v: any): string {
  const s = tedText(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
}

// Core v3 search call. Throws on HTTP error so the caller's retry/health logic
// can mark the source failed; returns the raw notices array otherwise.
async function tedV3Search(expertQuery: string, limit: number): Promise<any[]> {
  const body = {
    query: expertQuery,
    // NOTE: every field name here must be a valid TED v3 field or the API 400s the
    // whole request. Verified against the live API — "title" is NOT valid (use
    // "notice-title"). Add new fields only after confirming a 200.
    fields: [
      "publication-number", "notice-title", "description-proc", "description-lot",
      "buyer-name", "organisation-name-buyer", "classification-cpv",
      "deadline-receipt-tender-date-lot", "deadline-receipt-request", "deadline",
      "publication-date", "links", "place-of-performance",
    ],
    page: 1,
    limit: Math.min(Math.max(limit, 1), 100),
    scope: "ACTIVE",
    paginationMode: "PAGE_NUMBER",
    checkQuerySyntax: false,
  };
  const res = await fetch(`${TED_API_BASE}/v3/notices/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "EventPerfekt/1.0" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`TED v3 HTTP ${res.status}`);
  const data = await res.json() as any;
  return data?.notices || data?.results || [];
}

// Map one TED v3 notice into the shared SweepResult-ish shape.
function mapTedNotice(n: any): any {
  const pub = tedText(tedFirst(n, ["publication-number"]));
  const title = tedText(tedFirst(n, ["notice-title", "title"])).trim().slice(0, 250);
  const buyer = tedText(tedFirst(n, ["buyer-name", "organisation-name-buyer"])) || "EU Contracting Authority";
  const deadline = tedDate(tedFirst(n, ["deadline-receipt-tender-date-lot", "deadline-receipt-request", "deadline"]));
  const published = tedDate(tedFirst(n, ["publication-date"]));
  const description = tedText(tedFirst(n, ["description-proc", "description-lot"])).slice(0, 400);
  const cpvRaw = tedFirst(n, ["classification-cpv"]);
  const cpvArr = Array.isArray(cpvRaw) ? cpvRaw.map((c: any) => tedText(c)).filter(Boolean) : (cpvRaw ? [tedText(cpvRaw)] : []);
  const linkVal = tedFirst(n, ["links"]);
  const link = tedText(linkVal && (linkVal.html ?? linkVal.pdf ?? linkVal.xml ?? linkVal));
  return {
    title,
    description,
    buyer,
    value_amount: null,
    value_currency: "EUR",
    deadline,
    published,
    source_url: link || (pub ? `https://ted.europa.eu/en/notice/-/detail/${pub}` : "https://ted.europa.eu/"),
    source: "TED (EU)",
    status: "Open",
    country: "EU",
    cpv_codes: cpvArr.join(","),
    // Dedup key: TED publication number (prefixed so it never collides with a
    // real OCDS ocid from UK sources).
    ocid: pub ? `ted:${pub}` : "",
  };
}

// CPV-filtered TED fetch — the primary sweep path. Filtering by CPV in the query
// keeps TED from flooding the pipeline with EU noise.
export async function fetchTedV3ByCpv(cpvCodes: string[], opts?: { limit?: number; sinceDate?: string }): Promise<any[]> {
  const cpv = cpvCodes.slice(0, 40).map(c => c.trim()).filter(Boolean).join(" ");
  if (!cpv) return [];
  let query = `classification-cpv IN (${cpv})`;
  if (opts?.sinceDate) {
    const since = opts.sinceDate.replace(/-/g, "");   // YYYY-MM-DD → YYYYMMDD
    if (/^\d{8}$/.test(since)) query += ` AND publication-date>=${since}`;
  }
  const notices = await tedV3Search(query, opts?.limit ?? 100);
  const now = new Date();
  return notices
    .map(mapTedNotice)
    .filter((t: any) => t.title && (!t.deadline || new Date(t.deadline) > now));
}

// Free-text TED search — kept for the existing manual-search caller. Routed to v3
// so it is no longer dead (the old v2 endpoint returned 404). Soft-fails to [].
export async function fetchTedEU(keyword: string, limit = 20): Promise<any[]> {
  try {
    const safe = keyword.replace(/["()]/g, " ").trim();
    if (!safe) return [];
    const notices = await tedV3Search(`FT~"${safe}"`, limit);
    const now = new Date();
    return notices
      .map(mapTedNotice)
      // Require a real future deadline — live opportunities only (matches the
      // portal's live-only rule; no-deadline notices are dropped at source).
      .filter((t: any) => t.title && t.deadline && new Date(t.deadline) > now);
  } catch (err: any) {
    console.warn(`[TED EU] fetch failed for "${keyword}":`, err.message);
    return [];
  }
}

// ─── bidstats.uk — UK contract award intelligence ─────────────────────────────
// Returns awarded contracts — useful for win intelligence, not live opportunities
// Awards are marked explicitly so the frontend can display them as "Award Notice"
export async function fetchBidStats(keyword: string, limit = 15): Promise<any[]> {
  try {
    const url = `https://bidstats.uk/tenders?q=${encodeURIComponent(keyword)}&status=awarded`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: any[] = [];
    // Extract tender rows — bidstats renders a table with rows
    const rows = html.split(/<tr[^>]*>/).slice(1);
    for (const row of rows.slice(0, limit)) {
      const titleMatch = row.match(/<a[^>]+href="([^"]*)"[^>]*>([^<]+)<\/a>/);
      const cells = row.match(/<td[^>]*>([^<]*)<\/td>/g) || [];
      const cellTexts = cells.map((c: string) => c.replace(/<[^>]*>/g, "").trim()).filter(Boolean);
      if (!titleMatch && cellTexts.length < 2) continue;
      const title = titleMatch ? titleMatch[2].trim() : (cellTexts[0] || "");
      const href = titleMatch ? titleMatch[1] : "";
      if (!title || title.length < 10) continue;
      const buyer = cellTexts[1] || cellTexts[2] || "UK Public Body";
      const valueStr = cellTexts.find((c: string) => c.includes("£") || c.includes(",000")) || "";
      const value = valueStr ? parseFloat(valueStr.replace(/[^0-9.]/g, "")) || null : null;
      const dateStr = cellTexts.find((c: string) => /\d{4}/.test(c) && (c.includes("/") || c.includes("-"))) || "";
      results.push({
        title: title.slice(0, 250),
        description: `Award notice — ${buyer}. Use for competitor intelligence and market pricing.`,
        buyer,
        value_amount: value,
        value_currency: "GBP",
        deadline: "",
        published: dateStr,
        source_url: href ? (href.startsWith("http") ? href : `https://bidstats.uk${href}`) : "https://bidstats.uk",
        source: "bidstats.uk",
        status: "awarded",
      });
    }
    return results;
  } catch (err: any) {
    console.warn(`[bidstats.uk] fetch failed for "${keyword}":`, err.message);
    return [];
  }
}

// ─── Contracts Finder — buyer-specific search ────────────────────────────────
// Search Contracts Finder filtering by a specific buyer name
// Used to monitor FCDO, DEFRA, CEFAS etc.
export async function fetchContractsFinderByBuyer(buyerName: string, limit = 25): Promise<any[]> {
  try {
    const now = new Date();
    const url = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?queryString=${encodeURIComponent(buyerName)}&stage=tender&output=json&publishedFrom=${now.getFullYear() - 1}-01-01&size=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const closedStatuses = ["closed", "cancelled", "complete", "awarded", "unsuccessful", "withdrawn"];
    return (data?.releases || [])
      .filter((r: any) => {
        const status = (r.tender?.status || "").toLowerCase();
        return !closedStatuses.includes(status);
      })
      .map((r: any) => {
        const tender = r.tender || {};
        const buyer = r.buyer || {};
        const value = tender.value || tender.minValue || {};
        const idParts = (r.id || "").split("-");
        const guid = idParts.length >= 5 ? idParts.slice(0, 5).join("-") : r.id || "";
        return {
          title: (tender.title || "").trim(),
          description: (tender.description || "").slice(0, 300),
          buyer: buyer.name || buyerName,
          value_amount: value.amount || null,
          value_currency: value.currency || "GBP",
          deadline: tender.tenderPeriod?.endDate ? tender.tenderPeriod.endDate.split("T")[0] : "",
          published: r.date ? r.date.split("T")[0] : "",
          source_url: guid
            ? `https://www.contractsfinder.service.gov.uk/Notice/${guid}`
            : `https://www.contractsfinder.service.gov.uk/Search?&keywords=${encodeURIComponent((tender.title || "").trim())}`,
          source: "Contracts Finder",
          status: "Open",
        };
      })
      .filter((t: any) => t.title && t.deadline && new Date(t.deadline) > now);
  } catch (err: any) {
    console.warn(`[CF buyer search] failed for "${buyerName}":`, err.message);
    return [];
  }
}

// ─── Monitored buyers for FCDO-aligned sweep ─────────────────────────────────
// These are the buyers whose tender pages we monitor daily
export const MONITORED_BUYERS = [
  "Foreign, Commonwealth & Development Office",
  "FCDO",
  "Department for Environment, Food & Rural Affairs",
  "DEFRA",
  "Centre for Environment, Fisheries and Aquaculture Science",
  "CEFAS",
  "Crown Commercial Service",
  "British Council",
  "UK Health Security Agency",
  "Cabinet Office",
  "Department for Culture, Media and Sport",
  "DCMS",
];

// ─── EP-curated discovery keywords ───────────────────────────────────────────
// Tightly scoped toward EP's actual delivery capability and FCDO/DEFRA pipeline
// Avoids generic "event management" that pulls irrelevant construction/lab/IT results
export const EP_DISCOVERY_KEYWORDS = [
  // High-value FCDO/government event frameworks
  "event production framework",
  "event production services government",
  "FCDO event management",
  "FCDO stakeholder engagement",
  "FCDO programme delivery",
  "FCDO conference management",
  "FCDO Africa programme",
  "government event management framework",
  "UK government conference services",
  "ministerial conference management",
  // Programme delivery & support
  "programme delivery Africa",
  "stakeholder engagement programme",
  "capacity building events Africa",
  "international programme delivery",
  "overseas programme management",
  // Specific buyers targeted
  "DEFRA event management",
  "DEFRA programme delivery",
  "CEFAS Africa",
  "British Council events",
  "Crown Commercial Service events",
  // EP service areas
  "corporate event management UK",
  "conference management services",
  "delegate management",
  "award ceremony management",
  "summit management",
  // Africa / remittance pipeline
  "Africa regional support",
  "Africa conference management",
  "international development events",
  "remittance programme",
  "cross-border payments programme",
  "financial inclusion events Africa",
];
