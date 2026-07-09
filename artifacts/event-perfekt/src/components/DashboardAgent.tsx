import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, ChevronDown, Bot, User, Loader2, BarChart3, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const BRAND = "#330311";
const GOLD = "#C9A961";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

const QUICK_ACTIONS = [
  { icon: BarChart3, label: "Check my stats" },
  { icon: TrendingUp, label: "What's the funnel?" },
  { icon: AlertTriangle, label: "Why no LinkedIn?" },
  { icon: Lightbulb, label: "What should I post?" },
];

export default function DashboardAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Event Perfekt assistant. Ask me anything about your analytics, funnel, or what to fix right now.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/admin/marketing-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, history, days: 30 }),
      });

      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.response || "I'm not sure about that. Try asking about your analytics or funnel.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        role: "assistant",
        content: "Sorry, I couldn't connect right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (label: string) => {
    const prompts: Record<string, string> = {
      "Check my stats": "Give me a quick summary of my analytics for the last 30 days — sessions, captures, top pages, and countries.",
      "What's the funnel?": "Show me my I AM HER funnel conversion rates and tell me where the biggest drop-off is.",
      "Why no LinkedIn?": "Why is LinkedIn showing zero sessions in my analytics? How do I fix it?",
      "What should I post?": "What content should I post this week to drive more ticket sales for I AM HER? Include UTM tags.",
    };
    sendMessage(prompts[label] || label);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNew(false);
        }}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: BRAND,
          color: "#fff",
          border: `2px solid ${GOLD}`,
          boxShadow: "0 4px 20px rgba(51,3,17,0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s, box-shadow 0.2s",
          transform: isOpen ? "scale(0.9)" : "scale(1)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = isOpen ? "scale(0.95)" : "scale(1.08)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(51,3,17,0.5)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = isOpen ? "scale(0.9)" : "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(51,3,17,0.4)";
        }}
      >
        {isOpen ? (
          <ChevronDown style={{ width: 24, height: 24 }} />
        ) : (
          <>
            <Sparkles style={{ width: 24, height: 24 }} />
            {hasNew && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: GOLD,
                  border: "2px solid #fff",
                }}
              />
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            right: 24,
            width: 380,
            maxWidth: "calc(100vw - 48px)",
            height: 520,
            maxHeight: "calc(100vh - 120px)",
            zIndex: 9998,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
            border: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'Poppins', sans-serif",
            animation: "agentSlideIn 0.25s ease-out",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: BRAND,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot style={{ width: 18, height: 18, color: "#fff" }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2 }}>
                  EP Assistant
                </p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  Real-time analytics & help
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              background: "#fafafa",
            }}
          >
            {/* Quick actions */}
            {messages.length === 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => handleQuickAction(label)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                      fontWeight: 500,
                      color: BRAND,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = BRAND;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
                    }}
                  >
                    <Icon style={{ width: 14, height: 14, color: GOLD }} />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: msg.role === "assistant" ? BRAND : GOLD,
                    marginTop: 2,
                  }}
                >
                  {msg.role === "assistant" ? (
                    <Bot style={{ width: 14, height: 14, color: "#fff" }} />
                  ) : (
                    <User style={{ width: 14, height: 14, color: "#fff" }} />
                  )}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "calc(100% - 48px)",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "assistant" ? "#fff" : BRAND,
                    color: msg.role === "assistant" ? "#1f2937" : "#fff",
                    fontSize: 13,
                    lineHeight: 1.55,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    border: msg.role === "assistant" ? "1px solid #e5e7eb" : "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: BRAND,
                    marginTop: 2,
                  }}
                >
                  <Bot style={{ width: 14, height: 14, color: "#fff" }} />
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "14px 14px 14px 4px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    fontSize: 13,
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #e5e7eb",
              background: "#fff",
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask me anything..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                color: "#1f2937",
                background: "#fafafa",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = BRAND;
                e.currentTarget.style.background = "#fff";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.background = "#fafafa";
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: input.trim() && !isLoading ? BRAND : "#e5e7eb",
                color: input.trim() && !isLoading ? "#fff" : "#9ca3af",
                border: "none",
                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              <Send style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}

      {/* CSS animation for slide-in */}
      <style>{`
        @keyframes agentSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
