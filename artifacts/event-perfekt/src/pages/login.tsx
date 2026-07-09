import { useState } from "react";
import { useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function LoginPage() {
  usePageMeta({ title: "Login — Event Perfekt" });

  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Sending login request...");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setStatus("Error: " + (data.message || res.statusText));
        setIsLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setStatus("Login successful! Redirecting...");
        setTimeout(() => {
          window.location.href = "/get-started";
        }, 500);
      } else {
        setStatus("No token received from server");
        setIsLoading(false);
      }
    } catch (err: any) {
      setStatus("Network error: " + err.message);
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Creating account...");
    setIsLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const regEmail = formData.get("email") as string;
    const regPassword = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const country = formData.get("country") as string;

    if (regPassword !== confirmPassword) {
      setStatus("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: regEmail, password: regPassword, country }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("Error: " + (data.message || res.statusText));
        setIsLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setStatus("Account created! Redirecting...");
        setTimeout(() => {
          window.location.href = "/get-started";
        }, 500);
      } else {
        setStatus("No token received from server");
        setIsLoading(false);
      }
    } catch (err: any) {
      setStatus("Network error: " + err.message);
      setIsLoading(false);
    }
  };

  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div style={{ minHeight: "100vh", background: "#330311", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "white", marginBottom: "8px" }}>Event Perfekt</h1>
          <p style={{ color: "#ccc" }}>Plan Your Perfekt Event</p>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
            <button
              type="button"
              onClick={() => setTab("login")}
              style={{
                flex: 1, padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
                background: tab === "login" ? "#330311" : "#f3f4f6",
                color: tab === "login" ? "white" : "#333"
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              style={{
                flex: 1, padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
                background: tab === "register" ? "#330311" : "#f3f4f6",
                color: tab === "register" ? "white" : "#333"
              }}
            >
              Create Account
            </button>
          </div>

          {status && (
            <div style={{
              padding: "10px", marginBottom: "16px", borderRadius: "6px", fontSize: "14px",
              background: status.includes("Error") || status.includes("error") || status.includes("not match") ? "#fee2e2" : "#dcfce7",
              color: status.includes("Error") || status.includes("error") || status.includes("not match") ? "#991b1b" : "#166534"
            }}>
              {status}
            </div>
          )}

          {tab === "login" && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%", padding: "12px", border: "none", borderRadius: "6px", cursor: isLoading ? "not-allowed" : "pointer",
                  background: isLoading ? "#666" : "#330311", color: "white", fontWeight: "bold", fontSize: "16px"
                }}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>
          )}

          {tab === "register" && (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>Full Name</label>
                <input name="name" type="text" required style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>Email Address</label>
                <input name="email" type="email" required style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>Country</label>
                <input name="country" type="text" required style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>Password</label>
                <input name="password" type="password" required style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" }}>Confirm Password</label>
                <input name="confirmPassword" type="password" required style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%", padding: "12px", border: "none", borderRadius: "6px", cursor: isLoading ? "not-allowed" : "pointer",
                  background: isLoading ? "#666" : "#330311", color: "white", fontWeight: "bold", fontSize: "16px"
                }}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <a href="/" style={{ color: "#ccc", fontSize: "14px", textDecoration: "none" }}>← Back to Home</a>
        </div>
      </div>
    </div>
  );
}