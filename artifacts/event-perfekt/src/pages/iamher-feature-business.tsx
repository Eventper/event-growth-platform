import { useState } from "react";
import { Link } from "wouter";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useVisitorTracking } from "@/hooks/use-visitor-tracking";
import { motion } from "framer-motion";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

const CATEGORIES = [
  { value: "stay", label: "Stay — Hotels, apartments, guest accommodation" },
  { value: "eat_drink", label: "Eat & Drink — Restaurants, cafés, bars, brunch" },
  { value: "enjoy", label: "Enjoy — Beauty, wellness, shopping, culture, experiences" },
  { value: "invest_relocate", label: "Invest & Relocate — Property, relocation, professional services" },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

export default function IAmHerFeatureBusiness() {
  usePageSEO({
    title: "Feature Your Business | I Am Her — Stay & Enjoy Milton Keynes",
    description: "Submit your Milton Keynes business to be featured as part of the I Am Her Stay & Enjoy experience.",
    url: "https://eventperfekt.net/iamher/feature-your-business",
    noIndex: false,
  });
  useVisitorTracking("/iamher/feature-your-business", "Feature Your Business | I Am Her");

  const [form, setForm] = useState({
    businessName: "",
    founderName: "",
    category: "",
    website: "",
    instagram: "",
    email: "",
    phone: "",
    aboutBusiness: "",
    whatMakesWorthDiscovering: "",
    offerDiscount: "",
    interestedPartnership: false,
    partnershipValue: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.businessName || !form.category) {
      setError("Please provide a business name and category.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/iamher/business-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        .fb-input { width: 100%; background: transparent; border: 1px solid rgba(201,169,97,0.25); color: ${IVORY}; padding: 14px 16px; font-size: 14px; font-family: 'Poppins', sans-serif; outline: none; transition: border-color 0.3s; }
        .fb-input:focus { border-color: rgba(201,169,97,0.7); }
        .fb-input::placeholder { color: rgba(244,236,216,0.38); }
        .fb-select { width: 100%; background: ${INK}; border: 1px solid rgba(201,169,97,0.25); color: ${IVORY}; padding: 14px 16px; font-size: 14px; font-family: 'Poppins', sans-serif; outline: none; cursor: pointer; }
        .fb-select option { background: ${INK}; color: ${IVORY}; }
        .fb-label { display: block; font-size: 11px; color: ${GOLD}; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 8px; font-weight: 500; }
        .fb-textarea { min-height: 120px; resize: vertical; }
        .fb-checkbox { width: 18px; height: 18px; accent-color: ${GOLD}; cursor: pointer; }
        .fb-container { max-width: 680px; margin: 0 auto; padding: 0 20px; }
        @media (min-width: 640px) { .fb-container { padding: 0 36px; } }
      `}</style>

      {/* Hero Image */}
      <div style={{ width: "100%", height: 320, overflow: "hidden", position: "relative" }}>
        <img
          src="/images/iamher/feature-business-hero.jpg"
          alt="Business professional working on laptop"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", display: "block" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(51,3,17,0.35) 0%, rgba(51,3,17,0.70) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px 32px" }}>
          <div className="fb-container">
            <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 10px", fontWeight: 500 }}>
              The Businesses Behind The City
            </p>
            <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 300, fontSize: "clamp(26px, 4vw, 40px)", color: IVORY, margin: 0, lineHeight: 1.15, letterSpacing: "-0.01em", fontStyle: "italic" }}>
              Feature Your Business
            </h1>
          </div>
        </div>
      </div>

      {/* Header */}
      <header style={{ padding: "16px 24px", borderBottom: "1px solid rgba(201,169,97,0.08)" }}>
        <div className="fb-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/iamher/stay" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 14, color: GOLD, fontWeight: 600, letterSpacing: "0.12em", fontFamily: "Poppins, sans-serif" }}>I Am Her</span>
          </Link>
          <Link href="/iamher/stay" style={{ fontSize: 11, color: "rgba(244,236,216,0.65)", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ← Back to Stay & Enjoy
          </Link>
        </div>
      </header>

      <div className="fb-container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        {submitted ? (
          <motion.div {...fadeUp} style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: `1px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
              <span style={{ fontSize: 28, color: GOLD }}>✓</span>
            </div>
            <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 300, fontSize: "clamp(24px, 3vw, 32px)", color: IVORY, margin: "0 0 16px", lineHeight: 1.2 }}>
              Thank you.
            </h1>
            <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.8, maxWidth: 480, margin: "0 auto 32px", fontWeight: 300 }}>
              Your business has been submitted for review. If selected, we may feature your business as part of the Stay & Enjoy Milton Keynes experience.
            </p>
            <Link href="/iamher/stay">
              <button style={{ background: "transparent", border: `1px solid ${GOLD}`, color: GOLD, padding: "14px 32px", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Poppins', sans-serif", transition: "all 0.3s ease" }}>
                Return to Stay & Enjoy
              </button>
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.div {...fadeUp}>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.85)", lineHeight: 1.8, maxWidth: 560, margin: "0 0 40px", fontWeight: 300 }}>
                Share your story with the women who lead the room. Submit your Milton Keynes business for consideration as part of our curated Stay & Enjoy experience.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit}>
              <motion.div {...fadeUp}>
                <div style={{ marginBottom: 24 }}>
                  <label className="fb-label">Business Name *</label>
                  <input className="fb-input" type="text" value={form.businessName} onChange={e => handleChange("businessName", e.target.value)} placeholder="Your business name" required />
                </div>
              </motion.div>

              <motion.div {...fadeUp}>
                <div style={{ marginBottom: 24 }}>
                  <label className="fb-label">Founder / Contact Name</label>
                  <input className="fb-input" type="text" value={form.founderName} onChange={e => handleChange("founderName", e.target.value)} placeholder="Who we should contact" />
                </div>
              </motion.div>

              <motion.div {...fadeUp}>
                <div style={{ marginBottom: 24 }}>
                  <label className="fb-label">Business Category *</label>
                  <select className="fb-select" value={form.category} onChange={e => handleChange("category", e.target.value)} required>
                    <option value="" style={{ color: "rgba(244,236,216,0.38)" }}>Select a category</option>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </motion.div>

              <motion.div {...fadeUp}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                  <div>
                    <label className="fb-label">Website</label>
                    <input className="fb-input" type="url" value={form.website} onChange={e => handleChange("website", e.target.value)} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="fb-label">Instagram / Social</label>
                    <input className="fb-input" type="text" value={form.instagram} onChange={e => handleChange("instagram", e.target.value)} placeholder="@handle or URL" />
                  </div>
                </div>
              </motion.div>

              <motion.div {...fadeUp}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                  <div>
                    <label className="fb-label">Email</label>
                    <input className="fb-input" type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="hello@business.com" />
                  </div>
                  <div>
                    <label className="fb-label">Telephone</label>
                    <input className="fb-input" type="tel" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="+44 ..." />
                  </div>
                </div>
              </motion.div>

              <motion.div {...fadeUp}>
                <div style={{ marginBottom: 24 }}>
                  <label className="fb-label">Tell us about your business</label>
                  <textarea className="fb-input fb-textarea" value={form.aboutBusiness} onChange={e => handleChange("aboutBusiness", e.target.value)} placeholder="Where are you based, what services do you offer, and what kind of partnership would add value to your business?" />
                </div>
              </motion.div>

              <motion.div {...fadeUp}>
                <div style={{ marginBottom: 24 }}>
                  <label className="fb-label">What makes your business worth discovering?</label>
                  <textarea className="fb-input fb-textarea" value={form.whatMakesWorthDiscovering} onChange={e => handleChange("whatMakesWorthDiscovering", e.target.value)} placeholder="The one thing a visitor should know about you before they walk through the door." />
                </div>
              </motion.div>

              <motion.div {...fadeUp}>
                <div style={{ marginBottom: 24 }}>
                  <label className="fb-label">Would you like to offer an exclusive discount or experience?</label>
                  <textarea className="fb-input fb-textarea" value={form.offerDiscount} onChange={e => handleChange("offerDiscount", e.target.value)} placeholder="e.g. 10% off for I Am Her guests, complimentary welcome drink, priority booking..." />
                </div>
              </motion.div>

              <motion.div {...fadeUp}>
                <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <input className="fb-checkbox" type="checkbox" id="partnership" checked={form.interestedPartnership} onChange={e => handleChange("interestedPartnership", e.target.checked)} />
                  <label htmlFor="partnership" style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, cursor: "pointer", fontWeight: 300 }}>
                    I am interested in exploring a commercial partnership or sponsorship with Event Perfekt
                  </label>
                </div>
              </motion.div>

              <motion.div {...fadeUp}>
                <div style={{ marginBottom: 32 }}>
                  <label className="fb-label">What would most value from this partnership? (tick all that apply)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
                    {[
                      { id: "value_awareness", label: "Brand awareness \u2014 visibility in front of our high-value audience" },
                      { id: "value_reward", label: "Reward structure \u2014 commission, referral fees, or revenue share" },
                      { id: "value_exclusive", label: "Exclusive access \u2014 first look at events, VIP invitations, priority slots" },
                      { id: "value_content", label: "Content creation \u2014 professional photography, video, or editorial features" },
                      { id: "value_network", label: "Network access \u2014 introductions to our partner ecosystem and investors" },
                      { id: "value_other", label: "Something else \u2014 tell us in the field above" },
                    ].map(opt => (
                      <div key={opt.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <input className="fb-checkbox" type="checkbox" id={opt.id} checked={form.partnershipValue?.includes(opt.id)} onChange={e => {
                          const current = form.partnershipValue || [];
                          const next = e.target.checked ? [...current, opt.id] : current.filter(id => id !== opt.id);
                          handleChange("partnershipValue", next);
                        }} />
                        <label htmlFor={opt.id} style={{ fontSize: 13, color: "rgba(244,236,216,0.80)", lineHeight: 1.5, cursor: "pointer", fontWeight: 300 }}>
                          {opt.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {error && (
                <div style={{ marginBottom: 24, padding: "14px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4 }}>
                  <p style={{ fontSize: 13, color: "#EF4444", margin: 0, fontWeight: 400 }}>{error}</p>
                </div>
              )}

              <motion.div {...fadeUp}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: GOLD,
                    border: "none",
                    color: INK,
                    padding: "16px 40px",
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    opacity: submitting ? 0.6 : 1,
                    transition: "all 0.3s ease",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Your Business →"}
                </button>
                <p style={{ fontSize: 11, color: "rgba(244,236,216,0.45)", margin: "16px 0 0", fontWeight: 300 }}>
                  All submissions are reviewed before being featured. We will be in touch if your business is selected.
                </p>
              </motion.div>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <footer style={{ padding: "24px 36px", borderTop: "1px solid rgba(244,236,216,0.05)", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", letterSpacing: "0.08em", margin: 0, fontFamily: "'Poppins', sans-serif" }}>
          An initiative by Event Perfekt Global Ltd.
        </p>
      </footer>
    </div>
  );
}
