// ─── Open-Internet AI Tender Discovery (additive Phase-1 module) ─────────────
//
// A SECOND discovery method alongside the structured API sources in
// tender-sweeper.ts. It uses OpenRouter's web plugin (live internet search +
// citations — no new API key, reuses OPENROUTER_API_KEY) to find live tender
// opportunities anywhere on the web, not just known procurement portals.
//
// SAFETY (per the brief): open-web results must NEVER go straight into the
// bid-writing engine. This module only PROPOSES candidates and runs a
// verification pass; everything it returns is a plain SweepResult that then
// flows through the sweeper's existing chokepoint — scoreAndFilter
// (evaluateRelevance + strategic anchor + exclude + live-only gate) and dedup —
// before seedToAllOrgs writes it as a normal "Auto-Discovered" tender for human
// review. No tender is auto-submitted anywhere.
//
// OFF BY DEFAULT: returns [] unless TENDER_WEB_SEARCH_ENABLED === "true", so
// wiring it into the daily sweep is a no-op until the user opts in.

import { callOpenRouter, MODELS } from "./ai-shared";
import type { SweepResult } from "./tender-sweeper";

const LOG = "[TenderWebDiscovery]";

export function webDiscoveryEnabled(): boolean {
  return process.env.TENDER_WEB_SEARCH_ENABLED === "true";
}

// Service lanes EventPerfekt bids on — drives the AI search and synonym expansion.
const EP_SERVICE_AREAS = [
  "event management", "conference management", "stakeholder engagement",
  "community engagement", "PMO / programme management", "creative design",
  "branding", "merchandise", "exhibition services", "international development",
  "Africa programme delivery", "public sector / government event services",
];

interface WebCandidate {
  title?: string;
  buyer?: string;
  url?: string;
  deadline?: string;     // ISO or free text
  value?: string;
  summary?: string;
  source?: string;
}

// ─── 1. Search the open web via the LLM + web plugin ─────────────────────────
async function searchWeb(): Promise<WebCandidate[]> {
  const system =
    "You are a procurement researcher for EventPerfekt, a UK company delivering event " +
    "management, conference management, stakeholder & community engagement, PMO/programme " +
    "management, creative/design/branding/merchandise/exhibition services, and international " +
    "development / Africa programme delivery for the public sector, government, local authorities, " +
    "universities, NHS, charities, donors and NGOs. Use live web search. Intelligently expand " +
    "queries with synonyms (e.g. 'public engagement', 'consultation services', 'events framework'). " +
    "Only return live, bid-ready opportunities that are CURRENTLY OPEN with a real notice URL. " +
    "REMOVE: frameworks (unless they are a live call-off/ITT/mini-competition with a deadline), " +
    "awards, contract results, planning notices (PIN), prior information, closed notices, expired tenders. " +
    "Minimum deadline must be at least 30 days from today so there is time to prepare a competitive bid. " +
    "Preferred lead time: 2 to 6 months. Remove duplicate notices.";
  const user =
    `Search the internet for live UK and international tender opportunities suitable for EventPerfekt, ` +
    `across these service areas: ${EP_SERVICE_AREAS.join(", ")}. ` +
    `Return ONLY a JSON object of the form ` +
    `{"opportunities":[{"title":"","buyer":"","url":"","deadline":"YYYY-MM-DD","value":"","summary":"","source":""}]}. ` +
    `Use the real source URL for each. Omit anything you cannot find a genuine link for.`;

  let parsed: WebCandidate[] = [];
  let citations: Array<{ title?: string; url?: string }> = [];
  try {
    const res = await callOpenRouter(
      MODELS.drafting,
      [{ role: "system", content: system }, { role: "user", content: user }],
      { webSearch: true, webMaxResults: 10, jsonMode: true, maxTokens: 2000, temperature: 0.4 },
    );
    citations = res.sources || [];
    try {
      const obj = JSON.parse(res.content || "{}");
      if (Array.isArray(obj?.opportunities)) parsed = obj.opportunities;
      else if (Array.isArray(obj)) parsed = obj;
    } catch {
      console.warn(`${LOG} model did not return parseable JSON; falling back to citations only`);
    }
  } catch (err: any) {
    console.error(`${LOG} web search failed:`, err?.message);
    return [];
  }

  // Backfill any model candidate missing a URL from the citation list, and add
  // citation-only leads the model mentioned but didn't structure.
  const byUrl = new Map<string, WebCandidate>();
  for (const c of parsed) {
    const url = (c.url || "").trim();
    if (url) byUrl.set(url, c);
  }
  for (const cite of citations) {
    const url = (cite.url || "").trim();
    if (url && !byUrl.has(url)) byUrl.set(url, { title: cite.title, url, source: "Web Search" });
  }
  return [...byUrl.values()];
}

// ─── 2. Verification pass ────────────────────────────────────────────────────
// Confirms the link is genuine and the opportunity is still open. Relevance,
// buyer-fit and the strategic gate are verified downstream by scoreAndFilter, so
// here we only do what that gate cannot: prove the URL resolves and the deadline
// is in the future. Anything that fails verification is discarded (per brief).
function parseDeadline(raw?: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

// Conservative dead-page markers for SOFT-404s: some portals (e.g. Find a Tender,
// Contracts Finder) return HTTP 200 with a "not found" body even when the notice
// doesn't exist, so a status check alone isn't enough. Kept strong/specific to
// avoid discarding genuine notices.
const DEAD_PAGE_MARKERS = [
  "page not found", "could not be found", "page cannot be found",
  "no longer available", "notice has been removed", "this page doesn’t exist",
  "this page doesn't exist", "opportunity is no longer available",
];

async function linkIsGenuine(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "EventPerfekt-TenderFinder/1.0", Accept: "text/html,application/json" },
      signal: AbortSignal.timeout(12000),
    });
    // 404/410 == the notice is gone. 5xx == can't confirm → discard.
    if (res.status === 404 || res.status === 410 || res.status >= 500) return false;
    // 401/403 == bot-blocked but the page exists, so we accept it (a human can open it).
    if (res.status === 401 || res.status === 403) return true;
    // Otherwise scan a slice of the body for soft-404 markers.
    let body = "";
    try { body = (await res.text()).slice(0, 8000).toLowerCase(); } catch { return true; }
    if (DEAD_PAGE_MARKERS.some(m => body.includes(m))) return false;
    return true;
  } catch {
    // Network failure / timeout — cannot prove it's genuine, so discard.
    return false;
  }
}

async function verify(c: WebCandidate): Promise<SweepResult | null> {
  const url = (c.url || "").trim();
  const title = (c.title || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;     // need a real link
  if (!title) return null;                                  // need a title
  const deadline = parseDeadline(c.deadline);
  if (!deadline) return null;                               // need a valid deadline…
  if (new Date(deadline) <= new Date()) return null;        // …that hasn't passed
  if (!(await linkIsGenuine(url))) return null;             // link must resolve

  // Fold any free-text value into the description (SweepResult carries a numeric
  // value_amount only; the open web rarely gives a clean number).
  const desc = [c.value ? `Estimated value: ${c.value}.` : "", c.summary || ""].join(" ").trim();
  return {
    title,
    description: desc.slice(0, 400),
    buyer: (c.buyer || "").trim() || "Not specified",
    value_amount: null,
    value_currency: "GBP",
    deadline,
    published: "",
    source_url: url,
    source: `Web Search${c.source ? ` — ${c.source}` : ""}`,
    status: "Open",
    ocid: "",            // no OCID from the open web → dedup falls back to title
    cpv_codes: "",
  };
}

// ─── 3. Public entry point — returns VERIFIED SweepResults for the sweeper ────
// Shaped exactly like the structured sources so the caller can drop it into the
// same scoreAndFilter → dedup → seedToAllOrgs chain. Never throws.
export async function sweepWebSearch(): Promise<SweepResult[]> {
  if (!webDiscoveryEnabled()) return [];
  const started = Date.now();
  const candidates = await searchWeb();
  console.log(`${LOG} ${candidates.length} raw web candidate(s)`);
  const verified: SweepResult[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const r = await verify(c).catch(() => null);
    if (!r) continue;
    const key = (r.source_url || r.title).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    verified.push(r);
  }
  console.log(`${LOG} ${verified.length} verified in ${Math.round((Date.now() - started) / 1000)}s`);
  return verified;
}
