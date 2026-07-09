// Discovery / Tenders view — the tenders table, lane filter chips, add/edit form,
// and not-relevant toggle. Extracted verbatim from saas-tender-dashboard.tsx's
// renderTenders() (Phase 3, Task 1). Behaviour is identical; the dashboard now
// owns the state and passes it in as props.
import { useState } from "react";
import {
  btn, card, label, input, BLUE, BORDER, GOLD, TENDER_STATUSES,
  LANE_CHIPS, laneScoreOf, LANE_THRESHOLD, fmtDate, fmtMoney, type OrgLaneFilter,
  API, saasApiRequest,
} from "./ui";
import TenderDeepDive from "./TenderDeepDive";

export interface DiscoveryTendersProps {
  tenders: any[];
  showTenderForm: boolean;
  editingTender: any;
  tenderForm: any;
  orgLaneFilter: OrgLaneFilter;
  notRelevantIds: Set<number>;
  showNotRelevant: boolean;
  fitScores: any[];
  expandedWhyId: number | null;
  hoveredOrgPill: { id: number; org: string } | null;
  togglingNotRelevant: number | null;
  user: any;
  // setters
  setShowQuickAdd: (v: boolean) => void;
  setQuickAddTab: (v: "url" | "manual") => void;
  setQuickAddResult: (v: any) => void;
  setEditingTender: (v: any) => void;
  setTenderForm: (v: any) => void;
  setShowTenderForm: (v: boolean) => void;
  setOrgLaneFilter: (v: OrgLaneFilter) => void;
  setShowNotRelevant: (updater: (v: boolean) => boolean) => void;
  setExpandedWhyId: (v: number | null) => void;
  setHoveredOrgPill: (v: { id: number; org: string } | null) => void;
  // handlers
  saveTender: () => void;
  selectTender: (t: any) => void;
  toggleNotRelevant: (id: number) => void;
  deleteTender: (id: number) => void;
}

export default function DiscoveryTenders(props: DiscoveryTendersProps) {
  const {
    tenders, showTenderForm, editingTender, tenderForm, orgLaneFilter, notRelevantIds,
    showNotRelevant, fitScores, expandedWhyId, hoveredOrgPill, togglingNotRelevant, user,
    setShowQuickAdd, setQuickAddTab, setQuickAddResult, setEditingTender, setTenderForm,
    setShowTenderForm, setOrgLaneFilter, setShowNotRelevant, setExpandedWhyId, setHoveredOrgPill,
    saveTender, selectTender, toggleNotRelevant, deleteTender,
  } = props;

  // One-click "Auto-Draft Full ITT": kicks off the same playbook-grounded 16-section
  // writer the bid team uses, for a tender straight from the discovery list. The draft
  // lands in the Bid Writer as 'auto_drafted' for HUMAN REVIEW — never auto-submitted.
  const [draftingId, setDraftingId] = useState<number | null>(null);
  const [draftedIds, setDraftedIds] = useState<Set<number>>(new Set());
  const [deepDiveTender, setDeepDiveTender] = useState<any>(null);
  const autoDraftItt = async (t: any) => {
    if (draftingId) return;
    setDraftingId(t.id);
    try {
      await saasApiRequest("POST", `${API}/bid-sections/generate-all`, { tender_id: t.id });
      setDraftedIds(prev => new Set(prev).add(t.id));
    } catch {
      // surfaced via the button reverting; the dashboard toast layer owns global errors
    } finally {
      setDraftingId(null);
    }
  };

  return (
    <>
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>All Tenders ({tenders.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setShowQuickAdd(true); setQuickAddTab("url"); setQuickAddResult(null); }}
            style={{ ...btn("rgba(245,158,11,0.2)"), color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)", fontWeight: 600 }}
            title="Paste a URL or enter details manually to add any tender you discovered via intelligence tools or manual research"
          >⚡ Quick Add</button>
          <button onClick={() => { setEditingTender(null); setTenderForm({}); setShowTenderForm(true); }} style={btn(BLUE)}>+ Add Tender</button>
        </div>
      </div>

      {showTenderForm && (
        <div style={{ ...card() }}>
          <h3 style={{ color: "#fff", margin: "0 0 16px" }}>{editingTender ? "Edit Tender" : "New Tender"}</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label style={label()}>TITLE *</label><input value={tenderForm.title || ""} onChange={e => setTenderForm({ ...tenderForm, title: e.target.value })} style={input()} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={label()}>BUYER</label><input value={tenderForm.buyer || ""} onChange={e => setTenderForm({ ...tenderForm, buyer: e.target.value })} style={input()} /></div>
              <div><label style={label()}>CATEGORY</label><input value={tenderForm.category || ""} onChange={e => setTenderForm({ ...tenderForm, category: e.target.value })} style={input()} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div><label style={label()}>VALUE</label><input value={tenderForm.value_text || ""} onChange={e => setTenderForm({ ...tenderForm, value_text: e.target.value })} style={input()} placeholder="e.g. £50,000" /></div>
              <div><label style={label()}>DEADLINE</label><input type="date" value={tenderForm.deadline || ""} onChange={e => setTenderForm({ ...tenderForm, deadline: e.target.value })} style={input()} /></div>
              <div><label style={label()}>STATUS</label>
                <select value={tenderForm.status || "Researching"} onChange={e => setTenderForm({ ...tenderForm, status: e.target.value })} style={input()}>
                  {TENDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={label()}>PORTAL</label><input value={tenderForm.portal || ""} onChange={e => setTenderForm({ ...tenderForm, portal: e.target.value })} style={input()} /></div>
              <div><label style={label()}>SOURCE URL</label><input value={tenderForm.source_url || ""} onChange={e => setTenderForm({ ...tenderForm, source_url: e.target.value })} style={input()} /></div>
            </div>
            <div><label style={label()}>SCORING CRITERIA</label><textarea value={tenderForm.scoring_criteria || ""} onChange={e => setTenderForm({ ...tenderForm, scoring_criteria: e.target.value })} style={{ ...input(), minHeight: 60 }} /></div>
            <div><label style={label()}>NOTES</label><textarea value={tenderForm.notes || ""} onChange={e => setTenderForm({ ...tenderForm, notes: e.target.value })} style={{ ...input(), minHeight: 60 }} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveTender} style={btn(BLUE)} disabled={!tenderForm.title}>Save Tender</button>
              <button onClick={() => { setShowTenderForm(false); setEditingTender(null); }} style={btn("rgba(255,255,255,0.1)")}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── D1: Org-lane segmented control ─────────────────────────────────── */}
      {(() => {
        const lanes: { key: OrgLaneFilter; label: string; count: number; color: string }[] = [
          { key: "all", label: "All", count: tenders.length, color: "#94a3b8" },
          ...LANE_CHIPS.map(c => ({
            key: c.key as OrgLaneFilter,
            label: c.label,
            count: tenders.filter(t => laneScoreOf(t, c.key) >= LANE_THRESHOLD).length,
            color: c.color,
          })),
        ];
        return (
          <div style={{ display: "flex", gap: 6, padding: "10px 0 2px", flexWrap: "wrap" }}>
            {lanes.map(l => {
              const active = orgLaneFilter === l.key;
              return (
                <button
                  key={l.key}
                  onClick={() => setOrgLaneFilter(l.key)}
                  style={{
                    padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: active ? `${l.color}2e` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? l.color : BORDER}`,
                    color: active ? l.color : "#64748b",
                    transition: "all 0.15s",
                  }}
                >
                  {l.label} <span style={{ opacity: 0.75 }}>({l.count})</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ── Not-relevant toggle ──────────────────────────────────────────── */}
      {notRelevantIds.size > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 0" }}>
          <button
            onClick={() => setShowNotRelevant(v => !v)}
            style={{ background: "none", border: `1px solid ${showNotRelevant ? "#ef4444" : "#334155"}`, color: showNotRelevant ? "#ef4444" : "#64748b", borderRadius: 8, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}
          >
            {showNotRelevant ? "▲ Hide" : "▼ Show"} {notRelevantIds.size} hidden
          </button>
        </div>
      )}

      {/* ── Tender card list ─────────────────────────────────────────────── */}
      {(() => {
        const filteredTenders = tenders.filter(t => {
          const isNR = notRelevantIds.has(t.id);
          if (isNR && !showNotRelevant) return false;
          if (orgLaneFilter === "all") return true;
          return laneScoreOf(t, orgLaneFilter) >= LANE_THRESHOLD;
        });

        // D2 org pills helper
        const OrgPill = ({ tender, org, label: pillLabel, color, bg }: { tender: any; org: string; label: string; color: string; bg: string }) => {
          const keywords: string[] = (org === "ep" ? tender.ep_matched_keywords : org === "alli" ? tender.alli_matched_keywords : tender.pmo_matched_keywords) || [];
          const score: number = org === "ep" ? tender.ep_relevance_score : org === "alli" ? tender.alli_relevance_score : tender.pmo_relevance_score;
          const isHovered = hoveredOrgPill?.id === tender.id && hoveredOrgPill?.org === org;
          return (
            <div style={{ position: "relative", display: "inline-block" }}>
              <span
                onMouseEnter={() => setHoveredOrgPill({ id: tender.id, org })}
                onMouseLeave={() => setHoveredOrgPill(null)}
                onClick={e => e.stopPropagation()}
                style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color, border: `1px solid ${color}33`, cursor: "default", userSelect: "none" }}
              >
                {pillLabel}
              </span>
              {isHovered && keywords.length > 0 && (
                <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 100, background: "#1e293b", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", minWidth: 180, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", pointerEvents: "none" }}>
                  <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{pillLabel} keywords (score: {score})</div>
                  {keywords.slice(0, 3).map((kw: string) => (
                    <div key={kw} style={{ color, fontSize: 11, padding: "2px 0" }}>· {kw}</div>
                  ))}
                </div>
              )}
            </div>
          );
        };

        if (filteredTenders.length === 0) {
          const laneLabel = orgLaneFilter === "all" ? "" : (LANE_CHIPS.find(c => c.key === orgLaneFilter)?.label || orgLaneFilter);
          return (
            <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>
              {tenders.length === 0
                ? "No tenders tracked yet. Click \"Add Tender\" to start."
                : `No ${laneLabel} tenders match your current filters. Try `}
              {tenders.length > 0 && orgLaneFilter !== "all" && (
                <button onClick={() => setOrgLaneFilter("all")} style={{ ...btn("transparent"), color: BLUE, padding: 0, textDecoration: "underline", display: "inline" }}>All</button>
              )}
              {tenders.length > 0 && orgLaneFilter !== "all" && " or adjust other filters."}
            </div>
          );
        }

        return (
          <div style={{ display: "grid", gap: 8 }}>
            {filteredTenders.map(t => {
              const geoScore = fitScores.find((s: any) => s.tender_id === t.id);
              const hasGeoFlag = geoScore?.geography_flag === true;
              const isWhyOpen = expandedWhyId === t.id;
              const hasOrgTags = t.ep_relevant || t.alli_relevant || t.pmo_relevant;

              return (
                <div key={t.id} onClick={() => selectTender(t)} style={{ ...card(), cursor: "pointer", padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{t.title}</div>
                      <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{t.buyer} · {t.category} · ⏰ {fmtDate(t.deadline)}</div>

                      {/* D2: Org pills row */}
                      {hasOrgTags && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }} onClick={e => e.stopPropagation()}>
                          {t.ep_relevant   && <OrgPill tender={t} org="ep"   label="EP"   color="#3b82f6" bg="rgba(59,130,246,0.12)" />}
                          {t.alli_relevant && <OrgPill tender={t} org="alli" label="ALLI" color="#8b5cf6" bg="rgba(139,92,246,0.12)" />}
                          {t.pmo_relevant  && <OrgPill tender={t} org="pmo"  label="PMO"  color="#f59e0b" bg="rgba(245,158,11,0.12)" />}
                        </div>
                      )}

                      {/* D3: "Why?" link */}
                      {hasOrgTags && (
                        <button
                          onClick={e => { e.stopPropagation(); setExpandedWhyId(isWhyOpen ? null : t.id); }}
                          style={{ ...btn("transparent"), padding: "3px 0", marginTop: 4, color: "#475569", fontSize: 11, textDecoration: "underline", textDecorationColor: "#334155" }}
                        >
                          {isWhyOpen ? "▲ Hide" : "▼ Why this tender?"}
                        </button>
                      )}

                      {/* D3: Why? expanded panel */}
                      {isWhyOpen && (
                        <div onClick={e => e.stopPropagation()} style={{ marginTop: 8, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }}>
                          {t.ep_relevant && (
                            <div style={{ marginBottom: 8 }}>
                              <span style={{ color: "#3b82f6", fontWeight: 700 }}>EP</span>
                              <span style={{ color: "#64748b" }}> — score {t.ep_relevance_score} · matched: </span>
                              <span style={{ color: "#93c5fd" }}>{(t.ep_matched_keywords || []).join(", ") || "—"}</span>
                            </div>
                          )}
                          {t.alli_relevant && (
                            <div style={{ marginBottom: 8 }}>
                              <span style={{ color: "#8b5cf6", fontWeight: 700 }}>ALLI</span>
                              <span style={{ color: "#64748b" }}> — score {t.alli_relevance_score} · matched: </span>
                              <span style={{ color: "#c4b5fd" }}>{(t.alli_matched_keywords || []).join(", ") || "—"}</span>
                            </div>
                          )}
                          {t.pmo_relevant && (
                            <div>
                              <span style={{ color: "#f59e0b", fontWeight: 700 }}>PMO</span>
                              <span style={{ color: "#64748b" }}> — score {t.pmo_relevance_score} · matched: </span>
                              <span style={{ color: "#fcd34d" }}>{(t.pmo_matched_keywords || []).join(", ") || "—"}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {hasGeoFlag && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4 }}>
                          ⚠️ Geography Gap — {geoScore.geography_note || "No local delivery history for this region"}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginLeft: 12 }}>
                      {t.value_amount > 0 && user?.access_level === "full" && <span style={{ color: GOLD, fontWeight: 700 }}>£{fmtMoney(t.value_amount)}</span>}
                      <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: t.status === "Won" ? "rgba(16,185,129,0.2)" : t.status === "Lost" ? "rgba(239,68,68,0.2)" : t.status === "Submitted" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.1)", color: t.status === "Won" ? "#10b981" : t.status === "Lost" ? "#ef4444" : t.status === "Submitted" ? BLUE : "#94a3b8" }}>{t.status}</span>
                      <button
                        onClick={e => { e.stopPropagation(); toggleNotRelevant(t.id); }}
                        disabled={togglingNotRelevant === t.id}
                        title={notRelevantIds.has(t.id) ? "Restore to pipeline" : "Mark as not relevant"}
                        style={{ ...btn("transparent"), padding: "4px 8px", color: notRelevantIds.has(t.id) ? "#10b981" : "#475569", fontSize: 13 }}
                      >{notRelevantIds.has(t.id) ? "↩" : "🚫"}</button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeepDiveTender(t); }}
                        title="Deep dive on the buyer — past events, procurement history, feedback"
                        style={{ ...btn("rgba(139,92,246,0.18)"), color: "#a78bfa", border: "1px solid rgba(139,92,246,0.4)", fontSize: 11, padding: "4px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                        🔍 Buyer Deep Dive
                      </button>
                      {t.source_url && (
                        <a href={t.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          title="Open the original tender notice"
                          style={{ ...btn("transparent"), padding: "4px 8px", color: "#60a5fa", textDecoration: "none" }}>🔗</a>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); autoDraftItt(t); }}
                        disabled={draftingId === t.id}
                        title="Auto-draft the full ITT response for this tender (for human review)"
                        style={{ ...btn(draftedIds.has(t.id) ? "rgba(16,185,129,0.18)" : "rgba(245,158,11,0.18)"), color: draftedIds.has(t.id) ? "#10b981" : "#f59e0b", border: `1px solid ${draftedIds.has(t.id) ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"}`, fontSize: 11, padding: "4px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {draftingId === t.id ? "⏳ Drafting…" : draftedIds.has(t.id) ? "✓ ITT Drafted" : "✨ Auto-Draft ITT"}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setEditingTender(t); setTenderForm(t); setShowTenderForm(true); }} style={{ ...btn("transparent"), padding: "4px 8px" }}>✏️</button>
                      <button onClick={e => { e.stopPropagation(); deleteTender(t.id); }} style={{ ...btn("transparent"), padding: "4px 8px" }}>🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
    {deepDiveTender && <TenderDeepDive tender={deepDiveTender} onClose={() => setDeepDiveTender(null)} />}
    </>
  );
}
