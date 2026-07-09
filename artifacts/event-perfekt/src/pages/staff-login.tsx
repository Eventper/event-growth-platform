import { useState } from "react";
import { useLocation } from "wouter";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import heroBg from "@assets/luxury-wedding-celebration-illuminated-by-chandelier-flame-generated-by-ai_1754251182698.jpg";

export default function StaffLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Invalid email or password.");
        setLoading(false);
        return;
      }
      if (!data.token) {
        setError("Login failed — no token returned.");
        setLoading(false);
        return;
      }
      localStorage.setItem("staff_token", data.token);
      localStorage.setItem("staff_user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setLocation("/planner-dashboard");
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${heroBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Poppins', 'Segoe UI', sans-serif",
        padding: "1rem",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(51,3,17,0.94) 0%, rgba(26,10,14,0.9) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "rgba(42,16,24,0.85)",
          border: "1px solid rgba(226,200,122,0.2)",
          borderRadius: "16px",
          padding: "2.5rem 2rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src={eventPerfektLogo}
            alt="Event Perfekt"
            style={{
              height: "64px",
              width: "auto",
              borderRadius: "10px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              marginBottom: "1.25rem",
              border: "2px solid rgba(255,255,255,0.15)",
            }}
          />
          <h1
            style={{
              color: "#E2C87A",
              fontSize: "1.35rem",
              fontWeight: 700,
              margin: "0 0 0.35rem",
            }}
          >
            Staff Login
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", margin: 0 }}>
            Event Perfekt Group — Planner Platform
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.65)",
                fontSize: "0.78rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              placeholder="you@eventperfekt.com"
              style={{
                width: "100%",
                backgroundColor: "rgba(51,3,17,0.6)",
                border: "1px solid rgba(226,200,122,0.2)",
                borderRadius: "8px",
                padding: "0.7rem 0.9rem",
                color: "#fff",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(226,200,122,0.7)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(226,200,122,0.2)")
              }
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.65)",
                fontSize: "0.78rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: "100%",
                backgroundColor: "rgba(51,3,17,0.6)",
                border: "1px solid rgba(226,200,122,0.2)",
                borderRadius: "8px",
                padding: "0.7rem 0.9rem",
                color: "#fff",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(226,200,122,0.7)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(226,200,122,0.2)")
              }
            />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "rgba(220,53,69,0.15)",
                border: "1px solid rgba(220,53,69,0.35)",
                borderRadius: "8px",
                padding: "0.65rem 0.9rem",
                color: "#ff9a9a",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: loading
                ? "rgba(123,31,58,0.5)"
                : "#7B1F3A",
              border: "1px solid rgba(226,200,122,0.25)",
              borderRadius: "8px",
              padding: "0.8rem",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.04em",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                e.currentTarget.style.backgroundColor = "#9B2F4A";
            }}
            onMouseLeave={(e) => {
              if (!loading)
                e.currentTarget.style.backgroundColor = "#7B1F3A";
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.75rem" }}>
          <a
            href="/staff"
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "0.8rem",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "#E2C87A")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
            }
          >
            ← Back to Portal Directory
          </a>
        </div>
      </div>
    </div>
  );
}
