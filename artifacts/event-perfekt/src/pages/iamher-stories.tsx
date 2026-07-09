import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";
import iamherGroup from "@assets/I_am_her_1779921992841.jpg";
import portrait1 from "@assets/iamher-portrait-1.png";
import womanMirror from "@assets/woman-in-the-mirror.png";

function useStoriesSEO() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "The Story Wall | I Am Her · The Woman Who Leads the Room";

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

    const desc = "The Story Wall — real stories from accomplished women who carry significant responsibility. Founders, executives, and professional women speaking honestly about burnout, reinvention, and resilience. Part of I Am Her: The Woman Who Leads the Room, 30 October 2026, Milton Keynes.";
    const url = "https://eventperfekt.net/iamher/stories";
    const image = "https://eventperfekt.net/assets/iamher-hero-home.png";

    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[name="keywords"]', "content", "I Am Her stories, accomplished women stories UK, women burnout stories, female founder stories, women executives reinvention, women's stories wall, The Woman Who Leads the Room stories, Event Perfekt, women resilience stories");
    setMeta('meta[name="robots"]', "content", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    setMeta('meta[name="googlebot"]', "content", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    setMeta('meta[name="author"]', "content", "Event Perfekt Global Ltd");
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:title"]', "content", "The Story Wall | I Am Her · The Woman Who Leads the Room");
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:image:alt"]', "content", "I Am Her Story Wall — real stories from women who lead. Event Perfekt, Milton Keynes 2026.");
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
    setMeta('meta[name="twitter:title"]', "content", "The Story Wall | I Am Her · The Woman Who Leads the Room");
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="twitter:image"]', "content", image);

    const ldId = "iamher-stories-jsonld";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify({
      "@context": "https://schema.org", "@type": "CollectionPage",
      "url": url,
      "name": "The Story Wall — I Am Her: The Woman Who Leads the Room",
      "description": desc,
      "inLanguage": "en-GB",
      "isPartOf": { "@type": "WebSite", "name": "Event Perfekt", "url": "https://eventperfekt.net/" },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Event Perfekt", "item": "https://eventperfekt.net/" },
          { "@type": "ListItem", "position": 2, "name": "The Woman Who Leads the Room", "item": "https://eventperfekt.net/iamher" },
          { "@type": "ListItem", "position": 3, "name": "The Story Wall", "item": url }
        ]
      }
    });
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

const GOLD  = "#C9A961";
const IVORY = "#F4ECD8";
const INK = "#330311";

const CATEGORIES = [
  "All","Confidence","Burnout","Identity","Leadership","Reinvention","Pressure",
  "Motherhood & Career","Toxic Organisation","Financial Strain",
  "Spouse / Relationship","Death or Loss","The Woman Behind the Title",
  "Menopause",
];

const CATEGORY_ACCENT: Record<string, string> = {
  "Confidence": "#D4A843",
  "Burnout": "#8B3A5C", "Leadership": "#6B6BAD", "Identity": "#C9A961",
  "Reinvention": "#4CAF82", "Pressure": "#C97B42", "Motherhood & Career": "#9B6BC2",
  "Toxic Organisation": "#7A7A7A", "Financial Strain": "#3AA8A8",
  "Spouse / Relationship": "#D4608A", "Death or Loss": "#6B7BAD",
  "The Woman Behind the Title": "#C9A961",
  "Menopause": "#B85C8A",
};

type Story = {
  id: number; slug: string; name: string; anonymous: boolean;
  display_name: string; job_title: string | null; generalized_title: string | null;
  company: string | null; category: string; title: string | null; story: string;
  photo_url: string | null; featured: boolean; published_at: string;
  country: string | null; city: string | null;
};

export default function IAmHerStories() {
  const { isMobile } = useViewport();
  useStoriesSEO();
  useVisitorTracking("/iamher/stories", "The Story Wall | I Am Her");
  const [activeCategory, setActiveCategory] = useState("All");

  usePageSEO({
    title: "The Story Wall | I Am Her · The Woman Who Leads the Room",
    description: "Real stories from women who lead, carry, and persist. Read, share, and add your voice. Part of I Am Her: The Woman Who Leads the Room, 30 October 2026, Milton Keynes.",
    keywords: "accomplished women stories, I Am Her stories, female founder stories UK, women executives stories, The Woman Who Leads the Room, women's stories, accomplished women Milton Keynes, I Am Her story wall",
    url: "https://eventperfekt.net/iamher/stories",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "The Story Wall — Real stories from women who lead, carry, and persist. I Am Her",
    ogType: "website",
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "The Story Wall | I Am Her",
      "description": "Real stories from women who lead, carry, and persist.",
      "url": "https://eventperfekt.net/iamher/stories",
      "about": { "@type": "Thing", "name": "Women's Leadership Stories" },
    }],
  });

  const { data, isLoading } = useQuery<{ stories: Story[]; total: number }>({
    queryKey: ["/api/event-august/stories"],
    refetchInterval: 60000,
  });

  const stories = (data?.stories || []).filter(s =>
    activeCategory === "All" || s.category === activeCategory
  );
  const featured = stories.filter(s => s.featured);
  const rest     = stories.filter(s => !s.featured);
  const total    = data?.total || 0;

  function displayName(s: Story) {
    return s.anonymous ? "Anonymous" : s.display_name || s.name;
  }
  function displayTitle(s: Story) {
    return s.anonymous ? (s.generalized_title || null) : s.job_title;
  }
  function displayLocation(s: Story) {
    const parts = [s.city, s.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }

  const StoryCard = ({ s, large = false }: { s: Story; large?: boolean }) => {
    const accent = CATEGORY_ACCENT[s.category] || GOLD;
    return (
      <a href={`/stories/${s.slug}`} style={{ textDecoration: "none", display: "block" }}>
        <div style={{
          background: "#0d0306", border: "1px solid rgba(244,236,216,0.08)",
          transition: "border-color 0.25s, transform 0.25s",
          cursor: "pointer", height: "100%", display: "flex", flexDirection: "column",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(201,169,97,0.40)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(244,236,216,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
        >
          {/* Category colour band */}
          <div style={{ height: large ? 6 : 3, background: accent, opacity: 0.7 }} />

          <div style={{ padding: large ? "28px 28px 24px" : "22px 22px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Category tag */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 9, color: accent, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.9 }}>
                {s.category}
                {s.featured && <span style={{ marginLeft: 8, color: GOLD, opacity: 0.7 }}>· Featured</span>}
              </span>
            </div>

            {/* Story title */}
            {s.title && (
              <p className="mobile-story-title" style={{ fontSize: large ? 16 : 13, color: IVORY, lineHeight: 1.4, margin: "0 0 12px", fontWeight: 500, fontFamily: "Poppins, sans-serif" }}>
                {s.title}
              </p>
            )}

            {/* Story preview */}
            <p style={{ fontSize: large ? 15 : 13, color: "rgba(244,236,216,0.85)", lineHeight: 1.85, margin: "0 0 20px", flex: 1, fontStyle: "italic", fontFamily: "Poppins, sans-serif" }}>
              "{s.story.slice(0, 200)}{s.story.length > 200 ? "…" : ""}"
            </p>

            {/* Author */}
            <div style={{ borderTop: "1px solid rgba(244,236,216,0.08)", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 12, color: IVORY, margin: "0 0 2px", fontWeight: 500 }}>{displayName(s)}</p>
                {displayTitle(s) && <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: 0, letterSpacing: "0.08em" }}>{displayTitle(s)}</p>}
                {displayLocation(s) && <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "2px 0 0", letterSpacing: "0.08em" }}>{displayLocation(s)}</p>}
              </div>
              <span style={{ fontSize: 10, color: accent, letterSpacing: "0.14em", opacity: 0.8 }}>Read →</span>
            </div>
          </div>
        </div>
      </a>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .cat-pill { cursor:pointer; padding:7px 16px; border:1px solid rgba(201,169,97,0.14); font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(244,236,216,0.60); background:transparent; font-family:inherit; transition:all 0.2s; white-space:nowrap; }
        .cat-pill.active, .cat-pill:hover { border-color:rgba(201,169,97,0.75); color:rgba(201,169,97,0.92); background:rgba(201,169,97,0.06); }
        /* Mobile responsive */
        @media (max-width: 600px) {
          .cat-pill { padding:5px 10px; font-size:9px; letter-spacing:0.12em; }
          .mobile-banner { padding: 60px 20px 50px !important; }
          .mobile-header { padding: 14px 16px !important; }
          .mobile-cta { padding: 12px 16px !important; }
          .mobile-grid { padding: 24px 16px 60px !important; }
          .mobile-grid-featured { grid-template-columns: 1fr !important; }
          .mobile-grid-rest { grid-template-columns: 1fr !important; }
          .mobile-story-title { font-size: 14px !important; }
        }
      `}</style>

      {/* Header */}
      <header className="mobile-header mobile-header-padding" style={{ padding: isMobile ? "12px 16px" : "18px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(244,236,216,0.08)", maxWidth: isMobile ? "100vw" : 1200, margin: "0 auto" }}>
        <a href="/iamher" onClick={() => trackFunnelEvent('cta_click', '/iamher/stories', { cta: 'back_to_evening' })} style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          ← The Woman Who Leads the Room
        </a>
        <a href="/iamher/submit-story" onClick={() => trackFunnelEvent('cta_click', '/iamher/stories', { cta: 'be_featured' })} style={{ fontSize: 10, color: GOLD, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Be Featured →
        </a>
      </header>

      {/* Wall banner — woman in the mirror editorial */}
      <div className="mobile-banner mobile-banner-padding" style={{
        position: "relative", overflow: "hidden",
        backgroundImage: `url(${womanMirror})`,
        backgroundSize: "cover", backgroundPosition: "center top",
        padding: isMobile ? "50px 16px 40px" : "110px 60px 90px",
      }}>
        {/* Deep dark overlay for luxury legibility */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 55%, rgba(13,3,6,0.95) 100%)" }} />
        {/* Subtle gold radial accent */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 50%, rgba(201,169,97,0.08) 0%, transparent 55%)" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <p style={{ fontSize: 10, color: "rgba(201,169,97,0.90)", letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 20px" }}>I Am Her</p>
          <h1 style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(32px,5vw,58px)", color: IVORY, margin: "0 0 18px", lineHeight: 1.1, textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>
            The Story Wall
          </h1>
          {total > 0 ? (
            <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", margin: "0 0 0" }}>
              <strong style={{ color: GOLD }}>{total} women</strong> have shared their story.
            </p>
          ) : (
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.55)", margin: 0 }}>
              Stories from women who lead, carry, and persist.
            </p>
          )}
        </div>
      </div>

      {/* Soft CTA banner */}
      <div className="mobile-cta mobile-cta-padding" style={{ background: "#0d0306", padding: isMobile ? "12px 16px" : "16px 60px", borderBottom: "1px solid rgba(201,169,97,0.08)", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(244,236,216,0.75)", margin: 0 }}>
          These are the women in the room.{" "}
          <a href="/access" onClick={() => trackFunnelEvent('cta_click', '/iamher/stories', { cta: 'join_them' })} style={{ color: GOLD, textDecoration: "none", borderBottom: "1px solid rgba(201,169,97,0.55)", paddingBottom: 1 }}>
            Join them on Friday 30 October →
          </a>
        </p>
      </div>

      <div className="mobile-grid mobile-grid-padding" style={{ maxWidth: isMobile ? "100vw" : 1200, margin: "0 auto", padding: isMobile ? "24px 16px 40px" : "40px 36px 80px" }}>

        {/* Category filter */}
        <div className="mobile-nav-wrap" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 48 }}>
          {CATEGORIES.map(c => (
            <button key={c} className={`cat-pill mobile-cat-pill${activeCategory === c ? " active" : ""}`} onClick={() => setActiveCategory(c)}>
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ fontSize: 13, color: "rgba(244,236,216,0.55)", textAlign: "center", padding: 60 }}>Loading stories…</p>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.65)", margin: "0 0 24px" }}>
              {activeCategory === "All" ? "No stories published yet." : `No stories in "${activeCategory}" yet.`}
            </p>
            <a href="/iamher/submit-story" onClick={() => trackFunnelEvent('cta_click', '/iamher/stories', { cta: 'first_story' })} style={{ fontSize: 11, color: GOLD, textDecoration: "none", letterSpacing: "0.22em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,169,97,0.60)", paddingBottom: 3 }}>
              Be the first to be featured →
            </a>
          </div>
        ) : (
          <>
            {/* Featured stories (larger) */}
            {featured.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <p style={{ fontSize: 9, color: "rgba(201,169,97,0.60)", letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 20px" }}>Featured</p>
                <div className="mobile-grid-featured" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(400px, 1fr))", gap: 24 }}>
                  {featured.map(s => <StoryCard key={s.id} s={s} large />)}
                </div>
                <div style={{ height: 1, background: "rgba(201,169,97,0.08)", margin: "48px 0 0" }} />
              </div>
            )}

            {/* All other stories */}
            {rest.length > 0 && (
              <div className="mobile-grid-rest" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                {rest.map(s => <StoryCard key={s.id} s={s} />)}
              </div>
            )}
          </>
        )}

        {/* Bottom CTA */}
        <div style={{ marginTop: 80, textAlign: "center", padding: "48px 0", borderTop: "1px solid rgba(244,236,216,0.08)" }}>
          <p style={{ fontSize: 10, color: "rgba(201,169,97,0.65)", letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 16px" }}>Add your voice</p>
          <p style={{ fontSize: 20, color: "rgba(244,236,216,0.85)", fontFamily: "Poppins, sans-serif", fontStyle: "italic", margin: "0 0 28px" }}>
            Your story may be the one another woman needs to read.
          </p>
          <a href="/iamher/submit-story" style={{ fontSize: 11, color: GOLD, textDecoration: "none", letterSpacing: "0.22em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,169,97,0.60)", paddingBottom: 3 }}>
            Be Featured →
          </a>
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
