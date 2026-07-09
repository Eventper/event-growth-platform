import { useState } from "react";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";
import ElizabethChat from "@/components/ElizabethChat";
import IamherMobileNav from "@/components/IamherMobileNav";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

const inputBase: React.CSSProperties = {
  width: "100%", padding: "14px 0", fontSize: 15, fontFamily: "Poppins, sans-serif",
  background: "transparent", border: "none", borderBottom: "1px solid rgba(244,236,216,0.30)",
  borderRadius: 0, color: IVORY, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, color: "rgba(244,236,216,0.85)",
  letterSpacing: "0.22em", textTransform: "uppercase", display: "block", marginBottom: 4,
};

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: "rgba(244,236,216,0.85)", marginLeft: 4 }}>·</span>}</label>
      {children}
    </div>
  );
}

export default function IAmHerFeature() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "I Am Her — The Campaign | Be Featured | The Woman Who Leads the Room",
    description: "The I Am Her campaign celebrates the founders, executives, professionals, and changemakers behind the titles. Get featured across Event Perfekt's editorial platforms ahead of the 30 October 2026 evening.",
    keywords: "I Am Her campaign, women in leadership editorial UK, female founder spotlight, women executives feature, I Am Her story, Event Perfekt campaign, women who lead editorial, women founders featured UK media",
    url: "https://eventperfekt.net/iamher/feature",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "I Am Her Campaign — Be featured across Event Perfekt's editorial platforms",
  });
  useVisitorTracking("/iamher/feature", "I Am Her Campaign · The Woman Who Leads the Room");
  const [f, setF] = useState({
    full_name: "", job_title: "", business: "", website: "",
    statement: "", short_bio: "", photo: null as File | null,
    consent_featured: false, consent_photo_rights: false,
  });
  const [showGuidance, setShowGuidance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setF(p => ({ ...p, photo: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(f).forEach(([k, v]) => {
        if (v !== null && v !== undefined) formData.append(k, v instanceof File ? v : String(v));
      });
      const res = await fetch("/api/event-august/feature", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setSuccess(true);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(244,236,216,0.45); }
        input:focus, textarea:focus { border-bottom-color: ${GOLD} !important; }
        @media (max-width: 520px) { .ft-logo { height: 44px !important; } .ft-card { padding: 36px 20px 48px !important; } }
      `}</style>

      <IamherMobileNav
        logo={eventPerfektLogo}
        links={[
          { label: "About", href: "/about-the-movement" },
          { label: "The Evening", href: "/iamher" },
          { label: "Apply for Your Invitation", href: "/access", active: true },
        ]}
      />

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <div className="ft-card" style={{ maxWidth: 600, width: "100%", padding: "48px 32px 56px" }}>

          {!success ? (
            <>
              <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px" }}>Confirmed Guests Only</p>
              <h1 style={{ fontSize: 28, fontWeight: 400, color: IVORY, margin: "0 0 8px", lineHeight: 1.15, letterSpacing: "-0.02em", fontStyle: "italic" }}>
                Your I Am Her Feature
              </h1>
              <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: "0 0 32px" }}>
                Welcome. You have your invitation. Now we invite you into the I Am Her campaign — an editorial moment in the weeks before the evening itself.
              </p>
              <p style={{ fontSize: 13, color: "rgba(244,236,216,0.95)", lineHeight: 1.7, margin: "0 0 36px" }}>
                Your feature will be published across <em>The Woman Who Leads the Room</em>, Event Perfekt Global, and shared for you to repost across your own platforms — alongside the other women in the room.
              </p>

              <form onSubmit={submit} style={{ display: "grid", gap: 24 }}>
                <Field label="Full name (as you wish to be credited)" required>
                  <input style={inputBase} value={f.full_name} onChange={e => setF(p => ({ ...p, full_name: e.target.value }))} required />
                </Field>
                <Field label="Job title / role" required>
                  <input style={inputBase} value={f.job_title} onChange={e => setF(p => ({ ...p, job_title: e.target.value }))} required />
                </Field>
                <Field label="Business or organisation" required>
                  <input style={inputBase} value={f.business} onChange={e => setF(p => ({ ...p, business: e.target.value }))} required />
                </Field>
                <Field label="Website / LinkedIn / social handle (for tagging)" required>
                  <input style={inputBase} value={f.website} onChange={e => setF(p => ({ ...p, website: e.target.value }))} required />
                </Field>
                <Field label="Your I Am Her statement" required>
                  <textarea style={{ ...inputBase, minHeight: 80, resize: "vertical" }}
                    placeholder='Examples: "I am the founder of...", "I am the woman who leads my boardroom.", "I am HER."'
                    value={f.statement} onChange={e => setF(p => ({ ...p, statement: e.target.value }))} required />
                </Field>
                <Field label="Short bio (optional, for longer-form features)">
                  <textarea style={{ ...inputBase, minHeight: 60, resize: "vertical" }}
                    value={f.short_bio} onChange={e => setF(p => ({ ...p, short_bio: e.target.value }))} />
                </Field>

                {/* Photo upload */}
                <div style={{ marginTop: 8 }}>
                  <Field label="Upload your photograph" required>
                    <div style={{ marginTop: 8 }}>
                      <input type="file" accept="image/*" onChange={handlePhoto} style={{ color: "rgba(244,236,216,0.95)", fontSize: 13 }} />
                    </div>
                  </Field>
                  {previewUrl && (
                    <div style={{ marginTop: 12, width: "100%", maxHeight: 200, overflow: "hidden", border: "1px solid rgba(201,169,97,0.10)" }}>
                      <img src={previewUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <button type="button" onClick={() => setShowGuidance(true)} style={{
                    background: "none", border: "none", color: GOLD, fontSize: 11, cursor: "pointer",
                    marginTop: 8, textDecoration: "underline", letterSpacing: "0.05em",
                  }}>
                    Photography guidance →
                  </button>
                </div>

                {/* Consent checkboxes */}
                <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <input type="checkbox" id="consent-featured" checked={f.consent_featured} onChange={e => setF(p => ({ ...p, consent_featured: e.target.checked }))} required
                      style={{ marginTop: 2, width: 14, height: 14, accentColor: GOLD, flexShrink: 0 }} />
                    <label htmlFor="consent-featured" style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", lineHeight: 1.6, cursor: "pointer" }}>
                      I consent to my name, business, and image being featured across <em>The Woman Who Leads the Room</em>, Event Perfekt Global, and selected partner platforms as part of the I Am Her editorial campaign.
                    </label>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <input type="checkbox" id="consent-photo" checked={f.consent_photo_rights} onChange={e => setF(p => ({ ...p, consent_photo_rights: e.target.checked }))} required
                      style={{ marginTop: 2, width: 14, height: 14, accentColor: GOLD, flexShrink: 0 }} />
                    <label htmlFor="consent-photo" style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", lineHeight: 1.6, cursor: "pointer" }}>
                      I confirm the photograph I am submitting is mine to share, or that I have rights to use it.
                    </label>
                  </div>
                </div>

                {error && <p style={{ color: "#ef9999", fontSize: 13, margin: 0 }}>{error}</p>}

                <button type="submit" disabled={loading} style={{
                  marginTop: 12, padding: "16px 28px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                  color: GOLD, background: "transparent", border: `1px solid ${GOLD}`, borderRadius: 0,
                  cursor: "pointer", fontWeight: 500, transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif",
                  opacity: loading ? 0.5 : 1,
                }}>
                  {loading ? "Submitting…" : "Submit My Feature"}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ color: GOLD, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>Thank you</p>
              <p style={{ fontSize: 15, color: IVORY, lineHeight: 1.8, maxWidth: 480, margin: "0 auto" }}>
                Your feature will be curated and shared in the weeks leading up to 30 October. You will receive your dedicated post for your own platforms — designed for you to share alongside the other women in the room.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Photography Guidance Modal */}
      {showGuidance && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowGuidance(false)}>
          <div style={{ maxWidth: 520, width: "100%", background: INK, border: `1px solid ${GOLD}`, padding: "40px 32px" }} onClick={e => e.stopPropagation()}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px" }}>Photography Guidance</p>
            <h3 style={{ fontSize: 20, fontWeight: 400, color: IVORY, margin: "0 0 20px", fontStyle: "italic" }}>For your I Am Her feature</h3>
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.92)", lineHeight: 1.8, margin: "0 0 24px" }}>
              A high-resolution editorial portrait (minimum 2000px wide), landscape orientation preferred, professional quality with natural lighting and a considered background. One image that represents you as the woman you are now.
            </p>
            <p style={{ fontSize: 12, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: "0 0 20px" }}>
              If you would like support with your portrait for the campaign, please email <a href="mailto:info@eventperfekt.com" style={{ color: GOLD, textDecoration: "none" }}>info@eventperfekt.com</a> and we will assist you directly.
            </p>
            <button onClick={() => setShowGuidance(false)} style={{
              padding: "12px 24px", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
              color: GOLD, background: "transparent", border: `1px solid ${GOLD}`, cursor: "pointer",
            }}>Close</button>
          </div>
        </div>
      )}

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
      <ElizabethChat page="feature" />
    </div>
  );
}
