import { useState, useRef, useEffect, useCallback } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { useViewport } from "@/hooks/use-viewport";
import bgTemplate from "@assets/2C467D98-E3AF-4C63-8E02-EFB3C14C650A_1781020241653.png";

const GOLD   = "#C9A961";
const IVORY  = "#F4ECD8";
const INK = "#330311";
const CARD_W = 1080;
const CARD_H = 1350; // Portrait — 4:5, better for LinkedIn / IG

/* ─── Draw ────────────────────────────────────────────────────────────── */
function drawCard(
  canvas: HTMLCanvasElement,
  name: string,
  title: string,
  company: string,
  attendeePhoto: HTMLImageElement | null,
  templateImg: HTMLImageElement | null,
  showDate: boolean,
  badge: "none" | "100" | "invited",
  isStories = false,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = CARD_W;
  const H = isStories ? 1920 : CARD_H;
  const photoH = isStories ? 960 : 620;
  ctx.clearRect(0, 0, W, H);

  /* ── 1. Background — template image, full bleed ── */
  if (templateImg) {
    const aspect = templateImg.naturalWidth / templateImg.naturalHeight;
    const targetAspect = W / H;
    let sx = 0, sy = 0, sw = templateImg.naturalWidth, sh = templateImg.naturalHeight;
    if (aspect > targetAspect) {
      sw = sh * targetAspect;
      sx = (templateImg.naturalWidth - sw) / 2;
    } else {
      sh = sw / targetAspect;
      sy = (templateImg.naturalHeight - sh) / 2;
    }
    ctx.drawImage(templateImg, sx, sy, sw, sh, 0, 0, W, H);
  } else {
    /* Fallback — rich dark burgundy gradient */
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   "#1A0008");
    bg.addColorStop(0.4, "#0F0005");
    bg.addColorStop(1,   "#070003");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── 2. Overlays for clean text zones ── */

  /* Fully mask the baked-in text area of the template image */
  ctx.fillStyle = "rgba(10,3,6,1)";
  ctx.fillRect(0, 0, W, 300);
  /* Soft fade into the eye/image below */
  const topFade = ctx.createLinearGradient(0, 300, 0, 460);
  topFade.addColorStop(0, "rgba(10,3,6,1)");
  topFade.addColorStop(1, "rgba(10,3,6,0)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 300, W, 160);

  /* Darken centre for photo circle readability */
  const midFade = ctx.createLinearGradient(0, H * 0.22, 0, H * 0.58);
  midFade.addColorStop(0, "rgba(7,0,3,0)");
  midFade.addColorStop(1, "rgba(7,0,3,0.65)");
  ctx.fillStyle = midFade;
  ctx.fillRect(0, H * 0.22, W, H * 0.36);

  /* Bottom zone — name & details need to read */
  const bottomFade = ctx.createLinearGradient(0, H * 0.52, 0, H);
  bottomFade.addColorStop(0, "rgba(7,0,3,0.5)");
  bottomFade.addColorStop(1, "rgba(7,0,3,0.95)");
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, H * 0.52, W, H * 0.48);

  /* ── 3. Thin gold frame ── */
  const m = 28;
  ctx.strokeStyle = "rgba(201,169,97,0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);

  /* ── 4. "I AM HER" — top, large, commanding ── */
  // "I AM" in ivory, "HER" in gold — matching reference
  ctx.textAlign = "left";
  const iamX = m + 36;
  const iamY = 136;
  const iamSize = 130;

  ctx.font = `700 ${iamSize}px 'Playfair Display', Georgia, serif`;
  const iamW = ctx.measureText("I AM ").width;

  ctx.fillStyle = IVORY;
  ctx.fillText("I AM ", iamX, iamY);

  ctx.fillStyle = GOLD;
  ctx.fillText("HER", iamX + iamW, iamY);

  /* ── 5. "THE WOMAN WHO LEADS THE ROOM" ── */
  ctx.fillStyle = "rgba(201,169,97,0.95)";
  ctx.font = "400 17px Arial, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.textAlign = "left";
  ctx.fillText("THE WOMAN WHO LEADS THE ROOM", iamX, iamY + 40);
  ctx.letterSpacing = "0px";

  /* ── 6. Centre portrait zone ── */
  const photoTop  = 230;
  const photoCX   = W / 2;
  const photoCY   = photoTop + photoH / 2;
  const photoR    = 240; // circle radius

  if (attendeePhoto) {
    /* Circular clip */
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2);
    ctx.clip();

    const a   = attendeePhoto.naturalWidth / attendeePhoto.naturalHeight;
    const dia = photoR * 2;
    let dx = 0, dy = 0, dw = dia, dh = dia;
    if (a > 1) { dw = dh * a; dx = -(dw - dia) / 2; }
    else        { dh = dw / a; dy = -(dh - dia) / 2; }
    ctx.drawImage(attendeePhoto, photoCX - photoR + dx, photoCY - photoR + dy, dw, dh);
    ctx.restore();

    /* Subtle vignette ring over photo */
    const vig = ctx.createRadialGradient(photoCX, photoCY, photoR * 0.55, photoCX, photoCY, photoR);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = vig;
    ctx.fill();
    ctx.restore();

    /* Gold ring border */
    ctx.beginPath();
    ctx.arc(photoCX, photoCY, photoR + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(201,169,97,0.70)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* Outer ring — very subtle */
    ctx.beginPath();
    ctx.arc(photoCX, photoCY, photoR + 14, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(201,169,97,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

  } else {
    /* Placeholder — elegant circular frame */
    /* Outer subtle ring */
    ctx.beginPath();
    ctx.arc(photoCX, photoCY, photoR + 14, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(201,169,97,0.95)";
    ctx.lineWidth = 1;
    ctx.stroke();

    /* Inner ring */
    ctx.beginPath();
    ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(201,169,97,0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();

    /* Ghosted silhouette inside */
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoCX, photoCY, photoR - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(201,169,97,0.95)";
    ctx.fill();
    /* head */
    ctx.fillStyle = "rgba(201,169,97,0.95)";
    ctx.beginPath(); ctx.arc(photoCX, photoCY - 80, 72, 0, Math.PI * 2); ctx.fill();
    /* shoulders */
    ctx.beginPath(); ctx.arc(photoCX, photoCY + 100, 160, Math.PI, 0); ctx.fill();
    ctx.restore();

    /* "YOUR PHOTO" */
    ctx.fillStyle = "rgba(201,169,97,0.28)";
    ctx.font = "400 11px Arial, sans-serif";
    ctx.letterSpacing = "5px";
    ctx.textAlign = "center";
    ctx.fillText("YOUR PHOTO", photoCX, photoCY + photoR + 34);
    ctx.letterSpacing = "0px";
  }

  /* ── 7. Gold rule above name ── */
  const nameY = photoTop + photoH + (attendeePhoto ? 36 : 64);
  const ruleGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  ruleGrad.addColorStop(0, "transparent");
  ruleGrad.addColorStop(0.25, GOLD);
  ruleGrad.addColorStop(0.75, GOLD);
  ruleGrad.addColorStop(1, "transparent");
  ctx.fillStyle = ruleGrad;
  ctx.fillRect(W / 2 - 200, nameY - 18, 400, 1);

  /* ── 8. FULL NAME — her name dominates ── */
  const displayName = name || "YOUR NAME";
  ctx.textAlign = "center";
  ctx.fillStyle = IVORY;
  const maxW = W - 100;
  let nSize = 82;
  ctx.font = `400 ${nSize}px 'Playfair Display', Georgia, serif`;
  while (ctx.measureText(displayName).width > maxW && nSize > 38) {
    nSize -= 2;
    ctx.font = `400 ${nSize}px 'Playfair Display', Georgia, serif`;
  }
  ctx.fillText(displayName, W / 2, nameY + nSize * 0.82);
  let y = nameY + nSize * 0.82 + 22;

  /* ── 9. Job Title ── */
  if (title) {
    ctx.fillStyle = GOLD;
    let tSize = 20;
    ctx.font = `400 ${tSize}px Arial, sans-serif`;
    ctx.letterSpacing = "4px";
    while (ctx.measureText(title.toUpperCase()).width > maxW && tSize > 13) {
      tSize--; ctx.font = `400 ${tSize}px Arial, sans-serif`;
    }
    ctx.fillText(title.toUpperCase(), W / 2, y);
    ctx.letterSpacing = "0px";
    y += 30;
  }

  /* ── 10. Company / Organisation ── */
  if (company) {
    ctx.fillStyle = "rgba(244,236,216,0.60)";
    ctx.font = "300 17px Arial, sans-serif";
    ctx.letterSpacing = "1px";
    ctx.fillText(company, W / 2, y);
    ctx.letterSpacing = "0px";
    y += 30;
  }

  /* ── 11. Date (optional) ── */
  if (showDate) {
    y += 6;
    ctx.fillStyle = "rgba(244,236,216,0.65)";
    ctx.font = "300 13px Arial, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("30 OCTOBER 2026  |  MILTON KEYNES", W / 2, y);
    ctx.letterSpacing = "0px";
    y += 28;
  }

  /* ── 12. Badge ── */
  if (badge !== "none") {
    y += 10;
    const badgeText = badge === "100" ? "ONE OF 100" : "INVITED TO THE ROOM";
    const bPad = 18;
    ctx.font = "400 11px Arial, sans-serif";
    ctx.letterSpacing = "5px";
    const bW = ctx.measureText(badgeText).width + bPad * 2 + 5 /* letterSpacing tail */;
    const bH = 34;
    const bX = W / 2 - bW / 2;
    const bY = y;

    ctx.strokeStyle = "rgba(201,169,97,0.60)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bX, bY, bW, bH);

    ctx.fillStyle = "rgba(201,169,97,0.38)";
    ctx.fillText(badgeText, W / 2, bY + bH / 2 + 4);
    ctx.letterSpacing = "0px";
  }
}

/* ─── Component ───────────────────────────────────────────────────────── */
export default function IAmHerCard() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Create Your I Am Her Card | The Woman Who Leads the Room",
    description: "Generate your personalised I Am Her card. Download and share on LinkedIn or Instagram to let the room know you're in it.",
    keywords: "I Am Her card, shareable invitation card, accomplished women UK, The Woman Who Leads the Room",
    url: "https://eventperfekt.net/iamher/card",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Create your personalised I Am Her card — Share on LinkedIn or Instagram",
    noIndex: false,
  });
  useVisitorTracking("/iamher/card", "Create Your I Am Her Card | The Woman Who Leads the Room");

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLImageElement | null>(null);

  const [name,         setName]         = useState("");
  const [title,        setTitle]        = useState("");
  const [company,      setCompany]      = useState("");
  const [attendeePhoto, setAttendeePhoto] = useState<HTMLImageElement | null>(null);
  const [photoLabel,   setPhotoLabel]   = useState("");
  const [showDate,     setShowDate]     = useState(false);
  const [badge,        setBadge]        = useState<"none"|"100"|"invited">("invited");
  const [fontsLoaded,  setFontsLoaded]  = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [downloaded,   setDownloaded]   = useState(false);
  const [savedToRoom,  setSavedToRoom]  = useState(false);
  const [isStories,    setIsStories]    = useState(false);

  /* Load Playfair Display */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap";
    document.head.appendChild(link);
    document.fonts.ready.then(() => setFontsLoaded(true));
  }, []);

  /* Load template background */
  useEffect(() => {
    const img = new Image();
    img.onload = () => { templateRef.current = img; setTemplateLoaded(true); };
    img.src = bgTemplate;
  }, []);

  /* Redraw on any change */
  useEffect(() => {
    if (!fontsLoaded || !canvasRef.current) return;
    drawCard(canvasRef.current, name, title, company, attendeePhoto, templateRef.current, showDate, badge, isStories);
  }, [name, title, company, attendeePhoto, fontsLoaded, templateLoaded, showDate, badge, isStories]);

  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLabel(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => setAttendeePhoto(img);
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const download = async () => {
    if (!canvasRef.current || !name.trim()) return;
    drawCard(canvasRef.current, name, title, company, attendeePhoto, templateRef.current, showDate, badge, isStories);
    const a = document.createElement("a");
    a.download = `iamher-${name.toLowerCase().replace(/\s+/g, "-")}${isStories ? "-stories" : ""}.png`;
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);

    // Auto-save to Meet the Room
    try {
      await fetch("/api/event-august/room-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), title: title.trim(), company: company.trim() }),
      });
      setSavedToRoom(true);
    } catch {
      // Silent — don't block the download experience
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "13px 0", fontSize: 15,
    background: "transparent", border: "none",
    borderBottom: "1px solid rgba(201,169,97,0.15)",
    color: IVORY, outline: "none", fontFamily: "Poppins, sans-serif",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };

  const label: React.CSSProperties = {
    fontSize: 10, color: "rgba(201,169,97,0.95)",
    letterSpacing: "0.26em", textTransform: "uppercase", margin: "0 0 8px", display: "block",
  };

  const CAPTION = `I AM HER.

Proud to be joining The Woman Who Leads The Room on 30 October 2026 in Milton Keynes.

An invitation-led gathering of founders, executives, entrepreneurs and professional women exploring leadership, wellbeing, confidence and the woman behind the title.

#IAmHer #TheWomanWhoLeadsTheRoom`;

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        input::placeholder { color: rgba(244,236,216,0.45); }
        input:focus { border-bottom-color: rgba(201,169,97,0.95) !important; }
        .photo-btn:hover { border-color: rgba(201,169,97,0.60) !important; background: rgba(201,169,97,0.08) !important; }
        .dl-btn:hover:not(:disabled) { background: rgba(201,169,97,0.08) !important; }
        .toggle-chip { cursor: pointer; padding: 8px 16px; border: 1px solid rgba(201,169,97,0.15); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(244,236,216,0.38); background: transparent; font-family: inherit; transition: all 0.2s; }
        .toggle-chip.active { border-color: rgba(201,169,97,0.80); color: rgba(201,169,97,0.92); background: rgba(201,169,97,0.08); }
        @media (max-width: 800px) {
          .card-wrap { flex-direction: column !important; }
          .card-panel { width: 100% !important; flex: none !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ padding: isMobile ? "12px 16px" : "18px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(244,236,216,0.08)", maxWidth: isMobile ? "100vw" : 1200, margin: "0 auto" }}>
        <a href="/iamher" onClick={() => trackFunnelEvent('cta_click', '/iamher/card', { cta: 'back_to_evening' })} style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          The Woman Who Leads the Room
        </a>
        <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <a href="/access" onClick={() => trackFunnelEvent('cta_click', '/iamher/card', { cta: 'request_invitation' })} style={{ fontSize: 10, color: "rgba(244,236,216,0.75)", textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Apply for Your Invitation
          </a>
          <a href="/iamher/card" onClick={() => trackFunnelEvent('cta_click', '/iamher/card', { cta: 'i_am_her_nav' })} style={{ fontSize: 10, color: GOLD, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,169,97,0.60)", paddingBottom: 2 }}>
            I Am Her
          </a>
        </nav>
      </header>

      <div style={{ maxWidth: isMobile ? "100vw" : 1200, margin: "0 auto", padding: isMobile ? "28px 16px 40px" : "52px 36px 80px" }}>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 10, color: "rgba(201,169,97,0.95)", letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 14px" }}>I Am Her</p>
          <h1 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(34px,5vw,56px)", color: IVORY, margin: "0 0 18px", lineHeight: 1.1 }}>
            Create Your Card
          </h1>
          <p style={{ fontSize: 14, color: "rgba(244,236,216,0.75)", lineHeight: 1.8, maxWidth: 400, margin: "0 auto", fontWeight: 300 }}>
            Create your personalised attendee card and share it on LinkedIn or Instagram.<br />
            Share that you are part of the room.
          </p>
          <p style={{ fontSize: 10, color: "rgba(201,169,97,0.50)", letterSpacing: "0.16em", margin: "14px 0 0" }}>
            {isStories ? "1080 × 1920 · Instagram Stories" : "1080 × 1350 · Instagram Feed & LinkedIn"}
          </p>
        </div>

        {/* Two-column */}
        <div className="card-wrap" style={{ display: "flex", gap: 56, alignItems: "flex-start" }}>

          {/* Canvas */}
          <div style={{ flex: isMobile ? "1 1 100%" : "1 1 460px", position: isMobile ? "relative" : "sticky", top: isMobile ? 0 : 24 }}>
            <canvas ref={canvasRef} width={CARD_W} height={isStories ? 1920 : CARD_H} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>

          {/* Controls */}
          <div className="card-panel" style={{ flex: isMobile ? "1 1 100%" : "0 0 296px" }}>

            {/* Format toggle */}
            <div style={{ marginBottom: 32 }}>
              <span style={{ fontSize: 10, color: "rgba(201,169,97,0.95)", letterSpacing: "0.26em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>Format</span>
              <div style={{ display: "flex", gap: 0 }}>
                <button className={`toggle-chip${!isStories ? " active" : ""}`} onClick={() => setIsStories(false)}>
                  Feed
                </button>
                <button className={`toggle-chip${isStories ? " active" : ""}`} onClick={() => setIsStories(true)} style={{ marginLeft: 1 }}>
                  Stories
                </button>
              </div>
              <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", margin: "8px 0 0", lineHeight: 1.6 }}>
                {isStories ? "Optimised for Instagram Stories (9:16)" : "Optimised for Instagram feed & LinkedIn (4:5)"}
              </p>
            </div>

            {/* Portrait upload */}
            <div style={{ marginBottom: 36 }}>
              <span style={label}>Your portrait</span>
              <div className="photo-btn" onClick={() => fileRef.current?.click()} style={{ border: "1px solid rgba(201,169,97,0.15)", padding: "20px", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                {photoLabel
                  ? <p style={{ fontSize: 12, color: "rgba(201,169,97,0.92)", margin: 0 }}>{photoLabel}</p>
                  : <>
                      <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "0 0 5px" }}>Upload your photo</p>
                      <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: 0, letterSpacing: "0.06em" }}>Portrait works best · JPG or PNG</p>
                    </>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </div>

            {/* Details */}
            <div style={{ display: "grid", gap: 26, marginBottom: 36 }}>
              <div>
                <span style={label}>Full name</span>
                <input style={inp} placeholder="e.g. Amara Johnson" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
              </div>
              <div>
                <span style={label}>Job title</span>
                <input style={inp} placeholder="e.g. Founder & CEO" value={title} onChange={e => setTitle(e.target.value)} maxLength={50} />
              </div>
              <div>
                <span style={label}>Company / Organisation</span>
                <input style={inp} placeholder="e.g. Amara & Co." value={company} onChange={e => setCompany(e.target.value)} maxLength={50} />
              </div>
            </div>

            {/* Optional elements */}
            <div style={{ marginBottom: 36 }}>
              <span style={label}>Optional elements</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button className={`toggle-chip${showDate ? " active" : ""}`} onClick={() => setShowDate(v => !v)}>Date &amp; Location</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className={`toggle-chip${badge === "100" ? " active" : ""}`} onClick={() => setBadge("100")}>One of 100</button>
                <button className={`toggle-chip${badge === "invited" ? " active" : ""}`} onClick={() => setBadge("invited")}>Invited to the Room</button>
              </div>
            </div>

            {/* Download */}
            <button
              className="dl-btn"
              onClick={download}
              disabled={!fontsLoaded || !name.trim()}
              style={{
                width: "100%", padding: "17px", fontSize: 10,
                letterSpacing: "0.3em", textTransform: "uppercase",
                color: downloaded ? INK : GOLD,
                background: downloaded ? GOLD : "transparent",
                border: `1px solid ${downloaded ? GOLD : "rgba(201,169,97,0.95)"}`,
                cursor: !name.trim() ? "not-allowed" : "pointer",
                fontFamily: "Poppins, sans-serif", fontWeight: 500,
                transition: "all 0.25s",
                opacity: (!fontsLoaded || !name.trim()) ? 0.35 : 1,
              }}
            >
              {downloaded ? "Downloaded" : "Download Your Card"}
            </button>
            {!name.trim() && (
              <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", textAlign: "center", marginTop: 10, letterSpacing: "0.06em" }}>Enter your name to download</p>
            )}

            {/* Meet the Room save confirmation — link hidden until room is ready */}
            {savedToRoom && (
              <div style={{ marginTop: 20, padding: "16px 18px", border: "1px solid rgba(201,169,97,0.12)", background: "rgba(201,169,97,0.06)" }}>
                <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 6px" }}>You're in the room</p>
                <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: 0, lineHeight: 1.6 }}>
                  Your profile has been saved. You're now in the room.
                </p>
              </div>
            )}

            {/* Caption */}
            <div style={{ marginTop: 40, borderTop: "1px solid rgba(244,236,216,0.08)", paddingTop: 28 }}>
              <span style={label}>Suggested caption</span>
              <p style={{ fontSize: 12, color: "rgba(244,236,216,0.36)", lineHeight: 1.85, margin: 0, whiteSpace: "pre-line" }}>
                {CAPTION}
              </p>
            </div>

            {/* Share buttons */}
            {name.trim() && (
              <div style={{ marginTop: 32, borderTop: "1px solid rgba(244,236,216,0.08)", paddingTop: 28 }}>
                <span style={label}>Share your card</span>
                <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                  <button
                    onClick={() => {
                      const text = encodeURIComponent(`I AM HER.\n\nProud to be joining The Woman Who Leads The Room on 30 October 2026 in Milton Keynes.\n\n#IAmHer #TheWomanWhoLeadsTheRoom\n\nhttps://eventperfekt.net/iamher`);
                      window.open(`https://wa.me/?text=${text}`, "_blank");
                    }}
                    style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "1px solid rgba(37,211,102,0.3)", color: "rgba(37,211,102,0.8)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "rgba(37,211,102,0.06)"; }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    Share on WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://eventperfekt.net/iamher")}`, "_blank");
                    }}
                    style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "1px solid rgba(10,102,194,0.35)", color: "rgba(100,160,230,0.8)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "rgba(10,102,194,0.06)"; }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    Share on LinkedIn
                  </button>
                </div>
                <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "10px 0 0", lineHeight: 1.6 }}>
                  Download your card first, then attach it to your post.
                </p>
              </div>
            )}

            {/* Nominate */}
            <div style={{ marginTop: 28, borderTop: "1px solid rgba(244,236,216,0.08)", paddingTop: 24 }}>
              <p style={{ fontSize: 12, color: "rgba(244,236,216,0.65)", lineHeight: 1.7, margin: 0 }}>
                Know a woman who belongs in the room?{" "}
                <a href="/iamher/nominate" onClick={() => trackFunnelEvent('cta_click', '/iamher/card', { cta: 'nominate_her' })} style={{ color: GOLD, textDecoration: "none", borderBottom: "1px solid rgba(201,169,97,0.10)" }}>
                  Nominate her →
                </a>
              </p>
            </div>

            {/* Footer link */}
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: "rgba(244,236,216,0.65)", lineHeight: 1.7, margin: 0 }}>
                Not yet confirmed?{" "}
                <a href="/access" style={{ color: GOLD, textDecoration: "none", borderBottom: "1px solid rgba(201,169,97,0.10)" }}>
                  Request your invitation →
                </a>
              </p>
            </div>

          </div>
        </div>
      </div>

      <footer style={{ borderTop: "1px solid rgba(244,236,216,0.08)", padding: "24px 36px", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", letterSpacing: "0.08em", margin: 0 }}>
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
