import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

function ThinButton({ children, onClick, variant = "gold", type, disabled }: {
  children: React.ReactNode; onClick?: () => void; variant?: "gold" | "ghost"; type?: "submit"; disabled?: boolean;
}) {
  const isGold = variant === "gold";
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      style={{
        background: "transparent", color: isGold ? GOLD : "rgba(244,236,216,0.95)",
        border: `1px solid ${isGold ? GOLD : "rgba(244,236,216,0.50)"}`,
        padding: "16px 36px", fontSize: 11, fontWeight: 500, cursor: "pointer",
        letterSpacing: "0.28em", textTransform: "uppercase", borderRadius: 0,
        transition: "all 0.3s ease", fontFamily: "'Poppins', sans-serif",
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(201,169,97,0.08)"; (e.target as HTMLElement).style.letterSpacing = "0.32em"; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; (e.target as HTMLElement).style.letterSpacing = "0.28em"; }}
    >
      {children}
    </button>
  );
}

function FormInput({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "rgba(244,236,216,0.65)" }}> *</span>}
      </label>
      <input
        type={type}
        style={{ width: "100%", padding: "14px 0", fontSize: 15, background: "transparent", border: "none", borderBottom: `1px solid rgba(201,169,97,0.50)`, borderRadius: 0, color: IVORY, outline: "none" }}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function IAmHerBrochurePage() {
  const { isMobile } = useViewport();
  useVisitorTracking("/iamher/partnership", "Organisations · The Woman Who Leads the Room");
  usePageSEO({
    title: "Organisations · The Woman Who Leads the Room | Event Perfekt",
    description: "Partner with The Woman Who Leads the Room — a luxury leadership wellbeing evening for 100 women founders, executives, and leaders. Milton Keynes, 30 October 2026.",
    keywords: "corporate partnership women's event UK, brand partnership female founders, women's evening sponsorship UK 2026, Event Perfekt partnership",
    url: "https://eventperfekt.net/iamher/partnership",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Partner with The Woman Who Leads the Room — Corporate partnership for women's leadership evening",
  });

  const [activeTab, setActiveTab] = useState<"organisation" | "product">("organisation");

  const [orgName, setOrgName] = useState("");
  const [orgCompany, setOrgCompany] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState("");
  const [orgSuccess, setOrgSuccess] = useState(false);

  const [prodName, setProdName] = useState("");
  const [prodCompany, setProdCompany] = useState("");
  const [prodEmail, setProdEmail] = useState("");
  const [prodProduct, setProdProduct] = useState("");
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState("");
  const [prodSuccess, setProdSuccess] = useState(false);

  const submitOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError("");
    setOrgLoading(true);
    try {
      const res = await fetch("/api/event-august/brochure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, email: orgEmail, organisation: orgCompany, linkedin: orgWebsite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setOrgSuccess(true);
      trackFunnelEvent("submit_success", "/iamher/partnership", { form: "organisation" });
    } catch (err: any) { setOrgError(err.message); }
    setOrgLoading(false);
  };

  const submitProd = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError("");
    setProdLoading(true);
    try {
      const res = await fetch("/api/event-august/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName, organisation: prodCompany, email: prodEmail,
          phone: "Not provided", role: "Product Brand", linkedin: "Not provided",
          message: `Product: ${prodProduct}\n\nInterested in product brand collaboration.`,
          consent_marketing: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setProdSuccess(true);
      trackFunnelEvent("submit_success", "/iamher/partnership", { form: "product_brand" });
    } catch (err: any) { setProdError(err.message); }
    setProdLoading(false);
  };

  return (
    <div style={{ background: INK, minHeight: "100vh", fontFamily: "'Poppins', sans-serif", color: IVORY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .ip-serif { font-family: 'Poppins', sans-serif; }
        .ip-tab { cursor: pointer; padding: 14px 28px; font-size: 11; letter-spacing: 0.28em; text-transform: uppercase; transition: all 0.3s; border: none; background: transparent; font-family: 'Poppins', sans-serif; }
      `}</style>

      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(26,5,12,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(244,236,216,0.08)", padding: "16px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/iamher" style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: GOLD, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>EP</span>
              </div>
              <span style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Event Perfekt</span>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/iamher" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.2em", textTransform: "uppercase", transition: "color 0.3s" }} onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = "rgba(244,236,216,0.70)"}>Home</span>
            </Link>
            <Link href="/iamher" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", letterSpacing: "0.2em", textTransform: "uppercase", transition: "color 0.3s" }} onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = "rgba(244,236,216,0.70)"}>I Am Her</span>
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "72px 24px 96px" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: `1px solid ${GOLD}`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <span style={{ color: GOLD, fontSize: 20, fontWeight: 500, letterSpacing: "0.05em" }}>EP</span>
            </div>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>
              Organisations
            </p>
            <h2 className="ip-serif" style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 500, color: IVORY, margin: "0 0 12px", lineHeight: 1.15, fontStyle: "italic" }}>
              The Woman Who Leads the Room
            </h2>
            <p style={{ fontSize: 15, color: "rgba(244,236,216,0.95)", margin: 0, lineHeight: 1.6 }}>
              A luxury leadership wellbeing evening for 100 women founders, executives, and leaders.
              <br />Milton Keynes, 30 October 2026.
            </p>
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid rgba(244,236,216,0.08)", marginBottom: 32 }}>
            <button className="ip-tab" style={{ color: activeTab === "organisation" ? GOLD : "rgba(244,236,216,0.60)", borderBottom: activeTab === "organisation" ? `1px solid ${GOLD}` : "none", marginBottom: -1 }} onClick={() => setActiveTab("organisation")}>
              Organisations
            </button>
            <button className="ip-tab" style={{ color: activeTab === "product" ? GOLD : "rgba(244,236,216,0.60)", borderBottom: activeTab === "product" ? `1px solid ${GOLD}` : "none", marginBottom: -1 }} onClick={() => setActiveTab("product")}>
              Product Brands
            </button>
          </div>

          {activeTab === "organisation" && (
            <motion.div key="org" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {orgSuccess ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <p style={{ color: GOLD, fontSize: 16, fontStyle: "italic", margin: "0 0 8px" }}>On its way.</p>
                  <p style={{ color: "rgba(244,236,216,0.95)", fontSize: 13 }}>Check your inbox in the next few minutes. Our partnerships team will be in touch within 24 hours.</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: "rgba(244,236,216,0.95)", margin: "0 0 24px", lineHeight: 1.6 }}>
                    For organisations interested in corporate tables, founding partnerships, or sponsored seats.
                  </p>
                  <form onSubmit={submitOrg} style={{ display: "grid", gap: 20 }}>
                    <FormInput label="Your name" value={orgName} onChange={setOrgName} required placeholder="Your name" />
                    <FormInput label="Your company" value={orgCompany} onChange={setOrgCompany} required placeholder="Your company name" />
                    <FormInput label="Your email" value={orgEmail} onChange={setOrgEmail} type="email" required placeholder="you@company.com" />
                    <FormInput label="Company website" value={orgWebsite} onChange={setOrgWebsite} placeholder="https://company.com" />
                    {orgError && <p style={{ color: "#E8A0A0", fontSize: 13, textAlign: "center" }}>{orgError}</p>}
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                      <ThinButton type="submit" variant="gold" disabled={orgLoading}>
                        {orgLoading ? "Sending..." : "Send Me the Proposal"}
                      </ThinButton>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          )}

          {activeTab === "product" && (
            <motion.div key="prod" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {prodSuccess ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <p style={{ color: GOLD, fontSize: 16, fontStyle: "italic", margin: "0 0 8px" }}>Enquiry received.</p>
                  <p style={{ color: "rgba(244,236,216,0.95)", fontSize: 13 }}>Our brand partnerships team will be in touch within 24 hours.</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: "rgba(244,236,216,0.95)", margin: "0 0 24px", lineHeight: 1.6 }}>
                    For product and service brands interested in collaboration, goody bag inclusion, or in-room experiences.
                  </p>
                  <form onSubmit={submitProd} style={{ display: "grid", gap: 20 }}>
                    <FormInput label="Your name" value={prodName} onChange={setProdName} required placeholder="Your name" />
                    <FormInput label="Your company" value={prodCompany} onChange={setProdCompany} required placeholder="Your company name" />
                    <FormInput label="Your email" value={prodEmail} onChange={setProdEmail} type="email" required placeholder="you@company.com" />
                    <FormInput label="Product or service" value={prodProduct} onChange={setProdProduct} required placeholder="e.g. Premium skincare, executive coaching, wellness app" />
                    {prodError && <p style={{ color: "#E8A0A0", fontSize: 13, textAlign: "center" }}>{prodError}</p>}
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                      <ThinButton type="submit" variant="gold" disabled={prodLoading}>
                        {prodLoading ? "Sending..." : "Send Enquiry"}
                      </ThinButton>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          )}

          <div style={{ marginTop: 48, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "rgba(244,236,216,0.75)", letterSpacing: "0.15em" }}>
              info@eventperfekt.com
            </p>
            <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", marginTop: 12, fontStyle: "italic" }}>
              Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
