import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { getPortalToken, clearPortalSession, portalFetch, getPortalUser } from "@/lib/client-portal-auth";
import { RefreshCw, Loader2, ChevronDown, ChevronRight } from "lucide-react";

const G = {
  card:   "#ffffff",
  border: "#e5e7eb",
  gold:   "#C9A84C",
  green:  "#16a34a",
  amber:  "#d97706",
  red:    "#dc2626",
  blue:   "#2563eb",
  grey:   "#9ca3af",
  text:   "#1f2937",
  muted:  "#6b7280",
  bg:     "#f3f4f6",
  burg:   "#3D0B0B",
};

const COLUMNS = [
  { key: "pending",            label: "Not Started",      color: G.grey,  bg: "#f9fafb" },
  { key: "in_progress",        label: "In Progress",       color: G.amber, bg: "#fffbeb" },
  { key: "awaiting_review",    label: "Ready for Review",  color: G.blue,  bg: "#eff6ff" },
  { key: "approved",           label: "Approved",           color: G.green, bg: "#f0fdf4" },
];

function getStatus(d: any): string {
  if (d.client_approved) return "approved";
  return d.status || "pending";
}


export default function ClientPortalProject() {
  const [, setLocation] = useLocation();
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [phaseMilestones, setPhaseMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState("");
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "failed">("syncing");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

  // ALLI milestone sign-off state
  const [alliDocs, setAlliDocs] = useState<any[]>([]);
  const [mSignoffLoading, setMSignoffLoading] = useState<Record<string | number, boolean>>({});
  const [mSignoffResult, setMSignoffResult] = useState<Record<string | number, { decision: string; date: string; comment?: string }>>({});
  const [mRejectionText, setMRejectionText] = useState<Record<string | number, string>>({});
  const [mRejectOpen, setMRejectOpen] = useState<Record<string | number, boolean>>({});
  const [mHistoryOpen, setMHistoryOpen] = useState<Record<string | number, boolean>>({});
  const [mApproveOpen, setMApproveOpen] = useState<Record<string | number, boolean>>({});
  const [mTypedName, setMTypedName] = useState<Record<string | number, string>>({});
  const [mReceiptLoading, setMReceiptLoading] = useState<Record<string | number, boolean>>({});
  const [mCardOpen, setMCardOpen] = useState<Record<string | number, boolean>>({});

  const load = async () => {
    const token = getPortalToken();
    if (!token) { setLocation("/client-portal/login"); return; }
    setSyncStatus("syncing");
    try {
      const [data, milestones, docs] = await Promise.all([
        portalFetch("GET", "/api/client-portal/alli/deliverables"),
        portalFetch("GET", "/api/client-portal/alli/phase-milestones").catch(() => []),
        portalFetch("GET", "/api/client-portal/alli/documents").catch(() => []),
      ]);
      setDeliverables(Array.isArray(data) ? data : []);
      setPhaseMilestones(Array.isArray(milestones) ? milestones : []);
      setAlliDocs(Array.isArray(docs) ? docs : []);
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus("synced");
    } catch (e: any) {
      if (String(e.message || "").includes("401")) {
        clearPortalSession();
        setLocation("/client-portal/login");
        return;
      }
      setSyncStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3500); };

  const handleMilestoneSignoffNew = async (milestoneId: string | number, decision: "approved" | "rejected", rejectionComment?: string, typedName?: string) => {
    setMSignoffLoading(p => ({ ...p, [milestoneId]: true }));
    try {
      await portalFetch("POST", `/api/client-portal/alli/milestones/${milestoneId}/signoff`, {
        decision,
        rejection_comment: rejectionComment || "",
        typed_name: typedName || "",
      });
      setMSignoffResult(p => ({ ...p, [milestoneId]: { decision, date: new Date().toISOString(), comment: rejectionComment } }));
      setMRejectOpen(p => ({ ...p, [milestoneId]: false }));
      setMRejectionText(p => ({ ...p, [milestoneId]: "" }));
      setMApproveOpen(p => ({ ...p, [milestoneId]: false }));
      setMTypedName(p => ({ ...p, [milestoneId]: "" }));
      showToast(decision === "approved" ? "✅ Milestone signed off — EP team notified" : "Changes requested — EP team notified");
    } catch (e: any) {
      showToast(e.message || "Sign-off failed — please try again");
    }
    setMSignoffLoading(p => ({ ...p, [milestoneId]: false }));
  };

  const handleDownloadReceipt = async (milestoneId: string | number, milestoneName: string, phaseNum: string | number) => {
    setMReceiptLoading(p => ({ ...p, [milestoneId]: true }));
    try {
      const token = getPortalToken();
      const res = await fetch(`/api/client-portal/alli/milestones/${milestoneId}/signoff-receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Could not generate receipt (HTTP ${res.status})`);
      }
      const data = await res.json().catch(() => ({}));
      const url = data.url || data.receipt_url || data.download_url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("Receipt URL missing");
      }
    } catch (e: any) {
      showToast(e.message || "Receipt download failed — please try again");
    }
    setMReceiptLoading(p => ({ ...p, [milestoneId]: false }));
  };

  const syncLabel = useMemo(() => {
    if (!lastSyncedAt) return "";
    return `Updated ${new Date(lastSyncedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }, [lastSyncedAt]);

  const columns = useMemo(() =>
    COLUMNS.map(col => {
      const items = deliverables.filter(d => getStatus(d) === col.key);
      const phases = Array.from(new Set(items.map(d => d.phase || "General"))).sort();
      return { ...col, items, phases };
    }),
    [deliverables]
  );

  const togglePhase = (colKey: string, phase: string) => {
    const key = `${colKey}::${phase}`;
    setCollapsedPhases(p => ({ ...p, [key]: !p[key] }));
  };

  const isPhaseCollapsed = (colKey: string, phase: string) =>
    !!collapsedPhases[`${colKey}::${phase}`];

  const getDeliverableStatusLabel = (d: any) => {
    const status = getStatus(d);
    if (status === "approved") return "Approved";
    if (status === "delivered") return "Delivered";
    if (status === "in_progress") return "In Progress";
    return "Pending";
  };

  const getDeliverableStatusColor = (d: any) => {
    const status = getStatus(d);
    if (status === "approved") return G.green;
    if (status === "delivered") return G.burg;
    if (status === "in_progress") return G.amber;
    return G.grey;
  };

  const handleDeliverableApprove = async (id: number) => {
    await portalFetch("PATCH", `/api/client-portal/deliverables/${id}/approve`, {});
    await load();
  };

  const handleDeliverableRequestChanges = async (id: number, feedback: string) => {
    await portalFetch("PATCH", `/api/client-portal/deliverables/${id}/feedback`, { feedback });
    await load();
  };

  if (loading) return (
    <PortalLayout>
      <div style={{ textAlign: "center", padding: "60px 0", color: "#fff" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${G.gold}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
        Loading deliverables…
      </div>
    </PortalLayout>
  );

  return (
    <PortalLayout>
      {/* Toast */}
      {toastMsg && (
        <div style={{ position: "fixed", top: 80, right: 24, background: "#fff7e6", color: G.text, padding: "12px 20px", borderRadius: 10, fontSize: 13, zIndex: 999, border: `1px solid ${G.gold}40`, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 4px" }}>Project Deliverables</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0 }}>
            {deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""} · click any phase to expand
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${G.border}`, borderRadius: 999, padding: "7px 14px" }}>
            {syncStatus === "synced"  && <span style={{ width: 8, height: 8, borderRadius: "50%", background: G.green, display: "inline-block" }} />}
            {syncStatus === "syncing" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: G.muted }} />}
            {syncStatus === "failed"  && <span style={{ width: 8, height: 8, borderRadius: "50%", background: G.red, display: "inline-block" }} />}
            <span style={{ fontSize: 12, color: G.muted }}>
              {syncStatus === "failed" ? "Sync failed" : syncStatus === "syncing" ? "Syncing…" : syncLabel}
            </span>
            {syncStatus === "failed" && (
              <button onClick={load} style={{ border: "none", background: "transparent", color: G.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <RefreshCw size={12} /> Retry
              </button>
            )}
        </div>
      </div>

      {/* Kanban board */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(220px, 1fr))",
        gap: 14,
        overflowX: "auto",
        paddingBottom: 8,
        alignItems: "start",
      }}>
        {columns.map(col => (
          <div key={col.key} style={{ display: "flex", flexDirection: "column", minWidth: 220 }}>
            {/* Column header */}
            <div style={{
              background: col.bg,
              border: `1px solid ${col.color}40`,
              borderTop: `3px solid ${col.color}`,
              borderRadius: "10px 10px 0 0",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: col.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{col.label}</span>
              <span style={{ background: col.color, color: "#fff", borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 800 }}>{col.items.length}</span>
            </div>

            {/* Column body */}
            <div style={{
              background: col.bg,
              border: `1px solid ${col.color}40`,
              borderTop: "none",
              borderRadius: "0 0 10px 10px",
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minHeight: 120,
            }}>
              {col.items.length === 0 ? (
                <div style={{ textAlign: "center", color: G.grey, fontSize: 12, padding: "20px 0", opacity: 0.7 }}>None here</div>
              ) : (
                col.phases.map(phase => {
                  const phaseItems = col.items.filter(d => (d.phase || "General") === phase);
                  const collapsed = isPhaseCollapsed(col.key, phase);

                  return (
                    <div key={phase}>
                      {/* Phase group header — clickable to collapse/expand */}
                      <button
                        onClick={() => togglePhase(col.key, phase)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: `${col.color}15`,
                          border: `1px solid ${col.color}30`,
                          borderRadius: 6,
                          padding: "6px 10px",
                          cursor: "pointer",
                          marginBottom: collapsed ? 0 : 6,
                          textAlign: "left",
                        }}
                      >
                        {collapsed
                          ? <ChevronRight size={13} style={{ color: col.color, flexShrink: 0 }} />
                          : <ChevronDown size={13} style={{ color: col.color, flexShrink: 0 }} />
                        }
                        <span style={{ fontSize: 11, fontWeight: 700, color: col.color, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{phase}</span>
                        <span style={{ fontSize: 10, color: col.color, fontWeight: 600, opacity: 0.75, flexShrink: 0 }}>{phaseItems.length}</span>
                      </button>

                      {/* Phase deliverable cards */}
                      {!collapsed && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
                          {phaseItems.map((d: any) => {
                            const isOverdue = d.due_date && new Date(d.due_date) < new Date() && getStatus(d) !== "approved";

                            return (
                              <div
                                key={d.id}
                                style={{
                                  background: "#fff",
                                  border: `1px solid ${G.border}`,
                                  borderLeft: `3px solid ${col.color}`,
                                  borderRadius: 8,
                                  padding: "10px 12px",
                                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                                }}
                              >
                                {/* Title */}
                                <div style={{ fontSize: 13, fontWeight: 700, color: G.text, lineHeight: 1.4, marginBottom: 5 }}>
                                  {d.deliverable_name || d.title || "Untitled deliverable"}
                                </div>

                                {/* Priority */}
                                {d.priority && (
                                  <span style={{ fontSize: 10, display: "inline-block", marginBottom: 5, background: d.priority === "high" ? G.red : d.priority === "medium" ? "#fef3c7" : "#f3f4f6", color: d.priority === "high" ? "#fff" : d.priority === "medium" ? G.amber : G.grey, borderRadius: 9999, padding: "2px 8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5, boxShadow: d.priority === "high" ? "0 0 0 2px #dc2626" : "none" }}>
                                    {d.priority}
                                  </span>
                                )}

                                {/* Due date */}
                                {d.due_date && (
                                  <div style={{ fontSize: 11, color: isOverdue ? G.red : G.muted, display: "flex", alignItems: "center", gap: 4 }}>
                                    {isOverdue ? "⚠️" : "📅"} {new Date(d.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                    {isOverdue && <span style={{ fontWeight: 700 }}>· Overdue</span>}
                                  </div>
                                )}

                                {/* Owner */}
                                {d.assigned_to && (
                                  <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>👤 {d.assigned_to}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
      {/* ── Milestone Sign-Off section ───────────────────────────────── */}
      {phaseMilestones.length > 0 && (
        <div id="milestone-signoffs-section" style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 16px" }}>Milestone Sign-Offs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {phaseMilestones.map((m: any) => {
              const mid = m.id || m.milestone_id || m.phase_number;
              const serverState = m.milestone_state;
              const isReady = serverState === "awaiting_signoff" || serverState === "ready_for_client";
              const result = mSignoffResult[mid];
              const loading = !!mSignoffLoading[mid];
              const rejectOpen = !!mRejectOpen[mid];
              const rejText = mRejectionText[mid] || "";
              const histOpen = !!mHistoryOpen[mid];
              const mDocs = alliDocs.filter(d => d.milestone_id === mid || d.milestone_id === String(mid));

              // Merge local action result with server-side concluded state
              const displayDecision: "approved" | "rejected" | null =
                result?.decision as "approved" | "rejected" | null ??
                (serverState === "client_signed_off" ? "approved" :
                 serverState === "needs_changes" ? "rejected" : null);
              const displayDate = result?.date || m.signoff_date || m.signed_off_at;
              const displayComment = result?.comment || m.rejection_comment || m.signoff_notes;

              const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

              // Badge config per state
              let badgeLabel: string;
              let badgeBg: string;
              let badgeColor: string;
              if (displayDecision === "approved") {
                badgeLabel = `✓ Signed off${displayDate ? ` on ${fmtDate(displayDate)}` : ""}`;
                badgeBg = "#dcfce7"; badgeColor = G.green;
              } else if (displayDecision === "rejected") {
                badgeLabel = `✗ Changes requested${displayDate ? ` on ${fmtDate(displayDate)}` : ""}`;
                badgeBg = "#fef2f2"; badgeColor = G.red;
              } else if (isReady) {
                badgeLabel = "Ready for your sign-off";
                badgeBg = "#fef3c7"; badgeColor = G.amber;
              } else {
                badgeLabel = "Not yet sent";
                badgeBg = "#f3f4f6"; badgeColor = G.muted;
              }

              const headerBg = isReady ? G.burg : (displayDecision === "approved" ? "#f0fdf4" : displayDecision === "rejected" ? "#fff7f7" : "#f9fafb");
              const phaseColor = isReady ? G.gold : (displayDecision === "approved" ? G.green : displayDecision === "rejected" ? G.red : G.muted);
              const titleColor = isReady ? "#fff" : G.text;
              const chevronColor = isReady ? "#ffffff99" : G.muted;
              // Cards start open if awaiting sign-off, otherwise collapsed
              const cardOpen = mCardOpen[mid] !== undefined ? !!mCardOpen[mid] : isReady;
              const packSource = m.milestone_document_url || m.document_url || m.group_doc_url || m.group_document_url || null;
              const packUrl = packSource
                ? (() => {
                    const s = String(packSource);
                    if (
                      s.startsWith("/api/") ||
                      s.startsWith("/alli-uploads/") ||
                      s.startsWith("/uploads/") ||
                      s.startsWith("/objects/") ||
                      s.startsWith("https://") ||
                      s.startsWith("http://")
                    ) return s;
                    return null;
                  })()
                : null;

              return (
                <div key={mid} style={{ background: "#fff", border: `1px solid ${G.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  {/* Header — click to expand/collapse */}
                  <button
                    onClick={() => setMCardOpen(p => ({ ...p, [mid]: !cardOpen }))}
                    style={{ width: "100%", background: headerBg, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const, border: "none", cursor: "pointer", textAlign: "left" as const }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: phaseColor, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
                        Phase {m.phase_number || "—"}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: titleColor }}>
                        {m.milestone_title || `Phase ${m.phase_number} Milestone`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
                      <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                        background: badgeBg, color: badgeColor,
                        border: `1px solid ${badgeColor}55` }}>
                        {badgeLabel}
                      </span>
                      {cardOpen ? <ChevronDown size={16} color={chevronColor} /> : <ChevronRight size={16} color={chevronColor} />}
                    </div>
                  </button>

                  {cardOpen && (
                  <div style={{ padding: "16px 20px" }}>
                    {/* ADDITION 1: Documents in this pack */}
                    <div id="documents-section" style={{ marginBottom: 16, padding: "12px 14px", background: "#f9fafb", border: `1px solid ${G.border}`, borderRadius: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 10 }}>Documents in this pack</div>
                      {packUrl ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", border: `1px solid ${G.border}`, borderRadius: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 15 }}>📄</span>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: G.text }}>Milestone Pack — Phase {m.phase_number}</span>
                          <button
                            type="button"
                            onClick={() => window.open(packUrl, "_blank", "noopener,noreferrer")}
                            style={{ fontSize: 11, color: G.burg, fontWeight: 700, textDecoration: "none", padding: "3px 10px", border: `1px solid ${G.burg}`, borderRadius: 6, background: "#fff", cursor: "pointer" }}
                          >
                            Open document
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: G.muted, fontStyle: "italic" as const, padding: "2px 4px", marginBottom: 6 }}>
                          Pack document not yet attached or not in a supported uploads path
                        </div>
                      )}
                      {deliverables.filter(d => String(d.phase_number) === String(m.phase_number)).map((d: any, i: number) => (
                        <div key={d.id || i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 4px", fontSize: 12, color: G.text }}>
                          <span style={{ color: G.muted, flexShrink: 0 }}>•</span>
                          <span>{d.deliverable_name || d.title || "Untitled"}</span>
                        </div>
                      ))}
                      {mDocs.map((doc: any, i: number) => (
                        <div key={doc.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", border: `1px solid ${G.border}`, borderRadius: 8, marginTop: 6 }}>
                          <span style={{ fontSize: 15 }}>📎</span>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: G.text }}>{doc.title || doc.document_name || "Document"}</span>
                          {doc.version && <span style={{ fontSize: 11, color: G.muted }}>v{doc.version}</span>}
                          {(doc.storage_url || doc.file_url || doc.url) && (
                            <button
                              type="button"
                              onClick={() => {
                                const url = doc.storage_url || doc.file_url || doc.url;
                                if (!url) return;
                                window.open(url, "_blank", "noopener,noreferrer");
                              }}
                              style={{ fontSize: 11, color: G.burg, fontWeight: 700, textDecoration: "none", padding: "3px 10px", border: `1px solid ${G.burg}`, borderRadius: 6, background: "#fff", cursor: "pointer" }}
                            >
                              Open document
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Concluded result box */}
                    {displayDecision && (
                      <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 10,
                        background: displayDecision === "approved" ? "#f0fdf4" : "#fff7f7",
                        border: `1px solid ${displayDecision === "approved" ? G.green + "40" : G.red + "40"}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: displayDecision === "approved" ? G.green : G.red }}>
                          {displayDecision === "approved"
                            ? `✓ Signed off${displayDate ? ` on ${fmtDate(displayDate)}` : ""}`
                            : `✗ Changes requested${displayDate ? ` on ${fmtDate(displayDate)}` : ""}`}
                        </div>
                        {displayComment && (
                          <div style={{ fontSize: 12, color: G.muted, marginTop: 4 }}>Comment: {displayComment}</div>
                        )}
                      </div>
                    )}

                    {/* ADDITION 3: Download receipt — shown after approved sign-off */}
                    {displayDecision === "approved" && (
                      <div style={{ marginBottom: 16 }}>
                        <button
                          onClick={() => handleDownloadReceipt(mid, m.milestone_title || `Phase ${m.phase_number} Milestone`, m.phase_number)}
                          disabled={!!mReceiptLoading[mid]}
                          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", background: "#fff", color: G.burg, border: `1px solid ${G.burg}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: mReceiptLoading[mid] ? "not-allowed" : "pointer", opacity: mReceiptLoading[mid] ? 0.7 : 1 }}
                        >
                          {mReceiptLoading[mid] ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <span>📄</span>}
                          {mReceiptLoading[mid] ? "Generating…" : "Download sign-off receipt"}
                        </button>
                      </div>
                    )}

                    {/* ADDITION 2: Sign-off actions with typed-name confirmation */}
                    {isReady && !displayDecision && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ marginBottom: 12, padding: "10px 14px", background: "#fff8f0", border: "1px solid #f97316", borderRadius: 8, fontSize: 13, color: G.text }}>
                          Review all documents in this milestone pack before signing off. Sign-off is final and will be recorded with timestamp.
                        </div>

                        {/* Primary action buttons — hidden when typed-name panel is open */}
                        {!mApproveOpen[mid] && (
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
                            <button
                              onClick={() => setMApproveOpen(p => ({ ...p, [mid]: true }))}
                              disabled={loading}
                              style={{ padding: "11px 22px", background: G.green, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, whiteSpace: "nowrap" as const }}
                            >
                              ✓ Approve & Sign Off
                            </button>
                            <button
                              onClick={() => setMRejectOpen(p => ({ ...p, [mid]: !rejectOpen }))}
                              disabled={loading}
                              style={{ padding: "11px 18px", background: "#fff", color: G.red, border: `1px solid ${G.red}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
                            >
                              Request Changes
                            </button>
                          </div>
                        )}

                        {/* Typed-name confirmation panel */}
                        {mApproveOpen[mid] && (() => {
                          const u = getPortalUser();
                          const expectedName = (u?.fullName || u?.full_name || "").trim();
                          const typedName = (mTypedName[mid] || "").trim();
                          const nameOk = expectedName ? typedName.toLowerCase() === expectedName.toLowerCase() : typedName.length > 0;
                          return (
                            <div style={{ background: "#f0fdf4", border: `1px solid ${G.green}40`, borderRadius: 10, padding: 16 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: G.text, marginBottom: 10 }}>
                                Type your full name to confirm sign-off
                              </div>
                              <input
                                type="text"
                                value={mTypedName[mid] || ""}
                                onChange={e => setMTypedName(p => ({ ...p, [mid]: e.target.value }))}
                                placeholder={`e.g. ${expectedName || "Kehinde Alli"}`}
                                autoFocus
                                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${nameOk ? G.green : G.border}`, borderRadius: 8, fontSize: 13, color: G.text, fontFamily: "Poppins, sans-serif", outline: "none", boxSizing: "border-box" as const, marginBottom: 10 }}
                              />
                              <p style={{ fontSize: 11, color: G.muted, fontStyle: "italic" as const, lineHeight: 1.6, margin: "0 0 12px" }}>
                                By typing your name and clicking Confirm Sign-Off, you confirm you have reviewed all documents listed above. This action will be timestamped and recorded with your IP address. It cannot be reverted from this UI.
                              </p>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
                                <button
                                  onClick={() => handleMilestoneSignoffNew(mid, "approved", undefined, typedName)}
                                  disabled={loading || !nameOk}
                                  style={{ padding: "10px 20px", background: G.green, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: (loading || !nameOk) ? "not-allowed" : "pointer", opacity: (loading || !nameOk) ? 0.5 : 1, whiteSpace: "nowrap" as const }}
                                >
                                  {loading ? "Saving…" : "Confirm Sign-Off"}
                                </button>
                                <button
                                  onClick={() => { setMApproveOpen(p => ({ ...p, [mid]: false })); setMTypedName(p => ({ ...p, [mid]: "" })); }}
                                  style={{ padding: "10px 16px", background: "#fff", color: G.muted, border: `1px solid ${G.border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Request Changes text panel */}
                        {rejectOpen && !mApproveOpen[mid] && (
                          <div style={{ marginTop: 12 }}>
                            <textarea
                              value={rejText}
                              onChange={e => setMRejectionText(p => ({ ...p, [mid]: e.target.value }))}
                              placeholder="Describe the changes you're requesting…"
                              rows={3}
                              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${G.border}`, borderRadius: 8, fontSize: 13, color: G.text, fontFamily: "Poppins, sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" as const }}
                            />
                            <button
                              onClick={() => { if (rejText.trim()) handleMilestoneSignoffNew(mid, "rejected", rejText); }}
                              disabled={loading || !rejText.trim()}
                              style={{ marginTop: 8, padding: "9px 18px", background: G.red, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (loading || !rejText.trim()) ? "not-allowed" : "pointer", opacity: !rejText.trim() ? 0.5 : 1 }}
                            >
                              {loading ? "Saving…" : "Submit Change Request"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sign-off history (collapsible) */}
                    {(m.last_signoff_decision || m.signoff_date || m.signed_off_at) && (
                      <div style={{ marginTop: 12, borderTop: `1px solid ${G.border}`, paddingTop: 10 }}>
                        <button
                          onClick={() => setMHistoryOpen(p => ({ ...p, [mid]: !histOpen }))}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, color: G.muted, fontWeight: 700 }}
                        >
                          {histOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          Sign-off history
                        </button>
                        {histOpen && (
                          <div style={{ marginTop: 8, padding: "10px 14px", background: "#f9fafb", border: `1px solid ${G.border}`, borderRadius: 8, fontSize: 12, color: G.muted }}>
                            {m.last_signoff_decision ? (
                              <div>
                                <strong style={{ color: G.text }}>{m.last_signoff_decision === "approved" ? "✓ Approved" : "✗ Changes requested"}</strong>
                                {(m.signoff_date || m.signed_off_at) && (
                                  <span style={{ marginLeft: 8 }}>· {new Date(m.signoff_date || m.signed_off_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                                )}
                                {m.signoff_notes && <div style={{ marginTop: 4 }}>Notes: {m.signoff_notes}</div>}
                              </div>
                            ) : (
                              <div>No sign-off history yet.</div>
                            )}
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
        </div>
      )}
    </PortalLayout>
  );
}
