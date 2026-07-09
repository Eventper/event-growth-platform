import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout, { portalCard } from "./layout";
import { getPortalUser, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";
import { ChevronLeft, ChevronDown, ChevronRight, Paperclip, Send, Upload, CheckCircle, Clock, AlertTriangle, XCircle, Edit3 } from "lucide-react";

const G = {
  card:   "#ffffff",
  border: "#e5e7eb",
  gold:   "#C9A84C",
  green:  "#16a34a",
  amber:  "#d97706",
  red:    "#dc2626",
  blue:   "#2563eb",
  purple: "#7c3aed",
  text:   "#1f2937",
  muted:  "#6b7280",
};

type ActionRequest = {
  id: number;
  subject: string;
  body: string;
  priority: string;
  status: string;
  due_date: string | null;
  trustee_name: string;
  trustee_email: string;
  response: string | null;
  responded_at: string | null;
  responded_by_name: string | null;
  attachment_url: string | null;
  response_attachment_url: string | null;
  created_by_name: string;
  deliverable_id: number | null;
  deliverable_number: number | null;
  deliverable_title: string | null;
  created_at: string;
  updated_at: string;
};

function statusColor(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "open" || s === "awaiting") return { bg: "#fef3c7", color: "#92400e", label: "Awaiting response" };
  if (s === "responded") return { bg: "#dcfce7", color: G.green, label: "Responded" };
  if (s === "resolved") return { bg: "#dcfce7", color: G.green, label: "Resolved" };
  if (s === "closed") return { bg: "#e5e7eb", color: "#374151", label: "Closed" };
  if (s === "in_progress") return { bg: "#dbeafe", color: "#1e40af", label: "In Progress" };
  return { bg: "#f3f4f6", color: "#4b5563", label: s };
}

function priorityColor(priority: string) {
  const p = (priority || "").toLowerCase();
  if (p === "urgent" || p === "high") return { bg: "#fee2e2", color: "#991b1b" };
  if (p === "medium") return { bg: "#fef3c7", color: "#92400e" };
  return { bg: "#e0e7ff", color: "#3730a3" };
}

export default function ClientPortalActionItems() {
  const [, setLocation] = useLocation();
  const user = getPortalUser();
  const [items, setItems] = useState<ActionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [editMode, setEditMode] = useState<number | null>(null);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [attachmentUrls, setAttachmentUrls] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [closeNote, setCloseNote] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!user?.token) { setLocation("/client-portal/login"); return; }
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const data = await portalFetch("GET", "/api/client-portal/alli/client-action-requests");
      if (Array.isArray(data)) setItems(data);
      else setItems([]);
    } catch (err: any) {
      if (err.message?.includes("401")) { clearPortalSession(); setLocation("/client-portal/login"); }
      else setError("Failed to load action items.");
    } finally { setLoading(false); }
  }

  const filtered = statusFilter
    ? items.filter(i => (i.status || "").toLowerCase() === statusFilter)
    : items;

  const openCount = items.filter(i => (i.status || "").toLowerCase() === "open").length;
  const respondedCount = items.filter(i => (i.status || "").toLowerCase() === "responded").length;
  const closedCount = items.filter(i => (i.status || "").toLowerCase() === "closed").length;

  async function handleRespond(id: number, isEdit = false) {
    const text = (replyText[id] || "").trim();
    if (!text) return;
    setSaving(s => ({ ...s, [id]: true }));
    try {
      const attach = attachmentUrls[id] || undefined;
      await portalFetch("POST", `/api/client-portal/alli/client-action-requests/${id}/respond`, {
        response_text: text,
        response_attachment_url: attach,
      });
      setReplyText(r => ({ ...r, [id]: "" }));
      setAttachmentUrls(a => ({ ...a, [id]: "" }));
      setEditMode(null);
      await loadItems();
    } catch (err: any) {
      setError(err.message || "Failed to save response");
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  }

  async function handleFileUpload(id: number, file: File) {
    if (!file) return;
    setUploading(u => ({ ...u, [id]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/client-portal/alli/client-action-requests/${id}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user?.token || ""}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setAttachmentUrls(a => ({ ...a, [id]: data.url }));
      } else {
        setError(data.message || "Upload failed");
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(u => ({ ...u, [id]: false }));
    }
  }

  return (
    <PortalLayout>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setLocation("/client-portal/home")}
            style={{ background: "transparent", border: `1px solid ${G.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: G.text }}
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: G.text }}>My Action Items</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: G.muted }}>All requests from your delivery team</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <span style={{ background: G.amber + "18", color: G.amber, borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 800 }}>
              {openCount} open
            </span>
            <span style={{ background: G.green + "18", color: G.green, borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 800 }}>
              {respondedCount} responded
            </span>
            <span style={{ background: G.muted + "18", color: G.muted, borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 800 }}>
              {closedCount} closed
            </span>
          </div>
        </div>

        {/* Filters */}
        <div style={{ ...portalCard({ padding: "12px 16px", marginBottom: 16 }), display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: G.muted }}>Filter:</span>
          {["", "open", "responded", "closed"].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: "4px 12px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: statusFilter === f ? G.blue : "#f3f4f6",
                color: statusFilter === f ? "#fff" : G.muted,
              }}
            >
              {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button
            onClick={loadItems}
            style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: `1px solid ${G.border}`, background: "#fff", color: G.text, cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ ...portalCard({ padding: "10px 14px", marginBottom: 16, borderLeft: `3px solid ${G.red}` }), background: "#fef2f2", color: G.red, fontSize: 13 }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 10, background: "transparent", border: "none", color: G.red, cursor: "pointer", fontWeight: 700 }}>Dismiss</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: G.muted, fontSize: 14 }}>Loading action items…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...portalCard({ padding: 40, textAlign: "center" }) }}>
            <CheckCircle size={32} color={G.green} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: G.text }}>No action items</div>
            <div style={{ fontSize: 12, color: G.muted, marginTop: 4 }}>All caught up — your delivery team has nothing pending.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map(item => {
              const s = statusColor(item.status);
              const p = priorityColor(item.priority);
              const isDetail = detailOpen === item.id;
              const isClosed = item.status === "closed" || item.status === "responded";
              const hasResponse = !!item.response;
              const isEditing = editMode === item.id;
              return (
                <div key={item.id} style={{ ...portalCard({ padding: 0, overflow: "hidden" }), borderLeft: `4px solid ${isClosed ? G.green : item.priority === "High" ? G.red : G.gold}` }}>
                  {/* Summary row */}
                  <div
                    onClick={() => setDetailOpen(isDetail ? null : item.id)}
                    style={{ padding: "16px 18px", cursor: "pointer", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ background: p.bg, color: p.color, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                          {item.priority || "Normal"}
                        </span>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
                          {s.label}
                        </span>
                        {item.deliverable_number && (
                          <span style={{ fontSize: 10, color: G.blue, fontWeight: 700 }}>D{item.deliverable_number}</span>
                        )}
                        {item.attachment_url && (
                          <span style={{ fontSize: 10, color: G.muted }}><Paperclip size={10} style={{ display: "inline", verticalAlign: "middle" }} /> Attachment</span>
                        )}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: G.text, lineHeight: 1.4 }}>{item.subject}</div>
                      <div style={{ fontSize: 11, color: G.muted, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span><strong>Owner:</strong> {item.trustee_name || "Unassigned"}</span>
                        <span>From: {item.created_by_name}</span>
                        {item.due_date && <span style={{ color: new Date(item.due_date) < new Date() ? G.red : G.muted }}>Due: {new Date(item.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                        <span>Sent: {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isDetail ? <ChevronDown size={18} color={G.muted} /> : <ChevronRight size={18} color={G.muted} />}
                    </div>
                  </div>

                  {/* Detail panel */}
                  {isDetail && (
                    <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${G.border}`, background: "#fafafa" }}>
                      {/* Body */}
                      <div style={{ padding: "14px 0", fontSize: 13, color: G.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {item.body}
                      </div>

                      {/* Deliverable link */}
                      {item.deliverable_number && (
                        <div style={{ marginBottom: 12 }}>
                          <button
                            onClick={() => setLocation(`/client-portal/project#d${item.deliverable_number}`)}
                            style={{ background: G.blue + "12", border: `1px solid ${G.blue}30`, color: G.blue, borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            Open Deliverable D{item.deliverable_number} →
                          </button>
                        </div>
                      )}

                      {/* Attachments */}
                      {(item.attachment_url || item.response_attachment_url) && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                          {item.attachment_url && (
                            <a href={item.attachment_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: G.blue, display: "flex", alignItems: "center", gap: 4, background: "#fff", border: `1px solid ${G.border}`, borderRadius: 6, padding: "5px 10px", textDecoration: "none" }}>
                              <Paperclip size={12} /> Team attachment
                            </a>
                          )}
                          {item.response_attachment_url && (
                            <a href={item.response_attachment_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: G.green, display: "flex", alignItems: "center", gap: 4, background: "#fff", border: `1px solid ${G.green}40`, borderRadius: 6, padding: "5px 10px", textDecoration: "none" }}>
                              <Paperclip size={12} /> Your attachment
                            </a>
                          )}
                        </div>
                      )}

                      {/* Previous response */}
                      {hasResponse && !isEditing && (
                        <div style={{ background: "#f0fdf4", border: `1px solid ${G.green}30`, borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: G.green, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                            <CheckCircle size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                            Your Response
                          </div>
                          <div style={{ fontSize: 13, color: G.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{item.response}</div>
                          {item.responded_at && (
                            <div style={{ fontSize: 10, color: G.muted, marginTop: 6 }}>
                              {item.responded_by_name || "You"} · {new Date(item.responded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          )}
                          <button
                            onClick={() => { setEditMode(item.id); setReplyText(r => ({ ...r, [item.id]: item.response || "" })); }}
                            style={{ marginTop: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: G.blue, background: "transparent", border: `1px solid ${G.blue}40`, borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <Edit3 size={10} /> Edit Response
                          </button>
                        </div>
                      )}

                      {/* Respond / Edit form */}
                      {(!hasResponse || isEditing) && (
                        <div style={{ background: "#fff", border: `1px solid ${G.border}`, borderRadius: 8, padding: "14px", marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: G.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                            {isEditing ? "Edit Your Response" : "Write Your Response"}
                          </div>
                          <textarea
                            value={replyText[item.id] || ""}
                            onChange={e => setReplyText(r => ({ ...r, [item.id]: e.target.value }))}
                            placeholder={isEditing ? "Update your response…" : "Type your response here…"}
                            style={{ width: "100%", minHeight: 100, padding: "10px 12px", border: `1px solid ${G.border}`, borderRadius: 6, fontSize: 13, fontFamily: "Poppins, sans-serif", color: G.text, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                          />

                          {/* Attachment upload */}
                          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#f3f4f6", borderRadius: 5, fontSize: 11, fontWeight: 700, color: G.text, cursor: "pointer", border: `1px solid ${G.border}` }}>
                              <Upload size={12} />
                              {uploading[item.id] ? "Uploading…" : "Attach file"}
                              <input
                                type="file"
                                style={{ display: "none" }}
                                onChange={e => e.target.files?.[0] && handleFileUpload(item.id, e.target.files[0])}
                              />
                            </label>
                            {attachmentUrls[item.id] && (
                              <span style={{ fontSize: 11, color: G.green }}>
                                <CheckCircle size={10} style={{ display: "inline", verticalAlign: "middle" }} /> Attached
                              </span>
                            )}
                          </div>

                          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {isEditing && (
                              <button
                                onClick={() => { setEditMode(null); setReplyText(r => ({ ...r, [item.id]: "" })); setAttachmentUrls(a => ({ ...a, [item.id]: "" })); }}
                                style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, border: `1px solid ${G.border}`, background: "#fff", color: G.text, cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => handleRespond(item.id, isEditing)}
                              disabled={saving[item.id] || !replyText[item.id]?.trim()}
                              style={{
                                padding: "7px 18px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 800,
                                border: "none",
                                background: saving[item.id] || !replyText[item.id]?.trim() ? G.border : G.blue,
                                color: "#fff",
                                cursor: saving[item.id] || !replyText[item.id]?.trim() ? "not-allowed" : "pointer",
                                opacity: saving[item.id] || !replyText[item.id]?.trim() ? 0.5 : 1,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <Send size={12} />
                              {saving[item.id] ? "Saving…" : isEditing ? "Update Response" : "Send Response"}
                            </button>
                            {item.status === "open" && (
                              <button
                                onClick={async () => {
                                  setSaving(s => ({ ...s, [item.id]: true }));
                                  try {
                                    await portalFetch("POST", `/api/client-portal/alli/client-action-requests/${item.id}/status`, { status: "in_progress" });
                                    await loadItems();
                                  } catch (err: any) { setError(err.message || "Failed to mark in progress"); }
                                  finally { setSaving(s => ({ ...s, [item.id]: false })); }
                                }}
                                disabled={saving[item.id]}
                                style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, border: `1px solid ${G.amber}`, background: "#fff", color: G.amber, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                              >
                                <Clock size={12} /> Mark In Progress
                              </button>
                            )}
                            {(item.status === "open" || item.status === "in_progress" || item.status === "responded") && (
                              <button
                                onClick={async () => {
                                  const note = (closeNote[item.id] || "").trim();
                                  setSaving(s => ({ ...s, [item.id]: true }));
                                  try {
                                    await portalFetch("POST", `/api/client-portal/alli/client-action-requests/${item.id}/close`, { note });
                                    setCloseNote(n => ({ ...n, [item.id]: "" }));
                                    await loadItems();
                                  } catch (err: any) { setError(err.message || "Failed to close"); }
                                  finally { setSaving(s => ({ ...s, [item.id]: false })); }
                                }}
                                disabled={saving[item.id]}
                                style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, border: `1px solid ${G.muted}`, background: "#fff", color: G.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                              >
                                <XCircle size={12} /> Close
                              </button>
                            )}
                          </div>
                          {(item.status === "open" || item.status === "in_progress" || item.status === "responded") && (
                            <div style={{ marginTop: 8 }}>
                              <input
                                value={closeNote[item.id] || ""}
                                onChange={e => setCloseNote(n => ({ ...n, [item.id]: e.target.value }))}
                                placeholder="Optional closing note…"
                                style={{ width: "100%", padding: "6px 10px", border: `1px solid ${G.border}`, borderRadius: 5, fontSize: 12, fontFamily: "Poppins, sans-serif", color: G.text, boxSizing: "border-box" }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
