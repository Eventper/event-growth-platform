import { useState, useEffect } from "react";
import { captureEmail } from "@/hooks/use-visitor-tracking";

const GOLD = "#C9A961";
const BRAND = "#330311";

interface EmailCapturePopupProps {
  page: string;
  delayMs?: number;
  storageKey?: string;
  variant?: "b2b" | "iamher";
  headline?: string;
  subheadline?: string;
  offer?: string;
  cta?: string;
  gift?: string;
}

export default function EmailCapturePopup({
  page,
  delayMs = 8000,
  storageKey = "ep_email_captured",
  variant = "b2b",
  headline,
  subheadline,
  offer,
  cta,
  gift,
}: EmailCapturePopupProps) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isB2B = variant === "b2b";

  const DISPOSABLE_DOMAINS = new Set([
    "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
    "throwaway.email", "yopmail.com", "dispostable.com", "getnada.com",
    "sharklasers.com", "fakeinbox.com", "trashmail.com", "maildrop.cc",
    "mailnull.com", "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
    "temp-mail.org", "tempinbox.com", "tempr.email", "discard.email", "gzeos.com"
  ]);

  const B2B_DOMAINS = new Set([
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
    "aol.com", "icloud.com", "me.com", "msn.com", "yahoo.co.uk",
    "hotmail.co.uk", "live.co.uk", "googlemail.com", "protonmail.com",
    "ymail.com", "mail.com", "gmx.com", "gmx.co.uk", "btinternet.com",
    "talktalk.net", "virginmedia.com", "sky.com", "ntlworld.com",
    "blueyonder.co.uk", "tiscali.co.uk", "orange.net", "fsmail.net",
    "o2.co.uk", "vodafone.net", "ee.co.uk", "three.co.uk",
  ]);

  function isValidEmail(email: string): boolean {
    const domain = email.trim().split("@")[1]?.toLowerCase();
    if (!domain) return false;
    if (DISPOSABLE_DOMAINS.has(domain)) return false;
    if (isB2B && B2B_DOMAINS.has(domain)) return false;
    return true;
  }

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs, storageKey]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(storageKey, "dismissed");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nameTrim = name.trim();
    const emailTrim = email.trim();
    if (!nameTrim) { setError("Please enter your name."); return; }
    if (!emailTrim) { setError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) { setError("Please enter a valid email address."); return; }
    if (!isValidEmail(emailTrim)) {
      setError(isB2B
        ? "Please use a company or work email address. Personal and disposable addresses are not accepted."
        : "Please use a real email address. Disposable addresses are not accepted."
      );
      return;
    }
    const localPart = emailTrim.split("@")[0];
    if ((localPart.match(/\./g) || []).length > 3) { setError("Please use a standard email address."); return; }
    if (emailTrim.includes("..") || emailTrim.includes(".@")) { setError("Please use a standard email address."); return; }
    if (isB2B && !company.trim()) { setError("Please enter your company or organisation name."); return; }

    setLoading(true);
    try {
      const meta = isB2B
        ? `${nameTrim}${company.trim() ? ` | ${company.trim()}` : ""}${website.trim() ? ` | ${website.trim()}` : ""}`
        : `${nameTrim}${gift ? ` | gift: ${gift}` : ""}`;
      await captureEmail(emailTrim, meta, page);
      localStorage.setItem(storageKey, "captured");
      setSubmitted(true);
      setTimeout(() => setVisible(false), 3200);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
        animation: "epFadeIn 0.4s ease-out",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <style>{`
        @keyframes epFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes epSlideIn { from { opacity: 0; transform: scale(0.92) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .ep-popup-card { animation: epSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .ep-popup-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(244,236,216,0.15); color: #F4ECD8; padding: 13px 16px; font-size: 13px; width: 100%; letter-spacing: 0.02em; outline: none; border-radius: 0; transition: border-color 0.2s; }
        .ep-popup-input::placeholder { color: rgba(244,236,216,0.35); }
        .ep-popup-input:focus { border-color: ${GOLD}; }
        .ep-popup-btn { background: ${GOLD}; color: #1A0A0E; border: none; padding: 14px 32px; font-size: 11px; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; cursor: pointer; width: 100%; transition: opacity 0.2s; }
        .ep-popup-btn:hover { opacity: 0.88; }
        .ep-popup-btn:disabled { opacity: 0.5; cursor: wait; }
      `}</style>

      <div className="ep-popup-card" style={{ background: BRAND, maxWidth: 440, width: "100%", position: "relative", borderTop: `3px solid ${GOLD}`, boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        <button
          onClick={dismiss}
          style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "rgba(244,236,216,0.4)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
          aria-label="Close"
        >×</button>

        <div style={{ padding: "48px 40px 40px" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 40, color: GOLD, marginBottom: 16 }}>✓</div>
              <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>
                {isB2B ? "You're on the list" : "You're in!"}
              </p>
              <p style={{ color: "rgba(244,236,216,0.7)", fontSize: 15, lineHeight: 1.7, fontWeight: 300 }}>
                {isB2B
                  ? "We'll be in touch with exclusive updates from Event Perfekt."
                  : gift
                    ? `Check your inbox for your ${gift}!`
                    : "Check your inbox for your welcome guide and exclusive updates."
                }
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: GOLD, fontSize: 9, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 14px", fontWeight: 600 }}>
                {isB2B ? "Stay in the room" : "I AM HER"}
              </p>
              <h2 style={{ color: "#F4ECD8", fontSize: 24, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                {headline || (isB2B ? "Get exclusive updates from Event Perfekt" : "Not ready to request your place? Leave your email and enter the draw.")}
              </h2>
              <p style={{ color: "rgba(244,236,216,0.5)", fontSize: 13, lineHeight: 1.65, margin: "0 0 32px", fontWeight: 300 }}>
                {subheadline || (isB2B
                  ? "Early access, private events, and insight — straight to your inbox. No noise."
                  : "One lucky woman on our list wins a complimentary invitation or a professional editorial portrait. The draw is live."
                )}
              </p>

              {offer && (
                <div style={{ background: "rgba(201,169,97,0.12)", border: `1px solid ${GOLD}`, borderRadius: 8, padding: "12px 16px", margin: "0 0 24px" }}>
                  <p style={{ color: GOLD, fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.5 }}>
                    {offer}
                  </p>
                </div>
              )}

              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  className="ep-popup-input"
                  placeholder={isB2B ? "Your full name *" : "Your name *"}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  disabled={loading}
                />
                <input
                  className="ep-popup-input"
                  type="email"
                  placeholder={isB2B ? "Your work email address * (no Gmail, Yahoo, Hotmail)" : "Your email address *"}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                {isB2B && (
                  <p style={{ color: "rgba(244,236,216,0.35)", fontSize: 11, margin: "-6px 0 0", lineHeight: 1.4 }}>
                    Please use your company email. Personal addresses are not accepted.
                  </p>
                )}
                {isB2B && (
                  <>
                    <input
                      className="ep-popup-input"
                      placeholder="Company or organisation name *"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <input
                      className="ep-popup-input"
                      placeholder="Website (if you have one)"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      disabled={loading}
                    />
                    <p style={{ color: "rgba(244,236,216,0.35)", fontSize: 11, margin: "-6px 0 0", lineHeight: 1.4 }}>
                      Enter your website URL so we can learn more about your business.
                    </p>
                  </>
                )}
                {error && <p style={{ color: "#f87171", fontSize: 12, margin: "4px 0 0", letterSpacing: "0.02em" }}>{error}</p>}
                <button className="ep-popup-btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? "Submitting…" : (cta || (isB2B ? "Join the Inner Circle" : "Enter my email"))}
                </button>
              </form>

              <p style={{ color: "rgba(244,236,216,0.25)", fontSize: 10, textAlign: "center", margin: "20px 0 0", letterSpacing: "0.06em" }}>
                No spam, ever. Unsubscribe any time.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
