import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";

import ElizabethChat from "@/components/ElizabethChat";
import IamherMobileNav from "@/components/IamherMobileNav";
const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PaymentPage() {
  usePageSEO({
    title: "Payment | The Woman Who Leads the Room | Leadership Wellbeing Experience",
    description: "Complete your payment for The Woman Who Leads the Room \u2014 a luxury leadership wellbeing experience for founders, executives, and women who lead. Milton Keynes, 30 October 2026.",
  });
  useVisitorTracking("/access/payment", "Payment \u00b7 The Woman Who Leads the Room");

  const [location] = useLocation();
  const paid = location.includes("?success=1");
  // True when the PayPal button could not be rendered (SDK blocked/failed) — we
  // then surface the bank-transfer fallback prominently instead of a blank box.
  const [paypalFailed, setPaypalFailed] = useState(false);

  // Fire a conversion event when the buyer lands on the success state.
  useEffect(() => {
    if (paid) trackFunnelEvent("purchase", "/access/payment", { method: "paypal_or_bank", amount: 360, currency: "GBP" });
    else trackFunnelEvent("payment_page_view", "/access/payment", { amount: 360, currency: "GBP" });
  }, [paid]);

  useEffect(() => {
    if (paid) return; // no button needed on the success screen
    let cancelled = false;
    const markFailed = () => { if (!cancelled) setPaypalFailed(true); };
    const render = () => {
      if (window.paypal?.HostedButtons) {
        try {
          window.paypal.HostedButtons({ hostedButtonId: "2BMXQVH4QJUNJ" }).render("#paypal-hosted-button");
        } catch (err) {
          console.error("[payment] PayPal render failed:", err);
          markFailed();
        }
      } else {
        markFailed();
      }
    };
    const existing = document.getElementById("paypal-sdk") as HTMLScriptElement | null;
    if (existing) { render(); return; }
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = "https://www.paypal.com/sdk/js?client-id=BAAWuBLkuv4hnuJBp4QZ_k25clo-rzCt0vDB4b1Gd8O-wRCL3mGiASEnOv44LdcX4HTZcEzIztPbMT4tAU&components=hosted-buttons&disable-funding=venmo&currency=GBP";
    script.async = true;
    script.onload = render;
    script.onerror = () => { console.error("[payment] PayPal SDK failed to load"); markFailed(); };
    document.body.appendChild(script);
    // Safety net: if nothing rendered within 6s, reveal the fallback.
    const t = setTimeout(() => {
      const el = document.getElementById("paypal-hosted-button");
      if (el && el.childElementCount === 0) markFailed();
    }, 6000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [paid]);

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @media (max-width: 520px) { .pm-logo { height: 44px !important; } .pm-card { padding: 36px 20px 48px !important; } }
      `}</style>

      <IamherMobileNav
        logo={eventPerfektLogo}
        links={[
          { label: "About", href: "/about-the-movement" },
          { label: "The Evening", href: "/iamher" },
          { label: "Apply for Your Invitation", href: "/access", active: true },
        ]}
      />

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <div className="pm-card" style={{ maxWidth: 520, width: "100%", padding: "48px 32px 56px" }}>

          <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 12px", fontWeight: 500 }}>
            Friday 30 October 2026 \u00b7 Milton Keynes
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 400, color: IVORY, margin: "0 0 8px", lineHeight: 1.15, letterSpacing: "-0.02em", fontStyle: "italic" }}>
            Complete Your Access
          </h1>
          <p style={{ fontSize: 15, color: "rgba(244,236,216,0.65)", lineHeight: 1.6, margin: "0 0 36px", fontWeight: 300 }}>
            Thank you for requesting access. Your formal invitation and full event details will follow upon confirmation of payment.
          </p>

          <div style={{ padding: "24px", border: "1px solid rgba(201,169,97,0.2)", background: "rgba(201,169,97,0.03)", marginBottom: 32 }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 16px" }}>Amount Due</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: 14, color: "rgba(244,236,216,0.7)" }}>Guest Contribution</span>
              <span style={{ fontSize: 16, fontWeight: 400 }}>£300.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: "rgba(244,236,216,0.7)" }}>VAT (20%)</span>
              <span style={{ fontSize: 16, fontWeight: 400 }}>£60.00</span>
            </div>
            <div style={{ height: 1, background: "rgba(201,169,97,0.2)", marginBottom: 16 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 14, color: GOLD, fontWeight: 500 }}>Total Payable</span>
              <span style={{ fontSize: 22, fontWeight: 400, color: GOLD }}>£360.00</span>
            </div>
          </div>

          {paid ? (
            <div style={{ padding: "24px", border: "1px solid rgba(201,169,97,0.2)", background: "rgba(201,169,97,0.03)", textAlign: "center" }}>
              <p style={{ fontSize: 16, color: GOLD, margin: "0 0 8px" }}>✓ Payment successful</p>
              <p style={{ fontSize: 13, color: "rgba(244,236,216,0.6)", lineHeight: 1.6 }}>
                Thank you. Your formal invitation and full event details will follow by email shortly.
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 20px" }}>Payment</p>

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 400, margin: "0 0 12px" }}>Pay securely with PayPal</p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.55)", lineHeight: 1.6, margin: "0 0 16px" }}>
                  Click the button below to complete your payment (£300 guest contribution + £60 VAT = £360 total) via PayPal. Once confirmed, your invitation will follow by email.
                </p>
                <div style={{ width: "100%", maxWidth: 300, margin: "0 auto" }}>
                  <div id="paypal-hosted-button" />
                </div>
                {paypalFailed && (
                  <p style={{ fontSize: 13, color: "#ffd9a8", background: "rgba(201,169,97,0.08)", border: "1px solid rgba(201,169,97,0.25)", borderRadius: 6, padding: "12px 14px", lineHeight: 1.6, marginTop: 12, textAlign: "center" }}>
                    PayPal couldn't load (it may be blocked by your browser). Please pay by bank transfer below, or email <a href="mailto:info@eventperfekt.com" style={{ color: GOLD, textDecoration: "none" }}>info@eventperfekt.com</a> and we'll send a payment link.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 400, margin: "0 0 12px" }}>Or pay by bank transfer</p>
                <p style={{ fontSize: 13, color: "rgba(244,236,216,0.55)", lineHeight: 1.6, margin: "0 0 16px" }}>
                  Transfer £360.00 (£300 guest contribution + £60 VAT) to the Revolut account below. Please include your full name as the reference.
                </p>
                <div style={{ padding: "20px", border: "1px solid rgba(201,169,97,0.2)", background: "rgba(201,169,97,0.03)", maxWidth: 340, margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "rgba(244,236,216,0.5)" }}>Bank</span>
                    <span style={{ fontSize: 13, color: IVORY, fontWeight: 500 }}>Revolut Bank</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "rgba(244,236,216,0.5)" }}>Account Name</span>
                    <span style={{ fontSize: 13, color: IVORY, fontWeight: 500 }}>Event Perfekt Global Ltd</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "rgba(244,236,216,0.5)" }}>Sort Code</span>
                    <span style={{ fontSize: 13, color: IVORY, fontWeight: 500 }}>04-29-09</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "rgba(244,236,216,0.5)" }}>Account Number</span>
                    <span style={{ fontSize: 13, color: IVORY, fontWeight: 500 }}>78253411</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "rgba(244,236,216,0.5)" }}>Guest Contribution</span>
                    <span style={{ fontSize: 13, color: IVORY, fontWeight: 500 }}>£300.00 GBP</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "rgba(244,236,216,0.5)" }}>VAT (20%)</span>
                    <span style={{ fontSize: 13, color: IVORY, fontWeight: 500 }}>£60.00 GBP</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "rgba(244,236,216,0.5)" }}>Total</span>
                    <span style={{ fontSize: 13, color: GOLD, fontWeight: 500 }}>£360.00 GBP</span>
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(201,169,97,0.15)" }}>
                    <span style={{ fontSize: 12, color: "rgba(244,236,216,0.4)" }}>
                      Reference: Your full name
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <p style={{ fontSize: 12, color: "rgba(244,236,216,0.35)", marginTop: 32, textAlign: "center", lineHeight: 1.6 }}>
            Once payment is confirmed, your formal invitation and full event details will follow by email.
            <br />Questions? Email <a href="mailto:info@eventperfekt.com" style={{ color: GOLD, textDecoration: "none" }}>info@eventperfekt.com</a>
          </p>
        </div>
      </div>

      <footer style={{ padding: "20px 24px", textAlign: "center", borderTop: "1px solid rgba(244,236,216,0.06)" }}>
        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.65)", letterSpacing: "0.1em" }}>
          Curated by Event Perfekt Global Ltd · Friday 30 October 2026 · Milton Keynes
        </p>
      </footer>
      <ElizabethChat page="payment" />
    </div>
  );
}
