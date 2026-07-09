import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import PortalLayout, { portalCard } from "./layout";
import { getPortalToken, getPortalUser, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";
import { ChevronDown, ChevronRight, Download, Clock } from "lucide-react";

function isAlliUser(user: any) {
  if (!user) return false;
  const org = (user.organisation || user.organization || "").toLowerCase();
  const pid = (user.project_id || user.projectId || "").toLowerCase();
  return org.includes("alli") || pid.includes("alli");
}

const GOLD = "#C9A84C";
const DARK = "#2a0808";
const BORDER = "#e5e7eb";
const BURGUNDY = "#3D0B0B";
const CARD_BG = "#f8fafc";
const TEXT = "#1f2937";
const MUTED = "#6b7280";

const TABS = ["All", "Legal", "Pre-Engagement", "During Engagement", "Post Engagement", "Correspondence", "Client Uploads", "Templates"];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  UNREAD: { label: "Unread", bg: "rgba(245,158,11,0.18)", color: "#f59e0b" },
  READ: { label: "Read", bg: "rgba(59,130,246,0.18)", color: "#60a5fa" },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "rgba(239,68,68,0.18)", color: "#f87171" },
  SIGNED: { label: "Signed", bg: "rgba(34,197,94,0.18)", color: "#4ade80" },
  SUPERSEDED: { label: "Superseded", bg: "rgba(156,163,175,0.18)", color: "#9ca3af" },
};

type Doc = {
  id: number;
  document_name: string;
  document_category: string | null;
  document_subcategory: string | null;
  document_type: string | null;
  current_version: number;
  uploaded_by: string;
  uploaded_by_type: string;
  shared_with_client: boolean;
  created_at: string;
  current_file: { file_url: string; file_name: string; version_number: number } | null;
  version_count: number;
  open_comments: number;
  signed_by: string | null;
  signed_at: string | null;
  signature_text: string | null;
  is_signed: boolean | null;
  read_by: string | null;
  read_at: string | null;
  status: string | null;
  rejection_type: string | null;
  rejection_reason: string | null;
  review_status?: string | null;
  reviewed_at?: string | null;
};

type Version = {
  id: number;
  version_number: number;
  file_url: string;
  file_name: string;
  version_notes: string | null;
  uploaded_by: string;
  created_at: string;
  is_current: boolean;
};

export default function ClientPortalDocuments() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [tab, setTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<Doc | null>(null);
  const [versionsFor, setVersionsFor] = useState<Doc | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [chatFor, setChatFor] = useState<Doc | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [commentFor, setCommentFor] = useState<Doc | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState({ name: "", category: "Client Uploads", description: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [changeForm, setChangeForm] = useState({ documentId: "", changeDescription: "", purpose: "", costImpact: "", owner: "", requestedDate: new Date().toISOString().slice(0, 10) });
  const [changeSubmitting, setChangeSubmitting] = useState(false);
  const [viewerPanel, setViewerPanel] = useState<"review" | "approve" | "reject" | null>(null);
  const [signatureText, setSignatureText] = useState("");
  const [rejectionType, setRejectionType] = useState("Request Edit");
  const [rejectionReason, setRejectionReason] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [location, setLocation] = useLocation();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const user = getPortalUser();
  const alli = isAlliUser(user);

  // ALLI document state
  const [alliDocs, setAlliDocs] = useState<any[]>([]);
  const [alliTab, setAlliTab] = useState<"external" | "weekly_reports">("external");
  const [alliHistoryOpen, setAlliHistoryOpen] = useState<Record<string | number, boolean>>({});
  const [alliHistory, setAlliHistory] = useState<Record<string | number, any[]>>({});

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function docStatus(d: Doc) {
    if (d.review_status) return d.review_status;
    if (d.is_signed) return "SIGNED";
    if (d.status) return d.status;
    return d.read_at ? "READ" : "UNREAD";
  }

  async function load() {
    try {
      const d = await portalFetch("GET", "/api/client-portal/documents");
      setDocs(Array.isArray(d) ? d : []);
      const cr = await portalFetch("GET", "/api/client-portal/change-requests");
      setChangeRequests(Array.isArray(cr) ? cr : []);
    } catch (e: any) {
      if (e.message?.includes("401")) { clearPortalSession(); setLocation("/client-portal/login"); }
    }
    if (alli) {
      try {
        // Load ALLI documents from sync server (external + weekly_reports lanes)
        const alliData = await portalFetch("GET", "/api/client-portal/alli/documents");
        const data = alliData || {};
        const external = Array.isArray(data.external) ? data.external : [];
        const weeklyReports = Array.isArray(data.weekly_reports) ? data.weekly_reports : [];
        // Merge both lanes into alliDocs with a lane marker
        setAlliDocs([
          ...external.map((d: any) => ({ ...d, _lane: "external" })),
          ...weeklyReports.map((d: any) => ({ ...d, _lane: "weekly_reports" })),
        ]);
      } catch {}
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!getPortalToken()) { setLocation("/client-portal/login"); return; }
    load();
  }, []);

  useEffect(() => {
    if (location.startsWith("/portal/alli/client/")) {
      setAlliTab("external");
    }
  }, [location]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function loadAlliHistory(docId: string | number) {
    if (alliHistory[docId]) {
      setAlliHistoryOpen(p => ({ ...p, [docId]: !p[docId] }));
      return;
    }
    try {
      const h = await portalFetch("GET", `/api/client-portal/alli/documents/${docId}/history`);
      setAlliHistory(p => ({ ...p, [docId]: Array.isArray(h) ? h : [] }));
      setAlliHistoryOpen(p => ({ ...p, [docId]: true }));
    } catch {
      setAlliHistory(p => ({ ...p, [docId]: [] }));
      setAlliHistoryOpen(p => ({ ...p, [docId]: true }));
    }
  }

  async function openViewer(d: Doc) {
    setViewingDoc(d);
    setViewerPanel(null);
    setRejectionType("Request Edit");
    setRejectionReason("");
    if (!d.read_at && d.uploaded_by_type !== "client") {
      try {
        await portalFetch("PATCH", `/api/client-portal/documents/${d.id}/read`, {});
        setDocs(prev => prev.map(x => x.id === d.id ? { ...x, read_at: new Date().toISOString(), status: x.status === "UNREAD" ? "READ" : (x.status || "READ") } : x));
        setViewingDoc(prev => prev ? { ...prev, read_at: new Date().toISOString(), status: prev.status === "UNREAD" ? "READ" : (prev.status || "READ") } : null);
      } catch {}
    }
  }

  async function openVersions(d: Doc) {
    setVersionsFor(d);
    try {
      const v = await portalFetch("GET", `/api/client-portal/documents/${d.id}/versions`);
      setVersions(Array.isArray(v) ? v : []);
    } catch { setVersions([]); }
  }

  async function openChat(d: Doc) {
    setChatFor(d);
    setCommentFor(null);
    setChatLoading(true);
    try {
      const msgs = await portalFetch("GET", `/api/client-portal/documents/${d.id}/chat`);
      setChatMessages(Array.isArray(msgs) ? msgs : []);
    } catch { setChatMessages([]); }
    setChatLoading(false);
  }

  function openComment(d: Doc) {
    setCommentFor(d);
    setChatFor(null);
  }

  async function deleteDoc(d: Doc) {
    const ok = window.confirm(`Are you sure you want to delete "${d.document_name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await portalFetch("DELETE", `/api/client-portal/documents/${d.id}`);
      setDocs(prev => prev.filter(x => x.id !== d.id));
      showToast("Document deleted ✓");
    } catch (e: any) { showToast(e.message || "Failed to delete document"); }
  }

  async function sendChatMessage() {
    if (!chatFor || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      const created = await portalFetch("POST", `/api/client-portal/documents/${chatFor.id}/chat`, { message: text });
      setChatMessages(prev => [...prev, created]);
      const docsRes = await portalFetch("GET", "/api/client-portal/documents");
      setDocs(Array.isArray(docsRes) ? docsRes : docs);
    } catch (e: any) {
      showToast(e.message || "Failed to send message");
    }
  }

  async function sendComment() {
    if (!viewingDoc || !commentInput.trim()) return;
    const text = commentInput.trim();
    setCommentInput("");
    try {
      await portalFetch("POST", `/api/client-portal/documents/${viewingDoc.id}/comment`, { comment: text });
      showToast("Comment added ✓");
      const msgs = await portalFetch("GET", `/api/client-portal/documents/${viewingDoc.id}/chat`);
      setChatMessages(Array.isArray(msgs) ? msgs : chatMessages);
      if (chatFor?.id === viewingDoc.id) {
        setChatMessages(Array.isArray(msgs) ? msgs : []);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to add comment");
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_name", uploadMeta.name || file.name);
      fd.append("document_category", uploadMeta.category);
      fd.append("description", uploadMeta.description);
      const token = getPortalToken();
      const res = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/client-portal/documents/upload");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status }));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(fd);
      });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      showToast("Document uploaded — the EP team has been notified ✓");
      setUploadMeta({ name: "", category: "Client Uploads", description: "" });
      if (fileRef.current) fileRef.current.value = "";
      setUploadProgress(0);
      load();
    } catch (e: any) { showToast(e.message || "Upload failed"); }
    setUploading(false);
  }

  const filtered = (Array.isArray(docs) ? docs : []).filter(d => {
    if (tab === "All") return true;
    if (tab === "Client Uploads") return d.uploaded_by_type === "client";
    if (tab === "Templates") return d.document_category === "Templates";
    return (d.document_category || "").toLowerCase().includes(tab.toLowerCase().split(" ")[0].toLowerCase());
  });

  const inp: React.CSSProperties = { padding: "9px 12px", background: "#f9fafb", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: TEXT, fontFamily: "Poppins, sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };
  const btn = (bg: string, fg = "#fff"): React.CSSProperties => ({ padding: "10px 20px", background: bg, color: fg, border: "none", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Poppins, sans-serif" });

  function StatusBadge({ status, signedAt }: { status: string; signedAt?: string | null }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UNREAD;
    return <span style={{ background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const }}>{cfg.label}{status === "SIGNED" && signedAt ? ` · ${new Date(signedAt).toLocaleDateString("en-GB")}` : ""}</span>;
  }

  if (loading) return <PortalLayout><div style={{ textAlign: "center", padding: 60, color: "#fff" }}>Loading documents…</div></PortalLayout>;

  const alliTabDocs = alliDocs.filter((d: any) => d._lane === alliTab);

  return (
    <PortalLayout>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, background: "#1a0015", color: "#fff", border: `1px solid ${GOLD}40`, padding: "12px 20px", borderRadius: 10, zIndex: 99999, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", fontWeight: 500, maxWidth: 380 }}>{toast}</div>}

      {/* ── ALLI documents (ALLI users only) ─────────────────── */}
      {alli && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>ALLI Project Documents</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, margin: "0 0 16px" }}>Documents shared by the EP team via the ALLI programme</p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
            {([["external", "Project Documents"], ["weekly_reports", "Weekly Reports"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAlliTab(key)}
                style={{ padding: "10px 18px", background: "transparent", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", color: alliTab === key ? GOLD : "rgba(255,255,255,0.65)", borderBottom: alliTab === key ? `2px solid ${GOLD}` : "2px solid transparent", whiteSpace: "nowrap" as const }}
              >
                {label}
              </button>
            ))}
          </div>

          {alliTabDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.5)" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 13 }}>
                {alliTab === "external" ? "No documents shared yet" : "No weekly reports published yet"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alliTabDocs.map((doc: any) => {
                const docId = doc.id || doc._id;
                const histOpen = !!alliHistoryOpen[docId];
                const hist = alliHistory[docId] || [];
                const uploadedDate = doc.uploaded_at || doc.created_at || doc.date;
                return (
                  <div key={docId} style={portalCard({ padding: "16px 20px", borderLeft: `4px solid ${GOLD}` })}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" as const }}>
                      <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>📄</div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 800, color: TEXT, fontSize: 14, marginBottom: 4 }}>
                          {doc.title || doc.document_name || "Untitled"}
                          {(doc.version || doc.version_number) && (
                            <span style={{ marginLeft: 8, background: GOLD + "22", color: GOLD, border: `1px solid ${GOLD}55`, borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                              v{doc.version || doc.version_number}
                            </span>
                          )}
                          <span style={{ marginLeft: 8, background: doc._lane === "weekly_reports" ? "#dbeafe" : "#f3f4f6", color: doc._lane === "weekly_reports" ? "#2563eb" : "#6b7280", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
                            {doc._lane === "weekly_reports" ? "Weekly Report" : "Project Doc"}
                          </span>
                        </div>
                        {doc.description && <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{doc.description}</div>}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "center" }}>
                          {uploadedDate && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: MUTED }}>
                              <Clock size={11} /> {new Date(uploadedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {doc.file_size_bytes && (
                            <span style={{ fontSize: 11, color: MUTED }}>
                              {doc.file_size_bytes < 1024 * 1024
                                ? `${Math.round(doc.file_size_bytes / 1024)} KB`
                                : `${(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                        {((doc.current_file && doc.current_file.file_url) || doc.file_url || (doc as any).storage_url || (doc as any).url) && (
                          <a
                            href={doc.current_file?.file_url || doc.file_url || (doc as any).storage_url || (doc as any).url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: BURGUNDY, color: "#fff", borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
                          >
                            <Download size={13} /> Download
                          </a>
                        )}
                        <button
                          onClick={() => loadAlliHistory(docId)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "#f3f4f6", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          {histOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />} History
                        </button>
                      </div>
                    </div>

                    {/* Version history */}
                    {histOpen && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Version History</div>
                        {hist.length === 0 ? (
                          <div style={{ fontSize: 12, color: MUTED }}>No prior versions.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {hist.map((v: any, i: number) => (
                              <div key={v.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: v.is_current ? "#fffbeb" : "#f9fafb", border: `1px solid ${v.is_current ? GOLD + "55" : BORDER}`, borderRadius: 8 }}>
                                <span style={{ background: v.is_current ? GOLD + "22" : "#f3f4f6", color: v.is_current ? GOLD : MUTED, border: `1px solid ${v.is_current ? GOLD + "55" : BORDER}`, borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                  v{v.version_number || v.version}
                                  {v.is_current ? " (Latest)" : ""}
                                </span>
                                <div style={{ flex: 1, fontSize: 12, color: MUTED }}>
                                  {v.version_notes || v.notes || ""}
                                  {(v.uploaded_at || v.created_at) && (
                                    <span style={{ marginLeft: 8 }}>· {new Date(v.uploaded_at || v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                  )}
                                </div>
                                {(v.file_url || (v as any).storage_url || (v as any).url) && (
                                  <a href={v.file_url || (v as any).storage_url || (v as any).url} target="_blank" rel="noopener noreferrer" download style={{ fontSize: 12, color: BURGUNDY, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                                    Download
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.12)", margin: "32px 0" }} />
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, marginBottom: 4 }}>Document Centre</h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>All documents shared with {user?.organisation || "Event Perfekt"}</p>
      </div>
      <div className="ep-portal-nav" style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.2)", overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 16px", background: "transparent", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", color: tab === t ? GOLD : "rgba(255,255,255,0.65)", borderBottom: tab === t ? `2px solid ${GOLD}` : "2px solid transparent", whiteSpace: "nowrap" as const }}>{t}</button>)}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.65)" }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>{"\ud83d\udcc1"}</div>
          <div style={{ fontSize: 14 }}>
            {tab === "Templates" ? "No templates uploaded yet. Use the upload box below to add new templates." : "No documents in this category yet"}
          </div>
        </div>
      ) : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>{filtered.map(d => { const st = docStatus(d); const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.UNREAD; const isUnread = !d.read_at && d.uploaded_by_type !== "client"; return <div key={d.id} style={portalCard({ padding: 16, display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" as const, borderLeft: `4px solid ${isUnread ? GOLD : cfg.color}` })}><div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>📄</div><div style={{ flex: 1, minWidth: 200 }}><button onClick={() => openViewer(d)} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}><span style={{ fontWeight: 700, color: TEXT, fontSize: 14, textDecoration: "underline", display: "block", marginBottom: 4 }}>{d.document_name}</span></button><div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, alignItems: "center", marginBottom: 6 }}><span style={{ background: cfg.bg, color: cfg.color, padding: "2px 9px", borderRadius: 10, fontSize: 11, fontWeight: 700, border: `1px solid ${cfg.color}40` }}>{cfg.label}{st === "SIGNED" && d.signed_at ? ` · ${new Date(d.signed_at).toLocaleDateString("en-GB")}` : ""}</span>{d.document_category && <span style={{ background: "#f3f4f6", color: "#6b7280", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{d.document_category}</span>}<span style={{ background: "#f3f4f6", color: "#6b7280", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600 }}>v{d.current_version}</span>{isUnread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, display: "inline-block" }} />}</div><div style={{ fontSize: 11, color: MUTED }}>Shared by {d.uploaded_by} · {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}{d.read_at && <span style={{ marginLeft: 8 }}>· Read {new Date(d.read_at).toLocaleDateString("en-GB")}</span>}</div></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, flexShrink: 0 }}><button onClick={() => openViewer(d)} style={{ ...btn(BURGUNDY), padding: "7px 14px", fontSize: 12 }}>View</button><button onClick={() => openVersions(d)} style={{ padding: "7px 14px", background: "#f3f4f6", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Versions</button><button onClick={() => openChat(d)} style={{ padding: "7px 14px", background: "#f3f4f6", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>💬 Chat</button><button onClick={() => deleteDoc(d)} style={{ padding: "7px 14px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑 Delete</button></div></div>; })}</div>}

      {viewingDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setViewingDoc(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 720, maxHeight: "85vh", overflow: "auto", padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: TEXT, fontWeight: 800 }}>{viewingDoc.document_name}</h3>
              <button onClick={() => setViewingDoc(null)} style={btn("#f3f4f6", TEXT)}>Close</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <span style={{ background: (STATUS_CONFIG[docStatus(viewingDoc)] || STATUS_CONFIG.UNREAD).bg, color: (STATUS_CONFIG[docStatus(viewingDoc)] || STATUS_CONFIG.UNREAD).color, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, border: `1px solid ${(STATUS_CONFIG[docStatus(viewingDoc)] || STATUS_CONFIG.UNREAD).color}40` }}>
                {(STATUS_CONFIG[docStatus(viewingDoc)] || STATUS_CONFIG.UNREAD).label}
              </span>
              {viewingDoc.document_category && <span style={{ marginLeft: 8, background: "#f3f4f6", color: MUTED, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{viewingDoc.document_category}</span>}
              <span style={{ marginLeft: 8, background: "#f3f4f6", color: MUTED, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>v{viewingDoc.current_version}</span>
            </div>
            {viewingDoc.document_subcategory && <p style={{ fontSize: 13, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>{viewingDoc.document_subcategory}</p>}
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>
              Shared by {viewingDoc.uploaded_by} on {new Date(viewingDoc.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              {viewingDoc.read_at && <span> · Read {new Date(viewingDoc.read_at).toLocaleDateString("en-GB")}</span>}
              {viewingDoc.signed_at && <span> · Signed by {viewingDoc.signed_by} on {new Date(viewingDoc.signed_at).toLocaleDateString("en-GB")}</span>}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
              {(viewingDoc.current_file?.file_url || (viewingDoc as any).file_url || (viewingDoc as any).storage_url || (viewingDoc as any).url) && (
                <a
                  href={viewingDoc.current_file?.file_url || (viewingDoc as any).file_url || (viewingDoc as any).storage_url || (viewingDoc as any).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: BURGUNDY, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                >
                  <Download size={14} /> Open / Download
                </a>
              )}
              <button onClick={() => openVersions(viewingDoc)} style={{ padding: "10px 18px", background: "#f3f4f6", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Version History</button>
              <button onClick={() => openChat(viewingDoc)} style={{ padding: "10px 18px", background: "#f3f4f6", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>💬 Chat</button>
              {!viewingDoc.is_signed && viewingDoc.uploaded_by_type !== "client" && (
                <button onClick={() => setViewerPanel("review")} style={{ padding: "10px 18px", background: GOLD, color: DARK, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sign / Approve</button>
              )}
              <button onClick={() => setCommentFor(viewingDoc)} style={{ padding: "10px 18px", background: "#f3f4f6", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add Comment</button>
            </div>

            {/* Review / Sign panel */}
            {viewerPanel === "review" && (
              <div style={{ border: `1px solid ${GOLD}55`, borderRadius: 10, padding: 16, background: "#fffbeb", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 10 }}>Review & Sign Document</div>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>By signing, you confirm you have read and approve this document.</p>
                <input value={signatureText} onChange={e => setSignatureText(e.target.value)} placeholder="Type your full name to sign" style={{ ...inp, marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={async () => { if (!signatureText.trim()) return showToast("Please type your name to sign"); try { await portalFetch("POST", `/api/client-portal/documents/${viewingDoc.id}/sign`, { signature_text: signatureText.trim() }); showToast("Document signed successfully ✓"); setViewingDoc(null); load(); } catch (e: any) { showToast(e.message || "Sign failed"); } }} style={btn(BURGUNDY)} disabled={!signatureText.trim()}>Confirm Signature</button>
                  <button onClick={() => setViewerPanel(null)} style={btn("#f3f4f6", TEXT)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Reject panel */}
            {viewerPanel === "reject" && (
              <div style={{ border: "1px solid #fca5a5", borderRadius: 10, padding: 16, background: "#fef2f2", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#991b1b", marginBottom: 10 }}>Request Changes / Reject</div>
                <select value={rejectionType} onChange={e => setRejectionType(e.target.value)} style={{ ...inp, marginBottom: 10 }}>
                  <option>Request Edit</option>
                  <option>Reject Document</option>
                  <option>Request Clarification</option>
                </select>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain what changes are needed..." style={{ ...inp, minHeight: 80, marginBottom: 10, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={async () => { if (!rejectionReason.trim()) return showToast("Please provide a reason"); try { await portalFetch("POST", `/api/client-portal/documents/${viewingDoc.id}/reject`, { rejection_type: rejectionType, rejection_reason: rejectionReason.trim() }); showToast("Feedback submitted ✓"); setViewingDoc(null); load(); } catch (e: any) { showToast(e.message || "Failed to submit"); } }} style={{ ...btn("#dc2626"), opacity: rejectionReason.trim() ? 1 : 0.5 }} disabled={!rejectionReason.trim()}>Submit Feedback</button>
                  <button onClick={() => setViewerPanel(null)} style={btn("#f3f4f6", TEXT)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {versionsFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setVersionsFor(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 760, maxHeight: "85vh", overflow: "auto", padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: TEXT }}>Version History — {versionsFor.document_name}</h3>
              <button onClick={() => setVersionsFor(null)} style={btn("#f3f4f6", TEXT)}>Close</button>
            </div>
            {versions.length === 0 ? (
              <div style={{ color: MUTED }}>No version history found.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {versions.map((v) => (
                  <div key={v.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, background: v.is_current ? "#fff7e6" : "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <strong style={{ color: TEXT }}>Version {v.version_number}{v.is_current ? " (Current)" : ""}</strong>
                      <span style={{ color: MUTED, fontSize: 12 }}>{new Date(v.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 13, color: MUTED }}>{v.version_notes || "No notes provided"}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: MUTED }}>Uploaded by {v.uploaded_by}</div>
                    <a href={v.file_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, color: BURGUNDY, fontWeight: 700 }}>Open file</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {chatFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, pointerEvents: "auto" }} onClick={() => setChatFor(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 760, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 20, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: TEXT }}>Chat — {chatFor.document_name}</h3>
              <button onClick={() => setChatFor(null)} style={btn("#f3f4f6", TEXT)}>Close</button>
            </div>
            <div style={{ padding: 16, overflow: "auto", flex: 1, display: "grid", gap: 10 }}>
              {chatLoading ? <div style={{ color: MUTED }}>Loading chat…</div> : chatMessages.length === 0 ? <div style={{ color: MUTED }}>No messages yet.</div> : chatMessages.map((m, idx) => (
                <div key={m.id || idx} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, background: m.sender_type === "client" ? "#fff7e6" : "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <strong style={{ color: TEXT }}>{m.sender_name || (m.sender_type === "client" ? "You" : "EP Team")}</strong>
                    <span style={{ color: MUTED, fontSize: 12 }}>{m.created_at ? new Date(m.created_at).toLocaleString() : ""}</span>
                  </div>
                  <div style={{ color: TEXT, fontSize: 13, whiteSpace: "pre-wrap" }}>{m.message}</div>
                  {m.attachment_url && <a href={m.attachment_url} target="_blank" rel="noreferrer" style={{ color: BURGUNDY, fontSize: 12, fontWeight: 700 }}>Open attachment</a>}
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, flexDirection: "column" }}>
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." style={inp} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendChatMessage(); } }} />
              <button onClick={sendChatMessage} style={btn(BURGUNDY)} disabled={!chatInput.trim()}>Send</button>
            </div>
          </div>
        </div>
      )}
      {commentFor && (
        <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 9998, width: "auto", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: "0 18px 40px rgba(0,0,0,0.18)", padding: 14, pointerEvents: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>Add comment</div>
            <button onClick={() => setCommentFor(null)} style={btn("#f3f4f6", TEXT)}>Close</button>
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>{commentFor.document_name}</div>
          <textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Write a comment about this document..." style={{ ...inp, minHeight: 84, resize: "vertical", marginBottom: 10 }} />
          <button onClick={sendComment} style={btn(BURGUNDY)} disabled={!commentInput.trim()}>Comment</button>
        </div>
      )}
      <div style={portalCard({ border: `2px dashed ${BORDER}`, padding: 24, marginTop: 16 })}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT, margin: "0 0 4px" }}>Upload a Document to Event Perfekt</h3>
        <p style={{ fontSize: 12, color: MUTED, margin: "0 0 16px" }}>Your EP team will be notified when you upload.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
          <input type="text" placeholder="File name (optional)" value={uploadMeta.name} onChange={e => setUploadMeta({ ...uploadMeta, name: e.target.value })} style={inp} />
          <select value={uploadMeta.category} onChange={e => setUploadMeta({ ...uploadMeta, category: e.target.value })} style={{ ...inp }}>
            <option>Client Uploads</option><option>Legal</option><option>Pre-Engagement</option><option>During Engagement</option><option>Post Engagement</option><option>Correspondence</option><option>Templates</option>
          </select>
        </div>
        <textarea placeholder="Description / notes" value={uploadMeta.description} onChange={e => setUploadMeta({ ...uploadMeta, description: e.target.value })} style={{ ...inp, minHeight: 90, marginBottom: 10, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" as const }}>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} style={{ display: "block", width: "100%", maxWidth: 280, padding: 10, border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff", color: TEXT }} />
          <button onClick={() => fileRef.current?.click()} style={btn(GOLD, DARK)} disabled={uploading}>{uploading ? `Uploading ${uploadProgress}%...` : "Upload Selected File"}</button>
          <div style={{ color: MUTED, fontSize: 12, alignSelf: "center" }}>PDF, images or docs up to 20MB</div>
        </div>
      </div>
    </PortalLayout>
  );
}
