import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { portalFetch, getPortalToken } from "@/lib/client-portal-auth";

const BG = "#1A0A0E";
const PANEL = "#2A1018";
const BORDER = "#4A2030";
const GOLD = "#E2C87A";
const WHITE = "#fff";

const STATUSES = [
  "Not started",
  "In preparation",
  "Submitted",
  "Pending decision",
  "Successful",
  "Declined \u2014 revisit",
  "Closed",
];

const STATUS_COLORS: Record<string, string> = {
  "Not started": "#6b7280",
  "In preparation": "#3b82f6",
  "Submitted": "#8b5cf6",
  "Pending decision": "#f59e0b",
  "Successful": "#22c55e",
  "Declined \u2014 revisit": "#ef4444",
  "Closed": "#374151",
};

const TIERS = ["Tier 1", "Tier 2", "Tier 3"];
const OWNERS = ["ALLI Foundation", "Trustees", "DSL", "Project Lead", "Operations"];

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "#6b7280";
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {status || "Unknown"}
    </span>
  );
}

export default function AlliFundersPortal() {
  const [, setLocation] = useLocation();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState("");
  const [gateResolved, setGateResolved] = useState(false);
  const [gateLoading, setGateLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const downloadGuide = () => {
    const content = `ALLI FOUNDATION — FUNDER APPLICATION GUIDE
Generated: ${new Date().toLocaleDateString("en-GB")}

1. TIER DEFINITIONS
   Tier 1 means this funder is essential and we must apply. Strong match, high value, aligned with our mission.
   Tier 2 means apply when their window opens. Good match, moderate value.
   Tier 3 means watch them and only apply if an opportunity comes up. Uncertain match or low value.

2. STATUS PIPELINE
   Not started means research only. Do not move past this until the Trustee approval gate is resolved.
   In preparation means we are drafting the application. Use Notes to log progress.
   Submitted means the application is sent. Note the date in Date Submitted.
   Pending decision means we are waiting for an outcome. Set a chase date in Next Action.
   Successful means the award is received. Log the amount awarded and start delivery reporting.
   Declined means we log their feedback and review again in 12 months if the funder re-opens.
   Closed means we are no longer pursuing. Archive with a final note.

3. TRUSTEE APPROVAL GATE
   Before any funder can move from Not started to In preparation,
   a Trustee must complete the governance check.
   Email kehindeballi@gmail.com or agboola@jobtrolley.co to request approval.
   The system will block the status change until the gate is released.

4. APPLICATION CHECKLIST
   [ ] Funder name and tier confirmed
   [ ] Eligibility reviewed — does ALLI qualify?
   [ ] Fit for ALLI written in 2-3 sentences
   [ ] Route In identified (portal, email, referral, open call)
   [ ] Application URL or contact email saved
   [ ] When to Apply confirmed (quarterly, annual, rolling, etc.)
   [ ] Owner assigned (Trustee or Project Lead)
   [ ] Amount sought entered in Amount Applied For

5. DOCUMENTATION RULES
   - Every status change must have a dated note explaining the decision.
   - Upload draft applications and funder correspondence to Documents.
   - If awarded, create a Milestone Sign-off item for delivery reporting.

6. BOROUGH STRATEGY (MOPAC LCPF)
   Each MOPAC borough (Lambeth, Lewisham, Southwark) has its own LCPF window.
   Apply to each borough separately — they do not cross-qualify.
   Coordinate with the Partner Directory so borough partners can endorse applications.

7. ESCALATION
   If a funder requires a partner reference, use the Partner Directory
   to identify the right borough partner and request a co-sign or endorsement.

This guide applies to every funder record in this directory.
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ALLI-Funder-Application-Guide.txt";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Guide downloaded \u2713");
  };

  // Form fields
  const [fName, setFName] = useState("");
  const [fTier, setFTier] = useState("Tier 2");
  const [fGrantRange, setFGrantRange] = useState("");
  const [fEligibility, setFEligibility] = useState("");
  const [fFit, setFFit] = useState("");
  const [fRouteIn, setFRouteIn] = useState("");
  const [fContact, setFContact] = useState("");
  const [fAppUrl, setFAppUrl] = useState("");
  const [fWhenApply, setFWhenApply] = useState("");
  const [fStatus, setFStatus] = useState("Not started");
  const [fOwner, setFOwner] = useState("ALLI Foundation");
  const [fAmountApplied, setFAmountApplied] = useState("");
  const [fAmountAwarded, setFAmountAwarded] = useState("");
  const [fDateSubmitted, setFDateSubmitted] = useState("");
  const [fDecisionDate, setFDecisionDate] = useState("");
  const [fNextDate, setFNextDate] = useState("");
  const [fNextAction, setFNextAction] = useState("");
  const [fNotes, setFNotes] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const load = async () => {
    const token = getPortalToken();
    if (!token) { setLocation("/client-portal/login"); return; }
    try {
      const [d, gate] = await Promise.all([
        portalFetch("GET", "/api/client-portal/alli/funders").catch(() => []),
        portalFetch("GET", "/api/client-portal/alli/governance/gate").catch(() => ({ resolved: false })),
      ]);
      setRecords(Array.isArray(d) ? d : []);
      setGateResolved(!!gate?.resolved);
    } catch (e: any) { showToast(e.message); }
    setLoading(false);
    setGateLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setFName(""); setFTier("Tier 2"); setFGrantRange(""); setFEligibility(""); setFFit(""); setFRouteIn("");
    setFContact(""); setFAppUrl(""); setFWhenApply(""); setFStatus("Not started"); setFOwner("ALLI Foundation");
    setFAmountApplied(""); setFAmountAwarded(""); setFDateSubmitted(""); setFDecisionDate("");
    setFNextDate(""); setFNextAction(""); setFNotes("");
    setEditingId(null); setConfirmDelete(false);
  };

  const openAdd = () => { resetForm(); setModalOpen(true); };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setFName(r.name || "");
    setFTier(r.tier || "Tier 2");
    setFGrantRange(r.grant_range || "");
    setFEligibility(r.eligibility || "");
    setFFit(r.fit_for_alli || "");
    setFRouteIn(r.route_in || "");
    setFContact(r.contact || "");
    setFAppUrl(r.application_url || "");
    setFWhenApply(r.when_to_apply || "");
    setFStatus(r.status || "Not started");
    setFOwner(r.owner || "ALLI Foundation");
    setFAmountApplied(r.amount_applied_for ? String(r.amount_applied_for) : "");
    setFAmountAwarded(r.amount_awarded ? String(r.amount_awarded) : "");
    setFDateSubmitted(r.date_submitted ? r.date_submitted.slice(0, 10) : "");
    setFDecisionDate(r.decision_date ? r.decision_date.slice(0, 10) : "");
    setFNextDate(r.next_action_date ? r.next_action_date.slice(0, 10) : "");
    setFNextAction(r.next_action || "");
    setFNotes("");
    setConfirmDelete(false);
    setModalOpen(true);
  };

  const validateForm = () => {
    if (!fName.trim()) { showToast("Funder Name is required"); return false; }
    if (!fTier.trim()) { showToast("Tier is required"); return false; }
    const contact = fContact.trim();
    if (contact && (contact.includes("example.com") || contact.includes("@example"))) { showToast("Please enter a valid contact or leave blank"); return false; }
    return true;
  };

  const submit = async () => {
    if (!validateForm()) return;
    setSaving(true);
    const payload = {
      name: fName.trim(),
      tier: fTier,
      grant_range: fGrantRange.trim() || null,
      eligibility: fEligibility.trim() || null,
      fit_for_alli: fFit.trim() || null,
      route_in: fRouteIn.trim() || null,
      contact: fContact.trim() || null,
      application_url: fAppUrl.trim() || null,
      when_to_apply: fWhenApply.trim() || null,
      status: fStatus,
      owner: fOwner,
      amount_applied_for: fAmountApplied ? parseFloat(fAmountApplied) : null,
      amount_awarded: fAmountAwarded ? parseFloat(fAmountAwarded) : null,
      date_submitted: fDateSubmitted || null,
      decision_date: fDecisionDate || null,
      next_action_date: fNextDate || null,
      next_action: fNextAction.trim() || null,
      notes: fNotes.trim() || null,
    };
    try {
      if (editingId) {
        await portalFetch("PATCH", `/api/client-portal/alli/funders/${editingId}`, payload);
        showToast("Funder updated \u2713");
      } else {
        await portalFetch("POST", "/api/client-portal/alli/funders", payload);
        showToast("Funder added \u2713");
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      showToast(e.message || "Save failed");
    }
    setSaving(false);
  };

  const doDelete = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await portalFetch("DELETE", `/api/client-portal/alli/funders/${editingId}`);
      showToast("Funder deleted");
      setModalOpen(false);
      resetForm();
      load();
    } catch (e: any) { showToast(e.message || "Delete failed"); }
    setSaving(false);
  };

  const filtered = records.filter(r => {
    const matchS = filterStatus === "all" || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchQ = !q || (r.name?.toLowerCase().includes(q) || r.tier?.toLowerCase().includes(q) || r.grant_range?.toLowerCase().includes(q));
    return matchS && matchQ;
  });

  return (
    <PortalLayout>
      <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Poppins', sans-serif", padding: 32 }}>
        {toast && <div style={{ position: "fixed", top: 20, right: 20, background: GOLD, color: "#000", padding: "12px 18px", borderRadius: 8, fontWeight: 700, zIndex: 9999 }}>{toast}</div>}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ color: WHITE, fontSize: 28, fontWeight: 800, margin: 0 }}>Funder Directory</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>ALLI Foundation \u2014 Funding Pipeline & Grants</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowGuide(!showGuide)} style={{ background: "transparent", color: GOLD, border: `1px solid ${GOLD}`, borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{showGuide ? "Hide Guide" : "📚 Funder Guide"}</button>
            <button onClick={openAdd} style={{ background: GOLD, color: "#000", "border": "none", borderRadius: 8, padding: "10px 20px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>+ Add Funder</button>
          </div>
        </div>

        {/* Guide Panel */}
        {showGuide && (
          <div style={{ background: PANEL, border: `1px solid ${GOLD}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: GOLD, margin: 0, fontSize: 16, fontWeight: 800 }}>📚 ALLI Funder Application Guide</h3>
              <button onClick={downloadGuide} style={{ background: GOLD, color: "#000", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Download</button>
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 1.7, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <h4 style={{ color: WHITE, margin: "0 0 6px", fontSize: 12 }}>1. Tier Definitions</h4>
                <p style={{ margin: 0 }}>Tier 1 means this funder is essential and we must apply to them. They are a strong match for our mission and offer high value. Tier 2 means they are a good match and we should apply when their window opens. Tier 3 means we will watch them and only apply if an opportunity comes up.</p>
                <h4 style={{ color: WHITE, margin: "12px 0 6px", fontSize: 12 }}>2. Status Pipeline</h4>
                <p style={{ margin: 0 }}>Not started means we are only researching. In preparation means we are drafting the application. Submitted means the application is sent and we note the date. Pending means we are waiting for a decision and we should chase. Successful means we got the award and we start delivery reporting. Declined means we log their feedback and review again in 12 months. Closed means we are no longer pursuing and we archive with a final note.</p>
              </div>
              <div>
                <h4 style={{ color: WHITE, margin: "0 0 6px", fontSize: 12 }}>3. Trustee Approval Gate</h4>
                <p style={{ margin: 0 }}>Before a funder can move from Not started to In preparation, a Trustee must complete the governance check. Email kehindeballi@gmail.com or agboola@jobtrolley.co to request approval. The system will block the status change until the gate is released.</p>
                <h4 style={{ color: WHITE, margin: "12px 0 6px", fontSize: 12 }}>4. Application Checklist</h4>
                <p style={{ margin: 0 }}>Confirm the funder name and tier. Review eligibility. Write a Fit for ALLI summary. Identify the Route In. Save the application URL or contact. Confirm when to apply. Assign an owner. Enter the amount sought.</p>
              </div>
            </div>
          </div>
        )}

        {/* Trustee Approval Gate Banner */}
        {!gateResolved && (
          <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>\u26a0\ufe0f</span>
            <div>
              <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 700 }}>Trustee Approval Gate Active</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>A funder cannot move from Not started until a Trustee completes the governance check. Email a Trustee to request approval.</div>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, tier or grant range..." style={{ width: "100%", padding: "8px 12px", background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: WHITE, fontSize: 13 }} />
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {STATUSES.map(s => {
            const cnt = records.filter(r => r.status === s).length;
            const color = STATUS_COLORS[s] || "#6b7280";
            return (
              <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)} style={{ background: PANEL, border: `1px solid ${filterStatus === s ? GOLD : BORDER}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer", minWidth: 120, textAlign: "center" }}>
                <div style={{ color, fontSize: 22, fontWeight: 800 }}>{cnt}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600 }}>{s}</div>
              </div>
            );
          })}
        </div>

        {/* Records */}
        {loading || gateLoading ? (
          <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 60 }}>Loading funders\u2026</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 60 }}>No funders found. Click "+ Add Funder" to add one.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
            {filtered.map(r => (
              <div key={r.id} onClick={() => openEdit(r)} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, cursor: "pointer", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ color: WHITE, fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{r.name}</div>
                    <div style={{ color: GOLD, fontSize: 11, fontWeight: 700 }}>{r.tier || "Tier 2"}</div>
                  </div>
                  <StatusBadge status={r.status || "Not started"} />
                </div>
                {r.grant_range && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 6 }}>Grant range: {r.grant_range}</div>}
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 }}>
                  {r.owner && <span>Owner: <span style={{ color: GOLD }}>{r.owner}</span></span>}
                  {r.next_action_date && <span> \u00b7 Next: {new Date(r.next_action_date).toLocaleDateString("en-GB")}</span>}
                </div>
                {r.next_action && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{r.next_action}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}>
              <h2 style={{ color: WHITE, margin: "0 0 20px" }}>{editingId ? "Edit Funder" : "Add Funder"}</h2>

              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Funder Name *</label>
                <input value={fName} onChange={e => setFName(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Tier *</label>
                  <select value={fTier} onChange={e => setFTier(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }}>
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Status</label>
                  <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Grant Range</label>
                <input value={fGrantRange} onChange={e => setFGrantRange(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Eligibility</label>
                <textarea value={fEligibility} onChange={e => setFEligibility(e.target.value)} rows={2} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13, resize: "vertical" }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Fit for ALLI</label>
                <textarea value={fFit} onChange={e => setFFit(e.target.value)} rows={2} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13, resize: "vertical" }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Route In</label>
                <textarea value={fRouteIn} onChange={e => setFRouteIn(e.target.value)} rows={2} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13, resize: "vertical" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Contact</label>
                  <input value={fContact} onChange={e => setFContact(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Application URL</label>
                  <input value={fAppUrl} onChange={e => setFAppUrl(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>When to Apply</label>
                  <input value={fWhenApply} onChange={e => setFWhenApply(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Owner</label>
                  <select value={fOwner} onChange={e => setFOwner(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }}>
                    {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Amount Applied For</label>
                  <input type="number" value={fAmountApplied} onChange={e => setFAmountApplied(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Amount Awarded</label>
                  <input type="number" value={fAmountAwarded} onChange={e => setFAmountAwarded(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Date Submitted</label>
                  <input type="date" value={fDateSubmitted} onChange={e => setFDateSubmitted(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Decision Date</label>
                  <input type="date" value={fDecisionDate} onChange={e => setFDecisionDate(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Next Action Date</label>
                  <input type="date" value={fNextDate} onChange={e => setFNextDate(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Next Action</label>
                  <input value={fNextAction} onChange={e => setFNextAction(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Notes {editingId && "(new entry auto-stamps with date and user)"}</label>
                <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={3} placeholder={editingId ? "Add a new note entry..." : "Add notes..."} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13, resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={submit} disabled={saving} style={{ flex: 1, background: GOLD, color: "#000", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving\u2026" : (editingId ? "Save Changes" : "Save Funder")}
                </button>
                <button onClick={() => setModalOpen(false)} style={{ flex: 1, background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "11px 0", cursor: "pointer" }}>Cancel</button>
              </div>

              {editingId && (
                <div style={{ marginTop: 14 }}>
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Delete Funder</button>
                  ) : (
                    <div>
                      <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>Are you sure? This cannot be undone.</p>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={doDelete} disabled={saving} style={{ flex: 1, background: "#ef4444", color: WHITE, border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 700 }}>Yes, Delete</button>
                        <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 0", cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
