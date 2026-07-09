const TOKEN_KEY = "cp_token";
const USER_KEY = "cp_user";

export function getPortalToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getPortalUser(): any | null {
  const u = localStorage.getItem(USER_KEY);
  try { return u ? JSON.parse(u) : null; } catch { return null; }
}

export function isTrusteePortalUser(user?: any | null): boolean {
  if (!user) return false;
  const role = String(user.role || user.userRole || "").toLowerCase();
  const organisation = String(user.organisation || user.organization || "").toLowerCase();
  const projectId = String(user.projectId || user.project_id || "").toLowerCase();
  const email = String(user.email || "").toLowerCase();
  return role === "trustee" || organisation.includes("alli foundation") || projectId.includes("alli") || email === "kehindeballi@gmail.com" || email === "agboola@jobtrolley.co";
}

export function savePortalSession(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearPortalSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function portalHeaders(): Record<string, string> {
  const token = getPortalToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function portalFetch(method: string, url: string, body?: any): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: portalHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}
