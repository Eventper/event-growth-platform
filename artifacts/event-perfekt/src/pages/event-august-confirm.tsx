import { useEffect, useState } from "react";
import logoImage from "@assets/3d_Logo_1772145137902.jpg";

const GOLD = "#C9A961";
const BG = "#1A0A0E";
const BRAND = "#330311";
const IVORY = "#F4ECD8";

type State = "loading" | "confirmed" | "already" | "error";

export default function EventAugustConfirm() {
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) { setState("error"); setErrorMsg("No confirmation token found in this link."); return; }

    fetch(`/api/event-august/confirm?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) { setState("error"); setErrorMsg(data.message || "This link is invalid or has already been used."); }
        else if (data.alreadyConfirmed) setState("already");
        else setState("confirmed");
      })
      .catch(() => { setState("error"); setErrorMsg("Something went wrong. Please try again or contact us directly."); });
  }, []);

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Poppins', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        @media (max-width: 600px) {
          .conf-header { padding: 12px 16px !important; }
          .conf-header-logo { height: 40px !important; }
          .conf-header-text { font-size: 9px !important; letter-spacing: 0.06em !important; }
          .conf-body { padding: 40px 16px !important; }
          .conf-h1 { font-size: 26px !important; }
          .conf-btn-row { flex-direction: column !important; align-items: center !important; gap: 12px !important; }
          .conf-btn-row a { width: 100% !important; max-width: 280px !important; text-align: center !important; display: block !important; }
          .conf-footer { padding: 20px 16px !important; font-size: 10px !important; }
        }
        @media (max-width: 380px) {
          .conf-header-text { display: none !important; }
        }
      `}</style>

      <header className="conf-header" style={{ background: "rgba(51,3,17,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/iamher" style={{ textDecoration: "none" }}>
          <img src={logoImage} alt="Event Perfekt" className="conf-header-logo" style={{ height: 52, borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", outline: "2px solid rgba(255,255,255,0.4)", objectFit: "contain" }} />
        </a>
        <p className="conf-header-text" style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Curated by Event Perfekt</p>
      </header>

      <div className="conf-body" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
        <div style={{ maxWidth: 540, width: "100%", textAlign: "center" }}>

          {state === "loading" && (
            <div>
              <div style={{ width: 48, height: 48, border: `3px solid rgba(255,255,255,0.08)`, borderTopColor: GOLD, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, letterSpacing: "0.1em" }}>Confirming your seat…</p>
            </div>
          )}

          {state === "confirmed" && (
            <div className="fade-up">
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: `rgba(201,169,97,0.12)`, border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", fontSize: 32, color: GOLD }}>✓</div>
              <p style={{ color: GOLD, fontSize: 10, fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", margin: "0 0 20px" }}>Seat confirmed</p>
              <h1 className="conf-h1" style={{ fontFamily: "Poppins, sans-serif", fontSize: 36, fontWeight: 700, color: IVORY, margin: "0 0 20px", lineHeight: 1.2 }}>
                You're on the list.
              </h1>
              <p style={{ fontSize: 16, color: "rgba(244,236,216,0.65)", lineHeight: 1.8, margin: "0 0 16px", fontWeight: 300 }}>
                Thank you for confirming. Your registration is now on file.
              </p>
              <p style={{ fontFamily: "Poppins, sans-serif", fontStyle: "italic", fontSize: 18, color: GOLD, margin: "0 0 40px", lineHeight: 1.6 }}>
                Ticket pricing and full event details are shared in your formal acceptance email — after the review process is complete.
              </p>
              {/* Card CTA */}
              <div style={{ margin: "0 0 32px", padding: "24px", border: "1px solid rgba(201,169,97,0.2)", background: "rgba(201,169,97,0.04)" }}>
                <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase", margin: "0 0 10px" }}>Share the moment</p>
                <p style={{ fontSize: 14, color: "rgba(244,236,216,0.6)", lineHeight: 1.6, margin: "0 0 18px", fontWeight: 300 }}>
                  Create your personalised <em style={{ color: GOLD }}>I Am Her</em> card and share it on LinkedIn or Instagram.
                </p>
                <a href="/iamher/card" style={{ display: "inline-block", background: GOLD, color: BG, textDecoration: "none", padding: "13px 28px", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  Create Your Card →
                </a>
              </div>

              <div className="conf-btn-row" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/iamher" style={{ background: "transparent", color: IVORY, textDecoration: "none", border: `1px solid rgba(244,236,216,0.25)`, padding: "14px 32px", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Back to the Evening
                </a>
                <a href="https://www.eventperfekt.com" target="_blank" rel="noreferrer" style={{ background: "transparent", color: "rgba(244,236,216,0.4)", textDecoration: "none", border: `1px solid rgba(244,236,216,0.12)`, padding: "14px 32px", fontSize: 11, fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  About Event Perfekt
                </a>
              </div>
            </div>
          )}

          {state === "already" && (
            <div className="fade-up">
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: `rgba(201,169,97,0.08)`, border: `2px solid rgba(201,169,97,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", fontSize: 32, color: GOLD }}>✓</div>
              <p style={{ color: GOLD, fontSize: 10, fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", margin: "0 0 20px" }}>Already confirmed</p>
              <h1 className="conf-h1" style={{ fontFamily: "Poppins, sans-serif", fontSize: 36, fontWeight: 700, color: IVORY, margin: "0 0 20px", lineHeight: 1.2 }}>
                Your seat is already confirmed.
              </h1>
              <p style={{ fontSize: 16, color: "rgba(244,236,216,0.65)", lineHeight: 1.8, margin: "0 0 40px", fontWeight: 300 }}>
                We already have your registration on file. Watch your inbox — formal acceptance details are on their way.
              </p>
              <a href="/iamher" style={{ background: GOLD, color: BG, textDecoration: "none", padding: "14px 32px", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Back to the Evening
              </a>
            </div>
          )}

          {state === "error" && (
            <div className="fade-up">
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", fontSize: 28, color: "rgba(255,255,255,0.3)" }}>✕</div>
              <p style={{ color: "rgba(255,120,120,0.85)", fontSize: 10, fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", margin: "0 0 20px" }}>Link not valid</p>
              <h1 className="conf-h1" style={{ fontFamily: "Poppins, sans-serif", fontSize: 32, fontWeight: 700, color: IVORY, margin: "0 0 16px", lineHeight: 1.25 }}>
                We couldn't confirm your seat.
              </h1>
              <p style={{ fontSize: 15, color: "rgba(244,236,216,0.55)", lineHeight: 1.8, margin: "0 0 12px", fontWeight: 300 }}>{errorMsg}</p>
              <p style={{ fontSize: 13, color: "rgba(244,236,216,0.4)", margin: "0 0 36px", lineHeight: 1.7 }}>
                If you think this is a mistake, please contact us at{" "}
                <a href="mailto:info@eventperfekt.com" style={{ color: GOLD, textDecoration: "none", borderBottom: `1px solid ${GOLD}`, paddingBottom: 1 }}>info@eventperfekt.com</a>
                {" "}and we'll sort it out right away.
              </p>
              <div className="conf-btn-row" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/iamher" style={{ background: "transparent", color: GOLD, textDecoration: "none", border: `2px solid ${GOLD}`, padding: "14px 32px", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Apply for Your Invitation
                </a>
                <a href="mailto:info@eventperfekt.com" style={{ background: "transparent", color: "rgba(244,236,216,0.5)", textDecoration: "none", border: `1px solid rgba(244,236,216,0.2)`, padding: "14px 32px", fontSize: 11, fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Email Us
                </a>
              </div>
            </div>
          )}

        </div>
      </div>

      <footer style={{ background: BRAND, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "28px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0, letterSpacing: "0.06em" }}>© 2026 Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG · <a href="mailto:info@eventperfekt.com" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>info@eventperfekt.com</a></p>
      </footer>
    </div>
  );
}
