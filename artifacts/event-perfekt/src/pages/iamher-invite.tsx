import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { QrCode } from "lucide-react";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function darken(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function lighten(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.min(255, parseInt(c.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(c.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(c.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

type Stage = "float" | "land" | "flapOpen" | "cardRise" | "cardFly" | "reveal";

export default function IAmHerInvite() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Your Invitation | I Am Her — The Woman Who Leads the Room",
    description: "Your personal invitation to I Am Her: The Woman Who Leads the Room. 30 October 2026, Milton Keynes. A private, invitation-only evening for accomplished women.",
    url: "https://eventperfekt.net/iamher/invite",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Your personal invitation to I Am Her: The Woman Who Leads the Room, 30 October 2026, Milton Keynes",
  });
  useVisitorTracking("/iamher/invite", "Your Invitation | I Am Her — The Woman Who Leads the Room");
  const search = useSearch();
  const token = new URLSearchParams(search).get("token");
  const [, setLocation] = useLocation();
  const scrollTargetRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<Stage>("float");
  const [clink, setClink] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [guest, setGuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);

  const inv = {
    headerText: "The Woman Who Leads the Room",
    hostNames: "EVENT PERFEKT",
    bodyText: "You are warmly invited to a private, invitation-only evening for accomplished women. A curated gathering of 100 carefully selected women from across business, healthcare, finance, the arts and public life.",
    dateText: "Friday, 30 October 2026",
    timeText: "6:30pm — 10:00pm",
    venueText: "LaTour Hotel, Milton Keynes",
    dressCode: "Elegant Evening",
    envelopeColor: "#330311",
    accentColor: "#8B1538",
    textColor: "#330311",
    backgroundColor: "#fffaf5",
    fontFamily: "'Poppins', sans-serif",
    waxSealEnabled: true,
    waxSealMonogram: "EP",
    foilShimmerEnabled: true,
    rsvpDeadline: "16 September 2026",
    footerText: "Kindly respond by",
    includeQrCode: true,
  };

  const envColor = inv.envelopeColor;
  const accentColor = inv.accentColor;
  const light = isLightColor(envColor);
  const envDark = darken(envColor, 35);
  const envLight = lighten(envColor, 25);
  const textColor = light ? "#111" : "#fff";
  const textSub = light ? "#333c" : "#ffffffcc";
  const textMuted = light ? "#6668" : "#ffffff60";
  const linerColor = isLightColor(envColor) ? darken(envColor, 15) : lighten(envColor, 45);

  useEffect(() => {
    if (!token) { setError("No invitation token found."); setLoading(false); return; }
    fetch(`/api/event-august/invite?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) { setError(data.message || "Invalid invitation"); setLoading(false); return; }
        setGuest(data.guest);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load invitation."); setLoading(false); });
  }, [token]);

  useEffect(() => {
    if (!loading && !error) {
      const t1 = setTimeout(() => setStage("land"),      1800);
      const t2 = setTimeout(() => setStage("flapOpen"),   3400);
      const t3 = setTimeout(() => setStage("cardRise"),  5400);
      const t4 = setTimeout(() => setCardVisible(true),  5600);
      const t5 = setTimeout(() => setStage("cardFly"),   7800);
      const t6 = setTimeout(() => setStage("reveal"),    9200);
      const t7 = setTimeout(() => setClink(true),       10200);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); clearTimeout(t7); };
    }
    return undefined;
  }, [loading, error]);

  useEffect(() => {
    if (stage === "reveal" && token) {
      fetch(`/api/event-august/invite-viewed?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
    }
  }, [stage, token]);

  const skipAnimation = () => { setStage("reveal"); setClink(true); };
  const scrollToRsvp = () => scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleRsvp = async (status: string) => {
    if (!token) return;
    setRsvpSubmitting(true);
    try {
      const res = await fetch(`/api/event-august/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, status }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setRsvpSubmitted(true);
    } catch (e) {
      // silently fail
    } finally {
      setRsvpSubmitting(false);
    }
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

    @keyframes envDrop {
      0%   { transform: translateY(-110vh) rotate(-2deg); opacity: 0; }
      60%  { transform: translateY(6px) rotate(0.5deg); opacity: 1; }
      80%  { transform: translateY(-4px) rotate(-0.2deg); }
      100% { transform: translateY(0) rotate(0deg); opacity: 1; }
    }
    @keyframes envFloat {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      40%       { transform: translateY(-8px) rotate(0.4deg); }
      70%       { transform: translateY(-4px) rotate(-0.2deg); }
    }
    @keyframes envFadeOut {
      0%   { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(40px) scale(0.93); opacity: 0; }
    }
    @keyframes flapOpen {
      0%   { transform: rotateX(0deg); }
      100% { transform: rotateX(-178deg); }
    }
    @keyframes cardRise {
      0%   { transform: translateX(-50%) translateY(0); }
      100% { transform: translateX(-50%) translateY(-68%); }
    }
    @keyframes cardFly {
      0%   { transform: translateX(-50%) translateY(-68%) scale(1); opacity: 1; }
      100% { transform: translateX(-50%) translateY(-210%) scale(1.08); opacity: 0; }
    }
    @keyframes cardAppear {
      0%   { transform: translateY(30px) scale(0.96); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes shadowArrive {
      0%   { transform: scaleX(0.2); opacity: 0; }
      100% { transform: scaleX(1); opacity: 0.18; }
    }
    @keyframes shadowFloat {
      0%, 100% { transform: scaleX(1); opacity: 0.15; }
      50%       { transform: scaleX(0.97); opacity: 0.22; }
    }
    @keyframes sealShine {
      0%, 100% { filter: brightness(1) drop-shadow(0 0 0px #d4af3700); }
      50%       { filter: brightness(1.2) drop-shadow(0 0 14px #d4af3780); }
    }
    @keyframes sealBreak {
      0%   { transform: translate(0,0) rotate(0) scale(1); opacity: 1; }
      100% { transform: translate(var(--tx),var(--ty)) rotate(var(--tr)) scale(0.2); opacity: 0; }
    }
    @keyframes foilSweep {
      0%   { transform: translateX(-160%) skewX(-22deg); opacity: 0; }
      15%  { opacity: 0.8; }
      85%  { opacity: 0.6; }
      100% { transform: translateX(160%) skewX(-22deg); opacity: 0; }
    }
    @keyframes glassLeft  { 0% { transform: rotate(0); } 50% { transform: translate(10px,-14px) rotate(-18deg); } 100% { transform: rotate(0); } }
    @keyframes glassRight { 0% { transform: rotate(0); } 50% { transform: translate(-10px,-14px) rotate(18deg); } 100% { transform: rotate(0); } }
    @keyframes spark      { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.4); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
    @keyframes subtleIn   { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }

    .env-drop    { animation: envDrop 1.8s cubic-bezier(0.22,1,0.36,1) forwards; }
    .env-float   { animation: envFloat 5s ease-in-out infinite; }
    .env-fadeout { animation: envFadeOut 1.2s ease-in forwards; }
    .flap-open   { animation: flapOpen 2s cubic-bezier(0.4,0,0.2,1) forwards; transform-origin: top center; }
    .card-rise   { animation: cardRise 2.2s cubic-bezier(0.25,0.8,0.25,1) forwards; }
    .card-fly    { animation: cardFly 1.3s cubic-bezier(0.4,0,1,1) forwards; }
    .card-appear { animation: cardAppear 0.9s cubic-bezier(0.22,1,0.36,1) forwards; }
    .shadow-arrive { animation: shadowArrive 1.4s ease-out forwards; }
    .shadow-float  { animation: shadowFloat 4s ease-in-out infinite; }
    .seal-shine  { animation: sealShine 3s ease-in-out infinite; }
    .foil-bar::after { content:''; position:absolute; inset:0; background: linear-gradient(90deg,transparent,rgba(255,220,120,0.55),rgba(255,255,255,0.75),rgba(255,220,120,0.55),transparent); animation: foilSweep 4.5s ease-in-out 1.2s infinite; pointer-events:none; overflow:hidden; border-radius:inherit; }
    .glass-anim-left  { animation: glassLeft  1.4s ease-in-out 1 forwards; }
    .glass-anim-right { animation: glassRight 1.4s ease-in-out 1 forwards; }
    .spark-anim { animation: spark 0.9s ease-out 1 forwards; }
    .subtle-in  { animation: subtleIn 0.7s ease-out forwards; }
  `;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f5efe8 0%,#e8ddd4 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "2px solid #33031130", borderTopColor: "#330311", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#999", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Poppins', sans-serif" }}>Your invitation is arriving...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f5efe8 0%,#e8ddd4 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <p style={{ color: "#330311", fontSize: 15, marginBottom: 20, fontFamily: "'Poppins', sans-serif" }}>{error}</p>
          <button onClick={() => setLocation("/access")} style={{ background: "#330311", color: "#fff", border: "none", borderRadius: 8, padding: "14px 36px", fontSize: 14, cursor: "pointer", letterSpacing: "0.08em" }}>Apply for Your Invitation</button>
        </div>
      </div>
    );
  }

  const firstName = guest?.first_name || "Guest";

  // ─── ENVELOPE STAGE ─────────────────────────────────────────────────────────
  if (stage !== "reveal") {
    const envW = Math.min(window.innerWidth * 0.88, 640);
    const envH = envW * 0.62;
    const cardW = envW * 0.82;
    const cardH = cardW * 1.4;

    return (
      <div
        style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f5efe8 0%,#e8ddd4 60%,#d8cfc6 100%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", userSelect: "none", position: "relative" }}
        onClick={skipAnimation}
      >
        <style>{CSS}</style>

        {/* Subtle background texture dots */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle,#33031108 1px,transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Ground shadow */}
          <div
            className={stage === "float" ? "shadow-arrive" : "shadow-float"}
            style={{ position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%) scaleX(1)", width: envW * 0.75, height: 18, background: "radial-gradient(ellipse,rgba(0,0,0,0.28) 0%,transparent 70%)", borderRadius: "50%", transformOrigin: "center" }}
          />

          {/* Envelope wrapper */}
          <div
            className={stage === "float" ? "env-drop" : stage === "cardFly" ? "env-fadeout" : "env-float"}
            style={{ position: "relative" }}
          >
            {/* Main envelope body */}
            <div style={{ position: "relative", width: envW, height: envH }}>

              {/* Envelope back body */}
              <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: `linear-gradient(175deg,${envLight} 0%,${envColor} 45%,${envDark} 100%)`, boxShadow: "0 28px 80px rgba(0,0,0,0.28), 0 8px 20px rgba(0,0,0,0.15)" }} />

              {/* Envelope liner (inside, visible when flap lifts) */}
              {(stage === "flapOpen" || stage === "cardRise" || stage === "cardFly") && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "52%", borderRadius: "14px 14px 0 0", overflow: "hidden", zIndex: 2 }}>
                  <div style={{ width: "100%", height: "100%", background: `linear-gradient(180deg, ${linerColor} 0%, ${darken(linerColor, 20)} 100%)`, backgroundImage: `radial-gradient(circle, ${light ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)'} 1.5px, transparent 1.5px)`, backgroundSize: "12px 12px" }} />
                </div>
              )}

              {/* Envelope left & right side flaps (V-shape bottom) */}
              <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", zIndex: 5 }} viewBox={`0 0 ${envW} ${envH * 0.52}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="leftFold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={envDark} />
                    <stop offset="100%" stopColor={envColor} />
                  </linearGradient>
                  <linearGradient id="rightFold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={envColor} />
                    <stop offset="100%" stopColor={envDark} />
                  </linearGradient>
                  <linearGradient id="bottomFold" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={envColor} />
                    <stop offset="100%" stopColor={envDark} />
                  </linearGradient>
                </defs>
                {/* Left triangle */}
                <polygon points={`0,0 ${envW/2},${envH*0.52} ${envW/2},${envH*0.52}`} fill="none" />
                {/* Bottom flap */}
                <polygon points={`0,${envH*0.52} ${envW/2},${envH*0.18} ${envW},${envH*0.52}`} fill="url(#bottomFold)" />
                <line x1="0" y1={envH*0.52} x2={envW/2} y2={envH*0.18} stroke={light?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.08)"} strokeWidth="1" />
                <line x1={envW} y1={envH*0.52} x2={envW/2} y2={envH*0.18} stroke={light?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.08)"} strokeWidth="1" />
              </svg>

              {/* Top flap (animated) */}
              <div
                className={stage === "flapOpen" || stage === "cardRise" || stage === "cardFly" ? "flap-open" : ""}
                style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, transformOrigin: "top center", perspective: "1200px" }}
              >
                <svg viewBox={`0 0 ${envW} ${envH * 0.52}`} style={{ width: envW, display: "block" }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="flapG" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={envLight} />
                      <stop offset="100%" stopColor={envDark} />
                    </linearGradient>
                    <linearGradient id="flapLiner" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor={linerColor} />
                      <stop offset="100%" stopColor={darken(linerColor, 30)} />
                    </linearGradient>
                  </defs>
                  {/* Flap outer */}
                  <polygon points={`0,0 ${envW/2},${envH*0.46} ${envW},0`} fill="url(#flapG)" />
                  {/* Flap liner (reverse face) */}
                  <polygon points={`0,0 ${envW/2},${envH*0.46} ${envW},0`} fill="url(#flapLiner)" opacity="0.35" />
                  <line x1="0" y1="0" x2={envW/2} y2={envH*0.46} stroke={light?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.07)"} strokeWidth="0.8" />
                  <line x1={envW} y1="0" x2={envW/2} y2={envH*0.46} stroke={light?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.07)"} strokeWidth="0.8" />
                </svg>
              </div>

              {/* Card rising from envelope */}
              {(stage === "cardRise" || stage === "cardFly") && (
                <div
                  className={stage === "cardFly" ? "card-fly" : "card-rise"}
                  style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", zIndex: 20, width: cardW }}
                >
                  <div style={{ width: cardW, height: cardH, background: inv.backgroundColor || "#fffaf5", borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 24px", textAlign: "center", fontFamily: "'Poppins', sans-serif" }}>
                    <div style={{ width: 32, height: 1, background: accentColor + "60", marginBottom: 16 }} />
                    {inv.hostNames && <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.32em", color: accentColor, marginBottom: 8 }}>{inv.hostNames}</p>}
                    <h2 style={{ fontSize: Math.max(18, cardW * 0.055), fontWeight: 500, color: accentColor, margin: "0 0 14px", lineHeight: 1.2 }}>{inv.headerText || "You're Invited"}</h2>
                    <div style={{ width: 32, height: 1, background: accentColor + "60", marginBottom: 14 }} />
                    {inv.dateText && <p style={{ fontSize: 12, color: inv.textColor || "#330311", letterSpacing: "0.06em" }}>{inv.dateText}</p>}
                    {inv.venueText && <p style={{ fontSize: 11, color: "#999", marginTop: 6 }}>{inv.venueText}</p>}
                  </div>
                </div>
              )}

              {/* Envelope centre text (when sealed) */}
              {(stage === "float" || stage === "land") && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.36em", color: textSub, fontFamily: "'Poppins', sans-serif", marginBottom: 8 }}>You're Invited</p>
                    <div style={{ width: 48, height: 1, background: light ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: 15, color: textColor, fontFamily: "'Poppins', sans-serif", fontStyle: "italic", letterSpacing: "0.02em" }}>{inv.hostNames || "An exclusive invitation"}</p>
                    <div style={{ width: 48, height: 1, background: light ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)", margin: "10px auto 12px" }} />
                    <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.25em", color: textMuted }}>Tap to open</p>
                  </div>
                </div>
              )}

              {/* Wax seal */}
              {inv.waxSealEnabled !== false && (stage === "float" || stage === "land") && (
                <div className="seal-shine" style={{ position: "absolute", left: "50%", top: envH * 0.38, transform: "translateX(-50%)", zIndex: 40, width: 68, height: 68, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #d44060 0%, #8B1538 50%, #4d0a1f 100%)", boxShadow: "0 6px 20px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.35), inset 0 2px 5px rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f4d77a", fontSize: 14, fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: "0.05em" }}>
                  {inv.waxSealMonogram || "EP"}
                </div>
              )}

              {/* Breaking seal shards */}
              {inv.waxSealEnabled !== false && stage === "flapOpen" && (
                <div style={{ position: "absolute", left: "50%", top: envH * 0.38, transform: "translateX(-50%)", zIndex: 40, width: 68, height: 68 }}>
                  {[
                    { tx: -42, ty: -28, tr: "-100deg" },
                    { tx: 38, ty: -32, tr: "120deg" },
                    { tx: -30, ty: 30, tr: "-50deg" },
                    { tx: 34, ty: 28, tr: "70deg" },
                    { tx: -50, ty: 4, tr: "-140deg" },
                    { tx: 44, ty: 0, tr: "160deg" },
                    { tx: 0, ty: -38, tr: "200deg" },
                  ].map((s, i) => (
                    <div key={i} style={{ position: "absolute", left: 10 + (i % 4) * 12, top: 10 + Math.floor(i / 4) * 18, width: 16, height: 16, background: `radial-gradient(circle at 30% 30%, #d44060, #8B1538 70%, #4d0a1f)`, borderRadius: i % 2 === 0 ? "50% 30% 50% 70%" : "30% 70% 30% 50%", animation: `sealBreak 0.9s cubic-bezier(0.4,0,0.6,1) ${i * 0.04}s forwards`, ["--tx" as any]: `${s.tx}px`, ["--ty" as any]: `${s.ty}px`, ["--tr" as any]: s.tr }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <p style={{ position: "absolute", bottom: 28, left: 0, right: 0, textAlign: "center", color: "#bbb", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>Tap anywhere to skip</p>
      </div>
    );
  }

  /* ─── REVEAL STAGE ───────────────────────────────────────────────────────── */

  const cardBg = inv.backgroundColor || "#fffaf5";
  const cardAccent = accentColor;
  const cardText = inv.textColor || "#330311";
  const fontFamily = inv.fontFamily || "Cormorant Garamond, Georgia, serif";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f5efe8 0%,#e8ddd4 60%,#d8cfc6 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "32px 16px 60px" }}>
      <style>{CSS}</style>

      {/* Invitation card — full portrait, Paperless Post proportions */}
      <div className="card-appear foil-bar" style={{ position: "relative", width: "100%", maxWidth: 500, borderRadius: 16, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.2), 0 12px 30px rgba(0,0,0,0.12)", background: cardBg, fontFamily }}>

        {/* Top decorative bar */}
        <div style={{ height: 6, background: `linear-gradient(90deg, ${darken(cardAccent,20)}, ${cardAccent}, ${darken(cardAccent,20)})` }} />

        {/* Card body */}
        <div style={{ padding: "40px 44px 44px", textAlign: "center" }}>

          {/* Host names / brand */}
          {inv.hostNames && (
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.38em", color: cardAccent, marginBottom: 6 }}>{inv.hostNames}</p>
          )}
          {inv.hostNames && (
            <p style={{ fontSize: 11, letterSpacing: "0.12em", color: cardAccent + "99", marginBottom: 24, fontStyle: "italic" }}>cordially invite you to</p>
          )}

          {/* Ornamental divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, justifyContent: "center" }}>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: `linear-gradient(90deg,transparent,${cardAccent}50)` }} />
            <span style={{ fontSize: 10, color: cardAccent + "80" }}>&#10022;</span>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: `linear-gradient(90deg,${cardAccent}50,transparent)` }} />
          </div>

          {/* Main title */}
          <h1 style={{ fontSize: 38, fontWeight: 400, color: cardAccent, margin: "0 0 20px", lineHeight: 1.18, letterSpacing: "-0.01em" }}>
            {inv.headerText || "You're Invited"}
          </h1>

          {/* Body text */}
          {inv.bodyText && (
            <p style={{ fontSize: 15, color: cardText + "cc", margin: "0 0 26px", lineHeight: 1.7, fontStyle: "italic" }}>{inv.bodyText}</p>
          )}

          {/* Personal greeting */}
          <div style={{ background: "#faf8f5", border: "1px solid #e8e4de", borderRadius: 8, padding: "16px 20px", margin: "0 0 28px" }}>
            <p style={{ fontSize: 12, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>Dear {firstName},</p>
            <p style={{ fontSize: 14, color: "#330311", margin: 0, fontStyle: "italic" }}>Your place is confirmed. We look forward to welcoming you.</p>
          </div>

          {/* Ornamental divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
            <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(90deg,transparent,${cardAccent}30)` }} />
            <span style={{ fontSize: 8, color: cardAccent + "60" }}>&#9670; &#9671; &#9670;</span>
            <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(90deg,${cardAccent}30,transparent)` }} />
          </div>

          {/* Event details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {inv.dateText && (
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${cardAccent}15`, paddingBottom: 10 }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: cardAccent + "80" }}>When</span>
                <span style={{ fontSize: 14, color: cardText, fontWeight: 500 }}>{inv.dateText}</span>
              </div>
            )}
            {inv.timeText && (
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${cardAccent}15`, paddingBottom: 10 }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: cardAccent + "80" }}>Time</span>
                <span style={{ fontSize: 14, color: cardText, fontWeight: 500 }}>{inv.timeText}</span>
              </div>
            )}
            {inv.venueText && (
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${cardAccent}15`, paddingBottom: 10 }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: cardAccent + "80" }}>Where</span>
                <span style={{ fontSize: 14, color: cardText, fontWeight: 500, textAlign: "right", maxWidth: "65%" }}>{inv.venueText}</span>
              </div>
            )}
            {inv.dressCode && (
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${cardAccent}15`, paddingBottom: 10 }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: cardAccent + "80" }}>Dress</span>
                <span style={{ fontSize: 14, color: cardText, fontWeight: 500 }}>{inv.dressCode}</span>
              </div>
            )}
          </div>

          {/* RSVP deadline */}
          {inv.rsvpDeadline && (
            <p style={{ fontSize: 12, color: cardAccent + "80", marginBottom: 24, fontStyle: "italic" }}>
              {inv.footerText || "Kindly respond by"} {inv.rsvpDeadline}
            </p>
          )}

          {/* QR code */}
          {inv.includeQrCode && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div style={{ background: "#fff", padding: 12, borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                <QrCode style={{ width: 72, height: 72, color: cardAccent }} />
              </div>
            </div>
          )}

          {/* Add to Calendar */}
          <a href={`/api/event-august/calendar-invite?token=${token}`} style={{ display: "inline-block", margin: "0 0 14px", padding: "14px 32px", background: cardAccent, color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 50, fontFamily: "Poppins, sans-serif" }}>
            Add to Calendar
          </a>

          {/* RSVP buttons */}
          {!rsvpSubmitted && (
            <div style={{ marginTop: 20, marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 12, fontStyle: "italic" }}>Please confirm your attendance:</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  onClick={() => { trackFunnelEvent('rsvp_accepted', '/iamher/invite', { token: token || 'none' }); handleRsvp("accepted"); }}
                  disabled={rsvpSubmitting}
                  style={{ padding: "12px 28px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 50, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  {rsvpSubmitting ? "..." : "I Will Attend"}
                </button>
                <button
                  onClick={() => { trackFunnelEvent('rsvp_declined', '/iamher/invite', { token: token || 'none' }); handleRsvp("declined"); }}
                  disabled={rsvpSubmitting}
                  style={{ padding: "12px 28px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 50, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  {rsvpSubmitting ? "..." : "Can't Make It"}
                </button>
              </div>
            </div>
          )}

          {rsvpSubmitted && (
            <div style={{ marginTop: 20, marginBottom: 14, padding: "14px 20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
              <p style={{ fontSize: 14, color: "#166534", margin: 0, fontWeight: 500 }}>Thank you for your response!</p>
            </div>
          )}

          <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", margin: "12px 0 8px" }}>The exact venue address will be shared with confirmed guests in the week before the event.</p>
          <p style={{ fontSize: 11, color: "#aaa" }}>Questions? <a href="mailto:info@eventperfekt.com" style={{ color: cardAccent, textDecoration: "none" }}>info@eventperfekt.com</a></p>

          {/* Make it a Weekend CTA */}
          <div style={{ marginTop: 32, padding: "24px 28px", border: "1px solid " + cardAccent + "30", borderRadius: 12, background: "rgba(255,255,255,0.02)", textAlign: "center" }}>
            <p style={{ fontSize: 11, color: cardAccent, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 10px", fontWeight: 500 }}>Make it a Weekend</p>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 16px" }}>Coming from out of town? Turn the evening into a full weekend in Milton Keynes.</p>
            <a href="/iamher/stay" style={{ display: "inline-block", padding: "12px 28px", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#fff", background: cardAccent, textDecoration: "none", borderRadius: 50, fontWeight: 600 }}>Explore the Weekend Guide</a>
          </div>
        </div>

        {/* Bottom decorative bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${cardAccent}40, transparent)` }} />
      </div>

      {/* Champagne clink animation */}
      <div style={{ position: "relative", height: 80, width: 140, marginTop: 8, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div className={clink ? "glass-anim-left" : ""} style={{ position: "absolute", left: 16, bottom: 4, width: 28 }}>
          <div style={{ width: 18, height: 40, margin: "0 auto", borderRadius: "9px 9px 7px 7px", border: "1.5px solid #d4af37", background: "linear-gradient(180deg,rgba(255,255,255,0.65),rgba(212,175,55,0.06))", boxShadow: "inset 0 0 8px rgba(255,255,255,0.4)" }} />
          <div style={{ width: 3, height: 16, margin: "-1px auto 0", background: "#d4af37", borderRadius: 4 }} />
        </div>
        <div className={clink ? "glass-anim-right" : ""} style={{ position: "absolute", right: 16, bottom: 4, width: 28 }}>
          <div style={{ width: 18, height: 40, margin: "0 auto", borderRadius: "9px 9px 7px 7px", border: "1.5px solid #d4af37", background: "linear-gradient(180deg,rgba(255,255,255,0.65),rgba(212,175,55,0.06))", boxShadow: "inset 0 0 8px rgba(255,255,255,0.4)" }} />
          <div style={{ width: 3, height: 16, margin: "-1px auto 0", background: "#d4af37", borderRadius: 4 }} />
        </div>
        {clink && <div className="spark-anim" style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", background: "#d4af37" }} />}
      </div>

      <p style={{ color: "#c0b8b0", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 4 }}>Powered by Event Perfekt</p>

      <p style={{ color: "#aaa", fontSize: 10, letterSpacing: "0.06em", marginTop: 8 }}>
        <a href="/privacy-policy" style={{ color: "#888", textDecoration: "none" }}>Privacy Policy</a>
        {" · "}
        <a href="mailto:info@eventperfekt.com?subject=Data%20Rights%20Request" style={{ color: "#888", textDecoration: "none" }}>Your Data Rights</a>
        {" · "}
        <a href="https://www.instagram.com/eventperfektcom/" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "none" }}>Follow on Instagram</a>
        {" · "}
        <a href="https://www.linkedin.com/company/105660018/" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "none" }}>Follow on LinkedIn</a>
      </p>

      <button onClick={() => { setStage("float"); setCardVisible(false); setClink(false); setRsvpSubmitted(false); }} style={{ marginTop: 10, background: "none", border: "none", color: "#bbb", fontSize: 11, cursor: "pointer", letterSpacing: "0.12em", textDecoration: "underline" }}>
        Replay Animation
      </button>

      {/* RSVP anchor */}
      <div ref={scrollTargetRef} style={{ width: "100%", maxWidth: 500, marginTop: 40 }} />
    </div>
  );
}
