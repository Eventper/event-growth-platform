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

interface Nominee {
  name: string; role: string; reason: string;
}

export default function TableNominationsPage() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Corporate Table Nominations | Recognise Women in Your Team | The Woman Who Leads the Room",
    description: "Nominate the women who will represent your organisation at The Woman Who Leads the Room, Milton Keynes, 30 October 2026. Invest in the women leading within your business — an invitation-only evening curated by Event Perfekt.",
    keywords: "corporate table women's event UK, nominate women leaders event, invest in women leadership UK, corporate women's evening Milton Keynes, Event Perfekt corporate table, women's development event UK 2026, recognise women in leadership organisation",
    url: "https://eventperfekt.net/iamher/partnership/table-nominations",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Corporate Table Nominations — Recognise women leaders in your team",
  });
  useVisitorTracking("/iamher/partnership/table-nominations", "Table Nominations · The Woman Who Leads the Room");

  const [, setLocation] = useLocation();
  const [f, setF] = useState({
    organisation: "", contact_name: "", contact_email: "", contact_phone: "",
    dietary_requirements: "", accessibility_needs: "",
  });
  const [nominees, setNominees] = useState<Nominee[]>(
    Array.from({ length: 8 }, () => ({ name: "", role: "", reason: "" }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const updateNominee = (i: number, field: keyof Nominee, value: string) => {
    setNominees(p => {
      const next = [...p];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    trackFunnelEvent('form_start', '/iamher/partnership/table-nominations', { action: 'table_nominations' });
    try {
      const validNominees = nominees.filter(n => n.name.trim() || n.role.trim() || n.reason.trim());
      if (validNominees.length < 1) throw new Error("Please nominate at least one woman");

      const res = await fetch("/api/event-august/table-nominations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, nominees: validNominees }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      trackFunnelEvent('submit_success', '/iamher/partnership/table-nominations', { action: 'table_nominations' });
      setSuccess(true);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const filled = nominees.filter(n => n.name.trim()).length;

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
        <div className="pm-card" style={{ maxWidth: 720, width: "100%", padding: "48px 32px 56px" }}>

          {success ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: GOLD, fontSize: 16, margin: "0 0 12px", fontStyle: "italic" }}>Nominations submitted.</p>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: "0 0 28px" }}>
                Thank you. We have received your table nominations and will review them within 48 hours. You will receive payment instructions for £2,880 (inc. VAT) by email once the table is confirmed.
              </p>
              <button onClick={() => { trackFunnelEvent('cta_click', '/iamher/partnership/table-nominations', { cta: 'back_to_partnership' }); setLocation("/iamher/partnership"); }} style={{
                display: "inline-block", padding: "14px 32px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                color: INK, background: GOLD, border: "none", cursor: "pointer", fontWeight: 500,
                transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif",
              }}>
                Return to Partnership →
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>Corporate Table — 8 Seats</p>
              <h1 style={{ fontSize: 28, fontWeight: 400, color: IVORY, margin: "0 0 8px", lineHeight: 1.15, letterSpacing: "-0.02em", fontStyle: "italic" }}>
                Nominate Your Table
              </h1>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.92)", lineHeight: 1.6, margin: "0 0 36px", fontWeight: 300 }}>
                Tell us about the women who will represent your organisation. At least one nomination is required. We will confirm your table and send payment instructions within 48 hours.
              </p>

              {/* Contact details */}
              <div style={{ display: "grid", gap: 24, marginBottom: 36 }}>
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
              </div>

              {/* Progress */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 3, background: "rgba(201,169,97,0.15)", borderRadius: 2 }}>
                  <div style={{ width: `${(filled / 8) * 100}%`, height: "100%", background: GOLD, borderRadius: 2, transition: "width 0.4s ease" }} />
                </div>
                <span style={{ fontSize: 12, color: GOLD, whiteSpace: "nowrap" }}>{filled} of 8 nominated</span>
              </div>

              {/* Nominees */}
              {nominees.map((n, i) => (
                <div key={i} style={{ marginBottom: 28, padding: "20px 0", borderTop: i > 0 ? "1px solid rgba(226,200,122,0.1)" : "none" }}>
                  <p style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>Seat {i + 1}</p>
                  <div style={{ display: "grid", gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Full name</label>
                      <input style={inputStyle} placeholder="Name of the nominated woman" value={n.name} onChange={e => updateNominee(i, "name", e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Job title / role</label>
                      <input style={inputStyle} placeholder="e.g. Managing Director" value={n.role} onChange={e => updateNominee(i, "role", e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Why she was nominated</label>
                      <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "-4px 0 8px" }}>What makes her the right woman to represent your organisation in this room?</p>
                      <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Leadership, impact, potential, or another reason..." value={n.reason} onChange={e => updateNominee(i, "reason", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ height: 1, background: "rgba(244,236,216,0.95)", margin: "24px 0" }} />

              {/* Dietary / Accessibility */}
              <div style={{ display: "grid", gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Dietary requirements (across the table)</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Allergies, halal, kosher, vegan, etc." value={f.dietary_requirements} onChange={e => setF(p => ({ ...p, dietary_requirements: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Accessibility needs</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Wheelchair access, hearing loop, etc." value={f.accessibility_needs} onChange={e => setF(p => ({ ...p, accessibility_needs: e.target.value }))} />
                </div>
              </div>

              {error && <p style={{ color: "#E8A0A0", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8 }}>
                <button type="submit" disabled={loading} onClick={submit} style={{
                  display: "inline-block", padding: "14px 32px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                  color: INK, background: GOLD, border: "none", cursor: "pointer", fontWeight: 500,
                  transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif", opacity: loading ? 0.6 : 1,
                }}>
                  {loading ? "Submitting..." : "Submit Nominations →"}
                </button>
              </div>
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
      <ElizabethChat page="table-nominations" />
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
