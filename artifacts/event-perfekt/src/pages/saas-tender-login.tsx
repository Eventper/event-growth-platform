import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const API_BASE = "/api/saas-tender";

export default function SaasTenderLogin() {
  const [, setLocation] = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail("admin@eventperfekt.com");
    setPassword("Password12#");
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = isRegister ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
      const body = isRegister ? { name, email, password, companyName } : { email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      localStorage.setItem("saas_tender_token", data.token);
      localStorage.setItem("saas_tender_user", JSON.stringify(data.user));
      setLocation("/saas-tender-dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const existing = localStorage.getItem("saas_tender_token");
  if (existing) {
    setLocation("/saas-tender-dashboard");
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f1729 0%, #1a1f3a 50%, #0d1117 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, fontWeight: 800, color: "#fff" }}>T</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>Tender Command Centre</h1>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: "8px 0 0" }}>Agent-Powered Procurement Intelligence Platform</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32 }}>
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
            <button onClick={() => setIsRegister(false)} style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: !isRegister ? "#3b82f6" : "transparent", color: !isRegister ? "#fff" : "#94a3b8" }}>Sign In</button>
            <button onClick={() => setIsRegister(true)} style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: isRegister ? "#3b82f6" : "transparent", color: isRegister ? "#fff" : "#94a3b8" }}>Register</button>
          </div>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>YOUR NAME</label>
                <input value={name} onChange={e => setName(e.target.value)} required style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }} />
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>COMPANY NAME</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} required style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }} />
              </>
            )}
            <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }} />
            <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }} />
            {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px 0", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", color: "#475569", fontSize: 12, marginTop: 24 }}>Tender Command Centre &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
