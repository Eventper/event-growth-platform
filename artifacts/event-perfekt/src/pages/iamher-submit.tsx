import { useState, useRef, useEffect } from "react";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { useViewport } from "@/hooks/use-viewport";
import portrait1 from "@assets/iamher-portrait-1.png";
import portrait3 from "@assets/iamher-portrait-3.png";

function useSubmitStorySEO() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Be Featured in I Am Her · The Woman Who Leads the Room";

    const snapshots: Array<{ selector: string; attr: string; prev: string | null; created: boolean; el: Element }> = [];
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      let created = false;
      if (!el) {
        el = document.createElement(selector.startsWith("link") ? "link" : "meta") as any;
        const [, key, val] = selector.match(/\[(.+?)="(.+?)"\]/) || [];
        if (key && val) el!.setAttribute(key, val);
        document.head.appendChild(el!);
        created = true;
      }
      snapshots.push({ selector, attr, prev: el!.getAttribute(attr), created, el: el! });
      el!.setAttribute(attr, value);
    };

    const desc = "Share the story behind your title, your business, and your journey. Selected stories will be featured as part of the I AM HER editorial campaign. A space for founders, executives and professional women to speak honestly about leadership, resilience, reinvention and the work they are building.";
    const url = "https://eventperfekt.net/iamher/submit-story";
    const image = "https://eventperfekt.net/assets/iamher-hero-home.png";

    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[name="keywords"]', "content", "I Am Her feature submission, women's leadership stories, be featured I Am Her, women founders editorial UK, share your story women, women executives burnout, leadership reinvention women, I Am Her The Woman Who Leads the Room, women's stories Milton Keynes, Event Perfekt, female founders stories, women wellbeing stories");
    setMeta('meta[name="robots"]', "content", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    setMeta('meta[name="googlebot"]', "content", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    setMeta('meta[name="author"]', "content", "Event Perfekt Global Ltd");
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:title"]', "content", "Be Featured in I Am Her · The Woman Who Leads the Room");
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:image:alt"]', "content", "I Am Her — Be Featured. The Woman Who Leads the Room, Milton Keynes 2026.");
    setMeta('meta[property="og:image:width"]', "content", "1024");
    setMeta('meta[property="og:image:height"]', "content", "576");
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[property="og:site_name"]', "content", "Event Perfekt");
    setMeta('meta[property="og:locale"]', "content", "en_GB");
    setMeta('meta[name="geo.region"]', "content", "GB-BKM, GB-LND, GB-BDF, GB-NTH");
    setMeta('meta[name="geo.placename"]', "content", "Milton Keynes, London, Bedford, Northampton, Luton, Buckinghamshire, Aylesbury");
    setMeta('meta[name="geo.position"]', "content", "52.0406;-0.7594");
    setMeta('meta[name="ICBM"]', "content", "52.0406, -0.7594");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:site"]', "content", "@eventperfekt");
    setMeta('meta[name="twitter:title"]', "content", "Be Featured in I Am Her · The Woman Who Leads the Room");
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="twitter:image"]', "content", image);

    const ldId = "iamher-submit-jsonld";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify([{
      "@context": "https://schema.org", "@type": "WebPage",
      "url": url,
      "name": "Be Featured in I Am Her — The Woman Who Leads the Room",
      "description": desc,
      "inLanguage": "en-GB",
      "isPartOf": { "@type": "WebSite", "name": "Event Perfekt", "url": "https://eventperfekt.net/" },
      "primaryImageOfPage": { "@type": "ImageObject", "url": image },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Event Perfekt", "item": "https://eventperfekt.net/" },
          { "@type": "ListItem", "position": 2, "name": "The Woman Who Leads the Room", "item": "https://eventperfekt.net/iamher" },
          { "@type": "ListItem", "position": 3, "name": "Be Featured in I Am Her", "item": url }
        ]
      }
    }]);
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      document.getElementById(ldId)?.remove();
      for (const s of snapshots) {
        if (s.created) s.el.parentNode?.removeChild(s.el);
        else if (s.prev === null) s.el.removeAttribute(s.attr);
        else s.el.setAttribute(s.attr, s.prev);
      }
    };
  }, []);
}

const BURGUNDY = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";
const INK = "#330311";

const CATEGORIES = [
  "Confidence","Burnout","Identity","Leadership","Reinvention","Pressure",
  "Motherhood & Career","Toxic Organisation","Financial Strain",
  "Spouse / Relationship","Death or Loss","The Woman Behind the Title",
  "Menopause",
];

const INTRO = `Every woman in the room has a story.

A moment when she kept going long after her body whispered "stop."
A season where she carried the weight of work, family, expectations and identity until something inside her broke.
A time when she led everyone else — and quietly fell apart in the process.

Burnout doesn't always look like collapse.
Sometimes it looks like competence.
Sometimes it looks like achievement.
Sometimes it looks like the woman who "has it all together."

This space is for those stories.
A place for founders, executives, entrepreneurs and professional women to speak honestly about the pressure, the pace, the perfectionism, the exhaustion — and the moment they realised something had to change.

Your story may be the one another woman needs to read.
Your truth may be the permission someone else has been waiting for.
Your experience may remind another woman that she is not alone.

Tell your story.
Name your moment.
Say the thing you've never said out loud.`;

export default function IAmHerSubmit() {
  const { isMobile } = useViewport();
  useSubmitStorySEO();
  useVisitorTracking("/iamher/submit-story", "Be Featured in I Am Her");
  const [form, setForm] = useState({
    name: "", anonymous: false, jobTitle: "", company: "",
    email: "", website: "", linkedin: "", instagram: "",
    country: "", city: "",
    whatYouDo: "", category: "", title: "", story: "", wishYouKnew: "",
    consent: false, photoConsent: false,
    wellbeingIssues: [] as string[], soughtSupport: "", supportProviders: [] as string[],
    supportTestimonial: "", mayContact: false,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
    if (!file) setForm(f => ({ ...f, photoConsent: false }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Your name is required";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "A valid email is required";
    if (!form.category) e.category = "Please choose a category";
    if (!form.story.trim() || form.story.trim().length < 50) e.story = "Please share a little more — at least 50 characters";
    if (!form.consent) e.consent = "Consent is required to feature your story";
    if (photo && !form.photoConsent) e.photoConsent = "Please confirm you give permission to use your photo";
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    trackFunnelEvent('form_start', '/iamher/submit-story', { category: form.category });
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("anonymous", String(form.anonymous));
      fd.append("jobTitle", form.jobTitle);
      fd.append("company", form.company);
      fd.append("email", form.email);
      fd.append("website", form.website);
      fd.append("linkedin", form.linkedin);
      fd.append("instagram", form.instagram);
      fd.append("country", form.country);
      fd.append("city", form.city);
      fd.append("whatYouDo", form.whatYouDo);
      fd.append("category", form.category);
      fd.append("title", form.title);
      fd.append("story", form.story);
      fd.append("wishYouKnew", form.wishYouKnew);
      fd.append("consent", "true");
      fd.append("photoConsent", String(form.photoConsent));
      if (photo) fd.append("photo", photo);
      // Honeypot — bots fill this, humans don't
      fd.append("hp_website", "");
      // Wellbeing & support fields
      form.wellbeingIssues.forEach(v => fd.append("wellbeingIssues", v));
      if (form.soughtSupport) fd.append("soughtSupport", form.soughtSupport);
      form.supportProviders.forEach(v => fd.append("supportProviders", v));
      if (form.supportTestimonial) fd.append("supportTestimonial", form.supportTestimonial);
      fd.append("mayContact", String(form.mayContact));
      trackFunnelEvent('form_complete', '/iamher/submit-story', { category: form.category });
      const res = await fetch("/api/event-august/stories", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      trackFunnelEvent('submit_success', '/iamher/submit-story', { category: form.category });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "13px 0", fontSize: 15,
    background: "transparent", border: "none",
    borderBottom: "1px solid rgba(201,169,97,0.15)",
    color: IVORY, outline: "none", fontFamily: "Poppins, sans-serif",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const lbl: React.CSSProperties = {
    fontSize: 10, color: "rgba(201,169,97,0.4)",
    letterSpacing: "0.26em", textTransform: "uppercase", margin: "0 0 8px", display: "block",
  };
  const field: React.CSSProperties = { marginBottom: 32 };
  const err = (k: string) => errors[k]
    ? <p style={{ fontSize: 11, color: "rgba(220,60,60,0.8)", margin: "6px 0 0" }}>{errors[k]}</p>
    : null;

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div style={{ marginBottom: 32, paddingTop: 8, borderTop: "1px solid rgba(244,236,216,0.08)" }}>
      <p style={{ fontSize: 10, color: "rgba(201,169,97,0.28)", letterSpacing: "0.22em", textTransform: "uppercase", margin: "28px 0 12px" }}>{title}</p>
      {subtitle && (
        <p style={{ fontSize: 12, color: "rgba(244,236,216,0.35)", lineHeight: 1.7, margin: "0 0 28px" }}>{subtitle}</p>
      )}
    </div>
  );

  return (
    <div className="submit-page" style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        input::placeholder, textarea::placeholder, select option { color: rgba(244,236,216,0.45); }
        input:focus, textarea:focus, select:focus { border-bottom-color: rgba(201,169,97,0.5) !important; }
        select option { background: #330311; color: #F4ECD8; }
        @media (max-width: 768px) {
          .submit-page { overflow-x: hidden !important; }
          .submit-layout { flex-direction: column !important; width: 100% !important; }
          .submit-left { display: none !important; }
          .submit-right { flex: none !important; width: 100% !important; padding: 40px 20px 60px !important; box-sizing: border-box !important; }
          .submit-hero { padding: 40px 20px 36px !important; min-height: 320px !important; }
          .submit-header { padding: 14px 16px !important; }
          .submit-banner { padding: 28px 16px 0 !important; }
          .submit-banner-inner { padding: 20px 16px !important; }
          .submit-footer { padding: 20px 16px !important; }
        }
      `}</style>

      {/* Header */}
      <header className="submit-header mobile-header-padding" style={{ padding: isMobile ? "12px 16px" : "18px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(244,236,216,0.08)", maxWidth: isMobile ? "100vw" : 1100, margin: "0 auto" }}>
        <a href="/iamher" onClick={() => trackFunnelEvent('cta_click', '/iamher/submit-story', { cta: 'back_to_evening' })} style={{ fontSize: 10, color: "rgba(244,236,216,0.3)", textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          ← The Woman Who Leads the Room
        </a>
        <a href="/iamher/stories" onClick={() => trackFunnelEvent('cta_click', '/iamher/submit-story', { cta: 'read_stories' })} style={{ fontSize: 10, color: GOLD, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Read the Stories →
        </a>
      </header>

      {done ? (
        /* —— Success state —— */
        <div style={{ maxWidth: isMobile ? "100vw" : 560, margin: "0 auto", padding: isMobile ? "40px 16px 60px" : "80px 36px 120px", textAlign: "center" }}>
          <div style={{ width: 1, height: 64, background: `linear-gradient(to bottom, transparent, ${GOLD})`, margin: "0 auto 40px" }} />
          <p style={{ fontSize: 10, color: "rgba(201,169,97,0.5)", letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 20px" }}>Thank you</p>
          <h1 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(30px,5vw,48px)", color: IVORY, margin: "0 0 28px", lineHeight: 1.2 }}>
            Your story has been received.
          </h1>
          <p style={{ fontSize: 15, color: "rgba(244,236,216,0.5)", lineHeight: 1.9, margin: "0 0 12px" }}>
            You have shared more than a story — you have added your voice to a room being built for women behind the titles.
          </p>
          <p style={{ fontSize: 14, color: "rgba(244,236,216,0.70)", lineHeight: 1.8, margin: "0 0 32px" }}>
            If selected, we may contact you before publication.
          </p>
          <div style={{ marginTop: 52, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/iamher/stories" onClick={() => trackFunnelEvent('cta_click', '/iamher/submit-story', { cta: 'read_stories_done' })} style={{ fontSize: 11, color: GOLD, textDecoration: "none", letterSpacing: "0.22em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,169,97,0.35)", paddingBottom: 3 }}>
              Read the stories →
            </a>
            <a href="/access" onClick={() => trackFunnelEvent('cta_click', '/iamher/submit-story', { cta: 'request_invitation_done' })} style={{ fontSize: 11, color: "rgba(244,236,216,0.70)", textDecoration: "none", letterSpacing: "0.22em", textTransform: "uppercase", borderBottom: "1px solid rgba(244,236,216,0.30)", paddingBottom: 3 }}>
              Request your invitation →
            </a>
          </div>
        </div>
      ) : (
        <div className="submit-container mobile-fluid-container" style={{ maxWidth: isMobile ? "100vw" : 1100, margin: "0 auto" }}>

          {/* Hero — full-bleed editorial photo */}
          <div className="submit-hero mobile-hero-padding" style={{
            minHeight: isMobile ? 280 : 500, position: "relative", overflow: "hidden",
            backgroundImage: `url(${portrait1})`,
            backgroundSize: "cover", backgroundPosition: "center top",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            padding: isMobile ? "24px 16px" : "60px 60px 56px",
          }}>
            {/* Dark gradient vignette */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.4) 45%, rgba(13,3,6,0.9) 100%)" }} />
            {/* Gold vertical line */}
            <div style={{ position: "absolute", top: 0, left: 60, width: 1, height: "100%", background: "linear-gradient(to bottom, transparent 0%, rgba(201,169,97,0.22) 55%, transparent 100%)" }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: 10, color: "rgba(201,169,97,0.7)", letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 20px" }}>I Am Her · The Stories Behind the Room</p>
              <h1 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(36px,5vw,64px)", color: IVORY, margin: "0 0 24px", lineHeight: 1.1, maxWidth: 720, textShadow: "0 2px 24px rgba(0,0,0,0.6)" }}>
                Be Featured.<br />Share your story.
              </h1>
              <p style={{ fontSize: 13, color: "rgba(244,236,216,0.55)", margin: 0, maxWidth: 500, lineHeight: 1.7, letterSpacing: "0.04em" }}>
                A space for founders, executives and professional women to speak honestly about the title, the business, the pressure — and the truth behind it all.
              </p>
            </div>
          </div>

          {/* Incentive banner */}
          <div className="submit-banner mobile-reduce-padding" style={{ maxWidth: isMobile ? "100vw" : 1100, margin: "0 auto", padding: isMobile ? "20px 16px 0" : "40px 60px 0" }}>
            <div className="submit-banner-inner" style={{ padding: "28px 32px", border: "1px solid rgba(201,169,97,0.12)", background: "rgba(201,169,97,0.03)", marginBottom: 8 }}>
              <p style={{ fontSize: 14, color: GOLD, fontFamily: "Poppins, sans-serif", fontStyle: "italic", margin: "0 0 12px", lineHeight: 1.5 }}>
                Selected stories will be featured as part of the I AM HER editorial campaign.
              </p>
              <p style={{ fontSize: 12, color: "rgba(244,236,216,0.45)", margin: 0, lineHeight: 1.7 }}>
                You are sharing more than a story — you are adding your voice to a room being built for women behind the titles. If selected, we may contact you before publication.
              </p>
            </div>
          </div>

          <div className="submit-layout" style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>

            {/* Left — intro copy + portrait */}
            <div className="submit-left mobile-hidden" style={{ flex: isMobile ? "none" : "0 0 420px", padding: isMobile ? "24px 16px" : "64px 60px 0", borderRight: isMobile ? "none" : "1px solid rgba(244,236,216,0.08)", display: isMobile ? "none" : "block" }}>
              <div style={{ width: 32, height: 1, background: GOLD, marginBottom: 32 }} />
              {INTRO.split("\n\n").map((para, i) => (
                <p key={i} style={{
                  fontSize: i === 0 ? 17 : 14,
                  color: i === 0 ? "rgba(244,236,216,0.88)" : "rgba(244,236,216,0.52)",
                  lineHeight: 2.0,
                  margin: "0 0 36px",
                  fontStyle: i === 0 ? "italic" : "normal",
                  fontFamily: i === 0 ? "'Playfair Display', Georgia, serif" : "inherit",
                  letterSpacing: i === 0 ? "0.01em" : "0.02em",
                }}>
                  {para}
                </p>
              ))}
              <p style={{ fontSize: 14, color: GOLD, fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, margin: "24px 0 40px" }}>
                I AM HER. And this is my story.
              </p>
              {/* Editorial portrait */}
              <div style={{ position: "relative", overflow: "hidden" }}>
                <img src={portrait3} alt="A woman in the room" style={{ width: "100%", display: "block", objectFit: "cover", objectPosition: "center top", maxHeight: 340, filter: "grayscale(12%) contrast(1.04)" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.7) 100%)" }} />
                <p style={{ position: "absolute", bottom: 20, left: 24, right: 24, fontSize: 11, color: GOLD, fontFamily: "Poppins, sans-serif", fontStyle: "italic", margin: 0, letterSpacing: "0.06em" }}>
                  "The woman who leads the room."
                </p>
              </div>
            </div>

            {/* Right — form */}
            <div className="submit-right mobile-fluid-flex" style={{ flex: isMobile ? "none" : 1, width: isMobile ? "100%" : "auto", padding: isMobile ? "24px 16px 40px" : "64px 60px 80px" }}>
              <form onSubmit={submit} noValidate>

                {/* Section 1: About You */}
                <div style={{ marginBottom: 40 }}>
                  <p style={{ fontSize: 10, color: "rgba(201,169,97,0.28)", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 28px" }}>Section 1 — About You</p>

                  <div style={field}>
                    <label style={lbl}>Full name *</label>
                    <input style={inp} value={form.name} onChange={set("name")} placeholder="Your full name" />
                    {err("name")}
                  </div>

                  {/* Anonymity toggle */}
                  <div style={{ ...field, display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: "1px solid rgba(201,169,97,0.12)", background: form.anonymous ? "rgba(201,169,97,0.05)" : "transparent" }}>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, anonymous: !f.anonymous }))}
                      style={{ width: 40, height: 22, borderRadius: 11, background: form.anonymous ? GOLD : "rgba(244,236,216,0.1)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                    >
                      <span style={{ position: "absolute", top: 3, left: form.anonymous ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </button>
                    <div>
                      <p style={{ fontSize: 12, color: form.anonymous ? GOLD : "rgba(244,236,216,0.55)", margin: "0 0 2px", fontWeight: 500 }}>Share anonymously</p>
                      <p style={{ fontSize: 10, color: "rgba(244,236,216,0.2)", margin: 0, lineHeight: 1.5 }}>
                        Your name appears as "Anonymous". Company is hidden. Job title is generalised.
                      </p>
                    </div>
                  </div>

                  <div style={field}>
                    <label style={lbl}>Job title {form.anonymous ? "(generalised before publishing)" : "(optional)"}</label>
                    <input style={inp} value={form.jobTitle} onChange={set("jobTitle")} placeholder={form.anonymous ? "e.g. CFO — we'll generalise this to 'Finance Leader'" : "Your job title"} />
                  </div>

                  {!form.anonymous && (
                    <div style={field}>
                      <label style={lbl}>Company / Organisation (optional)</label>
                      <input style={inp} value={form.company} onChange={set("company")} placeholder="Where you work or your own business" />
                    </div>
                  )}

                  <div style={field}>
                    <label style={lbl}>Email address * (never published)</label>
                    <input style={inp} type="email" value={form.email} onChange={set("email")} placeholder="your@email.com" />
                    <p style={{ fontSize: 10, color: "rgba(244,236,216,0.2)", margin: "6px 0 0" }}>Used for moderation contact only. Never displayed publicly.</p>
                    {err("email")}
                  </div>

                  {/* Social & web links */}
                  <div style={field}>
                    <label style={lbl}>Website (optional)</label>
                    <input style={inp} value={form.website} onChange={set("website")} placeholder="yourwebsite.com" />
                  </div>
                  <div style={field}>
                    <label style={lbl}>LinkedIn (optional)</label>
                    <input style={inp} value={form.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/yourname" />
                  </div>
                  <div style={field}>
                    <label style={lbl}>Instagram (optional)</label>
                    <input style={inp} value={form.instagram} onChange={set("instagram")} placeholder="@yourhandle" />
                  </div>
                  <div style={field}>
                    <label style={lbl}>Country (optional)</label>
                    <input style={inp} value={form.country} onChange={set("country")} placeholder="e.g. United Kingdom, Nigeria, USA" />
                  </div>
                  <div style={field}>
                    <label style={lbl}>City (optional)</label>
                    <input style={inp} value={form.city} onChange={set("city")} placeholder="e.g. Milton Keynes, Lagos, London" />
                  </div>
                </div>

                {/* Section 2: Your Work */}
                <SectionHeader
                  title="Section 2 — Your Work"
                  subtitle="Tell us about what you do, what you have built, and what you are currently working on."
                />
                <div style={field}>
                  <label style={lbl}>What do you do? (optional)</label>
                  <textarea
                    style={{ ...inp, resize: "vertical", minHeight: 120, lineHeight: 1.8 }}
                    value={form.whatYouDo} onChange={set("whatYouDo")}
                    placeholder="Describe your work, your business, your mission, or your current focus."
                  />
                  <p style={{ fontSize: 10, color: "rgba(244,236,216,0.2)", margin: "6px 0 0" }}>{form.whatYouDo.length} characters</p>
                </div>

                {/* Section 3: Your Story */}
                <SectionHeader
                  title="Section 3 — Your Story"
                  subtitle="The heart of your submission. This is what may be selected for publication."
                />

                <div style={field}>
                  <label style={lbl}>Story title (optional)</label>
                  <input style={inp} value={form.title} onChange={set("title")} placeholder="Give your story a title if you would like" />
                </div>

                <div style={field}>
                  <label style={lbl}>Story category *</label>
                  <select
                    style={{ ...inp, appearance: "none", cursor: "pointer" } as React.CSSProperties}
                    value={form.category} onChange={set("category")}
                  >
                    <option value="">Choose a category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {err("category")}
                </div>

                <div style={field}>
                  <label style={lbl}>Your story *</label>
                  <textarea
                    style={{ ...inp, resize: "vertical", minHeight: 220, lineHeight: 1.8 }}
                    value={form.story} onChange={set("story")}
                    placeholder="Tell us about a moment, season or experience that shaped you — burnout, pressure, reinvention, identity, leadership or the woman behind the title."
                  />
                  <p style={{ fontSize: 10, color: "rgba(244,236,216,0.2)", margin: "6px 0 0" }}>{form.story.length} characters</p>
                  {err("story")}
                </div>

                <div style={field}>
                  <label style={lbl}>What do you wish you knew earlier? (optional)</label>
                  <textarea
                    style={{ ...inp, resize: "vertical", minHeight: 120, lineHeight: 1.8 }}
                    value={form.wishYouKnew} onChange={set("wishYouKnew")}
                    placeholder="One sentence, one paragraph, one truth. What would you tell the woman you were before this season?"
                  />
                  <p style={{ fontSize: 10, color: "rgba(244,236,216,0.2)", margin: "6px 0 0" }}>{form.wishYouKnew.length} characters</p>
                </div>

                {/* Section 4: Your Journey */}
                <SectionHeader
                  title="Section 4 — Your Journey"
                  subtitle="Every woman's story is different. These optional questions help us better understand the experiences, challenges and support systems that shape the women behind the stories."
                />

                <div style={field}>
                  <label style={lbl}>What has affected your confidence, wellbeing or leadership journey?</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    {[
                      "Menopause or perimenopause",
                      "Hormonal changes",
                      "Skin health or appearance concerns",
                      "Stress or burnout",
                      "Anxiety or low confidence",
                      "Sleep challenges",
                      "Weight or body changes",
                      "Motherhood or caregiving responsibilities",
                      "Financial pressure",
                      "Workplace challenges",
                      "Relationship or family challenges",
                      "Death, grief or loss",
                      "Other",
                    ].map(opt => {
                      const checked = form.wellbeingIssues.includes(opt);
                      return (
                        <label key={opt} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, color: "rgba(244,236,216,0.55)" }}>
                          <div
                            onClick={() => setForm(f => ({
                              ...f,
                              wellbeingIssues: checked ? f.wellbeingIssues.filter(x => x !== opt) : [...f.wellbeingIssues, opt]
                            }))}
                            style={{ width: 16, height: 16, border: `1px solid ${checked ? GOLD : "rgba(201,169,97,0.3)"}`, background: checked ? "rgba(201,169,97,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, cursor: "pointer" }}
                          >
                            {checked && <span style={{ fontSize: 10, color: GOLD }}>✓</span>}
                          </div>
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Section 5: Support & Recognition */}
                <SectionHeader
                  title="Section 5 — Support & Recognition"
                  subtitle="We want to understand what helped — and what still helps."
                />

                <div style={field}>
                  <label style={lbl}>Did anyone or anything help you through this season?</label>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
                    {["Yes", "No", "Prefer not to say"].map(opt => {
                      const active = form.soughtSupport === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, soughtSupport: active ? "" : opt, supportProviders: active ? [] : f.supportProviders }))}
                          style={{
                            padding: "8px 18px", fontSize: 12, border: `1px solid ${active ? GOLD : "rgba(201,169,97,0.2)"}`,
                            background: active ? "rgba(201,169,97,0.08)" : "transparent", color: active ? GOLD : "rgba(244,236,216,0.45)",
                            cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "all 0.2s",
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Questions 3–5 only if "Yes" */}
                {form.soughtSupport === "Yes" && (
                  <>
                    <div style={field}>
                      <label style={lbl}>Who or what supported you?</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                        {[
                          "Esther Emenike-Okorie",
                          "Dr Sarah Jenkins",
                          "Laser Clinics",
                          "GP / NHS Services",
                          "Counsellor or Therapist",
                          "Women's Health Specialist",
                          "Beauty / Skin Clinic",
                          "Workplace Support Programme",
                          "Financial Adviser or Business Coach",
                          "Mentor or Coach",
                          "Faith / Prayer",
                          "Friend or Family Member",
                          "Other (please specify)",
                        ].map(opt => {
                          const checked = form.supportProviders.includes(opt);
                          return (
                            <label key={opt} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, color: "rgba(244,236,216,0.55)" }}>
                              <div
                                onClick={() => setForm(f => ({
                                  ...f,
                                  supportProviders: checked ? f.supportProviders.filter(x => x !== opt) : [...f.supportProviders, opt]
                                }))}
                                style={{ width: 16, height: 16, border: `1px solid ${checked ? GOLD : "rgba(201,169,97,0.3)"}`, background: checked ? "rgba(201,169,97,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, cursor: "pointer" }}
                              >
                                {checked && <span style={{ fontSize: 10, color: GOLD }}>✓</span>}
                              </div>
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div style={field}>
                      <label style={lbl}>Would you share a few words about the support you received?</label>
                      <p style={{ fontSize: 11, color: "rgba(244,236,216,0.65)", margin: "0 0 12px", lineHeight: 1.5 }}>
                        What difference did the support make to your confidence, wellbeing, leadership journey or life?
                      </p>
                      <textarea
                        style={{ ...inp, resize: "vertical", minHeight: 120, lineHeight: 1.8 }}
                        value={form.supportTestimonial}
                        onChange={e => setForm(f => ({ ...f, supportTestimonial: e.target.value }))}
                        placeholder="Optional — share your experience with the support you received"
                      />
                    </div>

                    <div style={field}>
                      <label style={lbl}>May we contact you regarding your story or experience?</label>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
                        {["Yes", "No"].map(opt => {
                          const active = form.mayContact === (opt === "Yes");
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, mayContact: opt === "Yes" }))}
                              style={{
                                padding: "8px 18px", fontSize: 12, border: `1px solid ${active ? GOLD : "rgba(201,169,97,0.2)"}`,
                                background: active ? "rgba(201,169,97,0.08)" : "transparent", color: active ? GOLD : "rgba(244,236,216,0.45)",
                                cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "all 0.2s",
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Section 6: Photo & Consent */}
                <SectionHeader
                  title="Section 6 — Photo & Consent"
                  subtitle="Your story may be selected for editorial publication. We need your permission to share it."
                />

                {/* Photo upload — optional */}
                <div style={{ ...field, marginBottom: 20 }}>
                  <label style={lbl}>Your photo (optional)</label>
                  <p style={{ fontSize: 11, color: "rgba(244,236,216,0.65)", margin: "0 0 14px", lineHeight: 1.7 }}>
                    Adding a photo is optional. If you share one, you'll be asked to confirm we can use it alongside your story on the website and social media.
                  </p>

                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhoto}
                    style={{ display: "none" }}
                  />

                  {photoPreview ? (
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <img src={photoPreview} alt="Your photo preview" style={{ width: 72, height: 72, objectFit: "cover", border: "1px solid rgba(201,169,97,0.2)" }} />
                      <div>
                        <p style={{ fontSize: 11, color: "rgba(244,236,216,0.5)", margin: "0 0 8px" }}>{photo?.name}</p>
                        <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); setForm(f => ({ ...f, photoConsent: false })); if (photoRef.current) photoRef.current.value = ""; }}
                          style={{ fontSize: 10, color: "rgba(200,80,80,0.6)", background: "transparent", border: "1px solid rgba(200,80,80,0.2)", padding: "4px 12px", cursor: "pointer", fontFamily: "Poppins, sans-serif", letterSpacing: "0.14em" }}>
                          Remove photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => photoRef.current?.click()}
                      style={{ padding: "11px 22px", background: "transparent", border: "1px solid rgba(201,169,97,0.18)", color: "rgba(201,169,97,0.55)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
                      Add a photo →
                    </button>
                  )}
                </div>

                {/* Photo consent — only shown if photo is selected */}
                {photo && (
                  <div style={{ marginBottom: 32, padding: "16px 18px", border: "1px solid rgba(201,169,97,0.12)", background: "rgba(201,169,97,0.03)" }}>
                    <label style={{ display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer" }}>
                      <div
                        onClick={() => setForm(f => ({ ...f, photoConsent: !f.photoConsent }))}
                        style={{ width: 18, height: 18, border: `1px solid ${form.photoConsent ? GOLD : "rgba(201,169,97,0.3)"}`, background: form.photoConsent ? "rgba(201,169,97,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, cursor: "pointer", transition: "all 0.2s" }}
                      >
                        {form.photoConsent && <span style={{ fontSize: 11, color: GOLD }}>✓</span>}
                      </div>
                      <p style={{ fontSize: 12, color: "rgba(244,236,216,0.55)", lineHeight: 1.8, margin: 0 }}>
                        I give permission for Event Perfekt Global Ltd to use this photo alongside my story on The Woman Who Leads The Room website and social channels. I confirm I own the rights to this image or have permission to share it.
                      </p>
                    </label>
                    {err("photoConsent")}
                  </div>
                )}

                {/* Safeguarding notice */}
                <div style={{ marginBottom: 36, padding: "18px 22px", border: "1px solid rgba(201,169,97,0.1)", background: "rgba(201,169,97,0.03)" }}>
                  <p style={{ fontSize: 11, color: "rgba(244,236,216,0.70)", lineHeight: 1.8, margin: 0 }}>
                    Sharing can bring up difficult feelings. If you're struggling right now, please reach out to someone you trust or a support service. In the UK you can contact the Samaritans free on{" "}
                    <strong style={{ color: "rgba(244,236,216,0.65)" }}>116 123</strong>, any time.
                  </p>
                </div>

                {/* Consent */}
                <div style={{ marginBottom: 36 }}>
                  <label style={{ display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer" }}>
                    <div
                      onClick={() => setForm(f => ({ ...f, consent: !f.consent }))}
                      style={{ width: 18, height: 18, border: `1px solid ${form.consent ? GOLD : "rgba(201,169,97,0.3)"}`, background: form.consent ? "rgba(201,169,97,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, cursor: "pointer", transition: "all 0.2s" }}
                    >
                      {form.consent && <span style={{ fontSize: 11, color: GOLD }}>✓</span>}
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(244,236,216,0.5)", lineHeight: 1.8, margin: 0 }}>
                      I grant Event Perfekt Global Ltd a licence to publish and share my story on The Woman Who Leads The Room website and social channels. By submitting, I transfer the right to use this content to Event Perfekt Global Ltd. I understand I can request removal at any time by emailing <a href="mailto:info@eventperfekt.com" style={{ color: "rgba(201,169,97,0.6)", textDecoration: "none" }}>info@eventperfekt.com</a>.
                    </p>
                  </label>
                  {err("consent")}
                  <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "12px 0 0", lineHeight: 1.7 }}>
                    Your story may include sensitive personal information shared voluntarily. Stories and email addresses are processed by Event Perfekt Global Ltd as data controller under a lawful basis of consent. Retention period: stories remain published until withdrawal is requested.
                  </p>
                </div>

                {errors.submit && (
                  <p style={{ fontSize: 12, color: "rgba(220,60,60,0.7)", margin: "0 0 20px" }}>{errors.submit}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%", padding: "18px 32px", background: "transparent",
                    border: `1px solid ${!form.consent || submitting ? "rgba(201,169,97,0.2)" : "rgba(201,169,97,0.5)"}`,
                    color: !form.consent || submitting ? "rgba(201,169,97,0.3)" : GOLD,
                    fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
                    cursor: !form.consent || submitting ? "not-allowed" : "pointer",
                    fontFamily: "Poppins, sans-serif", transition: "all 0.25s",
                  }}
                >
                  {submitting ? "Submitting…" : "Submit for Consideration"}
                </button>

              </form>
            </div>
          </div>
        </div>
      )}

      <footer className="submit-footer mobile-reduce-padding-sm" style={{ borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "16px" : "24px 36px", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.1)", letterSpacing: "0.08em", margin: 0 }}>
          Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG · Stories processed under consent as data controller
        </p>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "8px 0 0", letterSpacing: "0.06em" }}>
          <a href="/privacy-policy" style={{ color: "rgba(244,236,216,0.35)", textDecoration: "none" }}>Privacy Policy</a>
          {" · "}
          <a href="mailto:info@eventperfekt.com?subject=Data%20Rights%20Request" style={{ color: "rgba(244,236,216,0.35)", textDecoration: "none" }}>Your Data Rights</a>
          {" · "}
          <a href="mailto:info@eventperfekt.com" style={{ color: "rgba(244,236,216,0.35)", textDecoration: "none" }}>Contact</a>
          {" · "}
          <a href="https://www.instagram.com/eventperfektcom/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(244,236,216,0.35)", textDecoration: "none" }}>Follow on Instagram</a>
          {" · "}
          <a href="https://www.linkedin.com/company/105660018/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(244,236,216,0.35)", textDecoration: "none" }}>Follow on LinkedIn</a>
        </p>
      </footer>
    </div>
  );
}
