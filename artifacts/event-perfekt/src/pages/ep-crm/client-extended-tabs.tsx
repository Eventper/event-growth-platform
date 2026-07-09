import { useEffect, useState } from "react";

const TOKEN_KEY = "token";
function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
function headers() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
async function api(method: string, url: string, body?: any) {
  const res = await fetch(url, { method, headers: headers(), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

const TABS = ["Documents", "Collaboration", "Email Log", "Calendar", "Partnerships"] as const;
type Tab = typeof TABS[number];

export default function ClientExtendedTabs({ clientId, onToast }: { clientId: string; onToast: (m: string, t?: "success" | "error") => void }) {
  const [tab, setTab] = useState<Tab>("Documents");

  return (
    <div style={{ background: "#2A1018", border: "1px solid #4A2030", borderRadius: 12, marginTop: 24, overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #4A2030" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "14px 22px", background: tab === t ? "#3A1828" : "transparent", border: "none",
            color: tab === t ? "#E2C87A" : "#888", fontSize: 13, fontWeight: 600, cursor: "pointer",
            borderBottom: tab === t ? "2px solid #E2C87A" : "2px solid transparent",
          }}>{t}</button>
        ))}
      </div>
      <div style={{ padding: 22 }}>
        {tab === "Documents" && <DocumentsTab clientId={clientId} onToast={onToast} />}
        {tab === "Collaboration" && <CollaborationTab clientId={clientId} onToast={onToast} />}
        {tab === "Email Log" && <EmailLogTab clientId={clientId} onToast={onToast} />}
        {tab === "Calendar" && <CalendarTab clientId={clientId} onToast={onToast} />}
        {tab === "Partnerships" && <PartnershipsTab clientId={clientId} onToast={onToast} />}
      </div>
    </div>
  );
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────
function DocumentsTab({ clientId, onToast }: any) {
  const [docs, setDocs] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({ document_name: "", document_category: "Legal", document_subcategory: "", document_type: "", shared_with_client: true, version_notes: "" });
  const [uploading, setUploading] = useState(false);

  async function load() {
    try { const r = await api("GET", `/api/ep-clients/${clientId}/documents`); setDocs(r); } catch (e: any) { onToast(e.message, "error"); }
  }
  useEffect(() => { load(); }, [clientId]);

  async function upload() {
    if (!file) { onToast("Select a file first", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_name", meta.document_name || file.name);
      fd.append("document_category", meta.document_category);
      fd.append("document_subcategory", meta.document_subcategory);
      fd.append("document_type", meta.document_type);
      fd.append("shared_with_client", String(meta.shared_with_client));
      fd.append("version_notes", meta.version_notes);
      const res = await fetch(`/api/ep-clients/${clientId}/documents/upload`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      onToast("Document uploaded");
      setFile(null); setMeta({ ...meta, document_name: "", document_subcategory: "", document_type: "", version_notes: "" });
      load();
    } catch (e: any) { onToast(e.message, "error"); }
    setUploading(false);
  }

  async function newVersion(docId: number) {
    const input = document.createElement("input"); input.type = "file";
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      const notes = prompt("Version notes (optional):") || "";
      const fd = new FormData(); fd.append("file", f); fd.append("version_notes", notes);
      try {
        const res = await fetch(`/api/ep-clients/${clientId}/documents/${docId}/new-version`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
        if (!res.ok) throw new Error((await res.json()).message);
        onToast("New version uploaded"); load();
      } catch (e: any) { onToast(e.message, "error"); }
    };
    input.click();
  }

  async function toggleShare(docId: number, current: boolean) {
    try {
      await api("PATCH", `/api/ep-clients/${clientId}/documents/${docId}/share`, { shared_with_client: !current });
      onToast("Updated"); load();
    } catch (e: any) { onToast(e.message, "error"); }
  }

  return (
    <div>
      <div style={{ background: "#1A0A0E", border: "1px dashed #4A2030", borderRadius: 8, padding: 16, marginBottom: 18 }}>
        <div style={{ color: "#E2C87A", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Upload Document</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <input type="text" placeholder="Document name" value={meta.document_name} onChange={e => setMeta({ ...meta, document_name: e.target.value })} style={inpStyle} />
          <select value={meta.document_category} onChange={e => setMeta({ ...meta, document_category: e.target.value })} style={inpStyle}>
            <option>Legal</option><option>Pre-Engagement</option><option>During Engagement</option><option>Post Engagement</option><option>Correspondence</option>
          </select>
          <input type="text" placeholder="Subcategory" value={meta.document_subcategory} onChange={e => setMeta({ ...meta, document_subcategory: e.target.value })} style={inpStyle} />
          <input type="text" placeholder="Type (e.g. SOW)" value={meta.document_type} onChange={e => setMeta({ ...meta, document_type: e.target.value })} style={inpStyle} />
        </div>
        <input type="text" placeholder="Version notes" value={meta.version_notes} onChange={e => setMeta({ ...meta, version_notes: e.target.value })} style={{ ...inpStyle, width: "100%", marginBottom: 10 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#ccc", fontSize: 12, marginBottom: 10 }}>
          <input type="checkbox" checked={meta.shared_with_client} onChange={e => setMeta({ ...meta, shared_with_client: e.target.checked })} /> Share with client
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ flex: 1, color: "#ccc", fontSize: 12 }} />
          <button disabled={uploading} onClick={upload} style={btnStyle}>{uploading ? "Uploading…" : "Upload"}</button>
        </div>
      </div>
      {docs.length === 0 ? <Empty text="No documents yet" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map(d => (
            <div key={d.id} style={cardStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{d.document_name}</div>
                <div style={{ color: "#888", fontSize: 11, marginTop: 3 }}>
                  {d.document_category}{d.document_subcategory && ` · ${d.document_subcategory}`} · v{d.current_version} · {d.version_count} versions · {d.uploaded_by}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {d.current_file && <a href={d.current_file.file_url} download style={linkBtnStyle}>Download</a>}
                <button onClick={() => newVersion(d.id)} style={pillBtnStyle}>+ Version</button>
                <button onClick={() => toggleShare(d.id, d.shared_with_client)} style={{ ...pillBtnStyle, background: d.shared_with_client ? "#15803d" : "#4A2030" }}>
                  {d.shared_with_client ? "Shared" : "Private"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COLLABORATION ───────────────────────────────────────────────────────────
function CollaborationTab({ clientId, onToast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", organisation: "", role: "Partner Organisation", access_level: "view", can_upload: false, expiry_days: "30" });

  async function load() {
    try { setList(await api("GET", `/api/ep-clients/${clientId}/collaborators`)); } catch (e: any) { onToast(e.message, "error"); }
  }
  useEffect(() => { load(); }, [clientId]);

  async function submit() {
    try {
      await api("POST", `/api/ep-clients/${clientId}/collaborators/invite`, form);
      onToast("Invitation sent"); setShowModal(false);
      setForm({ full_name: "", email: "", organisation: "", role: "Partner Organisation", access_level: "view", can_upload: false, expiry_days: "30" });
      load();
    } catch (e: any) { onToast(e.message, "error"); }
  }

  async function remove(id: number) {
    if (!confirm("Remove this collaborator?")) return;
    try { await api("DELETE", `/api/ep-clients/${clientId}/collaborators/${id}`); onToast("Removed"); load(); }
    catch (e: any) { onToast(e.message, "error"); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ color: "#888", fontSize: 12 }}>{list.length} collaborators</div>
        <button onClick={() => setShowModal(true)} style={btnStyle}>+ Invite</button>
      </div>
      {list.length === 0 ? <Empty text="No collaborators invited yet" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map(c => (
            <div key={c.id} style={cardStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{c.full_name} <span style={{ color: "#888", fontWeight: 400, fontSize: 11 }}>({c.status})</span></div>
                <div style={{ color: "#a78bfa", fontSize: 12 }}>{c.email}</div>
                <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{c.organisation} · {c.role} · Invited by {c.invited_by_type === "client" ? "client" : "EP"}</div>
              </div>
              <button onClick={() => remove(c.id)} style={{ ...pillBtnStyle, background: "#7f1d1d" }}>Remove</button>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <ModalShell title="Invite Collaborator" onClose={() => setShowModal(false)}>
          <Input label="Full name *" value={form.full_name} onChange={(v: string) => setForm({ ...form, full_name: v })} />
          <Input label="Email *" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} />
          <Input label="Organisation" value={form.organisation} onChange={(v: string) => setForm({ ...form, organisation: v })} />
          <Select label="Role" value={form.role} onChange={(v: string) => setForm({ ...form, role: v })} options={["Trustee", "Partner Organisation", "Funder", "Advisor", "Other"]} />
          <Select label="Access level" value={form.access_level} onChange={(v: string) => setForm({ ...form, access_level: v })} options={["view", "comment", "edit"]} />
          <label style={{ display: "flex", gap: 8, color: "#ccc", fontSize: 12, marginBottom: 10 }}>
            <input type="checkbox" checked={form.can_upload} onChange={e => setForm({ ...form, can_upload: e.target.checked })} /> Can upload documents
          </label>
          <Select label="Link expiry" value={form.expiry_days} onChange={(v: string) => setForm({ ...form, expiry_days: v })} options={[{ v: "7", l: "7 days" }, { v: "30", l: "30 days" }, { v: "90", l: "90 days" }, { v: "none", l: "No expiry" }]} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button onClick={() => setShowModal(false)} style={{ ...pillBtnStyle, padding: "8px 16px" }}>Cancel</button>
            <button onClick={submit} style={btnStyle}>Send</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ─── EMAIL LOG ───────────────────────────────────────────────────────────────
function EmailLogTab({ clientId, onToast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ direction: "outbound", from_email: "info@eventperfekt.com", to_email: "", to_name: "", subject: "", body: "", category: "general", visible_to_client: true });

  async function load() {
    try { setList(await api("GET", `/api/ep-clients/${clientId}/emails`)); } catch (e: any) { onToast(e.message, "error"); }
  }
  useEffect(() => { load(); }, [clientId]);

  async function submit() {
    try {
      await api("POST", `/api/ep-clients/${clientId}/emails/log`, form);
      onToast("Email logged"); setShowModal(false);
      setForm({ ...form, to_email: "", to_name: "", subject: "", body: "" });
      load();
    } catch (e: any) { onToast(e.message, "error"); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ color: "#888", fontSize: 12 }}>{list.length} logged emails</div>
        <button onClick={() => setShowModal(true)} style={btnStyle}>+ Log Email</button>
      </div>
      {list.length === 0 ? <Empty text="No emails logged yet" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map(e => (
            <div key={e.id} style={cardStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{e.subject || "(no subject)"}</div>
                <div style={{ color: "#888", fontSize: 11 }}>{e.direction === "inbound" ? `From ${e.from_email}` : `To ${e.to_email}`} · {e.category} · {new Date(e.sent_at).toLocaleDateString("en-GB")}</div>
              </div>
              <span style={{ color: e.visible_to_client ? "#22c55e" : "#888", fontSize: 11 }}>{e.visible_to_client ? "Client can see" : "Internal"}</span>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <ModalShell title="Log Email" onClose={() => setShowModal(false)}>
          <Select label="Direction" value={form.direction} onChange={(v: string) => setForm({ ...form, direction: v })} options={["outbound", "inbound"]} />
          <Input label="From" value={form.from_email} onChange={(v: string) => setForm({ ...form, from_email: v })} />
          <Input label="To email" value={form.to_email} onChange={(v: string) => setForm({ ...form, to_email: v })} />
          <Input label="To name" value={form.to_name} onChange={(v: string) => setForm({ ...form, to_name: v })} />
          <Input label="Subject" value={form.subject} onChange={(v: string) => setForm({ ...form, subject: v })} />
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#888", fontSize: 11, marginBottom: 3 }}>Body</div>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={5} style={{ ...inpStyle, width: "100%", boxSizing: "border-box", fontFamily: "Poppins, sans-serif", resize: "vertical" }} />
          </div>
          <Select label="Category" value={form.category} onChange={(v: string) => setForm({ ...form, category: v })} options={["general", "deliverable", "invoice", "meeting", "partnership"]} />
          <label style={{ display: "flex", gap: 8, color: "#ccc", fontSize: 12, marginBottom: 10 }}>
            <input type="checkbox" checked={form.visible_to_client} onChange={e => setForm({ ...form, visible_to_client: e.target.checked })} /> Visible to client
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button onClick={() => setShowModal(false)} style={{ ...pillBtnStyle, padding: "8px 16px" }}>Cancel</button>
            <button onClick={submit} style={btnStyle}>Log</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ─── CALENDAR ────────────────────────────────────────────────────────────────
function CalendarTab({ clientId, onToast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_type: "meeting", start_date: "", all_day: false, location: "", video_link: "", colour: "burgundy", is_gateway: false, phase_number: 0 });

  async function load() {
    try { setList(await api("GET", `/api/ep-clients/${clientId}/calendar`)); } catch (e: any) { onToast(e.message, "error"); }
  }
  useEffect(() => { load(); }, [clientId]);

  async function submit() {
    if (!form.title || !form.start_date) { onToast("Title and start date required", "error"); return; }
    try {
      await api("POST", `/api/ep-clients/${clientId}/calendar/event`, { ...form, phase_number: form.phase_number || null });
      onToast("Event created"); setShowModal(false);
      setForm({ title: "", description: "", event_type: "meeting", start_date: "", all_day: false, location: "", video_link: "", colour: "burgundy", is_gateway: false, phase_number: 0 });
      load();
    } catch (e: any) { onToast(e.message, "error"); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ color: "#888", fontSize: 12 }}>{list.length} events</div>
        <button onClick={() => setShowModal(true)} style={btnStyle}>+ New Event</button>
      </div>
      {list.length === 0 ? <Empty text="No events scheduled" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {list.map(e => {
            const d = new Date(e.start_date);
            return (
              <div key={e.id} style={{ ...cardStyle, borderLeft: `4px solid ${{ burgundy: "#7B2142", gold: "#c89f2d", amber: "#d97706", green: "#16a34a", navy: "#1e3a8a" }[e.colour as string] || "#7B2142"}` }}>
                <div style={{ minWidth: 60, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase" }}>{d.toLocaleDateString("en-GB", { month: "short" })}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#E2C87A" }}>{d.getDate()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{e.title}{e.is_gateway && <span style={{ color: "#c89f2d", marginLeft: 6, fontSize: 10 }}>⚑ GATEWAY</span>}</div>
                  <div style={{ color: "#888", fontSize: 11 }}>{e.event_type.replace(/_/g, " ")}{!e.all_day && ` · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}{e.client_response !== "pending" && ` · ${e.client_response}`}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showModal && (
        <ModalShell title="New Calendar Event" onClose={() => setShowModal(false)}>
          <Input label="Title *" value={form.title} onChange={(v: string) => setForm({ ...form, title: v })} />
          <Select label="Type" value={form.event_type} onChange={(v: string) => setForm({ ...form, event_type: v })} options={["meeting", "gateway", "deliverable_due", "payment_reminder", "check_in"]} />
          <Input label="Start date/time *" value={form.start_date} onChange={(v: string) => setForm({ ...form, start_date: v })} placeholder="2026-05-15 10:00" type="datetime-local" />
          <label style={{ display: "flex", gap: 8, color: "#ccc", fontSize: 12, marginBottom: 10 }}>
            <input type="checkbox" checked={form.all_day} onChange={e => setForm({ ...form, all_day: e.target.checked })} /> All day
          </label>
          <Input label="Location" value={form.location} onChange={(v: string) => setForm({ ...form, location: v })} />
          <Input label="Video link" value={form.video_link} onChange={(v: string) => setForm({ ...form, video_link: v })} />
          <Input label="Description" value={form.description} onChange={(v: string) => setForm({ ...form, description: v })} />
          <Select label="Colour" value={form.colour} onChange={(v: string) => setForm({ ...form, colour: v })} options={["burgundy", "gold", "amber", "green", "navy"]} />
          <label style={{ display: "flex", gap: 8, color: "#ccc", fontSize: 12, marginBottom: 10 }}>
            <input type="checkbox" checked={form.is_gateway} onChange={e => setForm({ ...form, is_gateway: e.target.checked })} /> Is gateway
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button onClick={() => setShowModal(false)} style={{ ...pillBtnStyle, padding: "8px 16px" }}>Cancel</button>
            <button onClick={submit} style={btnStyle}>Create</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ─── PARTNERSHIPS ────────────────────────────────────────────────────────────
function PartnershipsTab({ clientId, onToast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [draftModal, setDraftModal] = useState(false);
  const [viewContract, setViewContract] = useState<any>(null);
  const [drafting, setDrafting] = useState(false);
  const [form, setForm] = useState({ partner_name: "", partner_organisation: "", partner_email: "", contract_type: "Collaboration Agreement", brief: "" });

  async function load() {
    try { setList(await api("GET", `/api/ep-clients/${clientId}/partnerships`)); } catch (e: any) { onToast(e.message, "error"); }
  }
  useEffect(() => { load(); }, [clientId]);

  async function draft() {
    if (!form.partner_name || !form.partner_organisation || !form.brief) { onToast("Fill in partner name, organisation, and brief", "error"); return; }
    setDrafting(true);
    try {
      await api("POST", `/api/ep-clients/${clientId}/partnerships/draft`, form);
      onToast("EP Agent drafted contract ✓"); setDraftModal(false);
      setForm({ partner_name: "", partner_organisation: "", partner_email: "", contract_type: "Collaboration Agreement", brief: "" });
      load();
    } catch (e: any) { onToast(e.message, "error"); }
    setDrafting(false);
  }

  async function sendToPartner(id: number) {
    try { await api("POST", `/api/ep-clients/${clientId}/partnerships/${id}/send-to-partner`, {}); onToast("Sent to partner"); load(); }
    catch (e: any) { onToast(e.message, "error"); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ color: "#888", fontSize: 12 }}>{list.length} contracts</div>
        <button onClick={() => setDraftModal(true)} style={btnStyle}>+ EP Agent Draft</button>
      </div>
      {list.length === 0 ? <Empty text="No partnership contracts yet" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map(c => (
            <div key={c.id} style={cardStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{c.contract_title}</div>
                <div style={{ color: "#888", fontSize: 11 }}>{c.partner_name} at {c.partner_organisation} · {c.contract_type} · {c.status}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setViewContract(c)} style={pillBtnStyle}>View</button>
                {c.partner_email && c.status !== "sent_to_partner" && <button onClick={() => sendToPartner(c.id)} style={pillBtnStyle}>Send to Partner</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {draftModal && (
        <ModalShell title="EP Agent — Draft Partnership Contract" onClose={() => setDraftModal(false)} width={620}>
          <Input label="Partner name *" value={form.partner_name} onChange={(v: string) => setForm({ ...form, partner_name: v })} />
          <Input label="Partner organisation *" value={form.partner_organisation} onChange={(v: string) => setForm({ ...form, partner_organisation: v })} />
          <Input label="Partner email" value={form.partner_email} onChange={(v: string) => setForm({ ...form, partner_email: v })} />
          <Select label="Contract type" value={form.contract_type} onChange={(v: string) => setForm({ ...form, contract_type: v })} options={["MOU", "Collaboration Agreement", "NDA", "Referral Agreement", "Service Agreement"]} />
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#888", fontSize: 11, marginBottom: 3 }}>Brief * — describe the partnership in plain English</div>
            <textarea value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })} rows={5} placeholder="e.g. We want to partner with XYZ charity to refer young people affected by knife crime to their mentoring programme. They will deliver 1:1 support over 6 months..." style={{ ...inpStyle, width: "100%", boxSizing: "border-box", fontFamily: "Poppins, sans-serif", resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setDraftModal(false)} style={{ ...pillBtnStyle, padding: "8px 16px" }}>Cancel</button>
            <button disabled={drafting} onClick={draft} style={btnStyle}>{drafting ? "EP Agent drafting… (30-60s)" : "Draft with EP Agent"}</button>
          </div>
        </ModalShell>
      )}
      {viewContract && (
        <ModalShell title={viewContract.contract_title} onClose={() => setViewContract(null)} width={780}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{viewContract.partner_name} at {viewContract.partner_organisation} · {viewContract.contract_type} · Status: {viewContract.status}</div>
          <pre style={{ background: "#1A0A0E", border: "1px solid #4A2030", borderRadius: 6, padding: 16, color: "#e8d9b8", fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "Poppins, sans-serif", maxHeight: 500, overflowY: "auto" }}>
            {viewContract.document_text || "No contract text available (uploaded document — download from URL)."}
          </pre>
          {viewContract.document_url && <a href={viewContract.document_url} download style={{ display: "inline-block", marginTop: 10, color: "#E2C87A", fontSize: 12 }}>Download attachment</a>}
        </ModalShell>
      )}
    </div>
  );
}

// ─── SHARED UI ───────────────────────────────────────────────────────────────
const inpStyle: React.CSSProperties = { background: "#1A0A0E", border: "1px solid #4A2030", borderRadius: 6, color: "#fff", padding: "8px 12px", fontSize: 12 };
const btnStyle: React.CSSProperties = { background: "#7B2142", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const pillBtnStyle: React.CSSProperties = { background: "#4A2030", color: "#E2C87A", border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" };
const linkBtnStyle: React.CSSProperties = { background: "#7B2142", color: "#fff", borderRadius: 5, padding: "6px 12px", fontSize: 11, fontWeight: 600, textDecoration: "none" };
const cardStyle: React.CSSProperties = { display: "flex", gap: 14, alignItems: "center", padding: 12, background: "#1A0A0E", border: "1px solid #3A1828", borderRadius: 8 };

function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: "center", padding: "28px 0", color: "#555", fontSize: 13 }}>{text}</div>;
}

function Input({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: "#888", fontSize: 11, marginBottom: 3 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inpStyle, width: "100%", boxSizing: "border-box" }} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: any[] }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: "#888", fontSize: 11, marginBottom: 3 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inpStyle, width: "100%", boxSizing: "border-box" }}>
        {options.map((o: any) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.v ?? o.value} value={o.v ?? o.value}>{o.l ?? o.label}</option>)}
      </select>
    </div>
  );
}

function ModalShell({ title, children, onClose, width = 500 }: { title: string; children: any; onClose: () => void; width?: number }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1A0A0E", border: "1px solid #4A2030", borderRadius: 12, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #4A2030", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#E2C87A", margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}
