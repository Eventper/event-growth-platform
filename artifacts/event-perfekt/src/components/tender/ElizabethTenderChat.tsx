// Elizabeth — a conversational tender/bid assistant you can actually talk to.
// Floating widget: hold a real back-and-forth (with memory), ask her to judge
// fit, research a buyer, explain scoring, or "find more tenders like this" —
// she runs a live Contracts Finder search and discusses the results. Optional
// `tenderId` focuses her on one tender (used from the Buyer Deep Dive).
import { useState, useRef, useEffect } from "react";
import { API, saasApiRequest, POPPINS_STACK, BORDER, GOLD } from "./ui";
import BidProse from "./BidProse";

type Msg = { role: "user" | "assistant"; content: string; results?: any[] };

export default function ElizabethTenderChat({ tenderId, label }: { tenderId?: number; label?: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: label
      ? `Hi — I'm Elizabeth. Ask me anything about **${label}**: is it worth bidding, who's the buyer, what should we lead with, or say *"find more like this"*.`
      : `Hi — I'm Elizabeth, your bid strategist. Ask me which tenders to prioritise, to research a buyer, explain the scoring, or *"search Contracts Finder for event management"*. What are we working on?` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await saasApiRequest("POST", `${API}/elizabeth/chat`, {
        messages: next.map(m => ({ role: m.role, content: m.content })),
        tender_id: tenderId,
      });
      setMsgs(m => [...m, { role: "assistant", content: r.reply || "…", results: r.results }]);
    } catch (e: any) {
      setMsgs(m => [...m, { role: "assistant", content: `⚠️ ${e.message || "Something went wrong"}` }]);
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title="Ask Elizabeth"
        style={{ position: "fixed", bottom: 22, right: 22, zIndex: 1400, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", color: "#fff", border: "none", borderRadius: 999, padding: "12px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(99,102,241,0.4)", fontFamily: POPPINS_STACK }}>
        💬 Ask Elizabeth
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 1400, width: "min(420px, calc(100vw - 32px))", height: "min(620px, calc(100vh - 80px))", background: "#0f1729", border: `1px solid ${BORDER}`, borderRadius: 16, display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", fontFamily: POPPINS_STACK }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(59,130,246,0.1))", borderRadius: "16px 16px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>E</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Elizabeth</div>
            <div style={{ color: "#94a3b8", fontSize: 10 }}>bid strategist · live search</div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "88%", padding: "10px 13px", borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px", background: m.role === "user" ? "rgba(99,102,241,0.28)" : "rgba(255,255,255,0.05)", border: `1px solid ${m.role === "user" ? "rgba(99,102,241,0.4)" : BORDER}`, color: "#e5edf7", fontSize: 13.5 }}>
              {m.role === "assistant" ? <BidProse content={m.content} /> : m.content}
              {m.results && m.results.length > 0 && (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {m.results.map((r: any, j: number) => (
                    <a key={j} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", padding: "7px 9px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8 }}>
                      <div style={{ color: "#93c5fd", fontSize: 12, fontWeight: 600 }}>{r.title}</div>
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>{r.buyer} · deadline {r.deadline}</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>Elizabeth is thinking…</div>}
      </div>

      <div style={{ padding: 12, borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={1}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask Elizabeth, or say 'find more like this'…"
          style={{ flex: 1, resize: "none", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 13, padding: "10px 12px", fontFamily: POPPINS_STACK, maxHeight: 100 }} />
        <button onClick={send} disabled={busy || !input.trim()} style={{ background: busy || !input.trim() ? "#374151" : GOLD, color: "#000", border: "none", borderRadius: 10, padding: "0 16px", fontWeight: 700, fontSize: 13, cursor: busy || !input.trim() ? "default" : "pointer" }}>
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
