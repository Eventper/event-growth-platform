import { useEffect, useState } from "react";
import PortalLayout from "./layout";
import { portalFetch } from "@/lib/client-portal-auth";

const BURGUNDY = "#3D0B0B";
const GOLD = "#C9A84C";
const CARD_BG = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.12)";
const TEXT = "#fff";
const MUTED = "rgba(255,255,255,0.6)";

const RAG: Record<string, { bg: string; fg: string; label: string }> = {
  green:  { bg: "rgba(16,185,129,0.15)", fg: "#10b981", label: "On Track" },
  amber:  { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b", label: "Needs Attention" },
  red:    { bg: "rgba(239,68,68,0.15)",  fg: "#ef4444",  label: "At Risk" },
};

export default function ProgressReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    portalFetch("GET", "/api/client-portal/progress-reports").then(r => {
      setReports(Array.isArray(r) ? r : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <PortalLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: "0 0 4px" }}>Weekly Progress Reports</h1>
        <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Every week the EP team compiles a progress report for ALLI Foundation. Here is the archive.</p>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: MUTED }}>Loading reports...</div> : reports.length === 0 ? (
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>📊</div>
          <p style={{ color: MUTED, fontSize: 14 }}>No progress reports yet. Your first report will arrive at the end of the first engagement week.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reports.map(r => {
            const rag = RAG[r.rag_status] || RAG.green;
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${rag.fg}`, borderRadius: 10, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, marginBottom: 4 }}>
                      Week of {new Date(r.report_week).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: 0 }}>Weekly Progress Report</h2>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: MUTED, flexWrap: "wrap" as const }}>
                      <span>✅ {(r.completed_this_week || []).length} completed</span>
                      <span>🔄 {(r.in_progress || []).length} in progress</span>
                      <span>📅 {(r.coming_next_week || []).length} upcoming</span>
                      {(r.client_actions_needed || []).length > 0 && <span style={{ color: "#f59e0b", fontWeight: 700 }}>⚠ {r.client_actions_needed.length} actions needed</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: rag.bg, color: rag.fg, padding: "4px 10px", borderRadius: 100, border: `1px solid ${rag.fg}40` }}>{rag.label}</span>
                    <span style={{ fontSize: 18, color: MUTED }}>{isOpen ? "▴" : "▾"}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${BORDER}` }}>
                    {r.narrative && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 18 }} dangerouslySetInnerHTML={{ __html: r.narrative }} />}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                      {[
                        { title: "✅ Completed", items: r.completed_this_week, color: "#10b981" },
                        { title: "🔄 In Progress", items: r.in_progress, color: "#f59e0b" },
                        { title: "📅 Coming Next Week", items: r.coming_next_week, color: GOLD },
                        { title: "⚠ Your Actions", items: r.client_actions_needed, color: "#ef4444" },
                      ].map(s => (
                        <div key={s.title} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderTop: `2px solid ${s.color}`, borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 8 }}>{s.title}</div>
                          {(s.items || []).length === 0 ? <div style={{ fontSize: 11, color: MUTED }}>—</div> : (
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: 0 }}>
                              {(s.items || []).map((it: any) => {
                                const text = it.name || it.action || JSON.stringify(it);
                                const phase = it.phase ? ` (Phase ${it.phase})` : "";
                                return text + phase;
                              }).join(" • ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}
