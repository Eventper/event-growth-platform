import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { getPortalToken, getPortalUser, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";

const BURGUNDY = "#3D0B0B";
const BORDER = "#e5e7eb";

const FILTERS = ["All", "Sent to you", "Sent on your behalf", "Received from you"];

type Email = {
  id: number;
  direction: string;
  from_email: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  body: string;
  sent_at: string;
  opened_at: string | null;
  replied_at: string | null;
  status: string;
  category: string;
};

function StatusPill({ status, opened, replied }: { status: string; opened: string | null; replied: string | null }) {
  if (replied) return <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Replied</span>;
  if (opened) return <span style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Opened</span>;
  return <span style={{ background: "#f9fafb", color: "#000", border: `1px solid ${BORDER}`, padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "capitalize" }}>{status}</span>;
}

export default function ClientPortalEmails() {
  const [, setLocation] = useLocation();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<number | null>(null);
  const user = getPortalUser();
  const myEmail = (user?.email || "").toLowerCase();

  useEffect(() => {
    if (!getPortalToken()) { setLocation("/client-portal/login"); return; }
    portalFetch("GET", "/api/client-portal/emails")
      .then(d => setEmails(Array.isArray(d) ? d : []))
      .catch((e: any) => { if (e.message?.includes("401")) { clearPortalSession(); setLocation("/client-portal/login"); } })
      .finally(() => setLoading(false));
  }, []);

  const filtered = emails.filter(e => {
    if (filter === "All") return true;
    if (filter === "Sent to you") return (e.to_email || "").toLowerCase() === myEmail && e.direction === "outbound";
    if (filter === "Sent on your behalf") return e.direction === "outbound" && (e.to_email || "").toLowerCase() !== myEmail;
    if (filter === "Received from you") return e.direction === "inbound";
    return true;
  });

  function directionBadge(e: Email) {
    if (e.direction === "inbound") return <span style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>From You</span>;
    if ((e.to_email || "").toLowerCase() === myEmail) return <span style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>To You</span>;
    return <span style={{ background: "#f5f3ff", color: "#5b21b6", border: "1px solid #ddd6fe", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>On Your Behalf</span>;
  }

  if (loading) return <PortalLayout><div style={{ textAlign: "center", padding: 60, color: "#fff" }}>Loading…</div></PortalLayout>;

  return (
    <PortalLayout>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, marginBottom: 4 }}>Email Correspondence</h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>All communications between {user?.organisation || "you"} and Event Perfekt Global Ltd</p>
      </div>

      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#0369a1", marginBottom: 20 }}>
        ℹ This log shows all direct communications. Internal Event Perfekt communications are not shown.
      </div>

      <div className="ep-portal-nav" style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: `1px solid ${BORDER}`, overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "10px 16px", background: "transparent", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            color: filter === f ? "#C9A84C" : "rgba(255,255,255,0.6)",
            borderBottom: filter === f ? "2px solid #C9A84C" : "2px solid transparent",
            whiteSpace: "nowrap",
          }}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#000" }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>✉</div>
          <div style={{ fontSize: 14 }}>No emails in this category</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(e => (
            <div key={e.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
              <div onClick={() => setExpanded(expanded === e.id ? null : e.id)} style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", flexWrap: "wrap" }}>
                <div style={{ minWidth: 90 }}>{directionBadge(e)}</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: "#000", fontSize: 13, marginBottom: 4 }}>{e.subject || "(no subject)"}</div>
                  <div style={{ fontSize: 11, color: "#000" }}>
                    {e.direction === "inbound" ? `From: ${e.from_email}` : `To: ${e.to_name || e.to_email}`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#000", marginBottom: 4 }}>
                    {new Date(e.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <StatusPill status={e.status} opened={e.opened_at} replied={e.replied_at} />
                </div>
              </div>
              {expanded === e.id && (
                <div style={{ padding: "16px 18px", borderTop: `1px solid ${BORDER}`, background: "#f9fafb", whiteSpace: "pre-wrap", fontSize: 13, color: "#000", lineHeight: 1.6 }}>
                  {e.body}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
