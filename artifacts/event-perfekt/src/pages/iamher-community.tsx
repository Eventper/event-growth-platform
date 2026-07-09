import { useState } from "react";
import { Link } from "wouter";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

const PERSONAL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "aol.com", "icloud.com", "me.com", "msn.com", "yahoo.co.uk",
  "hotmail.co.uk", "live.co.uk", "googlemail.com", "protonmail.com",
  "ymail.com", "mail.com", "gmx.com", "gmx.co.uk", "btinternet.com",
  "talktalk.net", "virginmedia.com", "sky.com", "ntlworld.com",
  "blueyonder.co.uk", "tiscali.co.uk", "orange.net", "fsmail.net",
  "o2.co.uk", "vodafone.net", "ee.co.uk", "three.co.uk"
];

function isBusinessEmail(email: string): boolean {
  const domain = email.trim().split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return !PERSONAL_DOMAINS.includes(domain);
}

const PAIN_POINTS = [
  "Feeling isolated in senior leadership",
  "Struggling to balance work and personal wellbeing",
  "Difficulty scaling the business without burnout",
  "Lack of visibility or recognition in my industry",
  "Not sure how to build my leadership brand",
  "Managing financial pressure while growing",
  "Finding trusted people to talk to openly",
  "Decision fatigue — too many choices, no clarity",
  "Building a team that truly supports the vision",
  "Protecting my confidence under pressure",
  "Wearing every hat — CEO, manager, doer",
  "Accessing funding or investment opportunities",
];

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ fontSize: 10, fontWeight: 500, color: "rgba(244,236,216,0.85)", letterSpacing: "0.22em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
        {label}{required && <span style={{ color: "rgba(244,236,216,0.85)", marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function IAmHerCommunity() {
  const { isMobile } = useViewport();
  useVisitorTracking("iamher-community", "Join the Community | The Woman Who Leads the Room");
  usePageSEO({
    title: "Stay Connected | I Am Her | Event Perfekt",
    description: "Stay connected with I Am Her — a curated circle of accomplished women founders, executives, and professionals across the UK. Connect before and after the evening.",
    keywords: "I Am Her, accomplished women UK, women founders network, curated women's circle, Event Perfekt, women professionals UK",
    url: "https://eventperfekt.net/iamher/community",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Join the I Am Her community — A curated network of women founders, executives, and leaders in the UK",
  });

  const [f, setF] = useState({
    full_name: "",
    email: "",
    company: "",
    job_title: "",
    website: "",
    pain_points: [] as string[],
    biggest_challenge: "",
    what_seeking: "",
    join_type: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const togglePain = (p: string) => {
    setF(prev => ({
      ...prev,
      pain_points: prev.pain_points.includes(p)
        ? prev.pain_points.filter(x => x !== p)
        : [...prev.pain_points, p]
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.full_name.trim()) { setError("Please enter your full name."); return; }
    if (!f.email.trim()) { setError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setError("Please enter a valid email address."); return; }
    if (!isBusinessEmail(f.email)) { setError("Please use a company or work email address. Personal emails are not accepted."); return; }
    if (!f.company.trim()) { setError("Please enter your company or organisation name."); return; }
    if (!f.job_title.trim()) { setError("Please enter your job title."); return; }
    setLoading(true);
    trackFunnelEvent('form_start', '/iamher/community', { intent: f.join_type || 'member' });
    try {
      const res = await fetch("/api/event-august/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, consent_marketing: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      trackFunnelEvent('submit_success', '/iamher/community', { intent: f.join_type || 'member' });
      setSuccess(true);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', 'Georgia', serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade { animation: fadeIn 0.6s ease-out forwards; }
        .pain-chip { cursor: pointer; user-select: none; transition: all 0.2s; }
        .pain-chip:hover { border-color: rgba(201,169,97,0.40); }
        .pain-chip.active { border-color: ${GOLD}; background: rgba(201,169,97,0.08); }
        .input-underline { width: 100%; padding: 14px 0; font-size: 15px; background: transparent; border: none; border-bottom: 1px solid rgba(244,236,216,0.30); border-radius: 0; color: #F4ECD8; outline: none; font-family: inherit; }
        .input-underline::placeholder { color: rgba(244,236,216,0.45); }
        .input-underline:focus { border-bottom-color: ${GOLD}; }
        .textarea-box { width: 100%; padding: 16px; font-size: 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(244,236,216,0.25); border-radius: 0; color: #F4ECD8; outline: none; font-family: inherit; line-height: 1.6; resize: vertical; }
        .textarea-box:focus { border-color: ${GOLD}; }
        .submit-btn { background: ${GOLD}; color: #1A0A0E; border: none; padding: 16px 40px; font-size: 11px; fontWeight: 700; letter-spacing: 0.26em; text-transform: uppercase; cursor: pointer; width: 100%; transition: opacity 0.2s; font-family: inherit; }
        .submit-btn:hover { opacity: 0.88; }
        .submit-btn:disabled { opacity: 0.5; cursor: wait; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "24px 0", borderBottom: "1px solid rgba(244,236,216,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Link href="/iamher">
          <img src={eventPerfektLogo} alt="Event Perfekt" style={{ height: 42, width: "auto", cursor: "pointer" }} />
        </Link>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 80px" }}>
        {success ? (
          <div className="animate-fade" style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 52, color: GOLD, marginBottom: 24 }}>✓</div>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", marginBottom: 16, fontWeight: 600 }}>Welcome to the community</p>
            <h2 style={{ fontSize: 24, fontWeight: 400, fontStyle: "italic", lineHeight: 1.35, margin: "0 0 20px" }}>
              You are now part of the room.
            </h2>
            <p style={{ color: "rgba(244,236,216,0.95)", fontSize: 14, lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>
              We will be in touch with exclusive updates, private event invitations, and introductions to the women shaping this space.
            </p>
            <div style={{ marginTop: 40 }}>
              <Link href="/iamher">
                <span style={{ color: GOLD, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer", borderBottom: "1px solid rgba(201,169,97,0.10)", paddingBottom: 2 }}>
                  Return to the I Am Her page
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="animate-fade">
            <p style={{ color: GOLD, fontSize: 9, letterSpacing: "0.36em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
              The I Am Her Collective
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 400, fontStyle: "italic", lineHeight: 1.25, margin: "0 0 16px" }}>
              Join the Community
            </h1>
            <p style={{ color: "rgba(244,236,216,0.85)", fontSize: 14, lineHeight: 1.7, margin: "0 0 48px" }}>
              A curated space for founders, executives, and women who lead. Tell us what you are navigating — so we can build the room around you.
            </p>

            <form onSubmit={submit}>
              <Field label="Full Name" required>
                <input className="input-underline" placeholder="e.g. Sarah Jenkins" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} required />
              </Field>

              <Field label="Work Email" required>
                <input className="input-underline" type="email" placeholder="sarah@company.com" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required />
                <p style={{ color: "rgba(244,236,216,0.95)", fontSize: 11, margin: "6px 0 0" }}>Please use your company email. Personal addresses are not accepted.</p>
              </Field>

              <Field label="Company or Organisation" required>
                <input className="input-underline" placeholder="e.g. Shujo" value={f.company} onChange={e => setF({ ...f, company: e.target.value })} required />
              </Field>

              <Field label="Job Title" required>
                <input className="input-underline" placeholder="e.g. Founder & Medical Director" value={f.job_title} onChange={e => setF({ ...f, job_title: e.target.value })} required />
              </Field>

              <Field label="Website">
                <input className="input-underline" placeholder="https://yourcompany.com" value={f.website} onChange={e => setF({ ...f, website: e.target.value })} />
              </Field>

              {/* Pain Points */}
              <div style={{ margin: "40px 0 28px" }}>
                <label style={{ fontSize: 10, fontWeight: 500, color: "rgba(244,236,216,0.85)", letterSpacing: "0.22em", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
                  What are you navigating right now? <span style={{ fontWeight: 300, color: "rgba(244,236,216,0.95)", textTransform: "none", letterSpacing: "0" }}>(Select all that apply)</span>
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PAIN_POINTS.map(p => (
                    <div
                      key={p}
                      className={`pain-chip ${f.pain_points.includes(p) ? "active" : ""}`}
                      onClick={() => togglePain(p)}
                      style={{
                        padding: "10px 16px", fontSize: 12, border: `1px solid ${f.pain_points.includes(p) ? GOLD : "rgba(244,236,216,0.12)"}`,
                        color: f.pain_points.includes(p) ? IVORY : "rgba(244,236,216,0.80)", borderRadius: 0,
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              <Field label="What is your biggest challenge right now?">
                <textarea
                  className="textarea-box"
                  rows={3}
                  placeholder="Be honest. This is just for us."
                  value={f.biggest_challenge}
                  onChange={e => setF({ ...f, biggest_challenge: e.target.value })}
                />
              </Field>

              <Field label="What are you seeking from this community?">
                <textarea
                  className="textarea-box"
                  rows={3}
                  placeholder="e.g. Connection, funding leads, wellbeing support, peer advice..."
                  value={f.what_seeking}
                  onChange={e => setF({ ...f, what_seeking: e.target.value })}
                />
              </Field>

              {error && <p style={{ color: "#f87171", fontSize: 13, margin: "16px 0", textAlign: "center" }}>{error}</p>}

              <div style={{ marginTop: 8 }}>
                <button className="submit-btn" type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Join the Community"}
                </button>
              </div>

              <p style={{ color: "rgba(244,236,216,0.65)", fontSize: 10, textAlign: "center", margin: "20px 0 0", letterSpacing: "0.06em" }}>
                No spam, ever. Your data is never shared. Unsubscribe any time.
              </p>
            </form>
          </div>
        )}
      </div>

      <footer style={{ borderTop: "1px solid rgba(244,236,216,0.08)", padding: "28px 32px", textAlign: "center", marginTop: 40 }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", letterSpacing: "0.08em", margin: 0 }}>
          An initiative by Event Perfekt Global Ltd.
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
