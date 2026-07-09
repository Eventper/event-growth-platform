import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useVisitorTracking } from "@/hooks/use-visitor-tracking";
import { motion } from "framer-motion";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

const CAT_CONFIG = {
  stay: { label: "Stay", icon: "\u{1F3E8}", desc: "Hotels, serviced apartments and accommodation" },
  eat_drink: { label: "Eat & Drink", icon: "\u{1F37D}", desc: "Restaurants, caf\u00e9s, bars and dining experiences" },
  enjoy: { label: "Enjoy", icon: "\u2728", desc: "Shopping, beauty, wellness, attractions and local experiences" },
  invest_relocate: { label: "Invest & Relocate", icon: "\u{1F3E2}", desc: "Commercial and residential property, professional services" },
};

type Business = {
  id: number;
  businessName: string;
  founderName: string | null;
  category: string;
  cityDisplay: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  aboutBusiness: string | null;
  whatMakesWorthDiscovering: string | null;
  offerDiscount: string | null;
  interestedPartnership: boolean;
  imageUrl: string | null;
  createdAt: string | null;
};

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

export default function IAmHerBusinessProfile() {
  const [, params] = useRoute("/iamher/business/:id");
  const id = params?.id;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/iamher/business-submissions/${id}`)
      .then(r => r.json())
      .then(data => {
        const b = data.business || null;
        setBusiness(b);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load business profile.");
        setLoading(false);
      });
  }, [id]);

  const config = business ? (CAT_CONFIG[business.category as keyof typeof CAT_CONFIG] || { label: business.category, icon: "" }) : { label: "", icon: "" };

  usePageSEO({
    title: business ? `${business.businessName} | I Am Her — Featured Business` : "Featured Business | I Am Her",
    description: business?.aboutBusiness || "Discover a featured business on the I Am Her Stay & Enjoy experience.",
    url: `https://eventperfekt.net/iamher/business/${id}`,
    noIndex: false,
  });
  useVisitorTracking(`/iamher/business/${id}`, business?.businessName || "Featured Business");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 14, color: "rgba(244,236,216,0.45)" }}>Loading...</p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "120px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "rgba(244,236,216,0.65)" }}>{error || "Business not found."}</p>
          <Link href="/iamher/stay">
            <button style={{ marginTop: 24, background: "transparent", border: `1px solid ${GOLD}`, color: GOLD, padding: "14px 32px", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
              Back to Stay & Enjoy
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
      `}</style>

      <header style={{ padding: "16px 24px", borderBottom: "1px solid rgba(201,169,97,0.08)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/iamher/stay" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 14, color: GOLD, fontWeight: 600, letterSpacing: "0.12em", fontFamily: "Poppins, sans-serif" }}>I Am Her</span>
          </Link>
          <Link href="/iamher/stay" style={{ fontSize: 11, color: "rgba(244,236,216,0.65)", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ← Back to Stay & Enjoy
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 20px 80px" }}>
        <motion.div {...fadeUp}>
          <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>
            {config.icon} {config.label} · {business.cityDisplay || "Milton Keynes"}
          </p>
          <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 300, fontSize: "clamp(24px, 3vw, 36px)", color: IVORY, margin: "0 0 16px", lineHeight: 1.15, letterSpacing: "-0.01em" }}>
            {business.businessName}
          </h1>
          {business.founderName && (
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.65)", margin: "0 0 32px", fontWeight: 300, fontStyle: "italic" }}>
              Founded by {business.founderName}
            </p>
          )}
        </motion.div>

        {business.imageUrl && (
          <motion.div {...fadeUp} style={{ marginBottom: 40 }}>
            <div style={{ width: "100%", height: 300, overflow: "hidden", border: "1px solid rgba(201,169,97,0.1)" }}>
              <img src={business.imageUrl} alt={business.businessName} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          </motion.div>
        )}

        <motion.div {...fadeUp}>
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>About</p>
            <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.85, margin: 0, fontWeight: 300, whiteSpace: "pre-line" }}>
              {business.aboutBusiness || "No description provided."}
            </p>
          </div>
        </motion.div>

        {business.whatMakesWorthDiscovering && (
          <motion.div {...fadeUp}>
            <div style={{ marginBottom: 32, padding: "24px 28px", border: "1px solid rgba(201,169,97,0.15)", background: "rgba(201,169,97,0.03)" }}>
              <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>What makes this worth discovering</p>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.85, margin: 0, fontWeight: 300, fontStyle: "italic" }}>
                {business.whatMakesWorthDiscovering}
              </p>
            </div>
          </motion.div>
        )}

        {business.offerDiscount && (
          <motion.div {...fadeUp}>
            <div style={{ marginBottom: 32, padding: "24px 28px", border: "1px solid rgba(201,169,97,0.15)", background: "rgba(201,169,97,0.03)" }}>
              <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>Exclusive for I Am Her guests</p>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.85, margin: 0, fontWeight: 300 }}>
                {business.offerDiscount}
              </p>
            </div>
          </motion.div>
        )}

        <motion.div {...fadeUp}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 40 }}>
            {business.website && (
              <a href={business.website} target="_blank" rel="noopener noreferrer" style={{ padding: "14px 28px", background: GOLD, color: INK, fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", textDecoration: "none", fontFamily: "'Poppins', sans-serif", fontWeight: 500, transition: "all 0.3s ease" }}>
                Visit Website →
              </a>
            )}
            {business.instagram && (
              <a href={business.instagram.startsWith("http") ? business.instagram : `https://instagram.com/${business.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" style={{ padding: "14px 28px", background: "transparent", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", textDecoration: "none", fontFamily: "'Poppins', sans-serif", fontWeight: 500, transition: "all 0.3s ease" }}>
                Instagram →
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} style={{ padding: "14px 28px", background: "transparent", border: "1px solid rgba(201,169,97,0.3)", color: "rgba(244,236,216,0.75)", fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", textDecoration: "none", fontFamily: "'Poppins', sans-serif", fontWeight: 500, transition: "all 0.3s ease" }}>
                Email →
              </a>
            )}
          </div>
        </motion.div>

        <motion.div {...fadeUp}>
          <div style={{ borderTop: "1px solid rgba(201,169,97,0.1)", paddingTop: 32 }}>
            <p style={{ fontSize: 11, color: "rgba(244,236,216,0.45)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>
              Featured on I Am Her
            </p>
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.55)", lineHeight: 1.75, margin: "0 0 24px", fontWeight: 300 }}>
              This business is part of the curated Stay & Enjoy Milton Keynes experience. All featured businesses are reviewed before being published.
            </p>
            <Link href="/iamher/feature-your-business">
              <button style={{ background: "transparent", border: `1px solid ${GOLD}`, color: GOLD, padding: "14px 32px", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Poppins', sans-serif", transition: "all 0.3s ease" }}>
                Feature Your Business →
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

      <footer style={{ padding: "24px 36px", borderTop: "1px solid rgba(244,236,216,0.05)", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", letterSpacing: "0.08em", margin: 0, fontFamily: "'Poppins', sans-serif" }}>
          An initiative by Event Perfekt Global Ltd.
        </p>
      </footer>
    </div>
  );
}
