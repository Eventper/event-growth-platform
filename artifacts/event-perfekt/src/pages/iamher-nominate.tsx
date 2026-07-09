import { useState } from "react";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";

const BURGUNDY = "#330311";
const GOLD     = "#C9A961";
const IVORY    = "#F4ECD8";
const INK = "#330311";

export default function IAmHerNominate() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Nominate a Woman | I Am Her — The Woman Who Leads the Room",
    description: "Nominate a woman in your life for I Am Her: The Woman Who Leads the Room. 30 October 2026, Milton Keynes. A luxury leadership wellbeing evening for women who lead.",
    url: "https://eventperfekt.net/iamher/nominate",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Nominate a woman for I Am Her — The Woman Who Leads the Room, 30 October 2026, Milton Keynes",
  });
  useVisitorTracking("/iamher/nominate", "Nominate a Woman | I Am Her");
  const [form, setForm] = useState({
    nominatorName: "",
    nominatorEmail: "",
    nomineeName: "",
    nomineeEmail: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nominatorName.trim() || !form.nominatorEmail.trim() || !form.nomineeName.trim() || !form.nomineeEmail.trim()) {
      setError("Please complete all required fields.");
      return;
    }
    setError("");
    setSubmitting(true);
    trackFunnelEvent('form_start', '/iamher/nominate', { action: 'nomination' });
    try {
      const res = await fetch("/api/event-august/nominate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      trackFunnelEvent('submit_success', '/iamher/nominate', { action: 'nomination' });
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "13px 0", fontSize: 15,
    background: "transparent", border: "none",
    borderBottom: `1px solid rgba(201,169,97,0.15)`,
    color: IVORY, outline: "none", fontFamily: "Poppins, sans-serif",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const label: React.CSSProperties = {
    fontSize: 10, color: "rgba(201,169,97,0.65)",
    letterSpacing: "0.26em", textTransform: "uppercase", margin: "0 0 8px", display: "block",
  };
  const field: React.CSSProperties = { marginBottom: 32 };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        input::placeholder, textarea::placeholder { color: rgba(244,236,216,0.45); }
        input:focus, textarea:focus { border-bottom-color: rgba(201,169,97,0.75) !important; }
      `}</style>

      {/* Header */}
      <header style={{ padding: "18px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(244,236,216,0.05)", maxWidth: 900, margin: "0 auto" }}>
        <a href="/iamher" onClick={() => trackFunnelEvent('cta_click', '/iamher/nominate', { cta: 'back_to_evening' })} style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          The Woman Who Leads the Room
        </a>
        <a href="/access" onClick={() => trackFunnelEvent('cta_click', '/iamher/nominate', { cta: 'request_invitation' })} style={{ fontSize: 10, color: GOLD, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Apply for Your Invitation →
        </a>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "64px 36px 100px" }}>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 1, background: GOLD, margin: "0 auto 36px" }} />
            <p style={{ fontSize: 10, color: "rgba(201,169,97,0.75)", letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 20px" }}>Nomination sent</p>
            <h1 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(30px,5vw,44px)", color: IVORY, margin: "0 0 24px", lineHeight: 1.2 }}>
              {form.nomineeName.split(" ")[0]} will hear from us.
            </h1>
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.65)", lineHeight: 1.9, margin: "0 0 48px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
              We've sent {form.nomineeName} a personal note letting her know you think she belongs in the room. If she requests access, we'll mention you nominated her.
            </p>
            <a href="/iamher" onClick={() => trackFunnelEvent('cta_click', '/iamher/nominate', { cta: 'return_to_event' })} style={{ fontSize: 11, color: GOLD, textDecoration: "none", letterSpacing: "0.22em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,169,97,0.60)", paddingBottom: 3 }}>
              Return to the event →
            </a>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 56 }}>
              <div style={{ width: 40, height: 1, background: GOLD, marginBottom: 28 }} />
              <p style={{ fontSize: 10, color: "rgba(201,169,97,0.65)", letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 18px" }}>Nominate a Woman</p>
              <h1 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(30px,5vw,44px)", color: IVORY, margin: "0 0 20px", lineHeight: 1.2 }}>
                Know someone who belongs in the room?
              </h1>
              <p style={{ fontSize: 14, color: "rgba(244,236,216,0.65)", lineHeight: 1.9, margin: 0 }}>
                This event is invitation-led. If you know a woman — a founder, executive, creative, or leader — who should be in the room on 30 October, nominate her. We'll send her a personal note letting her know you thought of her.
              </p>
            </div>

            <form onSubmit={submit}>

              <div style={{ marginBottom: 48, paddingBottom: 40, borderBottom: "1px solid rgba(244,236,216,0.05)" }}>
                <p style={{ fontSize: 10, color: "rgba(201,169,97,0.28)", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 24px" }}>Your details</p>
                <div style={field}>
                  <label style={label}>Your name *</label>
                  <input style={inp} value={form.nominatorName} onChange={set("nominatorName")} placeholder="Your full name" />
                </div>
                <div style={field}>
                  <label style={label}>Your email *</label>
                  <input style={inp} type="email" value={form.nominatorEmail} onChange={set("nominatorEmail")} placeholder="your@email.com" />
                </div>
              </div>

              <div style={{ marginBottom: 48 }}>
                <p style={{ fontSize: 10, color: "rgba(201,169,97,0.28)", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 24px" }}>The woman you're nominating</p>
                <div style={field}>
                  <label style={label}>Her name *</label>
                  <input style={inp} value={form.nomineeName} onChange={set("nomineeName")} placeholder="Her full name" />
                </div>
                <div style={field}>
                  <label style={label}>Her email *</label>
                  <input style={inp} type="email" value={form.nomineeEmail} onChange={set("nomineeEmail")} placeholder="her@email.com" />
                </div>
                <div style={field}>
                  <label style={label}>Personal message (optional)</label>
                  <textarea
                    style={{ ...inp, borderBottom: "1px solid rgba(201,169,97,0.15)", resize: "none", minHeight: 90 }}
                    value={form.message}
                    onChange={set("message")}
                    placeholder="Why do you think she belongs in the room? We'll include this in her invitation."
                  />
                </div>
              </div>

              {error && (
                <p style={{ fontSize: 12, color: "rgba(220,60,60,0.7)", margin: "0 0 20px", letterSpacing: "0.04em" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%", padding: "18px 32px",
                  background: "transparent",
                  border: `1px solid ${submitting ? "rgba(201,169,97,0.40)" : "rgba(201,169,97,0.70)"}`,
                  color: submitting ? "rgba(201,169,97,0.65)" : GOLD,
                  fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "Poppins, sans-serif", transition: "all 0.25s",
                }}
              >
                {submitting ? "Sending…" : "Send Nomination"}
              </button>

              <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", textAlign: "center", margin: "16px 0 0", lineHeight: 1.8 }}>
                She will receive a personal email. We will not share her details with anyone outside Event Perfekt.
              </p>
            </form>
          </>
        )}
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
