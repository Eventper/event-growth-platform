import { useState } from "react";
import { Link } from "wouter";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { useViewport } from "@/hooks/use-viewport";
import IamherMobileNav from "@/components/IamherMobileNav";
import { motion } from "framer-motion";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import EmailCapturePopup from "@/components/EmailCapturePopup";

const INK   = "#330311";
const GOLD  = "#C9A961";
const IVORY = "#F4ECD8";
const BURG  = "#330311";

// ════════════════════════════════════════
//  IMAGERY
// ════════════════════════════════════════
const IMG = {
  hero:        "/images/iamher/stay-hero.webp",
  train:       "/images/iamher/mk-station.jpg",
  hotelLaTour: "/images/iamher/hotel-latour.jpg",
  leonardo:    "/images/iamher/leonardo.jpg",
  premier:     "/images/iamher/premier-inn.jpg",
  weekend:     "/images/iamher/rooftop-bar.webp",
  friday:      "/images/iamher/friday-rooftop.jpg",
  saturday:    "/images/iamher/saturday-brunch.jpg",
  sunday:      "/images/iamher/sunday-lake.jpg",
  ifly:        "/images/iamher/ifly.jpg",
  snozone:     "/images/iamher/snozone.jpg",
  xscape:      "/images/iamher/xscape.jpg",
  escape:      "/images/iamher/escape-hunt.jpg",
  hbeauty:     "/images/iamher/h-beauty.jpg",
  hbeautyDisplay: "/images/iamher/h-beauty-display.jpg",
  centremk:    "/images/iamher/centre-mk.jpg",
  willen:      "/images/iamher/willen-lake-aqua.png",
  campbell:    "/images/iamher/campbell-park-new.jpg",
  spa:         "/images/iamher/spa-candles.jpg",
  bletchley:   "/images/iamher/bletchley-park.jpg",
  theatre:     "/images/iamher/theatre.webp",
  dining:      "/images/iamher/luxury-dining-burgundy.webp",
  concierge:   "/images/iamher/concierge-bg.jpg",
  spaTub:      "/images/iamher/spa-treatment-new.webp",
  boutique:    "/images/iamher/centre-mk-boutique.jpg",
  snozone2:    "/images/iamher/snozone-2.jpg",
  woburn:      "/images/iamher/woburn-lions.jpg",
  willenPeace: "/images/iamher/willen-peace-pagoda.jpg",
};

// ════════════════════════════════════════
//  HELP
// ════════════════════════════════════════
const HELP_OPTIONS = [
  "Group hotel booking",
  "Restaurant booking",
  "Family things to do",
  "Train tickets",
  "Station / airport transfer",
  "Full weekend itinerary (2–3 days)",
  "Something else",
];

// ════════════════════════════════════════
//  ANIMATION
// ════════════════════════════════════════
const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.22, 0.8, 0.32, 1] as [number, number, number, number] },
  viewport: { once: true, margin: "-80px" },
};

// ════════════════════════════════════════
//  COMPONENTS
// ════════════════════════════════════════

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 9, color: "rgba(201,169,97,0.80)", letterSpacing: "0.4em", textTransform: "uppercase", margin: "0 0 14px", fontFamily: "'Poppins', sans-serif", fontWeight: 400 }}>
      {children}
    </p>
  );
}

function GoldRule({ width = "80px" }: { width?: string }) {
  return <div style={{ width, height: 1, background: GOLD, opacity: 0.4 }} />;
}

function ThinBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "14px 32px", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase",
        color: GOLD, background: "transparent", border: `1px solid ${GOLD}`,
        cursor: "pointer", fontWeight: 500, transition: "all 0.25s", fontFamily: "'Poppins', sans-serif",
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(201,169,97,0.08)"; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "14px 32px", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase",
        color: "rgba(244,236,216,0.7)", background: "transparent", border: "1px solid rgba(244,236,216,0.25)",
        cursor: "pointer", fontWeight: 500, transition: "all 0.25s", fontFamily: "'Poppins', sans-serif",
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(244,236,216,0.06)"; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function ConciergeCTA({ onOpen }: { onOpen: () => void }) {
  return (
    <div style={{ marginTop: 40, padding: "28px 32px", border: "1px solid rgba(201,169,97,0.40)", background: "rgba(201,169,97,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
      <div>
        <p style={{ fontSize: 9, color: "rgba(201,169,97,0.75)", letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "'Poppins', sans-serif" }}>EP Concierge</p>
        <p style={{ fontSize: 15, color: IVORY, margin: "0 0 4px", fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400 }}>Let us arrange it.</p>
        <p style={{ fontSize: 13, color: "rgba(244,236,216,0.65)", margin: 0, fontFamily: "'Poppins', sans-serif" }}>Drop your number — we'll call you back.</p>
      </div>
      <button
        onClick={() => { trackFunnelEvent('cta_click', '/iamher/stay', { cta: 'talk_to_concierge' }); onOpen(); }}
        style={{ padding: "12px 24px", background: "transparent", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 10, letterSpacing: "0.26em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Poppins', sans-serif", transition: "all 0.2s", whiteSpace: "nowrap" }}
      >
        Talk to the Concierge →
      </button>
    </div>
  );
}

// ════════════════════════════════════════
//  CONCIERGE MODAL
// ════════════════════════════════════════
function ConciergeModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    staying_over: "", nights: "",
    who_coming: "", group_size: "",
    children_ages: "", help_needed: [] as string[],
    best_time_to_call: "", consent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleHelp = (opt: string) => {
    setForm(f => ({ ...f, help_needed: f.help_needed.includes(opt) ? f.help_needed.filter(h => h !== opt) : [...f.help_needed, opt] }));
  };
  const canSubmit = form.name.trim() && form.phone.trim() && form.consent;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/event-august/concierge-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, group_size: form.group_size ? parseInt(form.group_size) : undefined, website: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 0", fontSize: 14, background: "transparent",
    border: "none", borderBottom: "1px solid rgba(201,169,97,0.15)",
    color: IVORY, outline: "none", fontFamily: "'Poppins', sans-serif",
    boxSizing: "border-box",
  };
  const sel: React.CSSProperties = { ...inp, cursor: "pointer" };
  const lbl: React.CSSProperties = {
    fontSize: 10, color: "rgba(201,169,97,0.65)", letterSpacing: "0.24em",
    textTransform: "uppercase", display: "block", marginBottom: 6, fontFamily: "'Poppins', sans-serif",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 480, height: "100vh", background: "#330311", borderLeft: "1px solid rgba(201,169,97,0.12)", overflowY: "auto", padding: "40px 36px 60px", boxSizing: "border-box" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "rgba(244,236,216,0.55)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        {done ? (
          <div style={{ paddingTop: 80, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, border: `1px solid ${GOLD}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <span style={{ color: GOLD, fontSize: 22 }}>{"\u2713"}</span>
            </div>
            <p style={{ fontSize: 10, color: "rgba(201,169,97,0.75)", letterSpacing: "0.32em", textTransform: "uppercase", margin: "0 0 14px", fontFamily: "'Poppins', sans-serif" }}>Request received</p>
            <h2 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: 26, color: IVORY, margin: "0 0 20px", lineHeight: 1.25 }}>Thank you — your request is with the EP Concierge.</h2>
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.75)", lineHeight: 1.8, margin: "0 0 36px", fontFamily: "'Poppins', sans-serif" }}>
              We'll be in touch at your preferred time to help you plan your perfect Milton Keynes weekend.
            </p>
            <button onClick={onClose} style={{ padding: "13px 28px", background: "transparent", border: "1px solid rgba(201,169,97,0.65)", color: GOLD, fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p style={{ fontSize: 10, color: "rgba(201,169,97,0.65)", letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "'Poppins', sans-serif" }}>EP Concierge</p>
            <h2 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: 24, color: IVORY, margin: "0 0 8px", lineHeight: 1.25 }}>Making a weekend of it?</h2>
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.65)", margin: "0 0 36px", lineHeight: 1.7, fontFamily: "'Poppins', sans-serif" }}>
              Drop your number and tell us what you need. A concierge will call you back at your preferred time.
            </p>
            <div style={{ display: "grid", gap: 24 }}>
              <div>
                <span style={lbl}>Full name *</span>
                <input style={inp} placeholder="Your name" value={form.name} onChange={e => set("name", e.target.value)} required />
              </div>
              <div>
                <span style={lbl}>Phone / WhatsApp *</span>
                <input style={inp} placeholder="+44 7..." type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} required />
              </div>
              <div>
                <span style={lbl}>Email (optional — for confirmation)</span>
                <input style={inp} placeholder="you@example.com" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div>
                <span style={lbl}>Staying over?</span>
                <select style={{ ...sel, background: "#330311" }} value={form.staying_over} onChange={e => set("staying_over", e.target.value)}>
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No — just the event</option>
                  <option value="maybe">Not sure yet</option>
                </select>
              </div>
              {form.staying_over === "yes" && (
                <div>
                  <span style={lbl}>Number of nights</span>
                  <select style={{ ...sel, background: "#330311" }} value={form.nights} onChange={e => set("nights", e.target.value)}>
                    <option value="">Select…</option>
                    <option value="1">1 night</option>
                    <option value="2">2 nights</option>
                    <option value="3+">3+ nights</option>
                  </select>
                </div>
              )}
              <div>
                <span style={lbl}>Who's coming with you?</span>
                <select style={{ ...sel, background: "#330311" }} value={form.who_coming} onChange={e => set("who_coming", e.target.value)}>
                  <option value="">Select…</option>
                  <option value="Just me">Just me</option>
                  <option value="Friends or colleagues">Friends or colleagues</option>
                  <option value="Partner">Partner</option>
                  <option value="Family with children">Family with children</option>
                </select>
              </div>
              <div>
                <span style={lbl}>Number in your group</span>
                <input style={inp} placeholder="e.g. 4" type="number" min={1} max={50} value={form.group_size} onChange={e => set("group_size", e.target.value)} />
              </div>
              {form.who_coming === "Family with children" && (
                <div>
                  <span style={lbl}>Children &amp; ages (optional)</span>
                  <input style={inp} placeholder="e.g. 5, 8, 12" value={form.children_ages} onChange={e => set("children_ages", e.target.value)} />
                </div>
              )}
              <div>
                <span style={lbl}>What can we help with? (select all that apply)</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {HELP_OPTIONS.map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                      <div
                        onClick={() => toggleHelp(opt)}
                        style={{ width: 18, height: 18, border: `1px solid ${form.help_needed.includes(opt) ? GOLD : "rgba(201,169,97,0.50)"}`, background: form.help_needed.includes(opt) ? "rgba(201,169,97,0.15)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        {form.help_needed.includes(opt) && <span style={{ color: GOLD, fontSize: 11 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, color: form.help_needed.includes(opt) ? IVORY : "rgba(244,236,216,0.70)", fontFamily: "'Poppins', sans-serif" }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span style={lbl}>Best time to call</span>
                <select style={{ ...sel, background: "#330311" }} value={form.best_time_to_call} onChange={e => set("best_time_to_call", e.target.value)}>
                  <option value="">Any time</option>
                  <option value="Morning (9am–12pm)">Morning (9am–12pm)</option>
                  <option value="Afternoon (12pm–5pm)">Afternoon (12pm–5pm)</option>
                  <option value="Evening (5pm–8pm)">Evening (5pm–8pm)</option>
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <div onClick={() => set("consent", !form.consent)} style={{ width: 18, height: 18, border: `1px solid ${form.consent ? GOLD : "rgba(201,169,97,0.50)"}`, background: form.consent ? "rgba(201,169,97,0.15)" : "transparent", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {form.consent && <span style={{ color: GOLD, fontSize: 11 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: "rgba(244,236,216,0.65)", lineHeight: 1.7, fontFamily: "'Poppins', sans-serif" }}>
                  I'd like the EP Concierge to contact me about my visit. I understand my details will be used to help plan my trip and are processed by Event Perfekt Global Ltd — not added to any marketing list. *
                </span>
              </label>
            </div>
            {error && <p style={{ fontSize: 12, color: "#f87171", margin: "20px 0 0", fontFamily: "'Poppins', sans-serif" }}>{error}</p>}
            <button type="submit" disabled={!canSubmit || submitting} style={{ width: "100%", marginTop: 32, padding: "16px", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", background: "transparent", border: `1px solid ${canSubmit ? GOLD : "rgba(201,169,97,0.40)"}`, color: canSubmit ? GOLD : "rgba(201,169,97,0.50)", cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "'Poppins', sans-serif", transition: "all 0.2s" }}>
              {submitting ? "Sending…" : "Request a call →"}
            </button>
            <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "20px 0 0", lineHeight: 1.7, fontFamily: "'Poppins', sans-serif", textAlign: "center" }}>
              Your phone number is stored securely and never shared or displayed publicly.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  HERO
// ════════════════════════════════════════
function HeroSection({ openConcierge, scrollToWeekend }: { openConcierge: () => void; scrollToWeekend: () => void }) {
  return (
    <div style={{ position: "relative", height: "min(100vh, 800px)", overflow: "hidden", background: INK }}>
      <img src={IMG.hero} alt="Milton Keynes city at dusk" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 60%" }} loading="eager" />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
        <motion.div {...fadeUp}>
          <SectionLabel>Stay &amp; Explore</SectionLabel>
        </motion.div>
        <motion.h1 {...fadeUp} transition={{ duration: 1, delay: 0.1 }} style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(36px, 6vw, 72px)", color: IVORY, margin: "0 0 20px", lineHeight: 1.1, letterSpacing: "-0.02em", maxWidth: 800 }}>
          Turn the evening into a weekend.
        </motion.h1>
        <motion.p {...fadeUp} transition={{ duration: 0.9, delay: 0.2 }} style={{ fontSize: "clamp(14px, 1.8vw, 18px)", color: "rgba(244,236,216,0.85)", lineHeight: 1.75, maxWidth: 520, margin: "0 0 16px", fontFamily: "'Poppins', sans-serif", fontWeight: 300 }}>
          Coming to <strong>The Woman Who Leads The Room</strong>? Stay over, bring someone with you, and let the EP Concierge help you shape your Milton Keynes weekend.
        </motion.p>
        <motion.p {...fadeUp} transition={{ duration: 0.9, delay: 0.3 }} style={{ fontSize: "clamp(13px, 1.5vw, 16px)", color: "rgba(244,236,216,0.70)", lineHeight: 1.8, maxWidth: 520, margin: "0 0 40px", fontFamily: "'Poppins', sans-serif", fontWeight: 300 }}>
          You’re already coming for the room. Why not stay for the weekend?
        </motion.p>
        <motion.div {...fadeUp} transition={{ duration: 0.8, delay: 0.4 }} style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <ThinBtn onClick={openConcierge}>Talk to the EP Concierge →</ThinBtn>
          <GhostBtn onClick={scrollToWeekend}>View Weekend Ideas</GhostBtn>
        </motion.div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  CIVIC LINE
// ════════════════════════════════════════
function CivicLine() {
  return (
    <section style={{ padding: "60px 0", background: "rgba(51,3,17,0.30)" }}>
      <div className="stay-container">
        <motion.p {...fadeUp} style={{ fontSize: "clamp(14px, 1.4vw, 17px)", color: "rgba(244,236,216,0.80)", lineHeight: 1.75, maxWidth: 720, textAlign: "center", margin: "0 auto", fontWeight: 300, fontStyle: "italic" }}>
          Hosted in Milton Keynes, <strong>The Woman Who Leads The Room</strong> is designed to bring accomplished women from across the UK into the city — supporting hotels, restaurants, retail, cultural attractions and the wider visitor economy.
        </motion.p>
      </div>
    </section>
  );
}

// ════════════════════════════════════════
//  SECTION HERO IMAGE
// ════════════════════════════════════════
function SectionHero({ src, alt, overlay }: { src: string; alt: string; overlay?: string }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "clamp(280px, 40vw, 520px)", overflow: "hidden", marginBottom: 48 }}>
      <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
      <div style={{ position: "absolute", inset: 0, background: overlay || "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%)" }} />
    </div>
  );
}

// ════════════════════════════════════════
//  ATTRACTION CARD
// ════════════════════════════════════════
function AttractionCard({ img, alt, title, body, link }: { img: string; alt: string; title: string; body: string; link?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,169,97,0.1)", overflow: "hidden" }}>
      <div style={{ width: "100%", height: 220, overflow: "hidden" }}>
        <img src={img} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.6s ease" }} />
      </div>
      <div style={{ padding: "22px 24px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: 12, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "'Poppins', sans-serif" }}>{title}</p>
        <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", margin: "0 0 18px", lineHeight: 1.75, fontFamily: "'Poppins', sans-serif", flex: 1 }}>{body}</p>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "rgba(201,169,97,0.85)", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", fontFamily: "'Poppins', sans-serif", borderBottom: "1px solid rgba(201,169,97,0.40)", paddingBottom: 2, display: "inline-block", width: "fit-content" }}>
            Visit website →
          </a>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════
export default function IAmHerStay() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Stay & Explore Milton Keynes | I Am Her — The Woman Who Leads the Room",
    description: "Turn your ticket into a weekend. Discover Milton Keynes — hotels, adventure, shopping, wellness, culture, dining. Let the EP Concierge plan your stay.",
    url: "https://eventperfekt.net/iamher/stay",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Stay & Explore Milton Keynes — Turn your I Am Her ticket into a weekend",
  });
  useVisitorTracking("/iamher/stay", "Stay & Explore | I Am Her");
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const openConcierge = () => setConciergeOpen(true);

  const scrollToWeekend = () => {
    const el = document.getElementById("weekend-experiences");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .stay-grid-2 { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 640px) { .stay-grid-2 { grid-template-columns: 1fr 1fr; } }
        .stay-grid-3 { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 640px) { .stay-grid-3 { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 960px) { .stay-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }
        .stay-grid-4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (min-width: 640px) { .stay-grid-4 { grid-template-columns: repeat(3, 1fr); gap: 18px; } }
        @media (min-width: 960px) { .stay-grid-4 { grid-template-columns: repeat(4, 1fr); gap: 20px; } }
        .stay-container { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
        @media (min-width: 640px) { .stay-container { padding: 0 36px; } }
        select option { background: #330311; color: #F4ECD8; }
        input::placeholder { color: rgba(244,236,216,0.38); }
      `}</style>

      <IamherMobileNav
        logo={eventPerfektLogo}
        maxWidth={1100}
        headerPadding="14px 32px"
        links={[
          { label: "About", href: "/about-the-movement" },
          { label: "The Evening", href: "/iamher" },
          { label: "Stay & Explore", href: "/iamher/stay", active: true },
          { label: "Apply for Your Invitation", href: "/access" },
        ]}
      />

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <HeroSection openConcierge={openConcierge} scrollToWeekend={scrollToWeekend} />
      <CivicLine />

      {/* ── 2. WHY STAY IN MILTON KEYNES? ─────────────────────────── */}
      <section style={{ padding: "100px 0" }}>
        <div className="stay-container">
          <motion.div {...fadeUp}>
            <SectionLabel>Why stay?</SectionLabel>
            <h2 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(28px, 4vw, 40px)", color: IVORY, margin: "0 0 24px", lineHeight: 1.15, letterSpacing: "-0.01em" }}>
              Why stay in Milton Keynes?
            </h2>
            <p style={{ fontSize: "clamp(14px, 1.4vw, 16px)", color: "rgba(244,236,216,0.85)", lineHeight: 1.85, margin: "0 0 32px", fontWeight: 300, maxWidth: 640 }}>
              Milton Keynes is easy to reach, simple to navigate, and built for a weekend stay. With fast train links from London, strong road access, premium hotels, shopping, restaurants, green spaces and family-friendly attractions, it gives guests a reason to arrive earlier, stay over and make more of the experience.
            </p>
            <div style={{ display: "grid", gap: 14, maxWidth: 540 }}>
              {[
                "London Euston to Milton Keynes Central in around 30 minutes",
                "Hotels close to central Milton Keynes",
                "Shopping, beauty, dining and nightlife nearby",
                "Green space, family attractions and weekend activities",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(244,236,216,0.75)", fontWeight: 300 }}>
                  <span style={{ width: 20, height: 1, background: GOLD, flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 3. EP CONCIERGE ───────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ position: "relative", overflow: "hidden", minHeight: "clamp(400px, 50vw, 560px)", display: "flex", alignItems: "center" }}>
          <img src={IMG.concierge} alt="EP Concierge" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.35) 100%)" }} />
          <div className="stay-container" style={{ position: "relative", padding: "80px 36px" }}>
            <motion.div {...fadeUp}>
              <SectionLabel>EP Concierge</SectionLabel>
              <h2 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(28px, 4vw, 44px)", color: IVORY, margin: "0 0 24px", lineHeight: 1.15 }}>
                Need help planning the weekend?
              </h2>
              <div style={{ maxWidth: 540, margin: "0 0 32px" }}>
                <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.85, margin: "0 0 12px", fontWeight: 300 }}>
                  Travelling in? Bringing someone with you? Planning a group stay? The EP Concierge can help with hotel options, group stay enquiries, restaurant ideas, beauty appointments, spa recommendations, family-friendly plans and local introductions.
                </p>
              </div>
              <ThinBtn onClick={openConcierge}>Talk to the EP Concierge →</ThinBtn>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 4. WHERE TO STAY ───────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div className="stay-container">
          <motion.div {...fadeUp}>
            <SectionLabel>Where to stay</SectionLabel>
            <h2 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(28px, 4vw, 40px)", color: IVORY, margin: "0 0 16px", lineHeight: 1.15 }}>
              Stay close. Stay comfortable. Stay longer.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.85, maxWidth: 620, margin: "0 0 40px", fontWeight: 300 }}>
              For guests travelling from outside Milton Keynes, staying over makes the evening easier, calmer and more enjoyable. Choose a hotel close to central Milton Keynes, wake up slowly, and make the most of the Bank Holiday weekend.
            </p>
          </motion.div>
          <div className="stay-grid-3" style={{ marginBottom: 32 }}>
            <motion.div {...fadeUp}>
              <AttractionCard
                img={IMG.leonardo}
                alt="Leonardo Hotel Milton Keynes"
                title="Leonardo Hotel"
                body="Contemporary city hotel with stylish rooms, premium dining, and a relaxed, modern atmosphere."
                link="https://www.leonardo-hotels.co.uk/milton-keynes"
              />
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.1 }}>
              <AttractionCard
                img={IMG.premier}
                alt="Premier Inn Milton Keynes Central"
                title="Premier Inn"
                body="Affordable and convenient for guests who want a simple overnight stay. Comfortable rooms, straightforward service."
                link="https://www.premierinn.com/"
              />
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.2 }}>
              <AttractionCard
                img={IMG.hotelLaTour}
                alt="Hotel La Tour Milton Keynes"
                title="Hotel La Tour"
                body="Premium city hotel with Fourteen Sky Bar & Restaurant. The elevated choice for the weekend you deserve."
                link="https://www.hotel-latour.co.uk/"
              />
            </motion.div>
          </div>
          <motion.div {...fadeUp} style={{ textAlign: "center", marginTop: 32 }}>
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.60)", fontWeight: 300, lineHeight: 1.7 }}>
              Guest stay options and local recommendations will be shared with confirmed guests.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 5. 48 HOURS IN MILTON KEYNES ─────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div className="stay-container">
          <motion.div {...fadeUp}>
            <SectionLabel>48 Hours in Milton Keynes</SectionLabel>
            <h2 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(28px, 4vw, 40px)", color: IVORY, margin: "0 0 18px", lineHeight: 1.15, letterSpacing: "-0.01em" }}>
              Turn one evening into a Bank Holiday weekend.
            </h2>
          </motion.div>

          {/* FRIDAY */}
          <motion.div {...fadeUp} style={{ marginBottom: 48 }}>
            <div style={{ border: "1px solid rgba(201,169,97,0.12)", overflow: "hidden" }}>
              <div style={{ height: 320, overflow: "hidden" }}>
                <img src={IMG.friday} alt="Friday evening cocktails" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ padding: isMobile ? "20px 16px" : "32px 28px", background: "rgba(201,169,97,0.02)" }}>
                <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>Friday</p>
                <h3 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: 26, color: IVORY, margin: "0 0 18px", lineHeight: 1.2 }}>Arrive, check in, attend The Woman Who Leads The Room, then continue the evening with cocktails or quiet conversation.</h3>
              </div>
            </div>
          </motion.div>

          {/* SATURDAY */}
          <motion.div {...fadeUp} style={{ marginBottom: 48 }}>
            <div style={{ border: "1px solid rgba(201,169,97,0.12)", overflow: "hidden" }}>
              <div style={{ height: 320, overflow: "hidden" }}>
                <img src={IMG.saturday} alt="Saturday brunch and shopping" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ padding: isMobile ? "20px 16px" : "32px 28px", background: "rgba(201,169,97,0.02)" }}>
                <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>Saturday</p>
                <h3 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: 26, color: IVORY, margin: "0 0 18px", lineHeight: 1.2 }}>Slow brunch, shopping, beauty, spa treatments, dinner or a girls’ weekend plan.</h3>
              </div>
            </div>
          </motion.div>

          {/* SUNDAY */}
          <motion.div {...fadeUp} style={{ marginBottom: 40 }}>
            <div style={{ border: "1px solid rgba(201,169,97,0.12)", overflow: "hidden" }}>
              <div style={{ height: 320, overflow: "hidden" }}>
                <img src={IMG.sunday} alt="Sunday at Willen Lake" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ padding: isMobile ? "20px 16px" : "32px 28px", background: "rgba(201,169,97,0.02)" }}>
                <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>Sunday</p>
                <h3 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: 26, color: IVORY, margin: "0 0 18px", lineHeight: 1.2 }}>Willen Lake, Bletchley Park, family attractions, a slow reset, then travel home.</h3>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 6. KEY WEEKEND EXPERIENCES ────────────────────────────────────────────── */}
      <section id="weekend-experiences" style={{ padding: "0 0 100px" }}>
        <div className="stay-container">
          <motion.div {...fadeUp}>
            <SectionLabel>Key weekend experiences</SectionLabel>
            <h2 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(28px, 4vw, 40px)", color: IVORY, margin: "0 0 40px", lineHeight: 1.15 }}>
              What to do while you are here.
            </h2>
          </motion.div>

          {/* Adventure & Energy */}
          <motion.div {...fadeUp} style={{ marginBottom: 64 }}>
            <h3 style={{ fontSize: 14, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 24px", fontWeight: 500 }}>Adventure &amp; Energy</h3>
            <div className="stay-grid-2" style={{ marginBottom: 0 }}>
              <AttractionCard img={IMG.snozone} alt="Snozone" title="Snozone" body="The UK’s longest indoor real snow slope. Ski, snowboard, or sled." link="https://snozoneuk.com/" />
              <AttractionCard img={IMG.xscape} alt="Xscape" title="Xscape" body="Entertainment, dining, cinema and indoor adventure under one roof." link="https://www.xscapemiltonkeynes.co.uk/" />
              <AttractionCard img={IMG.ifly} alt="iFLY" title="iFLY Indoor Skydiving" body="Real freefall, zero risk. A bold experience for women who want to do something unforgettable." link="https://www.iflyworld.co.uk/locations/ifly-milton-keynes/" />
              <AttractionCard img={IMG.escape} alt="Escape Hunt" title="Escape Hunt" body="Escape rooms and group challenges for friends, colleagues and teams." link="https://escapehunt.com/uk/milton-keynes/" />
            </div>
          </motion.div>

          {/* Shopping & Beauty */}
          <motion.div {...fadeUp} style={{ marginBottom: 64 }}>
            <h3 style={{ fontSize: 14, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 24px", fontWeight: 500 }}>Shopping &amp; Beauty</h3>
            <div className="stay-grid-2" style={{ marginBottom: 0 }}>
              <AttractionCard img={IMG.hbeautyDisplay} alt="H Beauty" title="H Beauty &amp; Champagne Bar" body="Harrods beauty concept at centre:mk. Skincare, makeup, fragrance and champagne." link="https://www.hbeauty.co.uk/" />
              <AttractionCard img={IMG.centremk} alt="centre:mk" title="centre:mk" body="Major shopping destination with fashion, lifestyle, beauty and dining." link="https://www.centremk.com/" />
            </div>
          </motion.div>

          {/* Green Space & Wellness */}
          <motion.div {...fadeUp} style={{ marginBottom: 64 }}>
            <h3 style={{ fontSize: 14, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 24px", fontWeight: 500 }}>Green Space &amp; Wellness</h3>
            <div className="stay-grid-3" style={{ marginBottom: 0 }}>
              <div style={{ border: "1px solid rgba(201,169,97,0.1)", background: "rgba(201,169,97,0.02)", overflow: "hidden" }}>
                <div style={{ width: "100%", height: 160, overflow: "hidden" }}>
                  <img src={IMG.willenPeace} alt="Willen Lake" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "24px 28px" }}>
                  <p style={{ fontSize: 12, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 14px" }}>Willen Lake</p>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.75, margin: 0, fontWeight: 300 }}>Watersports, paddleboarding, lakeside walks and cafés.</p>
                  <a href="https://www.willenlake.org.uk/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "rgba(201,169,97,0.85)", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", borderBottom: "1px solid rgba(201,169,97,0.40)", paddingBottom: 2, display: "inline-block", marginTop: 18, width: "fit-content" }}>Visit website →</a>
                </div>
              </div>
              <div style={{ border: "1px solid rgba(201,169,97,0.1)", background: "rgba(201,169,97,0.02)", overflow: "hidden" }}>
                <div style={{ width: "100%", height: 160, overflow: "hidden" }}>
                  <img src={IMG.campbell} alt="Campbell Park" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "24px 28px" }}>
                  <p style={{ fontSize: 12, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 14px" }}>Campbell Park</p>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.75, margin: 0, fontWeight: 300 }}>A beautiful city park close to central Milton Keynes. Ideal for a morning walk or quiet reset.</p>
                </div>
              </div>
              <div style={{ border: "1px solid rgba(201,169,97,0.1)", background: "rgba(201,169,97,0.02)", overflow: "hidden" }}>
                <div style={{ width: "100%", height: 160, overflow: "hidden" }}>
                  <img src={IMG.spa} alt="Spa" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "24px 28px" }}>
                  <p style={{ fontSize: 12, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 14px" }}>Spa &amp; Treatments</p>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.75, margin: 0, fontWeight: 300 }}>Y Spa at Wyboston Lakes and Bannatyne Spa offer luxury treatments and deep relaxation.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Culture & Curiosity */}
          <motion.div {...fadeUp} style={{ marginBottom: 64 }}>
            <h3 style={{ fontSize: 14, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 24px", fontWeight: 500 }}>Culture &amp; Curiosity</h3>
            <div className="stay-grid-2" style={{ marginBottom: 0 }}>
              <AttractionCard img={IMG.bletchley} alt="Bletchley Park" title="Bletchley Park" body="The world-famous home of the World War Two Codebreakers." link="https://www.bletchleypark.org.uk/" />
              <AttractionCard img={IMG.theatre} alt="Milton Keynes Theatre" title="Milton Keynes Theatre" body="Major regional theatre offering drama, musicals, comedy and live performances." link="https://www.atgtickets.com/venues/milton-keynes-theatre/" />
            </div>
          </motion.div>

          {/* Dining & After Hours */}
          <motion.div {...fadeUp} style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: 14, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 24px", fontWeight: 500 }}>Dining &amp; After Hours</h3>
            <div className="stay-grid-3" style={{ marginBottom: 0 }}>
              {[
                { name: "Fourteen Sky Bar", tag: "Hotel La Tour", desc: "The rooftop bar with views over the city. Elevated and elegant." },
                { name: "The Alchemist", tag: "Cocktails & theatre", desc: "Molecular cocktails and theatrical presentation." },
                { name: "Parrilla", tag: "Argentinian steakhouse", desc: "Open-fire grilled steaks and a buzzy atmosphere." },
                { name: "The Oligarch", tag: "Steakhouse & cocktails", desc: "Stylish steakhouse. Great for a celebration dinner." },
                { name: "Cosy Club", tag: "Morning-after brunch", desc: "Relaxed brunch inside centre:mk. Good coffee, no rush." },
              ].map((r, i) => (
                <motion.div key={r.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }}>
                  <div style={{ border: "1px solid rgba(201,169,97,0.1)", background: "rgba(201,169,97,0.02)", padding: "28px 24px" }}>
                    <p style={{ fontSize: 14, color: IVORY, margin: "0 0 6px", fontWeight: 400 }}>{r.name}</p>
                    <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 14px" }}>{r.tag}</p>
                    <p style={{ fontSize: 13, color: "rgba(244,236,216,0.75)", lineHeight: 1.75, margin: 0, fontWeight: 300 }}>{r.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 8. WANT TO BE FEATURED? ───────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div className="stay-container">
          <motion.div {...fadeUp}>
            <div style={{ border: "1px solid rgba(201,169,97,0.12)", background: "rgba(201,169,97,0.02)", padding: "40px 36px", textAlign: "center" }}>
              <SectionLabel>For local businesses</SectionLabel>
              <h2 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(26px, 3.5vw, 36px)", color: IVORY, margin: "0 0 20px", lineHeight: 1.15 }}>
                Want to be featured in the weekend guide?
              </h2>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.85, maxWidth: 620, margin: "0 auto 28px", fontWeight: 300 }}>
                We are curating selected hotels, restaurants, beauty destinations, wellness providers and experiences for guests attending <strong>The Woman Who Leads The Room</strong>. If your business helps visitors stay longer, explore more or experience Milton Keynes at its best, we would be open to hearing from you.
              </p>
              <Link href="/iamher/feature-your-business">
                <a style={{ background: "transparent", border: `1px solid ${GOLD}`, color: GOLD, padding: "14px 32px", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Poppins', sans-serif", transition: "all 0.3s ease", textDecoration: "none", display: "inline-block" }}>
                  Feature Your Business →
                </a>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 9. FINAL EP CONCIERGE CTA ───────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div className="stay-container">
          <motion.div {...fadeUp} style={{ textAlign: "center" }}>
            <h2 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(28px, 4vw, 40px)", color: IVORY, margin: "0 0 20px", lineHeight: 1.15 }}>
              Make the weekend easier.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.85, maxWidth: 540, margin: "0 auto 32px", fontWeight: 300 }}>
              Tell us what you need help with and the EP Concierge will help you plan the details around your visit.
            </p>
            <ThinBtn onClick={openConcierge}>Talk to the EP Concierge →</ThinBtn>
          </motion.div>
        </div>
      </section>

      {/* ── 10. VISITOR ECONOMY NOTE ───────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 80px" }}>
        <div className="stay-container">
          <motion.div {...fadeUp}>
            <div style={{ border: "1px solid rgba(201,169,97,0.08)", background: "rgba(201,169,97,0.02)", padding: "32px 36px" }}>
              <SectionLabel>Supporting the local visitor economy</SectionLabel>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.75)", lineHeight: 1.85, margin: "12px 0 0", maxWidth: 720, fontWeight: 300 }}>
                <strong>The Woman Who Leads The Room</strong> brings women from across the UK into Milton Keynes, encouraging overnight stays, restaurant bookings, retail spend, attraction visits and wider engagement with the city. By positioning the event as a weekend destination experience, we are showcasing Milton Keynes as a place for leadership, business, wellbeing, lifestyle and opportunity.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 11. FOOTER ─────────────────────────────────────────────────────────────────────────────────────── */}
      <footer style={{ padding: isMobile ? "16px 16px" : "24px 36px", borderTop: "1px solid rgba(244,236,216,0.05)", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", letterSpacing: "0.08em", margin: 0, fontFamily: "'Poppins', sans-serif" }}>
          An initiative by Event Perfekt Global Ltd.
        </p>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "8px 0 0", letterSpacing: "0.06em", fontFamily: "'Poppins', sans-serif" }}>
          <Link to="/privacy-policy" style={{ color: "rgba(244,236,216,0.75)", textDecoration: "none" }}>Privacy Policy</Link>
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

      {/* Floating concierge button */}
      <button
        onClick={openConcierge}
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500, padding: "14px 22px", background: BURG, border: `1px solid rgba(201,169,97,0.65)`, color: GOLD, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Poppins', sans-serif", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
      >
        EP Concierge →
      </button>

      {conciergeOpen && <ConciergeModal onClose={() => setConciergeOpen(false)} />}

      <EmailCapturePopup
        page="/iamher/stay"
        variant="iamher"
        delayMs={25000}
        storageKey="ep_stay_email"
        headline="Not ready to request your place? Leave your email and enter the draw."
        subheadline="You'll be entered to win a complimentary invitation or a professional editorial portrait. One lucky woman on our list. Draw is live."
        offer="Win: a complimentary invitation or a professional editorial portrait."
        cta="Enter my email"
        gift="complimentary invitation or editorial portrait"
      />
    </div>
  );
}
