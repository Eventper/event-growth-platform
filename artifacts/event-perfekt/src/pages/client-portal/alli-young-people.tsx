import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { portalFetch, getPortalToken } from "@/lib/client-portal-auth";

const BG = "#1A0A0E";
const PANEL = "#2A1018";
const BORDER = "#4A2030";
const GOLD = "#E2C87A";
const WHITE = "#fff";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_consent:      { label: "Pending Consent",    color: "#6b7280" },
  consent_received:     { label: "Consent Received",   color: "#3b82f6" },
  assessment_scheduled: { label: "Assessment Sched.",  color: "#f59e0b" },
  assessment_complete:  { label: "Assessment Complete", color: "#8b5cf6" },
  matched_to_partner:   { label: "Matched to Partner", color: "#22c55e" },
  actively_supported:   { label: "Actively Supported", color: "#84cc16" },
  case_closed:          { label: "Case Closed",        color: "#374151" },
};

const PRIORITIES = ["low", "medium", "high", "urgent"];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const CONSENT_STATUSES = ["pending", "received", "withdrawn", "reviewed"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#6b7280" };
  return (
    <span style={{ background: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.color}55`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#6b7280" };
  const c = colors[priority?.toLowerCase()] || "#6b7280";
  return <span style={{ background: c + "22", color: c, border: `1px solid ${c}55`, borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{priority?.toUpperCase()}</span>;
}

function reqStatusConfig(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return { bg: "#fef3c7", color: "#92400e", label: "Pending" };
  if (s === "confirmed") return { bg: "#dcfce7", color: "#166534", label: "Confirmed" };
  if (s === "declined") return { bg: "#fee2e2", color: "#991b1b", label: "Declined" };
  return { bg: "#e5e7eb", color: "#374151", label: s };
}

function docIcon(type: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("pdf")) return "\ud83d\udcc4";
  if (t.includes("image") || t.includes("jpg") || t.includes("png")) return "\ud83d\uddbc\ufe0f";
  if (t.includes("word") || t.includes("doc")) return "\ud83d\udcdd";
  return "\ud83d\udcce";
}

// ── Inline editable helpers (dark theme) ──

function EText({ value, onSave, width = "100%", type = "text", placeholder = "" }: { value: string | number; onSave: (v: string) => void; width?: string | number; type?: string; placeholder?: string }) {
  const [v, setV] = useState(String(value ?? ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const original = String(value ?? "").trim();
  const changed = v.trim() !== original;
  useEffect(() => { setV(String(value ?? "")); setSaved(false); }, [value]);
  const doSave = async () => {
    const nv = v.trim();
    if (nv !== original) {
      setSaving(true);
      await onSave(nv);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", flex: 1 }}>
        <input type={type} value={v} placeholder={placeholder} onChange={e => { setV(e.target.value); setSaved(false); }} onBlur={doSave} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          style={{ width: "100%", fontSize: 13, border: changed ? "1.5px solid " + GOLD : "1px solid " + BORDER, borderRadius: 6, padding: "3px 6px", background: BG, color: WHITE, outline: "none" }} />
        {saving && <span style={{ position: "absolute", right: 4, top: 2, fontSize: 9, color: "#aaa" }}>saving…</span>}
      </div>
      {changed && (
        <button onClick={doSave} disabled={saving} style={{ background: GOLD, color: "#000", border: "none", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: saving ? 0.6 : 1 }}>
          {saving ? "…" : "Save"}
        </button>
      )}
      {saved && !changed && (
        <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, whiteSpace: "nowrap" }}>✓ Saved</span>
      )}
    </div>
  );
}

function ESelect({ value, options, onSave, width = "auto" }: { value: string; options: string[]; onSave: (v: string) => void; width?: string | number }) {
  const [v, setV] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const original = value || "";
  const changed = v !== original;
  useEffect(() => { setV(value || ""); setSaved(false); }, [value]);
  const doSave = async (nv: string) => {
    if (nv !== original) {
      setSaving(true);
      await onSave(nv);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select value={v} onChange={e => { const nv = e.target.value; setV(nv); setSaved(false); doSave(nv); }}
        style={{ flex: 1, fontSize: 13, border: changed ? "1.5px solid " + GOLD : "1px solid " + BORDER, borderRadius: 6, padding: "3px 6px", background: BG, color: WHITE, cursor: "pointer" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {saved && !changed && (
        <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, whiteSpace: "nowrap" }}>✓ Saved</span>
      )}
    </div>
  );
}

function EArea({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  return <EText value={value || ""} onSave={onSave} placeholder="e.g. Tower Hamlets, London" width="100%" />;
}

function ETextArea({ value, onSave, rows = 3, placeholder = "" }: { value: string | null | undefined; onSave: (v: string) => void; rows?: number; placeholder?: string }) {
  const [v, setV] = useState(String(value ?? ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const original = String(value ?? "").trim();
  const changed = v.trim() !== original;
  useEffect(() => { setV(String(value ?? "")); setSaved(false); }, [value]);
  const doSave = async () => {
    const nv = v.trim();
    if (nv !== original) {
      setSaving(true);
      await onSave(nv);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };
  return (
    <div>
      <div style={{ position: "relative" }}>
        <textarea value={v} onChange={e => { setV(e.target.value); setSaved(false); }} onBlur={doSave} rows={rows} placeholder={placeholder}
          style={{ width: "100%", fontSize: 13, border: changed ? "1.5px solid " + GOLD : "1px solid " + BORDER, borderRadius: 6, padding: "4px 6px", background: BG, color: WHITE, resize: "vertical", minHeight: 28 }} />
        {saving && <span style={{ position: "absolute", right: 4, top: 2, fontSize: 9, color: "#aaa" }}>saving…</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: changed ? GOLD : "rgba(255,255,255,0.4)" }}>{changed ? "Unsaved changes — press Enter or click Save" : saved ? "✓ Saved" : "Click to edit, then Save or press Enter"}</span>
        {changed && (
          <button onClick={doSave} disabled={saving} style={{ background: GOLD, color: "#000", border: "none", borderRadius: 5, padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        )}
        {saved && !changed && (
          <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ Saved</span>
        )}
      </div>
    </div>
  );
}

function ENotes({ value, onSave }: { value: string | null; onSave: (v: string) => void }) {
  return <ETextArea value={value || ""} onSave={onSave} rows={2} placeholder="Add notes…" />;
}

export default function AlliYoungPeoplePortal() {
  const [, setLocation] = useLocation();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState<number | null>(null);
  const [reqDate, setReqDate] = useState("");
  const [reqTime, setReqTime] = useState("");
  const [reqLocType, setReqLocType] = useState("in_person");
  const [reqLocDetail, setReqLocDetail] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [fName, setFName] = useState("");
  const [fAge, setFAge] = useState("");
  const [fGender, setFGender] = useState("");
  const [fArea, setFArea] = useState("");
  const [fSource, setFSource] = useState("Community");
  const [fCircumstances, setFCircumstances] = useState("");
  const [fReferrer, setFReferrer] = useState("");
  const [fConsent, setFConsent] = useState("Pending");
  const [fPriority, setFPriority] = useState("Medium");

  const [pendingEdits, setPendingEdits] = useState<Record<number, Record<string, { value: any; dirty: boolean }>>>({});
  const [savedFlash, setSavedFlash] = useState<Record<number, Record<string, number>>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    const token = getPortalToken();
    if (!token) { setLocation("/client-portal/login"); return; }
    portalFetch("GET", "/api/client-portal/alli/young-people").then(d => { setCases(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const loadDetail = async (c: any) => {
    setSelected(c);
    setDetail(null);
    const d = await portalFetch("GET", `/api/client-portal/alli/young-people/${c.id}`).catch(() => null);
    setDetail(d);
  };

  const saveField = async (id: number, patch: Record<string, any>) => {
    setSavingId(id);
    try {
      const updated = await portalFetch("PATCH", `/api/client-portal/alli/young-people/${id}`, patch);
      setCases(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      if (selected?.id === id) setSelected((s: Record<string, any>) => ({ ...s, ...updated }));
      if (detail?.id === id || detail?.id === undefined) setDetail((d: Record<string, any> | null) => d ? ({ ...d, ...updated }) : d);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSavingId(null);
    }
  };

  async function submitRequest(id: number) {
    if (!reqDate.trim()) { showToast("Please pick a date"); return; }
    setSubmitting(true);
    try {
      await portalFetch("POST", `/api/client-portal/alli/young-people/${id}/assessment-request`, {
        requested_date: reqDate, requested_time: reqTime || null, location_type: reqLocType,
        location_detail: reqLocDetail || null, notes: reqNotes || null,
      });
      showToast("Assessment request sent \u2713");
      setScheduleOpen(null);
      setReqDate(""); setReqTime(""); setReqLocType("in_person"); setReqLocDetail(""); setReqNotes("");
      const d = await portalFetch("GET", `/api/client-portal/alli/young-people/${id}`).catch(() => null);
      setDetail(d);
    } catch (e: any) { showToast(e.message || "Failed to send request"); }
    setSubmitting(false);
  }

  async function submitDocument(id: number) {
    const file = fileRef.current?.files?.[0];
    if (!file) { showToast("Please select a file"); return; }
    setUploadingDoc(true);
    try {
      const token = localStorage.getItem("portal_token");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_type", "case_document");
      fd.append("description", "");
      const res = await fetch(`/api/client-portal/alli/young-people/${id}/documents`, {
        method: "POST", headers: { Authorization: `Bearer ${token || ""}` }, body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      showToast("Document uploaded \u2713");
      if (fileRef.current) fileRef.current.value = "";
      const d = await portalFetch("GET", `/api/client-portal/alli/young-people/${id}`).catch(() => null);
      setDetail(d);
    } catch (e: any) { showToast(e.message || "Upload failed"); }
    setUploadingDoc(false);
  }

  const submitReferral = async () => {
    if (!fName.trim()) return showToast("First name required");
    if (fCircumstances.trim().length < 50) return showToast("Circumstances must be at least 50 characters");
    setSavingId(-1);
    try {
      await portalFetch("POST", "/api/client-portal/alli/young-people", {
        first_name: fName, age: fAge ? parseInt(fAge) : null, gender: fGender, area: fArea,
        referral_source: fSource, circumstances: fCircumstances, referring_person: fReferrer,
        consent_status: fConsent.toLowerCase(), priority: fPriority.toLowerCase(),
      });
      showToast("Referral saved \u2713");
      setShowForm(false);
      setFName(""); setFAge(""); setFGender(""); setFArea(""); setFCircumstances(""); setFReferrer("");
      setFConsent("Pending"); setFPriority("Medium"); setFSource("Community");
      const d = await portalFetch("GET", "/api/client-portal/alli/young-people").catch(() => []);
      setCases(Array.isArray(d) ? d : []);
    } catch (e: any) { showToast(e.message); }
    setSavingId(null);
  };

  // Card-level pending-edit helpers
  const getVal = (id: number, field: string, original: any) => {
    const p = pendingEdits[id]?.[field];
    return p ? p.value : original;
  };
  const isDirty = (id: number, field: string) => !!pendingEdits[id]?.[field]?.dirty;
  const setDirty = (id: number, field: string, value: any) => {
    setPendingEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: { value, dirty: true } } }));
  };
  const savePending = async (id: number, field: string) => {
    const val = pendingEdits[id]?.[field]?.value;
    if (val === undefined) return;
    await saveField(id, { [field]: val });
    setPendingEdits(prev => {
      const card = { ...prev[id] };
      delete card[field];
      return { ...prev, [id]: card };
    });
    setSavedFlash(prev => ({ ...prev, [id]: { ...prev[id], [field]: Date.now() } }));
  };

  const SaveBtn = ({ id, field }: { id: number; field: string }) => {
    const dirty = isDirty(id, field);
    const flash = savedFlash[id]?.[field];
    const showFlash = flash && Date.now() - flash < 2500;
    if (!dirty && !showFlash) return null;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 6 }}>
        {dirty && (
          <button onClick={() => savePending(id, field)} disabled={savingId === id}
            style={{ background: GOLD, color: "#000", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
            {savingId === id ? "Saving\u2026" : "Save"}
          </button>
        )}
        {showFlash && <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 700 }}>\u2713 Saved</span>}
      </span>
    );
  };

  const filtered = cases.filter(c => {
    const matchSearch = !search || c.first_name?.toLowerCase().includes(search.toLowerCase()) || c.reference_number?.toLowerCase().includes(search.toLowerCase()) || c.area?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const allDocs = (detail?.documents || []).concat(detail?.consent_docs || []).sort((a: any, b: any) =>
    new Date(b.uploaded_at || b.created_at || 0).getTime() - new Date(a.uploaded_at || a.created_at || 0).getTime()
  );

  return (
    <PortalLayout>
      <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Poppins', sans-serif", padding: 32 }}>
        {toast && <div style={{ position: "fixed", top: 20, right: 20, background: GOLD, color: "#000", padding: "12px 18px", borderRadius: 8, fontWeight: 700, zIndex: 9999 }}>{toast}</div>}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ color: WHITE, fontSize: 28, fontWeight: 800, margin: 0 }}>Case Management</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>ALLI Foundation \u2014 Referral & Case Tracking</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ background: GOLD, color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>+ New Referral</button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ref or area..." style={{ flex: 1, minWidth: 200, padding: "8px 12px", background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: WHITE, fontSize: 13 }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "8px 12px", background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: WHITE, fontSize: 13 }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Summary bar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => {
            const cnt = cases.filter(c => c.status === k).length;
            return (
              <div key={k} onClick={() => setFilterStatus(filterStatus === k ? "all" : k)} style={{ background: PANEL, border: `1px solid ${filterStatus === k ? GOLD : BORDER}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer", minWidth: 120, textAlign: "center" }}>
                <div style={{ color: v.color, fontSize: 22, fontWeight: 800 }}>{cnt}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600 }}>{v.label}</div>
              </div>
            );
          })}
        </div>

        {/* Master-detail layout */}
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 460px" : "1fr", gap: 16 }}>

          {/* Case list */}
          <div>
            {loading ? (
              <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 60 }}>Loading cases\u2026</div>
            ) : filtered.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 60 }}>No cases found. Click "New Referral" to add one.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
                {filtered.map(c => {
                  const isEditing = editingId === c.id;
                  return (
                    <div key={c.id} onClick={() => selected?.id === c.id ? setSelected(null) : loadDetail(c)} style={{ background: PANEL, border: `1px solid ${selected?.id === c.id ? GOLD : isEditing ? GOLD : BORDER}`, borderRadius: 12, padding: 18, position: "relative", cursor: "pointer" }}>
                      {/* Header row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{c.reference_number}</div>
                          <div style={{ color: WHITE, fontWeight: 700, fontSize: 16 }}>{c.first_name}</div>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                              <input type="number" value={getVal(c.id, "age", c.age ?? "")} onChange={e => setDirty(c.id, "age", e.target.value ? parseInt(e.target.value) : null)} placeholder="Age" style={{ width: 60, padding: "4px 8px", background: BG, border: `1px solid ${isDirty(c.id, "age") ? GOLD : BORDER}`, borderRadius: 6, color: WHITE, fontSize: 12 }} />
                              <SaveBtn id={c.id} field="age" />
                              <input value={getVal(c.id, "area", c.area || "")} onChange={e => setDirty(c.id, "area", e.target.value)} placeholder="Area" style={{ flex: 1, padding: "4px 8px", background: BG, border: `1px solid ${isDirty(c.id, "area") ? GOLD : BORDER}`, borderRadius: 6, color: WHITE, fontSize: 12 }} />
                              <SaveBtn id={c.id} field="area" />
                            </div>
                          ) : (
                            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{c.age ? `Age ${c.age}` : "Age unknown"} \u00b7 {c.area || "Area unknown"}</div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <select value={getVal(c.id, "priority", c.priority || "medium")} onChange={e => setDirty(c.id, "priority", e.target.value)} style={{ padding: "3px 8px", background: BG, border: `1px solid ${isDirty(c.id, "priority") ? GOLD : BORDER}`, borderRadius: 6, color: WHITE, fontSize: 11 }}>
                                {PRIORITIES.map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
                              </select>
                              <SaveBtn id={c.id} field="priority" />
                            </div>
                          ) : (
                            <PriorityBadge priority={c.priority} />
                          )}
                          <button onClick={e => { e.stopPropagation(); setEditingId(isEditing ? null : c.id); }} style={{ background: "none", border: "none", color: GOLD, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                            {isEditing ? "Done" : "Edit"}
                          </button>
                        </div>
                      </div>

                      {/* Status + Source row */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <select value={getVal(c.id, "status", c.status || "pending_consent")} onChange={e => setDirty(c.id, "status", e.target.value)} style={{ padding: "4px 10px", background: BG, border: `1px solid ${isDirty(c.id, "status") ? GOLD : BORDER}`, borderRadius: 999, color: WHITE, fontSize: 11, fontWeight: 600 }}>
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <SaveBtn id={c.id} field="status" />
                          </div>
                        ) : (
                          <StatusBadge status={c.status} />
                        )}
                        {isEditing ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <select value={getVal(c.id, "referral_source", c.referral_source || "")} onChange={e => setDirty(c.id, "referral_source", e.target.value)} style={{ padding: "4px 10px", background: BG, border: `1px solid ${isDirty(c.id, "referral_source") ? GOLD : BORDER}`, borderRadius: 999, color: WHITE, fontSize: 11 }}>
                              {["Community", "Family", "School", "NHS", "Police", "Self", "Jibowu", "Other"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <SaveBtn id={c.id} field="referral_source" />
                          </div>
                        ) : (
                          <span style={{ background: "#ffffff11", color: "rgba(255,255,255,0.7)", borderRadius: 999, padding: "2px 10px", fontSize: 11 }}>{c.referral_source || "Unknown source"}</span>
                        )}
                      </div>

                      {/* Meta row */}
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 8 }}>
                        Referred {c.referral_date ? new Date(c.referral_date).toLocaleDateString("en-GB") : "\u2014"}
                        {isEditing ? (
                          <span style={{ marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            Assigned: <input value={getVal(c.id, "assigned_to", c.assigned_to || "")} onChange={e => setDirty(c.id, "assigned_to", e.target.value)} placeholder="Name" style={{ width: 120, padding: "3px 6px", background: BG, border: `1px solid ${isDirty(c.id, "assigned_to") ? GOLD : BORDER}`, borderRadius: 6, color: WHITE, fontSize: 11 }} />
                            <SaveBtn id={c.id} field="assigned_to" />
                          </span>
                        ) : (
                          <span> \u00b7 Assigned to: {c.assigned_to || "Unassigned"}</span>
                        )}
                      </div>

                      {/* Circumstances */}
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                        {isEditing ? (
                          <div>
                            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, display: "block", marginBottom: 3 }}>
                              Circumstances <SaveBtn id={c.id} field="circumstances" />
                            </label>
                            <textarea
                              value={getVal(c.id, "circumstances", c.circumstances || "")}
                              onChange={e => setDirty(c.id, "circumstances", e.target.value)}
                              onBlur={e => { if (isDirty(c.id, "circumstances")) savePending(c.id, "circumstances"); }}
                              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && isDirty(c.id, "circumstances")) { e.preventDefault(); savePending(c.id, "circumstances"); } }}
                              rows={3}
                              placeholder="Describe circumstances... (Press Enter or click Save to save)"
                              style={{ width: "100%", padding: "6px 8px", background: BG, border: `1px solid ${isDirty(c.id, "circumstances") ? GOLD : BORDER}`, borderRadius: 6, color: WHITE, fontSize: 12, resize: "vertical", fontFamily: "Poppins, sans-serif", boxSizing: "border-box" }}
                            />
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{c.circumstances || "No circumstances recorded."}</div>
                        )}
                      </div>

                      {/* Notes */}
                      <div style={{ marginTop: 8 }}>
                        {isEditing ? (
                          <div>
                            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, display: "block", marginBottom: 3 }}>
                              Notes <SaveBtn id={c.id} field="notes" />
                            </label>
                            <textarea
                              value={getVal(c.id, "notes", c.notes || "")}
                              onChange={e => setDirty(c.id, "notes", e.target.value)}
                              onBlur={e => { if (isDirty(c.id, "notes")) savePending(c.id, "notes"); }}
                              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && isDirty(c.id, "notes")) { e.preventDefault(); savePending(c.id, "notes"); } }}
                              rows={2}
                              placeholder="Log updates, decisions, contact outcomes... (Press Enter or click Save to save)"
                              style={{ width: "100%", padding: "6px 8px", background: BG, border: `1px solid ${isDirty(c.id, "notes") ? GOLD : BORDER}`, borderRadius: 6, color: WHITE, fontSize: 12, resize: "vertical", fontFamily: "Poppins, sans-serif", boxSizing: "border-box" }}
                            />
                          </div>
                        ) : c.notes ? (
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                            <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>Notes:</span> {c.notes}
                          </div>
                        ) : null}
                      </div>

                      {savingId === c.id && <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, marginTop: 6, display: "block" }}>Saving\u2026</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, height: "fit-content" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: WHITE, fontSize: 18, fontWeight: 800 }}>{selected.first_name}</h3>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>\u00d7</button>
              </div>

              {!detail ? <p style={{ color: "rgba(255,255,255,0.5)" }}>Loading\u2026</p> : (
                <>
                  {/* Status + Case Owner */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Status</div>
                      <ESelect value={detail.status || "pending_consent"} options={Object.keys(STATUS_CONFIG)} onSave={v => saveField(selected.id, { status: v })} width="100%" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Case Owner</div>
                      <EText value={detail.assigned_to || ""} onSave={v => saveField(selected.id, { assigned_to: v })} placeholder="e.g. Kehinde Alli" />
                    </div>
                  </div>

                  {/* Core fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>First Name</div>
                      <EText value={detail.first_name || ""} onSave={v => saveField(selected.id, { first_name: v })} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Reference</div>
                      <EText value={detail.reference_number || ""} onSave={v => saveField(selected.id, { reference_number: v })} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Age</div>
                      <EText value={detail.age ?? ""} onSave={v => saveField(selected.id, { age: v ? parseInt(v) : null })} type="number" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Gender</div>
                      <ESelect value={detail.gender || "Prefer not to say"} options={GENDERS} onSave={v => saveField(selected.id, { gender: v })} width="100%" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Area</div>
                      <EArea value={detail.area || ""} onSave={v => saveField(selected.id, { area: v })} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Referral Source</div>
                      <EText value={detail.referral_source || ""} onSave={v => saveField(selected.id, { referral_source: v })} placeholder="e.g. Social services" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Referral Date</div>
                      <EText type="date" value={detail.referral_date ? detail.referral_date.slice(0,10) : ""} onSave={v => saveField(selected.id, { referral_date: v || null })} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Priority</div>
                      <ESelect value={detail.priority || "medium"} options={PRIORITIES} onSave={v => saveField(selected.id, { priority: v })} width="100%" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Referring Person</div>
                      <EText value={detail.referring_person || ""} onSave={v => saveField(selected.id, { referring_person: v })} placeholder="Name of referrer" />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Consent Status</div>
                      <ESelect value={detail.consent_status || "pending"} options={CONSENT_STATUSES} onSave={v => saveField(selected.id, { consent_status: v })} width="100%" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Case Owner</div>
                      <EText value={detail.assigned_to || ""} onSave={v => saveField(selected.id, { assigned_to: v })} placeholder="e.g. Kehinde Alli" />
                    </div>
                  </div>

                  {/* Circumstances */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Circumstances</div>
                    <ETextArea value={detail.circumstances || ""} onSave={v => saveField(selected.id, { circumstances: v })} rows={4} placeholder="Describe circumstances and needs\u2026" />
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 3 }}>Notes</div>
                    <ENotes value={detail.notes} onSave={v => saveField(selected.id, { notes: v })} />
                  </div>

                  {/* Schedule Assessment */}
                  <div style={{ marginTop: 10, marginBottom: 10 }}>
                    <button onClick={() => setScheduleOpen(selected.id)} style={{ background: GOLD, color: "#000", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                      \ud83d\udcc5 Schedule Assessment
                    </button>
                  </div>

                  {/* Assessment requests */}
                  {detail.assessment_requests?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 8 }}>Assessment Requests</div>
                      {detail.assessment_requests.map((r: any) => {
                        const st = reqStatusConfig(r.status);
                        return (
                          <div key={r.id} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>
                                {new Date(r.requested_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                {r.requested_time ? ` at ${r.requested_time}` : ""}
                              </span>
                              <span style={{ background: st.bg, color: st.color, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>By {r.requested_by || "Trustee"} \u00b7 {r.location_type?.replace("_", " ") || "In person"}</div>
                            {r.notes && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4, fontStyle: "italic" }}>\u201c{r.notes}\u201d</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Templates */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 8 }}>Case Templates</div>
                    {[
                      { name: "D10 \u2014 Intake Form", file: "/templates/D10_Intake_Form.txt" },
                      { name: "D17B \u2014 Consent Form", file: "/templates/D17B_Consent_Form.txt" },
                      { name: "D17A \u2014 Safeguarding Assessment", file: "/templates/D17A_Safeguarding_Form.txt" },
                    ].map(t => (
                      <div key={t.file} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: BG, borderRadius: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>{"\ud83d\udcc4"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>{t.name}</div></div>
                        <a href={t.file} download style={{ fontSize: 11, fontWeight: 700, color: GOLD, textDecoration: "none", whiteSpace: "nowrap" }}>Download</a>
                      </div>
                    ))}
                  </div>

                  {/* Documents */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Documents</div>
                      <button onClick={() => fileRef.current?.click()} disabled={uploadingDoc} style={{ background: "none", border: "none", color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{uploadingDoc ? "Uploading\u2026" : "+ Upload"}</button>
                    </div>
                    <input ref={fileRef} type="file" style={{ display: "none" }} onChange={() => selected?.id && submitDocument(selected.id)} />
                    {allDocs.length === 0 ? (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", padding: "10px 0" }}>No documents yet. Click "+ Upload" to add one.</div>
                    ) : allDocs.map((d: any) => (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: BG, borderRadius: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>{docIcon(d.document_type)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: WHITE, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.file_name || d.filename || d.document_type || "Document"}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{d.document_type?.replace(/_/g, " ") || "Document"} \u00b7 {d.uploaded_by || d.uploaded_by_name || "Trustee"}</div>
                        </div>
                        <a href={d.file_url || d.file_path || "#"} target="_blank" rel="noopener noreferrer" download style={{ fontSize: 11, fontWeight: 700, color: GOLD, textDecoration: "none", whiteSpace: "nowrap" }}>Download</a>
                      </div>
                    ))}
                  </div>

                  {detail.assessment && (
                    <div style={{ background: BG, borderRadius: 8, padding: 14, marginTop: 12, border: `1px solid ${BORDER}` }}>
                      <div style={{ color: GOLD, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Assessment Summary</div>
                      {[
                        { l: "Risk Level", v: detail.assessment.risk_level },
                        { l: "Immediate Needs", v: detail.assessment.immediate_needs },
                        { l: "Recommended Intervention", v: detail.assessment.recommended_intervention },
                      ].map(f => f.v ? <div key={f.l} style={{ marginBottom: 6 }}><div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{f.l}</div><div style={{ color: WHITE, fontSize: 13 }}>{f.v}</div></div> : null)}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* New Referral Modal */}
        {showForm && (
          <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
              <h2 style={{ color: WHITE, margin: "0 0 20px" }}>New Referral</h2>
              {[
                { label: "First Name *", val: fName, set: setFName, placeholder: "First name only \u2014 no surnames" },
                { label: "Age", val: fAge, set: setFAge, placeholder: "e.g. 17", type: "number" },
                { label: "Area (London borough or postcode district)", val: fArea, set: setFArea, placeholder: "e.g. Hackney, E8" },
                { label: "Referring Person Name & Contact (optional)", val: fReferrer, set: setFReferrer, placeholder: "Name and phone/email" },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 12 }}>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type || "text"} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Gender</label>
                  <select value={fGender} onChange={e => setFGender(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }}>
                    <option value="">Prefer not to say</option>
                    {["Male", "Female", "Non-binary", "Other"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Referral Source</label>
                  <select value={fSource} onChange={e => setFSource(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }}>
                    {["Community", "Family", "School", "NHS", "Police", "Self", "Jibowu", "Other"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Consent Status</label>
                  <select value={fConsent} onChange={e => setFConsent(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }}>
                    {CONSENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Priority</label>
                  <select value={fPriority} onChange={e => setFPriority(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Brief Circumstances * (min 50 characters)</label>
                <textarea value={fCircumstances} onChange={e => setFCircumstances(e.target.value)} rows={4} placeholder="Describe the young person's circumstances and why they have been referred..." style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${fCircumstances.length > 0 && fCircumstances.length < 50 ? "#ef4444" : BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13, resize: "vertical", fontFamily: "Poppins, sans-serif", boxSizing: "border-box" }} />
                <div style={{ fontSize: 11, color: fCircumstances.length < 50 ? "#ef4444" : "#22c55e" }}>{fCircumstances.length}/50 characters minimum</div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={submitReferral} disabled={savingId === -1} style={{ flex: 1, background: GOLD, color: "#000", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
                  {savingId === -1 ? "Saving\u2026" : "Save Referral"}
                </button>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "11px 0", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Assessment Modal */}
        {scheduleOpen !== null && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: WHITE }}>Schedule Assessment</h3>
                <button onClick={() => setScheduleOpen(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>\u00d7</button>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Pick a preferred date and time. The delivery team will confirm and send you a meeting link.</p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 6 }}>Preferred Date *</label>
                <input type="date" value={reqDate} min={minDate} onChange={e => setReqDate(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, color: WHITE, background: BG }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 6 }}>Preferred Time</label>
                <input type="time" value={reqTime} onChange={e => setReqTime(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, color: WHITE, background: BG }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 6 }}>Location</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[{ k: "in_person", l: "In Person" }, { k: "video_call", l: "Video Call" }].map(opt => (
                    <label key={opt.k} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", border: `1px solid ${reqLocType === opt.k ? GOLD : BORDER}`, borderRadius: 8, cursor: "pointer", background: reqLocType === opt.k ? "#2A1018" : BG }}>
                      <input type="radio" name="loc" value={opt.k} checked={reqLocType === opt.k} onChange={() => setReqLocType(opt.k)} />
                      <span style={{ fontSize: 13, color: WHITE }}>{opt.l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 6 }}>Location Detail (optional)</label>
                <input type="text" value={reqLocDetail} onChange={e => setReqLocDetail(e.target.value)} placeholder={reqLocType === "in_person" ? "e.g. ALLI Centre, London" : "e.g. Zoom link preference"} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, color: WHITE, background: BG }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 6 }}>Notes (optional)</label>
                <textarea value={reqNotes} onChange={e => setReqNotes(e.target.value)} rows={3} placeholder="Anything the team should know before the assessment\u2026" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, color: WHITE, background: BG, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setScheduleOpen(null)} style={{ flex: 1, background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => submitRequest(scheduleOpen)} disabled={submitting} style={{ flex: 1, background: GOLD, color: "#000", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>{submitting ? "Sending\u2026" : "Send Request"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
