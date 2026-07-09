import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, Loader2, BarChart3, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";

const BRAND = "#330311";
const GOLD = "#C9A961";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

const QUICK_ACTIONS = [
  { icon: BarChart3, label: "Check stats" },
  { icon: TrendingUp, label: "Funnel issues" },
  { icon: AlertTriangle, label: "LinkedIn fix" },
  { icon: Lightbulb, label: "Post ideas" },
];

const CREATIVE_ACTIONS = [
  { icon: Lightbulb, label: "Big idea" },
  { icon: TrendingUp, label: "Funnel issues" },
  { icon: AlertTriangle, label: "LinkedIn fix" },
  { icon: BarChart3, label: "Check stats" },
];

interface InlineAgentProps {
  variant?: "default" | "creative-director";
}

export default function InlineAgent({ variant = "default" }: InlineAgentProps) {
  const isCreative = variant === "creative-director";
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: isCreative
        ? "Hi! I'm your Creative Director. Ask me anything about your campaign big idea, brand arc, emotional hooks, or funnel fixes."
        : "Hi! Ask me anything about your analytics or what to fix right now.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.response || "I'm not sure. Try asking about your analytics or funnel.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        role: "assistant",
        content: "Sorry, couldn't connect. Try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (label: string) => {
    const prompts: Record<string, string> = {
      "Check stats": "Give me a quick summary of my analytics for the last 30 days.",
      "Funnel issues": "Show me my funnel conversion rates and where the biggest drop-off is.",
      "LinkedIn fix": "Why is LinkedIn showing zero sessions? How do I fix it?",
      "Post ideas": "What content should I post this week to drive more ticket sales? Include UTM tags.",
      "Big idea": "What's the BIG IDEA for the I AM HER campaign? Give me a campaign concept that people will remember and talk about.",
    };
    sendMessage(prompts[label] || label);
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        height: 420,
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: BRAND,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles style={{ width: 15, height: 15, color: GOLD }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2 }}>
            {isCreative ? "Creative Director" : "EP Assistant"}
          </p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", margin: 0 }}>
            {isCreative ? "Creative brain of Coca-Cola, Nike, Apple" : "Ask anything about your data"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "#fafafa",
        }}
      >
        {/* Quick actions */}
        {messages.length === 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
            {(isCreative ? CREATIVE_ACTIONS : QUICK_ACTIONS).map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => handleQuickAction(label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 8px",
                  borderRadius: 6,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  fontSize: 10,
                  fontWeight: 500,
                  color: BRAND,
                  cursor: "pointer",
                }}
              >
                <Icon style={{ width: 12, height: 12, color: GOLD }} />
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
              gap: 8,
              alignItems: "flex-start",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
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
                <Bot style={{ width: 12, height: 12, color: "#fff" }} />
              ) : (
                <User style={{ width: 12, height: 12, color: "#fff" }} />
              )}
            </div>
            <div
              style={{
                maxWidth: "calc(100% - 36px)",
                padding: "8px 11px",
                borderRadius: msg.role === "user" ? "11px 11px 3px 11px" : "11px 11px 11px 3px",
                background: msg.role === "assistant" ? "#fff" : BRAND,
                color: msg.role === "assistant" ? "#1f2937" : "#fff",
                fontSize: 12,
                lineHeight: 1.5,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: BRAND,
                marginTop: 2,
              }}
            >
              <Bot style={{ width: 12, height: 12, color: "#fff" }} />
            </div>
            <div
              style={{
                padding: "8px 11px",
                borderRadius: "11px 11px 11px 3px",
                background: "#fff",
                border: "1px solid #e5e7eb",
                fontSize: 12,
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          gap: 8,
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
            padding: "8px 11px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 12,
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
            width: 32,
            height: 32,
            borderRadius: 8,
            background: input.trim() && !isLoading ? BRAND : "#e5e7eb",
            color: input.trim() && !isLoading ? "#fff" : "#9ca3af",
            border: "none",
            cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Send style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}
