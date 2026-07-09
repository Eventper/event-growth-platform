import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useVisitorTracking, getStoredUtm, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import ElizabethChat from "@/components/ElizabethChat";
import IamherMobileNav from "@/components/IamherMobileNav";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import EmailCapturePopup from "@/components/EmailCapturePopup";

const INK = "#330311";
const GOLD = "#C9A961";
const GOLD_SOFT = "rgba(201,169,97,0.90)";
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

function MediaConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ marginTop: 24, padding: "20px", border: "1px solid rgba(201,169,97,0.15)", background: "rgba(201,169,97,0.06)" }}>
      <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", lineHeight: 1.7, margin: "0 0 16px" }}>
        <em style={{ color: GOLD, fontStyle: "italic" }}>The Woman Who Leads the Room</em> is designed as an editorial-style experience. Photography and video content may be captured for editorial, promotional, event, and social media purposes across Event Perfekt Global and selected partner platforms. By submitting this form, you confirm your consent to be photographed and featured.
      </p>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <input type="checkbox" id="media-consent" checked={checked} onChange={e => onChange(e.target.checked)} required
          style={{ marginTop: 2, width: 14, height: 14, accentColor: GOLD, flexShrink: 0 }} />
        <label htmlFor="media-consent" style={{ fontSize: 12, color: "rgba(244,236,216,0.92)", lineHeight: 1.6, cursor: "pointer" }}>
          I consent to photography and video as described above.
        </label>
      </div>
    </div>
  );
}

/* ─── Option A — Paid Invitation Access ─── */
function PaidForm({ onBack }: { onBack: () => void }) {
  const [f, setF] = useState({
    full_name: "", email: "",
    social_handle: "", business_role: "",
    why_attend: "", stay_interest: "",
    referral_source: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [, setLocation] = useLocation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const [first_name, last_name] = f.full_name.trim().split(" ").length > 1
        ? [f.full_name.trim().split(" ")[0], f.full_name.trim().split(" ").slice(1).join(" ")]
        : [f.full_name.trim(), ""];
      const res = await fetch("/api/event-august/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name, last_name,
          email: f.email,
          role: f.business_role,
          company: f.business_role,
          linkedin: f.social_handle,
          attendance_reason: f.why_attend,
          social_handle: f.social_handle,
          why_attend: f.why_attend,
          stay_interest: f.stay_interest,
          consent_marketing: true,
          access_type: "paid",
          source: "iamher_access",
          referral_source: f.referral_source,
          ...getStoredUtm(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setSuccess(true);
      trackFunnelEvent('form_complete', '/access', { option: 'paid', step: 'submit' });
      trackFunnelEvent('submit_success', '/access', { option: 'paid', id: data.id });
      setTimeout(() => setLocation("/access/payment"), 2000);
    } catch (err: any) {
      setError(err.message);
      trackFunnelEvent('submit_error', '/access', { option: 'paid', error: err.message || 'unknown' });
    }
    setLoading(false);
  };

  if (success) return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <p style={{ color: GOLD, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Thank you</p>
      <p style={{ fontSize: 15, color: IVORY, lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>
        Thank you for applying. Your formal invitation and full event details will follow upon confirmation.
      </p>
      <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", marginTop: 16 }}>Redirecting to payment…</p>
    </div>
  );

  return (
    <>
      <button onClick={onBack} style={{ background: "none", border: "none", color: GOLD, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", marginBottom: 28, display: "flex", alignItems: "center", gap: 6 }}>
        ← Back to options
      </button>
      <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 8px" }}>Option A</p>
      <h2 style={{ fontSize: 22, fontWeight: 400, color: IVORY, margin: "0 0 6px", fontStyle: "italic" }}>Paid Invitation Access</h2>
      <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", margin: "0 0 32px", lineHeight: 1.6 }}>
        Complete your invitation request. We review every application individually.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 24 }}>
        <Field label="Full Name" required><input style={inputBase} value={f.full_name} onChange={e => setF(p => ({ ...p, full_name: e.target.value }))} required /></Field>
        <Field label="Email" required><input style={inputBase} type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} required /></Field>
        <Field label="Instagram or LinkedIn"><input style={inputBase} value={f.social_handle} onChange={e => setF(p => ({ ...p, social_handle: e.target.value }))} placeholder="@handle or linkedin.com/in/..." /></Field>
        <Field label="Business / Role" required><input style={inputBase} value={f.business_role} onChange={e => setF(p => ({ ...p, business_role: e.target.value }))} placeholder="What you lead and where" required /></Field>
        <Field label="Why do you want to attend? (optional)"><textarea style={{ ...inputBase, minHeight: 80, resize: "vertical" }} value={f.why_attend} onChange={e => setF(p => ({ ...p, why_attend: e.target.value }))} placeholder="What draws you to this evening?" /></Field>
        <Field label="Interested in the weekend stay? (optional)">
          <select style={inputBase} value={f.stay_interest} onChange={e => setF(p => ({ ...p, stay_interest: e.target.value }))}>
            <option value="" style={{ background: "#1a0a0e" }}>Select…</option>
            <option value="yes" style={{ background: "#1a0a0e" }}>Yes — I'd like to stay the weekend</option>
            <option value="maybe" style={{ background: "#1a0a0e" }}>Maybe — exploring it</option>
            <option value="no" style={{ background: "#1a0a0e" }}>No — just the evening</option>
          </select>
        </Field>
        <Field label="How did you hear about us? (optional)">
          <select style={inputBase} value={f.referral_source} onChange={e => setF(p => ({ ...p, referral_source: e.target.value }))}>
            <option value="" style={{ background: "#1a0a0e" }}>Select…</option>
            <option value="instagram" style={{ background: "#1a0a0e" }}>Instagram</option>
            <option value="linkedin" style={{ background: "#1a0a0e" }}>LinkedIn</option>
            <option value="friend" style={{ background: "#1a0a0e" }}>Friend / Word of mouth</option>
            <option value="dr_sarah_esther" style={{ background: "#1a0a0e" }}>Dr Sarah / Esther</option>
            <option value="mkfm" style={{ background: "#1a0a0e" }}>MKFM</option>
            <option value="email" style={{ background: "#1a0a0e" }}>Email</option>
            <option value="other" style={{ background: "#1a0a0e" }}>Other</option>
          </select>
        </Field>

        {error && <p style={{ color: "#ef9999", fontSize: 13, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{
          marginTop: 8, padding: "16px 28px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
          color: GOLD, background: "transparent", border: `1px solid ${GOLD}`, borderRadius: 0,
          cursor: "pointer", fontWeight: 500, transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif",
          opacity: loading ? 0.5 : 1,
        }}>
          {loading ? "Submitting…" : "Request Your Invitation"}
        </button>
      </form>
    </>
  );
}

/* ─── Option B — Complimentary Invitation (minimal) ─── */
function ComplimentaryForm({ onBack }: { onBack: () => void }) {
  const [f, setF] = useState({
    full_name: "", email: "",
    social_handle: "", business_role: "",
    why_attend: "", nominator_name: "",
    referral_source: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const [first_name, last_name] = f.full_name.trim().split(" ").length > 1
        ? [f.full_name.trim().split(" ")[0], f.full_name.trim().split(" ").slice(1).join(" ")]
        : [f.full_name.trim(), ""];
      const res = await fetch("/api/event-august/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name, last_name, email: f.email,
          role: f.business_role,
          company: f.business_role,
          linkedin: f.social_handle,
          attendance_reason: f.why_attend,
          social_handle: f.social_handle,
          why_attend: f.why_attend,
          nominator_name: f.nominator_name,
          consent_marketing: true, access_type: "complimentary",
          source: "iamher_access",
          referral_source: f.referral_source,
          ...getStoredUtm(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setSuccess(true);
      trackFunnelEvent('form_complete', '/access', { option: 'complimentary', step: 'submit' });
      trackFunnelEvent('submit_success', '/access', { option: 'complimentary', id: data.id });
    } catch (err: any) {
      setError(err.message);
      trackFunnelEvent('submit_error', '/access', { option: 'complimentary', error: err.message || 'unknown' });
    }
    setLoading(false);
  };

  if (success) return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <p style={{ color: GOLD, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Thank you</p>
      <p style={{ fontSize: 15, color: IVORY, lineHeight: 1.7, maxWidth: 440, margin: "0 auto" }}>
        We review complimentary applications carefully and will be in touch by 31 July 2026.
      </p>
    </div>
  );

  return (
    <>
      <button onClick={onBack} style={{ background: "none", border: "none", color: GOLD, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", marginBottom: 28, display: "flex", alignItems: "center", gap: 6 }}>
        ← Back to options
      </button>
      <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 8px" }}>Option B</p>
      <h2 style={{ fontSize: 22, fontWeight: 400, color: IVORY, margin: "0 0 6px", fontStyle: "italic" }}>Complimentary Invitation Consideration</h2>
      <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", margin: "0 0 32px", lineHeight: 1.6 }}>
        Complimentary invitations are awarded selectively. Tell us why you belong in this room.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 24 }}>
        <Field label="Full Name" required><input style={inputBase} value={f.full_name} onChange={e => setF(p => ({ ...p, full_name: e.target.value }))} required /></Field>
        <Field label="Email" required><input style={inputBase} type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} required /></Field>
        <Field label="Instagram or LinkedIn"><input style={inputBase} value={f.social_handle} onChange={e => setF(p => ({ ...p, social_handle: e.target.value }))} placeholder="@handle or linkedin.com/in/..." /></Field>
        <Field label="Business / Role" required><input style={inputBase} value={f.business_role} onChange={e => setF(p => ({ ...p, business_role: e.target.value }))} placeholder="What you lead and where" required /></Field>
        <Field label="Why do you want to attend? (optional)"><textarea style={{ ...inputBase, minHeight: 80, resize: "vertical" }} value={f.why_attend} onChange={e => setF(p => ({ ...p, why_attend: e.target.value }))} placeholder="What draws you to this evening?" /></Field>
        <Field label="Nominated by (optional)"><input style={inputBase} value={f.nominator_name} onChange={e => setF(p => ({ ...p, nominator_name: e.target.value }))} placeholder="Name of the woman who invited you" /></Field>
        <Field label="How did you hear about us? (optional)">
          <select style={inputBase} value={f.referral_source} onChange={e => setF(p => ({ ...p, referral_source: e.target.value }))}>
            <option value="" style={{ background: "#1a0a0e" }}>Select…</option>
            <option value="instagram" style={{ background: "#1a0a0e" }}>Instagram</option>
            <option value="linkedin" style={{ background: "#1a0a0e" }}>LinkedIn</option>
            <option value="friend" style={{ background: "#1a0a0e" }}>Friend / Word of mouth</option>
            <option value="dr_sarah_esther" style={{ background: "#1a0a0e" }}>Dr Sarah / Esther</option>
            <option value="mkfm" style={{ background: "#1a0a0e" }}>MKFM</option>
            <option value="email" style={{ background: "#1a0a0e" }}>Email</option>
            <option value="other" style={{ background: "#1a0a0e" }}>Other</option>
          </select>
        </Field>

        {error && <p style={{ color: "#ef9999", fontSize: 13, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{
          marginTop: 8, padding: "16px 28px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
          color: GOLD, background: "transparent", border: `1px solid ${GOLD}`, borderRadius: 0,
          cursor: "pointer", fontWeight: 500, transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif",
          opacity: loading ? 0.5 : 1,
        }}>
          {loading ? "Submitting…" : "Request Your Invitation"}
        </button>
      </form>
    </>
  );
}

/* ─── Main Page ─── */
export default function AccessPage() {
  usePageSEO({
    title: "Apply for Your Invitation | The Woman Who Leads the Room | 30 October 2026",
    description: "Apply for your invitation to The Woman Who Leads the Room — an invitation-only leadership evening for founders, executives, and women who lead. Milton Keynes, Friday 30 October 2026. Curated by Event Perfekt. Limited to 100 invited women.",
    keywords: "request invitation women's event UK, women's leadership event 2026 tickets, founders event invitation Milton Keynes, female executives event UK, I Am Her event access, The Woman Who Leads the Room invitation, women in leadership dinner UK, luxury women's event 2026 register",
    url: "https://eventperfekt.net/access",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Apply for your invitation to The Woman Who Leads the Room — 30 October 2026, Milton Keynes",
    ogType: "event",
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "Event",
      "name": "The Woman Who Leads the Room",
      "alternateName": "I Am Her",
      "startDate": "2026-10-30T18:00:00+01:00",
      "endDate": "2026-10-30T23:00:00+01:00",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
      "location": {
        "@type": "Place",
        "name": "Milton Keynes, Buckinghamshire, UK",
        "address": { "@type": "PostalAddress", "addressLocality": "Milton Keynes", "addressRegion": "Buckinghamshire", "addressCountry": "GB" },
      },
      "image": "https://eventperfekt.net/assets/iamher-hero-home.png",
      "description": "Apply for your invitation to a private, invitation-only evening for accomplished women.",
      "offers": {
        "@type": "Offer",
        "url": "https://eventperfekt.net/access",
        "price": "300",
        "priceCurrency": "GBP",
        "availability": "https://schema.org/InStock",
        "validFrom": "2026-05-01",
      },
      "organizer": {
        "@type": "Organization",
        "name": "Event Perfekt Global Ltd",
        "url": "https://eventperfekt.net",
        "logo": "https://eventperfekt.net/assets/3d_Logo_1772145137902.jpg",
      },
    }],
  });
  useVisitorTracking("/access", "Apply for Your Invitation | The Woman Who Leads the Room");

  useEffect(() => {
    trackFunnelEvent('form_view', '/access', { step: 'landing' });
  }, []);

  const [option, setOption] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .ip-serif { font-family: 'Poppins', sans-serif; }
        .ip-italic { font-family: 'Poppins', sans-serif; font-style: italic; }
        input::placeholder, textarea::placeholder { color: rgba(244,236,216,0.45); }
        input:focus, textarea:focus { border-bottom-color: ${GOLD} !important; }
        @media (max-width: 520px) {
          .ac-logo { height: 44px !important; }
          .ac-title { font-size: 26px !important; }
          .ac-card { padding: 36px 20px 48px !important; }
        }
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
        <div className="ac-card" style={{ maxWidth: 560, width: "100%", padding: "48px 32px 56px" }}>

          {option === null && (
            <>
              <h1 className="ac-title ip-serif" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, color: IVORY, margin: "0 0 4px", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
                The Woman Who Leads the Room
              </h1>
              <p className="ip-italic" style={{ fontSize: 18, color: GOLD_SOFT, margin: "0 0 8px", fontStyle: "italic", fontFamily: "Poppins, sans-serif" }}>
                I Am Her.
              </p>
              <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 24px", fontWeight: 500 }}>
                Friday 30 October 2026 · Milton Keynes
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 400, color: IVORY, margin: "0 0 8px", fontStyle: "italic" }}>
                Apply for Your Invitation
              </h2>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.92)", lineHeight: 1.6, margin: "0 0 40px", fontWeight: 300 }}>
                A luxury leadership wellbeing experience for founders, executives, and women who lead.
              </p>

              <div style={{ marginBottom: 32, padding: "0 0 8px", borderBottom: "1px solid rgba(201,169,97,0.10)" }}>
                <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>
                  Why Apply for Your Invitation?
                </p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: "0 0 12px", fontWeight: 300 }}>
                  <em style={{ color: GOLD, fontStyle: "italic" }}>The Woman Who Leads the Room</em> is intentionally curated.
                </p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
                  Attendance is limited to preserve the quality of the room, the conversations, and the experience. Every guest is reviewed individually to ensure the evening remains aligned with its purpose.
                </p>
              </div>

              <div style={{ display: "grid", gap: 20 }}>
                <button onClick={() => { setOption("paid"); trackFunnelEvent('cta_click', '/access', { cta: 'choose_paid' }); trackFunnelEvent('form_start', '/access', { option: 'paid' }); }} style={{
                  padding: "28px 24px", textAlign: "left", background: "rgba(201,169,97,0.06)",
                  border: "1px solid rgba(201,169,97,0.10)", borderRadius: 0, cursor: "pointer",
                  transition: "all 0.3s ease", color: IVORY, fontFamily: "Poppins, sans-serif",
                }} onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(201,169,97,0.08)"; (e.target as HTMLElement).style.borderColor = "rgba(201,169,97,0.35)"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(201,169,97,0.06)"; (e.target as HTMLElement).style.borderColor = "rgba(201,169,97,0.10)"; }}>
                  <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 8px" }}>Option A</p>
                  <p style={{ fontSize: 17, fontWeight: 400, margin: "0 0 6px" }}>Paid Invitation Access</p>
                  <p style={{ fontSize: 13, color: "rgba(244,236,216,0.95)", margin: 0, lineHeight: 1.5 }}>I would like to request invitation access to the evening — £300 guest contribution (plus VAT)</p>
                </button>

                <button onClick={() => { setOption("complimentary"); trackFunnelEvent('cta_click', '/access', { cta: 'choose_complimentary' }); trackFunnelEvent('form_start', '/access', { option: 'complimentary' }); }} style={{
                  padding: "28px 24px", textAlign: "left", background: "transparent",
                  border: "1px solid rgba(244,236,216,0.12)", borderRadius: 0, cursor: "pointer",
                  transition: "all 0.3s ease", color: IVORY, fontFamily: "Poppins, sans-serif",
                }} onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(244,236,216,0.06)"; (e.target as HTMLElement).style.borderColor = "rgba(244,236,216,0.30)"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; (e.target as HTMLElement).style.borderColor = "rgba(244,236,216,0.12)"; }}>
                  <p style={{ color: "rgba(244,236,216,0.95)", fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 8px" }}>Option B</p>
                  <p style={{ fontSize: 17, fontWeight: 400, margin: "0 0 6px" }}>Complimentary Invitation Consideration</p>
                  <p style={{ fontSize: 13, color: "rgba(244,236,216,0.95)", margin: 0, lineHeight: 1.5 }}>I would like to be considered for a complimentary invitation</p>
                </button>
              </div>

              <div style={{ marginTop: 40, padding: "24px 24px", borderTop: "1px solid rgba(201,169,97,0.10)" }}>
                <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>
                  What the Evening Includes
                </p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: "0 0 20px", fontWeight: 300 }}>
                  For each guest, the evening includes:
                </p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.95)", lineHeight: 1.9, margin: 0 }}>
                  Wining and dining at a premium Milton Keynes venue, music and atmosphere, wellbeing and aesthetic touchpoints from leading specialists, a considered goody bag, an editorial feature in the I Am Her pre-event campaign, editorial photography of the evening, and a seat in a curated room of 100 women who lead.
                </p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: "16px 0 0", fontStyle: "italic" }}>
                  Complimentary invitations are awarded with the same care. Every woman in the room — regardless of route — is intentionally invited.
                </p>
              </div>

              <div style={{ marginTop: 40, padding: "24px 24px", borderTop: "1px solid rgba(201,169,97,0.10)" }}>
                <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>
                  I Am Her — The Campaign
                </p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
                  Every woman in the room has a story. The I Am Her campaign celebrates the founders, executives, professionals, creators, and changemakers behind the titles — giving visibility to the women and businesses shaping our communities.
                </p>
              </div>

              <div style={{ marginTop: 40, padding: "24px 24px", borderTop: "1px solid rgba(201,169,97,0.10)" }}>
                <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>
                  For Organisations
                </p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: "0 0 12px", fontWeight: 300 }}>
                  Many organisations invest in leadership development, coaching, inclusion, and wellbeing.
                </p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: "0 0 20px", fontWeight: 300 }}>
                  <em style={{ color: GOLD, fontStyle: "italic" }}>The Woman Who Leads the Room</em> complements those investments through a premium experience centred on peer connection, cross-industry perspective, and recognition for the women who lead.
                </p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: "0 0 20px", fontWeight: 300 }}>
                  Corporate invitation opportunities are available for organisations wishing to recognise, reward, and invest in the women leading within their organisation.
                </p>
                <a href="mailto:hello@eventperfekt.net?subject=Corporate%20Invitation%20Enquiry%20-%20The%20Woman%20Who%20Leads%20the%20Room" style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: GOLD, textDecoration: "none", border: `1px solid ${GOLD}`, padding: "14px 24px", display: "inline-block", transition: "all 0.3s ease" }}>
                  Enquire About Corporate Invitations
                </a>
              </div>

              <div style={{ marginTop: 40, padding: "24px 24px", borderTop: "1px solid rgba(201,169,97,0.10)" }}>
                <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>
                  Frequently Asked Questions
                </p>
                <div style={{ display: "grid", gap: 20 }}>
                  <div>
                    <p style={{ fontSize: 14, color: IVORY, fontWeight: 500, margin: "0 0 6px" }}>
                      Why is attendance curated?
                    </p>
                    <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: 0 }}>
                      Because the experience is intentionally designed around the quality of the room rather than the size of the audience. Every guest is reviewed to ensure the evening remains aligned with its purpose and atmosphere.
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: IVORY, fontWeight: 500, margin: "0 0 6px" }}>
                      Can organisations nominate women from their teams?
                    </p>
                    <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: 0 }}>
                      Yes. Organisations may nominate employees, executives, founders, and leaders for invitation consideration. Corporate invitation opportunities are available for aligned organisations.
                    </p>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", marginTop: 28, textAlign: "center", lineHeight: 1.6 }}>
                Each request is reviewed. Attendance is confirmed after review.
              </p>
            </>
          )}

          {option === "paid" && <PaidForm onBack={() => setOption(null)} />}
          {option === "complimentary" && <ComplimentaryForm onBack={() => setOption(null)} />}
        </div>
      </div>

      <footer style={{ padding: "20px 24px", textAlign: "center", borderTop: "1px solid rgba(244,236,216,0.08)" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.65)", letterSpacing: "0.1em" }}>
          Curated by Event Perfekt Global Ltd · Friday 30 October 2026 · Milton Keynes
        </p>
      </footer>
      <ElizabethChat page="access" />

      <EmailCapturePopup
        page="/access"
        variant="iamher"
        delayMs={12000}
        storageKey="ep_access_email"
        headline="Not ready to request your place? Leave your email and enter the draw."
        subheadline="You'll be entered to win a complimentary invitation or a professional editorial portrait. One lucky woman on our list. Draw is live."
        offer="Win: a complimentary invitation or a professional editorial portrait."
        cta="Enter my email"
        gift="complimentary invitation or editorial portrait"
      />
    </div>
  );
}
