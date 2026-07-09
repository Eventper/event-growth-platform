import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { getPortalToken, getPortalUser, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";
import { MessageCircle } from "lucide-react";

const BURGUNDY = "#3D0B0B";
const GOLD = "#C9A84C";
const CARD_BG = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.12)";
const TEXT = "#fff";
const MUTED = "rgba(255,255,255,0.6)";
const WHATSAPP_CHAT_URL = "https://api.whatsapp.com/send/?phone=447984331651&text=Hi%2C+I+have+a+question...";

export default function ClientPortalMessages() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const user = getPortalUser();

  const load = () =>
    portalFetch("GET", "/api/client-portal/messages")
      .then(d => { setMessages(Array.isArray(d) ? d : []); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); })
      .catch((e: any) => {
        if (e?.message?.includes("401") || e?.message?.includes("Unauthorised")) {
          clearPortalSession();
          setLocation("/client-portal/login");
        } else {
          setError("Unable to load messages right now.");
        }
      });

  useEffect(() => {
    const token = getPortalToken();
    if (!token) { setError("Please log in again."); setLoading(false); return; }
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    const msg = content.trim();
    if (!msg) return;
    setSending(true);
    setError("");
    try {
      await portalFetch("POST", "/api/client-portal/messages", { content: msg });
      setContent("");
      await load();
    } catch (e: any) { setError(e.message); }
    setSending(false);
  };

  if (loading) return <PortalLayout><div style={{ textAlign: "center", padding: "60px 0", color: TEXT }}>Loading messages...</div></PortalLayout>;

  return (
    <PortalLayout>
  <div style={{ marginBottom: 20 }}>
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Messages</h2>
    <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, margin: 0 }}>Communicate directly with your Event Perfekt project team</p>
      <a
        href={WHATSAPP_CHAT_URL}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 999,
          background: "#25D366",
          color: "#fff",
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        <MessageCircle size={16} />
        Chat on WhatsApp
      </a>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Thread */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px 10px 0 0", padding: 20, minHeight: 350, maxHeight: 480, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: MUTED, fontSize: 14, margin: "auto" }}>
              No messages yet. Send a message to start the conversation.
            </div>
          )}
          {(Array.isArray(messages) ? messages : []).map((m: any) => {
            const isClient = m.sender_type === "client";
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: isClient ? "row-reverse" : "row", gap: 10, alignItems: "flex-end" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: isClient ? BURGUNDY : "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: TEXT,
                  border: `1px solid ${isClient ? GOLD + "60" : BORDER}`,
                }}>
                  {m.sender_name?.charAt(0) || "?"}
                </div>
                <div style={{ maxWidth: "70%" }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 4, textAlign: isClient ? "right" : "left" }}>
                    {m.sender_name} · {new Date(m.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                  <div style={{
                    padding: "10px 14px",
                    background: isClient ? BURGUNDY : "rgba(255,255,255,0.12)",
                    color: TEXT,
                    borderRadius: isClient ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    fontSize: 14, lineHeight: 1.5,
                    border: `1px solid ${isClient ? GOLD + "40" : BORDER}`,
                  }}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 16 }}>
          {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message... (Enter to send)"
              rows={3}
              style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.07)", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, resize: "none", outline: "none", fontFamily: "Poppins, sans-serif", color: TEXT }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !content.trim()}
              style={{ padding: "0 22px", background: sending ? "rgba(255,255,255,0.2)" : GOLD, color: sending ? MUTED : "#1a0015", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", flexShrink: 0 }}
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
