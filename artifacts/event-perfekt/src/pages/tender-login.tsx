import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

export default function TenderLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regPhone, setRegPhone] = useState("");

  const C = {
    bg: "#1A0A0E", panel: "#2A1018", border: "#4A2030",
    gold: "#ffffff", goldLight: "#E2C87A", text: "#FAF0F2", muted: "#9A7A82",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0A0F1A", border: `1px solid ${C.border}`,
    color: C.text, padding: "11px 14px", borderRadius: "2px",
    fontFamily: "Poppins, sans-serif", fontSize: "0.88rem", marginTop: "6px", boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em",
    textTransform: "uppercase", color: C.muted, fontFamily: "Poppins, sans-serif",
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);
    localStorage.removeItem("tender_token");
    localStorage.removeItem("tender_user");
    try {
      const res = await fetch("/api/tender-auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || "Login failed";
        setLoginError(msg);
        throw new Error(msg);
      }
      localStorage.setItem("tender_token", data.token);
      localStorage.setItem("tender_user", JSON.stringify(data.user));
      toast({ title: "Welcome back", description: `Signed in as ${data.user.name}` });
      setLocation("/tender-dashboard");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) { toast({ title: "Required", description: "Name, email, and password are required", variant: "destructive" }); return; }
    if (regPassword.length < 8) { toast({ title: "Weak Password", description: "Password must be at least 8 characters", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/tender-auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, company: regCompany, phone: regPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      localStorage.setItem("tender_token", data.token);
      localStorage.setItem("tender_user", JSON.stringify(data.user));
      toast({ title: "Account Created", description: "Welcome to Tender Manager" });
      setLocation("/tender-dashboard");
    } catch (err: any) {
      toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Poppins, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Barlow+Condensed:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src={logoPath} alt="Event Perfekt" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", margin: "0 auto 12px", display: "block", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }} />
          <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "0.08em" }}>
            EVENT <span style={{ color: C.gold }}>PERFEKT</span> GLOBAL
          </div>
          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.6rem", fontWeight: 700, marginTop: "4px" }}>
            Tender <em style={{ color: C.gold }}>Manager</em>
          </div>
          <p style={{ color: C.muted, fontSize: "0.85rem", marginTop: "6px" }}>Procurement & bid management platform</p>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "28px", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "9px 0", background: tab === t ? C.gold + "22" : "transparent",
                border: tab === t ? `1px solid ${C.gold}44` : `1px solid ${C.border}`,
                color: tab === t ? C.gold : C.muted, borderRadius: "2px", cursor: "pointer",
                fontFamily: "Poppins, sans-serif", fontSize: "0.75rem",
                fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              }}>{t === "login" ? "Sign In" : "Create Account"}</button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={inputStyle} placeholder="your@email.com" required />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={inputStyle} placeholder="Enter password" required />
              </div>
              {loginError && (
                <div style={{ background: "#3A1020", border: "1px solid #EF4444", borderRadius: "2px", padding: "10px 14px", marginBottom: "16px", fontSize: "0.82rem", color: "#EF4444" }}>
                  {loginError}
                </div>
              )}
              <button type="submit" disabled={isLoading} style={{
                width: "100%", padding: "12px", background: C.gold, color: "#0A0F1A",
                border: "none", borderRadius: "2px", fontFamily: "Poppins, sans-serif",
                fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                {isLoading && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />} Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Full Name *</label>
                <input value={regName} onChange={e => setRegName(e.target.value)} style={inputStyle} placeholder="Your full name" required />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={inputStyle} placeholder="your@email.com" required />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Password *</label>
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={inputStyle} placeholder="Min. 8 characters" required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                <div>
                  <label style={labelStyle}>Company</label>
                  <input value={regCompany} onChange={e => setRegCompany(e.target.value)} style={inputStyle} placeholder="Company" />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={regPhone} onChange={e => setRegPhone(e.target.value)} style={inputStyle} placeholder="Phone" />
                </div>
              </div>
              <button type="submit" disabled={isLoading} style={{
                width: "100%", padding: "12px", background: C.gold, color: "#0A0F1A",
                border: "none", borderRadius: "2px", fontFamily: "Poppins, sans-serif",
                fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                {isLoading && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />} Create Account
              </button>
              <p style={{ textAlign: "center", color: C.muted, fontSize: "0.72rem", marginTop: "12px" }}>
                By creating an account, you agree to our{" "}
                <a href="/terms-of-service" target="_blank" style={{ color: C.gold }}>Terms</a> and{" "}
                <a href="/privacy-policy" target="_blank" style={{ color: C.gold }}>Privacy Policy</a>
              </p>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", color: C.muted, fontSize: "0.72rem", marginTop: "20px" }}>
          <a href="/" style={{ color: C.muted, textDecoration: "none" }}>Event Perfekt</a> — ...making yours perfekt
        </p>
      </div>
    </div>
  );
}
