import { useState } from "react";
import { useLocation } from "wouter";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";
import ElizabethChat from "@/components/ElizabethChat";
import IamherMobileNav from "@/components/IamherMobileNav";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

export default function FoundingAssessmentPage() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Founding Partnership | Sponsor The Woman Who Leads the Room | Event Perfekt",
    description: "Become a founding partner of The Woman Who Leads the Room — an invitation-only leadership evening, Milton Keynes, 30 October 2026. Position your brand alongside 100 women founders, executives, and leaders. Apply now.",
    keywords: "founding partner women's event UK, sponsor women's leadership event, brand partnership women in leadership, Event Perfekt founding partner, The Woman Who Leads the Room sponsorship, women founders event sponsorship UK 2026",
    url: "https://eventperfekt.net/iamher/partnership/founding-assessment",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Founding Partnership — Sponsor The Woman Who Leads the Room",
  });
  useVisitorTracking("/iamher/partnership/founding-assessment", "Founding Assessment · The Woman Who Leads the Room");

  const [, setLocation] = useLocation();
  const [f, setF] = useState({
    organisation: "", contact_name: "", contact_email: "", contact_phone: "",
    company_website: "", brand_vision: "", in_room_moment: "", framing_preferences: "",
    logo_url: "", brand_guidelines_url: "", additional_notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    trackFunnelEvent('form_start', '/iamher/partnership/founding-assessment', { action: 'founding_assessment' });
    try {
      const res = await fetch("/api/event-august/founding-assessment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      trackFunnelEvent('submit_success', '/iamher/partnership/founding-assessment', { action: 'founding_assessment' });
      setSuccess(true);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`@media (max-width: 520px) { .pm-logo { height: 44px !important; } .pm-card { padding: 36px 20px 48px !important; } }`}</style>

      <IamherMobileNav
        logo={eventPerfektLogo}
        links={[
          { label: "About", href: "/about-the-movement" },
          { label: "The Evening", href: "/iamher" },
          { label: "Apply for Your Invitation", href: "/access" },
          { label: "Partnership", href: "/iamher/partnership", active: true },
        ]}
      />

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <div className="pm-card" style={{ maxWidth: 640, width: "100%", padding: "48px 32px 56px" }}>

          {success ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: GOLD, fontSize: 16, margin: "0 0 12px", fontStyle: "italic" }}>Assessment submitted.</p>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: "0 0 28px" }}>
                Thank you. We have received your founding partnership assessment and will be in touch within 48 hours to discuss your branded moment in the room and next steps.
              </p>
              <button onClick={() => { trackFunnelEvent('cta_click', '/iamher/partnership/founding-assessment', { cta: 'back_to_partnership' }); setLocation("/iamher/partnership"); }} style={{
                display: "inline-block", padding: "14px 32px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                color: INK, background: GOLD, border: "none", cursor: "pointer", fontWeight: 500,
                transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif",
              }}>
                Return to Partnership →
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>Founding Partnership</p>
              <h1 style={{ fontSize: 28, fontWeight: 400, color: IVORY, margin: "0 0 8px", lineHeight: 1.15, letterSpacing: "-0.02em", fontStyle: "italic" }}>
                Partner Assessment
              </h1>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.92)", lineHeight: 1.6, margin: "0 0 36px", fontWeight: 300 }}>
                Before we confirm your £30,000 founding partnership, tell us how your organisation wants to show up in the room. We will shape your branded moment together.
              </p>

              <form onSubmit={submit} style={{ display: "grid", gap: 24 }}>
                <div>
                  <label style={labelStyle}>Organisation name <span style={{ color: "rgba(244,236,216,0.65)" }}>*</span></label>
                  <input style={inputStyle} value={f.organisation} onChange={e => setF(p => ({ ...p, organisation: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>Contact name <span style={{ color: "rgba(244,236,216,0.65)" }}>*</span></label>
                  <input style={inputStyle} value={f.contact_name} onChange={e => setF(p => ({ ...p, contact_name: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>Contact email <span style={{ color: "rgba(244,236,216,0.65)" }}>*</span></label>
                  <input type="email" style={inputStyle} value={f.contact_email} onChange={e => setF(p => ({ ...p, contact_email: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>Contact phone</label>
                  <input type="tel" style={inputStyle} value={f.contact_phone} onChange={e => setF(p => ({ ...p, contact_phone: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Company website</label>
                  <input type="url" style={inputStyle} placeholder="https://..." value={f.company_website} onChange={e => setF(p => ({ ...p, company_website: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Brand vision — how do you want to be seen in the room? <span style={{ color: "rgba(244,236,216,0.65)" }}>*</span></label>
                  <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "-4px 0 8px" }}>Describe what you want guests to feel and remember about your brand at this event.</p>
                  <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={f.brand_vision} onChange={e => setF(p => ({ ...p, brand_vision: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>In-room moment — what is your ideal activation? <span style={{ color: "rgba(244,236,216,0.65)" }}>*</span></label>
                  <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "-4px 0 8px" }}>Welcome speech, branded gift, photo opportunity, table display, something else?</p>
                  <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={f.in_room_moment} onChange={e => setF(p => ({ ...p, in_room_moment: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>Framing preferences — how should we describe your partnership?</label>
                  <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "-4px 0 8px" }}>Tagline, tone, any words you do or do not want us to use when introducing your brand.</p>
                  <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={f.framing_preferences} onChange={e => setF(p => ({ ...p, framing_preferences: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Logo URL (Google Drive, Dropbox, etc.)</label>
                  <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "-4px 0 8px" }}>Link to your company logo file (SVG, PNG, or AI preferred).</p>
                  <input type="url" style={inputStyle} value={f.logo_url} onChange={e => setF(p => ({ ...p, logo_url: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Brand guidelines URL</label>
                  <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "-4px 0 8px" }}>Link to brand book, style guide, or any visual identity documents.</p>
                  <input type="url" style={inputStyle} value={f.brand_guidelines_url} onChange={e => setF(p => ({ ...p, brand_guidelines_url: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Anything else we should know?</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.additional_notes} onChange={e => setF(p => ({ ...p, additional_notes: e.target.value }))} />
                </div>

                {error && <p style={{ color: "#E8A0A0", fontSize: 13 }}>{error}</p>}
                <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8 }}>
                  <button type="submit" disabled={loading} style={{
                    display: "inline-block", padding: "14px 32px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                    color: INK, background: GOLD, border: "none", cursor: "pointer", fontWeight: 500,
                    transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif", opacity: loading ? 0.6 : 1,
                  }}>
                    {loading ? "Submitting..." : "Submit Assessment →"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <footer style={{ padding: "20px 24px", textAlign: "center", borderTop: "1px solid rgba(244,236,216,0.08)" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.65)", letterSpacing: "0.1em" }}>
          Curated by Event Perfekt Global Ltd · Friday 30 October 2026 · Milton Keynes
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
      <ElizabethChat page="founding-assessment" />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "14px 0", fontSize: 15, background: "transparent", border: "none",
  borderBottom: "1px solid rgba(226,200,122,0.40)", borderRadius: 0, color: IVORY, outline: "none",
};
