// Apollo.io API module for Prospect Discovery
// Search is free (no enrichment credits). Enrichment only on explicit selection.

const APOLLO_BASE = "https://api.apollo.io/v1";
const APOLLO_TIMEOUT = 10000; // 10 seconds
const APOLLO_MAX_RETRIES = 2;
const RETRYABLE_APOLLO_CODES = new Set([429, 500, 502, 503, 504]);

function getApolloKey(): string {
  // Apollo key may be stored in APOLLO_AI (Replit integration) or APOLLO_API_KEY.
  // Reject OpenRouter-style sk-or-v1- keys that were mistakenly stored in APOLLO_API_KEY.
  const apolloAI = process.env.APOLLO_AI;
  if (apolloAI && !apolloAI.startsWith("sk-")) return apolloAI;

  const apiKey = process.env.APOLLO_API_KEY;
  if (apiKey && !apiKey.startsWith("sk-")) return apiKey;

  throw new Error(
    "APOLLO_AI or APOLLO_API_KEY must be set to a valid Apollo API key. OpenRouter keys (sk-...) are not valid for Apollo."
  );
}

// Simple rate limiter: track last call time and enforce minimum gap
let _lastApolloCall = 0;
const APOLLO_MIN_GAP_MS = 500; // 2 calls per second max

async function apolloFetch(url: string, body: any): Promise<Response> {
  const now = Date.now();
  const elapsed = now - _lastApolloCall;
  if (elapsed < APOLLO_MIN_GAP_MS) {
    await new Promise((r) => setTimeout(r, APOLLO_MIN_GAP_MS - elapsed));
  }

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= APOLLO_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": getApolloKey(),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(APOLLO_TIMEOUT),
      });
      _lastApolloCall = Date.now();

      if (!res.ok) {
        const status = res.status;
        const text = await res.text().catch(() => "");
        // 401 = invalid key, 403 = forbidden, 429 = rate limit
        if (status === 401 || status === 403) {
          throw new Error(`Apollo authentication failed (${status}). Verify your API key.`);
        }
        if (status === 429) {
          throw new Error("Apollo rate limit exceeded. Please wait a moment and retry.");
        }
        if (!RETRYABLE_APOLLO_CODES.has(status)) {
          throw new Error(`Apollo request failed (${status}): ${text || res.statusText}`);
        }
        throw new Error(`Apollo retryable error ${status}: ${text || res.statusText}`);
      }
      return res;
    } catch (err: any) {
      lastError = err;
      const isRetryable = err.message?.includes("retryable") ||
        err.name === "AbortError" ||
        err.name === "TimeoutError";
      if (!isRetryable || attempt === APOLLO_MAX_RETRIES) {
        break;
      }
      // Exponential backoff: 500ms, 1000ms
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
    }
  }

  if (lastError?.name === "AbortError" || lastError?.message?.includes("timeout")) {
    throw new Error("Apollo request timed out. Please retry.");
  }
  throw new Error(`Apollo request failed after ${APOLLO_MAX_RETRIES} attempts: ${lastError?.message}`);
}

interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email?: string;
  phone?: string;
  organization?: {
    name: string;
    industry?: string;
    employee_count?: string;
    website_url?: string;
  };
  location?: string;
  linkedin_url?: string;
  state?: string;
  city?: string;
  country?: string;
}

interface ApolloSearchResult {
  people: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export async function apolloSearch(params: {
  personTitles?: string[];
  personLocations?: string[];
  organizationLocations?: string[];
  personSeniorities?: string[];
  qKeywords?: string[];
  qOrganizationDomains?: string[];
  page?: number;
  perPage?: number;
}): Promise<ApolloSearchResult> {
  const body: any = {
    page: params.page || 1,
    per_page: params.perPage || 25,
  };

  if (params.personTitles?.length) body.person_titles = params.personTitles;
  if (params.personLocations?.length) body.person_locations = params.personLocations;
  if (params.organizationLocations?.length) body.q_organization_locations = params.organizationLocations;
  if (params.personSeniorities?.length) body.person_seniorities = params.personSeniorities;
  if (params.qKeywords?.length) body.q_keywords = params.qKeywords.join(" ");
  if (params.qOrganizationDomains?.length) body.q_organization_domains = params.qOrganizationDomains;

  const res = await apolloFetch(`${APOLLO_BASE}/mixed_people/api_search`, body);
  const data = await res.json() as any;
  return {
    people: data.people || [],
    pagination: data.pagination || { page: 1, per_page: 25, total_entries: 0, total_pages: 0 },
  };
}

export async function apolloSearchAll(params: {
  personTitles?: string[];
  personLocations?: string[];
  organizationLocations?: string[];
  personSeniorities?: string[];
  qKeywords?: string[];
  qOrganizationDomains?: string[];
  perPage?: number;
  maxPages?: number;
  maxPeople?: number;
}): Promise<ApolloSearchResult> {
  const perPage = Math.max(1, Math.min(params.perPage || 25, 100));
  const maxPages = Math.max(1, params.maxPages || 1);
  const maxPeople = Math.max(1, params.maxPeople || 300);

  const allPeople: ApolloPerson[] = [];
  let pagination: ApolloSearchResult["pagination"] = { page: 1, per_page: perPage, total_entries: 0, total_pages: 0 };

  for (let page = 1; page <= maxPages; page++) {
    const next = await apolloSearch({ ...params, page, perPage });
    pagination = next.pagination;

    if (!next.people.length) break;
    allPeople.push(...next.people);

    if (allPeople.length >= maxPeople) {
      allPeople.length = maxPeople;
      break;
    }
    if (pagination.total_pages > 0 && page >= pagination.total_pages) break;
  }

  return {
    people: allPeople,
    pagination,
  };
}

export interface ApolloEnrichmentResult {
  person: ApolloPerson | null;
  cost: number;
}

export async function apolloEnrich(personId: string): Promise<ApolloEnrichmentResult> {
  const res = await apolloFetch(`${APOLLO_BASE}/people/match_api`, { id: personId });
  const data = await res.json() as any;
  // Apollo returns { person: {...} } or { people: [{...}] }
  const person = data.person || (data.people?.[0]) || null;

  // Apollo enrichment credits: we track them. The API doesn't return cost directly,
  // so we count 1 credit per enrichment call. We store this as a numeric value.
  return {
    person,
    cost: 1, // 1 Apollo enrichment credit
  };
}

export type { ApolloPerson };
