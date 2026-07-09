import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Gift, Sparkles, Users, Heart, Mail, ArrowRight, Check, Package, Palette, Wine, HandHeart } from "lucide-react";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";
import IamherMobileNav from "@/components/IamherMobileNav";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

const OPPORTUNITIES = [
  {
    icon: Gift,
    title: "Curated Goody Bag",
    price: "From £1,500 + VAT",
    desc: "Your product placed inside the exclusive I Am Her goody bag — a considered collection of luxury and wellbeing items each guest receives on arrival. Every item is chosen, not stuffed. Your brand sits alongside brands that match the evening's tone.",
    includes: ["Product in 100 curated bags", "Branded insert or card", "Social media mention in goody bag reveal", "Post-event thank-you email inclusion"],
  },
  {
    icon: HandHeart,
    title: "Product Consultation Station",
    price: "From £3,500 + VAT",
    desc: "A dedicated, quiet station in the room where guests can experience your product with guidance — skincare consultations, fragrance profiling, accessory styling, or wellness sampling. Not a booth. A considered corner.",
    includes: ["Branded experience corner (2-3 hours)", "2 brand ambassadors in room", "One-on-one consultations with guests", "Product samples or miniatures for takeaway", "Photography of brand moment"],
  },
  {
    icon: Palette,
    title: "Branded Room Moment",
    price: "From £5,000 + VAT",
    desc: "A signature experience woven into the evening itself — a branded welcome drink, a bespoke scent in the space, a curated tasting, or a product reveal. The brand becomes part of the memory, not an interruption.",
    includes: ["Co-created brand experience", "Brand name in evening programme", "Verbal recognition from host", "Social and editorial coverage", "Photography and video content rights"],
  },
  {
    icon: Package,
    title: "Product Sampling & Discovery",
    price: "From £800 + VAT",
    desc: "For brands launching or expanding visibility, place samples, trial sizes, or discovery sets in the goody bag or on departure. A low-commitment way to introduce your product to 100 women who tell other women.",
    includes: ["100 sample units distributed", "QR code or card linking to your site", "Mention in event communications", "Guest feedback summary (opt-in)"],
  },
];

const AUDIENCE = [
  { label: "Founders & CEOs", pct: "35%", desc: "Running businesses, hiring teams, making purchasing decisions for their organisations and homes." },
  { label: "Senior Executives", pct: "30%", desc: "Directors, VPs, and C-suite leaders with budgets and networks. Early adopters and recommenders." },
  { label: "Professionals & Creators", pct: "25%", desc: "Consultants, creatives, lawyers, accountants, and leaders in transition. Highly connected." },
  { label: "Investors & Board Members", pct: "10%", desc: "Angel investors, board advisors, and women with significant influence across sectors." },
];

const BRAND_TYPES = [
  "Skincare & Beauty", "Wellness & Supplements", "Fragrance & Home Scent",
  "Fashion & Accessories", "Jewellery & Watches", "Food & Beverage",
  "Champagne & Wine", "Stationery & Leather Goods", "Lifestyle & Home",
  "Tech & Wellness Devices", "Travel & Experience", "Other — tell us",
];

export default function ProductBrandsPage() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Product Brand Partnership | I Am Her | The Woman Who Leads the Room",
    description: "Put your product or brand in front of 100 women who lead. Goody bag, consultation station, and branded room moments for luxury skincare, wellness, fashion, fragrance, lifestyle, insurance, financial services, and professional brands. I Am Her, Milton Keynes, 30 October 2026.",
    keywords: "product brand partnership women's event, goody bag brand placement, women founders product sampling, luxury skincare brand event UK, wellness brand partnership, female executive brand discovery, insurance brand partnership, financial services women event, product consultation event, brand experience women leaders, I Am Her product partner, eventperfekt brand partnership",
    url: "https://eventperfekt.net/iamher/partnership/product-brands",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Product Brand Partnership — Put your brand in front of 100 women who lead",
  });
  useVisitorTracking("/iamher/partnership/product-brands", "Product Brand Partnership · I Am Her");

  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ brandName: "", contactName: "", email: "", productType: "", opportunity: "", message: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/iamher/partnership-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, page: "product-brands", submittedAt: new Date().toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Something went wrong — please try again or email adminuk@eventperfekt.com.");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong — please try again or email adminuk@eventperfekt.com.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .ip-serif { font-family: 'Poppins', sans-serif; }
        @media (max-width: 720px) {
          .pb-hero { font-size: 36px !important; }
          .pb-sub { font-size: 16px !important; }
          .pb-grid { grid-template-columns: 1fr !important; }
          .pb-audience { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <IamherMobileNav
        logo={eventPerfektLogo}
        links={[
          { label: "About", href: "/about-the-movement" },
          { label: "The Evening", href: "/iamher" },
          { label: "Apply for Your Invitation", href: "/access" },
          { label: "Organisations", href: "/iamher/partnership" },
          { label: "Product Brands", href: "/iamher/partnership/product-brands", active: true },
        ]}
      />

      {/* ── Hero ── */}
      <section style={{ padding: "120px 32px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 20px" }}>
              Product Brand Partnership
            </p>
            <h1 className="ip-serif pb-hero" style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 500, lineHeight: 1.1, margin: "0 0 24px", fontStyle: "italic" }}>
              Your Product.<br />In the Hands of 100 Women Who Lead.
            </h1>
            <p className="pb-sub" style={{ fontSize: 18, color: "rgba(244,236,216,0.95)", lineHeight: 1.7, margin: "0 auto", maxWidth: 560, fontWeight: 300 }}>
              I Am Her is not a typical event goody bag. It is a curated discovery experience for 100 founders, executives, and women of influence. Your product, your service, or your brand promise — if it belongs in their hands, it belongs in this room.
            </p>
            <div style={{ marginTop: 36, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setShowForm(true)}
                style={{ background: GOLD, color: INK, border: "none", padding: "14px 28px", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontWeight: 500, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#b8995a"; }}
                onMouseLeave={e => { e.currentTarget.style.background = GOLD; }}
              >
                Enquire Now <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
              </button>
              <button onClick={() => setLocation("/iamher/partnership")}
                style={{ background: "transparent", color: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.15)", padding: "14px 28px", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(244,236,216,0.30)"; e.currentTarget.style.color = "rgba(244,236,216,0.95)"; }}
              >
                Corporate Partnership →
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── The Audience ── */}
      <section style={{ borderTop: "1px solid rgba(244,236,216,0.08)", borderBottom: "1px solid rgba(244,236,216,0.08)", padding: "80px 32px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
            <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px" }}>The Audience</p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 500, margin: "0 0 40px", fontStyle: "italic", lineHeight: 1.15 }}>
              100 women. Every one a decision-maker.
            </h2>
            <div className="pb-audience" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {AUDIENCE.map((a, i) => (
                <div key={i} style={{ background: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.08)", padding: "24px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 28, fontWeight: 500, color: GOLD, margin: "0 0 8px" }}>{a.pct}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: IVORY, margin: "0 0 8px" }}>{a.label}</p>
                  <p style={{ fontSize: 12, color: "rgba(244,236,216,0.85)", lineHeight: 1.5, margin: 0 }}>{a.desc}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.95)", textAlign: "center", marginTop: 28, fontStyle: "italic" }}>
              These are women who buy premium products, recommend them to their networks, and make purchasing decisions for their businesses and homes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Opportunities ── */}
      <section style={{ padding: "80px 32px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
            <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px" }}>Partnership Opportunities</p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 500, margin: "0 0 48px", fontStyle: "italic", lineHeight: 1.15 }}>
              Four ways to show up. One room to be remembered in.
            </h2>
            <div className="pb-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {OPPORTUNITIES.map((op, i) => (
                <div key={i} style={{ background: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.08)", padding: "32px 28px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(201,169,97,0.06)", border: "1px solid rgba(201,169,97,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <op.icon className="w-4 h-4" style={{ color: GOLD }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 500, color: IVORY, margin: 0 }}>{op.title}</p>
                      <p style={{ fontSize: 13, color: GOLD, margin: "2px 0 0" }}>{op.price}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: "0 0 20px", flex: 1 }}>{op.desc}</p>
                  <div style={{ borderTop: "1px solid rgba(244,236,216,0.08)", paddingTop: 16 }}>
                    <p style={{ fontSize: 10, color: "rgba(244,236,216,0.75)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>Includes</p>
                    <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", lineHeight: 1.7, margin: 0 }}>
                      {op.includes.join(". ")}.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Why This Works ── */}
      <section style={{ background: "#0D0408", borderTop: "1px solid rgba(244,236,216,0.08)", borderBottom: "1px solid rgba(244,236,216,0.08)", padding: "80px 32px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
            <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px" }}>Why This Works</p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(24px, 2.8vw, 34px)", fontWeight: 500, margin: "0 0 24px", fontStyle: "italic", lineHeight: 1.2 }}>
              These women do not receive random samples. They receive considered things.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.8, margin: "0 0 32px" }}>
              In a room where every detail is curated, your product is not "swag." It is a discovery. A woman who leads a company, a team, or a movement opens a goody bag and finds something chosen for her. She tries it. She likes it. She tells five people. That is the difference between a sample and a story.
            </p>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 500, color: GOLD, margin: 0 }}>100</p>
                <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "4px 0 0" }}>women in the room</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 500, color: GOLD, margin: 0 }}>~500</p>
                <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "4px 0 0" }}>network reach per guest</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 500, color: GOLD, margin: 0 }}>1</p>
                <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: "4px 0 0" }}>evening, one moment</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Brand Types ── */}
      <section style={{ padding: "80px 32px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
            <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px" }}>Brand Types We Are Looking For</p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(24px, 2.8vw, 34px)", fontWeight: 500, margin: "0 0 32px", fontStyle: "italic", lineHeight: 1.2 }}>
              If your product elevates a woman&apos;s day, her wellbeing, or her sense of self, we want to talk.
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {BRAND_TYPES.map((b, i) => (
                <span key={i} style={{ fontSize: 12, color: "rgba(244,236,216,0.85)", border: "1px solid rgba(244,236,216,0.08)", borderRadius: 20, padding: "6px 14px" }}>
                  {b}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#0D0408", borderTop: "1px solid rgba(244,236,216,0.08)", padding: "80px 32px 100px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
            <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px" }}>Enquire</p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(24px, 2.8vw, 34px)", fontWeight: 500, margin: "0 0 20px", fontStyle: "italic", lineHeight: 1.2 }}>
              Let&apos;s talk about how your brand shows up.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.7, margin: "0 0 36px" }}>
              Tell us your brand name, product, and which opportunity feels right. We will respond within 48 hours with a tailored proposal.
            </p>
            <button onClick={() => setShowForm(true)}
              style={{ background: GOLD, color: INK, border: "none", padding: "16px 36px", fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontWeight: 500 }}
            >
              Start the Conversation <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
            <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", marginTop: 24 }}>
              Or email <a href="mailto:info@eventperfekt.com?subject=Product%20Brand%20Partnership%20%E2%80%94%20I%20Am%20Her" onClick={() => trackFunnelEvent('cta_click', '/iamher/partnership/product-brands', { cta: 'email_enquiry' })} style={{ color: GOLD, textDecoration: "none" }}>info@eventperfekt.com</a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid rgba(244,236,216,0.08)", padding: "28px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: 0 }}>
          The Woman Who Leads the Room · Friday 30 October 2026 · Milton Keynes · By Invitation Only
        </p>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", margin: "6px 0 0" }}>
          An initiative by Event Perfekt Global Ltd.
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

      {/* ── Enquiry Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => { if (!submitted) setShowForm(false); }}
        >
          <div style={{ background: INK, border: "1px solid rgba(244,236,216,0.08)", borderRadius: 12, maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto", padding: "40px 32px" }}
            onClick={e => e.stopPropagation()}
          >
            {submitted ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(201,169,97,0.06)", border: "1px solid rgba(201,169,97,0.10)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Check className="w-6 h-6" style={{ color: GOLD }} />
                </div>
                <h3 className="ip-serif" style={{ fontSize: 22, fontWeight: 500, margin: "0 0 12px", fontStyle: "italic" }}>Thank You</h3>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.95)", lineHeight: 1.6, margin: 0 }}>
                  We have received your enquiry and will be in touch within 48 hours with a tailored proposal.
                </p>
                <button onClick={() => { setShowForm(false); setSubmitted(false); }}
                  style={{ marginTop: 24, background: "none", border: "1px solid rgba(244,236,216,0.15)", color: "rgba(244,236,216,0.95)", padding: "10px 20px", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="ip-serif" style={{ fontSize: 22, fontWeight: 500, margin: "0 0 8px", fontStyle: "italic" }}>Product Brand Enquiry</h3>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", margin: "0 0 28px" }}>Tell us about your brand and how you would like to show up in the room.</p>
                <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Brand Name</label>
                    <input required value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })}
                      style={{ width: "100%", background: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.08)", borderRadius: 6, padding: "10px 12px", color: IVORY, fontSize: 14, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Your Name</label>
                    <input required value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })}
                      style={{ width: "100%", background: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.08)", borderRadius: 6, padding: "10px 12px", color: IVORY, fontSize: 14, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email</label>
                    <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      style={{ width: "100%", background: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.08)", borderRadius: 6, padding: "10px 12px", color: IVORY, fontSize: 14, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Product Type</label>
                    <select required value={form.productType} onChange={e => setForm({ ...form, productType: e.target.value })}
                      style={{ width: "100%", background: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.08)", borderRadius: 6, padding: "10px 12px", color: IVORY, fontSize: 14, outline: "none" }}>
                      <option value="" style={{ background: INK }}>Select a category</option>
                      {BRAND_TYPES.map((b, i) => <option key={i} value={b} style={{ background: INK }}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Interested In</label>
                    <select required value={form.opportunity} onChange={e => setForm({ ...form, opportunity: e.target.value })}
                      style={{ width: "100%", background: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.08)", borderRadius: 6, padding: "10px 12px", color: IVORY, fontSize: 14, outline: "none" }}>
                      <option value="" style={{ background: INK }}>Select an opportunity</option>
                      {OPPORTUNITIES.map((o, i) => <option key={i} value={o.title} style={{ background: INK }}>{o.title} — {o.price}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Message <span style={{ color: "rgba(244,236,216,0.65)" }}>(optional)</span></label>
                    <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3}
                      style={{ width: "100%", background: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.08)", borderRadius: 6, padding: "10px 12px", color: IVORY, fontSize: 14, outline: "none", resize: "vertical" }} />
                  </div>
                  {error && (
                    <div style={{ color: "#ffb4b4", background: "rgba(180,40,40,0.18)", border: "1px solid rgba(255,120,120,0.3)", borderRadius: 6, padding: "10px 12px", fontSize: 13, lineHeight: 1.5 }}>
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={submitting}
                    style={{ background: GOLD, color: INK, border: "none", padding: "14px 28px", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", cursor: submitting ? "wait" : "pointer", fontWeight: 500, marginTop: 8, opacity: submitting ? 0.6 : 1 }}
                  >
                    {submitting ? "Sending…" : <>Submit Enquiry <ArrowRight className="w-3.5 h-3.5 inline ml-1" /></>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
