import { useState } from "react";
import { useLocation } from "wouter";
import NewClientWizard from "./new-client-wizard";

const TOKEN_KEY = "token";
function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
function headers() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
async function apiFetch(method: string, url: string, body?: any) {
  const res = await fetch(url, { method, headers: headers(), ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  lead:          { label: "Lead",          color: "#94a3b8", bg: "#1e293b" },
  proposal_sent: { label: "Proposal Sent", color: "#f59e0b", bg: "#2a1f00" },
  contracted:    { label: "Contracted",    color: "#3b82f6", bg: "#0c1e3c" },
  onboarding:    { label: "Onboarding",    color: "#a78bfa", bg: "#1e1240" },
  active:        { label: "Active",        color: "#22c55e", bg: "#0a2218" },
  completed:     { label: "Completed",     color: "#6b7280", bg: "#1c1c1c" },
  inactive:      { label: "Inactive",      color: "#ef4444", bg: "#2a0c0c" },
};

const ENGAGEMENT_TYPES = [
  "Full Event Management","Day Coordination","Corporate Events","Wedding Planning",
  "Conference & Summits","Gala Dinners","Virtual Events","Project Consulting","Other",
];
const LEAD_SOURCES = ["Referral","Website","LinkedIn","Email Campaign","Direct","Exhibition","Other"];

function Badge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || { label: status, color: "#94a3b8", bg: "#1e293b" };
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}40`,
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#1A0A0E", border: "1px solid #4A2030", borderRadius: 12, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #4A2030", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#E2C87A", margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", color: "#ccc", fontSize: 12, marginBottom: 4 }}>{label}</label>}
      <input {...props} style={{ width: "100%", background: "#2A1018", border: "1px solid #4A2030", borderRadius: 6,
        color: "#fff", padding: "8px 12px", fontSize: 13, boxSizing: "border-box", ...props.style }} />
    </div>
  );
}

function Select({ label, children, ...props }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", color: "#ccc", fontSize: 12, marginBottom: 4 }}>{label}</label>}
      <select {...props} style={{ width: "100%", background: "#2A1018", border: "1px solid #4A2030", borderRadius: 6,
        color: "#fff", padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }}>
        {children}
      </select>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: "#2A1018", border: `1px solid ${color}40`, borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value ?? 0}</div>
      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function EPClientCRM() {
  const [, navigate] = useLocation();
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState("");
  const [newClient, setNewClient] = useState({
    organisation_name: "", engagement_type: "", lead_source: "",
    assigned_to: "", city: "", country: "United Kingdom", status: "lead",
    website: "", address_line1: "",
  });
  const [saving, setSaving] = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (search) params.set("search", search);
      const [data, st] = await Promise.all([
        apiFetch("GET", `/api/ep-clients?${params}`),
        apiFetch("GET", "/api/ep-clients-stats"),
      ]);
      setClients(data);
      setStats(st);
    } catch (e: any) { showToast(e.message); }
    setLoading(false);
  }

  // Load on mount and filter changes
  useState(() => { load(); });
  const [prevFilter, setPrevFilter] = useState(filterStatus + search);
  if (filterStatus + search !== prevFilter) { setPrevFilter(filterStatus + search); load(); }

  async function createClient() {
    if (!newClient.organisation_name.trim()) return showToast("Organisation name is required");
    setSaving(true);
    try {
      await apiFetch("POST", "/api/ep-clients", newClient);
      showToast("Client created");
      setShowNew(false);
      setNewClient({ organisation_name: "", engagement_type: "", lead_source: "", assigned_to: "", city: "", country: "United Kingdom", status: "lead", website: "", address_line1: "" });
      load();
    } catch (e: any) { showToast(e.message); }
    setSaving(false);
  }

  const S = { page: { minHeight: "100vh", background: "#1A0A0E", color: "#fff", fontFamily: "'Poppins', sans-serif" } };

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#2A1018", color: "#E2C87A",
          border: "1px solid #4A2030", padding: "12px 20px", borderRadius: 8, zIndex: 9999, fontSize: 13 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#2A1018", borderBottom: "1px solid #4A2030", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, height: 60 }}>
          <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>← Dashboard</button>
          <div style={{ color: "#4A2030", fontSize: 18 }}>|</div>
          <h1 style={{ color: "#E2C87A", fontSize: 18, fontWeight: 700, margin: 0 }}>Client Onboarding & CRM</h1>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowNew(true)}
            style={{ background: "#7B2142", color: "#fff", border: "none", borderRadius: 7,
              padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + New Client
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 32px" }}>
        {/* Stats Row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <StatCard label="Leads" value={stats.leads} color="#94a3b8" />
          <StatCard label="Proposals" value={stats.proposals} color="#f59e0b" />
          <StatCard label="Contracted" value={stats.contracted} color="#3b82f6" />
          <StatCard label="Onboarding" value={stats.onboarding} color="#a78bfa" />
          <StatCard label="Active" value={stats.active} color="#22c55e" />
          <StatCard label="Completed" value={stats.completed} color="#6b7280" />
          <StatCard label="Total" value={stats.total} color="#E2C87A" />
        </div>

        {/* Search & Filter */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: "#2A1018", border: "1px solid #4A2030", borderRadius: 7,
              color: "#fff", padding: "9px 14px", fontSize: 13, width: 240 }}
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ background: "#2A1018", border: "1px solid #4A2030", borderRadius: 7,
              color: "#fff", padding: "9px 14px", fontSize: 13 }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={load} style={{ background: "#4A2030", color: "#E2C87A", border: "none", borderRadius: 7,
            padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Refresh</button>
          <div style={{ marginLeft: "auto", color: "#888", fontSize: 13 }}>{clients.length} client{clients.length !== 1 ? "s" : ""}</div>
        </div>

        {/* Client Cards Grid */}
        {loading ? (
          <div style={{ textAlign: "center", color: "#888", padding: 60, fontSize: 14 }}>Loading clients...</div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
            <div style={{ color: "#888", fontSize: 15, marginBottom: 20 }}>No clients yet. Add your first client to get started.</div>
            <button onClick={() => setShowNew(true)}
              style={{ background: "#7B2142", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, cursor: "pointer" }}>
              + Add First Client
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {clients.map((c: any) => (
              <div key={c.id} onClick={() => navigate(`/ep-crm/${c.id}`)}
                style={{ background: "#2A1018", border: "1px solid #4A2030", borderRadius: 12,
                  padding: 20, cursor: "pointer", transition: "border-color 0.2s", position: "relative" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#7B2142")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#4A2030")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, paddingRight: 12 }}>
                    <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 4 }}>{c.organisation_name}</h3>
                    {c.city && <div style={{ color: "#888", fontSize: 12 }}>{c.city}{c.country ? `, ${c.country}` : ""}</div>}
                  </div>
                  <Badge status={c.status} />
                </div>

                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  {c.engagement_type && (
                    <div style={{ background: "#1A0A0E", borderRadius: 5, padding: "4px 10px", fontSize: 11, color: "#ccc" }}>
                      {c.engagement_type}
                    </div>
                  )}
                  {c.lead_source && (
                    <div style={{ background: "#1A0A0E", borderRadius: 5, padding: "4px 10px", fontSize: 11, color: "#888" }}>
                      via {c.lead_source}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#888" }}>
                  <span>👤 {c.contact_count || 0} contact{c.contact_count !== 1 ? "s" : ""}</span>
                  {c.assigned_to && <span>Assigned: {c.assigned_to}</span>}
                </div>

                {c.onboarding && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #4A2030" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#888" }}>Onboarding</span>
                      <span style={{ fontSize: 11, color: c.onboarding.status === 'completed' ? "#22c55e" : "#a78bfa" }}>
                        {c.onboarding.status === 'completed' ? '✓ Complete' : `Step ${c.onboarding.step_completed}/4`}
                      </span>
                    </div>
                    <div style={{ height: 4, background: "#1A0A0E", borderRadius: 2 }}>
                      <div style={{ height: 4, borderRadius: 2, background: c.onboarding.status === 'completed' ? "#22c55e" : "#a78bfa",
                        width: `${(c.onboarding.step_completed / 4) * 100}%`, transition: "width 0.3s" }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Client Wizard — 4 steps ending with EP Agent SOW generation */}
      {showNew && (
        <NewClientWizard
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}
