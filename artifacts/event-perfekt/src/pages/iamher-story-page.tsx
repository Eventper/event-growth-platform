import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";
import portrait1 from "@assets/iamher-portrait-1.png";
import portrait2 from "@assets/iamher-portrait-2.png";
import portrait3 from "@assets/iamher-portrait-3.png";
import iamherGroup from "@assets/I_am_her_1779921992841.jpg";

const GOLD  = "#C9A961";
const IVORY = "#F4ECD8";
const INK = "#330311";

const CATEGORY_ACCENT: Record<string, string> = {
  "Confidence": "#D4A843",
  "Burnout": "#8B3A5C", "Leadership": "#6B6BAD", "Identity": "#C9A961",
  "Reinvention": "#4CAF82", "Pressure": "#C97B42", "Motherhood & Career": "#9B6BC2",
  "Toxic Organisation": "#7A7A7A", "Financial Strain": "#3AA8A8",
  "Spouse / Relationship": "#D4608A", "Death or Loss": "#6B7BAD",
  "The Woman Behind the Title": "#C9A961",
  "Menopause": "#B85C8A",
};

const CATEGORY_GRADIENT: Record<string, string> = {
  "Confidence": "linear-gradient(135deg, #1a1500 0%, #080600 100%)",
  "Burnout": "linear-gradient(135deg, #2a0015 0%, #0d0007 100%)",
  "Leadership": "linear-gradient(135deg, #0a0a2a 0%, #03030f 100%)",
  "Identity": "linear-gradient(135deg, #1a1200 0%, #080600 100%)",
  "Reinvention": "linear-gradient(135deg, #001a12 0%, #00070a 100%)",
  "Pressure": "linear-gradient(135deg, #1a0e00 0%, #080400 100%)",
  "Motherhood & Career": "linear-gradient(135deg, #100015 0%, #050009 100%)",
  "Toxic Organisation": "linear-gradient(135deg, #0a0a0a 0%, #030303 100%)",
  "Financial Strain": "linear-gradient(135deg, #001515 0%, #000808 100%)",
  "Spouse / Relationship": "linear-gradient(135deg, #1a0015 0%, #080009 100%)",
  "Death or Loss": "linear-gradient(135deg, #05050f 0%, #020208 100%)",
  "The Woman Behind the Title": "linear-gradient(135deg, #1a1200 0%, #080600 100%)",
  "Menopause": "linear-gradient(135deg, #1a0010 0%, #080005 100%)",
};

type Story = {
  id: number; slug: string; name: string; anonymous: boolean;
  display_name: string; job_title: string | null; generalized_title: string | null;
  company: string | null; category: string; title: string | null; story: string;
  photo_url: string | null; featured: boolean; published_at: string;
  country: string | null; city: string | null;
};

export default function IAmHerStoryPage() {
  const { isMobile } = useViewport();
  const [, params] = useRoute("/stories/:slug");
  const slug = params?.slug;

  const { data, isLoading, isError } = useQuery<{ story: Story | null }>({
    queryKey: ["/api/event-august/story", slug],
    queryFn: () => fetch(`/api/event-august/story/${slug}`).then(r => r.json()),
    enabled: !!slug,
  });

  const s = data?.story;
  const storyUrl = `https://eventperfekt.net/stories/${slug}`;
  const storyTitle = s?.title || s?.category || "Story";
  const pageTitle = s
    ? `${storyTitle} | ${s.anonymous ? "Anonymous" : (s.display_name || s.name)} · I Am Her`
    : "Story | I Am Her — The Woman Who Leads the Room";
  const pageDesc = s
    ? `Read ${s.anonymous ? "a woman's" : (s.display_name || s.name)}'s story about ${s.category}. Part of I Am Her: The Woman Who Leads the Room, 30 October 2026, Milton Keynes.`
    : "Read real stories from women who lead, carry, and persist. Part of I Am Her: The Woman Who Leads the Room, 30 October 2026, Milton Keynes.";
  const image = s?.photo_url || "https://eventperfekt.net/assets/iamher-hero-home.png";
  const imageAlt = s?.title
    ? `${s.title} — I Am Her story by ${s.anonymous ? "Anonymous" : (s.display_name || s.name)}`
    : "The Woman Who Leads the Room — I Am Her";
  const publishedDate = s?.published_at
    ? new Date(s.published_at).toISOString().split("T")[0]
    : "2026-10-30";

  const articleJsonLd = s ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": storyTitle,
    "description": pageDesc,
    "image": image,
    "author": {
      "@type": "Person",
      "name": s.anonymous ? "Anonymous" : (s.display_name || s.name),
      "jobTitle": s.anonymous ? (s.generalized_title || null) : s.job_title,
      "worksFor": s.anonymous ? undefined : { "@type": "Organization", "name": s.company || undefined },
    },
    "publisher": {
      "@type": "Organization",
      "name": "Event Perfekt Global Ltd",
      "url": "https://eventperfekt.net",
      "logo": "https://eventperfekt.net/assets/3d_Logo_1772145137902.jpg",
    },
    "datePublished": publishedDate,
    "dateModified": publishedDate,
    "mainEntityOfPage": { "@type": "WebPage", "@id": storyUrl },
    "articleSection": s.category,
    "about": { "@type": "Thing", "name": "Women's Leadership" },
  } : undefined;

  usePageSEO({
    title: pageTitle,
    description: pageDesc,
    keywords: s ? `I Am Her story, ${s.category}, women leadership UK, ${s.anonymous ? "" : s.display_name || s.name}, The Woman Who Leads the Room, women's stories, female founders, women executives, Milton Keynes` : "I Am Her story, women leadership UK, The Woman Who Leads the Room, women's stories, female founders, women executives, Milton Keynes",
    url: storyUrl,
    image,
    imageAlt,
    ogType: "article",
    jsonLd: articleJsonLd ? [articleJsonLd] : undefined,
    geoRegion: "GB-BKM, GB-LND, GB-BDF, GB-NTH",
    geoPlacename: "Milton Keynes, London, Bedford, Northampton, Luton, Buckinghamshire, Aylesbury",
    geoPosition: "52.0406;-0.7594",
    icbm: "52.0406, -0.7594",
  });
  useVisitorTracking(`/iamher/story/${slug || ""}`, "Story | I Am Her");

  const accent = s ? (CATEGORY_ACCENT[s.category] || GOLD) : GOLD;
  const gradient = s ? (CATEGORY_GRADIENT[s.category] || "linear-gradient(135deg, #1A0008 0%, #070003 100%)") : "";

  const storyUrlLive = typeof window !== "undefined" ? window.location.href : `https://eventperfekt.net/stories/${slug}`;
  const shareText = s ? `I AM HER: ${s.anonymous ? "A woman" : s.display_name} shares her story of ${s.category} — The Woman Who Leads the Room, 30 October 2026 · eventperfekt.net/stories/${slug}` : "";

  const copyLink = () => { navigator.clipboard.writeText(storyUrlLive); };

  const displayName = s ? (s.anonymous ? "Anonymous" : (s.display_name || s.name)) : "";
  const displayTitle = s ? (s.anonymous ? (s.generalized_title || null) : s.job_title) : null;
  const displayCompany = s ? (s.anonymous ? null : s.company) : null;
  const displayLocation = s ? [s.city, s.country].filter(Boolean).join(", ") || null : null;

  const formatted = s?.published_at
    ? new Date(s.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 12, color: "rgba(244,236,216,0.55)", letterSpacing: "0.2em" }}>Loading…</p>
      </div>
    );
  }

  if (isError || !s) {
    return (
      <div style={{ minHeight: "100vh", background: INK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40 }}>
        <p style={{ fontSize: 14, color: "rgba(244,236,216,0.55)" }}>Story not found.</p>
        <a href="/iamher/stories" onClick={() => trackFunnelEvent('cta_click', '/iamher/story/:slug', { cta: 'back_to_wall' })} style={{ fontSize: 11, color: GOLD, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,169,97,0.60)", paddingBottom: 2 }}>← Back to the Story Wall</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .share-btn:hover { opacity:1 !important; }
      `}</style>

      {/* Header */}
      <header style={{ padding: isMobile ? "12px 16px" : "18px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(244,236,216,0.08)", maxWidth: isMobile ? "100vw" : 900, margin: "0 auto" }}>
        <a href="/iamher/stories" onClick={() => trackFunnelEvent('cta_click', '/iamher/story/:slug', { cta: 'back_to_wall' })} style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          ← The Story Wall
        </a>
        <a href="/iamher" onClick={() => trackFunnelEvent('cta_click', '/iamher/story/:slug', { cta: 'iamher_nav' })} style={{ fontSize: 10, color: "rgba(244,236,216,0.65)", textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          I Am Her
        </a>
      </header>

      {/* Category banner — editorial portrait hero */}
      {(() => {
        const portraits = [portrait1, portrait2, portrait3];
        const idx = (s.id || 0) % 3;
        const photo = s.photo_url || portraits[idx];
        return (
          <div style={{
            minHeight: 340, position: "relative", overflow: "hidden",
            backgroundImage: `url(${photo})`,
            backgroundSize: "cover", backgroundPosition: "center top",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            padding: "40px 60px 40px",
          }}>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 50%, rgba(13,3,6,0.75) 100%)` }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 30% 50%, ${accent}12 0%, transparent 65%)` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(to right, transparent, ${accent}50, transparent)` }} />
            <div style={{ maxWidth: isMobile ? "100vw" : 780, margin: "0 auto", width: "100%", position: "relative" }}>
              <p style={{ fontSize: 9, color: accent, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px", opacity: 0.9 }}>I Am Her · {s.category}</p>
              <p style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontSize: "clamp(20px,3vw,30px)", color: IVORY, margin: 0, lineHeight: 1.2, textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}>
                She leads the room.<br />She carries everything.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Story content */}
      <div style={{ maxWidth: isMobile ? "100vw" : 780, margin: "0 auto", padding: isMobile ? "28px 16px 24px" : "56px 36px 48px" }}>

        {/* Story title */}
        {s.title && (
          <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid rgba(244,236,216,0.08)" }}>
            <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: "clamp(22px,3.5vw,32px)", color: IVORY, margin: "0 0 12px", lineHeight: 1.2 }}>
              {s.title}
            </h1>
            <p style={{ fontSize: 9, color: accent, letterSpacing: "0.28em", textTransform: "uppercase", margin: 0, opacity: 0.9 }}>
              I Am Her · {s.category}
            </p>
          </div>
        )}

        {/* Author */}
        <div style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid rgba(244,236,216,0.08)" }}>
          <h1 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(24px,4vw,38px)", color: IVORY, margin: "0 0 14px", lineHeight: 1.2 }}>
            I AM HER.
          </h1>
          <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", margin: "0 0 4px", fontWeight: 500 }}>{displayName}</p>
          {displayTitle && <p style={{ fontSize: 11, color: "rgba(244,236,216,0.55)", margin: "0 0 2px", letterSpacing: "0.1em" }}>{displayTitle}</p>}
          {displayCompany && <p style={{ fontSize: 11, color: "rgba(244,236,216,0.60)", margin: "0 0 2px" }}>{displayCompany}</p>}
          {displayLocation && <p style={{ fontSize: 11, color: "rgba(244,236,216,0.60)", margin: "0 0 2px" }}>{displayLocation}</p>}
          {formatted && <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "8px 0 0", letterSpacing: "0.1em" }}>{formatted}</p>}
        </div>

        {/* Story text */}
        <div style={{ marginBottom: 56 }}>
          {s.story.split("\n\n").filter(Boolean).map((para, i) => (
            <p key={i} style={{ fontSize: 16, color: "rgba(244,236,216,0.72)", lineHeight: 1.95, margin: "0 0 22px", fontFamily: "Poppins, sans-serif" }}>
              {para}
            </p>
          ))}
        </div>

        {/* Share buttons §5.3 */}
        <div style={{ marginBottom: 56, paddingTop: 32, borderTop: "1px solid rgba(244,236,216,0.08)" }}>
          <p style={{ fontSize: 9, color: "rgba(201,169,97,0.60)", letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 16px" }}>Share this story</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storyUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="share-btn"
              style={{ padding: "9px 20px", border: "1px solid rgba(10,102,194,0.35)", color: "rgba(100,160,230,0.7)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.2s", opacity: 0.8 }}
            >
              LinkedIn
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storyUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="share-btn"
              style={{ padding: "9px 20px", border: "1px solid rgba(24,119,242,0.3)", color: "rgba(100,140,230,0.7)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.2s", opacity: 0.8 }}
            >
              Facebook
            </a>
            <button
              onClick={copyLink}
              className="share-btn"
              style={{ padding: "9px 20px", border: "1px solid rgba(201,169,97,0.12)", color: "rgba(201,169,97,0.85)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", background: "transparent", cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "opacity 0.2s", opacity: 0.8 }}
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Soft CTA footer §5 */}
        <div style={{ padding: "40px 0", borderTop: "1px solid rgba(201,169,97,0.08)" }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ width: 32, height: 1, background: GOLD, marginBottom: 24 }} />
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.9, margin: "0 0 24px", fontFamily: "Poppins, sans-serif", fontStyle: "italic" }}>
              Every story here belongs to a woman who decided something had to change.
            </p>
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.55)", margin: "0 0 24px", lineHeight: 1.7 }}>
              Be in the room on 30 October 2026 · Milton Keynes.
            </p>
            <a href="/access" onClick={() => trackFunnelEvent('cta_click', '/iamher/story/:slug', { cta: 'request_invitation' })} style={{ fontSize: 11, color: GOLD, textDecoration: "none", letterSpacing: "0.22em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,169,97,0.60)", paddingBottom: 3 }}>
              Apply for Your Invitation →
            </a>
          </div>
        </div>

      </div>

      <footer style={{ borderTop: "1px solid rgba(244,236,216,0.08)", padding: "24px 36px", textAlign: "center" }}>
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
