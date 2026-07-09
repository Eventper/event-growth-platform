import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

type TabKey = "interest" | "partner" | "sponsor";
type ConfirmFilter = "confirmed" | "unconfirmed" | "all";
type PaymentFilter = "all" | "pending" | "submitted" | "confirmed";

const BRAND = "#330311";

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(r => Object.values(r).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const thStyle: React.CSSProperties = { padding: "10px 14px", background: "#f8f6f3", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textAlign: "left", color: "#555", borderBottom: "2px solid #e8e4de", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" };
const tdStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 13, color: "#1a1a1a", borderBottom: "1px solid #f0ece6", verticalAlign: "top" };

function renderCell(key: string, value: any) {
  if (key === "created_at") return fmtDate(value);
  if (key === "consent_marketing") return value ? "Yes" : "No";
  if (key === "email_confirmed") {
    return (
      <span style={{ fontWeight: 700, fontSize: 12, padding: "2px 8px", borderRadius: 12, background: value ? "#dcfce7" : "#fff3cd", color: value ? "#15803d" : "#92400e" }}>
        {value ? "✓ Yes" : "Pending"}
      </span>
    );
  }
  if (key === "payment_status") {
    const statusColors: Record<string, { bg: string; color: string }> = {
      confirmed: { bg: "#dcfce7", color: "#15803d" },
      submitted: { bg: "#dbeafe", color: "#1d4ed8" },
      pending: { bg: "#fef3c7", color: "#92400e" },
    };
    const style = statusColors[value || "pending"] || statusColors.pending;
    return (
      <span style={{ fontWeight: 700, fontSize: 12, padding: "2px 8px", borderRadius: 12, background: style.bg, color: style.color }}>
        {value || "Pending"}
      </span>
    );
  }
  return String(value ?? "—");
}

function DataTable({ data, columns, onSort, sortKey, sortDir }: { data: any[]; columns: { key: string; label: string }[]; onSort: (k: string) => void; sortKey: string; sortDir: "asc" | "desc" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={thStyle} onClick={() => onSort(c.key)}>
                {c.label}{sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0
            ? <tr><td colSpan={columns.length} style={{ ...tdStyle, textAlign: "center", color: "#aaa", padding: "32px" }}>No entries</td></tr>
            : data.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#faf8f5" }}>
                {columns.map(c => (
                  <td key={c.key} style={tdStyle}>{renderCell(c.key, row[c.key])}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfirmPaymentButton({ email, onConfirm }: { email: string; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    if (done) return;
    setLoading(true);
    try {
      const res = await fetch("/api/event-august/admin/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Iamher-Secret": "ep-iamher-2026" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setDone(true);
      onConfirm();
    } catch (err: any) {
      alert(err.message || "Failed to confirm payment");
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || done}
      style={{
        fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "none", cursor: loading || done ? "default" : "pointer",
        background: done ? "#dcfce7" : BRAND, color: done ? "#15803d" : "#fff", fontWeight: 600,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {done ? "✓ Confirmed" : loading ? "..." : "Confirm Payment"}
    </button>
  );
}

function InterestPanel() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<ConfirmFilter>("confirmed");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  const fetchData = (f: ConfirmFilter) => {
    setLoading(true);
    const param = f === "all" ? "" : `?confirmed=${f === "confirmed"}`;
    fetch(`/api/event-august/admin/interest${param}`, { headers: { "X-Iamher-Secret": "ep-iamher-2026" } })
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(filter); }, [filter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = !q ? data : data.filter(r => Object.values(r).some(v => String(v ?? "").toLowerCase().includes(q)));
    if (paymentFilter !== "all") {
      rows = rows.filter(r => (r.payment_status || "pending") === paymentFilter);
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? "";
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, search, sortKey, sortDir, paymentFilter]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const columns = [
    { key: "id", label: "ID" }, { key: "first_name", label: "First name" }, { key: "last_name", label: "Last name" },
    { key: "email", label: "Email" }, { key: "role", label: "Role" }, { key: "company", label: "Company" },
    { key: "phone", label: "Phone" }, { key: "source", label: "Source" },
    { key: "email_confirmed", label: "Confirmed?" },
    { key: "payment_status", label: "Payment" },
    { key: "payment_reference", label: "Ref" },
    { key: "consent_marketing", label: "Consent" }, { key: "created_at", label: "Date" }, { key: "ip_address", label: "IP" },
  ];

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px", fontSize: 12, fontWeight: active ? 700 : 400, border: `1px solid ${active ? BRAND : "#ddd"}`,
    background: active ? BRAND : "#fff", color: active ? "#fff" : "#555", borderRadius: 20, cursor: "pointer",
  });

  const paymentFilterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px", fontSize: 11, fontWeight: active ? 700 : 400, border: `1px solid ${active ? "#C9A961" : "#ddd"}`,
    background: active ? "#C9A961" : "#fff", color: active ? "#fff" : "#555", borderRadius: 16, cursor: "pointer",
  });

  const confirmedCount = data.filter(r => r.email_confirmed).length;
  const totalCount = data.length;
  const submittedCount = data.filter(r => r.payment_status === "submitted").length;
  const paidCount = data.filter(r => r.payment_status === "confirmed").length;

  const refresh = () => fetchData(filter);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: BRAND }}>
            {filter === "all" ? `${totalCount} total` : `${filtered.length} ${filter}`}
          </span>
          {filter === "all" && (
            <span style={{ fontSize: 12, color: "#888" }}>({confirmedCount} confirmed, {submittedCount} payment pending, {paidCount} paid)</span>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            {(["confirmed", "unconfirmed", "all"] as ConfirmFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={filterBtnStyle(filter === f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#888" }}>Payment:</span>
            {(["all", "pending", "submitted", "confirmed"] as PaymentFilter[]).map(f => (
              <button key={f} onClick={() => setPaymentFilter(f)} style={paymentFilterBtnStyle(paymentFilter === f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, outline: "none", minWidth: 200 }} />
        </div>
        <button onClick={() => exportCSV(filtered, "august-interest.csv")} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Export CSV
        </button>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Loading...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr>
                {columns.map(c => (
                  <th key={c.key} style={thStyle} onClick={() => toggleSort(c.key)}>
                    {c.label}{sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </th>
                ))}
                <th style={{ ...thStyle, cursor: "default" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={columns.length + 1} style={{ ...tdStyle, textAlign: "center", color: "#aaa", padding: "32px" }}>No entries</td></tr>
                : filtered.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#faf8f5" }}>
                    {columns.map(c => (
                      <td key={c.key} style={tdStyle}>{renderCell(c.key, row[c.key])}</td>
                    ))}
                    <td style={tdStyle}>
                      {row.payment_status === "submitted" && (
                        <ConfirmPaymentButton email={row.email} onConfirm={refresh} />
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabPanel({ endpoint, columns, filename }: { endpoint: string; columns: { key: string; label: string }[]; filename: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch(endpoint, { headers: { "X-Iamher-Secret": "ep-iamher-2026" } }).then(r => r.json()).then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, [endpoint]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = !q ? data : data.filter(r => Object.values(r).some(v => String(v ?? "").toLowerCase().includes(q)));
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? "";
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, search, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: BRAND }}>{data.length} {data.length === 1 ? "entry" : "entries"}</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, outline: "none", minWidth: 220 }} />
        </div>
        <button onClick={() => exportCSV(filtered, filename)} style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Export CSV
        </button>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Loading...</div> : (
        <DataTable data={filtered} columns={columns} onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} />
      )}
    </div>
  );
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "interest", label: "Interest registrations" },
  { key: "partner", label: "Partner enquiries" },
  { key: "sponsor", label: "Sponsor enquiries" },
];

const PARTNER_COLS = [
  { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "organisation", label: "Organisation" },
  { key: "role", label: "Role" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
  { key: "message", label: "Message" }, { key: "consent_marketing", label: "Consent" },
  { key: "created_at", label: "Date" }, { key: "ip_address", label: "IP" },
];

const SPONSOR_COLS = [
  { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "brand", label: "Brand" },
  { key: "role", label: "Role" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
  { key: "sponsorship_type", label: "Type" }, { key: "message", label: "Message" },
  { key: "consent_marketing", label: "Consent" }, { key: "created_at", label: "Date" }, { key: "ip_address", label: "IP" },
];

export default function EventAugustAdmin() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("interest");
  const [adminPass, setAdminPass] = useState("");
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem("iamher-admin") === "1"; } catch { return false; }
  });

  const checkPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass === "ep-iamher-2026") {
      setAuthed(true);
      try { sessionStorage.setItem("iamher-admin", "1"); } catch {}
    } else {
      alert("Incorrect password");
    }
  };

  if (!authed) {
    return (
      <div style={{ fontFamily: "'Poppins', sans-serif", background: "#faf8f5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 400, width: "100%", padding: 40, background: "#fff", borderRadius: 12, border: "1px solid #e8e4de", textAlign: "center" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: BRAND }}>I Am Her — Admin</h1>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "#888" }}>Enter the admin password to continue</p>
          <form onSubmit={checkPass} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              value={adminPass}
              onChange={e => setAdminPass(e.target.value)}
              placeholder="Admin password"
              style={{ padding: "12px 14px", fontSize: 14, border: "1px solid #ddd", borderRadius: 6, outline: "none" }}
            />
            <button type="submit" style={{ padding: "12px 24px", fontSize: 14, fontWeight: 600, background: BRAND, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: "#faf8f5", minHeight: "100vh" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e8e4de", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: BRAND }}>I Am Her — Admin</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#888" }}>An evening for the woman who leads the room · Friday 30 October 2026 · Milton Keynes</p>
        </div>
        <button onClick={() => setLocation("/admin")} style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "6px 14px", fontSize: 12, color: "#555", cursor: "pointer" }}>← Back to admin</button>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e8e4de", marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: "12px 24px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: activeTab === t.key ? 700 : 400, color: activeTab === t.key ? BRAND : "#666", borderBottom: activeTab === t.key ? `2px solid ${BRAND}` : "2px solid transparent", marginBottom: -2, transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e4de", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 0" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>
              {TABS.find(t => t.key === activeTab)?.label}
            </h2>
          </div>
          <div style={{ padding: "0 24px 24px" }}>
            {activeTab === "interest" && <InterestPanel />}
            {activeTab === "partner" && <TabPanel endpoint="/api/event-august/admin/partner" columns={PARTNER_COLS} filename="august-partners.csv" />}
            {activeTab === "sponsor" && <TabPanel endpoint="/api/event-august/admin/sponsor" columns={SPONSOR_COLS} filename="august-sponsors.csv" />}
          </div>
        </div>
      </div>
    </div>
  );
}
