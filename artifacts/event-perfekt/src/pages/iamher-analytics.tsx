import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";
const BURG = "#330311";

const BASE = "https://eventperfekt.net";

const CHANNELS = [
  { label: "Shujo's Instagram",  utm: "utm_source=instagram&utm_medium=social&utm_campaign=iamher2026&utm_content=shujo",   icon: "📸", color: "#E1306C" },
  { label: "EP Instagram",        utm: "utm_source=instagram&utm_medium=social&utm_campaign=iamher2026&utm_content=ep",      icon: "📸", color: "#E1306C" },
  { label: "LinkedIn",            utm: "utm_source=linkedin&utm_medium=social&utm_campaign=iamher2026",                      icon: "💼", color: "#0A66C2" },
  { label: "Facebook",            utm: "utm_source=facebook&utm_medium=social&utm_campaign=iamher2026",                      icon: "👥", color: "#1877F2" },
  { label: "Email Campaign",      utm: "utm_source=email&utm_medium=email&utm_campaign=iamher2026",                          icon: "✉️", color: GOLD },
  { label: "WhatsApp",            utm: "utm_source=whatsapp&utm_medium=social&utm_campaign=iamher2026",                      icon: "💬", color: "#25D366" },
  { label: "MKFM Article",        utm: "utm_source=mkfm&utm_medium=press&utm_campaign=iamher2026",                             icon: "📰", color: "#C9A961" },
];

function copyToClipboard(text: string, setCopied: (k: string) => void, key: string) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  });
}

type VisitorRow = { source: string; medium: string; content: string; visits: string };
type RegRow = { source: string; medium: string; content: string; registrations: string; paid: string; complimentary: string };

function sourceLabel(row: { source: string; medium: string; content: string }) {
  if (row.source === "direct") return "Direct / Unknown";
  let label = row.source;
  if (row.content) label += ` · ${row.content}`;
  if (row.medium && row.medium !== "social") label += ` (${row.medium})`;
  return label;
}

export default function IAmHerAnalytics() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "I Am Her Analytics · Campaign Tracking Dashboard",
    description: "Track I Am Her campaign performance across channels: social media, press, email, and partnerships. Monitor registrations, visits, and attribution.",
    url: "https://eventperfekt.net/iamher/analytics",
    image: "https://eventperfekt.net/assets/iamher-hero-home.png",
    imageAlt: "I Am Her Analytics Dashboard — Campaign performance tracking",
    noIndex: true,
  });
  const [copied, setCopied] = useState("");
  const [isInternal, setIsInternal] = useState(() => !!localStorage.getItem("ep_internal"));

  function toggleInternal() {
    if (isInternal) {
      localStorage.removeItem("ep_internal");
      setIsInternal(false);
    } else {
      localStorage.setItem("ep_internal", "1");
      setIsInternal(true);
    }
  }

  const { data, isLoading } = useQuery<{ visitors: VisitorRow[]; registrations: RegRow[] }>({
    queryKey: ["/api/event-august/source-analytics"],
    refetchInterval: 30000,
  });

  const visitors = data?.visitors || [];
  const regs = data?.registrations || [];
  const totalVisits = visitors.reduce((s, r) => s + parseInt(r.visits || "0"), 0);
  const totalRegs = regs.reduce((s, r) => s + parseInt(r.registrations || "0"), 0);

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif", padding: "40px 28px 80px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .an-card { background: #330311; border: 1px solid rgba(201,169,97,0.12); padding: 24px 28px; }
        .an-row:hover { background: rgba(201,169,97,0.08); }
        .copy-btn { background: transparent; border: 1px solid rgba(201,169,97,0.95); color: ${GOLD}; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; padding: 6px 14px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .copy-btn:hover { background: rgba(201,169,97,0.08); }
        @media(max-width:600px){ .an-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <a href="/admin/iamher" style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", textDecoration: "none", letterSpacing: "0.18em", textTransform: "uppercase", display: "inline-block", marginBottom: 32 }}>
          ← Admin
        </a>

        <p style={{ color: GOLD, fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", margin: "0 0 8px" }}>I Am Her · Traffic</p>
        <h1 style={{ fontSize: 26, fontWeight: 300, color: IVORY, margin: "0 0 20px" }}>Source Analytics</h1>

        {/* Internal device toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 36, padding: "14px 20px", border: `1px solid ${isInternal ? "rgba(201,169,97,0.60)" : "rgba(244,236,216,0.95)"}`, background: isInternal ? "rgba(201,169,97,0.95)" : "transparent" }}>
          <div>
            <p style={{ fontSize: 12, color: isInternal ? GOLD : "rgba(244,236,216,0.70)", margin: "0 0 3px", fontWeight: 500 }}>
              {isInternal ? "This device is excluded from tracking" : "This device is being tracked"}
            </p>
            <p style={{ fontSize: 11, color: "rgba(244,236,216,0.65)", margin: 0, lineHeight: 1.6 }}>
              {isInternal
                ? "Your visits from this browser will not appear in the counts above. EP staff and anyone logged into the planner system are automatically excluded."
                : "Mark this device as internal if you or a team member uses this browser to test or review the site."}
            </p>
          </div>
          <button
            onClick={toggleInternal}
            style={{ flexShrink: 0, padding: "9px 20px", background: "transparent", border: `1px solid ${isInternal ? "rgba(201,169,97,0.35)" : "rgba(244,236,216,0.30)"}`, color: isInternal ? GOLD : "rgba(244,236,216,0.95)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "all 0.2s", whiteSpace: "nowrap" }}
          >
            {isInternal ? "Remove Exclusion" : "Exclude This Device"}
          </button>
        </div>

        {/* Summary stats */}
        <div className="an-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Total Visitors", value: isLoading ? "—" : totalVisits.toLocaleString() },
            { label: "Total Registrations", value: isLoading ? "—" : totalRegs.toLocaleString() },
            { label: "Conversion Rate", value: isLoading ? "—" : totalVisits > 0 ? `${((totalRegs / totalVisits) * 100).toFixed(1)}%` : "—" },
          ].map(s => (
            <div key={s.label} className="an-card">
              <p style={{ fontSize: 10, color: "rgba(201,169,97,0.95)", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 8px" }}>{s.label}</p>
              <p style={{ fontSize: 28, fontWeight: 300, color: IVORY, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* UTM Links */}
        <div className="an-card" style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.28em", textTransform: "uppercase", margin: "0 0 20px" }}>Your Tracked Links — Copy &amp; Share</p>
          <p style={{ fontSize: 12, color: "rgba(244,236,216,0.75)", margin: "0 0 24px", lineHeight: 1.6 }}>
            Use the right link for each platform. Every click will be tracked separately so you can see exactly where your guests are coming from.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {CHANNELS.map(ch => {
              const url = `${BASE}/iamher?${ch.utm}`;
              const isCopied = copied === ch.label;
              return (
                <div key={ch.label} className="an-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid rgba(244,236,216,0.08)" }}>
                  <div>
                    <p style={{ fontSize: 12, color: IVORY, margin: "0 0 4px", fontWeight: 500 }}>{ch.label}</p>
                    <p style={{ fontSize: 10, color: "rgba(244,236,216,0.65)", margin: 0, fontFamily: "Poppins, sans-serif", wordBreak: "break-all" }}>{url}</p>
                  </div>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(url, setCopied, ch.label)}
                    style={{ whiteSpace: "nowrap", color: isCopied ? "#a8d5a2" : GOLD, borderColor: isCopied ? "rgba(168,213,162,0.4)" : "rgba(201,169,97,0.95)" }}
                  >
                    {isCopied ? "Copied ✓" : "Copy Link"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visitors by source */}
        <div className="an-card" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.28em", textTransform: "uppercase", margin: "0 0 20px" }}>Visitors by Source</p>
          {isLoading ? (
            <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)" }}>Loading…</p>
          ) : visitors.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.95)", margin: 0 }}>No visitor data yet. Share your tracked links to start seeing results.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Source", "Visits", "Share"].map(h => (
                    <th key={h} style={{ fontSize: 9, color: "rgba(201,169,97,0.95)", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "left", padding: "0 0 12px", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitors.map((r, i) => {
                  const visits = parseInt(r.visits || "0");
                  const pct = totalVisits > 0 ? (visits / totalVisits) * 100 : 0;
                  return (
                    <tr key={i} className="an-row">
                      <td style={{ padding: "10px 0", fontSize: 13, color: IVORY, borderBottom: "1px solid rgba(244,236,216,0.08)" }}>{sourceLabel(r)}</td>
                      <td style={{ padding: "10px 0", fontSize: 13, color: IVORY, borderBottom: "1px solid rgba(244,236,216,0.08)" }}>{visits.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px 10px 0", borderBottom: "1px solid rgba(244,236,216,0.08)" }}>
                        <div style={{ height: 4, background: "rgba(244,236,216,0.95)", borderRadius: 2, width: "100%", minWidth: 80 }}>
                          <div style={{ height: "100%", background: GOLD, borderRadius: 2, width: `${pct}%`, opacity: 0.7 }} />
                        </div>
                        <span style={{ fontSize: 10, color: "rgba(201,169,97,0.95)" }}>{pct.toFixed(0)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Registrations by source */}
        <div className="an-card">
          <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.28em", textTransform: "uppercase", margin: "0 0 20px" }}>Registrations by Source</p>
          {isLoading ? (
            <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)" }}>Loading…</p>
          ) : regs.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(244,236,216,0.95)", margin: 0 }}>No registrations yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Source", "Total", "Paid", "Complimentary"].map(h => (
                    <th key={h} style={{ fontSize: 9, color: "rgba(201,169,97,0.95)", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "left", padding: "0 0 12px", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regs.map((r, i) => (
                  <tr key={i} className="an-row">
                    <td style={{ padding: "10px 0", fontSize: 13, color: IVORY, borderBottom: "1px solid rgba(244,236,216,0.08)" }}>{sourceLabel(r)}</td>
                    <td style={{ padding: "10px 0", fontSize: 13, color: IVORY, borderBottom: "1px solid rgba(244,236,216,0.08)", fontWeight: 500 }}>{r.registrations}</td>
                    <td style={{ padding: "10px 0", fontSize: 13, color: GOLD, borderBottom: "1px solid rgba(244,236,216,0.08)" }}>{r.paid}</td>
                    <td style={{ padding: "10px 0", fontSize: 13, color: "rgba(244,236,216,0.85)", borderBottom: "1px solid rgba(244,236,216,0.08)" }}>{r.complimentary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", textAlign: "center", marginTop: 40, letterSpacing: "0.1em" }}>
          Refreshes every 30 seconds · Data stored in Event Perfekt database
        </p>

        <div style={{ textAlign: "center", marginTop: 16, paddingBottom: 20 }}>
          <p style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", letterSpacing: "0.06em" }}>
            <a href="/privacy-policy" style={{ color: "rgba(244,236,216,0.95)", textDecoration: "none" }}>Privacy Policy</a>
            {" · "}
            <a href="mailto:info@eventperfekt.com?subject=Data%20Rights%20Request" style={{ color: "rgba(244,236,216,0.95)", textDecoration: "none" }}>Your Data Rights</a>
          </p>
        </div>
      </div>
    </div>
  );
}
