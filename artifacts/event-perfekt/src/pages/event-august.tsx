import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useViewport } from "@/hooks/use-viewport";
import heroImage from "@assets/iamher-hero-home.png";
import heroImageWebp from "@assets/iamher-hero-home.webp";
import campaignHeroImage from "@assets/ChatGPT_Image_May_27,_2026,_10_02_46_PM_1779915792360.webp";
import roomImage from "@assets/Woman_who_leads_the_room_1782136770876.jpg";
import invitationImage from "@assets/image_1782138678933.webp";
import womanBehindRoomImage from "@assets/Copilot_20260510_161510_1778676650670.webp";
import organisationsImage from "@assets/pexels-silverkblack-36765734_1782141094460.jpg";
import experienceImage from "@assets/image_1782141053532.webp";
import storiesHeroImage from "@assets/woman-in-the-mirror.webp";
import invitationHeroImage from "@assets/image_1782746421714.webp";
const drSarahJenkinsHeadshot = "/dr-sarah-headshot.png";
const estherEmenikeHeadshot = "/esther-headshot.jpg";
import { useVisitorTracking, trackFunnelEvent, captureEmail } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import ElizabethChat from "@/components/ElizabethChat";
import IamherMobileNav from "@/components/IamherMobileNav";

/* ─── SEO helper — set page-specific tags on mount, restore on unmount ── */
function useEventSEO() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "The Woman Who Leads the Room | Invitation-Only Leadership Evening | Milton Keynes 2026";

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

    const desc = "A private leadership dinner for 100 accomplished women across the UK. The Woman Who Leads the Room — Friday 30 October 2026, Milton Keynes. Founders, directors, executives, business owners and senior decision-makers. Hosted by Event Perfekt.";
    const keywords = "invitation-only evening for women UK 2026, private women's event Milton Keynes, I Am Her event, accomplished women UK, female founders event UK, curated women's evening 2026, women's event Milton Keynes, luxury private evening UK, The Woman Who Leads the Room, Event Perfekt, curated women's evening, women founder event Buckinghamshire, female founder event, women in business, Milton Keynes event 2026, women's health evening UK, private dining women UK";
    const url = "https://eventperfekt.net/iamher";
    const image = "https://eventperfekt.net/assets/iamher-hero-home.png";
    const imageAlt = "The Woman Who Leads the Room — a private leadership dinner for founders, executives, and women who lead in Milton Keynes";

    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[name="viewport"]', "content", "width=device-width, initial-scale=1.0");
    setMeta('meta[name="keywords"]', "content", keywords);
    setMeta('meta[name="robots"]', "content", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    setMeta('meta[name="googlebot"]', "content", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    setMeta('meta[name="bingbot"]', "content", "index, follow, max-snippet:-1, max-image-preview:large");
    setMeta('meta[name="author"]', "content", "Event Perfekt Global Ltd");
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:site_name"]', "content", "Event Perfekt");
    setMeta('meta[property="og:locale"]', "content", "en_GB");
    setMeta('meta[property="og:title"]', "content", "The Woman Who Leads the Room | Invitation-Only Leadership Evening | Milton Keynes 2026");
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:image:alt"]', "content", imageAlt);
    setMeta('meta[property="og:image:width"]', "content", "1408");
    setMeta('meta[property="og:image:height"]', "content", "768");
    setMeta('meta[property="og:type"]', "content", "event");
    setMeta('meta[property="og:event:start_time"]', "content", "2026-10-30T18:00:00+01:00");
    setMeta('meta[property="og:event:end_time"]', "content", "2026-10-30T23:00:00+01:00");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:site"]', "content", "@eventperfekt");
    setMeta('meta[name="twitter:title"]', "content", "The Woman Who Leads the Room | Invitation-Only Leadership Evening | Milton Keynes 2026");
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="twitter:image"]', "content", image);
    setMeta('meta[name="twitter:image:alt"]', "content", imageAlt);

    const ldId = "iamher-event-jsonld";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify([{
      "@context": "https://schema.org", "@type": "Event",
      "name": "The Woman Who Leads the Room — I Am Her",
      "alternateName": "I Am Her",
      "startDate": "2026-10-30T18:00:00+01:00",
      "endDate": "2026-10-30T23:00:00+01:00",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
      "eventType": [ "SocialEvent", "BusinessEvent" ],
      "location": {
        "@type": "Place",
        "name": "Milton Keynes, Buckinghamshire, UK",
        "address": { "@type": "PostalAddress", "addressLocality": "Milton Keynes", "addressRegion": "Buckinghamshire", "addressCountry": "GB" },
        "geo": { "@type": "GeoCoordinates", "latitude": "52.0406", "longitude": "-0.7594" }
      },
      "image": [image],
      "description": desc,
      "about": [
        { "@type": "Thing", "name": "Women's Leadership", "sameAs": "https://en.wikipedia.org/wiki/Women_in_leadership" },
        { "@type": "Thing", "name": "Women's Health", "sameAs": "https://en.wikipedia.org/wiki/Women%27s_health" },
        { "@type": "Thing", "name": "Confidence", "sameAs": "https://en.wikipedia.org/wiki/Confidence" },
        { "@type": "Thing", "name": "Entrepreneurship", "sameAs": "https://en.wikipedia.org/wiki/Entrepreneurship" },
        { "@type": "Thing", "name": "Female Founder Event" },
        { "@type": "Thing", "name": "Women in Business" },
        { "@type": "Thing", "name": "Executive Leadership" },
        { "@type": "Thing", "name": "Leadership Development" },
        { "@type": "Thing", "name": "Menopause in Leadership" },
        { "@type": "Thing", "name": "Female Entrepreneurship" },
        { "@type": "Thing", "name": "Milton Keynes Business Community" }
      ],
      "performer": {
        "@type": "Person",
        "name": "Elizabeth",
        "description": "Your host for the evening — warm, knowledgeable, and elegant.",
        "jobTitle": "Event Host"
      },
      "organizer": {
        "@type": "Organization",
        "name": "Event Perfekt Global Ltd",
        "alternateName": "Event Perfekt",
        "url": "https://eventperfekt.net/",
        "logo": "https://eventperfekt.net/assets/ep-logo.jpg",
        "address": { "@type": "PostalAddress", "streetAddress": "20 Wenlock Road", "addressLocality": "London", "addressCountry": "GB", "postalCode": "N1 7PG" },
        "sameAs": [
          "https://www.linkedin.com/company/105660018",
          "https://www.instagram.com/eventperfektcom",
          "https://eventperfekt.net/"
        ]
      },
      "sameAs": [
        "https://eventperfekt.net/iamher",
        "https://www.linkedin.com/events/7459650009286836224/",
        "https://www.mkfm.com/news/local-business/a-new-womens-evening-experience-launches-in-milton-keynes/",
        "https://www.eventbrite.com/e/1989824572862"
      ],
      "offers": {
        "@type": "Offer",
        "url": "https://eventperfekt.net/iamher",
        "price": "300",
        "priceCurrency": "GBP",
        "availability": "https://schema.org/LimitedAvailability",
        "validFrom": "2026-04-01T00:00:00+01:00",
        "description": "Attendance is by invitation, with a £300 guest contribution (plus VAT). Limited to 100 women.",
        "priceSpecification": {
          "@type": "PriceSpecification",
          "price": "300",
          "priceCurrency": "GBP",
          "valueAddedTaxIncluded": false
        }
      },
      "isAccessibleForFree": false,
      "audience": {
        "@type": "Audience",
        "audienceType": "Female founders, executives, business owners, and women who lead",
        "geographicArea": { "@type": "Place", "name": "United Kingdom" }
      },
      "subEvent": [
        { "@type": "Event", "name": "Arrival & Welcome", "startDate": "2026-10-30T18:00:00+01:00", "description": "Welcome drink and curated introductions" },
        { "@type": "Event", "name": "Wining & Dining", "startDate": "2026-10-30T19:00:00+01:00", "description": "Three-course dining experience in an intimate setting" },
        { "@type": "Event", "name": "Leadership, Health & Confidence Conversation", "startDate": "2026-10-30T20:00:00+01:00", "description": "Expert conversation on leading at this level with Dr Sarah Jenkins and Esther Emenike-Okorie" },
        { "@type": "Event", "name": "Storytelling & Connection", "startDate": "2026-10-30T21:00:00+01:00", "description": "Fireside storytelling and meaningful connection" },
        { "@type": "Event", "name": "Closing & Departure", "startDate": "2026-10-30T22:30:00+01:00", "description": "Final reflections and departure" }
      ],
      "inLanguage": "en-GB",
      "maximumAttendeeCapacity": 100,
      "attendee": { "@type": "Audience", "audienceType": "Women who lead — at every age and every stage" }
    }, {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Event Perfekt", "item": "https://eventperfekt.net/" },
        { "@type": "ListItem", "position": 2, "name": "The Woman Who Leads the Room", "item": "https://eventperfekt.net/iamher" }
      ]
    }, {
      "@context": "https://schema.org", "@type": "WebPage",
      "url": "https://eventperfekt.net/iamher",
      "name": "The Woman Who Leads the Room · August 2026 · Milton Keynes",
      "description": desc,
      "inLanguage": "en-GB",
      "isPartOf": { "@type": "WebSite", "name": "Event Perfekt", "url": "https://eventperfekt.net/" },
      "primaryImageOfPage": { "@type": "ImageObject", "url": image, "width": 1408, "height": 768 }
    }, {
      "@context": "https://schema.org", "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Who is the evening for?", "acceptedAnswer": { "@type": "Answer", "text": "The evening is for women who lead — founders, executives, directors, professionals and builders. Limited to 100 women, by invitation only." } },
        { "@type": "Question", "name": "When and where is the event?", "acceptedAnswer": { "@type": "Answer", "text": "Friday 30 October 2026 in Milton Keynes, Buckinghamshire, UK. The exact venue is revealed only to confirmed guests." } },
        { "@type": "Question", "name": "How do I get an invitation?", "acceptedAnswer": { "@type": "Answer", "text": "Submit an Apply for Your Invitation form. Each application is reviewed individually. Approved guests receive a private confirmation link." } },
        { "@type": "Question", "name": "Can my brand partner with the room?", "acceptedAnswer": { "@type": "Answer", "text": "Yes — a small number of partner positions are reserved. Submit a partnership enquiry and the team will be in touch within 48 hours." } }
      ]
    }]);
    document.head.appendChild(ld);
    const titleTagId = "iamher-title-tag";
    document.getElementById(titleTagId)?.remove();
    const titleTag = document.createElement("title");
    titleTag.id = titleTagId;
    titleTag.textContent = "The Woman Who Leads the Room | Invitation-Only Leadership Evening | Milton Keynes 2026";
    document.head.appendChild(titleTag);

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

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const GOLD = "#C9A961";
const GOLD_SOFT = "#E2C87A";
const IVORY = "#F4ECD8";
const INK = "#330311";
const BURGUNDY = "#330311";

const inputBase: React.CSSProperties = {
  width: "100%", padding: "14px 0", fontSize: 15, fontFamily: "Poppins, sans-serif",
  background: "transparent", border: "none", borderBottom: "1px solid rgba(226,200,122,0.40)",
  borderRadius: 0, color: IVORY, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, color: "rgba(244,236,216,0.85)",
  letterSpacing: "0.22em", textTransform: "uppercase", display: "block", marginBottom: 4,
};

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: "rgba(244,236,216,0.85)", marginLeft: 4 }}>·</span>}</label>
      {children}
    </div>
  );
}

function GdprRow({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 8 }}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} required
        style={{ marginTop: 4, width: 14, height: 14, accentColor: GOLD, flexShrink: 0 }} />
      <label htmlFor={id} style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", lineHeight: 1.6, cursor: "pointer", letterSpacing: "0.01em" }}>
        I'm happy to receive event correspondence from Event Perfekt. Unsubscribe at any time.
      </label>
    </div>
  );
}

function SuccessState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px" }}>
      <div className="ip-serif" style={{ fontSize: 32, color: GOLD, marginBottom: 20, fontStyle: "italic" }}>Thank you.</div>
      <p style={{ fontSize: 16, color: IVORY, lineHeight: 1.8, marginBottom: 28, fontWeight: 300, maxWidth: 420, margin: "0 auto 28px" }}>{message}</p>
      <button onClick={onReset} style={{ background: "none", border: "none", color: GOLD, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", textDecoration: "none", cursor: "pointer", borderBottom: `1px solid ${GOLD}`, paddingBottom: 4 }}>Submit another</button>
    </div>
  );
}

/* ─── Thin elegant button ───────────────────────────────────────────────── */
function ThinButton({ children, onClick, type = "button", disabled, variant = "gold" }: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; variant?: "gold" | "ghost";
}) {
  const isGold = variant === "gold";
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className="ip-thin-btn"
      style={{
        background: "transparent", color: isGold ? GOLD : "rgba(244,236,216,0.95)",
        border: `1px solid ${isGold ? GOLD : "rgba(244,236,216,0.50)"}`,
        padding: "16px 36px", fontSize: 11, fontWeight: 500, cursor: disabled ? "wait" : "pointer",
        letterSpacing: "0.28em", textTransform: "uppercase", borderRadius: 0,
        transition: "all 0.3s ease", opacity: disabled ? 0.5 : 1,
        fontFamily: "'Poppins', sans-serif",
      }}>
      {children}
    </button>
  );
}


/* ─── Social Ticker ─────────────────────────────────────────────────────── */
function SocialTicker() {
  const { isMobile } = useViewport();
  return (
    <div style={{
      background: BURGUNDY, borderBottom: "1px solid rgba(201,169,97,0.10)",
      padding: isMobile ? "8px 16px" : "11px 24px", display: "flex", alignItems: "center",
      justifyContent: "space-between", flexWrap: "wrap", gap: 8,
    }}>
      <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: "rgba(244,236,216,0.95)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Limited to 100 invited women
      </p>
      <Link to="/iamher/card" onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'create_card' })} style={{ fontSize: isMobile ? 10 : 11, color: GOLD, textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,169,97,0.60)", paddingBottom: 1, whiteSpace: "nowrap" }}>
        Create your I Am Her card →
      </Link>
    </div>
  );
}

/* ─── I AM HER STORIES — Hero Section ───────────────────────────────────── */
function StoriesHeroSection() {
  const { isMobile } = useViewport();
  const [count, setCount] = useState<number | null>(null);
  const [stories, setStories] = useState<Array<{ id: number; slug: string; name: string; title: string; story: string; country: string; anonymous: boolean }>>([]);
  useEffect(() => {
    fetch("/api/event-august/stories/count")
      .then(r => r.json())
      .then(d => setCount(d.count ?? 0))
      .catch(() => {});
    fetch("/api/event-august/stories")
      .then(r => r.json())
      .then(d => setStories(d.stories?.slice(0, 3) || []))
      .catch(() => {});
  }, []);
  const GOLD_S = "#C9A961";
  const IV = "#F4ECD8";
  return (
    <section style={{ background: "#330311", borderTop: "1px solid rgba(201,169,97,0.10)", borderBottom: "1px solid rgba(201,169,97,0.10)" }}>
      {/* Full-bleed editorial image hero */}
      <div style={{ position: "relative", overflow: "hidden", width: "100%" }}>
        <img
          src={storiesHeroImage}
          alt="A woman in the mirror — the story behind the success"
          style={{ width: "100%", display: "block", objectFit: "cover", objectPosition: "center top", maxHeight: 600, minHeight: 320 }}
          loading="lazy"
        />
        {/* Dark cinematic overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.35) 40%, rgba(13,3,6,0.75) 100%)" }} />
        {/* Text overlay at bottom of image */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "60px 32px 48px", maxWidth: 900, margin: "0 auto" }}>
          <p style={{ fontSize: 10, color: "rgba(201,169,97,0.90)", letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            I AM HER STORIES
          </p>
          <h2 className="ip-serif" style={{ fontSize: "clamp(28px,4.5vw,48px)", color: IV, fontWeight: 400, margin: 0, lineHeight: 1.1, letterSpacing: "-0.01em", textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>
            The Stories Behind The Room
          </h2>
        </div>
      </div>

      {/* Content below image — Featured story preview */}
      <div style={{ maxWidth: isMobile ? "100vw" : 900, margin: "0 auto", padding: isMobile ? "28px 16px 40px" : "56px 32px 80px" }}>
        <p style={{ fontSize: "clamp(16px,2.5vw,22px)", color: "rgba(244,236,216,0.85)", fontFamily: "Poppins, sans-serif", fontStyle: "italic", lineHeight: 1.5, margin: "0 0 36px" }}>
          "Capable became the cage."
        </p>
        <div style={{ width: 32, height: 1, background: GOLD_S, margin: "0 0 36px" }} />
        <p style={{ fontSize: 15, color: "rgba(244,236,216,0.95)", lineHeight: 2.0, margin: "0 0 28px", maxWidth: 720, letterSpacing: "0.01em" }}>
          Behind every woman in the room is a story: the pressure of building, leading, and showing up for everyone else. The moment she forgot she was allowed to be tired. The honest moment when something had to change. These are the stories behind the room.
        </p>

        {/* Featured story cards — pull from DB */}
        {stories.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, margin: "48px 0 0" }}>
            {stories.map((s) => (
              <Link key={s.id} to={`/stories/${s.slug}`} onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'featured_story', story_id: s.id })} style={{ textDecoration: "none", display: "block" }}>
                <div style={{ padding: "28px 24px", border: "1px solid rgba(201,169,97,0.12)", borderRadius: 2, background: "rgba(201,169,97,0.06)", transition: "all 0.3s ease", cursor: "pointer", overflow: "hidden" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,169,97,0.60)"; e.currentTarget.style.background = "rgba(201,169,97,0.08)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(201,169,97,0.12)"; e.currentTarget.style.background = "rgba(201,169,97,0.08)"; }}>
                  {/* Story excerpt — no photo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 16px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #C9A961 0%, #8B6914 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#330311", flexShrink: 0 }}>
                      {s.anonymous ? "A" : s.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, color: "rgba(244,236,216,0.92)", margin: 0, fontWeight: 500, letterSpacing: "0.02em" }}>
                        {s.anonymous ? "Anonymous" : s.name}
                      </p>
                      <p style={{ fontSize: 10, color: "rgba(201,169,97,0.95)", margin: "2px 0 0", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                        {s.country || "United Kingdom"}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "0 0 12px", lineHeight: 1.5, fontStyle: "italic", fontFamily: "Poppins, sans-serif" }}>
                    "{s.story?.slice(0, 90)}{s.story?.length > 90 ? "..." : ""}"
                  </p>
                  <p style={{ fontSize: 10, color: GOLD_S, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0, fontWeight: 500 }}>
                    Read story →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", margin: "40px 0 0" }}>
          <Link to="/iamher/stories" onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'read_story_wall' })} style={{ fontSize: 11, color: GOLD_S, textDecoration: "none", letterSpacing: "0.22em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,169,97,0.10)", paddingBottom: 3, whiteSpace: "nowrap" }}>
            Read the story wall →
          </Link>
          <Link to="/iamher/submit-story" onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'be_featured' })} style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", textDecoration: "none", letterSpacing: "0.22em", textTransform: "uppercase", borderBottom: "1px solid rgba(244,236,216,0.12)", paddingBottom: 3, whiteSpace: "nowrap" }}>
            Be featured →
          </Link>
        </div>
        {/* Quote card — True Confession Series */}
        <div style={{ margin: "48px 0 0", padding: "32px 28px", borderLeft: "1px solid rgba(201,169,97,0.15)", borderTop: "1px solid rgba(201,169,97,0.10)", background: "rgba(201,169,97,0.06)", maxWidth: 580 }}>
          <p className="ip-serif" style={{ fontSize: 16, color: "rgba(244,236,216,0.75)", fontStyle: "italic", fontWeight: 400, margin: "0 0 12px", lineHeight: 1.6 }}>
            "I forgot I was allowed to be tired."
          </p>
          <p style={{ fontSize: 10, color: "rgba(201,169,97,0.95)", letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
            True Confession Series
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ Accordion Item ──────────────────────────────────────────────── */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(244,236,216,0.08)", padding: "20px 0" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "none", border: "none", color: IVORY, fontSize: 15, fontWeight: 400,
        cursor: "pointer", textAlign: "left", fontFamily: "'Poppins', sans-serif", padding: 0,
      }}>
        <span>{question}</span>
        <span style={{ color: GOLD, fontSize: 18, marginLeft: 16, transition: "transform 0.3s ease", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: "12px 0 0", paddingRight: 24 }}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Request Access Form ────────────────────────────────────────────────── */
function RequestAccessForm({ onSuccess }: { onSuccess?: () => void }) {
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", role: "", company: "", linkedin: "", phone: "", source: "", consent_marketing: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/event-august/interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  if (success) return <SuccessState message="Please check your email to confirm your seat. Your formal invitation follows after our review." onReset={() => setSuccess(false)} />;

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 28 }}>
      <div className="ip-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Field label="First name" required><input style={inputBase} value={f.first_name} onChange={e => setF(p => ({ ...p, first_name: e.target.value }))} required /></Field>
        <Field label="Last name" required><input style={inputBase} value={f.last_name} onChange={e => setF(p => ({ ...p, last_name: e.target.value }))} required /></Field>
      </div>
      <Field label="Email" required>
        <input style={inputBase} type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} required />
      </Field>
      <Field label="Role / Title" required><input style={inputBase} value={f.role} onChange={e => setF(p => ({ ...p, role: e.target.value }))} required /></Field>
      <Field label="Company" required><input style={inputBase} value={f.company} onChange={e => setF(p => ({ ...p, company: e.target.value }))} required /></Field>
      <Field label="LinkedIn" required><input style={inputBase} value={f.linkedin} onChange={e => setF(p => ({ ...p, linkedin: e.target.value }))} required /></Field>
      <Field label="Phone (optional)"><input style={inputBase} value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} /></Field>
      <Field label="How did you hear about this evening?"><input style={inputBase} value={f.source} onChange={e => setF(p => ({ ...p, source: e.target.value }))} /></Field>
      <GdprRow id="ci" checked={f.consent_marketing} onChange={v => setF(p => ({ ...p, consent_marketing: v }))} />
      {error && <p style={{ color: "#ef9999", fontSize: 13, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 12 }}>
        <ThinButton type="submit" disabled={loading} variant="gold">{loading ? "Submitting…" : "Submit Request"}</ThinButton>
      </div>
    </form>
  );
}

/* ─── Sponsor Form (refined, kept separate from partner) ─────────────────── */
function SponsorForm({ onSuccess }: { onSuccess?: () => void }) {
  const [f, setF] = useState({ name: "", brand: "", role: "", email: "", phone: "", sponsorship_type: "", message: "", consent_marketing: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const TYPES = ["Headline sponsor", "Experience partner (branded activation on the night)", "Goody bag partner", "Wine / beverage partner", "Not sure — let's discuss"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/event-august/sponsor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setSuccess(true); onSuccess?.();
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  if (success) return <SuccessState message="The team will respond within 48 hours with our partnership pack." onReset={() => setSuccess(false)} />;

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 28 }}>
      <Field label="Name" required><input style={inputBase} value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required /></Field>
      <Field label="Brand or company" required><input style={inputBase} value={f.brand} onChange={e => setF(p => ({ ...p, brand: e.target.value }))} required /></Field>
      <Field label="Role" required><input style={inputBase} value={f.role} onChange={e => setF(p => ({ ...p, role: e.target.value }))} required /></Field>
      <Field label="Email" required><input style={inputBase} type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} required /></Field>
      <Field label="Phone (optional)"><input style={inputBase} value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} /></Field>
      <Field label="Sponsorship interest" required>
        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          {TYPES.map((t, i) => (
            <label key={t} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="radio" name="stype" value={t} checked={f.sponsorship_type === t} onChange={e => setF(p => ({ ...p, sponsorship_type: e.target.value }))} required={i === 0} style={{ marginTop: 4, accentColor: GOLD, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "rgba(244,236,216,0.90)", lineHeight: 1.55, fontWeight: 300 }}>{t}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Tell us about your brand" required>
        <textarea style={{ ...inputBase, resize: "vertical", minHeight: 90, padding: "14px 0" }} value={f.message} onChange={e => setF(p => ({ ...p, message: e.target.value }))} required />
      </Field>
      <GdprRow id="cs" checked={f.consent_marketing} onChange={v => setF(p => ({ ...p, consent_marketing: v }))} />
      {error && <p style={{ color: "#ef9999", fontSize: 13, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 12 }}>
        <ThinButton type="submit" disabled={loading} variant="gold">{loading ? "Submitting…" : "Submit Enquiry"}</ThinButton>
      </div>
    </form>
  );
}

/* ─── Partner Form (kept, refined) ───────────────────────────────────────── */
function PartnerForm({ onSuccess }: { onSuccess?: () => void }) {
  const [f, setF] = useState({ name: "", organisation: "", role: "", email: "", phone: "", linkedin: "", message: "", consent_marketing: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/event-august/partner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setSuccess(true); onSuccess?.();
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  if (success) return <SuccessState message="The team will be in touch within 48 hours." onReset={() => setSuccess(false)} />;

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 28 }}>
      <Field label="Name" required><input style={inputBase} value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required /></Field>
      <Field label="Brand or organisation" required><input style={inputBase} value={f.organisation} onChange={e => setF(p => ({ ...p, organisation: e.target.value }))} required /></Field>
      <Field label="Role" required><input style={inputBase} value={f.role} onChange={e => setF(p => ({ ...p, role: e.target.value }))} required /></Field>
      <Field label="Email" required><input style={inputBase} type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} required /></Field>
      <Field label="Phone (optional)"><input style={inputBase} value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} /></Field>
      <Field label="LinkedIn"><input style={inputBase} value={f.linkedin} onChange={e => setF(p => ({ ...p, linkedin: e.target.value }))} /></Field>
      <Field label="Tell us how you'd like to align" required>
        <textarea style={{ ...inputBase, resize: "vertical", minHeight: 90, padding: "14px 0" }} value={f.message} onChange={e => setF(p => ({ ...p, message: e.target.value }))} required />
      </Field>
      <GdprRow id="cp" checked={f.consent_marketing} onChange={v => setF(p => ({ ...p, consent_marketing: v }))} />
      {error && <p style={{ color: "#ef9999", fontSize: 13, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 12 }}>
        <ThinButton type="submit" disabled={loading} variant="gold">{loading ? "Submitting…" : "Submit Enquiry"}</ThinButton>
      </div>
    </form>
  );
}

/* ─── Contact / Ask a Question ──────────────────────────────────────────── */
function ContactSection() {
  const { isMobile } = useViewport();
  const [f, setF] = useState({ name: "", email: "", message: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/event-august/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setSuccess(true);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <section id="contact-section" className="ip-sec-lg" style={{ background: "#12060A", borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "50px 16px" : "100px 32px" }}>
      <div style={{ maxWidth: isMobile ? "100vw" : 560, margin: "0 auto" }}>
        <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500, textAlign: "center" }}>
          Get in Touch
        </p>
        <h3 className="ip-serif" style={{ fontSize: 34, fontWeight: 500, color: IVORY, margin: "0 0 12px", letterSpacing: "-0.015em", lineHeight: 1.2, textAlign: "center" }}>
          Got a <span style={{ fontStyle: "italic", color: GOLD_SOFT }}>question</span>?
        </h3>
        <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", textAlign: "center", margin: "0 0 12px", lineHeight: 1.7 }}>
          You can email us directly at{" "}
          <a href="mailto:info@eventperfekt.com" style={{ color: GOLD, textDecoration: "none", borderBottom: `1px solid ${GOLD}`, paddingBottom: 1 }}>
            info@eventperfekt.com
          </a>
        </p>
        <p style={{ fontSize: 13, color: "rgba(244,236,216,0.75)", textAlign: "center", margin: "0 0 56px", letterSpacing: "0.04em" }}>
          — or send us a message below —
        </p>

        {success ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ color: GOLD, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>Message received</p>
            <p style={{ color: "rgba(244,236,216,0.92)", fontSize: 14, lineHeight: 1.7, margin: "0 0 32px" }}>Thank you — the team will be in touch within 48 hours.</p>
            <button onClick={() => { setSuccess(false); setF({ name: "", email: "", message: "", website: "" }); }} style={{ background: "none", border: "none", color: GOLD, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", borderBottom: `1px solid ${GOLD}`, paddingBottom: 3 }}>
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 28 }}>
            <div className="ip-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Field label="Your name" required><input style={inputBase} value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required /></Field>
              <Field label="Your email" required><input style={inputBase} type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} required /></Field>
            </div>
            <Field label="Your question or message" required>
              <textarea style={{ ...inputBase, resize: "vertical", minHeight: 120, padding: "14px 0" }} value={f.message} onChange={e => setF(p => ({ ...p, message: e.target.value }))} required />
            </Field>
            {/* Honeypot — hidden field, bots fill it, humans don't */}
            <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
              <input type="text" value={f.website} onChange={e => setF(p => ({ ...p, website: e.target.value }))} tabIndex={-1} autoComplete="off" />
            </div>
            {error && <p style={{ color: "#ef9999", fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8 }}>
              <ThinButton type="submit" disabled={loading} variant="gold">{loading ? "Sending…" : "Send Message"}</ThinButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

/* ─── HeroEmailCapture ── primary, low-commitment entry point with attribution */
function HeroEmailCapture() {
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await captureEmail(email, undefined, "/iamher", referral || undefined);
      trackFunnelEvent('interest_capture', '/iamher', { cta: 'hero_get_details', referral_source: referral });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 14, color: GOLD, fontWeight: 500, letterSpacing: "0.04em",
          borderBottom: `1px solid ${GOLD}`, paddingBottom: 2,
        }}>
          You’re on the list — we’ll be in touch
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ width: "100%" }}>
      {/* Compelling reason */}
      <p style={{
        fontSize: 12, color: "rgba(244,236,216,0.92)", lineHeight: 1.6,
        margin: "0 0 14px", fontFamily: "'Poppins', sans-serif", fontWeight: 300,
      }}>
        Be the first to know when invitations open — including the full evening and the voices leading it.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{
            flex: "1 1 260px",
            background: "transparent",
            border: "none",
            borderBottom: `1px solid rgba(244,236,216,0.50)`,
            color: IVORY,
            fontSize: 15,
            fontFamily: "'Poppins', sans-serif",
            padding: "14px 0",
            outline: "none",
            letterSpacing: "0.02em",
            minWidth: 220,
            transition: "border-color 0.3s ease",
          }}
          onFocus={e => { e.target.style.borderBottomColor = GOLD; }}
          onBlur={e => { e.target.style.borderBottomColor = "rgba(244,236,216,0.35)"; }}
        />
      </div>
      {/* How did you hear about us? — optional, keeps attribution */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <label style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Poppins', sans-serif" }}>
          How did you hear about us? <span style={{ opacity: 0.5 }}>(optional)</span>
        </label>
        <select
          value={referral}
          onChange={e => setReferral(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(244,236,216,0.30)",
            color: "rgba(244,236,216,0.85)",
              fontSize: 11,
              fontFamily: "'Poppins', sans-serif",
              padding: "4px 0",
              outline: "none",
              cursor: "pointer",
              minWidth: 160,
            }}
          >
            <option value="" style={{ background: "#1a0a0e" }}>Select…</option>
            <option value="instagram" style={{ background: "#1a0a0e" }}>Instagram</option>
            <option value="linkedin" style={{ background: "#1a0a0e" }}>LinkedIn</option>
            <option value="friend" style={{ background: "#1a0a0e" }}>Friend / Word of mouth</option>
            <option value="dr_sarah_esther" style={{ background: "#1a0a0e" }}>Dr Sarah / Esther</option>
            <option value="mkfm" style={{ background: "#1a0a0e" }}>MKFM</option>
            <option value="email" style={{ background: "#1a0a0e" }}>Email</option>
            <option value="other" style={{ background: "#1a0a0e" }}>Other</option>
          </select>
        </div>
        {/* Primary submit — sits under "How did you hear about us?" for a clean stack */}
        <button
          type="submit"
          disabled={loading || !email}
          style={{
            width: "100%",
            marginTop: 22,
            padding: "15px 24px",
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: INK,
            background: GOLD,
            border: "none",
            borderRadius: 0,
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.3s ease",
            fontFamily: "Poppins, sans-serif",
            opacity: loading || !email ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Sending…" : "Request the Invitation Details"}
        </button>
        {error && (
          <span style={{ fontSize: 12, color: "#ef9999", marginTop: 6, display: "block" }}>{error}</span>
        )}
      </form>
    );
  }


/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function EventAugust() {
  const { isMobile } = useViewport();
  useEventSEO();
  useVisitorTracking("/iamher", "The Woman Who Leads the Room · Event Perfekt");
  return (
    <div style={{ background: INK, minHeight: "100vh", fontFamily: "'Poppins', sans-serif", color: IVORY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { -webkit-font-smoothing: antialiased; }
        input::placeholder, textarea::placeholder { color: rgba(244,236,216,0.45); }
        input:focus, textarea:focus { border-bottom-color: ${GOLD} !important; }
        .ip-thin-btn:hover:not(:disabled) { letter-spacing: 0.32em; background: rgba(201,169,97,0.08); }
        @keyframes ip-ken-burns { 0% { transform: scale(1.0); } 100% { transform: scale(1.06); } }
        .ip-hero-img { animation: ip-ken-burns 24s ease-out forwards; transform-origin: center 30%; }
        .ip-serif { font-family: 'Poppins', sans-serif; }
        .ip-italic { font-family: 'Poppins', sans-serif; font-style: italic; }
        .ip-rule { display: inline-block; width: 36px; height: 1px; background: ${GOLD_SOFT}; vertical-align: middle; opacity: 0.6; }
        .ip-vrule { display: block; width: 1px; height: 56px; background: ${GOLD_SOFT}; opacity: 0.35; margin: 0 auto; }
        /* ── Mobile ─────────────────────────────────────────────────── */
        @media (max-width: 720px) {
          .hero-h1 { font-size: 40px !important; line-height: 1.08 !important; }
          .hero-sub { font-size: 17px !important; }
          .stat-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .stat-item { border-left: none !important; border-top: 1px solid rgba(244,236,216,0.95) !important; padding: 32px 16px !important; }
          .stat-item:first-child { border-top: none !important; }
          .stat-num { font-size: 44px !important; }
          .why-h2 { font-size: 30px !important; }
          .form-h2 { font-size: 26px !important; }
          .editorial-body { font-size: 15px !important; line-height: 1.85 !important; }
          .editorial-quote { font-size: 18px !important; margin-top: 48px !important; }
          .header-bar { padding: 12px 18px !important; }
          .header-date { font-size: 8px !important; letter-spacing: 0.12em !important; }
          .ip-hero-content { padding: 0 18px !important; align-items: flex-end !important; padding-bottom: 32px !important; }
          .ip-hero-img { object-position: center 18% !important; }
          .ip-hero-section { min-height: max(74vh, 560px) !important; }
          .ip-hero-kicker { margin-bottom: 16px !important; gap: 12px !important; }
          .ip-hero-kicker p { font-size: 8px !important; letter-spacing: 0.26em !important; }
          .ip-hero-title { font-size: 36px !important; margin-bottom: 16px !important; }
          .ip-hero-summary { font-size: 16px !important; margin-bottom: 18px !important; }
          /* form grids collapse to 1 column */
          .ip-form-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          /* section vertical padding reduced */
          .ip-sec-xl  { padding-top: 64px !important; padding-bottom: 48px !important; padding-left: 16px !important; padding-right: 16px !important; }
          .ip-sec-lg  { padding-top: 48px !important; padding-bottom: 48px !important; padding-left: 16px !important; padding-right: 16px !important; }
          .ip-sec-md  { padding-top: 40px !important; padding-bottom: 40px !important; padding-left: 16px !important; padding-right: 16px !important; }
          .ip-sec-sm  { padding-top: 32px !important; padding-bottom: 32px !important; padding-left: 16px !important; padding-right: 16px !important; }
          .ip-form-inner { padding: 44px 16px 60px !important; }
          /* hero content */
          .ip-hero-content { padding: 0 5vw !important; }
          /* partnership / about buttons */
          .ip-btn-row { flex-direction: column !important; align-items: center !important; }
          .ip-thin-btn { width: 100% !important; text-align: center !important; max-width: 280px !important; }
        }
        @media (max-width: 420px) {
          .hero-h1 { font-size: 34px !important; }
          .why-h2 { font-size: 26px !important; }
          .form-h2 { font-size: 22px !important; }
          .ip-form-inner { padding: 40px 14px 54px !important; }
          .ip-sec-xl  { padding-left: 16px !important; padding-right: 16px !important; }
          .ip-sec-lg  { padding-left: 16px !important; padding-right: 16px !important; }
          .ip-sec-md  { padding-left: 16px !important; padding-right: 16px !important; }
          .ip-hero-section { min-height: max(78vh, 520px) !important; }
          img[style*="height: 620"] { height: 360px !important; }
          img[style*="height: 520"] { height: 300px !important; }
          img[style*="height: 480"] { height: 280px !important; }
          img[style*="height: 440"] { height: 260px !important; }
          img[style*="height: 340"] { height: 240px !important; }
        }
      `}</style>

      {/* ── Ticker ─────────────────────────────────────────────────────── */}
      <SocialTicker />

      {/* ── Press badge ─────────────────────────────────────────────────── */}
      <div style={{ background: "#0D060A", borderBottom: "1px solid rgba(201,169,97,0.10)", padding: isMobile ? "8px 16px" : "10px 28px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 9, color: "rgba(244,236,216,0.95)", letterSpacing: "0.26em", textTransform: "uppercase" }}>As featured in</span>
        <a href="https://www.mkfm.com/news/local-business/a-new-womens-evening-experience-launches-in-milton-keynes/" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: "#C9A961", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid rgba(201,169,97,0.10)", paddingBottom: 1 }}>
          MKFM · Milton Keynes
        </a>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(201,169,97,0.06)", display: "inline-block" }} />
        <span style={{ fontSize: 9, color: "rgba(244,236,216,0.95)", letterSpacing: "0.14em" }}>Local Business Feature</span>
      </div>

      <IamherMobileNav
        sticky
        logoText="I Am Her"
        maxWidth={1200}
        headerPadding="12px 28px"
        links={[
          { label: "About", href: "/about-the-movement" },
          { label: "Apply for Your Invitation", href: "/access" },
          { label: "Stay & Explore", href: "/iamher/stay" },
          { label: "Community", href: "/iamher/community" },
          { label: "Media", href: "/iamher/media" },
          { label: "Organisations", href: "/iamher/partnership" },
          { label: "Contact", href: "/contact" },
        ]}
      />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="ip-hero-section" style={{ position: "relative", minHeight: "min(94vh, 880px)", overflow: "hidden", background: INK }}>
        <picture>
          <source srcSet={heroImageWebp} type="image/webp" />
          <img src={heroImage} alt="Aerial view of Willen Lake and Milton Keynes ferris wheel" className="ip-hero-img" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 50%" }} loading="eager" width="1920" height="880" sizes="100vw" />
        </picture>
        {/* Cinematic gradient — darker at edges, lets the women's faces breathe */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 70% at 35% 55%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.4) 55%, rgba(13,3,6,0.75) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 25%, transparent 70%, rgba(13,3,6,0.68) 100%)" }} />

        <div className="ip-hero-content" style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", alignItems: "center", padding: "0 8vw" }}>
          <div style={{ maxWidth: isMobile ? "100vw" : 720 }}>
            <motion.div
              className="ip-hero-kicker"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }}
              style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 40 }}>
              <span className="ip-rule" />
              <p style={{ color: GOLD, fontSize: 10, fontWeight: 500, letterSpacing: "0.4em", textTransform: "uppercase", margin: 0 }}>
                Friday 30 October 2026 · Milton Keynes
              </p>
            </motion.div>

            <motion.h1
              className="hero-h1 ip-hero-title ip-serif"
              initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
              style={{ fontSize: 76, fontWeight: 500, color: IVORY, margin: "0 0 36px", lineHeight: 1.0, letterSpacing: "-0.025em" }}>
              The Woman<br />
              <span style={{ fontStyle: "italic", fontWeight: 400, color: GOLD_SOFT }}>Who Leads</span> the Room
            </motion.h1>

            <motion.p
              className="hero-sub ip-hero-summary ip-italic"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6 }}
              style={{ fontSize: 22, color: "rgba(244,236,216,0.92)", lineHeight: 1.5, margin: "0 0 24px", fontWeight: 400, letterSpacing: "0.005em" }}>
              A private leadership dinner for 100 accomplished women across the UK — founders, directors, executives, business owners and senior decision-makers.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.75 }}
              style={{ fontSize: 15, color: "rgba(244,236,216,0.75)", lineHeight: 1.6, margin: "0 0 40px", fontWeight: 300, letterSpacing: "0.02em" }}>
              Hosted in Milton Keynes on Friday 30 October 2026, the evening brings together women from different industries for dinner, expert conversation, editorial portraiture, visibility and strategic connection.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.85 }}
              style={{ fontSize: 13, color: "rgba(244,236,216,0.60)", lineHeight: 1.6, margin: "0 0 32px", fontWeight: 300, letterSpacing: "0.02em" }}>
              100 invited women · Champagne welcome · Three-course dinner · Leadership, health and confidence conversation · Editorial portraiture · I Am Her campaign feature
            </motion.p>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 1.0 }}
              style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <Link to="/access" onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'hero_apply_invitation' })} style={{ display: "inline-block", textDecoration: "none" }}>
                <ThinButton variant="gold">Apply for Your Invitation →</ThinButton>
              </Link>
              <ThinButton variant="ghost" onClick={() => document.getElementById('evening-schedule')?.scrollIntoView({ behavior: 'smooth' })}>View the Evening</ThinButton>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 1.15 }}
              style={{ fontSize: 12, color: "rgba(244,236,216,0.60)", lineHeight: 1.6, margin: "0 0 40px", fontWeight: 300, letterSpacing: "0.02em" }}>
              Applications are reviewed individually. Approved guests receive a private confirmation link.
            </motion.p>

            {/* Tertiary entry point */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 1.3 }}
              style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <HeroEmailCapture />
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Job B: "This is not that" positioning statement ─────────── */}
      <section className="ip-sec-lg" style={{ background: "#0A0205", borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "36px 16px 32px" : "72px 32px 64px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 680, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <div className="editorial-body" style={{ fontSize: 18, color: "rgba(244,236,216,0.82)", lineHeight: 2.0, fontWeight: 300 }}>
              <p style={{ margin: 0 }}>This is not a women-in-business event. There's no stage of five-step frameworks, no one telling you how to start up. The women in this room have already done that — twice, three times, four. You're past the advice. What you rarely get is a room of people at your level, talking honestly about what comes next.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Wellbeing Authorities ───────────────────────────────────── */}
      <section className="ip-sec-lg" style={{ background: INK, borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "36px 16px 48px" : "72px 32px 96px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 900, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500, textAlign: "center" }}>
              The Experts in the Room
            </p>
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: "0 auto 48px", maxWidth: 640, textAlign: "center" }}>
              Meet the specialists guiding the conversation on health, confidence, and sustaining success at the heart of the evening.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} viewport={{ once: true }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, maxWidth: 800, margin: "0 auto" }}>
              {/* Dr Sarah Jenkins */}
              <div style={{ background: "#0A0205", border: "1px solid rgba(244,236,216,0.12)", padding: "28px 28px 32px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(to right, transparent, rgba(201,169,97,0.95), transparent)" }} />
                <img
                  src={drSarahJenkinsHeadshot}
                  alt="Dr Sarah Jenkins — Harley Street Women's Health Specialist"
                  style={{ width: "100%", height: 340, objectFit: "cover", objectPosition: "center top", borderRadius: 10, display: "block", filter: "saturate(0.95) contrast(1.05)", marginBottom: 20 }}
                />
                <p style={{ fontSize: 18, color: IVORY, fontWeight: 500, margin: "0 0 4px", lineHeight: 1.3 }}>Dr Sarah Jenkins</p>
                <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>Harley Street Women's Health Specialist</p>
                <p style={{ fontSize: 12, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: "0 0 16px" }}>
                  MBBCh · Fellow of the Royal Society of Medicine (FRSM) · Senior Member of the European Society of Aesthetic Gynaecology (ESAG) · Associate Member of the British College of Aesthetic Medicine (BCAM) · Affiliate Member of the Royal College of Obstetricians and Gynaecologists · UK Women's Health Advocate of the Year 2025 · Safety in Beauty Rising Star Award 2024
                </p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.92)", lineHeight: 1.85, margin: "0 0 16px" }}>
                  Dr Sarah Jenkins is a multi-award-winning UK doctor and women's health specialist with over a decade of experience across NHS and private practice. Her work focuses on women's health, hormonal balance, intimate health, and the often-overlooked physical realities experienced by women who carry significant responsibility.
                </p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.52)", lineHeight: 1.85, margin: "0 0 16px" }}>
                  A national broadcaster — featured on This Morning, in Hello! Magazine, and on Olivia Attwood's The Price of Perfection — Dr Sarah was honoured with the UK Women's Health Advocate of the Year 2025 and Safety in Beauty Rising Star Award 2024.
                </p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.52)", lineHeight: 1.85, margin: 0 }}>
                  At The Woman Who Leads the Room, Dr Sarah leads the conversation on the physical and hormonal realities that shape how women sustain and stay — and what organisations need to understand about supporting them.
                </p>
              </div>

              {/* Esther Emenike-Okorie */}
              <div style={{ background: "#0A0205", border: "1px solid rgba(244,236,216,0.12)", padding: "28px 28px 32px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(to right, transparent, rgba(201,169,97,0.95), transparent)" }} />
                <img
                  src={estherEmenikeHeadshot}
                  alt="Esther Emenike-Okorie — CEO, Shujo"
                  style={{ width: "100%", height: 340, objectFit: "cover", objectPosition: "center top", borderRadius: 10, display: "block", filter: "saturate(0.95) contrast(1.05)", marginBottom: 20 }}
                />
                <p style={{ fontSize: 18, color: IVORY, fontWeight: 500, margin: "0 0 4px", lineHeight: 1.3 }}>Esther Emenike-Okorie</p>
                <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>CEO, Shujo</p>
                <p style={{ fontSize: 12, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: "0 0 16px" }}>
                  CEO · Shujo · Women's Health & Emotional Wellbeing
                </p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.92)", lineHeight: 1.85, margin: "0 0 16px" }}>
                  Esther Emenike-Okorie is a registered nurse and health and social care professional with deep expertise in the emotional and psychological realities women face in leadership.
                </p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.52)", lineHeight: 1.85, margin: "0 0 16px" }}>
                  Her work sits at the intersection of clinical care, emotional health, and the invisible demands placed on high-performing women.
                </p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.52)", lineHeight: 1.85, margin: 0 }}>
                  At The Woman Who Leads the Room, Esther brings her compassionate, evidence-based approach to the conversation on how women feel — not just how they perform. She is the wellbeing authority behind the emotional dimension of the evening: the quiet weight of responsibility, the unspoken expectations, and the restoration that comes from being truly understood.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── The Evening Schedule — What Awaits You ───────────────────── */}
      <section id="evening-schedule" className="ip-sec-lg" style={{ background: "#0D0408", borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "46px 16px" : "92px 32px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 720, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.95 }} viewport={{ once: true }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 40px", fontWeight: 500 }}>
              The Evening
            </p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 400, color: IVORY, margin: "0 0 48px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              What awaits you
            </h2>

            <div style={{ display: "grid", gap: 28 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ flex: "0 0 60px", textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.08em", fontWeight: 500, margin: 0, lineHeight: 1.3 }}>18:00</p>
                </div>
                <div style={{ flex: 1, borderLeft: "1px solid rgba(201,169,97,0.10)", paddingLeft: 20 }}>
                  <p style={{ fontSize: 16, color: IVORY, fontWeight: 500, margin: "0 0 6px" }}>Arrival & Welcome</p>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: 0 }}>Welcome drink, champagne, and curated introductions. The first hour of the evening is designed to ease you in, meet the room, and settle the week behind you.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ flex: "0 0 60px", textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.08em", fontWeight: 500, margin: 0, lineHeight: 1.3 }}>19:00</p>
                </div>
                <div style={{ flex: 1, borderLeft: "1px solid rgba(201,169,97,0.10)", paddingLeft: 20 }}>
                  <p style={{ fontSize: 16, color: IVORY, fontWeight: 500, margin: "0 0 6px" }}>Wining & Dining</p>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: 0 }}>Three-course dining in an intimate setting. Good food, honest conversation, and the space to be present without the pressure of performance.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ flex: "0 0 60px", textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.08em", fontWeight: 500, margin: 0, lineHeight: 1.3 }}>20:00</p>
                </div>
                <div style={{ flex: 1, borderLeft: "1px solid rgba(201,169,97,0.10)", paddingLeft: 20 }}>
                  <p style={{ fontSize: 16, color: IVORY, fontWeight: 500, margin: "0 0 4px" }}>Leadership, Health &amp; Confidence Conversation</p>
                  <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.04em", margin: "0 0 6px", fontWeight: 400 }}>Led by Dr Sarah Jenkins and Esther Emenike-Okorie</p>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: 0 }}>Led by Dr Sarah Jenkins and Esther Emenike-Okorie, this conversation explores the physical, emotional and confidence realities of leading at this level. Not a workshop — a grounded conversation for women carrying real responsibility.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ flex: "0 0 60px", textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.08em", fontWeight: 500, margin: 0, lineHeight: 1.3 }}>21:00</p>
                </div>
                <div style={{ flex: 1, borderLeft: "1px solid rgba(201,169,97,0.10)", paddingLeft: 20 }}>
                  <p style={{ fontSize: 16, color: IVORY, fontWeight: 500, margin: "0 0 6px" }}>Storytelling & Connection</p>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: 0 }}>Fireside storytelling, meaningful connection, and the kind of conversations that only happen when the room is right. Music. Soft light. The right mood.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ flex: "0 0 60px", textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.08em", fontWeight: 500, margin: 0, lineHeight: 1.3 }}>22:30</p>
                </div>
                <div style={{ flex: 1, borderLeft: "1px solid rgba(201,169,97,0.10)", paddingLeft: 20 }}>
                  <p style={{ fontSize: 16, color: IVORY, fontWeight: 500, margin: "0 0 6px" }}>Closing & Departure</p>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: 0 }}>Final reflections, a quiet word, and the feeling of leaving lighter than you arrived. The evening ends slowly — no rush, no abrupt ending.</p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", fontStyle: "italic", margin: "40px 0 0", lineHeight: 1.6, textAlign: "center" }}>
              Editorial portraiture, champagne, the I Am Her campaign feature, and private arrival details shared only with confirmed guests.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Image break above conversations section ─────────────────── */}
      <div style={{ width: "100%", lineHeight: 0 }}>
        <img
          src={roomImage}
          alt="Women in evening wear laughing together at a luxury event"
          style={{ width: "100%", height: "clamp(260px, 40vw, 520px)", objectFit: "cover", objectPosition: "center 30%", display: "block" }}
          loading="lazy"
        />
      </div>

      {/* ── Job C: "The conversations that don't happen anywhere else" ── */}
      <section className="ip-sec-lg" style={{ background: "#0D0408", borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "40px 16px 48px" : "80px 32px 96px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 720, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>
              The Programme
            </p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400, color: IVORY, margin: "0 0 48px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              The conversations that don't<br />happen anywhere else
            </h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.95, delay: 0.1 }} viewport={{ once: true }}>
            <div style={{ display: "grid", gap: 20 }}>
              {[
                {
                  label: "Longevity — sustaining what you've built",
                  body: "You've spent years scaling. What does sustaining it for the next decade actually take — in the company, and in how you lead?",
                },
                {
                  label: "Women's health as you lead",
                  body: "With Dr Sarah Jenkins (Harley Street, women's health) — the physical and hormonal realities of carrying significant responsibility that no one schedules time for.",
                },
                {
                  label: "How you show up",
                  body: "With Esther Emenike-Okorie — confidence, presence, and how you carry yourself when you're the one others look to.",
                },
                {
                  label: "Financial longevity",
                  body: "A frank conversation about building wealth that lasts — property, investment, sustainability — for women past the first-round stage.",
                },
                {
                  label: "The room itself",
                  body: "Founders and leaders of established businesses across industries. The woman two seats away may need exactly what you've built — and you may need what she has.",
                },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "20px 0", borderTop: "1px solid rgba(244,236,216,0.08)" }}>
                  <div style={{ flex: "0 0 24px", paddingTop: 3 }}>
                    <span style={{ color: GOLD, fontSize: 10, fontWeight: 500, opacity: 0.7 }}>{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, color: IVORY, fontWeight: 500, margin: "0 0 6px", lineHeight: 1.4 }}>{item.label}</p>
                    <p style={{ fontSize: 14, color: "rgba(244,236,216,0.58)", lineHeight: 1.75, margin: 0 }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Invitation image break ───────────────────────────────────── */}
      <div style={{ width: "100%", lineHeight: 0 }}>
        <img
          src={invitationImage}
          alt="A woman opening a luxury invitation envelope"
          style={{ width: "100%", height: "clamp(420px, 60vw, 720px)", objectFit: "cover", objectPosition: "center 55%", display: "block" }}
          loading="lazy"
        />
      </div>

      <section className="ip-sec-lg" style={{ background: "#0A0205", borderTop: "none", padding: isMobile ? "46px 16px" : "92px 32px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 720, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.95 }} viewport={{ once: true }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 40px", fontWeight: 500 }}>
              Who This Is For
            </p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 400, color: IVORY, margin: "0 0 32px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              Built for the woman behind the title
            </h2>
            <div className="editorial-body" style={{ fontSize: 17, color: "rgba(244,236,216,0.90)", lineHeight: 1.95, fontWeight: 300 }}>
              <p style={{ margin: "0 0 28px" }}>This evening is designed for founders, directors, executives, and women who carry significant responsibility — women who have already built businesses, led organisations, and navigated real complexity. Not early-career networking. Not generic advice. A room where expertise is respected and the woman beside you understands the quiet weight of leadership without explanation.</p>

              <div style={{ margin: "0 0 28px", padding: "24px", border: "1px solid rgba(244,236,216,0.08)", background: "rgba(244,236,216,0.015)" }}>
                <p style={{ color: GOLD, fontSize: 9, letterSpacing: "0.34em", textTransform: "uppercase", fontWeight: 500, margin: "0 0 16px" }}>Not this evening</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "rgba(244,236,216,0.85)", fontSize: 15, letterSpacing: "0.01em", lineHeight: 2 }}>
                  {["Not a networking event.", "Not a women-in-business conference.", "Not a coaching room.", "Not a room full of advice."].map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span style={{ color: GOLD, fontSize: 11 }}>—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p style={{ margin: 0, fontStyle: "italic", color: IVORY, fontSize: 18, lineHeight: 1.75 }}>The right women. The right altitude. The conversations that actually matter.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Hero invitation image ─────────────────────────────────────── */}
      <div style={{ width: "100%", lineHeight: 0 }}>
        <img
          src={invitationHeroImage}
          alt="A woman receiving a personal invitation on her phone"
          style={{ width: "100%", height: "clamp(420px, 60vw, 720px)", objectFit: "cover", objectPosition: "center 35%", display: "block" }}
          loading="lazy"
        />
      </div>

      {/* ── How Invitations Work ─────────────────────────────────────── */}
      <section className="ip-sec-lg" style={{ background: "#0D0408", borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "46px 16px" : "92px 32px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 720, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.95 }} viewport={{ once: true }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 40px", fontWeight: 500 }}>
              How Invitations Work
            </p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 400, color: IVORY, margin: "0 0 32px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              Simple, private, and personal
            </h2>
            <div style={{ display: "grid", gap: 20 }}>
              {[
                { step: "01", title: "Apply", body: "Complete the invitation request. Share who you are, what you lead, and why this evening matters to you." },
                { step: "02", title: "Review", body: "Every application is reviewed individually. We look for alignment with the room, not credentials on paper." },
                { step: "03", title: "Confirmation", body: "Approved guests receive a private confirmation link. Your place is reserved once confirmed." },
                { step: "04", title: "Arrival", body: "Detailed arrival instructions, venue address, and private guest details are shared two weeks before the evening." },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "20px 0", borderTop: "1px solid rgba(244,236,216,0.08)" }}>
                  <div style={{ flex: "0 0 40px", paddingTop: 3 }}>
                    <span style={{ color: GOLD, fontSize: 10, fontWeight: 500, opacity: 0.7 }}>{item.step}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, color: IVORY, fontWeight: 500, margin: "0 0 6px", lineHeight: 1.4 }}>{item.title}</p>
                    <p style={{ fontSize: 14, color: "rgba(244,236,216,0.58)", lineHeight: 1.75, margin: 0 }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 36, padding: "24px", border: "1px solid rgba(201,169,97,0.15)", background: "rgba(201,169,97,0.06)", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "rgba(244,236,216,0.95)", margin: "0 0 16px", fontStyle: "italic" }}>
                Limited to 100 invited women · Attendance is by invitation, with a £300 guest contribution (plus VAT) · Applications reviewed individually
              </p>
              <Link to="/access" onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'how_invitations_apply' })} style={{ display: "inline-block", textDecoration: "none" }}>
                <ThinButton variant="gold">Apply for Your Invitation →</ThinButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stay & Explore Banner ─────────────────────────────────────── */}
      <section className="ip-sec-lg" style={{ background: "#15070D", borderTop: "1px solid rgba(201,169,97,0.12)", borderBottom: "1px solid rgba(201,169,97,0.10)", padding: isMobile ? "40px 16px" : "80px 32px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 720, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95 }}
            viewport={{ once: true }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
          >
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 24px", fontWeight: 500 }}>
              Stay & Explore
            </p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 400, color: IVORY, margin: "0 0 18px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              Have you been to Milton Keynes before?
            </h2>
            <p style={{ fontSize: 17, color: "rgba(244,236,216,0.95)", lineHeight: 1.8, margin: "0 0 28px", fontWeight: 300, maxWidth: 520 }}>
              Make it a weekend. The city is built for it. The evening is the beginning. The weekend is yours.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(201,169,97,0.06)", border: "1px solid rgba(201,169,97,0.38)", borderRadius: 6, padding: "14px 24px", marginBottom: 28 }}>
              <span style={{ fontSize: 11, color: GOLD, letterSpacing: "0.08em", fontWeight: 500 }}>
                <span style={{ fontSize: 16, marginRight: 6 }}>✨</span>
                Guest stay options and local recommendations will be shared with confirmed guests
              </span>
            </div>
            <Link to="/iamher/stay" onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'stay_explore_banner' })} style={{ display: "inline-block", textDecoration: "none" }}>
              <ThinButton variant="gold">Explore the Weekend Guide →</ThinButton>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="ip-sec-lg" style={{ background: INK, borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "50px 16px" : "100px 32px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 760, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} viewport={{ once: true }}>
            <img
              src={womanBehindRoomImage}
              alt="Editorial portrait for the evening"
              style={{ width: "100%", height: 620, objectFit: "cover", objectPosition: "center top", borderRadius: 10, display: "block", filter: "saturate(0.95) contrast(1.05)", marginBottom: 28 }}
              loading="lazy"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.95 }} viewport={{ once: true }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 22px", fontWeight: 500 }}>
              Why This Evening Exists
            </p>
            <div className="editorial-body" style={{ fontSize: 17, color: "rgba(244,236,216,0.90)", lineHeight: 1.95, fontWeight: 300 }}>
              <p style={{ margin: "0 0 22px" }}>The most accomplished women rarely get a room of true peers — women from other industries who understand the weight of leadership without needing it explained.</p>
              <p style={{ margin: "0 0 22px" }}>This evening exists to create that room.</p>
              <p style={{ margin: "0 0 22px" }}>A room for women who have built, led, decided, carried responsibility and stayed standing through different seasons of personal challenge, business growth and leadership at a high level.</p>
              <p style={{ margin: "0 0 22px" }}>The mission is to reshape how women are recognised, supported and retained in leadership. Not only by celebrating success, but by making visible the realities that shape longevity: confidence, visibility, women’s health, financial health, emotional load, identity, decision-making and the pressure of carrying responsibility at a high level.</p>
              <p style={{ margin: "0 0 22px" }}>The vision is bigger than one dinner. It is to build a platform that helps organisations, employers, partners and cities understand what women need in order to keep leading, keep building and keep growing through every stage of life and business.</p>
              <p style={{ margin: "0 0 22px" }}>This first room is where that conversation begins.</p>
              <p className="ip-italic" style={{ margin: 0, fontSize: 18, color: GOLD_SOFT, lineHeight: 1.75, fontWeight: 400 }}>
                Because the right room changes everything.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="ip-sec-lg" style={{ background: INK, padding: isMobile ? "36px 16px 52px" : "72px 32px 104px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 680, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <img
              src={experienceImage}
              alt="Champagne flute held at an intimate luxury evening for women who lead"
              style={{ width: "100%", height: 480, objectFit: "cover", objectPosition: "center 30%", borderRadius: 10, display: "block", marginBottom: 40, filter: "saturate(0.95) contrast(1.04)" }}
              loading="lazy"
            />
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 40px", fontWeight: 500 }}>
              The Experience
            </p>
            <div className="editorial-body" style={{ fontSize: 17, color: "rgba(244,236,216,0.90)", lineHeight: 1.95, fontWeight: 300 }}>
              <p style={{ margin: "0 0 22px" }}>Set within a beautifully curated setting, this evening brings together conversation, hospitality, wellbeing, editorial portraiture, and an atmosphere designed for genuine conversation. Champagne poured slowly. Conversations that carry weight. Nothing performative, nothing forced — just the right room, in the right mood, for the right women.</p>
              <p style={{ margin: "0 0 22px" }}><em style={{ color: GOLD_SOFT, fontStyle: "italic" }}>Swapping suits for dresses. Swapping spreadsheets for champagne. Swapping titles for truth.</em></p>
              <p className="ip-italic" style={{ margin: 0, fontSize: 18, color: GOLD_SOFT, lineHeight: 1.75, fontWeight: 400 }}>
                Because the right room is the whole point.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Founding Partnership ─────────────────────── */}
      <section className="ip-sec-lg" style={{ background: INK, borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "40px 16px 48px" : "80px 32px 96px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 760, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <img
              src={organisationsImage}
              alt="Women sharing champagne at an intimate event"
              style={{ width: "100%", height: 440, objectFit: "cover", objectPosition: "center 26%", borderRadius: 10, display: "block", marginBottom: 40, filter: "saturate(0.95) contrast(1.05)" }}
              loading="lazy"
            />
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500, textAlign: "center" }}>
              Partnership Opportunities
            </p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(26px, 3.5vw, 34px)", fontWeight: 400, color: IVORY, margin: "0 0 32px", letterSpacing: "-0.01em", lineHeight: 1.2, textAlign: "center" }}>
              Partnership Opportunities
            </h2>

            <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center" }}>
              <div className="editorial-body" style={{ fontSize: 16, color: "rgba(244,236,216,0.88)", lineHeight: 1.85, fontWeight: 300 }}>
                <p style={{ margin: "0 0 28px" }}>We are inviting a small number of aligned financial, lifestyle, hospitality, beauty, wellness and media partners to be meaningfully present within the evening. Partnership details are available on request.</p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <Link to="/iamher/partnership" onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'enquire_partnership' })} style={{ display: "inline-block", textDecoration: "none" }}>
                  <ThinButton variant="gold">Explore Partnership →</ThinButton>
                </Link>
                <a href="mailto:info@eventperfekt.com?subject=Partnership%20Enquiry%20—%20The%20Woman%20Who%20Leads%20the%20Room" onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'email_partnership' })} style={{ display: "inline-block", textDecoration: "none" }}>
                  <ThinButton variant="ghost">Email Us Directly →</ThinButton>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── I Am Her — The Campaign ──────────────────────────────────── */}
      <section className="ip-sec-lg" style={{ background: INK, borderTop: "1px solid rgba(244,236,216,0.08)", padding: isMobile ? "36px 16px 48px" : "72px 32px 96px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 760, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>
              The Campaign
            </p>
            <h2 className="ip-serif" style={{ fontSize: 32, fontWeight: 500, color: IVORY, margin: "0 0 24px", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
              I Am Her
            </h2>
            <div className="editorial-body" style={{ fontSize: 17, color: "rgba(244,236,216,0.90)", lineHeight: 1.95, fontWeight: 300, marginBottom: 48 }}>
              <p style={{ margin: "0 0 22px" }}>In the weeks before 30 October, the room reveals itself. Every woman confirmed in <em style={{ color: GOLD_SOFT, fontStyle: "italic" }}>The Woman Who Leads the Room</em> is invited into the I Am Her editorial campaign — a curated spotlight celebrating who she is, what she leads, and the business she has built.</p>
              <p style={{ margin: "0 0 22px" }}>Her name, her statement, her presence. Featured across our platforms, her own, and the women in the room with her.</p>
              <p className="ip-italic" style={{ margin: 0, fontSize: 18, color: GOLD_SOFT, lineHeight: 1.75, fontWeight: 400 }}>
                This is not promotion. It is recognition — for the woman behind the title.
              </p>
            </div>
          </motion.div>

          {/* Campaign hero image — editorial moment for the women behind the title */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.15 }} viewport={{ once: true }} style={{ margin: "48px 0 40px" }}>
            <div style={{ position: "relative", overflow: "hidden", border: "1px solid rgba(244,236,216,0.08)" }}>
              <img src={campaignHeroImage} alt="The Woman Who Leads the Room — a private leadership dinner for women who lead" style={{ width: "100%", height: "auto", display: "block" }} loading="lazy" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2 }} viewport={{ once: true }}>

            {/* I Am Her Card feature block */}
            <div style={{
              border: "1px solid rgba(201,169,97,0.28)",
              background: "rgba(201,169,97,0.06)",
              overflow: "hidden",
              marginBottom: 28,
            }}>
              <div style={{ background: "#1A0010", borderBottom: "1px solid rgba(201,169,97,0.15)", padding: "11px 24px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, display: "inline-block", opacity: 0.65, flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: "rgba(201,169,97,0.92)", letterSpacing: "0.3em", textTransform: "uppercase" }}>The Campaign · I Am Her Card</span>
              </div>
              <div style={{ padding: "36px 32px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
                <h3 className="ip-serif" style={{ fontSize: 22, fontWeight: 400, color: IVORY, margin: 0, lineHeight: 1.2 }}>
                  Create your I Am Her Card
                </h3>
                <p style={{ fontSize: 15, color: "rgba(244,236,216,0.92)", lineHeight: 1.85, margin: 0, maxWidth: 560, fontWeight: 300 }}>
                  Every woman in the room gets her own I Am Her editorial card — your name, your title, your statement. Designed to be shared. Built to be seen. Generate yours in under a minute and put your presence into the campaign.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8, flexWrap: "wrap" }}>
                  <Link
                    to="/iamher/card"
                    onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'campaign_card_cta' })}
                    style={{ textDecoration: "none" }}
                  >
                    <ThinButton variant="gold">Create Your Card →</ThinButton>
                  </Link>
                  <span style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", letterSpacing: "0.12em" }}>Free · Takes 60 seconds</span>
                </div>
              </div>
            </div>

            {/* Job D — closing distinction line */}
            <div style={{ margin: "0 0 28px", padding: "32px 28px", border: "1px solid rgba(244,236,216,0.08)", background: "rgba(244,236,216,0.015)" }}>
              <p className="ip-italic" style={{ fontSize: 17, color: "rgba(244,236,216,0.72)", lineHeight: 1.85, margin: 0, fontWeight: 300 }}>
                No one performs here. No one lectures. No one hands you a worksheet. Just the right women — at the right altitude — having the conversations that matter, in a room built for restoration, not output.
              </p>
            </div>

            <div style={{ padding: "28px 24px", border: "1px solid rgba(201,169,97,0.15)", background: "rgba(201,169,97,0.06)", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "rgba(244,236,216,0.95)", margin: "0 0 16px", fontStyle: "italic" }}>
                This room is by invitation.
              </p>
              <Link to="/access" onClick={() => trackFunnelEvent('cta_click', '/iamher', { cta: 'bottom_apply_invitation' })} style={{ display: "inline-block", textDecoration: "none" }}>
                <ThinButton variant="gold">Apply for Your Invitation →</ThinButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Ask Us a Question ────────────────────────────────────────── */}
      <ContactSection />

      {/* ── I AM HER: The Stories Behind the Room ─────────────────────── */}
      <StoriesHeroSection />

      {/* ── Frequently Asked Questions ───────────────────────────────── */}
      <section className="ip-sec-lg" style={{ background: "#0D0408", borderTop: "1px solid rgba(244,236,216,0.08)", padding: "72px 32px 96px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 640, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }} viewport={{ once: true }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500, textAlign: "center" }}>
              Questions
            </p>
            <h2 className="ip-serif" style={{ fontSize: 32, fontWeight: 500, color: IVORY, margin: "0 0 48px", letterSpacing: "-0.01em", lineHeight: 1.15, textAlign: "center" }}>
              Frequently Asked
            </h2>

            {[
              { q: "Is this open to the public?", a: "No. This is an invitation-only evening. Every guest is personally invited or nominated by a confirmed attendee." },
              { q: "What is the dress code?", a: "Evening elegance. Cocktail or formal attire. We encourage you to dress in a way that reflects the woman you are — not the role you hold during the week." },
              { q: "Can I bring a guest?", a: "Confirmed guests may nominate one additional woman. Nominees are reviewed to preserve the integrity and intimacy of the room." },
              { q: "What does the guest contribution cover?", a: "The full evening experience — welcome reception, curated dining, champagne, music, editorial portraiture, leadership health and confidence conversation, and the I Am Her campaign feature." },
              { q: "Where exactly is it held?", a: "A premium venue in Milton Keynes. Confirmed guests receive the full address and arrival details two weeks before the event." },
              { q: "Will there be photography?", a: "Yes — editorial portraiture and candid photography by our photographer. You will be asked for media consent during registration and may opt out at any time." },
              { q: "What if I cannot attend after confirming?", a: "Please inform us as soon as possible. Tickets are non-refundable, but in exceptional circumstances we may offer a transfer to a future Event Perfekt evening." },
              { q: "How do I nominate a woman for the I Am Her campaign?", a: "Confirmed guests will receive a private link to submit their campaign feature, including a portrait, statement, and business details." },
            ].map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ background: INK, borderTop: "1px solid rgba(244,236,216,0.08)", padding: "56px 32px 40px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "0 0 4px", letterSpacing: "0.02em" }}>
          <a href="mailto:info@eventperfekt.com" style={{ color: GOLD, textDecoration: "none", letterSpacing: "0.06em" }}>info@eventperfekt.com</a>
        </p>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", margin: "20px 0 0", letterSpacing: "0.18em", textTransform: "uppercase" }}>© 2026 Event Perfekt Global Ltd · Hosted privately</p>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", margin: "8px 0 0" }}>
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
      <ElizabethChat page="home" />
    </div>
  );
}
