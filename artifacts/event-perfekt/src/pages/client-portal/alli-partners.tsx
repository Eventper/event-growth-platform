import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { portalFetch, getPortalToken } from "@/lib/client-portal-auth";

const BG = "#1A0A0E";
const PANEL = "#2A1018";
const BORDER = "#4A2030";
const GOLD = "#E2C87A";
const WHITE = "#fff";

const ENGAGEMENT_STATUSES = [
  "Not started",
  "Approached",
  "Pending response",
  "In conversation",
  "Engaged \u2014 Active partnership",
  "Declined \u2014 revisit",
  "Closed",
];

const ENGAGEMENT_COLORS: Record<string, string> = {
  "Not started": "#6b7280",
  "Approached": "#3b82f6",
  "Pending response": "#f59e0b",
  "In conversation": "#8b5cf6",
  "Engaged \u2014 Active partnership": "#22c55e",
  "Declined \u2014 revisit": "#ef4444",
  "Closed": "#374151",
};

const ORG_TYPES = ["Statutory", "Charity", "Community", "Council", "Funder", "Pro Bono Network", "Infrastructure", "Other"];
const SERVICE_LIST = ["Statutory", "Mentoring", "Mental Health", "Therapy", "Education", "Employment", "Legal", "Housing", "Safeguarding", "Funding", "Infrastructure"];
const BOROUGHS = ["Lambeth", "Lewisham", "Southwark", "Pan-London", "National", "Other"];
const OWNERS = ["ALLI Foundation", "Trustees", "DSL", "Project Lead", "Operations"];

function StatusBadge({ status }: { status: string }) {
  const color = ENGAGEMENT_COLORS[status] || "#6b7280";
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {status || "Unknown"}
    </span>
  );
}

export default function AlliPartnersPortal() {
  const [, setLocation] = useLocation();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPlaybook, setShowPlaybook] = useState(false);

  const downloadPlaybook = () => {
    const content = `ALLI FOUNDATION — PARTNER ENGAGEMENT PLAYBOOK
Generated: ${new Date().toLocaleDateString("en-GB")}

1. FIRST APPROACH
   - Use the Date Approached field to log the first contact.
   - Send a short intro email from the trustee assigned as Owner.
   - Subject line: ALLI Foundation partnership enquiry
   - Attach the ALLI Foundation one-pager (available on request).

2. ENGAGEMENT STATUS DEFINITIONS
   Not started means no contact yet. Log a Next Action date within 14 days.
   Approached means email or letter sent. Wait 7 days then follow up by phone.
   Pending response means we are awaiting a reply. Set a 14-day chase reminder.
   In conversation means active dialogue. Schedule a discovery meeting.
   Engaged Active means signed or verbal agreement. Move to the Partner Agreement workflow.
   Declined means log why and set a 6-month review reminder.
   Closed means the partner is no longer relevant. Archive with a final note.

3. DOCUMENTATION RULES
   - Notes automatically add the date and user. Add context every time you speak.
   - Upload any MOU, partnership letter, or referral form to the Documents tab.
   - If a partner takes referrals, log the young person via Case Management and match them to the partner.

4. BOROUGH PRIORITY
   Priority order: Lambeth, then Lewisham, then Southwark, then Pan-London, then National.
   Every partner must have at least one borough tagged. Pan-London counts for all three.

5. SERVICE CATEGORIES
   Statutory means police, council youth services, social care.
   Mentoring means one-to-one or group mentoring.
   Mental Health means counselling, CAMHS, therapy.
   Therapy means clinical or talking therapy services.
   Education means schools, colleges, alternative provision.
   Employment means jobs, training, apprenticeships.
   Legal means legal aid, immigration, youth justice.
   Housing means hostels, supported housing, leaving care.
   Safeguarding means child protection, VESS, exploitation support.
   Funding means grant-making, trust funding, charitable funding.
   Infrastructure means networks, capacity building, CBO support.

6. RED FLAGS (pause engagement and flag to Trustees)
   - No safeguarding policy or DBS process described.
   - Cannot show GDPR or data protection compliance.
   - Refuses to share referral pathway or eligibility criteria.
   - Financially unstable or unregistered charity.
   - No named contact or refuses named contact.

7. ESCALATION
   If a partner becomes a referring organisation for a young person,
   immediately create an Intervention in Case Management and link the partner.

This playbook applies to every partner record in this directory.
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ALLI-Partner-Engagement-Playbook.txt";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Playbook downloaded \u2713");
  };

  // Form fields
  const [fName, setFName] = useState("");
  const [fType, setFType] = useState("Statutory");
  const [fServices, setFServices] = useState<string[]>([]);
  const [fBoroughs, setFBoroughs] = useState<string[]>([]);
  const [fWebsite, setFWebsite] = useState("");
  const [fContactName, setFContactName] = useState("");
  const [fContactEmail, setFContactEmail] = useState("");
  const [fContactPhone, setFContactPhone] = useState("");
  const [fEngStatus, setFEngStatus] = useState("Not started");
  const [fOwner, setFOwner] = useState("ALLI Foundation");
  const [fDateApproached, setFDateApproached] = useState("");
  const [fDateLastContact, setFDateLastContact] = useState("");
  const [fNextDate, setFNextDate] = useState("");
  const [fNextAction, setFNextAction] = useState("");
  const [fNotes, setFNotes] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const load = async () => {
    const token = getPortalToken();
    if (!token) { setLocation("/client-portal/login"); return; }
    try {
      const d = await portalFetch("GET", "/api/client-portal/alli/partners");
      setRecords(Array.isArray(d) ? d : []);
    } catch (e: any) { showToast(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setFName(""); setFType("Statutory"); setFServices([]); setFBoroughs([]); setFWebsite("");
    setFContactName(""); setFContactEmail(""); setFContactPhone(""); setFEngStatus("Not started");
    setFOwner("ALLI Foundation"); setFDateApproached(""); setFDateLastContact("");
    setFNextDate(""); setFNextAction(""); setFNotes("");
    setEditingId(null); setConfirmDelete(false);
  };

  const openAdd = () => { resetForm(); setModalOpen(true); };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setFName(r.name || "");
    setFType(r.organisation_type || "Statutory");
    setFServices(Array.isArray(r.services) ? r.services : (typeof r.services === "string" ? JSON.parse(r.services || "[]") : []));
    setFBoroughs(Array.isArray(r.areas_covered) ? r.areas_covered : (typeof r.areas_covered === "string" ? JSON.parse(r.areas_covered || "[]") : []));
    setFWebsite(r.website || "");
    setFContactName(r.primary_contact_name || "");
    setFContactEmail(r.primary_contact_email || "");
    setFContactPhone(r.primary_contact_phone || "");
    setFEngStatus(r.engagement_status || "Not started");
    setFOwner(r.owner || "ALLI Foundation");
    setFDateApproached(r.date_approached ? r.date_approached.slice(0, 10) : "");
    setFDateLastContact(r.date_last_contact ? r.date_last_contact.slice(0, 10) : "");
    setFNextDate(r.next_action_date ? r.next_action_date.slice(0, 10) : "");
    setFNextAction(r.next_action || "");
    setFNotes("");
    setConfirmDelete(false);
    setModalOpen(true);
  };

  const validateForm = () => {
    if (!fName.trim()) { showToast("Organisation Name is required"); return false; }
    const email = fContactEmail.trim();
    if (email && (email.includes("example.com") || !email.includes("@"))) { showToast("Please enter a valid email or leave blank"); return false; }
    return true;
  };

  const submit = async () => {
    if (!validateForm()) return;
    setSaving(true);
    const payload = {
      name: fName.trim(),
      organisation_type: fType,
      services: fServices,
      areas_covered: fBoroughs,
      website: fWebsite.trim() || null,
      primary_contact_name: fContactName.trim() || null,
      primary_contact_email: fContactEmail.trim() || null,
      primary_contact_phone: fContactPhone.trim() || null,
      engagement_status: fEngStatus,
      owner: fOwner,
      date_approached: fDateApproached || null,
      date_last_contact: fDateLastContact || null,
      next_action_date: fNextDate || null,
      next_action: fNextAction.trim() || null,
      notes: fNotes.trim() || null,
    };
    try {
      if (editingId) {
        await portalFetch("PATCH", `/api/client-portal/alli/partners/${editingId}`, payload);
        showToast("Partner updated \u2713");
      } else {
        await portalFetch("POST", "/api/client-portal/alli/partners", payload);
        showToast("Partner added \u2713");
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch (e: any) { showToast(e.message || "Save failed"); }
    setSaving(false);
  };

  const doDelete = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await portalFetch("DELETE", `/api/client-portal/alli/partners/${editingId}`);
      showToast("Partner deleted");
      setModalOpen(false);
      resetForm();
      load();
    } catch (e: any) { showToast(e.message || "Delete failed"); }
    setSaving(false);
  };

  const toggleMulti = (val: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(val)) setList(list.filter(x => x !== val));
    else setList([...list, val]);
  };

  const filtered = records.filter(r => {
    const matchS = filterStatus === "all" || r.engagement_status === filterStatus;
    const q = search.toLowerCase();
    const matchQ = !q || (r.name?.toLowerCase().includes(q) || r.primary_contact_name?.toLowerCase().includes(q) || r.areas_covered?.some?.((a: string) => a.toLowerCase().includes(q)));
    return matchS && matchQ;
  });

  return (
    <PortalLayout>
      <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Poppins', sans-serif", padding: 32 }}>
        {toast && <div style={{ position: "fixed", top: 20, right: 20, background: GOLD, color: "#000", padding: "12px 18px", borderRadius: 8, fontWeight: 700, zIndex: 9999 }}>{toast}</div>}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ color: WHITE, fontSize: 28, fontWeight: 800, margin: 0 }}>Partner Directory</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>ALLI Foundation \u2014 Partner Engagement & Tracking</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowPlaybook(!showPlaybook)} style={{ background: "transparent", color: GOLD, border: `1px solid ${GOLD}`, borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{showPlaybook ? "Hide Playbook" : "📚 Partner Playbook"}</button>
            <button onClick={openAdd} style={{ background: GOLD, color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>+ Add Partner</button>
          </div>
        </div>

        {/* Playbook Panel */}
        {showPlaybook && (
          <div style={{ background: PANEL, border: `1px solid ${GOLD}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: GOLD, margin: 0, fontSize: 16, fontWeight: 800 }}>📚 ALLI Partner Engagement Playbook</h3>
              <button onClick={downloadPlaybook} style={{ background: GOLD, color: "#000", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Download</button>
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 1.7, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <h4 style={{ color: WHITE, margin: "0 0 6px", fontSize: 12 }}>1. First Approach</h4>
                <p style={{ margin: 0 }}>Log the Date Approached. Send a short intro email from the assigned Owner. Subject line: ALLI Foundation partnership enquiry.</p>
                <h4 style={{ color: WHITE, margin: "12px 0 6px", fontSize: 12 }}>2. Engagement Status Meanings</h4>
                <p style={{ margin: 0 }}>Not started means log a Next Action date within 14 days. Approached means wait 7 days then follow up by phone. Pending means set a 14-day chase reminder. In conversation means schedule a discovery meeting. Active means move to the Partner Agreement workflow. Declined means log why and review in 6 months. Closed means archive with a final note.</p>
              </div>
              <div>
                <h4 style={{ color: WHITE, margin: "0 0 6px", fontSize: 12 }}>3. Documentation Rules</h4>
                <p style={{ margin: 0 }}>Notes automatically add the date and user. Add context every time you speak to the partner. Upload MOUs and referral forms to Documents. If a partner takes referrals, create an Intervention in Case Management.</p>
                <h4 style={{ color: WHITE, margin: "12px 0 6px", fontSize: 12 }}>4. Red Flags (pause and flag to Trustees)</h4>
                <p style={{ margin: 0 }}>No safeguarding policy or DBS checks. Cannot show GDPR compliance. Refuses to share referral pathway. Financially unstable. No named contact.</p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, contact or area..." style={{ width: "100%", padding: "8px 12px", background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, color: WHITE, fontSize: 13 }} />
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {ENGAGEMENT_STATUSES.map(s => {
            const cnt = records.filter(r => r.engagement_status === s).length;
            const color = ENGAGEMENT_COLORS[s] || "#6b7280";
            return (
              <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)} style={{ background: PANEL, border: `1px solid ${filterStatus === s ? GOLD : BORDER}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer", minWidth: 120, textAlign: "center" }}>
                <div style={{ color, fontSize: 22, fontWeight: 800 }}>{cnt}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600 }}>{s}</div>
              </div>
            );
          })}
        </div>

        {/* Records */}
        {loading ? (
          <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 60 }}>Loading partners\u2026</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 60 }}>No partners found. Click "+ Add Partner" to add one.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
            {filtered.map(r => (
              <div key={r.id} onClick={() => openEdit(r)} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, cursor: "pointer", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ color: WHITE, fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{r.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{r.organisation_type || "Unknown type"}</div>
                  </div>
                  <StatusBadge status={r.engagement_status || "Not started"} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {(Array.isArray(r.services) ? r.services : []).map((s: string) => (
                    <span key={s} style={{ background: "#ffffff11", color: "rgba(255,255,255,0.7)", borderRadius: 999, padding: "2px 8px", fontSize: 10 }}>{s}</span>
                  ))}
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 }}>
                  {r.areas_covered?.length ? (Array.isArray(r.areas_covered) ? r.areas_covered : []).join(" \u00b7 ") : "No areas"}
                  {r.owner && <span> \u00b7 Owner: <span style={{ color: GOLD }}>{r.owner}</span></span>}
                </div>
                {r.next_action_date && <div style={{ color: GOLD, fontSize: 11, fontWeight: 700 }}>Next: {new Date(r.next_action_date).toLocaleDateString("en-GB")} \u2014 {r.next_action || "Action due"}</div>}
                {r.primary_contact_name && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 }}>Contact: {r.primary_contact_name}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}>
              <h2 style={{ color: WHITE, margin: "0 0 20px" }}>{editingId ? "Edit Partner" : "Add Partner"}</h2>

              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Organisation Name *</label>
                <input value={fName} onChange={e => setFName(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Type</label>
                  <select value={fType} onChange={e => setFType(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }}>
                    {ORG_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Engagement Status</label>
                  <select value={fEngStatus} onChange={e => setFEngStatus(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }}>
                    {ENGAGEMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Services multi-select */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Services</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SERVICE_LIST.map(s => (
                    <button key={s} onClick={() => toggleMulti(s, fServices, setFServices)} style={{ background: fServices.includes(s) ? GOLD : BG, color: fServices.includes(s) ? "#000" : WHITE, border: `1px solid ${fServices.includes(s) ? GOLD : BORDER}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Boroughs multi-select */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Boroughs Covered</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {BOROUGHS.map(b => (
                    <button key={b} onClick={() => toggleMulti(b, fBoroughs, setFBoroughs)} style={{ background: fBoroughs.includes(b) ? GOLD : BG, color: fBoroughs.includes(b) ? "#000" : WHITE, border: `1px solid ${fBoroughs.includes(b) ? GOLD : BORDER}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Website</label>
                  <input value={fWebsite} onChange={e => setFWebsite(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
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
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Contact Name</label>
                  <input value={fContactName} onChange={e => setFContactName(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Contact Email</label>
                  <input type="email" value={fContactEmail} onChange={e => setFContactEmail(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Contact Phone</label>
                <input value={fContactPhone} onChange={e => setFContactPhone(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Date Approached</label>
                  <input type="date" value={fDateApproached} onChange={e => setFDateApproached(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Date Last Contact</label>
                  <input type="date" value={fDateLastContact} onChange={e => setFDateLastContact(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Next Action Date</label>
                  <input type="date" value={fNextDate} onChange={e => setFNextDate(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Next Action</label>
                <input value={fNextAction} onChange={e => setFNextAction(e.target.value)} placeholder="" style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13 }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Notes {editingId && "(new entry auto-stamps with date and user)"}</label>
                <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={3} placeholder={editingId ? "Add a new note entry..." : "Add notes..."} style={{ width: "100%", padding: "9px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, color: WHITE, fontSize: 13, resize: "vertical" }} />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={submit} disabled={saving} style={{ flex: 1, background: GOLD, color: "#000", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving\u2026" : (editingId ? "Save Changes" : "Save Partner")}
                </button>
                <button onClick={() => setModalOpen(false)} style={{ flex: 1, background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "11px 0", cursor: "pointer" }}>Cancel</button>
              </div>

              {editingId && (
                <div style={{ marginTop: 14 }}>
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Delete Partner</button>
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
