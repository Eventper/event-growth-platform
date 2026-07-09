// Contracts Finder — Official PublicSearch endpoint wrapper
// GET /Published/Notices/PublicSearch/Search
// Params: Keyword, NoticeType (1=notice, 2=award), PostedFrom, PostedTo,
//         RegionCodes (multi), CPVCodes (multi), BuyerName, Page, PageSize

const CF_BASE = "https://www.contractsfinder.service.gov.uk/Published/Notices";
const CF_HEADERS = {
  Accept: "application/json",
  "User-Agent": "EventPerfekt-TenderFinder/1.0",
};

export type CfSearchOptions = {
  keyword?:       string;
  noticeType?:    1 | 2;        // 1 = contract notice, 2 = award notice
  postedFrom?:    string;       // YYYY-MM-DD
  postedTo?:      string;       // YYYY-MM-DD
  regionCodes?:   string[];     // e.g. ["UKI", "UKJ"]
  cpvCodes?:      string[];     // e.g. ["79952000"]
  buyerName?:     string;
  page?:          number;
  pageSize?:      number;
};

function buildPublicSearchUrl(opts: CfSearchOptions): string {
  const p = new URLSearchParams();
  if (opts.keyword)    p.set("Keyword",    opts.keyword);
  if (opts.noticeType) p.set("NoticeType", String(opts.noticeType));
  if (opts.postedFrom) p.set("PostedFrom", opts.postedFrom);
  if (opts.postedTo)   p.set("PostedTo",   opts.postedTo);
  if (opts.regionCodes?.length) {
    for (const r of opts.regionCodes) p.append("RegionCodes", r);
  }
  if (opts.cpvCodes?.length) {
    for (const c of opts.cpvCodes) p.append("CPVCodes", c);
  }
  if (opts.buyerName)  p.set("BuyerName",  opts.buyerName);
  p.set("Page",     String(opts.page     || 1));
  p.set("PageSize", String(opts.pageSize || 100));
  return `${CF_BASE}/PublicSearch/Search?${p.toString()}`;
}

function buildOcdsUrl(keyword: string, stage: "tender" | "award", postedFrom?: string, postedTo?: string, pageSize = 100): string {
  const p = new URLSearchParams();
  p.set("queryString", keyword || "");
  p.set("stage", stage);
  p.set("output", "json");
  p.set("size", String(pageSize));
  if (postedFrom) p.set("publishedFrom", postedFrom);
  if (postedTo)   p.set("publishedTo",   postedTo);
  return `${CF_BASE}/OCDS/Search?${p.toString()}`;
}

function parseRelease(release: any, isAward: boolean): any | null {
  const tender = release.tender || {};
  const buyer  = release.buyer  || {};
  const value  = tender.value   || {};
  const awards = Array.isArray(release.awards) ? release.awards : [];
  const award  = awards[0] || null;

  const title = tender.title || release.title || "";
  if (!title) return null;

  const idParts  = (release.id || release.ocid || "").split("-");
  const guid     = idParts.length >= 5 ? idParts.slice(0, 5).join("-") : (release.id || "");
  const sourceUrl = guid
    ? `https://www.contractsfinder.service.gov.uk/Notice/${guid}`
    : `https://www.contractsfinder.service.gov.uk/Search?Keywords=${encodeURIComponent(title)}`;

  const deadline     = tender.tenderPeriod?.endDate || null;
  const deadlineDate = deadline ? new Date(deadline) : null;
  const now          = new Date();
  const daysLeft     = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / 86_400_000) : null;

  const rawStatus = (tender.status || "").toLowerCase();
  let status: string;
  if (isAward || award) status = "awarded";
  else if (rawStatus === "cancelled" || rawStatus === "withdrawn") status = "cancelled";
  else if (rawStatus === "complete" || (deadlineDate && deadlineDate < now)) status = "closed";
  else status = "open";

  const cpvCodes: string[] = [];
  for (const item of (tender.items || [])) {
    const c = item.classification?.id || item.additionalClassifications?.[0]?.id;
    if (c) cpvCodes.push(String(c));
  }

  return {
    id:             `cf-${guid || title}`,
    source:         "Contracts Finder",
    title,
    description:    (tender.description || "").slice(0, 800),
    buyer:          buyer.name || "Not specified",
    country:        "UK",
    status,
    deadline,
    daysLeft,
    budget:         award?.value?.amount ?? value.amount ?? null,
    currency:       value.currency || award?.value?.currency || "GBP",
    location:       tender.items?.[0]?.deliveryAddresses?.[0]?.region || "",
    source_url:     sourceUrl,
    published_date: release.date ? release.date.split("T")[0] : "",
    cpv_codes:      cpvCodes,
    winner:         award?.suppliers?.[0]?.name ?? null,
    award_date:     award?.date ? award.date.split("T")[0] : null,
    sme_suitable:   tender.suitability?.sme ?? null,
    procedure:      tender.procurementMethodDetails || tender.procurementMethod || null,
  };
}

function parseFlatNotice(n: any, isAward: boolean): any | null {
  const title = n.Title || n.title || n.name || "";
  if (!title) return null;

  const guid      = n.ID || n.id || n.NoticeIdentifier || "";
  const sourceUrl = guid
    ? `https://www.contractsfinder.service.gov.uk/Notice/${guid}`
    : `https://www.contractsfinder.service.gov.uk/Search?Keywords=${encodeURIComponent(title)}`;

  const deadline     = n.ClosingDate || n.closingDate || null;
  const deadlineDate = deadline ? new Date(deadline) : null;
  const now          = new Date();
  const daysLeft     = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / 86_400_000) : null;

  const status = isAward || n.AwardedTo ? "awarded"
    : (deadlineDate && deadlineDate < now) ? "closed"
    : "open";

  const rawVal = n.Value || n.value || n.ContractValue;
  const budget = typeof rawVal === "number" ? rawVal
    : typeof rawVal?.Amount === "number" ? rawVal.Amount
    : typeof rawVal?.amount === "number" ? rawVal.amount
    : null;

  const cpvRaw = n.CPVCodes || n.cpvCodes || [];
  const cpvCodes = Array.isArray(cpvRaw)
    ? cpvRaw.map((c: any) => String(c?.Code || c?.code || c).trim()).filter(Boolean)
    : [];

  return {
    id:             `cf-${guid || title}`,
    source:         "Contracts Finder",
    title,
    description:    (n.Description || n.description || n.Summary || "").slice(0, 800),
    buyer:          n.BuyerName || n.buyerName || n.Buyer?.Name || "Not specified",
    country:        "UK",
    status,
    deadline,
    daysLeft,
    budget,
    currency:       n.Currency || n.currency || "GBP",
    location:       n.Region || n.region || "",
    source_url:     sourceUrl,
    published_date: (n.PublishedDate || n.publishedDate || "").split("T")[0] || "",
    cpv_codes:      cpvCodes,
    winner:         n.AwardedTo || n.awardedTo || null,
    award_date:     n.AwardDate ? n.AwardDate.split("T")[0] : null,
    sme_suitable:   n.SmeSuitable ?? n.smeSuitable ?? null,
    procedure:      n.ProcedureType || n.procedureType || null,
  };
}

async function fetchPublicSearch(opts: CfSearchOptions, isAward: boolean): Promise<any[]> {
  const url = buildPublicSearchUrl(opts);
  const res = await fetch(url, { headers: CF_HEADERS, signal: AbortSignal.timeout(20000) });
  if (!res.ok) return [];
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return [];
  const data = await res.json() as any;

  // OCDS envelope
  if (Array.isArray(data?.releases) && data.releases.length > 0) {
    return data.releases.map((r: any) => parseRelease(r, isAward)).filter(Boolean);
  }
  // Flat envelopes
  const flat = data?.results || data?.Results || (Array.isArray(data) ? data : []);
  if (flat.length > 0) {
    return flat.map((n: any) => parseFlatNotice(n, isAward)).filter(Boolean);
  }
  return [];
}

async function fetchOcds(keyword: string, stage: "tender" | "award", postedFrom?: string, postedTo?: string): Promise<any[]> {
  const url = buildOcdsUrl(keyword, stage, postedFrom, postedTo);
  const res = await fetch(url, { headers: CF_HEADERS, signal: AbortSignal.timeout(20000) });
  if (!res.ok) return [];
  const data = await res.json() as any;
  const releases: any[] = data?.releases || [];
  return releases.map((r: any) => parseRelease(r, stage === "award")).filter(Boolean);
}

/**
 * Primary search function — uses PublicSearch with correct params, falls back to OCDS.
 */
export async function searchContractsFinder(
  keyword: string,
  pageNumber = 1,
  pageSize  = 100,
  status?:  string,
  opts: Partial<CfSearchOptions> = {}
): Promise<any[]> {
  const isAwardStatus = status === "awarded" || status === "award";
  const noticeTypes: Array<{ noticeType: 1 | 2; isAward: boolean }> = isAwardStatus
    ? [{ noticeType: 2, isAward: true }]
    : [{ noticeType: 1, isAward: false }, { noticeType: 2, isAward: true }];

  const results: any[] = [];

  for (const nt of noticeTypes) {
    let fetched = await fetchPublicSearch({
      keyword,
      noticeType:  nt.noticeType,
      page:        pageNumber,
      pageSize,
      postedFrom:  opts.postedFrom,
      postedTo:    opts.postedTo,
      regionCodes: opts.regionCodes,
      cpvCodes:    opts.cpvCodes,
      buyerName:   opts.buyerName,
    }, nt.isAward).catch(() => []);

    // OCDS fallback if PublicSearch returned nothing
    if (fetched.length === 0) {
      fetched = await fetchOcds(keyword, nt.isAward ? "award" : "tender", opts.postedFrom, opts.postedTo).catch(() => []);
    }

    results.push(...fetched);
  }

  // Filter by status client-side if a specific status was requested
  if (status && !isAwardStatus) {
    const s = status.toLowerCase();
    return results.filter(r => r.status === s);
  }
  return results;
}

/**
 * Search with full typed options — used by the Tender Finder module.
 */
export async function searchContractsFinderAdvanced(opts: CfSearchOptions): Promise<any[]> {
  const results: any[] = [];
  const noticeTypes: Array<{ noticeType: 1 | 2; isAward: boolean }> =
    opts.noticeType
      ? [{ noticeType: opts.noticeType, isAward: opts.noticeType === 2 }]
      : [{ noticeType: 1, isAward: false }, { noticeType: 2, isAward: true }];

  for (const nt of noticeTypes) {
    let fetched = await fetchPublicSearch({ ...opts, noticeType: nt.noticeType }, nt.isAward).catch(() => []);
    if (fetched.length === 0) {
      fetched = await fetchOcds(opts.keyword || "", nt.isAward ? "award" : "tender", opts.postedFrom, opts.postedTo).catch(() => []);
    }
    results.push(...fetched);
  }
  return results;
}
