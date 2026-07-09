import { useState } from "react";
import { captureEmail } from "@/hooks/use-visitor-tracking";

const GOLD = "#C9A961";
const INK = "#330311";
const IVORY = "#F4ECD8";

interface InlineEmailCaptureProps {
  page: string;
  variant?: "hero" | "section" | "minimal" | "iamher";
  gift?: string;
  cta?: string;
}

export default function InlineEmailCapture({ page, variant = "section", gift, cta }: InlineEmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isB2B = variant !== "iamher";

  const DISPOSABLE_DOMAINS = new Set([
    "mailinator.com","tempmail.com","10minutemail.com","guerrillamail.com","throwaway.email","yopmail.com","dispostable.com",
    "getnada.com","sharklasers.com","fakeinbox.com","trashmail.com","maildrop.cc","mailnull.com","spamgourmet.com",
    "spamgourmet.net","spamgourmet.org","temp-mail.org","tempinbox.com","tempr.email","discard.email","gzeos.com"
  ]);

  const isValidEmail = (email: string) => {
    const domain = email.trim().split("@")[1]?.toLowerCase();
    if (!domain) return false;
    return !DISPOSABLE_DOMAINS.has(domain);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nameTrim = name.trim();
    const emailTrim = email.trim();
    if (!nameTrim) { setError("Please enter your name."); return; }
    if (!emailTrim) { setError("Please enter your email."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) { setError("Please enter a valid email."); return; }
    if (!isValidEmail(emailTrim)) { setError("Please use a real email address."); return; }
    const localPart = emailTrim.split("@")[0];
    if ((localPart.match(/\./g) || []).length > 3) { setError("Please use a standard email address."); return; }
    if (emailTrim.includes("..") || emailTrim.includes(".@")) { setError("Please use a standard email address."); return; }

    setLoading(true);
    try {
      await captureEmail(emailTrim, nameTrim, page);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "hero") {
    return (
      <div style={{ maxWidth: 520, width: "100%" }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ color: GOLD, fontSize: 14, margin: 0, fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>
              You are in the draw. We will be in touch.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.8)", margin: "0 0 12px", lineHeight: 1.5, fontWeight: 300 }}>
              {cta || "Not ready to request your place? Leave your email — you'll be entered to win a complimentary invitation or a professional editorial portrait."}
            </p>
            <form onSubmit={submit} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <input
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={loading}
                style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(244,236,216,0.2)",
                  color: IVORY, padding: "12px 16px", fontSize: 13, flex: "1 1 160px",
                  outline: "none", borderRadius: 0, fontFamily: "'Poppins', sans-serif",
                }}
              />
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(244,236,216,0.2)",
                  color: IVORY, padding: "12px 16px", fontSize: 13, flex: "1 1 200px",
                  outline: "none", borderRadius: 0, fontFamily: "'Poppins', sans-serif",
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: GOLD, color: INK, border: "none", padding: "12px 28px",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase",
                  cursor: loading ? "wait" : "pointer", borderRadius: 0, fontFamily: "'Poppins', sans-serif",
                  opacity: loading ? 0.6 : 1, transition: "opacity 0.2s",
                }}
              >
                {loading ? "..." : (cta || "Enter my email")}
              </button>
              {error && <p style={{ color: "#f87171", fontSize: 12, margin: "4px 0 0", width: "100%" }}>{error}</p>}
            </form>
          </div>
        )}
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div style={{ maxWidth: 400, width: "100%" }}>
        {submitted ? (
          <p style={{ color: GOLD, fontSize: 13, margin: 0, fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>
            You're on the inside. We'll be in touch.
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={loading}
              style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(244,236,216,0.2)",
                color: IVORY, padding: "10px 14px", fontSize: 12, flex: "1 1 140px",
                outline: "none", borderRadius: 0, fontFamily: "'Poppins', sans-serif",
              }}
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(244,236,216,0.2)",
                color: IVORY, padding: "10px 14px", fontSize: 12, flex: "1 1 180px",
                outline: "none", borderRadius: 0, fontFamily: "'Poppins', sans-serif",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "transparent", color: GOLD, border: `1px solid ${GOLD}`,
                padding: "10px 20px", fontSize: 10, fontWeight: 600,
                letterSpacing: "0.2em", textTransform: "uppercase", cursor: loading ? "wait" : "pointer",
                borderRadius: 0, fontFamily: "'Poppins', sans-serif",
              }}
            >
              {loading ? "..." : "Join"}
            </button>
            {error && <p style={{ color: "#f87171", fontSize: 11, margin: "4px 0 0", width: "100%" }}>{error}</p>}
          </form>
        )}
      </div>
    );
  }

  // Section variant (default)
  const isIamher = variant === "iamher";
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
      <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 10px", fontWeight: 500 }}>
        {isIamher ? "Enter the draw" : "Get the inside track"}
      </p>
      <p style={{ fontSize: 15, color: "rgba(244,236,216,0.75)", margin: "0 0 24px", lineHeight: 1.65, fontWeight: 300 }}>
        {isIamher
          ? "Not ready to request your place? Leave your email — you'll be entered to win a complimentary invitation or a professional editorial portrait."
          : "Be the first to know when new rooms open, partner events are announced, and insider Milton Keynes recommendations land."}
      </p>

      {submitted ? (
        <p style={{ color: GOLD, fontSize: 16, margin: 0, fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>
          You're on the inside. We'll be in touch.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
          <input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            disabled={loading}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(244,236,216,0.15)",
              color: IVORY, padding: "14px 18px", fontSize: 14, flex: "1 1 160px", minWidth: 0,
              outline: "none", borderRadius: 0, fontFamily: "'Poppins', sans-serif",
            }}
          />
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(244,236,216,0.15)",
              color: IVORY, padding: "14px 18px", fontSize: 14, flex: "1 1 200px", minWidth: 0,
              outline: "none", borderRadius: 0, fontFamily: "'Poppins', sans-serif",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: GOLD, color: INK, border: "none", padding: "14px 32px",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase",
              cursor: loading ? "wait" : "pointer", borderRadius: 0, fontFamily: "'Poppins', sans-serif",
              opacity: loading ? 0.6 : 1, transition: "opacity 0.2s",
            }}
          >
            {loading ? "Submitting..." : (cta || (isIamher ? "Enter my email" : "Join the Inner Circle"))}
          </button>
          {error && <p style={{ color: "#f87171", fontSize: 12, margin: "4px 0 0", width: "100%" }}>{error}</p>}
        </form>
      )}

      <p style={{ color: "rgba(244,236,216,0.25)", fontSize: 10, margin: "16px 0 0", letterSpacing: "0.06em" }}>
        {isIamher ? "No spam. Just the draw result or event updates." : "No spam. Just event updates, partner news, and insider content."}
      </p>
    </div>
  );
}
