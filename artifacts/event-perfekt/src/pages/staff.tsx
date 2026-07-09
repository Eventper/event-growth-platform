import { useEffect } from "react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import heroBg from "@assets/luxury-wedding-celebration-illuminated-by-chandelier-flame-generated-by-ai_1754251182698.jpg";

const PORTALS = [
  {
    icon: "📋",
    title: "Event Planning Platform",
    description:
      "Create and manage events, guests, vendors, budgets and contracts",
    buttonLabel: "Login to Planner",
    href: "/staff-login",
    color: "rgba(123,31,58,0.85)",
    border: "rgba(226,200,122,0.25)",
  },
  // GROUP_PORTAL_DISABLED — hosted on Twin Trade.
  {
    icon: "📄",
    title: "Tender Command Centre",
    description:
      "Find and bid on government and corporate tenders",
    buttonLabel: "Go to Tender Centre",
    href: "/saas-tender",
    color: "rgba(26,42,10,0.85)",
    border: "rgba(226,200,122,0.18)",
  },
  {
    icon: "🎓",
    title: "New Staff Onboarding",
    description:
      "Complete your onboarding and training modules",
    buttonLabel: "Start Onboarding",
    href: "/onboarding",
    color: "rgba(42,26,10,0.85)",
    border: "rgba(226,200,122,0.18)",
  },
];

export default function StaffPage() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${heroBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "'Poppins', 'Segoe UI', sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(51,3,17,0.93) 0%, rgba(26,10,14,0.88) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "3rem 1.25rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <img
            src={eventPerfektLogo}
            alt="Event Perfekt"
            style={{
              height: "64px",
              width: "auto",
              borderRadius: "12px",
              boxShadow: "0 6px 28px rgba(0,0,0,0.5)",
              marginBottom: "1.5rem",
              border: "2px solid rgba(255,255,255,0.2)",
            }}
          />
          <h1
            style={{
              color: "#E2C87A",
              fontSize: "2rem",
              fontWeight: 700,
              margin: "0 0 0.5rem",
              letterSpacing: "-0.01em",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            Event Perfekt Group — Staff Access
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "0.95rem",
              margin: 0,
            }}
          >
            Select your workspace below
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {PORTALS.map((p) => (
            <div
              key={p.title}
              style={{
                backgroundColor: p.color,
                border: `1px solid ${p.border}`,
                borderRadius: "14px",
                padding: "2rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                backdropFilter: "blur(8px)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}
            >
              <div
                style={{
                  fontSize: "2.6rem",
                  lineHeight: 1,
                  marginBottom: "1rem",
                }}
              >
                {p.icon}
              </div>
              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: "0.5rem",
                }}
              >
                {p.title}
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.55,
                  flexGrow: 1,
                  marginBottom: "1.5rem",
                }}
              >
                {p.description}
              </div>
              <a
                href={p.href}
                style={{
                  display: "inline-block",
                  backgroundColor: "rgba(226,200,122,0.12)",
                  border: "1px solid rgba(226,200,122,0.5)",
                  borderRadius: "8px",
                  padding: "0.6rem 1rem",
                  color: "#E2C87A",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  textAlign: "center",
                  transition: "background-color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(226,200,122,0.25)";
                  e.currentTarget.style.borderColor = "#E2C87A";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(226,200,122,0.12)";
                  e.currentTarget.style.borderColor =
                    "rgba(226,200,122,0.5)";
                }}
              >
                {p.buttonLabel} →
              </a>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <a
            href="/"
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
            ← Back to main site
          </a>
        </div>
      </div>
    </div>
  );
}
