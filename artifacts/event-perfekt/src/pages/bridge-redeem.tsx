import { useEffect, useState } from "react";
import { useSearch } from "wouter";

const B = "#330311";
const MID = "#8B1538";
const GOLD = "#C9A84C";

// Maps target_tool slug to a human-readable tool name for the loading screen
function toolLabel(targetTool: string | null): string {
  if (!targetTool) return "Event Tools";
  const t = targetTool.toLowerCase();
  if (t.includes("tender")) return "Tender Centre";
  if (t.includes("prospect")) return "Prospect Finder";
  if (t.includes("decor") || t.includes("inventory")) return "Decor Inventory";
  if (t.includes("run-sheet") || t.includes("runsheet") || t.includes("event-day")) return "Run Sheet";
  if (t.includes("guest")) return "Guest Management";
  if (t.includes("invoic") || t.includes("finance")) return "Invoicing";
  if (t.includes("onboarding") || t.includes("training")) return "Training Portal";
  if (t.includes("raid") || t.includes("risk-register")) return "RAID Register";
  if (t.includes("research")) return "Research";
  if (t.includes("budget")) return "Budget";
  if (t.includes("uk-dashboard")) return "UK Dashboard";
  if (t.includes("nigeria-dashboard")) return "Nigeria Dashboard";
  if (t.includes("event")) return "Event Management";
  return "Event Tools";
}

export default function BridgeRedeem() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";
  const hintTool = params.get("tool") || null; // optional hint from GP tile URL

  const [status, setStatus] = useState<"loading" | "ok" | "expired" | "error">("loading");
  const [message, setMessage] = useState("");
  const [resolvedTool, setResolvedTool] = useState<string | null>(hintTool);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No bridge token found in the URL.");
      return;
    }
    fetch("/api/bridge/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          if (data.target_tool) setResolvedTool(data.target_tool);
          // Store the Planning App session so auth-gated tools work immediately
          if (data.session_token) {
            localStorage.setItem("token", data.session_token);
            localStorage.setItem("staff_token", data.session_token);
          }
          // Store the user object so useAuth() / the whole app knows who is logged in
          if (data.session_user) {
            localStorage.setItem("user", JSON.stringify(data.session_user));
            localStorage.setItem("staff_user", JSON.stringify(data.session_user));
          }
          window.location.replace(data.landing);
        } else if (data.expired) {
          setStatus("expired");
          setMessage("Your session link has expired (15 minutes).");
        } else {
          setStatus("error");
          setMessage(data.message || "Invalid bridge token.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not connect to the server. Please try again.");
      });
  }, [token]);

  const goBack = () => {
    window.location.replace("/planner-dashboard");
  };

  const label = toolLabel(resolvedTool);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: B,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#2A1018",
          border: "1px solid #4A2030",
          borderRadius: "16px",
          padding: "2.5rem 3rem",
          maxWidth: "440px",
          width: "90%",
          textAlign: "center",
          color: "#fff",
        }}
      >
        {status === "loading" && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔗</div>
            <h2 style={{ color: GOLD, fontSize: "1.25rem", marginBottom: "0.5rem" }}>
              Launching {label}…
            </h2>
            <p style={{ color: "#aaa", fontSize: "0.9rem" }}>
              Verifying your access — please wait.
            </p>
          </>
        )}
        {(status === "expired" || status === "error") && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
              {status === "expired" ? "⏱️" : "⚠️"}
            </div>
            <h2 style={{ color: MID, fontSize: "1.25rem", marginBottom: "0.75rem" }}>
              {status === "expired" ? "Session Link Expired" : "Access Error"}
            </h2>
            <p style={{ color: "#ccc", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: "1.6" }}>
              {message}
            </p>
            <p style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: "1.75rem" }}>
              Click the <strong>{label}</strong> tile on the Group Portal home to get a fresh link.
              Each link is valid for 15 minutes and can only be used once.
            </p>
            <button
              onClick={goBack}
              style={{
                backgroundColor: GOLD,
                color: B,
                border: "none",
                borderRadius: "8px",
                padding: "0.7rem 1.75rem",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Back to Group Portal
            </button>
          </>
        )}
      </div>
    </div>
  );
}
