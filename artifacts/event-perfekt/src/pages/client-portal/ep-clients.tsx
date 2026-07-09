import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const JWT_KEY = "token";

function getEPToken() {
  return localStorage.getItem(JWT_KEY) || localStorage.getItem("saas_tender_token") || "";
}
function epHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getEPToken()}` };
}
async function epFetch(method: string, url: string, body?: any) {
  const res = await fetch(url, { method, headers: epHeaders(), ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

const STATUS_COLORS: Record<string, string> = { pending: "#94a3b8", in_progress: "#f59e0b", delivered: "#3b82f6" };
const STATUS_OPTIONS = ["pending", "in_progress", "delivered"];
const STATUS_LABELS: Record<string, string> = { pending: "Pending", in_progress: "In Progress", delivered: "Delivered" };

type TabType = "deliverables" | "messages" | "meetings" | "risks" | "invoices" | "activity";

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div style={{ position: "fixed", top: 20, right: 20, background: "#1a0a0e", color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 13, zIndex: 9999 }}>{msg}</div>;
}

function Btn({ children, onClick, disabled, style }: any) {
  return <button onClick={onClick} disabled={disabled} style={{ padding: "7px 16px", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, ...style }}>{children}</button>;
}

function Input({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", display: "block", marginBottom: 3 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""}
        style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, boxSizing: "border-box" as any }} />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 2 }: any) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", display: "block", marginBottom: 3 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, resize: "vertical", boxSizing: "border-box" as any, fontFamily: "Poppins, sans-serif" }} />
    </div>
  );
}

const RISK_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "#fef3c7", text: "#92400e" },
  resolved: { bg: "#dcfce7", text: "#166534" },
  monitoring: { bg: "#dbeafe", text: "#1e40af" },
};
const INV_STATUS_COLORS: Record<string, string> = { pending: "#fef3c7", sent: "#dbeafe", paid: "#dcfce7", overdue: "#fee2e2", cancelled: "#f3f4f6" };

export default function EPClients() {
  const [, setLocation] = useLocation();
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("deliverables");
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [shareOnUpload, setShareOnUpload] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Meeting form
  const [showMtgForm, setShowMtgForm] = useState(false);
  const [mtgTitle, setMtgTitle] = useState("");
  const [mtgDesc, setMtgDesc] = useState("");
  const [mtgDate, setMtgDate] = useState("");
  const [mtgDuration, setMtgDuration] = useState("60");
  const [mtgLocation, setMtgLocation] = useState("");
  const [mtgLink, setMtgLink] = useState("");
  const [mtgSaving, setMtgSaving] = useState(false);

  // Risk form
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [riskTitle, setRiskTitle] = useState("");
  const [riskCategory, setRiskCategory] = useState("risk");
  const [riskMitigation, setRiskMitigation] = useState("");
  const [riskAction, setRiskAction] = useState("");
  const [riskInternal, setRiskInternal] = useState(false);
  const [riskSaving, setRiskSaving] = useState(false);

  // Invoice form
  const [showInvForm, setShowInvForm] = useState(false);
  const [invRef, setInvRef] = useState("");
  const [invDesc, setInvDesc] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invCurrency, setInvCurrency] = useState("GBP");
  const [invIssued, setInvIssued] = useState("");
  const [invDue, setInvDue] = useState("");
  const [invDocUrl, setInvDocUrl] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [invSaving, setInvSaving] = useState(false);

  // Log form
  const [logDesc, setLogDesc] = useState("");
  const [logType, setLogType] = useState("note");
  const [logSaving, setLogSaving] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  useEffect(() => {
    epFetch("GET", "/api/client-portal/admin/projects")
      .then(p => { setProjects(Array.isArray(p) ? p : []); })
      .catch(e => { if (e.message?.includes("401")) setLocation("/"); })
      .finally(() => setLoading(false));
  }, []);

  const loadProject = async (id: string) => {
    setSelected(id);
    setDeliverables([]); setMessages([]); setMeetings([]); setRisks([]); setInvoices([]); setLogs([]);
    const [del, msg, mtg, rsk, inv, lg] = await Promise.allSettled([
      epFetch("GET", `/api/client-portal/admin/deliverables/${id}`),
      epFetch("GET", `/api/client-portal/admin/messages/${id}`),
      epFetch("GET", `/api/client-portal/admin/meetings/${id}`),
      epFetch("GET", `/api/client-portal/admin/risks/${id}`),
      epFetch("GET", `/api/client-portal/admin/invoices/${id}`),
      epFetch("GET", `/api/client-portal/admin/logs/${id}`),
    ]);
    if (del.status === "fulfilled") setDeliverables(Array.isArray(del.value) ? del.value : []);
    if (msg.status === "fulfilled") setMessages(Array.isArray(msg.value) ? msg.value : []);
    if (mtg.status === "fulfilled") setMeetings(Array.isArray(mtg.value) ? mtg.value : []);
    if (rsk.status === "fulfilled") setRisks(Array.isArray(rsk.value) ? rsk.value : []);
    if (inv.status === "fulfilled") setInvoices(Array.isArray(inv.value) ? inv.value : []);
    if (lg.status === "fulfilled") setLogs(Array.isArray(lg.value) ? lg.value : []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const updateDeliverable = async (id: number, changes: Record<string, any>) => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      const updated = await epFetch("PATCH", `/api/client-portal/admin/deliverables/${id}`, changes);
      setDeliverables(ds => ds.map(d => d.id === id ? { ...d, ...updated } : d));
      showToast("Saved");
    } catch (e: any) { showToast(e.message); }
    setSaving(s => ({ ...s, [id]: false }));
  };

  const handleUpload = async (deliverableId: number) => {
    if (!uploadFile) return;
    setSaving(s => ({ ...s, [deliverableId]: true }));
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("share", shareOnUpload.toString());
      const res = await fetch(`/api/client-portal/admin/documents/${deliverableId}`, {
        method: "POST", headers: { Authorization: `Bearer ${getEPToken()}` }, body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setDeliverables(ds => ds.map(d => d.id === deliverableId ? { ...d, document_url: data.url, document_name: data.name, shared_with_client: shareOnUpload } : d));
      setUploadTarget(null); setUploadFile(null); showToast("Document uploaded");
    } catch (e: any) { showToast(e.message); }
    setSaving(s => ({ ...s, [deliverableId]: false }));
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setReplying(true);
    try {
      await epFetch("POST", `/api/client-portal/admin/messages/${selected}`, { content: reply.trim(), senderName: "EP Team" });
      setReply("");
      const msg = await epFetch("GET", `/api/client-portal/admin/messages/${selected}`);
      setMessages(Array.isArray(msg) ? msg : []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e: any) { showToast(e.message); }
    setReplying(false);
  };

  const addMeeting = async () => {
    if (!mtgTitle.trim() || !selected) return;
    setMtgSaving(true);
    try {
      const m = await epFetch("POST", `/api/client-portal/admin/meetings/${selected}`, {
        title: mtgTitle, description: mtgDesc, meeting_date: mtgDate || null,
        duration_minutes: parseInt(mtgDuration) || 60, location: mtgLocation, meeting_link: mtgLink,
      });
      setMeetings(ms => [m, ...ms]);
      setMtgTitle(""); setMtgDesc(""); setMtgDate(""); setMtgDuration("60"); setMtgLocation(""); setMtgLink(""); setShowMtgForm(false);
      showToast("Meeting added");
    } catch (e: any) { showToast(e.message); }
    setMtgSaving(false);
  };

  const deleteMeeting = async (id: number) => {
    if (!confirm("Delete this meeting?")) return;
    try {
      await epFetch("DELETE", `/api/client-portal/admin/meetings/${id}`);
      setMeetings(ms => ms.filter(m => m.id !== id));
      showToast("Deleted");
    } catch (e: any) { showToast(e.message); }
  };

  const addRisk = async () => {
    if (!riskTitle.trim() || !selected) return;
    setRiskSaving(true);
    try {
      const r = await epFetch("POST", `/api/client-portal/admin/risks/${selected}`, {
        title: riskTitle, category: riskCategory, mitigation_summary: riskMitigation,
        ep_action: riskAction, is_internal: riskInternal,
      });
      setRisks(rs => [r, ...rs]);
      setRiskTitle(""); setRiskCategory("risk"); setRiskMitigation(""); setRiskAction(""); setRiskInternal(false); setShowRiskForm(false);
      showToast("Added");
    } catch (e: any) { showToast(e.message); }
    setRiskSaving(false);
  };

  const resolveRisk = async (id: number) => {
    try {
      const r = await epFetch("PATCH", `/api/client-portal/admin/risks/${id}`, { status: "resolved" });
      setRisks(rs => rs.map(x => x.id === id ? { ...x, ...r } : x));
      showToast("Marked resolved");
    } catch (e: any) { showToast(e.message); }
  };

  const addInvoice = async () => {
    if (!invRef.trim() || !selected) return;
    setInvSaving(true);
    try {
      const i = await epFetch("POST", `/api/client-portal/admin/invoices/${selected}`, {
        invoice_ref: invRef, description: invDesc, amount: parseFloat(invAmount) || null,
        currency: invCurrency, date_issued: invIssued || null, due_date: invDue || null,
        document_url: invDocUrl || null, notes: invNotes,
      });
      setInvoices(is => [i, ...is]);
      setInvRef(""); setInvDesc(""); setInvAmount(""); setInvCurrency("GBP"); setInvIssued(""); setInvDue(""); setInvDocUrl(""); setInvNotes(""); setShowInvForm(false);
      showToast("Invoice added — client notified by email");
    } catch (e: any) { showToast(e.message); }
    setInvSaving(false);
  };

  const updateInvStatus = async (id: number, status: string) => {
    try {
      const i = await epFetch("PATCH", `/api/client-portal/admin/invoices/${id}`, { status });
      setInvoices(is => is.map(x => x.id === id ? { ...x, ...i } : x));
      showToast("Status updated");
    } catch (e: any) { showToast(e.message); }
  };

  const addLog = async () => {
    if (!logDesc.trim() || !selected) return;
    setLogSaving(true);
    try {
      const l = await epFetch("POST", `/api/client-portal/admin/logs/${selected}`, { action_type: logType, description: logDesc });
      setLogs(ls => [l, ...ls]);
      setLogDesc(""); showToast("Activity logged");
    } catch (e: any) { showToast(e.message); }
    setLogSaving(false);
  };

  const phases: Record<number, { name: string; items: any[] }> = {};
  for (const d of deliverables) {
    if (!phases[d.phase_number]) phases[d.phase_number] = { name: d.phase_name, items: [] };
    phases[d.phase_number].items.push(d);
  }

  const selectedProject = projects.find(p => p.id === selected);
  const TABS: { key: TabType; label: string }[] = [
    { key: "deliverables", label: `Deliverables (${deliverables.length})` },
    { key: "messages", label: `Messages (${messages.length})` },
    { key: "meetings", label: `Calendar (${meetings.length})` },
    { key: "risks", label: `Project Status (${risks.length})` },
    { key: "invoices", label: `Invoices (${invoices.length})` },
    { key: "activity", label: `Activity (${logs.length})` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f6f1", padding: 24 }}>
      <Toast msg={toast} />
      <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => setUploadFile(e.target.files?.[0] || null)} />

      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a0a0e", margin: "0 0 4px" }}>Client Portal Management</h1>
          <p style={{ color: "#666", fontSize: 14, margin: 0 }}>Manage deliverables, meetings, invoices, and communications for each client project</p>
        </div>

        <div className="ep-portal-master-detail" style={{ display: "grid", gridTemplateColumns: selected ? "260px 1fr" : "1fr", gap: 20 }}>
          {/* Project list */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px" }}>Projects</h3>
            {loading ? <div style={{ color: "#aaa", fontSize: 13 }}>Loading...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {projects.length === 0 && <div style={{ color: "#aaa", fontSize: 13 }}>No projects found</div>}
                {projects.map(p => (
                  <button key={p.id} onClick={() => loadProject(p.id)} style={{
                    background: selected === p.id ? "#3D0B0B" : "#fff", color: selected === p.id ? "#fff" : "#1a0a0e",
                    border: "1px solid " + (selected === p.id ? "#3D0B0B" : "#e8e0d8"),
                    borderRadius: 8, padding: "12px 14px", textAlign: "left", cursor: "pointer",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name || p.id}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{p.organisation || p.client_email || ""}</div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
                      {p.delivered_count}/{p.total_deliverables} delivered · {p.message_count} messages
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && selectedProject && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#3D0B0B", margin: "0 0 2px" }}>{selectedProject.name || selectedProject.id}</h2>
                <div style={{ fontSize: 13, color: "#666" }}>{selectedProject.organisation || selectedProject.client_email}</div>
              </div>

              {/* ALLI Foundation Module Quick Links */}
              {(selectedProject.project_id === "alli-foundation-2024" ||
                (selectedProject.organisation || "").toLowerCase().includes("alli")) && (
                <div style={{ background: "#fef9ee", border: "1px solid #f0e8d0", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#8B6914", textTransform: "uppercase", marginBottom: 10, letterSpacing: 0.5 }}>ALLI Foundation Modules</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { label: "👥 Case Management", href: "/client-portal/alli/young-people" },
                      { label: "🤝 Partners", href: "/client-portal/alli/partners" },
                      { label: "📅 Events", href: "/client-portal/alli/events" },
                    ].map(l => (
                      <button key={l.href} onClick={() => setLocation(l.href)} style={{ background: "#3D0B0B", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{l.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab bar */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                    padding: "8px 14px", borderRadius: 6, border: "1px solid " + (activeTab === t.key ? "#3D0B0B" : "#ddd"),
                    background: activeTab === t.key ? "#3D0B0B" : "#fff", color: activeTab === t.key ? "#fff" : "#555",
                    fontWeight: 700, fontSize: 12, cursor: "pointer",
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ─── DELIVERABLES ─── */}
              {activeTab === "deliverables" && (
                <div>
                  {Object.entries(phases).map(([phNum, phase]) => (
                    <div key={phNum} style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a0a0e", margin: "0 0 10px" }}>Phase {phNum}: {phase.name}</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {phase.items.map((d: any) => (
                          <div key={d.id} style={{ background: "#fff", border: `1px solid ${d.client_approved ? "#bbf7d0" : "#e8e0d8"}`, borderRadius: 10, padding: 16 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontWeight: 600, color: "#1a0a0e", fontSize: 13 }}>{d.deliverable_name}</div>
                                {d.client_approved && <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginTop: 2 }}>✓ Client Approved</div>}
                                {d.client_feedback && <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginTop: 2 }}>Feedback: {d.client_feedback}</div>}
                                {d.document_name && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>📄 {d.document_name} {d.shared_with_client ? "(shared)" : "(not shared)"}</div>}
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <select value={d.status} onChange={e => updateDeliverable(d.id, { status: e.target.value })} disabled={saving[d.id]}
                                  style={{ padding: "5px 8px", fontSize: 12, border: "1px solid #ddd", borderRadius: 6, background: STATUS_COLORS[d.status], color: "#fff", cursor: "pointer" }}>
                                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                </select>
                                <button onClick={() => { setUploadTarget(d.id); setTimeout(() => fileRef.current?.click(), 50); }}
                                  style={{ padding: "5px 10px", fontSize: 11, background: "#f8f6f1", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer" }}>
                                  📤 Upload
                                </button>
                                {d.document_url && (
                                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
                                    <input type="checkbox" checked={!!d.shared_with_client} onChange={e => updateDeliverable(d.id, { sharedWithClient: e.target.checked })} />
                                    Share
                                  </label>
                                )}
                              </div>
                            </div>
                            {uploadTarget === d.id && uploadFile && (
                              <div style={{ marginTop: 12, padding: "12px 14px", background: "#f8f6f1", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 12, flex: 1 }}>📄 {uploadFile.name}</span>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                                  <input type="checkbox" checked={shareOnUpload} onChange={e => setShareOnUpload(e.target.checked)} /> Share with client
                                </label>
                                <button onClick={() => handleUpload(d.id)} disabled={saving[d.id]} style={{ padding: "5px 12px", background: "#3D0B0B", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                                  {saving[d.id] ? "Uploading..." : "Upload"}
                                </button>
                                <button onClick={() => { setUploadTarget(null); setUploadFile(null); }} style={{ padding: "5px 12px", border: "1px solid #ddd", background: "#fff", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ─── MESSAGES ─── */}
              {activeTab === "messages" && (
                <div>
                  <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: "10px 10px 0 0", padding: 20, minHeight: 320, maxHeight: 440, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                    {messages.length === 0 && <div style={{ color: "#aaa", fontSize: 13, margin: "auto" }}>No messages yet</div>}
                    {messages.map((m: any) => {
                      const isEP = m.sender_type === "ep_team";
                      return (
                        <div key={m.id} style={{ display: "flex", flexDirection: isEP ? "row-reverse" : "row", gap: 10, alignItems: "flex-end" }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: isEP ? "#3D0B0B" : "#e8e0d8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isEP ? "#fff" : "#3D0B0B", flexShrink: 0 }}>
                            {m.sender_name?.charAt(0) || "?"}
                          </div>
                          <div style={{ maxWidth: "70%" }}>
                            <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3, textAlign: isEP ? "right" : "left" }}>
                              {m.sender_name} · {new Date(m.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                            </div>
                            <div style={{ padding: "9px 13px", background: isEP ? "#3D0B0B" : "#f8f6f1", color: isEP ? "#fff" : "#1a0a0e", borderRadius: isEP ? "12px 12px 4px 12px" : "12px 12px 12px 4px", fontSize: 13, lineHeight: 1.5 }}>
                              {m.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderTop: "none", borderRadius: "0 0 10px 10px", padding: 14, display: "flex", gap: 10 }}>
                    <textarea value={reply} onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      placeholder="Reply as EP Team..." rows={2}
                      style={{ flex: 1, padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, resize: "none", outline: "none", fontFamily: "Poppins, sans-serif" }} />
                    <button onClick={sendReply} disabled={replying || !reply.trim()}
                      style={{ padding: "0 18px", background: "#3D0B0B", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      {replying ? "..." : "Send"}
                    </button>
                  </div>
                </div>
              )}

              {/* ─── MEETINGS / CALENDAR ─── */}
              {activeTab === "meetings" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                    <Btn onClick={() => setShowMtgForm(!showMtgForm)} style={{ background: "#3D0B0B", color: "#fff" }}>+ Add Meeting</Btn>
                  </div>
                  {showMtgForm && (
                    <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 20, marginBottom: 18 }}>
                      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>New Meeting</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Input label="Title *" value={mtgTitle} onChange={setMtgTitle} />
                        <Input label="Date & Time" value={mtgDate} onChange={setMtgDate} type="datetime-local" />
                        <Input label="Duration (mins)" value={mtgDuration} onChange={setMtgDuration} type="number" />
                        <Input label="Location" value={mtgLocation} onChange={setMtgLocation} />
                        <div style={{ gridColumn: "1 / -1" }}>
                          <Input label="Meeting Link (Zoom, Teams, etc.)" value={mtgLink} onChange={setMtgLink} />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <TextArea label="Description" value={mtgDesc} onChange={setMtgDesc} rows={2} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <Btn onClick={addMeeting} disabled={mtgSaving || !mtgTitle.trim()} style={{ background: "#3D0B0B", color: "#fff" }}>
                          {mtgSaving ? "Saving..." : "Save Meeting"}
                        </Btn>
                        <Btn onClick={() => setShowMtgForm(false)} style={{ background: "#f3f4f6", color: "#555" }}>Cancel</Btn>
                      </div>
                    </div>
                  )}
                  {meetings.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa", fontSize: 14 }}>No meetings scheduled yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {meetings.map(m => {
                        const dateStr = m.meeting_date ? new Date(m.meeting_date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "TBC";
                        const responses = Array.isArray(m.responses) ? m.responses : [];
                        const accepted = responses.filter((r: any) => r?.response === "accepted");
                        const declined = responses.filter((r: any) => r?.response === "declined");
                        return (
                          <div key={m.id} style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: "16px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a", marginBottom: 4 }}>{m.title}</div>
                                <div style={{ fontSize: 13, color: "#666" }}>📅 {dateStr}{m.duration_minutes ? ` · ${m.duration_minutes} mins` : ""}</div>
                                {m.location && <div style={{ fontSize: 13, color: "#666" }}>📍 {m.location}</div>}
                                {m.meeting_link && <div style={{ fontSize: 12, marginTop: 2 }}><a href={m.meeting_link} target="_blank" rel="noopener noreferrer" style={{ color: "#3D0B0B" }}>Join link ↗</a></div>}
                                {m.description && <p style={{ fontSize: 13, color: "#555", margin: "8px 0 0" }}>{m.description}</p>}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                                {responses.length > 0 && (
                                  <div style={{ fontSize: 12, color: "#666" }}>
                                    {accepted.length > 0 && <span style={{ color: "#16a34a", marginRight: 8 }}>✓ {accepted.length} accepted</span>}
                                    {declined.length > 0 && <span style={{ color: "#dc2626" }}>✗ {declined.length} declined</span>}
                                  </div>
                                )}
                                <button onClick={() => deleteMeeting(m.id)} style={{ fontSize: 11, color: "#dc2626", background: "none", border: "1px solid #fecaca", borderRadius: 5, padding: "3px 10px", cursor: "pointer" }}>Delete</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── RISKS / PROJECT STATUS ─── */}
              {activeTab === "risks" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                    <Btn onClick={() => setShowRiskForm(!showRiskForm)} style={{ background: "#3D0B0B", color: "#fff" }}>+ Add Risk / Issue</Btn>
                  </div>
                  {showRiskForm && (
                    <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 20, marginBottom: 18 }}>
                      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>New Risk / Issue</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={{ gridColumn: "1 / -1" }}><Input label="Title *" value={riskTitle} onChange={setRiskTitle} /></div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Category</label>
                          <select value={riskCategory} onChange={e => setRiskCategory(e.target.value)}
                            style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, boxSizing: "border-box" as any }}>
                            <option value="risk">Risk</option>
                            <option value="issue">Issue</option>
                            <option value="dependency">Dependency</option>
                            <option value="assumption">Assumption</option>
                          </select>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 18 }}>
                            <input type="checkbox" checked={riskInternal} onChange={e => setRiskInternal(e.target.checked)} />
                            <span style={{ fontSize: 13, color: "#555" }}>Internal only (hide from client)</span>
                          </label>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}><TextArea label="Mitigation summary (visible to client)" value={riskMitigation} onChange={setRiskMitigation} /></div>
                        <div style={{ gridColumn: "1 / -1" }}><TextArea label="What EP is doing (visible to client)" value={riskAction} onChange={setRiskAction} /></div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <Btn onClick={addRisk} disabled={riskSaving || !riskTitle.trim()} style={{ background: "#3D0B0B", color: "#fff" }}>
                          {riskSaving ? "Saving..." : "Save"}
                        </Btn>
                        <Btn onClick={() => setShowRiskForm(false)} style={{ background: "#f3f4f6", color: "#555" }}>Cancel</Btn>
                      </div>
                    </div>
                  )}
                  {risks.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa", fontSize: 14 }}>No risks or issues logged</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {risks.map(r => {
                        const c = RISK_STATUS_COLORS[r.status] || RISK_STATUS_COLORS.open;
                        return (
                          <div key={r.id} style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: "14px 18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                                  <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{r.title}</span>
                                  <span style={{ background: c.bg, color: c.text, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{r.status}</span>
                                  <span style={{ background: "#f3f4f6", color: "#555", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>{r.category}</span>
                                  {r.is_internal && <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600 }}>Internal</span>}
                                </div>
                                {r.mitigation_summary && <p style={{ fontSize: 13, color: "#555", margin: "0 0 4px" }}>Mitigation: {r.mitigation_summary}</p>}
                                {r.ep_action && <p style={{ fontSize: 13, color: "#3730a3", margin: "0" }}>EP action: {r.ep_action}</p>}
                              </div>
                              {r.status !== "resolved" && (
                                <button onClick={() => resolveRisk(r.id)} style={{ fontSize: 11, color: "#16a34a", background: "none", border: "1px solid #bbf7d0", borderRadius: 5, padding: "3px 10px", cursor: "pointer", flexShrink: 0 }}>
                                  ✓ Resolve
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── INVOICES ─── */}
              {activeTab === "invoices" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                    <Btn onClick={() => setShowInvForm(!showInvForm)} style={{ background: "#3D0B0B", color: "#fff" }}>+ Add Invoice</Btn>
                  </div>
                  {showInvForm && (
                    <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 20, marginBottom: 18 }}>
                      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>New Invoice</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        <Input label="Invoice Ref *" value={invRef} onChange={setInvRef} placeholder="EP-2025-001" />
                        <Input label="Amount" value={invAmount} onChange={setInvAmount} type="number" placeholder="0.00" />
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Currency</label>
                          <select value={invCurrency} onChange={e => setInvCurrency(e.target.value)}
                            style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, boxSizing: "border-box" as any }}>
                            <option>GBP</option><option>NGN</option><option>USD</option><option>EUR</option>
                          </select>
                        </div>
                        <Input label="Date Issued" value={invIssued} onChange={setInvIssued} type="date" />
                        <Input label="Due Date" value={invDue} onChange={setInvDue} type="date" />
                        <div />
                        <div style={{ gridColumn: "1 / -1" }}><Input label="Document URL (PDF link)" value={invDocUrl} onChange={setInvDocUrl} /></div>
                        <div style={{ gridColumn: "1 / -1" }}><TextArea label="Description" value={invDesc} onChange={setInvDesc} /></div>
                        <div style={{ gridColumn: "1 / -1" }}><TextArea label="Internal Notes" value={invNotes} onChange={setInvNotes} /></div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <Btn onClick={addInvoice} disabled={invSaving || !invRef.trim()} style={{ background: "#3D0B0B", color: "#fff" }}>
                          {invSaving ? "Saving..." : "Save & Notify Client"}
                        </Btn>
                        <Btn onClick={() => setShowInvForm(false)} style={{ background: "#f3f4f6", color: "#555" }}>Cancel</Btn>
                      </div>
                    </div>
                  )}
                  {invoices.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa", fontSize: 14 }}>No invoices yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {invoices.map(inv => {
                        const bg = INV_STATUS_COLORS[inv.status] || "#f3f4f6";
                        return (
                          <div key={inv.id} style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", marginBottom: 2 }}>{inv.invoice_ref}</div>
                              {inv.description && <div style={{ fontSize: 13, color: "#555" }}>{inv.description}</div>}
                              <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
                                {inv.date_issued ? `Issued: ${new Date(inv.date_issued).toLocaleDateString("en-GB")}` : ""}
                                {inv.due_date ? ` · Due: ${new Date(inv.due_date).toLocaleDateString("en-GB")}` : ""}
                              </div>
                              {inv.document_url && <a href={inv.document_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#3D0B0B" }}>↓ PDF</a>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>
                                  {inv.amount ? new Intl.NumberFormat("en-GB", { style: "currency", currency: inv.currency || "GBP" }).format(inv.amount) : "—"}
                                </div>
                              </div>
                              <select value={inv.status} onChange={e => updateInvStatus(inv.id, e.target.value)}
                                style={{ padding: "5px 8px", fontSize: 12, border: "1px solid #ddd", borderRadius: 6, background: bg, cursor: "pointer" }}>
                                {["pending","sent","paid","overdue","cancelled"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── ACTIVITY LOG ─── */}
              {activeTab === "activity" && (
                <div>
                  {/* Add log entry */}
                  <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 16, marginBottom: 18 }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>Log an Activity</h4>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <div style={{ flex: "0 0 140px" }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Type</label>
                        <select value={logType} onChange={e => setLogType(e.target.value)}
                          style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, boxSizing: "border-box" as any }}>
                          <option value="note">Note</option>
                          <option value="call">Call</option>
                          <option value="email">Email</option>
                          <option value="meeting">Meeting</option>
                          <option value="update">Update</option>
                          <option value="approval">Approval</option>
                          <option value="payment">Payment</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Description</label>
                        <input type="text" value={logDesc} onChange={e => setLogDesc(e.target.value)} placeholder="What happened?"
                          onKeyDown={e => { if (e.key === "Enter") addLog(); }}
                          style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, boxSizing: "border-box" as any }} />
                      </div>
                      <Btn onClick={addLog} disabled={logSaving || !logDesc.trim()} style={{ background: "#3D0B0B", color: "#fff", flexShrink: 0 }}>
                        {logSaving ? "..." : "Log"}
                      </Btn>
                    </div>
                  </div>

                  {logs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa", fontSize: 14 }}>No activity logged yet</div>
                  ) : (
                    <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, overflow: "hidden" }}>
                      {logs.map((l, i) => {
                        const icons: Record<string, string> = { note: "📝", call: "📞", email: "📧", meeting: "📅", update: "🔄", approval: "✅", payment: "💳", meeting_created: "📅", meeting_accepted: "✅", meeting_declined: "❌", risk_added: "⚠️", invoice_issued: "📄", other: "•" };
                        return (
                          <div key={l.id} style={{ padding: "12px 18px", borderBottom: i < logs.length - 1 ? "1px solid #f3f0ec" : "none", display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icons[l.action_type] || "•"}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.5 }}>{l.description}</div>
                              <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                                {l.performed_by} · {new Date(l.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                              </div>
                            </div>
                            <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0, fontWeight: 600, textTransform: "uppercase" }}>{l.action_type?.replace(/_/g, " ")}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
