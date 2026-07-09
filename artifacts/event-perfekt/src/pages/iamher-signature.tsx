import { useState } from "react";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";

const GOLD  = "#C9A961";
const IVORY = "#F4ECD8";
const INK = "#330311";

const SIGNATURE_HTML = `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:0;">
  <tr>
    <td style="padding:0 16px 0 0;border-right:2px solid #C9A961;vertical-align:middle;">
      <p style="margin:0 0 3px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#C9A961;">I AM HER</p>
      <p style="margin:0;font-size:10px;color:#888888;letter-spacing:0.08em;">The Woman Who Leads the Room</p>
    </td>
    <td style="padding:0 0 0 16px;vertical-align:middle;">
      <p style="margin:0 0 2px;font-size:11px;color:#333333;">30 October 2026 &nbsp;·&nbsp; Milton Keynes</p>
      <a href="https://eventperfekt.net/iamher" style="font-size:10px;color:#C9A961;text-decoration:none;letter-spacing:0.1em;">eventperfekt.net/iamher</a>
    </td>
  </tr>
</table>`;

const PLAIN_TEXT = `──────────────────────────────
I AM HER · The Woman Who Leads the Room
30 October 2026 · Milton Keynes
eventperfekt.net/iamher
──────────────────────────────`;

export default function IAmHerSignature() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Email Signature | I Am Her — The Woman Who Leads the Room",
    description: "Get your official I Am Her email signature. Let the world know you're part of the room. 30 October 2026, Milton Keynes.",
    url: "https://eventperfekt.net/iamher/signature",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Get your official I Am Her email signature",
  });
  useVisitorTracking("/iamher/signature", "Email Signature | I Am Her");
  const [copied, setCopied] = useState<"html" | "text" | null>(null);

  const copy = (type: "html" | "text") => {
    navigator.clipboard.writeText(type === "html" ? SIGNATURE_HTML : PLAIN_TEXT).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const label: React.CSSProperties = {
    fontSize: 10, color: "rgba(201,169,97,0.65)",
    letterSpacing: "0.26em", textTransform: "uppercase", margin: "0 0 12px", display: "block",
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .copy-btn:hover { border-color: rgba(201,169,97,0.80) !important; color: rgba(201,169,97,0.95) !important; }
      `}</style>

      {/* Header */}
      <header style={{ padding: "18px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(244,236,216,0.05)", maxWidth: 900, margin: "0 auto" }}>
        <a href="/iamher" onClick={() => trackFunnelEvent('cta_click', '/iamher/signature', { cta: 'back_to_evening' })} style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          The Woman Who Leads the Room
        </a>
        <a href="/iamher/card" onClick={() => trackFunnelEvent('cta_click', '/iamher/signature', { cta: 'create_card' })} style={{ fontSize: 10, color: GOLD, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Create Your Card →
        </a>
      </header>

      <div style={{ maxWidth: 660, margin: "0 auto", padding: "64px 36px 100px" }}>

        <div style={{ marginBottom: 60 }}>
          <div style={{ width: 40, height: 1, background: GOLD, marginBottom: 28 }} />
          <p style={{ fontSize: 10, color: "rgba(201,169,97,0.65)", letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 18px" }}>Email Signature</p>
          <h1 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(28px,4vw,42px)", color: IVORY, margin: "0 0 20px", lineHeight: 1.2 }}>
            Let every email announce your attendance.
          </h1>
          <p style={{ fontSize: 14, color: "rgba(244,236,216,0.65)", lineHeight: 1.9, margin: 0 }}>
            Add this to your email signature between now and 30 October. Every email you send becomes a quiet announcement — and a personal invitation to the women you correspond with.
          </p>
        </div>

        {/* Live preview */}
        <div style={{ marginBottom: 48 }}>
          <span style={label}>Preview</span>
          <div style={{ background: "#ffffff", padding: "28px 32px", borderRadius: 2 }}>
            <table cellPadding="0" cellSpacing="0" style={{ fontFamily: "Poppins, sans-serif", fontSize: 0 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "0 16px 0 0", borderRight: "2px solid #C9A961", verticalAlign: "middle" }}>
                    <p style={{ margin: "0 0 3px", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A961" }}>I AM HER</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#888888", letterSpacing: "0.08em" }}>The Woman Who Leads the Room</p>
                  </td>
                  <td style={{ padding: "0 0 0 16px", verticalAlign: "middle" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 11, color: "#333333" }}>30 October 2026 &nbsp;·&nbsp; Milton Keynes</p>
                    <a href="https://eventperfekt.net/iamher" style={{ fontSize: 10, color: "#C9A961", textDecoration: "none", letterSpacing: "0.1em" }}>eventperfekt.net/iamher</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "10px 0 0", letterSpacing: "0.06em" }}>
            This is how it appears in a recipient's inbox.
          </p>
        </div>

        {/* HTML copy */}
        <div style={{ marginBottom: 36, padding: "24px 28px", border: "1px solid rgba(201,169,97,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: IVORY, fontWeight: 500 }}>HTML version</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(244,236,216,0.55)", lineHeight: 1.6 }}>For Gmail, Outlook, Apple Mail and most email clients.</p>
            </div>
            <button
              className="copy-btn"
              onClick={() => copy("html")}
              style={{ flexShrink: 0, padding: "9px 20px", background: "transparent", border: "1px solid rgba(201,169,97,0.55)", color: "rgba(201,169,97,0.85)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "all 0.2s", whiteSpace: "nowrap" }}
            >
              {copied === "html" ? "Copied" : "Copy HTML"}
            </button>
          </div>
          <pre style={{ margin: 0, fontSize: 10, color: "rgba(244,236,216,0.55)", lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {SIGNATURE_HTML}
          </pre>
        </div>

        {/* Plain text copy */}
        <div style={{ marginBottom: 56, padding: "24px 28px", border: "1px solid rgba(201,169,97,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: IVORY, fontWeight: 500 }}>Plain text version</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(244,236,216,0.55)", lineHeight: 1.6 }}>For any client that doesn't support HTML signatures.</p>
            </div>
            <button
              className="copy-btn"
              onClick={() => copy("text")}
              style={{ flexShrink: 0, padding: "9px 20px", background: "transparent", border: "1px solid rgba(201,169,97,0.22)", color: "rgba(201,169,97,0.75)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "all 0.2s", whiteSpace: "nowrap" }}
            >
              {copied === "text" ? "Copied" : "Copy Text"}
            </button>
          </div>
          <pre style={{ margin: 0, fontSize: 11, color: "rgba(244,236,216,0.65)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {PLAIN_TEXT}
          </pre>
        </div>

        {/* How-to instructions */}
        <div>
          <span style={label}>How to add this to your email</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { client: "Gmail", steps: "Settings → See all settings → General → Signature → Create new → paste HTML using the source code view (⟨⟩ icon)" },
              { client: "Apple Mail", steps: "Mail → Settings → Signatures → + → paste the HTML text" },
              { client: "Outlook", steps: "File → Options → Mail → Signatures → New → paste into the editor" },
            ].map(({ client, steps }) => (
              <div key={client} style={{ padding: "16px 20px", border: "1px solid rgba(244,236,216,0.05)" }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, color: GOLD, letterSpacing: "0.1em" }}>{client}</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(244,236,216,0.75)", lineHeight: 1.7 }}>{steps}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <footer style={{ borderTop: "1px solid rgba(244,236,216,0.04)", padding: "24px 36px", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.1)", letterSpacing: "0.08em", margin: 0 }}>
          Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG
        </p>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "8px 0 0", letterSpacing: "0.06em" }}>
          <a href="/privacy-policy" style={{ color: "rgba(244,236,216,0.75)", textDecoration: "none" }}>Privacy Policy</a>
          {" · "}
          <a href="mailto:info@eventperfekt.com?subject=Data%20Rights%20Request" style={{ color: "rgba(244,236,216,0.75)", textDecoration: "none" }}>Your Data Rights</a>
          {" · "}
          <a href="mailto:info@eventperfekt.com" style={{ color: "rgba(244,236,216,0.75)", textDecoration: "none" }}>Contact</a>
          {" · "}
          <a href="https://www.instagram.com/eventperfektcom/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(244,236,216,0.75)", textDecoration: "none" }}>Follow on Instagram</a>
          {" · "}
          <a href="https://www.linkedin.com/company/105660018/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(244,236,216,0.75)", textDecoration: "none" }}>Follow on LinkedIn</a>
        </p>
      </footer>
    </div>
  );
}
