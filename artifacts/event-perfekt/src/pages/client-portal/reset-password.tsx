import { useState } from "react";
import { useLocation } from "wouter";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

const BURGUNDY = "#3D0B0B";
const PANEL = "#521212";
const BORDER = "rgba(255,255,255,0.15)";
const INPUT_BG = "rgba(0,0,0,0.25)";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (!token) { setError("Invalid or missing reset token"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/client-portal/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reset failed");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: INPUT_BG, border: `1px solid ${BORDER}`,
    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#fff", fontFamily: "Poppins, sans-serif",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100vh", background: BURGUNDY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={logoPath} alt="Event Perfekt" style={{ height: 60, objectFit: "contain", marginBottom: 16 }} />
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Reset Password</h1>
        </div>

        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16, color: "#4ade80" }}>✓</div>
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Password Reset</h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24 }}>Your password has been updated successfully.</p>
              <button onClick={() => setLocation("/client-portal/login")} style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.15)", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                Sign In
              </button>
            </div>
          ) : !token ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#fca5a5", fontSize: 14 }}>Invalid or expired reset link.</p>
              <button onClick={() => setLocation("/client-portal/login")} style={{ marginTop: 16, padding: "10px 24px", background: "rgba(255,255,255,0.15)", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password" style={inputStyle} />
              </div>
              {error && (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.4)", borderRadius: 8, color: "#fca5a5", fontSize: 13 }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: loading ? "#6B3333" : "rgba(255,255,255,0.15)", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
