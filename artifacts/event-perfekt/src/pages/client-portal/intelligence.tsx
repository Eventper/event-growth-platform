import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { portalFetch } from "@/lib/client-portal-auth";

const BURGUNDY = "#3D0B0B";
const CATEGORIES = ["All", "Policy", "Research", "Statistics", "Case Study", "Funding", "Organisations", "Legislation", "News"];

type Article = {
  id: number;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  author?: string;
  published_at?: string;
  category: string;
  tags: string[];
  relevance_score?: number;
  saved_by: string[];
  is_featured: boolean;
};

export default function IntelligenceHub() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"All" | "Saved" | "Research">("All");
  const [category, setCategory] = useState("All");
  const [articles, setArticles] = useState<Article[]>([]);
  const [saved, setSaved] = useState<Article[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionInput, setSessionInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    try {
      const [arts, sav, sess] = await Promise.all([
        portalFetch("GET", `/api/client-portal/intelligence${category !== "All" ? `?category=${encodeURIComponent(category)}` : ""}`).catch(() => []),
        portalFetch("GET", "/api/client-portal/intelligence/saved").catch(() => []),
        portalFetch("GET", "/api/client-portal/research").catch(() => []),
      ]);
      setArticles(Array.isArray(arts) ? arts : []);
      setSaved(Array.isArray(sav) ? sav : []);
      setSessions(Array.isArray(sess) ? sess : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [category]);

  async function toggleSave(id: number) {
    await portalFetch("POST", `/api/client-portal/intelligence/${id}/save`).catch(() => null);
    load();
  }

  async function startSession() {
    const title = prompt("Research session title?", "Funding opportunities for Q2");
    if (!title) return;
    const s = await portalFetch("POST", "/api/client-portal/research/start", { session_title: title }).catch(() => null);
    if (s) {
      const full = await portalFetch("GET", `/api/client-portal/research/${s.id}`).catch(() => null);
      setActiveSession(full || s);
      load();
    }
  }

  async function openSession(id: number) {
    const full = await portalFetch("GET", `/api/client-portal/research/${id}`).catch(() => null);
    if (full) setActiveSession(full);
  }

  async function sendMsg() {
    if (!sessionInput.trim() || !activeSession || sending) return;
    setSending(true);
    try {
      const r = await portalFetch("POST", `/api/client-portal/research/${activeSession.id}/message`, { message: sessionInput });
      setActiveSession({ ...activeSession, messages: r.messages });
      setSessionInput("");
    } catch (e: any) {
      alert(e.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function generateDoc() {
    if (!activeSession) return;
    if (!confirm("Compile this session into a research brief document?")) return;
    const r = await portalFetch("POST", `/api/client-portal/research/${activeSession.id}/generate-document`).catch((e: any) => ({ error: e.message }));
    if (r?.document_url) {
      alert("Document saved to your Documents → Research folder");
      setLocation("/client-portal/documents");
    } else {
      alert(r?.error || "Generation failed");
    }
  }

  const list = tab === "Saved" ? saved : articles;
  const featured = articles.find(a => a.is_featured);

  if (activeSession) {
    return (
      <PortalLayout>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setActiveSession(null)} style={{ background: "none", border: "none", color: BURGUNDY, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Back to Intelligence Hub</button>
          <button onClick={generateDoc} style={{ background: BURGUNDY, color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Write this up → Document</button>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a0a0e", margin: "0 0 4px" }}>{activeSession.session_title}</h2>
          <p style={{ color: "#666", fontSize: 12, margin: "0 0 16px" }}>Live research session with EP Agent · Ask about knife crime policy, funding, statistics, Michael Jibowu, or anything else.</p>
          <div style={{ minHeight: 300, maxHeight: 500, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: 8, background: "#fafafa", borderRadius: 8 }}>
            {(activeSession.messages || []).length === 0 && <div style={{ color: "#999", fontSize: 12, textAlign: "center", padding: 40 }}>Start the conversation below.</div>}
            {(activeSession.messages || []).map((m: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "78%", background: m.role === "user" ? BURGUNDY : "#fff", color: m.role === "user" ? "#fff" : "#1a0a0e", borderRadius: 10, padding: "10px 14px", border: m.role === "user" ? "none" : "1px solid #e8e0d8", fontSize: 13, whiteSpace: "pre-wrap" }}>
                  <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4, fontWeight: 700 }}>{m.role === "user" ? m.author || "You" : "🧠 EP Agent"}</div>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <input
              value={sessionInput}
              onChange={e => setSessionInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendMsg(); }}
              placeholder="Ask about policy, funders, Young Futures Hubs, statistics..."
              style={{ flex: 1, padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}
            />
            <button onClick={sendMsg} disabled={sending} style={{ background: BURGUNDY, color: "#fff", border: "none", borderRadius: 6, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.6 : 1 }}>{sending ? "Thinking..." : "Send"}</button>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#888" }}>Try: <em>Search for knife crime funders</em> · <em>Summarise the Home Office plan</em> · <em>Find funders for mentoring programmes</em> · <em>Write this up</em></div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Intelligence Hub</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>Latest policy, research, funding, and case studies — curated by EP Agent for ALLI Foundation.</p>
        </div>
        <button onClick={startSession} style={{ background: BURGUNDY, color: "#fff", border: "none", borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>🧠 Start Research Session</button>
      </div>

      <div className="ep-portal-nav" style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.15)", overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
        {(["All", "Saved", "Research"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: tab === t ? "#C9A84C" : "rgba(255,255,255,0.6)", borderBottom: tab === t ? "2px solid #C9A84C" : "2px solid transparent", whiteSpace: "nowrap" }}>
            {t === "All" ? `All Articles (${articles.length})` : t === "Saved" ? `Saved (${saved.length})` : `Research Sessions (${sessions.length})`}
          </button>
        ))}
      </div>

      {tab === "Research" ? (
        <div>
          {sessions.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 40, textAlign: "center" }}>
              <p style={{ color: "#666", marginBottom: 16 }}>No research sessions yet. Start one to explore policy, funders, or any question with EP Agent.</p>
              <button onClick={startSession} style={{ background: BURGUNDY, color: "#fff", border: "none", borderRadius: 6, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Start your first session</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sessions.map(s => (
                <div key={s.id} onClick={() => openSession(s.id)} style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 16, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a0a0e" }}>{s.session_title}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Started by {s.started_by} · {new Date(s.updated_at || s.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: s.status === "active" ? "#d1fae5" : "#f3f4f6", color: s.status === "active" ? "#059669" : "#6b7280", fontWeight: 600 }}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {tab === "All" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{ background: category === c ? BURGUNDY : "#fff", color: category === c ? "#fff" : "#555", border: "1px solid " + (category === c ? BURGUNDY : "#e8e0d8"), borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{c}</button>
              ))}
            </div>
          )}

          {tab === "All" && featured && (
            <div style={{ background: "linear-gradient(135deg,#3D0B0B 0%,#5a1015 100%)", color: "#fff", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#ffd5a0", letterSpacing: 1, marginBottom: 6 }}>★ FEATURED</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>{featured.title}</h2>
              <p style={{ fontSize: 13, opacity: 0.9, margin: "0 0 12px" }}>{featured.summary}</p>
              <div style={{ display: "flex", gap: 10, fontSize: 11, opacity: 0.8 }}>
                <span>{featured.source_name}</span>
                <span>·</span>
                <span>{featured.published_at ? new Date(featured.published_at).toLocaleDateString("en-GB", { dateStyle: "medium" }) : ""}</span>
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                {featured.source_url && <a href={featured.source_url} target="_blank" rel="noreferrer" style={{ background: "#fff", color: BURGUNDY, padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Read Full Article</a>}
                <button onClick={() => toggleSave(featured.id)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{(featured.saved_by || []).length > 0 ? "★ Saved" : "☆ Save"}</button>
              </div>
            </div>
          )}

          {loading ? <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading intelligence...</div> : (
            list.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 40, textAlign: "center" }}>
                <p style={{ color: "#666", marginBottom: 8 }}>{tab === "Saved" ? "You haven't saved any articles yet." : "No articles in this category."}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {list.filter(a => !a.is_featured || tab === "Saved").map(a => (
                  <div key={a.id} style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 16, transition: "box-shadow 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#f0ebe6", color: BURGUNDY, padding: "2px 8px", borderRadius: 100 }}>{a.category}</span>
                          <span style={{ fontSize: 11, color: "#888" }}>{a.source_name}</span>
                          {a.published_at && <><span style={{ color: "#ccc" }}>·</span><span style={{ fontSize: 11, color: "#888" }}>{new Date(a.published_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}</span></>}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a0a0e", margin: "0 0 6px", cursor: "pointer" }} onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{a.title}</h3>
                        <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.5 }}>{expanded === a.id ? a.summary : a.summary.slice(0, 200) + (a.summary.length > 200 ? "…" : "")}</p>
                        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                          {a.source_url && <a href={a.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: BURGUNDY, fontWeight: 600, textDecoration: "none" }}>Read full →</a>}
                          <button onClick={() => toggleSave(a.id)} style={{ background: "none", border: "none", fontSize: 12, color: (a.saved_by || []).length > 0 ? BURGUNDY : "#888", cursor: "pointer", fontWeight: 600 }}>{(a.saved_by || []).length > 0 ? "★ Saved" : "☆ Save"}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </PortalLayout>
  );
}
