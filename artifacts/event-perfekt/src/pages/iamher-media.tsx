import { useState, useRef, useEffect } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { useViewport } from "@/hooks/use-viewport";
import EmailCapturePopup from "@/components/EmailCapturePopup";
import {
  Play, Download, ExternalLink, FileText, Video, Radio, Mic, Newspaper,
  Image, ChevronRight, Volume2, VolumeX, Share2, Facebook, Linkedin,
  Twitter, Copy, Check, Code, Eye, Gift
} from "lucide-react";
const ESTHER_VIDEO_URL = "/assets/Esther_1781097759284.mp4";
const EVENT_INTRO_URL = "/videos/event-intro.mp4";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

const PRESS_CLIPS = [
  {
    title: "MKFM Radio — A new women's evening experience launches in Milton Keynes",
    outlet: "MKFM · Milton Keynes",
    date: "June 2026",
    type: "article",
    url: "https://www.mkfm.com/news/local-business/a-new-womens-evening-experience-launches-in-milton-keynes/",
    excerpt: "Event Perfekt announces a new invitation-only evening for accomplished women in the city — a private space designed for founders, executives, and professionals to connect beyond the boardroom.",
    icon: Newspaper,
  },
  {
    title: "MKFM — Local Business Feature",
    outlet: "MKFM · Milton Keynes",
    date: "June 2026",
    type: "feature",
    url: "https://www.mkfm.com/news/local-business/a-new-womens-evening-experience-launches-in-milton-keynes/",
    excerpt: "Featured in the MKFM Local Business section as a new cultural offering in the city.",
    icon: Radio,
  },
];

const MEDIA_KIT_ITEMS = [
  {
    label: "I Am Her — Corporate Brochure",
    format: "PDF",
    desc: "Partnership and sponsorship overview",
    href: "/iamher/brochure",
    icon: FileText,
  },
  {
    label: "Event One-Pager",
    format: "PDF",
    desc: "Quick facts, date, venue, and audience profile",
    href: "/iamher/brochure",
    icon: FileText,
  },
  {
    label: "Press Release",
    format: "PDF",
    desc: "Official press release for media outlets",
    href: "#",
    icon: Newspaper,
  },
  {
    label: "Logo Pack",
    format: "ZIP",
    desc: "3D logo, wordmark, and brand guidelines",
    href: "#",
    icon: Image,
  },
];

const VIDEOS: { title: string; duration: string; description: string; comingSoon: boolean }[] = [];

const PODCASTS = [
  {
    title: "The Story Behind the Room — Coming Soon",
    episode: "Episode 1",
    description: "A short-form interview series with the women who lead the room.",
  },
];

// ── Social Share ──────────────────────────────────────────────────────────
function SocialShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const shareText = encodeURIComponent(title);
  const shareUrl = encodeURIComponent(url);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "rgba(244,236,216,0.65)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Share</span>
      <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer"
        style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(244,236,216,0.06)", border: "1px solid rgba(244,236,216,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: IVORY, transition: "all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(244,236,216,0.1)"; e.currentTarget.style.color = IVORY; }}
        aria-label="Share on X"
      >
        <Twitter className="w-3.5 h-3.5" />
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer"
        style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(244,236,216,0.06)", border: "1px solid rgba(244,236,216,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: IVORY, transition: "all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(244,236,216,0.1)"; e.currentTarget.style.color = IVORY; }}
        aria-label="Share on Facebook"
      >
        <Facebook className="w-3.5 h-3.5" />
      </a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noopener noreferrer"
        style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(244,236,216,0.06)", border: "1px solid rgba(244,236,216,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: IVORY, transition: "all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(244,236,216,0.1)"; e.currentTarget.style.color = IVORY; }}
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="w-3.5 h-3.5" />
      </a>
      <button onClick={copy}
        style={{ width: 32, height: 32, borderRadius: "50%", background: copied ? "rgba(201,169,97,0.15)" : "rgba(244,236,216,0.06)", border: "1px solid rgba(244,236,216,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: copied ? GOLD : IVORY, cursor: "pointer", transition: "all 0.2s" }}
        aria-label="Copy link"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ── Event Intro Video Player ───────────────────────────────────────────────
function EventIntroPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(201,169,97,0.12)", background: "#14090D" }}>
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0A0406" }}>
        <video
          ref={videoRef}
          src={EVENT_INTRO_URL}
          poster="/assets/iamher-hero-home.webp"
          preload="none"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
          playsInline
          muted
          loop
          onClick={togglePlay}
          aria-label="I Am Her event introduction video"
        />
        {!isPlaying && (
          <button onClick={togglePlay}
            style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.35)", cursor: "pointer", border: "none", width: "100%", height: "100%"
            }}
            aria-label="Play event introduction video"
          >
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(201,169,97,0.55)", transition: "transform 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <Play className="w-7 h-7" style={{ color: INK, marginLeft: 4 }} fill={INK} />
            </div>
          </button>
        )}
        {/* Mute toggle */}
        <button onClick={toggleMute}
          style={{
            position: "absolute", bottom: 16, right: 16, zIndex: 5,
            width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(244,236,216,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
            color: IVORY, cursor: "pointer", backdropFilter: "blur(4px)"
          }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 500, color: IVORY, margin: "0 0 6px" }}>
              I Am Her — Event Introduction
            </h3>
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", margin: 0, lineHeight: 1.5, maxWidth: 560 }}>
              A private, invitation-only evening for accomplished women. The invitation, the experience, and the room.
            </p>
          </div>
          <SocialShare url="https://eventperfekt.net/iamher/media" title="I Am Her — Event Introduction Video" />
        </div>
      </div>
    </div>
  );
}

// ── Video Player ────────────────────────────────────────────────────────────
function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(201,169,97,0.12)", background: "#14090D" }}>
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0A0406" }}>
        <video
          ref={videoRef}
          src={ESTHER_VIDEO_URL}
          poster="/assets/esther-poster.jpg"
          preload="none"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
          playsInline
          muted
          loop
          onClick={togglePlay}
          aria-label="Esther Emenike on the I Am Her initiative"
        />
        {!isPlaying && (
          <button onClick={togglePlay}
            style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.35)", cursor: "pointer", border: "none", width: "100%", height: "100%"
            }}
            aria-label="Play video"
          >
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(201,169,97,0.55)", transition: "transform 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <Play className="w-7 h-7" style={{ color: INK, marginLeft: 4 }} fill={INK} />
            </div>
          </button>
        )}
        {/* Mute toggle */}
        <button onClick={toggleMute}
          style={{
            position: "absolute", bottom: 16, right: 16, zIndex: 5,
            width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(244,236,216,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
            color: IVORY, cursor: "pointer", backdropFilter: "blur(4px)"
          }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 500, color: IVORY, margin: "0 0 6px" }}>
              Esther Emenike — The Story Behind the Room
            </h3>
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", margin: 0, lineHeight: 1.5, maxWidth: 560 }}>
              The wellbeing authority behind the room shares why this evening matters, who it is for, and what happens when the women who lead the room finally meet.
            </p>
          </div>
          <SocialShare url="https://eventperfekt.net/iamher/media" title="Esther Emenike on the I Am Her initiative — The Story Behind the Room" />
        </div>
      </div>
    </div>
  );
}

// ── Embed Tool ──────────────────────────────────────────────────────────
function EmbedTool() {
  const [copied, setCopied] = useState(false);
  const embedCode = `<iframe src="https://eventperfekt.net/iamher/media" width="100%" height="480" frameborder="0" allowfullscreen style="border-radius:12px; border:1px solid rgba(201,169,97,0.12);" title="I Am Her — Event Introduction Video"></iframe>`;
  const copy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="media-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,169,97,0.08)", border: "1px solid rgba(201,169,97,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Code className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: IVORY, margin: 0 }}>Embed This Video</h3>
      </div>
      <p style={{ fontSize: 13, color: "rgba(244,236,216,0.65)", margin: 0, lineHeight: 1.5 }}>
        Copy the code below to embed the I Am Her event introduction on your blog, website, or article.
      </p>
      <pre style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(244,236,216,0.08)", borderRadius: 6, padding: 12, fontSize: 11, color: "rgba(244,236,216,0.85)", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5, fontFamily: "Poppins, sans-serif" }}>
        {embedCode}
      </pre>
      <button onClick={copy}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: copied ? GOLD : "rgba(244,236,216,0.75)", background: "none", border: "1px solid " + (copied ? "rgba(201,169,97,0.55)" : "rgba(244,236,216,0.1)"), borderRadius: 6, padding: "6px 12px", cursor: "pointer", transition: "all 0.2s", alignSelf: "flex-start" }}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Copy embed code"}
      </button>
    </div>
  );
}

// ── Shareable Article ───────────────────────────────────────────────────
function ShareableArticle() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const articleText = `I Am Her — The Woman Who Leads the Room

There is a moment every woman who leads knows: the pause between the next meeting and the next decision, when the weight of the room feels like it is on her shoulders alone.

The Woman Who Leads the Room is not just an event. It is a private, invitation-only evening for 100 accomplished women — founders, executives, directors, and professionals — who carry that weight every day.

What makes this evening different:

• A curated room of 100 women, by invitation only
• A space to breathe, connect, and be truly seen
• Conversations on wellbeing, identity, confidence, and the stories behind the success
• An evening where the woman who leads the room finally gets to be in one

Friday 30 October 2026 · Milton Keynes, Buckinghamshire

This is the event introduction video: https://eventperfekt.net/iamher/media

Share this with a woman who leads. She needs to know this room exists.

Produced by Event Perfekt Global Ltd · 20 Wenlock Road, London, N1 7PG`;

  const copy = () => {
    navigator.clipboard.writeText(articleText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="media-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,169,97,0.08)", border: "1px solid rgba(201,169,97,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Eye className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: IVORY, margin: 0 }}>Shareable Article</h3>
      </div>
      <p style={{ fontSize: 13, color: "rgba(244,236,216,0.65)", margin: 0, lineHeight: 1.5 }}>
        Copy this ready-made article for your blog, LinkedIn post, newsletter, or WhatsApp group. Paste it anywhere.
      </p>
      <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(244,236,216,0.08)", borderRadius: 6, padding: "16px 20px", overflow: "hidden" }}>
        <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap", maxHeight: expanded ? "none" : 120, overflow: "hidden" }}>
          {articleText}
        </p>
        {!expanded && (
          <div style={{ position: "relative", marginTop: -20, paddingTop: 20, background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))" }}>
            <button onClick={() => setExpanded(true)}
              style={{ fontSize: 11, color: GOLD, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase", padding: 0 }}
            >
              Read more ↓
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={copy}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: copied ? GOLD : "rgba(244,236,216,0.75)", background: "none", border: "1px solid " + (copied ? "rgba(201,169,97,0.55)" : "rgba(244,236,216,0.1)"), borderRadius: 6, padding: "6px 12px", cursor: "pointer", transition: "all 0.2s" }}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy article text"}
        </button>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("There is a moment every woman who leads knows. The Woman Who Leads the Room is a private, invitation-only evening for 100 accomplished women. Friday 30 October 2026, Milton Keynes. Watch the introduction: https://eventperfekt.net/iamher/media")}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(244,236,216,0.75)", textDecoration: "none", background: "none", border: "1px solid rgba(244,236,216,0.1)", borderRadius: 6, padding: "6px 12px", transition: "all 0.2s" }}
        >
          <Twitter className="w-3.5 h-3.5" /> Share on X
        </a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://eventperfekt.net/iamher/media")}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(244,236,216,0.75)", textDecoration: "none", background: "none", border: "1px solid rgba(244,236,216,0.1)", borderRadius: 6, padding: "6px 12px", transition: "all 0.2s" }}
        >
          <Linkedin className="w-3.5 h-3.5" /> Share on LinkedIn
        </a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://eventperfekt.net/iamher/media")}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(244,236,216,0.75)", textDecoration: "none", background: "none", border: "1px solid rgba(244,236,216,0.1)", borderRadius: 6, padding: "6px 12px", transition: "all 0.2s" }}
        >
          <Facebook className="w-3.5 h-3.5" /> Share on Facebook
        </a>
      </div>
    </div>
  );
}

// ── SEO Schema Injection ──────────────────────────────────────────────
function VideoSchema() {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "VideoObject",
          name: "I Am Her — Event Introduction",
          description: "A private, invitation-only evening for accomplished women. The invitation, the experience, and the room.",
          thumbnailUrl: "https://eventperfekt.net/assets/iamher-hero-home.png",
          uploadDate: "2026-06-10T12:00:00+01:00",
          contentUrl: "https://eventperfekt.net/videos/event-intro.mp4",
          embedUrl: "https://eventperfekt.net/iamher/media",
          publisher: {
            "@type": "Organization",
            name: "Event Perfekt Global Ltd",
            logo: { "@type": "ImageObject", url: "https://eventperfekt.net/3d_Logo_1772145137902.jpg" }
          }
        },
        {
          "@type": "VideoObject",
          name: "Esther Emenike — The Story Behind the Room",
          description: "The wellbeing authority behind the room shares why this evening matters, who it is for, and what happens when the women who lead the room finally meet.",
          thumbnailUrl: "https://eventperfekt.net/iamher-stories-hero.png",
          uploadDate: "2026-06-10T12:00:00+01:00",
          contentUrl: "https://eventperfekt.net/iamher/media",
          embedUrl: "https://eventperfekt.net/iamher/media",
          publisher: {
            "@type": "Organization",
            name: "Event Perfekt Global Ltd",
            logo: { "@type": "ImageObject", url: "https://eventperfekt.net/3d_Logo_1772145137902.jpg" }
          }
        }
      ]
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    script.id = "video-schema";
    document.head.appendChild(script);
    return () => {
      const existing = document.getElementById("video-schema");
      if (existing) existing.remove();
    };
  }, []);
  return null;
}

export default function IAmHerMediaPage() {
  const { isMobile } = useViewport();
  useVisitorTracking("/iamher/media", "Media & Press | I Am Her");
  usePageSEO({
    title: "Media & Press — I Am Her | Event Perfekt",
    description: "Watch the I Am Her event introduction video and Esther Emenike on the wellbeing story behind the room. Press coverage, media kit, videos, and podcast content for I Am Her — a private, invitation-only evening for accomplished women.",
    keywords: "I Am Her, event introduction video, Esther Emenike, accomplished women UK, Milton Keynes, women founders, women executives, private evening, press, media kit, video, luxury women evening",
    url: "https://eventperfekt.net/iamher/media",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "I Am Her Media & Press — Event introduction video and Esther Emenike on the wellbeing story behind the room",
    ogType: "video.other",
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "name": "I Am Her — Event Introduction Video",
      "description": "A private, invitation-only evening for accomplished women. The invitation, the experience, and the room.",
      "thumbnailUrl": "https://eventperfekt.net/assets/iamher-hero-home.png",
      "uploadDate": "2026-06-10",
      "duration": "PT60S",
      "contentUrl": "https://eventperfekt.net/videos/event-intro.mp4",
      "embedUrl": "https://eventperfekt.net/iamher/media",
      "publisher": {
        "@type": "Organization",
        "name": "Event Perfekt Global Ltd",
        "url": "https://eventperfekt.net",
        "logo": "https://eventperfekt.net/assets/3d_Logo_1772145137902.jpg",
      },
    }],
  });
  const [activeTab, setActiveTab] = useState<"press" | "videos" | "kit" | "podcasts">("videos");

  return (
    <div style={{ background: INK, minHeight: "100vh", fontFamily: "'Poppins', sans-serif", color: IVORY }}>
      <VideoSchema />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .ip-serif { font-family: 'Poppins', sans-serif; }
        .media-tab { cursor: pointer; padding: 8px 16px; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(244,236,216,0.65); border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap; }
        .media-tab:hover { color: rgba(244,236,216,0.85); }
        .media-tab.active { color: ${GOLD}; border-bottom-color: ${GOLD}; }
        .media-card { background: rgba(244,236,216,0.03); border: 1px solid rgba(244,236,216,0.06); border-radius: 8px; padding: 24px; transition: all 0.25s; }
        .media-card:hover { border-color: rgba(201,169,97,0.15); background: rgba(244,236,216,0.05); }
        .media-link { color: ${GOLD}; text-decoration: none; font-size: 12px; letter-spacing: 0.06em; display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.2s; }
        .media-link:hover { opacity: 0.8; }
        .video-thumb { position: relative; background: linear-gradient(135deg, rgba(201,169,97,0.08), rgba(201,169,97,0.02)); border-radius: 8px; overflow: hidden; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; }
        .video-thumb::after { content: ""; position: absolute; inset: 0; border: 1px solid rgba(244,236,216,0.06); border-radius: 8px; pointer-events: none; }
        @media (max-width: 720px) {
          .media-grid { grid-template-columns: 1fr !important; }
          .media-hero { font-size: 32px !important; }
          .media-sub { font-size: 15px !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid rgba(201,169,97,0.08)", padding: "32px 28px 24px" }}>
        <div style={{ maxWidth: isMobile ? "100vw" : 1100, margin: "0 auto" }}>
          <a href="/iamher" onClick={() => trackFunnelEvent('cta_click', '/iamher/media', { cta: 'back_to_iamher' })} className="media-link" style={{ marginBottom: 24, display: "inline-flex" }}>
            <ChevronRight className="w-3 h-3 rotate-180" /> Back to I Am Her
          </a>
          <p style={{ fontSize: 10, color: "rgba(201,169,97,0.80)", letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px" }}>
            Media & Press
          </p>
          <h1 className="ip-serif media-hero" style={{ fontSize: 48, fontWeight: 500, color: IVORY, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            The Story Behind the Room
          </h1>
          <p className="media-sub" style={{ fontSize: 18, color: "rgba(244,236,216,0.85)", margin: "16px 0 0", maxWidth: 600, lineHeight: 1.6, fontStyle: "italic" }}>
            Press coverage, media kit, videos, and podcast content for the I Am Her initiative.
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: "1px solid rgba(244,236,216,0.06)", padding: "0 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 8, overflowX: "auto" }}>
          {[
            { key: "videos" as const, label: "Videos", icon: Video },
            { key: "press" as const, label: "Press Coverage", icon: Newspaper },
            { key: "podcasts" as const, label: "Podcast", icon: Mic },
            { key: "kit" as const, label: "Media Kit", icon: FileText },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`media-tab ${activeTab === t.key ? "active" : ""}`}>
              <t.icon className="w-3 h-3 inline mr-1.5" style={{ verticalAlign: "text-top" }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: isMobile ? "100vw" : 1100, margin: "0 auto", padding: isMobile ? "20px 16px 20px" : "40px 28px 40px" }}>

        {/* ── Product Brand Partnership Banner ── */}
        <div style={{ background: "rgba(201,169,97,0.04)", border: "1px solid rgba(201,169,97,0.12)", borderRadius: 8, padding: "24px 28px", marginBottom: 40, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(201,169,97,0.08)", border: "1px solid rgba(201,169,97,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Gift className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: IVORY, margin: "0 0 4px" }}>Product Brand Partnership</p>
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", margin: 0 }}>
              Put your product in the hands of 100 women who lead. Goody bag, consultation station, and branded room moments.
            </p>
          </div>
          <a href="/iamher/partnership/product-brands" onClick={() => trackFunnelEvent('cta_click', '/iamher/media', { cta: 'product_brands' })}
            style={{ fontSize: 12, color: GOLD, textDecoration: "none", letterSpacing: "0.08em", borderBottom: "1px solid rgba(201,169,97,0.55)", paddingBottom: 4, transition: "all 0.2s", flexShrink: 0, whiteSpace: "nowrap" }}
          >
            Learn more →
          </a>
        </div>

        {/* Videos — Featured first */}
        {activeTab === "videos" && (
          <div className="media-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
            <EventIntroPlayer />
            <VideoPlayer />
          </div>
        )}

        {/* Press Coverage */}
        {activeTab === "press" && (
          <div className="media-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            {PRESS_CLIPS.map((clip, i) => (
              <div key={i} className="media-card" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(201,169,97,0.08)", border: "1px solid rgba(201,169,97,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <clip.icon className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "rgba(201,169,97,0.80)", letterSpacing: "0.2em", textTransform: "uppercase" }}>{clip.outlet}</span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(201,169,97,0.55)" }} />
                    <span style={{ fontSize: 10, color: "rgba(244,236,216,0.55)" }}>{clip.date}</span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 500, color: IVORY, margin: "0 0 8px", lineHeight: 1.4 }}>{clip.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", margin: "0 0 14px", lineHeight: 1.6 }}>{clip.excerpt}</p>
                  <a href={clip.url} target="_blank" rel="noopener noreferrer" className="media-link">
                    Read on {clip.outlet.split(" ")[0]} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
            <div className="media-card" style={{ textAlign: "center", marginTop: 8 }}>
              <p style={{ fontSize: 14, color: "rgba(244,236,216,0.75)", margin: "0 0 16px" }}>
                Are you a journalist or content creator interested in covering the I Am Her initiative?
              </p>
              <a href="mailto:adminuk@eventperfekt.com?subject=Press%20Enquiry%20—%20I%20Am%20Her" className="media-link" style={{ fontSize: 13, fontWeight: 500 }}>
                <Mic className="w-3.5 h-3.5" /> Contact our press team
              </a>
            </div>
          </div>
        )}

        {/* Podcast */}
        {activeTab === "podcasts" && (
          <div className="media-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            {PODCASTS.map((p, i) => (
              <div key={i} className="media-card" style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, rgba(201,169,97,0.1), rgba(201,169,97,0.02))", border: "1px solid rgba(201,169,97,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Mic className="w-6 h-6" style={{ color: GOLD }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "rgba(201,169,97,0.80)", letterSpacing: "0.2em", textTransform: "uppercase" }}>{p.episode}</span>
                    <span style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", border: "1px solid rgba(244,236,216,0.1)", padding: "2px 8px", borderRadius: 4 }}>Coming Soon</span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 500, color: IVORY, margin: "0 0 6px" }}>{p.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.65)", margin: 0, lineHeight: 1.5 }}>{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Media Kit */}
        {activeTab === "kit" && (
          <div className="media-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {MEDIA_KIT_ITEMS.map((item, i) => (
              <div key={i} className="media-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(201,169,97,0.08)", border: "1px solid rgba(201,169,97,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <item.icon className="w-4 h-4" style={{ color: GOLD }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: "rgba(201,169,97,0.75)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{item.format}</p>
                  </div>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 500, color: IVORY, margin: 0 }}>{item.label}</h3>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.65)", margin: 0, lineHeight: 1.5, flex: 1 }}>{item.desc}</p>
                <a href={item.href} className="media-link" style={{ marginTop: 8 }}>
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Share & Embed Toolkit ── */}
      <div style={{ borderTop: "1px solid rgba(244,236,216,0.06)", padding: "48px 28px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {/* Embed Code */}
          <EmbedTool />
          {/* Shareable Article */}
          <ShareableArticle />
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid rgba(244,236,216,0.06)", padding: "32px 28px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "rgba(244,236,216,0.55)", margin: 0 }}>
          For press enquiries: <a href="mailto:adminuk@eventperfekt.com" style={{ color: GOLD, textDecoration: "none" }}>adminuk@eventperfekt.com</a>
        </p>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", margin: "8px 0 0" }}>
          Event Perfekt Global Ltd · 20 Wenlock Road, London, N1 7PG
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
      </div>

      <EmailCapturePopup
        page="/iamher/media"
        variant="iamher"
        delayMs={18000}
        storageKey="ep_media_email"
        headline="Not ready to request your place? Leave your email and enter the draw."
        subheadline="You'll be entered to win a complimentary invitation or a professional editorial portrait. One lucky woman on our list. Draw is live."
        offer="Win: a complimentary invitation or a professional editorial portrait."
        cta="Enter my email"
        gift="complimentary invitation or editorial portrait"
      />
    </div>
  );
}
