import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { getPortalToken, getPortalUser, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";

const BURGUNDY = "#3D0B0B";
const BORDER = "#e5e7eb";

const DOCUMENT_ACCESS_OPTIONS = [
  "Project overview and timeline",
  "Phase 1 deliverables",
  "Phase 2 deliverables",
  "Phase 3 deliverables",
  "Legal documents",
  "Partnership contracts",
  "Correspondence",
];

type Collab = {
  id: number;
  full_name: string;
  email: string;
  organisation: string | null;
  role: string | null;
  access_level: string;
  status: string;
  can_upload: boolean;
  can_comment: boolean;
  document_access: string[];
  invited_by: string;
  invited_by_type: string;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, { bg: string; text: string }> = {
    invited:  { bg: "#fffbeb", text: "#92400e" },
    accepted: { bg: "#f0fdf4", text: "#166534" },
    revoked:  { bg: "#f9fafb", text: "#6b7280" },
  };
  const c = colours[status] || colours.revoked;
  return <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.text}30`, padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "capitalize" }}>{status}</span>;
}

export default function ClientPortalCollaboration() {
  const [, setLocation] = useLocation();
  const [mine, setMine] = useState<Collab[]>([]);
  const [epInvited, setEpInvited] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    full_name: "", email: "", organisation: "", role: "Partner Organisation",
    can_upload: false, expiry_days: "30", document_access: [] as string[],
  });

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 3000); }

  async function load() {
    if (!getPortalToken()) { setLocation("/client-portal/login"); return; }
    try {
      const all: Collab[] = await portalFetch("GET", "/api/client-portal/collaborators").catch(() => []);
      const list = Array.isArray(all) ? all : [];
      setMine(list.filter(c => c.invited_by_type === "client"));
      setEpInvited(list.filter(c => c.invited_by_type === "ep_team"));
    } catch (e: any) {
      if (e.message?.includes("401")) { clearPortalSession(); setLocation("/client-portal/login"); }
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    if (!form.full_name || !form.email) { showToast("Name and email required"); return; }
    setSending(true);
    try {
      await portalFetch("POST", "/api/client-portal/collaborators/invite", form);
      showToast("Invitation sent ✓");
      setShowModal(false);
      setForm({ full_name: "", email: "", organisation: "", role: "Partner Organisation", can_upload: false, expiry_days: "30", document_access: [] });
      load();
    } catch (e: any) { showToast(e.message || "Failed"); }
    setSending(false);
  }

  function toggleAccess(opt: string) {
    setForm(f => ({ ...f, document_access: f.document_access.includes(opt) ? f.document_access.filter(x => x !== opt) : [...f.document_access, opt] }));
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", marginTop: 4, padding: 9, background: "#fff", border: `1px solid ${BORDER}`,
    borderRadius: 6, fontSize: 13, boxSizing: "border-box", color: "#000", fontFamily: "Poppins, sans-serif", outline: "none",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#000" };

  if (loading) return <PortalLayout><div style={{ textAlign: "center", padding: 60, color: "#fff" }}>Loading collaborators…</div></PortalLayout>;

  return (
    <PortalLayout>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, background: "#fff", color: "#000", border: "1px solid #e5e7eb", padding: "12px 20px", borderRadius: 8, zIndex: 9999, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>{toast}</div>}

      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, marginBottom: 4 }}>Collaboration</h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>Invite partners and colleagues to view your project</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 22px", background: BURGUNDY, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Invite New</button>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: BURGUNDY, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Your Team</h3>
        {mine.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 28, textAlign: "center", color: "#000" }}>
            You haven't invited anyone yet. Click <strong style={{ color: "#000" }}>Invite New</strong> to add partners, trustees, funders, or advisors.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mine.map(c => (
              <div key={c.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ color: "#000" }}>{c.full_name}</strong>
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={{ fontSize: 12, color: "#000", marginTop: 4 }}>{c.email}</div>
                  <div style={{ fontSize: 11, color: "#000", marginTop: 2 }}>
                    {c.organisation && <span>{c.organisation} · </span>}
                    {c.role && <span>{c.role} · </span>}
                    <span>Access: {c.access_level}</span>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#000", textAlign: "right" }}>
                  Invited {new Date(c.invited_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {c.expires_at && <div>Expires {new Date(c.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: BURGUNDY, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Invited by Event Perfekt</h3>
        {epInvited.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 28, textAlign: "center", color: "#000" }}>
            No collaborators invited by the Event Perfekt team yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {epInvited.map(c => (
              <div key={c.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ color: "#000" }}>{c.full_name}</strong>
                  <StatusBadge status={c.status} />
                </div>
                <div style={{ fontSize: 12, color: "#000", marginTop: 4 }}>{c.organisation || "—"} · {c.role || "collaborator"}</div>
                <div style={{ fontSize: 11, color: "#000", marginTop: 4 }}>
                  Can view: {(c.document_access || []).length > 0 ? (c.document_access || []).join(", ") : "all shared items"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", border: `1px solid ${BORDER}` }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#000", margin: "0 0 18px" }}>Invite Collaborator</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={labelStyle}>Full name<input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Organisation<input value={form.organisation} onChange={e => setForm({ ...form, organisation: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>
                Role
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
                  <option>Trustee</option><option>Partner Organisation</option><option>Funder</option><option>Advisor</option><option>Other</option>
                </select>
              </label>
              <div style={labelStyle}>
                What they can see
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                  {DOCUMENT_ACCESS_OPTIONS.map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 400, color: "#000", cursor: "pointer" }}>
                      <input type="checkbox" checked={form.document_access.includes(opt)} onChange={() => toggleAccess(opt)} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#000", cursor: "pointer" }}>
                <input type="checkbox" checked={form.can_upload} onChange={e => setForm({ ...form, can_upload: e.target.checked })} />
                Allow them to upload documents
              </label>
              <label style={labelStyle}>
                Link expiry
                <select value={form.expiry_days} onChange={e => setForm({ ...form, expiry_days: e.target.value })} style={inputStyle}>
                  <option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="none">No expiry</option>
                </select>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 20px", background: "transparent", border: `1px solid ${BORDER}`, color: "#000", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button disabled={sending} onClick={submit} style={{ padding: "9px 20px", background: BURGUNDY, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.6 : 1 }}>{sending ? "Sending…" : "Send Invitation"}</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
