// Shared UI primitives for the tender dashboard (Phase 3, Task 1 decomposition).
// These were previously defined inline in saas-tender-dashboard.tsx; they are pure
// (no component state) so extracting them lets the per-feature components share one
// source of truth. Behaviour is byte-identical to the originals.

// ── Palette ──────────────────────────────────────────────────────────────────
export const BLUE = "#3b82f6";
export const PURPLE = "#8b5cf6";
export const GOLD = "#f59e0b";
export const BG = "#0f1729";
export const CARD_BG = "rgba(255,255,255,0.04)";
export const BORDER = "rgba(255,255,255,0.08)";

// ── Style helpers (pure — depend only on the palette above) ──────────────────
export const btn = (bg: string, color = "#fff"): any => ({ padding: "8px 16px", background: bg, color, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" });
export const input = (): any => ({ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box" as const });
export const card = (): any => ({ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 });
export const label = (): any => ({ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, letterSpacing: 0.5 });

// ── Formatters ───────────────────────────────────────────────────────────────
export const fmtDate = (d: string | null) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; }
};

export const fmtMoney = (v: any) => {
  const n = parseFloat(String(v || "0"));
  return isNaN(n) ? "0" : n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// ── Tender status values ─────────────────────────────────────────────────────
export const TENDER_STATUSES = ["Researching", "Active", "In Progress", "Submitted", "Won", "Lost"];

// ── Six-lane filter chips — read from the lane_scores JSONB written by the sweeper.
// A tender matches a lane chip when lane_scores[key] >= LANE_THRESHOLD.
// Mirrors RELEVANCE_THRESHOLD in tender-discovery-config.ts (frontend has no backend import).
export const LANE_THRESHOLD = 30;
export const LANE_CHIPS: { key: string; label: string; color: string }[] = [
  { key: "events",      label: "Events",      color: "#3b82f6" },
  { key: "design",      label: "Design",      color: "#8b5cf6" },
  { key: "merch",       label: "Merch",       color: "#ec4899" },
  { key: "pmo",         label: "PMO",         color: "#f59e0b" },
  { key: "development", label: "Development", color: "#10b981" },
  { key: "charity",     label: "Charity",     color: "#14b8a6" },
];
export const laneScoreOf = (t: any, key: string): number => Number(t?.lane_scores?.[key]) || 0;

// Lane filter selection type, shared by the dashboard shell and the discovery view.
export type OrgLaneFilter = "all" | "events" | "design" | "merch" | "pmo" | "development" | "charity";

// ── API base + fetch helper ──────────────────────────────────────────────────
// Previously defined inline in saas-tender-dashboard.tsx; moved here (Phase 3,
// Task 1 — Bid Writing extraction) so per-feature components share one source of
// truth. Behaviour is byte-identical to the originals.
export const API = "/api/saas-tender";

export function saasApiRequest(method: string, url: string, body?: any) {
  const token = localStorage.getItem("saas_tender_token");
  const isFormData = body instanceof FormData;
  return fetch(url, {
    method,
    headers: isFormData ? { ...(token ? { Authorization: `Bearer ${token}` } : {}) } : { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Request failed");
    return data;
  });
}

// ── 16 bid sections (drafted by the bid writer, reviewed in governance) ───────
export const BID_SECTIONS = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "company_overview", label: "Company Overview" },
  { key: "methodology", label: "Methodology" },
  { key: "team_experience", label: "Team and Experience" },
  { key: "social_value", label: "Social Value including Environmental Impact" },
  { key: "risk_management", label: "Risk Management" },
  { key: "timeline", label: "Timeline and Implementation" },
  { key: "quality_assurance", label: "Quality Assurance" },
  { key: "innovation", label: "Innovation" },
  { key: "sustainability", label: "Sustainability" },
  { key: "cost_analysis", label: "Cost Analysis" },
  { key: "references", label: "References" },
  { key: "compliance_statement", label: "Compliance Statement" },
  { key: "appendices", label: "Appendices" },
  { key: "cover_letter", label: "Cover Letter" },
  { key: "scoring_criteria_response", label: "Scoring Criteria Response" },
];

// ── Governance status → colour/badge (pure; shared by bid writer + governance) ─
export const governanceStatusColor = (status: string) => {
  if (status === "approved") return "#10b981";
  if (status === "awaiting_review") return GOLD;
  if (status === "auto_drafted") return PURPLE;
  if (status === "changes_requested" || status === "rewritten") return "#f59e0b";
  if (status === "rejected") return "#ef4444";
  return "#475569";
};
export const governanceBadge = (status: string) => {
  const labels: Record<string, string> = { not_submitted: "Draft", draft: "Draft", auto_drafted: "Auto-Drafted", awaiting_review: "In Review", approved: "Approved", changes_requested: "Changes Requested", rewritten: "Revised", rejected: "Rejected" };
  return labels[status] || status;
};

// ── Poppins typography for rendered bid content ───────────────────────────────
// The product owner wants drafted bids to READ like a finished document: Poppins,
// clear headers, generous white space and bullet points. Applied wherever a bid
// section's prose is rendered/previewed/exported.
export const POPPINS_STACK = "'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif";
export const bidProseStyle = (): any => ({
  fontFamily: POPPINS_STACK,
  fontSize: 15,
  lineHeight: 1.7,
  color: "#e5edf7",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
});

// Count words in a bid section (mirrors the backend's split(/\s+/) so the UI and
// the stored word_count agree), and render a "n / limit words" string. `limit` is
// parsed from the tender's extracted word-limit guideline when known.
export const countWords = (text: string): number => (text || "").trim() ? (text || "").trim().split(/\s+/).length : 0;
export const wordCountLabel = (text: string, limit?: number | null): string => {
  const n = countWords(text);
  return limit && limit > 0 ? `${n} / ${limit} words` : `${n} word${n === 1 ? "" : "s"}`;
};
