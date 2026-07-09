import { useState } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { clearPortalSession, savePortalSession } from "@/lib/client-portal-auth";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";
import CookieBanner, { PolicyLinks } from "@/components/client-portal/CookieBanner";

const BURGUNDY = "#3D0B0B";
const GOLD     = "#C9A84C";

type Mode = "login" | "register";

export default function ClientPortalLogin() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");

  // Login state
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  // Register state
  const [regFullName,     setRegFullName]     = useState("");
  const [regEmail,        setRegEmail]        = useState("");
  const [regOrg,          setRegOrg]          = useState("");
  const [regPassword,     setRegPassword]     = useState("");
  const [regConfirm,      setRegConfirm]      = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMode, setForgotMode] = useState(false);

  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearPortalSession();
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch("/api/client-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : { message: await res.text() };
      if (!res.ok) throw new Error(data.message || "Login failed");
      if (!data.token || !data.user) throw new Error("Login succeeded but no session was returned.");
      savePortalSession(data.token, data.user);
      setLocation("/client-portal/home");
    } catch (err: any) {
      setError(err?.message || "Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); 
    if (regPassword !== regConfirm) { setError("Passwords do not match."); return; }
    if (regPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/client-portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: regFullName, email: regEmail, organisation: regOrg, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      savePortalSession(data.token, data.user);
      setLocation("/client-portal/home");
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!forgotEmail.trim()) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/client-portal/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setSuccess(data.message || "If an account exists with this email, a reset link has been sent.");
      setForgotMode(false);
    } catch (err: any) {
      setError(err?.message || "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 8, fontSize: 14, outline: "none",
    boxSizing: "border-box", color: "#fff",
    fontFamily: "Poppins, sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    color: "rgba(255,255,255,0.7)", textTransform: "uppercase",
    letterSpacing: "0.07em", marginBottom: 7,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: BURGUNDY,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo + brand */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <img
            src={logoPath}
            alt="Event Perfekt"
            style={{ height: 72, objectFit: "contain", marginBottom: 14, borderRadius: 8 }}
          />
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            Client Project Portal
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, margin: "0 0 10px" }}>
            ...making yours perfekt
          </p>
          <a
            href="https://www.eventperfekt.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: GOLD, fontSize: 12, fontWeight: 600, textDecoration: "none", letterSpacing: "0.02em", opacity: 0.9 }}
          >
            www.eventperfekt.com ↗
          </a>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 16,
          padding: "36px 32px",
          backdropFilter: "blur(8px)",
        }}>

          {/* Tab toggle */}
          <div style={{ display: "flex", marginBottom: 28, background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: 4 }}>
            {(["login", "register"] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: "9px 0",
                  background: mode === m ? GOLD : "transparent",
                  color: mode === m ? "#1a0a0e" : "rgba(255,255,255,0.6)",
                  border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer", transition: "all 0.2s",
                  fontFamily: "Poppins, sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              background: "rgba(255,80,80,0.18)",
              border: "1px solid rgba(255,100,100,0.4)",
              color: "#fca5a5",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: "rgba(80,200,120,0.18)",
              border: "1px solid rgba(80,200,120,0.4)",
              color: "#86efac",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 20,
            }}>
              {success}
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === "login" && !forgotMode && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "12px 0",
                  background: GOLD, color: "#1a0a0e",
                  border: "none", borderRadius: 8,
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  marginTop: 4, opacity: loading ? 0.7 : 1,
                  letterSpacing: "0.02em", fontFamily: "Poppins, sans-serif",
                }}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
              <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                Forgot your password?{" "}
                <button type="button" onClick={() => setForgotMode(true)} style={{ background: "none", border: "none", color: GOLD, fontWeight: 600, textDecoration: "none", cursor: "pointer", padding: 0, fontFamily: "Poppins, sans-serif" }}>
                  Reset it here
                </button>
              </div>
            </form>
          )}

          {mode === "login" && forgotMode && (
            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px 0", background: GOLD, color: "#1a0a0e", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, letterSpacing: "0.02em", fontFamily: "Poppins, sans-serif" }}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button type="button" onClick={() => setForgotMode(false)} style={{ background: "none", border: "none", color: GOLD, fontWeight: 600, cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
                Back to Sign In
              </button>
              <button type="button" onClick={() => setLocation("/client-portal/reset-password")} style={{ background: "none", border: "none", color: GOLD, fontWeight: 600, cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
                I already have a reset link
              </button>
            </form>
          )}

          {/* CREATE ACCOUNT FORM */}
          {mode === "register" && (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={e => setRegFullName(e.target.value)}
                  required
                  placeholder="Your full name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Organisation <span style={{ fontWeight: 400, textTransform: "none", opacity: 0.6 }}>(optional)</span></label>
                <input
                  type="text"
                  value={regOrg}
                  onChange={e => setRegOrg(e.target.value)}
                  placeholder="Your company or organisation"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                  placeholder="Min. 8 characters"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Confirm password</label>
                <input
                  type="password"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  style={inputStyle}
                />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, textAlign: "center" }}>
                By creating an account you agree to our{" "}
                <span style={{ color: GOLD, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => {/* PolicyLinks handles this */}}>
                  Privacy Policy
                </span>{" "}and{" "}
                <span style={{ color: GOLD, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                  Terms of Use
                </span>.
                Your data is processed in accordance with UK GDPR.
              </p>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "12px 0",
                  background: GOLD, color: "#1a0a0e",
                  border: "none", borderRadius: 8,
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  marginTop: 4, opacity: loading ? 0.7 : 1,
                  letterSpacing: "0.02em", fontFamily: "Poppins, sans-serif",
                }}
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
              <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  style={{ background: "none", border: "none", color: GOLD, fontWeight: 600, fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "Poppins, sans-serif" }}
                >
                  Sign in here
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.8 }}>
          Secure client portal — Event Perfekt Global Ltd<br />
          20 Wenlock Road, London, N1 7PG
          <div style={{ marginTop: 10 }}>
            <PolicyLinks light />
          </div>
        </div>
      </div>
      <CookieBanner />
    </div>
  );
}
