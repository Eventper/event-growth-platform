// Nigeria / Africa tender sources — normalised to NormalisedTender shape so they
// can merge into the unified finder pipeline alongside Contracts Finder / FTS.

import type { NormalisedTender, FinderStatus } from "./tender-finder-service";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function toStatus(rawStatus: string | null, deadline: string | null): FinderStatus {
  if (rawStatus) {
    const s = rawStatus.toLowerCase();
    if (s.includes("award")) return "awarded";
    if (s.includes("cancel") || s.includes("withdraw")) return "cancelled";
    if (s.includes("plan")) return "planned";
    if (s.includes("close") || s.includes("complete")) return "closed";
  }
  if (deadline) {
    const d = new Date(deadline);
    if (!isNaN(d.getTime()) && d.getTime() < Date.now()) return "closed";
  }
  return "open";
}

async function scrapeNgTenders(term: string, seen: Set<string>): Promise<NormalisedTender[]> {
  const out: NormalisedTender[] = [];
  try {
    const res = await fetch(`https://www.ngtenders.com/?s=${encodeURIComponent(term)}`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return out;
    const html = await res.text();
    const articles = html.split("<article").slice(1);
    for (const article of articles.slice(0, 15)) {
      const titleMatch = article.match(/class="entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]+)/);
      const dateMatch = article.match(/class="entry-date[^"]*"[^>]*datetime="([^"]*)"/);
      const excerptMatch = article.match(/class="entry-(?:summary|content|excerpt)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/);
      if (!titleMatch) continue;
      const url = titleMatch[1] || "";
      const title = (titleMatch[2] || "").trim();
      if (!title || seen.has(title)) continue;
      seen.add(title);
      const publishDate = dateMatch ? (dateMatch[1] || "").split("T")[0] : null;
      const excerpt = (excerptMatch?.[1] || "").replace(/<[^>]+>/g, "").trim().slice(0, 500);
      out.push({
        id: `ng-${Buffer.from(url || title).toString("base64").slice(0, 24)}`,
        title,
        description: excerpt,
        buyer: "Nigeria Government",
        value: null,
        value_estimated: false,
        currency: "NGN",
        published_date: publishDate,
        deadline: null,
        status: "open",
        source: "CF",
        source_label: "NGTenders",
        region: "Nigeria",
        category: null,
        url,
        cpv_codes: [],
        procedure_type: null,
        sme_suitable: null,
        winner: null,
        award_date: null,
        award_value: null,
        duration_months: null,
        match_score: 0,
        match_tier: "low",
      });
    }
  } catch {}
  return out;
}

async function scrapeWorldBankNg(term: string, seen: Set<string>): Promise<NormalisedTender[]> {
  const out: NormalisedTender[] = [];
  try {
    const url = `https://search.worldbank.org/api/v2/procnotices?format=json&qterm=${encodeURIComponent(term)}&countryname_exact=Nigeria&rows=20`;
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return out;
    const data = await res.json() as any;
    const items = data?.procnotices || data?.documents || data?.rows || [];
    for (const item of Array.isArray(items) ? items.slice(0, 20) : []) {
      const title = item.project_name || item.notice_name || item.title || "";
      if (!title || seen.has(title)) continue;
      seen.add(title);
      const deadline = item.submission_deadline_date || item.deadline_date || null;
      const wbUrl = item.url || item.notice_url || `https://projects.worldbank.org/en/projects-operations/procurement-detail/${item.id || ""}`;
      out.push({
        id: `wb-${item.id || Buffer.from(title).toString("base64").slice(0, 16)}`,
        title,
        description: (item.notice_description || item.description || "").slice(0, 500),
        buyer: item.project_ctry_name || "World Bank / Nigeria",
        value: null,
        value_estimated: false,
        currency: "USD",
        published_date: item.noticedate ? String(item.noticedate).split("T")[0] : null,
        deadline: deadline ? String(deadline).split("T")[0] : null,
        status: toStatus(item.notice_status, deadline),
        source: "CF",
        source_label: "World Bank",
        region: "Nigeria",
        category: item.procurement_category || null,
        url: wbUrl,
        cpv_codes: [],
        procedure_type: item.procurement_method || null,
        sme_suitable: null,
        winner: null,
        award_date: null,
        award_value: null,
        duration_months: null,
        match_score: 0,
        match_tier: "low",
      });
    }
  } catch {}
  return out;
}

async function scrapeAfdbNg(term: string, seen: Set<string>): Promise<NormalisedTender[]> {
  const out: NormalisedTender[] = [];
  try {
    const url = `https://www.afdb.org/en/search?search_api_fulltext=${encodeURIComponent(term + " Nigeria")}&field_bundle=procurement_notice`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return out;
    const html = await res.text();
    const rows = html.split('class="views-row"').slice(1);
    for (const row of rows.slice(0, 10)) {
      const titleMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/);
      if (!titleMatch) continue;
      const href = titleMatch[1] || "";
      const title = (titleMatch[2] || "").trim();
      if (!title || seen.has(title)) continue;
      if (!/nigeria/i.test(title) && !/nigeria/i.test(row)) continue;
      seen.add(title);
      const fullUrl = href.startsWith("http") ? href : `https://www.afdb.org${href}`;
      out.push({
        id: `afdb-${Buffer.from(fullUrl).toString("base64").slice(0, 24)}`,
        title,
        description: "",
        buyer: "African Development Bank",
        value: null,
        value_estimated: false,
        currency: "USD",
        published_date: null,
        deadline: null,
        status: "open",
        source: "CF",
        source_label: "AfDB",
        region: "Nigeria",
        category: null,
        url: fullUrl,
        cpv_codes: [],
        procedure_type: null,
        sme_suitable: null,
        winner: null,
        award_date: null,
        award_value: null,
        duration_months: null,
        match_score: 0,
        match_tier: "low",
      });
    }
  } catch {}
  return out;
}

export async function fetchNigeriaTenders(keywords: string[]): Promise<NormalisedTender[]> {
  const terms = keywords.map(k => k.trim()).filter(Boolean).slice(0, 4);
  if (terms.length === 0) terms.push("Nigeria");
  const seen = new Set<string>();
  const all: NormalisedTender[] = [];

  const tasks: Array<Promise<NormalisedTender[]>> = [];
  for (const t of terms) {
    tasks.push(scrapeNgTenders(t, seen));
    tasks.push(scrapeWorldBankNg(t, seen));
    tasks.push(scrapeAfdbNg(t, seen));
  }

  const settled = await Promise.allSettled(tasks);
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  return all;
}
