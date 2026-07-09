import { useEffect, useMemo, useRef, useState } from "react";
import { portalFetch } from "@/lib/client-portal-auth";

const BURGUNDY = "#3D0B0B";
const BURGUNDY_DARK = "#2a0808";
const GOLD = "#C9A84C";

const SYSTEM_PROMPT = `You are the Event Perfekt client assistant. You speak directly to clients of Event Perfekt Global Ltd. You are professional, warm, clear, and genuinely helpful. You represent the Event Perfekt team.

YOUR PURPOSE:
Help clients understand their project, navigate their portal, find their documents, track their project progress, and communicate with the EP team.

ABOUT EVENT PERFEKT GLOBAL LTD:
A UK-based programme delivery and event management company with 15+ years experience. We deliver government programmes, corporate events, private celebrations, and community initiatives across the UK, Nigeria, and Africa. Company No. 15875326. Website: www.eventperfekt.com. Email: adminuk@eventperfekt.com.

WHAT YOU HELP CLIENTS WITH:
Documents
Project Progress
Messages
Invoices
General portal help

YOUR RULES:
- Always be warm, professional, and reassuring
- Never discuss fees, contract values, retainers, or payment terms — direct all financial queries to adminuk@eventperfekt.com
- Never discuss other clients or other projects
- Never discuss internal EP operations, team salaries, or business details
- Never make promises about outcomes — only about effort and process
- Always end every response with: If you need anything else please message us here or email adminuk@eventperfekt.com — we are always happy to help.
- Refer to Event Perfekt as we and us — never they or the company
- If you do not know the answer to something say: I will pass this to the team and someone will respond within 24 hours. Please also feel free to email adminuk@eventperfekt.com directly.
- Keep responses concise and clear
- Never use jargon or technical language
- Always be positive and solution-focused`;

type Msg = { role: "user" | "assistant"; content: string };

export default function AskEPTeamWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hello, I’m the Event Perfekt team assistant. How can I help today?" },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const payload = {
        system: SYSTEM_PROMPT,
        messages: [...messages, { role: "user", content: text }].map((m) => ({ role: m.role, content: m.content })),
      };
      const res = await portalFetch("POST", "/api/client-portal/assistant", payload);
      const reply = res?.reply || "I will pass this to the team and someone will respond within 24 hours. Please also feel free to email adminuk@eventperfekt.com directly.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I will pass this to the team and someone will respond within 24 hours. Please also feel free to email adminuk@eventperfekt.com directly." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 80,
          background: GOLD,
          color: "#1a0a0e",
          border: "none",
          borderRadius: 999,
          padding: "12px 16px",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
          cursor: "pointer",
        }}
      >
        Ask the EP Team
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 74,
            width: 340,
            maxWidth: "calc(100vw - 40px)",
            height: 460,
            zIndex: 80,
            background: BURGUNDY_DARK,
            border: "1px solid rgba(201,168,76,0.35)",
            borderRadius: 16,
            boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontWeight: 700 }}>
            Ask the EP Team
          </div>
          <div style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? GOLD : "rgba(255,255,255,0.08)",
                  color: m.role === "user" ? "#1a0a0e" : "#fff",
                  padding: "10px 12px",
                  borderRadius: 14,
                  maxWidth: "88%",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {m.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "#fff",
                padding: "10px 12px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={!canSend}
              style={{
                background: GOLD,
                color: "#1a0a0e",
                border: "none",
                borderRadius: 10,
                padding: "0 14px",
                fontWeight: 700,
                fontSize: 13,
                cursor: canSend ? "pointer" : "not-allowed",
                opacity: canSend ? 1 : 0.7,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}