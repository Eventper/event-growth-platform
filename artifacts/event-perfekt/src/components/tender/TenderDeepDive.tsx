// Buyer Deep-Dive — due diligence on the BUYER behind a tender, to write a
// buyer-aware bid. Pulls the buyer's REAL recent procurement history from
// Contracts Finder (their past contracts incl. events, the incumbents who keep
// winning, categories, typical value, renewals due), a grounded AI buyer brief
// (who they are, what they value, how EP should position, [GAP: …] for unknowns),
// and live research links — images of their past events, news/feedback, their
// notice pages. No invented facts, no EP imagery.
import { useEffect, useState } from "react";
import { card, BORDER, GOLD, fmtMoney, fmtDate, API, saasApiRequest, POPPINS_STACK } from "./ui";

export default function TenderDeepDive({ tender, onClose }: { tender: any; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true); setErr("");
    saasApiRequest("GET", `${API}/buyer-due-diligence/${tender.id}`)
      .then(setData)
      .catch((e: any) => setErr(e.message || "Failed to load buyer due diligence"))
      .finally(() => setLoading(false));
  }, [tender.id]);

  const brief = data?.brief;
  const history: any[] = data?.history || [];
  const stats = data?.stats;
  const renewals: any[] = data?.renewals || [];
  const links: { label: string; url: string }[] = data?.links || [];

  const Block = ({ title, items, color = "#cbd5e1" }: { title: string; items?: string[]; color?: string }) =>
    items && items.length > 0 ? (
      <div>
        <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{title}</div>
        <ul style={{ margin: 0, paddingLeft: 16, color, fontSize: 12.5, lineHeight: 1.6 }}>
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
    ) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(3,7,18,0.82)", zIndex: 1300, display: "flex", justifyContent: "center", overflowY: "auto", padding: "24px 16px", fontFamily: POPPINS_STACK }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 960, background: "#0f1729", border: `1px solid ${BORDER}`, borderRadius: 16, height: "fit-content" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: 24, borderBottom: `1px solid ${BORDER}`, background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))", borderRadius: "16px 16px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Buyer due diligence</div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginTop: 4 }}>{tender.buyer || "Buyer not specified"}</div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>for: {tender.title}</div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, color: "#fff", borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>
          {/* Research links — images of past events, news/feedback, notices */}
          {links.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {links.map(l => (
                <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, padding: "5px 11px" }}>
                  {l.label === "Past events (image search)" ? "🖼 " : l.label === "News & feedback" ? "📰 " : "🔗 "}{l.label} ↗
                </a>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: 24, display: "grid", gap: 20 }}>
          {loading && <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 30 }}>⏳ Researching the buyer…</div>}
          {err && <div style={{ color: "#f87171", fontSize: 12, background: "rgba(239,68,68,0.1)", padding: "10px 12px", borderRadius: 8 }}>{err}</div>}

          {!loading && !err && (
            <>
              {/* Embedded past-event images (only when a Google CSE key is set) */}
              {Array.isArray(data?.images) && data.images.length > 0 && (
                <div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🖼 The buyer's past events</div>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {data.images.map((im: any, i: number) => (
                      <a key={i} href={im.source || im.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                        <img src={im.thumb || im.url} alt="buyer past event" loading="lazy"
                          style={{ height: 110, width: 150, objectFit: "cover", borderRadius: 8, border: `1px solid ${BORDER}` }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {/* AI buyer brief */}
              {brief ? (
                <div style={{ ...card(), padding: 18, display: "grid", gap: 14 }}>
                  {brief.who_they_are && (
                    <div>
                      <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Who they are</div>
                      <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>{brief.who_they_are}</div>
                    </div>
                  )}
                  {brief.past_events_signal && (
                    <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: 12 }}>
                      <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, marginBottom: 3 }}>🎪 What they buy (events signal)</div>
                      <div style={{ color: "#e2e8f0", fontSize: 12.5, lineHeight: 1.6 }}>{brief.past_events_signal}</div>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Block title="Remit & priorities" items={brief.remit_and_priorities} />
                    <Block title="What they value in bids" items={brief.what_they_value_in_bids} />
                    <Block title="How EP should position" items={brief.positioning_for_ep} color="#86efac" />
                    <Block title="Watch-outs" items={brief.watch_outs} color="#fca5a5" />
                  </div>
                  {brief.incumbent_landscape && (
                    <div><span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Incumbent landscape: </span><span style={{ color: "#cbd5e1", fontSize: 12.5 }}>{brief.incumbent_landscape}</span></div>
                  )}
                  <Block title="Open questions / gaps" items={brief.gaps} color="#fcd34d" />
                </div>
              ) : (
                <div style={{ color: "#64748b", fontSize: 12 }}>No AI brief available (buyer name may be missing or the model was unavailable). The procurement history and research links below are still live.</div>
              )}

              {/* Real procurement stats */}
              {stats && stats.total > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                  <div style={{ ...card(), padding: 12 }}><div style={{ color: "#94a3b8", fontSize: 11 }}>Awards (2y)</div><div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>{stats.total}</div></div>
                  {stats.average_value != null && <div style={{ ...card(), padding: 12 }}><div style={{ color: "#94a3b8", fontSize: 11 }}>Avg value</div><div style={{ color: GOLD, fontSize: 20, fontWeight: 800 }}>£{fmtMoney(stats.average_value)}</div></div>}
                  {renewals.length > 0 && <div style={{ ...card(), padding: 12 }}><div style={{ color: "#94a3b8", fontSize: 11 }}>Up for renewal (12m)</div><div style={{ color: "#34d399", fontSize: 20, fontWeight: 800 }}>{renewals.length}</div></div>}
                </div>
              )}

              {/* Top incumbents + categories */}
              {stats && (stats.top_winners?.length > 0 || stats.top_categories?.length > 0) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {stats.top_winners?.length > 0 && (
                    <div style={{ ...card(), padding: 14 }}>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🏅 Who keeps winning their work</div>
                      {stats.top_winners.map((w: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#cbd5e1", padding: "3px 0" }}><span>{w.name}</span><span style={{ color: "#64748b" }}>{w.count}×</span></div>
                      ))}
                    </div>
                  )}
                  {stats.top_categories?.length > 0 && (
                    <div style={{ ...card(), padding: 14 }}>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📦 What they buy most</div>
                      {stats.top_categories.map((c: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#cbd5e1", padding: "3px 0" }}><span style={{ flex: 1, marginRight: 8 }}>{c.name}</span><span style={{ color: "#64748b" }}>{c.count}×</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Their real procurement history */}
              <div style={{ ...card(), padding: 16 }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📜 Their recent contracts (real — Contracts Finder, last 2y)</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>Scan for past events/engagement work, incumbents and budgets to mirror in the bid.</div>
                {history.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: 12 }}>No award history found on Contracts Finder for this buyer. Use the research links above and the buyer's own “work with us” page.</div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {history.map((c: any, i: number) => (
                      <div key={i} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: `1px solid ${BORDER}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                          <div style={{ color: "#e2e8f0", fontSize: 12.5, fontWeight: 600, flex: 1 }}>
                            {c.source_url ? <a href={c.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", textDecoration: "none" }}>{c.title}</a> : c.title}
                          </div>
                          {c.award_value > 0 && <span style={{ color: GOLD, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>£{fmtMoney(c.award_value)}</span>}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                          {c.winner ? <>won by <b style={{ color: "#cbd5e1" }}>{c.winner}</b> · </> : null}{c.category || "—"}{c.deadline ? ` · ends ${fmtDate(c.deadline)}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
