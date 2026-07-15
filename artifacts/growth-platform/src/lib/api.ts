// API wrapper with automatic auth header injection
function normalizeRequestUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  // If an explicit API host is provided via VITE_API_URL (e.g. "https://api.example.com"),
  // use it for `/api/*` calls so deployments can point the SPA at a separate API host.
  const apiHost = (import.meta.env.VITE_API_URL || "").trim();
  if (apiHost) {
    if (url.startsWith("/api/")) return apiHost.replace(/\/$/, "") + url;
    return url;
  }

  if (!url.startsWith("/api/")) return url;

  // Keep API calls working when the app is served under a sub-path
  // such as /growth-platform.
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return base ? `${base}${url}` : url;
}

function getToken() {
  return localStorage.getItem("growth-token");
}

function buildHeaders(init?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...(init || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function extractErrorMessage(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const candidate = parsed.message || parsed.error || parsed.detail;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  } catch {
    // Fall back to plain text response.
  }

  return trimmed;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(normalizeRequestUrl(url), init);
    const text = await response.text();

    if (response.status === 401) {
      localStorage.removeItem("growth-token");
      window.location.reload();
      throw new Error("Session expired");
    }

    if (!response.ok) {
      throw new Error(extractErrorMessage(text, `HTTP ${response.status}`));
    }

    if (!text) return {} as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("The server returned an unexpected response.");
    }
  } catch (error) {
    if (error instanceof Error && (error.message === "Failed to fetch" || error.message === "Load failed")) {
      throw new Error("Backend unavailable. Please try again in a moment.");
    }
    throw error;
  }
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url, { headers: buildHeaders() });
}

export function apiPost<T>(url: string, body: any): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: buildHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(url: string, body: any): Promise<T> {
  return request<T>(url, {
    method: "PATCH",
    headers: buildHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(url: string): Promise<T> {
  return request<T>(url, {
    method: "DELETE",
    headers: buildHeaders(),
  });
}

// Save resume state for "Continue where you left off"
export function saveResume(eventId: string, page: string, action: string, step?: string | null): void {
  apiPost("/api/growth/resume", { eventId, page, action, step }).catch(() => {
    // Silently fail — resume is best-effort
  });
}

// New commercial layer helpers
export function fetchSponsors(eventId?: string) {
  const qs = eventId ? `?eventId=${eventId}` : "";
  return apiGet<{ ok: boolean; sponsors: any[] }>(`/api/growth/sponsors${qs}`);
}
export function createSponsor(body: any) { return apiPost<{ ok: boolean; sponsor: any }>("/api/growth/sponsors", body); }
export function updateSponsor(id: string, body: any) { return apiPatch<{ ok: boolean; sponsor: any }>(`/api/growth/sponsors/${id}`, body); }
export function deleteSponsor(id: string) { return apiDelete<{ ok: boolean }>(`/api/growth/sponsors/${id}`); }
export function scoreSponsor(id: string) { return apiPost<{ ok: boolean; score: any }>(`/api/growth/sponsors/${id}/score`, {}); }

export function fetchPr(eventId?: string) {
  const qs = eventId ? `?eventId=${eventId}` : "";
  return apiGet<{ ok: boolean; opportunities: any[] }>(`/api/growth/pr${qs}`);
}
export function createPr(body: any) { return apiPost<{ ok: boolean; opportunity: any }>("/api/growth/pr", body); }
export function updatePr(id: string, body: any) { return apiPatch<{ ok: boolean; opportunity: any }>(`/api/growth/pr/${id}`, body); }
export function deletePr(id: string) { return apiDelete<{ ok: boolean }>(`/api/growth/pr/${id}`); }
export function scorePr(id: string) { return apiPost<{ ok: boolean; score: any }>(`/api/growth/pr/${id}/score`, {}); }

export function fetchReferrals(eventId?: string) {
  const qs = eventId ? `?eventId=${eventId}` : "";
  return apiGet<{ ok: boolean; referrals: any[] }>(`/api/growth/referrals${qs}`);
}
export function createReferral(body: any) { return apiPost<{ ok: boolean; referral: any }>("/api/growth/referrals", body); }
export function updateReferral(id: string, body: any) { return apiPatch<{ ok: boolean; referral: any }>(`/api/growth/referrals/${id}`, body); }

export function fetchCorporateTargets(eventId?: string) {
  const qs = eventId ? `?eventId=${eventId}` : "";
  return apiGet<{ ok: boolean; targets: any[] }>(`/api/growth/corporate-targets${qs}`);
}
export function createCorporateTarget(body: any) { return apiPost<{ ok: boolean; target: any }>("/api/growth/corporate-targets", body); }
export function updateCorporateTarget(id: string, body: any) { return apiPatch<{ ok: boolean; target: any }>(`/api/growth/corporate-targets/${id}`, body); }
export function deleteCorporateTarget(id: string) { return apiDelete<{ ok: boolean }>(`/api/growth/corporate-targets/${id}`); }

export function fetchCommercial(eventId: string) {
  return apiGet<{ ok: boolean; guests: any; sponsors: any; pr: any; referrals: number; corporateTargets: number; eventName: string }>(`/api/growth/commercial/${eventId}`);
}

export function generateMessage(body: { eventId: string; messageType: string; recipient: any; context?: any }) {
  return apiPost<{ ok: boolean; message: string; messageType: string }>("/api/growth/generate-message", body);
}

export function sendSponsorEmail(id: string) {
  return apiPost<{ ok: boolean; sent: boolean; recipient: string }>(`/api/growth/sponsors/${id}/send`, {});
}

export function sendPrEmail(id: string) {
  return apiPost<{ ok: boolean; sent: boolean; recipient: string }>(`/api/growth/pr/${id}/send`, {});
}

export function sendReferralEmail(id: string) {
  return apiPost<{ ok: boolean; sent: boolean; recipient: string }>(`/api/growth/referrals/${id}/send`, {});
}
