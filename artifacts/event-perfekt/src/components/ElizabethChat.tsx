import { useState, useRef, useEffect } from "react";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ElizabethChatProps {
  page?: string;
}

export default function ElizabethChat({ page }: ElizabethChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I am here to help." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages
  useEffect(() => {
    const saved = localStorage.getItem("elizabeth_messages");
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("elizabeth_messages", JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setError("");
    setLoading(true);

    const nextMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/event-16july/elizabeth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-10), page }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setError(err.message);
      setMessages(prev => [...prev, { role: "assistant", content: "I'm sorry, I seem to have lost my connection. Please try again in a moment, or email info@eventperfekt.com." }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Good evening. I'm Elizabeth — your host for The Woman Who Leads the Room. Ask me anything about the event, partnerships, or how to request your seat." }]);
    localStorage.removeItem("elizabeth_messages");
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 300,
            width: 56, height: 56, borderRadius: "50%",
            background: GOLD, color: INK,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(201,169,97,0.3)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            fontSize: 24,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(201,169,97,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(201,169,97,0.3)"; }}
          aria-label="Open chat with Elizabeth"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 300,
          width: 360, maxWidth: "calc(100vw - 32px)",
          height: 520, maxHeight: "calc(100vh - 48px)",
          background: "#1A0A0E", border: "1px solid rgba(201,169,97,0.2)",
          borderRadius: 12, overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid rgba(201,169,97,0.15)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(201,169,97,0.2), rgba(201,169,97,0.05))",
                border: "1px solid rgba(201,169,97,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: GOLD,
              }}>E</div>
              <div>
                <p style={{ fontSize: 13, color: IVORY, margin: 0, fontWeight: 500 }}>Elizabeth</p>
                <p style={{ fontSize: 10, color: "rgba(244,236,216,0.4)", margin: 0, letterSpacing: "0.08em" }}>YOUR HOST</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={clearChat} style={{ background: "none", border: "none", color: "rgba(244,236,216,0.3)", cursor: "pointer", fontSize: 11, padding: 4 }} title="Clear chat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(244,236,216,0.4)", cursor: "pointer", fontSize: 18, padding: 4, lineHeight: 1 }} aria-label="Close chat">×</button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                background: m.role === "user" ? "rgba(201,169,97,0.15)" : "rgba(244,236,216,0.05)",
                border: m.role === "user" ? "1px solid rgba(201,169,97,0.1)" : "1px solid rgba(244,236,216,0.06)",
                color: IVORY,
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: "elizabethPulse 1s infinite" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: "elizabethPulse 1s infinite 0.2s" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: "elizabethPulse 1s infinite 0.4s" }} />
                <style>{`@keyframes elizabethPulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
              </div>
            )}
            {error && !loading && (
              <div style={{ alignSelf: "center", fontSize: 11, color: "#E8A0A0", padding: "4px 0" }}>{error}</div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(201,169,97,0.1)", display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Elizabeth..."
              style={{
                flex: 1, padding: "10px 14px", fontSize: 13,
                background: "rgba(244,236,216,0.05)", border: "1px solid rgba(244,236,216,0.1)",
                borderRadius: 20, color: IVORY, outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: input.trim() ? GOLD : "rgba(201,169,97,0.2)",
                color: INK, border: "none", cursor: input.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
