import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import IamherMobileNav from "@/components/IamherMobileNav";
import EmailCapturePopup from "@/components/EmailCapturePopup";
const platformHero = "/assets/platform_scene.jpg";
const pillarsHero = "/assets/pillars_hero.png";
const flagshipHero = "/assets/flagship_hero.jpg";
const organisationsHero = "/assets/organisations_hero.jpg";
const partnersHero = "/assets/partners_hero.png";
const visionHero = "/assets/vision_hero.png";

const GOLD = "#C9A961";
const GOLD_SOFT = "#E2C87A";
const IVORY = "#F4ECD8";
const INK = "#330311";

const inputBase: React.CSSProperties = {
  width: "100%", padding: "14px 0", fontSize: 15, fontFamily: "Poppins, sans-serif",
  background: "transparent", border: "none", borderBottom: "1px solid rgba(226,200,122,0.40)",
  borderRadius: 0, color: IVORY, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, color: "rgba(244,236,216,0.45)",
  letterSpacing: "0.22em", textTransform: "uppercase", display: "block", marginBottom: 4,
};

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: "rgba(244,236,216,0.45)", marginLeft: 4 }}>·</span>}</label>
      {children}
    </div>
  );
}

function ThinButton({ children, onClick, type = "button", disabled, variant = "gold" }: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; variant?: "gold" | "ghost";
}) {
  const isGold = variant === "gold";
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className="ip-thin-btn"
      style={{
        background: "transparent", color: isGold ? GOLD : "rgba(244,236,216,0.7)",
        border: `1px solid ${isGold ? GOLD : "rgba(244,236,216,0.25)"}`,
        padding: "16px 36px", fontSize: 11, fontWeight: 500, cursor: disabled ? "wait" : "pointer",
        letterSpacing: "0.28em", textTransform: "uppercase", borderRadius: 0,
        transition: "all 0.3s ease", opacity: disabled ? 0.5 : 1,
        fontFamily: "'Poppins', sans-serif",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = isGold ? "rgba(201,169,97,0.08)" : "rgba(244,236,216,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function SectionBanner({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <section className="hero-img-banner" style={{ minHeight: 280, borderTop: "1px solid rgba(244,236,216,0.06)" }}>
      <div className="overlay" style={{ background: "rgba(51,3,17,0.75)" }} />
      <div className="content" style={{ maxWidth: 720, padding: "40px 24px" }}>
        <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.36em", textTransform: "uppercase", fontWeight: 500, margin: "0 0 16px" }}>
          {label}
        </p>
        <p className="ip-serif" style={{ fontSize: "clamp(28px, 4vw, 44px)", color: IVORY, fontWeight: 500, lineHeight: 1.1, margin: "0 0 12px" }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: 14, color: "rgba(244,236,216,0.6)", lineHeight: 1.6, fontWeight: 300, margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}

function PillarsCard({ title, subtitle, num }: { title: string; subtitle: string; num?: string }) {
  return (
    <div style={{ background: "rgba(244,236,216,0.02)", border: "1px solid rgba(244,236,216,0.08)", padding: "28px 28px 32px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(to right, transparent, rgba(201,169,97,0.4), transparent)" }} />
      {num && (
        <p style={{ fontSize: 13, color: GOLD, fontWeight: 500, margin: "0 0 8px", letterSpacing: "0.1em", fontFamily: "Poppins, sans-serif" }}>{num}</p>
      )}
      <p style={{ fontSize: 18, color: IVORY, fontWeight: 500, margin: "0 0 4px", lineHeight: 1.3 }}>{title}</p>
      <p style={{ fontSize: 13, color: "rgba(244,236,216,0.65)", lineHeight: 1.85, margin: 0 }}>{subtitle}</p>
    </div>
  );
}

function WaitingListForm() {
  const [f, setF] = useState({
    name: "", email: "", organisation: "", country: "", region: "",
    interest_type: "guest", reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/event-august/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, consent_marketing: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setSuccess(true);
      trackFunnelEvent('form_complete', '/about-the-movement', { step: 'waiting_list' });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "56px 24px" }}>
        <div className="ip-serif" style={{ fontSize: 32, color: GOLD, marginBottom: 20, fontStyle: "italic" }}>Thank you.</div>
        <p style={{ fontSize: 16, color: IVORY, lineHeight: 1.8, marginBottom: 28, fontWeight: 300, maxWidth: 420, margin: "0 auto 28px" }}>
          You are now on the waiting list. We will be in touch when opportunities open in your region.
        </p>
        <button onClick={() => { setSuccess(false); setF({ name: "", email: "", organisation: "", country: "", region: "", interest_type: "guest", reason: "" }); }} style={{ background: "none", border: "none", color: GOLD, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", textDecoration: "none", cursor: "pointer", borderBottom: `1px solid ${GOLD}`, paddingBottom: 4 }}>
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 22, maxWidth: 560, margin: "0 auto" }}>
      {error && <p style={{ color: "#c76b6b", fontSize: 13, textAlign: "center" }}>{error}</p>}
      <Field label="Name" required>
        <input style={inputBase} placeholder="Your full name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required />
      </Field>
      <Field label="Email" required>
        <input style={inputBase} type="email" placeholder="you@company.com" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required />
      </Field>
      <Field label="Organisation" required>
        <input style={inputBase} placeholder="Company or organisation" value={f.organisation} onChange={e => setF({ ...f, organisation: e.target.value })} required />
      </Field>
      <Field label="Country" required>
        <input style={inputBase} placeholder="e.g. United Kingdom" value={f.country} onChange={e => setF({ ...f, country: e.target.value })} required />
      </Field>
      <Field label="Region / City" required>
        <input style={inputBase} placeholder="e.g. Milton Keynes" value={f.region} onChange={e => setF({ ...f, region: e.target.value })} required />
      </Field>
      <Field label="Interest Type" required>
        <select style={{ ...inputBase, borderBottom: "1px solid rgba(226,200,122,0.40)", background: "transparent", color: IVORY, cursor: "pointer" }}
          value={f.interest_type} onChange={e => setF({ ...f, interest_type: e.target.value })} required>
          <option value="guest" style={{ background: INK, color: IVORY }}>Guest</option>
          <option value="brand_partner" style={{ background: INK, color: IVORY }}>Brand Partner</option>
          <option value="corporate_org" style={{ background: INK, color: IVORY }}>Corporate Organisation</option>
          <option value="speaker" style={{ background: INK, color: IVORY }}>Speaker</option>
          <option value="community_partner" style={{ background: INK, color: IVORY }}>Experience Partner</option>
          <option value="sponsor" style={{ background: INK, color: IVORY }}>Sponsor</option>
          <option value="media" style={{ background: INK, color: IVORY }}>Media</option>
          <option value="other" style={{ background: INK, color: IVORY }}>Other</option>
        </select>
      </Field>
      <Field label="Why are you interested?">
        <textarea style={{ ...inputBase, minHeight: 80, resize: "vertical" } as any} placeholder="Tell us briefly why you are interested in The Human Behind The Title..." value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} />
      </Field>
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <ThinButton type="submit" disabled={loading} variant="gold">
          {loading ? "Submitting..." : "Join The Waiting List"}
        </ThinButton>
      </div>
    </form>
  );
}

export default function AboutTheMovement() {
  usePageSEO({
    title: "About The Platform | The Human Behind The Title — Leadership & Wellbeing Initiative",
    description: "The Human Behind The Title is a leadership platform exploring what leaders carry beneath success. The Woman Who Leads The Room is the first flagship experience. Partnerships, corporate programmes and future experiences across the UK and beyond.",
    keywords: "The Human Behind The Title, confidence-led leadership platform UK, leadership wellbeing initiative, women in leadership platform, executive wellbeing programme, founder sustainability, corporate wellbeing programme UK, leadership confidence platform, business sustainability for leaders, women in leadership Milton Keynes, female founder community UK, executive women wellbeing, leadership longevity platform, Event Perfekt, wellbeing and leadership, corporate confidence programme, leadership retention platform, women executives community, founder wellbeing UK, business sustainability programme, women's health leadership, menopause in leadership, financial wellbeing for leaders, emotional wellbeing executives, skin health leadership confidence, The Woman Who Leads the Room, I Am Her movement, leadership event platform UK, executive engagement programme, curated leadership experience, brand partnership platform, leadership community UK, West Africa leadership, EMEA leadership platform, HR leadership, human resources leadership, HR wellbeing programme, human resources wellbeing, talent retention leadership, workplace wellbeing HR, executive HR programme, leadership HR platform, HR and wellbeing, people and culture leadership",
    url: "https://eventperfekt.net/about-the-movement",
    image: "https://eventperfekt.net/assets/ChatGPT_Image_May_27,_2026,_10_02_46_PM_1779915792360.png",
    imageAlt: "The Human Behind The Title — a leadership platform for founders, executives and women who lead",
    ogType: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "The Human Behind The Title",
        alternateName: "The Human Behind The Title by Event Perfekt",
        url: "https://eventperfekt.net/about-the-movement",
        description: "A leadership platform exploring what leaders carry beneath success. The Woman Who Leads The Room is the first flagship experience.",
        about: {
          "@type": "Thing",
          name: "Leadership Wellbeing",
          sameAs: "https://en.wikipedia.org/wiki/Well-being",
        },
        publisher: {
          "@type": "Organization",
          name: "Event Perfekt",
          url: "https://eventperfekt.net",
          logo: "https://eventperfekt.net/assets/3d_Logo_1772145137902.jpg",
          address: {
            "@type": "PostalAddress",
            streetAddress: "20 Wenlock Road",
            addressLocality: "London",
            postalCode: "N1 7PG",
            addressCountry: "GB",
          },
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Event Perfekt",
        alternateName: "Event Perfekt",
        url: "https://eventperfekt.net",
        logo: "https://eventperfekt.net/assets/3d_Logo_1772145137902.jpg",
        description: "UK-based event management and project delivery company creating intentional experiences for organisations, brands, communities and private clients.",
        sameAs: [
          "https://eventperfekt.net",
          "https://tradenow.thetwintrade.co.uk",
        ],
        address: {
          "@type": "PostalAddress",
          streetAddress: "20 Wenlock Road",
          addressLocality: "London",
          postalCode: "N1 7PG",
          addressCountry: "GB",
        },
        contactPoint: {
          "@type": "ContactPoint",
          email: "info@eventperfekt.com",
          contactType: "Customer Service",
          availableLanguage: "English",
        },
      },
    ],
  });
  useVisitorTracking("/about-the-movement", "About The Platform | The Human Behind The Title");

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        .ip-serif { font-family: 'Poppins', sans-serif; }
        .ip-sec-lg { padding: 72px 32px; }
        .editorial-body p { margin: 0; }
        .section-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .section-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(201,169,97,0.06) 0%, transparent 50%, rgba(201,169,97,0.03) 100%);
        }
        .section-hero::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: 'Poppins', sans-serif;, Georgia, serif;
          font-size: clamp(80px, 15vw, 180px);
          font-weight: 500;
          color: rgba(201,169,97,0.04);
          letter-spacing: -0.02em;
          white-space: nowrap;
          pointer-events: none;
        }
        .hero-img-banner {
          position: relative;
          overflow: hidden;
          min-height: 420px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .hero-img-banner img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          filter: none !important;
        }
        .hero-img-banner .overlay {
          position: absolute;
          inset: 0;
          background: transparent;
        }
        .hero-img-banner .content {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 28px 24px;
          background: rgba(51,3,17,0.65);
          width: 100%;
        }
        @media (max-width: 640px) {
          .ip-sec-lg { padding: 56px 20px; }
          .section-hero { min-height: 160px !important; }
          .hero-img-banner { min-height: 220px !important; }
          .hero-img-banner img { min-height: 220px !important; }
          .hero-img-banner .content { padding: 20px 16px !important; }
          .hero-img-banner .content p { font-size: clamp(22px, 6vw, 28px) !important; }
        }
        @media (max-width: 768px) {
          .grid-2-col { grid-template-columns: 1fr !important; }
          .grid-2-col .reverse { order: 1 !important; }
        }
      `}</style>

      <IamherMobileNav
        sticky
        logoText="I Am Her"
        maxWidth={1200}
        headerPadding="12px 28px"
        links={[
          { label: "About", href: "/about-the-movement", active: true },
          { label: "Apply for Your Invitation", href: "/access" },
          { label: "Stay & Explore", href: "/iamher/stay" },
          { label: "Stories", href: "/iamher/community" },
          { label: "Media", href: "/iamher/media" },
          { label: "Organisations", href: "/iamher/partnership" },
          { label: "Contact", href: "/contact" },
        ]}
      />

      {/* ── 1. Hero / About the platform ─────────────────────────── */}
      <section className="ip-sec-lg" style={{ background: INK, padding: "120px 32px 96px", textAlign: "center" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>
              About The Platform
            </p>
            <h1 className="ip-serif" style={{ fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 500, color: IVORY, margin: "0 0 20px", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              The Platform Behind The Woman Who Leads The Room
            </h1>
            <p style={{ fontSize: 16, color: "rgba(244,236,216,0.6)", lineHeight: 1.8, margin: "0 0 40px", fontWeight: 300, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
              A leadership platform exploring what leaders carry beneath success — pressure, identity, confidence, health, money, appearance, wellbeing and responsibility.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2 }} viewport={{ once: true }} style={{ fontSize: 17, color: "rgba(244,236,216,0.75)", lineHeight: 1.95, fontWeight: 300, maxWidth: 640, margin: "0 auto 48px" }}>
            <p style={{ margin: "0 0 22px" }}>The Human Behind The Title exists to explore what leaders carry beneath success: pressure, identity, confidence, health, money, appearance, wellbeing and responsibility.</p>
            <p style={{ margin: "0 0 22px" }}>It exists for people who have reached important rooms, built serious things, and now need better conversations around how they sustain themselves, their work and their lives.</p>
            <p style={{ margin: 0 }}>The platform begins with women in leadership through its first flagship experience, The Woman Who Leads The Room, with future experiences expanding into wider leadership audiences.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.35 }} viewport={{ once: true }} style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/iamher" onClick={() => trackFunnelEvent('cta_click', '/about-the-movement', { cta: 'explore_first_experience' })} style={{ display: "inline-block", textDecoration: "none" }}>
              <ThinButton variant="gold">Explore The First Experience</ThinButton>
            </Link>
            <Link to="/iamher/partnership" onClick={() => trackFunnelEvent('cta_click', '/about-the-movement', { cta: 'explore_partnerships' })} style={{ display: "inline-block", textDecoration: "none" }}>
              <ThinButton variant="ghost">Explore Partnerships</ThinButton>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 2. First Flagship Experience ────────────────────────── */}
      <section className="hero-img-banner" style={{ minHeight: 560, borderTop: "1px solid rgba(244,236,216,0.06)" }}>
        <img src={flagshipHero} alt="The Woman Who Leads The Room flagship experience" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
        <div className="overlay" style={{}} />
      </section>
      <section className="ip-sec-lg" style={{ background: INK, padding: "100px 32px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <h2 className="ip-serif" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 500, color: IVORY, margin: "0 0 28px", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
              The First Flagship Experience
            </h2>
            <div style={{ fontSize: 17, color: "rgba(244,236,216,0.75)", lineHeight: 1.95, fontWeight: 300 }}>
              <p style={{ margin: "0 0 22px" }}>The Woman Who Leads The Room is the first flagship experience within The Human Behind The Title platform. Launching in Milton Keynes, it brings together carefully selected female founders, executives, directors, senior professionals and business owners for a private leadership dinner focused on confidence, health, visibility, connection and the woman behind the title.</p>
              <p style={{ margin: "0 0 22px" }}>This first experience focuses on women because many senior women are carrying leadership pressure, business growth, identity shifts, health changes, financial decisions and personal responsibility at the same time.</p>
            </div>
            <div style={{ marginTop: 32 }}>
              <Link to="/iamher" onClick={() => trackFunnelEvent('cta_click', '/about-the-movement', { cta: 'view_the_woman_who_leads' })} style={{ display: "inline-block", textDecoration: "none" }}>
                <ThinButton variant="gold">View The Woman Who Leads The Room</ThinButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 3. Core Pillars ──────────────────────────────────────── */}
      <section className="hero-img-banner" style={{ minHeight: 420, borderTop: "1px solid rgba(244,236,216,0.06)" }}>
        <img src={pillarsHero} alt="Six pillars of leadership wellbeing" style={{}} />
        <div className="overlay" style={{}} />
        <div className="content">
          <p className="ip-serif" style={{ fontSize: "clamp(28px, 4vw, 44px)", color: IVORY, fontWeight: 500, lineHeight: 1.1, margin: "0 0 12px" }}>
            Our Core Pillars
          </p>
          <p style={{ fontSize: 14, color: GOLD, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 500, margin: 0 }}>
            The Foundation
          </p>
        </div>
      </section>
      <section className="ip-sec-lg" style={{ background: "#0D0408", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }} style={{ marginBottom: 60 }}>
            <h2 className="ip-serif" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 500, color: IVORY, margin: "0 0 20px", letterSpacing: "-0.01em", lineHeight: 1.15, textAlign: "center" }}>
              Six Pillars That Shape Sustainable Leadership
            </h2>
            <p style={{ fontSize: 17, color: "rgba(244,236,216,0.6)", lineHeight: 1.8, fontWeight: 300, textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
              Six interconnected areas that affect how leaders sustain themselves, their influence and their work over time.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} viewport={{ once: true }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              <PillarsCard num="01" title="Confidence & Presence" subtitle="How leaders show up, own their space and continue to lead with clarity." />
              <PillarsCard num="02" title="Women's Health" subtitle="Menopause, hormones, energy, intimate health and the physical realities that shape leadership." />
              <PillarsCard num="03" title="Skin & Aesthetic Health" subtitle="Confidence-led conversations around skin, aesthetic and intimate health as part of overall wellbeing." />
              <PillarsCard num="04" title="Emotional Wellbeing" subtitle="The private pressure, responsibility and emotional weight carried by high-performing women." />
              <PillarsCard num="05" title="Financial Wellbeing" subtitle="Money, property, growth, investment and sustainability decisions that affect leadership longevity." />
              <PillarsCard num="06" title="Business Sustainability" subtitle="Helping founders and leaders build businesses that last, not just businesses that look successful." />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 4. Corporate Conversations & Leadership Wellbeing ───────── */}
      <section className="hero-img-banner" style={{ minHeight: 420, borderTop: "1px solid rgba(244,236,216,0.06)" }}>
        <img src={organisationsHero} alt="Corporate conversations and leadership wellbeing" style={{}} />
        <div className="overlay" style={{}} />
        <div className="content">
          <p style={{ fontSize: 14, color: GOLD, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 500, margin: 0 }}>
            Corporate Conversations &amp; Leadership Wellbeing
          </p>
        </div>
      </section>
      <section className="ip-sec-lg" style={{ background: "#0D0408", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
              <h2 className="ip-serif" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 500, color: IVORY, margin: "0 0 28px", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                For Organisations
              </h2>
              <div style={{ fontSize: 17, color: "rgba(244,236,216,0.75)", lineHeight: 1.95, fontWeight: 300 }}>
                <p style={{ margin: "0 0 22px" }}>The Human Behind The Title gives organisations a more human way to engage with leadership, wellbeing, retention, confidence, inclusion and performance.</p>
                <p style={{ margin: "0 0 22px" }}>It supports conversations around women in leadership, menopause and workplace wellbeing, executive confidence, founder sustainability, financial wellbeing, burnout prevention, talent retention and human-centred leadership.</p>
                <p style={{ margin: 0 }}>This is where corporate wellbeing meets leadership reality.</p>
              </div>
              <div style={{ marginTop: 32 }}>
                <Link to="/iamher/partnership" onClick={() => trackFunnelEvent('cta_click', '/about-the-movement', { cta: 'discuss_corporate' })} style={{ display: "inline-block", textDecoration: "none" }}>
                  <ThinButton variant="gold">Discuss Corporate Programmes</ThinButton>
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1.0, delay: 0.2 }} viewport={{ once: true }} style={{ padding: 40, border: "1px solid rgba(244,236,216,0.06)", background: "rgba(244,236,216,0.01)", display: "flex", flexDirection: "column", gap: 24, alignItems: "center", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, border: `1px solid ${GOLD}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 20, fontWeight: 500 }}>HR</div>
              <div>
                <p style={{ fontSize: 18, color: IVORY, fontWeight: 500, margin: "0 0 8px" }}>People & Culture</p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.6)", lineHeight: 1.6, margin: 0, fontWeight: 300 }}>Align your wellbeing, retention and inclusion programmes with real leadership experiences.</p>
              </div>
              <div style={{ width: "100%", height: 1, background: "rgba(244,236,216,0.06)" }} />
              <div style={{ width: 48, height: 48, border: `1px solid ${GOLD}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 20, fontWeight: 500 }}>L&D</div>
              <div>
                <p style={{ fontSize: 18, color: IVORY, fontWeight: 500, margin: "0 0 8px" }}>Leadership Development</p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.6)", lineHeight: 1.6, margin: 0, fontWeight: 300 }}>Build confidence, resilience and sustainability into your leadership pipeline.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 5. Brand Partnerships ────────────────────────────────── */}
      <section className="hero-img-banner" style={{ minHeight: 420, borderTop: "1px solid rgba(244,236,216,0.06)" }}>
        <img src={partnersHero} alt="Premium brand partnerships for senior leaders" style={{}} />
        <div className="overlay" style={{}} />
        <div className="content">
          <p className="ip-serif" style={{ fontSize: "clamp(28px, 4vw, 44px)", color: IVORY, fontWeight: 500, lineHeight: 1.1, margin: "0 0 12px" }}>
            For Brand Partners
          </p>
          <p style={{ fontSize: 14, color: GOLD, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 500, margin: 0 }}>
            Premium Brand Partnerships
          </p>
        </div>
      </section>
      <section className="ip-sec-lg" style={{ background: INK, padding: "100px 32px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1.0, delay: 0.2 }} viewport={{ once: true }} style={{ order: 2 }}>
              <h2 className="ip-serif" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 500, color: IVORY, margin: "0 0 28px", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                For Brand Partners
              </h2>
              <div style={{ fontSize: 17, color: "rgba(244,236,216,0.75)", lineHeight: 1.95, fontWeight: 300 }}>
                <p style={{ margin: "0 0 22px" }}>We work with carefully selected brands whose products, services and values support the people behind leadership roles.</p>
                <p style={{ margin: "0 0 22px" }}>Our partners are not simply sponsors. They become part of the experience, the conversation and the guest journey.</p>
                <p style={{ margin: 0 }}>We create opportunities for aligned brands across women's health, skin health, luxury fragrance, beauty, aesthetics, financial wellbeing, business banking, hospitality, lifestyle and corporate wellbeing.</p>
              </div>
              <div style={{ marginTop: 32 }}>
                <Link to="/iamher/partnership" onClick={() => trackFunnelEvent('cta_click', '/about-the-movement', { cta: 'explore_partnerships' })} style={{ display: "inline-block", textDecoration: "none" }}>
                  <ThinButton variant="gold">Explore Partnerships</ThinButton>
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }} style={{ order: 1, padding: 40, border: "1px solid rgba(244,236,216,0.06)", background: "rgba(244,236,216,0.01)", display: "flex", flexDirection: "column", gap: 32, alignItems: "center", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: GOLD, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 500 }}>Partner Benefits</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.65)", fontWeight: 300, lineHeight: 1.6, margin: 0 }}>Direct access to senior female leaders, brand placement in premium experiences, content and media partnership opportunities, and alignment with a leadership platform.</p>
              </div>
              <Link to="/iamher/partnership" onClick={() => trackFunnelEvent('cta_click', '/about-the-movement', { cta: 'explore_partnerships' })} style={{ textDecoration: "none" }}>
                <ThinButton variant="gold">Explore Partnerships</ThinButton>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 6. The Vision ───────────────────────────────────────── */}
      <section className="hero-img-banner" style={{ minHeight: 420, borderTop: "1px solid rgba(244,236,216,0.06)" }}>
        <img src={visionHero} alt="International expansion and leadership growth" style={{}} />
        <div className="overlay" style={{}} />
        <div className="content">
          <p className="ip-serif" style={{ fontSize: "clamp(28px, 4vw, 44px)", color: IVORY, fontWeight: 500, lineHeight: 1.1, margin: "0 0 12px" }}>
            The Vision
          </p>
          <p style={{ fontSize: 14, color: GOLD, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 500, margin: 0 }}>
            UK, Europe, West Africa &amp; Beyond
          </p>
        </div>
      </section>
      <section className="ip-sec-lg" style={{ background: "#0D0408", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
              <div style={{ fontSize: 17, color: "rgba(244,236,216,0.75)", lineHeight: 1.95, fontWeight: 300 }}>
                <p style={{ margin: "0 0 22px" }}>The Woman Who Leads The Room launches in Milton Keynes, with future editions planned across selected UK cities and aligned international markets.</p>
                <p style={{ margin: "0 0 22px" }}>Through Event Perfekt Global's delivery network, the long-term vision is to build leadership experiences across the UK, Europe, West Africa, the Middle East and wider EMEA.</p>
              </div>
              <p style={{ fontSize: 18, color: GOLD, marginTop: 32, fontWeight: 500, fontStyle: "italic" }}>The aim is simple: to help people not only reach the room, but stay in it.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 7. Stay Connected / Waiting List ────────────────────── */}
      <section className="ip-sec-lg" style={{ background: INK, borderTop: "1px solid rgba(244,236,216,0.06)", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
              <p style={{ color: GOLD, fontSize: 11, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>
                Stay Connected
              </p>
              <h2 className="ip-serif" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 500, color: IVORY, margin: "0 0 28px", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                Register Your Interest
              </h2>
              <div style={{ fontSize: 17, color: "rgba(244,236,216,0.75)", lineHeight: 1.95, fontWeight: 300 }}>
                <p style={{ margin: "0 0 22px" }}>Interested in bringing The Human Behind The Title or The Woman Who Leads The Room to your organisation, city or region? Register your interest and be the first to hear about future launches, partnerships and future experiences.</p>
              </div>
              <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(244,236,216,0.6)", fontWeight: 300 }}>
                  <span style={{ width: 20, height: 1, background: GOLD, flexShrink: 0 }} />
                  Early access to new cities
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(244,236,216,0.6)", fontWeight: 300 }}>
                  <span style={{ width: 20, height: 1, background: GOLD, flexShrink: 0 }} />
                  Partnership enquiries
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(244,236,216,0.6)", fontWeight: 300 }}>
                  <span style={{ width: 20, height: 1, background: GOLD, flexShrink: 0 }} />
                  Speaker opportunities
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(244,236,216,0.6)", fontWeight: 300 }}>
                  <span style={{ width: 20, height: 1, background: GOLD, flexShrink: 0 }} />
                  Corporate programme updates
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1.0, delay: 0.2 }} viewport={{ once: true }} style={{ padding: 36, border: "1px solid rgba(244,236,216,0.08)", background: "rgba(244,236,216,0.01)" }}>
              <WaitingListForm />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 8. Final CTA ────────────────────────────────────────── */}
      <section className="ip-sec-lg" style={{ background: "#0D0408", borderTop: "1px solid rgba(244,236,216,0.06)", padding: "100px 32px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <div style={{ width: 64, height: 64, border: `1px solid ${GOLD}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", color: GOLD, fontSize: 24, fontWeight: 500 }}>I</div>
            <h2 className="ip-serif" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 500, color: IVORY, margin: "0 0 24px", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
              Build With The Platform
            </h2>
            <div style={{ fontSize: 17, color: "rgba(244,236,216,0.75)", lineHeight: 1.95, fontWeight: 300, marginBottom: 48 }}>
              <p style={{ margin: 0 }}>Whether you are a guest, corporate organisation, brand partner, speaker, city leader or sponsor, The Human Behind The Title offers a way to align with a platform built around leadership, wellbeing, confidence and longevity.</p>
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/access" onClick={() => trackFunnelEvent('cta_click', '/about-the-movement', { cta: 'request_invitation' })} style={{ display: "inline-block", textDecoration: "none" }}>
                <ThinButton variant="gold">Apply for Your Invitation</ThinButton>
              </Link>
              <Link to="/iamher/partnership" onClick={() => trackFunnelEvent('cta_click', '/about-the-movement', { cta: 'explore_partnerships' })} style={{ display: "inline-block", textDecoration: "none" }}>
                <ThinButton variant="ghost">Explore Partnerships</ThinButton>
              </Link>
              <Link to="/iamher/partnership" onClick={() => trackFunnelEvent('cta_click', '/about-the-movement', { cta: 'discuss_corporate' })} style={{ display: "inline-block", textDecoration: "none" }}>
                <ThinButton variant="ghost">Discuss Corporate Programmes</ThinButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 32px", borderTop: "1px solid rgba(244,236,216,0.06)", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "rgba(244,236,216,0.3)", letterSpacing: "0.14em" }}>
          AN INITIATIVE BY EVENT PERFEKT GLOBAL LTD
        </p>
        <p style={{ fontSize: 11, color: "rgba(244,236,216,0.2)", marginTop: 8 }}>
          20 Wenlock Road, London, N1 7PG
        </p>
      </footer>

      <EmailCapturePopup
        page="/about-the-movement"
        variant="iamher"
        delayMs={20000}
        storageKey="ep_about_email"
        headline="Not ready to request your place? Leave your email and enter the draw."
        subheadline="You'll be entered to win a complimentary invitation or a professional editorial portrait. One lucky woman on our list. Draw is live."
        offer="Win: a complimentary invitation or a professional editorial portrait."
        cta="Enter my email"
        gift="complimentary invitation or editorial portrait"
      />
    </div>
  );
}
