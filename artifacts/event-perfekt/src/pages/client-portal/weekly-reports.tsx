import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout, { portalCard } from "./layout";
import { getPortalToken, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";

const G = {
  border: "#e5e7eb",
  gold:   "#C9A84C",
  green:  "#16a34a",
  amber:  "#d97706",
  red:    "#dc2626",
  blue:   "#2563eb",
  text:   "#1f2937",
  muted:  "#6b7280",
};

const RAG_COLOR: Record<string, string> = {
  green:  G.green,
  amber:  G.amber,
  red:    G.red,
};

function RagBadge({ rag }: { rag?: string }) {
  if (!rag) return null;
  const color = RAG_COLOR[rag.toLowerCase()] || G.muted;
  return (
    <span style={{
      display: "inline-block",
      background: color,
      color: "#fff",
      borderRadius: 99,
      padding: "3px 12px",
      fontSize: 11,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    }}>
      {rag.toUpperCase()}
    </span>
  );
}

export default function WeeklyReports() {
  const [, setLocation] = useLocation();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [markingDone, setMarkingDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = getPortalToken();
    if (!token) { setLocation("/client-portal/login"); return; }
    (async () => {
      try {
        const data = await portalFetch("GET", "/api/client-portal/alli/weekly-reports").catch(() => []);
        setReports(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (err.message?.includes("401") || err.message?.includes("Unauthorised") || err.message?.includes("expired")) {
          clearPortalSession(); setLocation("/client-portal/login");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    portalFetch("GET", `/api/client-portal/alli/weekly-reports/${encodeURIComponent(selectedId)}`)
      .then(d => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const handleMarkDone = async (reportId: string, idx: number | string) => {
    const key = `${reportId}-${idx}`;
    setMarkingDone(s => ({ ...s, [key]: true }));
    try {
      await portalFetch(
        "POST",
        `/api/client-portal/alli/weekly-reports/${encodeURIComponent(reportId)}/client-actions/${encodeURIComponent(String(idx))}/mark-done`,
        {}
      );
      const refreshed = await portalFetch("GET", `/api/client-portal/alli/weekly-reports/${encodeURIComponent(reportId)}`).catch(() => null);
      if (refreshed) setDetail(refreshed);
    } catch { /* silent */ } finally {
      setMarkingDone(s => ({ ...s, [key]: false }));
    }
  };

  return (
    <PortalLayout>
      <style>{`
        @keyframes wRFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ marginBottom: 24, animation: "wRFadeUp 0.4s ease both" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 4px" }}>📊 Weekly Reports</h1>
        <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, margin: 0 }}>
          Published weekly updates from your delivery team
        </p>
      </div>

      {selectedId && detail ? (
        <div style={{ animation: "wRFadeUp 0.35s ease both" }}>
          <button
            onClick={() => { setSelectedId(null); setDetail(null); }}
            style={{ background: "none", border: "none", color: G.gold, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 18, padding: 0 }}
          >
            ← Back to all reports
          </button>

          {detailLoading ? (
            <div style={{ color: G.muted, fontSize: 13 }}>Loading report…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div style={{ ...portalCard({ padding: "20px 24px", borderTop: `3px solid ${G.blue}` }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div>
                    <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 900, color: G.text }}>
                      {detail.title || detail.week || "Weekly Report"}
                    </h2>
                    <div style={{ fontSize: 12, color: G.muted }}>
                      Week ending: {detail.week_ending || detail.date || "—"}
                    </div>
                  </div>
                  <RagBadge rag={detail.rag_status || detail.rag} />
                </div>
                {detail.summary && (
                  <p style={{ margin: 0, fontSize: 13, color: G.text, lineHeight: 1.6 }}>{detail.summary}</p>
                )}
              </div>

              {detail.did_this_week && (
                <div style={portalCard({ padding: "18px 22px" })}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5 }}>✅ What We Did This Week</h3>
                  <p style={{ margin: 0, fontSize: 13, color: G.text, lineHeight: 1.6 }}>{Array.isArray(detail.did_this_week) ? detail.did_this_week.join(" ") : detail.did_this_week}</p>
                </div>
              )}

              {detail.next_week && (
                <div style={portalCard({ padding: "18px 22px" })}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5 }}>🗓 Coming Next Week</h3>
                  <p style={{ margin: 0, fontSize: 13, color: G.text, lineHeight: 1.6 }}>{Array.isArray(detail.next_week) ? detail.next_week.join(" ") : detail.next_week}</p>
                </div>
              )}

              {detail.risks_changed && (
                <div style={portalCard({ padding: "18px 22px", borderLeft: `4px solid ${G.red}` })}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5 }}>⚠️ Risks &amp; Issues</h3>
                  <p style={{ margin: 0, fontSize: 13, color: G.text, lineHeight: 1.6 }}>{Array.isArray(detail.risks_changed) ? detail.risks_changed.join(" ") : detail.risks_changed}</p>
                </div>
              )}

              {Array.isArray(detail.client_actions) && detail.client_actions.length > 0 && (
                <div style={portalCard({ padding: "18px 22px", borderTop: `3px solid ${G.gold}` })}>
                  <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5 }}>📋 Actions Required From You</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {detail.client_actions.map((action: any, idx: number) => {
                      const isDone = action.done === true || action.status === "done";
                      const key = `${selectedId}-${idx}`;
                      return (
                        <div key={idx} style={{
                          border: `1px solid ${isDone ? G.green + "60" : G.border}`,
                          borderLeft: `4px solid ${isDone ? G.green : G.gold}`,
                          borderRadius: 10,
                          padding: "12px 14px",
                          background: isDone ? "#f0fdf4" : "#fffdf7",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          flexWrap: "wrap",
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: G.text, marginBottom: 4 }}>
                              {action.title || action.description || action.action || `Action ${idx + 1}`}
                            </div>
                            {action.description && action.title && (
                              <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.5 }}>{action.description}</div>
                            )}
                          </div>
                          {isDone ? (
                            <span style={{ fontSize: 11, fontWeight: 800, color: G.green, whiteSpace: "nowrap" }}>✓ Done</span>
                          ) : (
                            <button
                              onClick={() => handleMarkDone(selectedId!, idx)}
                              disabled={markingDone[key]}
                              style={{
                                padding: "7px 14px",
                                background: markingDone[key] ? G.muted : G.gold,
                                color: "#fff",
                                border: "none",
                                borderRadius: 7,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: markingDone[key] ? "not-allowed" : "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {markingDone[key] ? "Saving…" : "Mark done"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      ) : (
        <div style={{ animation: "wRFadeUp 0.4s ease both" }}>
          {loading ? (
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
              Loading reports…
            </div>
          ) : reports.length === 0 ? (
            <div style={{ ...portalCard({ padding: "32px 24px" }), textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <div style={{ fontWeight: 700, color: G.text, marginBottom: 4 }}>No weekly reports published yet</div>
              <div style={{ fontSize: 13, color: G.muted }}>Your delivery team will post updates here each week.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reports.map((report: any) => {
                const openActions = Array.isArray(report.client_actions)
                  ? report.client_actions.filter((a: any) => a.done !== true && a.status !== "done").length
                  : 0;
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedId(String(report.id))}
                    style={{
                      ...portalCard({ padding: "18px 22px" }),
                      cursor: "pointer",
                      borderLeft: `4px solid ${RAG_COLOR[(report.rag_status || report.rag || "").toLowerCase()] || G.blue}`,
                      transition: "box-shadow 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: G.text, marginBottom: 3 }}>
                          {report.title || report.week || "Weekly Report"}
                        </div>
                        <div style={{ fontSize: 12, color: G.muted }}>
                          Week ending: {report.week_ending || report.date || "—"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <RagBadge rag={report.rag_status || report.rag} />
                        {openActions > 0 && (
                          <span style={{ background: G.gold, color: "#fff", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>
                            {openActions} action{openActions !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {report.summary && (
                      <p style={{ margin: 0, fontSize: 12, color: G.muted, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {report.summary}
                      </p>
                    )}
                    <div style={{ marginTop: 10, fontSize: 12, color: G.blue, fontWeight: 700 }}>
                      View full report →
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
