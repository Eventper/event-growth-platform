import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import ClientExtendedTabs from "./client-extended-tabs";

const TOKEN_KEY = "token";
function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
function headers() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
async function apiFetch(method: string, url: string, body?: any) {
  const res = await fetch(url, { method, headers: headers(), ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  lead:          { label: "Lead",          color: "#94a3b8" },
  proposal_sent: { label: "Proposal Sent", color: "#f59e0b" },
  contracted:    { label: "Contracted",    color: "#3b82f6" },
  onboarding:    { label: "Onboarding",    color: "#a78bfa" },
  active:        { label: "Active",        color: "#22c55e" },
  completed:     { label: "Completed",     color: "#6b7280" },
  inactive:      { label: "Inactive",      color: "#ef4444" },
};

const NOTE_TYPES = ["note","call","email","meeting","follow_up","system"];
const NOTE_ICONS: Record<string, string> = { note: "📝", call: "📞", email: "✉️", meeting: "🤝", follow_up: "🔔", system: "⚙️" };

function Badge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || { label: status, color: "#94a3b8" };
  return (
    <span style={{ background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}50`,
      padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{c.label}</span>
  );
}

function Field({ label, value, onSave, type = "text", options }: any) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  useEffect(() => setVal(value || ""), [value]);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", color: "#888", fontSize: 11, marginBottom: 3 }}>{label}</label>
      {editing ? (
        <div style={{ display: "flex", gap: 6 }}>
          {type === "select" ? (
            <select value={val} onChange={e => setVal(e.target.value)}
              style={{ flex: 1, background: "#1A0A0E", border: "1px solid #7B2142", borderRadius: 5, color: "#fff", padding: "6px 10px", fontSize: 13 }}>
              {options?.map((o: any) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
            </select>
          ) : (
            <input value={val} onChange={e => setVal(e.target.value)} type={type}
              style={{ flex: 1, background: "#1A0A0E", border: "1px solid #7B2142", borderRadius: 5, color: "#fff", padding: "6px 10px", fontSize: 13 }} />
          )}
          <button onClick={() => { onSave(val); setEditing(false); }}
            style={{ background: "#7B2142", color: "#fff", border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>✓</button>
          <button onClick={() => { setVal(value || ""); setEditing(false); }}
            style={{ background: "none", border: "1px solid #4A2030", color: "#888", borderRadius: 5, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      ) : (
        <div onClick={() => setEditing(true)}
          style={{ color: val ? "#fff" : "#555", fontSize: 13, padding: "6px 0", cursor: "pointer",
            borderBottom: "1px solid transparent", display: "flex", justifyContent: "space-between" }}
          onMouseEnter={e => (e.currentTarget.style.borderBottomColor = "#4A2030")}
          onMouseLeave={e => (e.currentTarget.style.borderBottomColor = "transparent")}>
          <span>{val || "Click to edit"}</span>
          <span style={{ color: "#555", fontSize: 11, opacity: 0 }} className="edit-icon">✎</span>
        </div>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, width = 500 }: any) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#1A0A0E", border: "1px solid #4A2030", borderRadius: 12,
        width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #4A2030",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#E2C87A", margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function SInput({ label, ...props }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: "block", color: "#ccc", fontSize: 12, marginBottom: 3 }}>{label}</label>}
      <input {...props} style={{ width: "100%", background: "#2A1018", border: "1px solid #4A2030",
        borderRadius: 6, color: "#fff", padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }} />
    </div>
  );
}

export default function ClientDetail() {
  const [, navigate] = useLocation();
  const params = useParams() as any;
  const clientId = params.id;
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success"|"error">("success");
  const [showAddContact, setShowAddContact] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [newContact, setNewContact] = useState({ full_name: "", job_title: "", email: "", phone: "", is_primary: false, is_signatory: false });
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [savingNote, setSavingNote] = useState(false);

  function showToast(msg: string, type: "success"|"error" = "success") {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await apiFetch("GET", `/api/ep-clients/${clientId}`); setClient(data); }
    catch (e: any) { showToast(e.message, "error"); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function updateField(field: string, value: any) {
    try {
      await apiFetch("PATCH", `/api/ep-clients/${clientId}`, { [field]: value });
      setClient((c: any) => ({ ...c, [field]: value }));
      showToast("Saved");
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function addContact() {
    if (!newContact.full_name || !newContact.email) return showToast("Name and email required", "error");
    try {
      await apiFetch("POST", `/api/ep-clients/${clientId}/contacts`, newContact);
      showToast("Contact added"); setShowAddContact(false);
      setNewContact({ full_name: "", job_title: "", email: "", phone: "", is_primary: false, is_signatory: false });
      load();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function deleteContact(contactId: number) {
    if (!confirm("Delete this contact?")) return;
    try {
      await apiFetch("DELETE", `/api/ep-client-contacts/${contactId}`);
      showToast("Contact removed"); load();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function sendInvite() {
    try {
      const data = await apiFetch("POST", `/api/ep-clients/${clientId}/invite-onboarding`);
      setInviteUrl(data.onboarding_url);
      setShowInvite(true); load();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await apiFetch("POST", `/api/ep-clients/${clientId}/notes`, { note: noteText, note_type: noteType });
      setNoteText(""); showToast("Note saved"); load();
    } catch (e: any) { showToast(e.message, "error"); }
    setSavingNote(false);
  }

  async function deleteNote(noteId: number) {
    if (!confirm("Delete this note?")) return;
    try {
      await apiFetch("DELETE", `/api/ep-client-notes/${noteId}`);
      showToast("Note deleted"); load();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  const ENGAGEMENT_TYPES = ["Full Event Management","Day Coordination","Corporate Events","Wedding Planning","Conference & Summits","Gala Dinners","Virtual Events","Project Consulting","Other"];
  const LEAD_SOURCES = ["Referral","Website","LinkedIn","Email Campaign","Direct","Exhibition","Other"];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#1A0A0E", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#E2C87A", fontSize: 16 }}>Loading client...</div>
    </div>
  );

  if (!client) return (
    <div style={{ minHeight: "100vh", background: "#1A0A0E", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ color: "#888", fontSize: 16, marginBottom: 16 }}>Client not found</div>
      <button onClick={() => navigate("/ep-crm")} style={{ background: "#7B2142", color: "#fff", border: "none", borderRadius: 7, padding: "8px 20px", cursor: "pointer" }}>← Back to CRM</button>
    </div>
  );

  const ob = client.onboarding;

  return (
    <div style={{ minHeight: "100vh", background: "#1A0A0E", color: "#fff", fontFamily: "'Poppins', sans-serif" }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: toastType === "error" ? "#2a0c0c" : "#0a2218",
          color: toastType === "error" ? "#ef4444" : "#22c55e", border: `1px solid ${toastType === "error" ? "#ef4444" : "#22c55e"}40`,
          padding: "12px 20px", borderRadius: 8, zIndex: 9999, fontSize: 13 }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ background: "#2A1018", borderBottom: "1px solid #4A2030", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, height: 60 }}>
          <button onClick={() => navigate("/ep-crm")}
            style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>← Clients</button>
          <div style={{ color: "#4A2030", fontSize: 18 }}>|</div>
          <h1 style={{ color: "#fff", fontSize: 17, fontWeight: 600, margin: 0 }}>{client.organisation_name}</h1>
          <Badge status={client.status} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 0, minHeight: "calc(100vh - 60px)" }}>
        {/* Left Panel */}
        <div style={{ background: "#2A1018", borderRight: "1px solid #4A2030", padding: 24, overflowY: "auto" }}>
          {/* Status */}
          <Field label="Status" value={client.status} type="select" onSave={(v: string) => updateField("status", v)}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
          <Field label="Organisation Name" value={client.organisation_name} onSave={(v: string) => updateField("organisation_name", v)} />
          <Field label="Engagement Type" value={client.engagement_type} type="select" onSave={(v: string) => updateField("engagement_type", v)}
            options={["", ...ENGAGEMENT_TYPES].map(s => ({ value: s, label: s || "Select..." }))} />
          <Field label="Lead Source" value={client.lead_source} type="select" onSave={(v: string) => updateField("lead_source", v)}
            options={["", ...LEAD_SOURCES].map(s => ({ value: s, label: s || "Select..." }))} />
          <Field label="Assigned To" value={client.assigned_to} onSave={(v: string) => updateField("assigned_to", v)} />
          <div style={{ borderTop: "1px solid #4A2030", marginTop: 12, paddingTop: 12 }}>
            <div style={{ color: "#E2C87A", fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Address</div>
            <Field label="Address Line 1" value={client.address_line1} onSave={(v: string) => updateField("address_line1", v)} />
            <Field label="Address Line 2" value={client.address_line2} onSave={(v: string) => updateField("address_line2", v)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="City" value={client.city} onSave={(v: string) => updateField("city", v)} />
              <Field label="Postcode" value={client.postcode} onSave={(v: string) => updateField("postcode", v)} />
            </div>
            <Field label="Country" value={client.country} type="select" onSave={(v: string) => updateField("country", v)}
              options={["United Kingdom","Nigeria","United States","Canada","Other"].map(s => ({ value: s, label: s }))} />
          </div>
          <div style={{ borderTop: "1px solid #4A2030", marginTop: 12, paddingTop: 12 }}>
            <div style={{ color: "#E2C87A", fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Company Info</div>
            <Field label="Website" value={client.website} onSave={(v: string) => updateField("website", v)} />
            <Field label="Company Reg Number" value={client.company_reg_number} onSave={(v: string) => updateField("company_reg_number", v)} />
            <Field label="VAT Number" value={client.vat_number} onSave={(v: string) => updateField("vat_number", v)} />
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "#555" }}>
            Added {new Date(client.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ padding: 28, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Onboarding Panel */}
            <div style={{ background: "#2A1018", border: "1px solid #4A2030", borderRadius: 12, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ color: "#E2C87A", fontSize: 14, fontWeight: 700, margin: 0 }}>Onboarding</h3>
                <button onClick={sendInvite}
                  style={{ background: "#7B2142", color: "#fff", border: "none", borderRadius: 6,
                    padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
                  {ob ? "Re-send Invite" : "Send Invite"}
                </button>
              </div>
              {ob ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: "#888" }}>Status</span>
                    <span style={{ color: ob.status === 'completed' ? "#22c55e" : "#a78bfa", fontWeight: 600 }}>
                      {ob.status === 'completed' ? '✓ Completed' : ob.status === 'in_progress' ? '⟳ In Progress' : '✉ Invited'}
                    </span>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 6 }}>
                      <span>Progress</span><span>Step {ob.step_completed} / 4</span>
                    </div>
                    <div style={{ height: 6, background: "#1A0A0E", borderRadius: 3 }}>
                      <div style={{ height: 6, borderRadius: 3, background: ob.status === 'completed' ? "#22c55e" : "#a78bfa",
                        width: `${(ob.step_completed / 4) * 100}%`, transition: "width 0.4s" }} />
                    </div>
                  </div>
                  {[
                    { step: 1, label: "Company Details" },
                    { step: 2, label: "Services & Requirements" },
                    { step: 3, label: "Event Brief" },
                    { step: 4, label: "Agreement & Sign-off" },
                  ].map(s => (
                    <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0",
                      borderBottom: "1px solid #3A1828", fontSize: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: ob.step_completed >= s.step ? "#22c55e20" : "#1A0A0E",
                        border: `1px solid ${ob.step_completed >= s.step ? "#22c55e" : "#4A2030"}`,
                        color: ob.step_completed >= s.step ? "#22c55e" : "#555", fontSize: 10, flexShrink: 0 }}>
                        {ob.step_completed >= s.step ? "✓" : s.step}
                      </div>
                      <span style={{ color: ob.step_completed >= s.step ? "#fff" : "#888" }}>{s.label}</span>
                    </div>
                  ))}
                  {ob.invited_at && (
                    <div style={{ marginTop: 12, fontSize: 11, color: "#555" }}>
                      Invited {new Date(ob.invited_at).toLocaleDateString("en-GB")}
                      {ob.invited_by && ` by ${ob.invited_by}`}
                    </div>
                  )}
                  {ob.completed_at && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "#22c55e" }}>
                      Completed {new Date(ob.completed_at).toLocaleDateString("en-GB")}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#555", fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                  <div>No onboarding started</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Click "Send Invite" to begin</div>
                </div>
              )}
            </div>

            {/* Contacts Panel */}
            <div style={{ background: "#2A1018", border: "1px solid #4A2030", borderRadius: 12, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ color: "#E2C87A", fontSize: 14, fontWeight: 700, margin: 0 }}>Contacts</h3>
                <button onClick={() => setShowAddContact(true)}
                  style={{ background: "#4A2030", color: "#E2C87A", border: "none", borderRadius: 6,
                    padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>+ Add</button>
              </div>
              {client.contacts?.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: "#555", fontSize: 13 }}>No contacts added yet</div>
              ) : (
                client.contacts?.map((c: any) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    padding: "10px 0", borderBottom: "1px solid #3A1828" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{c.full_name}</span>
                        {c.is_primary && <span style={{ background: "#E2C87A20", color: "#E2C87A", border: "1px solid #E2C87A40",
                          padding: "1px 7px", borderRadius: 10, fontSize: 10 }}>Primary</span>}
                        {c.is_signatory && <span style={{ background: "#3b82f620", color: "#3b82f6", border: "1px solid #3b82f640",
                          padding: "1px 7px", borderRadius: 10, fontSize: 10 }}>Signatory</span>}
                      </div>
                      {c.job_title && <div style={{ color: "#888", fontSize: 11, marginBottom: 2 }}>{c.job_title}</div>}
                      <div style={{ color: "#a78bfa", fontSize: 12 }}>{c.email}</div>
                      {c.phone && <div style={{ color: "#888", fontSize: 11 }}>{c.phone}</div>}
                    </div>
                    <button onClick={() => deleteContact(c.id)}
                      style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, padding: "2px 6px" }}
                      title="Delete contact">✕</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes / Engagement Log */}
          <div style={{ background: "#2A1018", border: "1px solid #4A2030", borderRadius: 12, padding: 22, marginTop: 24 }}>
            <h3 style={{ color: "#E2C87A", fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>Engagement Log & Notes</h3>

            {/* Add Note */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <select value={noteType} onChange={e => setNoteType(e.target.value)}
                style={{ background: "#1A0A0E", border: "1px solid #4A2030", borderRadius: 6, color: "#fff", padding: "8px 12px", fontSize: 12, flexShrink: 0 }}>
                {NOTE_TYPES.filter(t => t !== "system").map(t => (
                  <option key={t} value={t}>{NOTE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}</option>
                ))}
              </select>
              <input value={noteText} onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addNote()}
                placeholder="Add a note, log a call, record a meeting..."
                style={{ flex: 1, minWidth: 200, background: "#1A0A0E", border: "1px solid #4A2030", borderRadius: 6,
                  color: "#fff", padding: "8px 12px", fontSize: 13 }} />
              <button onClick={addNote} disabled={savingNote || !noteText.trim()}
                style={{ background: "#7B2142", color: "#fff", border: "none", borderRadius: 6,
                  padding: "8px 18px", fontSize: 13, cursor: "pointer", opacity: (!noteText.trim() || savingNote) ? 0.5 : 1 }}>
                Log
              </button>
            </div>

            {/* Notes List */}
            {!client.notes?.length ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#555", fontSize: 13 }}>No activity logged yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {client.notes.map((n: any) => (
                  <div key={n.id} style={{ display: "flex", gap: 12, padding: "12px 16px",
                    background: "#1A0A0E", border: "1px solid #3A1828", borderRadius: 8 }}>
                    <div style={{ fontSize: 18, flexShrink: 0 }}>{NOTE_ICONS[n.note_type] || "📝"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontSize: 13, lineHeight: 1.5 }}>{n.note}</div>
                      <div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>
                        {n.created_by} · {new Date(n.created_at).toLocaleString("en-GB", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    </div>
                    {n.note_type !== "system" && (
                      <button onClick={() => deleteNote(n.id)}
                        style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <ClientExtendedTabs clientId={clientId} onToast={showToast} />
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <Modal title="Add Contact" onClose={() => setShowAddContact(false)}>
          <SInput label="Full Name *" value={newContact.full_name} onChange={(e: any) => setNewContact({ ...newContact, full_name: e.target.value })} placeholder="Jane Smith" />
          <SInput label="Job Title" value={newContact.job_title} onChange={(e: any) => setNewContact({ ...newContact, job_title: e.target.value })} placeholder="Chief Executive Officer" />
          <SInput label="Email Address *" type="email" value={newContact.email} onChange={(e: any) => setNewContact({ ...newContact, email: e.target.value })} placeholder="jane@company.com" />
          <SInput label="Phone Number" value={newContact.phone} onChange={(e: any) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="+44 7700 000000" />
          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#ccc" }}>
              <input type="checkbox" checked={newContact.is_primary} onChange={e => setNewContact({ ...newContact, is_primary: e.target.checked })} />
              Primary Contact
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#ccc" }}>
              <input type="checkbox" checked={newContact.is_signatory} onChange={e => setNewContact({ ...newContact, is_signatory: e.target.checked })} />
              Contract Signatory
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAddContact(false)}
              style={{ background: "none", border: "1px solid #4A2030", color: "#888", borderRadius: 7, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button onClick={addContact}
              style={{ background: "#7B2142", color: "#fff", border: "none", borderRadius: 7, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Add Contact
            </button>
          </div>
        </Modal>
      )}

      {/* Invite Link Modal */}
      {showInvite && (
        <Modal title="Onboarding Invite Sent" onClose={() => setShowInvite(false)}>
          <div style={{ textAlign: "center", paddingBottom: 8 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <p style={{ color: "#ccc", fontSize: 14, marginBottom: 16 }}>
              Share this onboarding link with the client to complete their registration.
            </p>
            <div style={{ background: "#1A0A0E", border: "1px solid #4A2030", borderRadius: 8, padding: "12px 16px",
              wordBreak: "break-all", fontSize: 12, color: "#a78bfa", marginBottom: 16, textAlign: "left" }}>
              {inviteUrl}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(inviteUrl); showToast("Link copied!"); }}
              style={{ background: "#7B2142", color: "#fff", border: "none", borderRadius: 7,
                padding: "10px 24px", fontSize: 14, cursor: "pointer", width: "100%" }}>
              Copy Link
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
