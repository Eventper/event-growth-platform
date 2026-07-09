import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import ElizabethChat from "@/components/ElizabethChat";
import { usePageSEO } from "@/hooks/use-page-seo";
import IamherMobileNav from "@/components/IamherMobileNav";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

const INK = "#330311";
const GOLD  = "#C9A961";
const IVORY = "#F4ECD8";

type Profile = {
  id: number;
  name: string;
  title: string | null;
  company: string | null;
  photo_url: string | null;
  photo_position: string | null;
  created_at: string;
};

/* ── Profile card with hover glow + entrance animation ── */
function ProfileCard({
  name, title, company, photoUrl, photoPosition, index,
}: {
  name: string; title: string | null; company: string | null;
  photoUrl: string | null; photoPosition?: string | null; index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay: index * 0.12, ease: [0.22, 0.8, 0.32, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: "#0D060A",
        border: `1px solid ${hovered ? "rgba(201,169,97,0.45)" : "rgba(201,169,97,0.18)"}`,
        overflow: "hidden",
        aspectRatio: "3/4",
        display: "flex",
        flexDirection: "column",
        cursor: "default",
        transition: "border-color 0.4s ease, box-shadow 0.4s ease",
        boxShadow: hovered
          ? "0 0 32px rgba(201,169,97,0.12), 0 8px 40px rgba(0,0,0,0.5)"
          : "0 4px 24px rgba(0,0,0,0.35)",
      }}
    >
      {/* Shimmer overlay on hover */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.35 }}
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(201,169,97,0.04) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* Top accent bar */}
      <div style={{
        background: "#1A0010",
        borderBottom: "1px solid rgba(201,169,97,0.15)",
        padding: "11px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 7, color: "rgba(201,169,97,0.5)", letterSpacing: "0.28em", textTransform: "uppercase" }}>I Am Her</span>
        <span style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, display: "inline-block", opacity: hovered ? 0.9 : 0.4, transition: "opacity 0.35s" }} />
      </div>

      {/* Portrait zone */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201,169,97,0.02)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(201,169,97,0.05) 0%, transparent 70%)" }} />
        {photoUrl ? (
          <motion.img
            src={`${photoUrl}?v=7`}
            alt={name}
            animate={{ scale: hovered ? 1.03 : 1 }}
            transition={{ duration: 0.6, ease: [0.22, 0.8, 0.32, 1] }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: photoPosition || "center top",
              position: "relative",
              zIndex: 1,
              filter: "brightness(0.9) contrast(1.05)",
            }}
          />
        ) : (
          <>
            <div style={{
              width: 68, height: 68, borderRadius: "50%",
              border: "1px solid rgba(201,169,97,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(201,169,97,0.06)",
              fontSize: 22, fontFamily: "Poppins, sans-serif",
              color: "rgba(201,169,97,0.55)", fontWeight: 400,
              position: "relative", zIndex: 1,
            }}>
              {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div style={{ position: "absolute", width: 96, height: 96, borderRadius: "50%", border: "1px solid rgba(201,169,97,0.08)" }} />
          </>
        )}
      </div>

      {/* Bottom gold reveal line */}
      <motion.div
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          height: 1,
          background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
          transformOrigin: "center",
        }}
      />

      {/* Text zone */}
      <div style={{ padding: "14px 16px 16px", borderTop: "1px solid rgba(201,169,97,0.1)", flexShrink: 0 }}>
        <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(201,169,97,0.4), transparent)", marginBottom: 10 }} />
        <p style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: 15, fontWeight: 400, color: IVORY,
          margin: "0 0 4px", lineHeight: 1.2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {name}
        </p>
        {title && (
          <p style={{ fontSize: 8, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </p>
        )}
        {company && (
          <p style={{ fontSize: 9, color: "rgba(244,236,216,0.3)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {company}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Ghost placeholder card ── */
function PlaceholderCard({ n }: { n: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.28 - n * 0.05 }}
      transition={{ duration: 1, delay: 0.5 + n * 0.1 }}
      style={{
        background: "#0D060A",
        border: "1px solid rgba(201,169,97,0.07)",
        aspectRatio: "3/4",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 10,
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(201,169,97,0.18)" }} />
      <div style={{ width: 70, height: 1, background: "rgba(201,169,97,0.12)" }} />
      <div style={{ width: 50, height: 7, background: "rgba(201,169,97,0.07)" }} />
    </motion.div>
  );
}

export default function MeetTheRoom() {
  usePageSEO({
    title: "Meet the Room | The Woman Who Leads the Room | Milton Keynes 30 Oct 2026",
    description: "Meet the founders, executives, and women who lead who will be in the room on 30 October 2026.",
    keywords: "women in leadership Milton Keynes, female founders UK event, executive women 2026, The Woman Who Leads the Room guests, I Am Her",
    url: "https://eventperfekt.net/meet-the-room",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Meet the Room — Founders, executives, and women who lead at The Woman Who Leads the Room",
    ogType: "website",
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Meet the Room | The Woman Who Leads the Room",
      "description": "Meet the founders, executives, and women who lead who will be in the room on 30 October 2026.",
      "url": "https://eventperfekt.net/meet-the-room",
      "about": { "@type": "Thing", "name": "Women in Leadership" },
    }],
  });
  useVisitorTracking("/meet-the-room", "Meet the Room · The Woman Who Leads the Room");
  const [, setLocation] = useLocation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/event-august/room-profiles")
      .then(r => r.json())
      .then(d => { setProfiles(d.profiles || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const placeholders = Math.max(0, Math.min(4, 8 - profiles.length));

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        .mr-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
        }
        @media (min-width: 520px) {
          .mr-gallery { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
        }
        @media (min-width: 800px) {
          .mr-gallery { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 22px; }
        }

        .mr-page { padding: 48px 16px 64px; }
        @media (min-width: 600px) {
          .mr-page { padding: 60px 28px 80px; }
        }

        .mr-h1 { font-size: 30px; }
        @media (min-width: 480px) { .mr-h1 { font-size: 38px; } }
        @media (min-width: 768px) { .mr-h1 { font-size: 48px; } }

        .mr-body { font-size: 14px; }
        @media (min-width: 600px) { .mr-body { font-size: 15px; } }

        .mr-cta-btn {
          padding: 14px 32px;
          width: 100%;
          max-width: 340px;
        }
        @media (min-width: 480px) {
          .mr-cta-btn { width: auto; }
        }

        /* Gold particle pulse — decorative top accent */
        @keyframes mr-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.35); }
        }
        .mr-pulse { animation: mr-pulse 3s ease-in-out infinite; }

        /* Shimmer rule */
        @keyframes mr-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .mr-rule {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(201,169,97,0.6) 40%, rgba(201,169,97,0.9) 50%, rgba(201,169,97,0.6) 60%, transparent 100%);
          background-size: 200% auto;
          animation: mr-shimmer 4s linear infinite;
          margin: 0 0 40px;
        }
      `}</style>

      <IamherMobileNav
        logo={eventPerfektLogo}
        maxWidth={1040}
        links={[
          { label: "About", href: "/about-the-movement" },
          { label: "The Evening", href: "/iamher" },
          { label: "Apply for Your Invitation", href: "/access" },
        ]}
      />

      <div className="mr-page" style={{ flex: 1, maxWidth: 1040, margin: "0 auto", width: "100%" }}>

        {/* Animated header */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 10 }}
        >
          <span className="mr-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, display: "inline-block", flexShrink: 0 }} />
          The Campaign
        </motion.p>

        <motion.h1
          className="mr-h1"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.1, ease: [0.22, 0.8, 0.32, 1] }}
          style={{ fontFamily: "Poppins, sans-serif", fontWeight: 400, fontStyle: "italic", color: IVORY, margin: "0 0 22px", lineHeight: 1.1, letterSpacing: "-0.01em" }}
        >
          Meet the Room
        </motion.h1>

        <motion.div
          className="mr-body"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.25 }}
          style={{ color: "rgba(244,236,216,0.6)", lineHeight: 1.85, maxWidth: 560 }}
        >
          <p style={{ margin: "0 0 10px" }}>The room is 100 women. Each one a leader of her own.</p>
          <p style={{ margin: "0 0 10px" }}>Founders. Executives. Business owners. Professionals. Women leading organisations, teams, communities, and change.</p>
          <p style={{ margin: 0 }}>In the weeks before <em>The Woman Who Leads the Room</em>, we are revealing the women behind the titles.</p>
        </motion.div>

        {/* Shimmer rule */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.3 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          style={{ marginTop: 36 }}
        >
          <div className="mr-rule" />
        </motion.div>

        {/* Live count badge */}
        <AnimatePresence>
          {!loading && profiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 10 }}
            >
              <span className="mr-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, display: "inline-block", opacity: 0.7 }} />
              <p style={{ fontSize: 11, color: "rgba(201,169,97,0.65)", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
                {profiles.length} {profiles.length === 1 ? "woman" : "women"} in the room
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gallery */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ padding: "60px 0", textAlign: "center" }}
          >
            <p style={{ fontSize: 11, color: "rgba(244,236,216,0.2)", letterSpacing: "0.2em" }}>Loading…</p>
          </motion.div>
        ) : (
          <div className="mr-gallery">
            {profiles.map((p, i) => (
              <ProfileCard
                key={p.id}
                index={i}
                name={p.name}
                title={p.title}
                company={p.company}
                photoUrl={p.photo_url}
                photoPosition={p.photo_position}
              />
            ))}
            {Array.from({ length: placeholders }).map((_, i) => (
              <PlaceholderCard key={`ph-${i}`} n={i} />
            ))}
          </div>
        )}

        {/* Editorial pull-quote */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0 }}
            viewport={{ once: true }}
            style={{ marginTop: 56, maxWidth: 540 }}
          >
            <div style={{ width: 32, height: 1, background: `rgba(201,169,97,0.4)`, marginBottom: 20 }} />
            <p style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontSize: 17, color: "rgba(244,236,216,0.5)", lineHeight: 1.75, margin: "0 0 14px" }}>
              "Leadership deserves to be seen. And so does the woman behind it."
            </p>
            <p style={{ fontSize: 12, color: "rgba(244,236,216,0.65)", lineHeight: 1.7, margin: 0, letterSpacing: "0.04em" }}>
              Featured here. Featured across our platforms. Featured across theirs.
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginTop: 72, padding: "48px 16px", borderTop: "1px solid rgba(244,236,216,0.07)" }}
        >
          <p style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontSize: 19, color: IVORY, margin: "0 0 8px" }}>
            Want to be in this room?
          </p>
          <p style={{ fontSize: 13, color: "rgba(244,236,216,0.35)", margin: "0 0 24px" }}>
            Attendance is invitation-led and confirmed after review.
          </p>
          <button
            className="mr-cta-btn"
            onClick={() => { trackFunnelEvent('cta_click', '/meet-the-room', { cta: 'request_invitation' }); setLocation("/access"); }}
            style={{
              fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase",
              color: GOLD, background: "transparent", border: `1px solid rgba(201,169,97,0.45)`,
              cursor: "pointer", fontWeight: 500, transition: "all 0.3s", fontFamily: "Poppins, sans-serif",
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "rgba(201,169,97,0.08)"; (e.target as HTMLButtonElement).style.borderColor = "rgba(201,169,97,0.8)"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "transparent"; (e.target as HTMLButtonElement).style.borderColor = "rgba(201,169,97,0.45)"; }}
          >
            Apply for Your Invitation →
          </button>
        </motion.div>
      </div>

      <footer style={{ padding: "20px 28px", textAlign: "center", borderTop: "1px solid rgba(244,236,216,0.08)" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", letterSpacing: "0.08em", margin: 0 }}>
          Curated by Event Perfekt Global Ltd · Friday 30 October 2026 · Milton Keynes
        </p>
      </footer>

      <ElizabethChat page="meet-the-room" />
    </div>
  );
}
