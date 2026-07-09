import { useState } from "react";
import { useLocation } from "wouter";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";

import ElizabethChat from "@/components/ElizabethChat";
import IamherMobileNav from "@/components/IamherMobileNav";
const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

const TIERS = [
  { key: "seat", label: "Individual Sponsored Seat", base: 300, vat: 60, total: 360, revolut: "https://checkout.revolut.com/pay/516ef462-82d8-49b3-85b7-b6c435cf01d0" },
  { key: "table", label: "Corporate Table (8 seats)", base: 2400, vat: 480, total: 2880, revolut: "" },
  { key: "supporting", label: "Supporting Partner", base: 5000, vat: 1000, total: 6000, revolut: "" },
  { key: "founding", label: "Founding Partnership", base: 25000, vat: 5000, total: 30000, revolut: "" },
  { key: "cobrand", label: "Co-branding / Custom Collaboration", base: 0, vat: 0, total: 0, revolut: "" },
];

export default function PartnershipPaymentPage() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Complete Your Partnership | The Woman Who Leads the Room | Leadership Wellbeing Experience",
    description: "Secure your corporate partnership for The Woman Who Leads the Room — a luxury leadership wellbeing experience for founders, executives, and women who lead. Milton Keynes, 30 October 2026.",
    url: "https://eventperfekt.net/iamher/partnership/payment",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "Complete Your Partnership — The Woman Who Leads the Room",
  });
  useVisitorTracking("/iamher/partnership/payment", "Partnership Payment · The Woman Who Leads the Room");

  const [tier, setTier] = useState("seat");
  const [, setLocation] = useLocation();

  const selected = TIERS.find(t => t.key === tier)!;
  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`@media (max-width: 520px) { .pm-logo { height: 44px !important; } .pm-card { padding: 36px 20px 48px !important; } }`}</style>

      <IamherMobileNav
        logo={eventPerfektLogo}
        links={[
          { label: "About", href: "/about-the-movement" },
          { label: "The Evening", href: "/iamher" },
          { label: "Apply for Your Invitation", href: "/access" },
          { label: "Partnership", href: "/iamher/partnership", active: true },
        ]}
      />

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <div className="pm-card" style={{ maxWidth: 560, width: "100%", padding: "48px 32px 56px" }}>

          <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>
            Corporate Partnership
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 400, color: IVORY, margin: "0 0 8px", lineHeight: 1.15, letterSpacing: "-0.02em", fontStyle: "italic" }}>
            Complete Your Partnership
          </h1>
          <p style={{ fontSize: 15, color: "rgba(244,236,216,0.92)", lineHeight: 1.6, margin: "0 0 36px", fontWeight: 300 }}>
            Thank you for your partnership enquiry. Secure your investment and we will confirm your branded moment in the room.
          </p>

          {/* Tier Selector */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px", fontWeight: 500 }}>Select Partnership</p>
            <div style={{ display: "grid", gap: 10 }}>
              {TIERS.map(t => (
                <label key={t.key} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", border: `1px solid ${tier === t.key ? GOLD : "rgba(244,236,216,0.95)"}`,
                  background: tier === t.key ? "rgba(201,169,97,0.95)" : "transparent",
                  cursor: "pointer", transition: "all 0.2s",
                }}>
                  <input type="radio" name="tier" value={t.key} checked={tier === t.key} onChange={() => setTier(t.key)}
                    style={{ accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, color: IVORY, margin: "0 0 2px", fontWeight: 500 }}>{t.label}</p>
                    <p style={{ fontSize: 12, color: GOLD, margin: 0 }}>
                      {t.total > 0 ? `£${t.total.toLocaleString()}.00 inc VAT` : "Let's talk — open conversation"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Amount Due */}
          {selected.total > 0 && (
            <div style={{ padding: "24px", border: "1px solid rgba(201,169,97,0.10)", background: "rgba(201,169,97,0.06)", marginBottom: 32 }}>
              <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px" }}>Amount Due</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: "rgba(244,236,216,0.95)" }}>{selected.label}</span>
                <span style={{ fontSize: 16, fontWeight: 400 }}>£{selected.base.toLocaleString()}.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <span style={{ fontSize: 14, color: "rgba(244,236,216,0.95)" }}>VAT @ 20%</span>
                <span style={{ fontSize: 16, fontWeight: 400 }}>£{selected.vat.toLocaleString()}.00</span>
              </div>
              <div style={{ height: 1, background: "rgba(201,169,97,0.06)", marginBottom: 16 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14, color: GOLD, fontWeight: 500 }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 400, color: GOLD }}>£{selected.total.toLocaleString()}.00</span>
              </div>
            </div>
          )}

          {/* Payment Options */}
          <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 20px" }}>Payment Options</p>

          {selected.key === "cobrand" ? (
            <div style={{ padding: "24px", border: "1px solid rgba(201,169,97,0.10)", background: "rgba(201,169,97,0.06)", marginBottom: 24, textAlign: "center" }}>
              <p style={{ fontSize: 16, color: IVORY, margin: "0 0 12px", fontStyle: "italic" }}>Let's shape this together</p>
              <p style={{ fontSize: 14, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: "0 0 20px" }}>
                Co-branding and custom collaborations are designed around your organisation's identity and goals. Drop us an email and we will reply within 24 hours.
              </p>
              <a href="mailto:info@eventperfekt.com?subject=Co-branding%20Enquiry%20%E2%80%94%20The%20Woman%20Who%20Leads%20the%20Room" style={{
                display: "inline-block", padding: "14px 32px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                color: INK, background: GOLD, textDecoration: "none", fontWeight: 500,
                transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif",
              }}>
                Email Event Perfekt →
              </a>
            </div>
          ) : selected.key === "founding" ? (
            <div style={{ padding: "24px", border: "1px solid rgba(201,169,97,0.10)", background: "rgba(201,169,97,0.06)", marginBottom: 24, textAlign: "center" }}>
              <p style={{ fontSize: 16, color: IVORY, margin: "0 0 12px", fontStyle: "italic" }}>Assessment required before payment</p>
              <p style={{ fontSize: 14, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: "0 0 20px" }}>
                Before we invoice £30,000, we need to understand your brand vision, in-room activation, and framing preferences. Complete the assessment and we will be in touch within 48 hours.
              </p>
              <button onClick={() => { trackFunnelEvent('cta_click', '/iamher/partnership/payment', { cta: 'complete_assessment' }); setLocation("/iamher/partnership/founding-assessment"); }} style={{
                display: "inline-block", padding: "14px 32px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                color: INK, background: GOLD, border: "none", cursor: "pointer", fontWeight: 500,
                transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif",
              }}>
                Complete Assessment →
              </button>
            </div>
          ) : selected.key === "table" ? (
            <div style={{ padding: "24px", border: "1px solid rgba(201,169,97,0.10)", background: "rgba(201,169,97,0.06)", marginBottom: 24, textAlign: "center" }}>
              <p style={{ fontSize: 16, color: IVORY, margin: "0 0 12px", fontStyle: "italic" }}>Nominations required before payment</p>
              <p style={{ fontSize: 14, color: "rgba(244,236,216,0.92)", lineHeight: 1.7, margin: "0 0 20px" }}>
                Before we confirm your corporate table, please nominate the women who will represent your organisation. We will review and send payment instructions within 48 hours.
              </p>
              <button onClick={() => { trackFunnelEvent('cta_click', '/iamher/partnership/payment', { cta: 'nominate_table' }); setLocation("/iamher/partnership/table-nominations"); }} style={{
                display: "inline-block", padding: "14px 32px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                color: INK, background: GOLD, border: "none", cursor: "pointer", fontWeight: 500,
                transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif",
              }}>
                Nominate Your Table →
              </button>
            </div>
          ) : (
            <>
              {/* Revolut */}
              {selected.revolut && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 14, fontWeight: 400, margin: "0 0 12px" }}>1. Revolut</p>
                  <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: "0 0 12px" }}>
                    Pay instantly via Revolut. Use the button below to open the payment link.
                  </p>
                  <a href={selected.revolut} target="_blank" rel="noopener noreferrer" onClick={() => trackFunnelEvent('payment_initiated', '/iamher/partnership/payment', { tier: selected.key, method: 'revolut' })} style={{
                    display: "inline-block", padding: "14px 32px", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                    color: INK, background: GOLD, textDecoration: "none", fontWeight: 500,
                    transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif",
                  }}>
                    Pay via Revolut →
                  </a>
                </div>
              )}

              <div style={{ height: 1, background: "rgba(244,236,216,0.95)", margin: "24px 0" }} />

              {/* Bank Transfer */}
              <div>
                <p style={{ fontSize: 14, fontWeight: 400, margin: "0 0 12px" }}>{selected.key === "seat" ? "2. Bank Transfer" : "Bank Transfer"}</p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: "0 0 16px" }}>
                  Transfer directly to our UK business account. Please include your company name and "I Am Her Partnership" as the reference.
                </p>
                <div style={{ padding: "20px", border: "1px solid rgba(244,236,216,0.08)", background: "rgba(244,236,216,0.95)", fontSize: 13, lineHeight: 2, color: "rgba(244,236,216,0.95)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Account Name</span>
                    <span style={{ color: IVORY, cursor: "pointer" }} onClick={() => copyToClipboard("Event Perfekt Global Ltd")}>Event Perfekt Global Ltd ↗</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Account Number</span>
                    <span style={{ color: IVORY, cursor: "pointer" }} onClick={() => copyToClipboard("78253411")}>78253411 ↗</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Sort Code</span>
                    <span style={{ color: IVORY, cursor: "pointer" }} onClick={() => copyToClipboard("04-29-09")}>04-29-09 ↗</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Currency</span>
                    <span style={{ color: IVORY }}>GBP</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <p style={{ fontSize: 12, color: "rgba(244,236,216,0.75)", marginTop: 32, textAlign: "center", lineHeight: 1.6 }}>
            Once payment is confirmed, your partnership confirmation and branded moment details will follow by email.
            <br />Questions? Email <a href="mailto:info@eventperfekt.com" style={{ color: GOLD, textDecoration: "none" }}>info@eventperfekt.com</a>
          </p>

          {/* Make it a Weekend CTA */}
          <div style={{ marginTop: 36, padding: "24px 28px", border: "1px solid rgba(201,169,97,0.15)", borderRadius: 8, background: "rgba(201,169,97,0.06)", textAlign: "center" }}>
            <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 10px", fontWeight: 500 }}>Make it a Weekend</p>
            <p style={{ fontSize: 14, color: "rgba(244,236,216,0.85)", lineHeight: 1.6, margin: "0 0 16px" }}>Hosting partners from out of town? Help them discover Milton Keynes and extend the experience.</p>
            <a href="/iamher/stay" style={{ display: "inline-block", padding: "12px 28px", fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: INK, background: GOLD, textDecoration: "none", fontWeight: 500, transition: "all 0.3s ease", fontFamily: "Poppins, sans-serif" }}>Explore the Weekend Guide</a>
          </div>
        </div>
      </div>

      <footer style={{ padding: "20px 24px", textAlign: "center", borderTop: "1px solid rgba(244,236,216,0.08)" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.65)", letterSpacing: "0.1em" }}>
          Curated by Event Perfekt Global Ltd · Friday 30 October 2026 · Milton Keynes
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
      <ElizabethChat page="partnership-payment" />
    </div>
  );
}
