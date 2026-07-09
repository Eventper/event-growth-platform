import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { getPortalToken, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";

const G = {
  card:   "#ffffff0d",
  border: "rgba(255,255,255,0.12)",
  gold:   "#C9A84C",
  green:  "#22c55e",
  amber:  "#f59e0b",
  red:    "#ef4444",
  blue:   "#3b82f6",
  text:   "#fff",
  muted:  "rgba(255,255,255,0.55)",
};

const TYPE_CONFIG: Record<string, { accent: string; label: string; icon: string; headerBg: string }> = {
  risk:     { accent: G.amber, label: "Being Monitored",  icon: "⚠️",  headerBg: `${G.amber}18` },
  issue:    { accent: G.red,   label: "Open Issue",        icon: "🔴", headerBg: `${G.red}18`   },
  resolved: { accent: G.green, label: "Resolved",          icon: "✅", headerBg: `${G.green}18` },
};

function SectionHeader({ type, count }: { type: keyof typeof TYPE_CONFIG; count: number }) {
  const c = TYPE_CONFIG[type];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 16px", background: c.headerBg, border: `1px solid ${c.accent}30`, borderRadius: 10 }}>
      <span style={{ fontSize: 16 }}>{c.icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: c.accent, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {type === "risk" ? "Items Being Monitored" : type === "issue" ? "Open Issues" : "Recently Resolved"}
      </span>
      <span style={{ background: `${c.accent}30`, color: c.accent, borderRadius: 99, padding: "1px 10px", fontSize: 11, fontWeight: 800, marginLeft: 2 }}>{count}</span>
    </div>
  );
}

function RiskCard({ item, type }: { item: any; type: string }) {
  const c = TYPE_CONFIG[type] || TYPE_CONFIG.risk;
  return (
    <div style={{ background: G.card, border: `1px solid ${G.border}`, borderLeft: `4px solid ${c.accent}`, borderRadius: 10, padding: "16px 20px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
        <h4 style={{ color: G.text, fontSize: 14, fontWeight: 700, margin: 0, flex: 1 }}>{item.title}</h4>
        <span style={{ background: `${c.accent}20`, color: c.accent, border: `1px solid ${c.accent}40`, padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
          {c.label}
        </span>
      </div>
      {item.mitigation_summary && (
        <div style={{ marginBottom: item.ep_action && type !== "resolved" ? 10 : 0 }}>
          <div style={{ fontSize: 10, color: G.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
            {type === "resolved" ? "How it was resolved" : "Mitigation approach"}
          </div>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{item.mitigation_summary}</p>
        </div>
      )}
      {item.ep_action && type !== "resolved" && (
        <div style={{ marginTop: 10, padding: "10px 14px", background: `${G.blue}15`, border: `1px solid ${G.blue}40`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: G.blue, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>What EP is doing</div>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{item.ep_action}</p>
        </div>
      )}
      {type === "resolved" && item.resolved_at && (
        <div style={{ marginTop: 8, fontSize: 11, color: G.green, fontWeight: 600 }}>
          ✓ Resolved {new Date(item.resolved_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      )}
    </div>
  );
}

export default function ClientPortalStatus() {
  const [, setLocation] = useLocation();
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getPortalToken();
    if (!token) { setLocation("/client-portal/login"); return; }
    (async () => {
      try {
        const data = await portalFetch("GET", "/api/client-portal/alli/risks");
        const allRisks = Array.isArray(data) ? data : [];
        // Defensive filter: strip anything marked internal
        setRisks(allRisks.filter((risk: any) => risk.is_internal !== true && risk.isInternal !== true && risk.internal !== true));
      } catch (e: any) {
        if (e.message?.includes("401") || e.message?.includes("Unauthorised")) { clearPortalSession(); setLocation("/client-portal/login"); return; }
      }
      setLoading(false);
    })();
  }, []);

  const safeRisks = Array.isArray(risks) ? risks : [];
  const activeRisks = safeRisks.filter(r => r.status === "open" && r.category !== "issue");
  const openIssues  = safeRisks.filter(r => r.status === "open" && r.category === "issue");
  const resolved    = safeRisks.filter(r => r.status === "resolved");

  return (
    <PortalLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: G.text, margin: 0, marginBottom: 6 }}>Project Status</h1>
        <p style={{ color: G.muted, fontSize: 13, margin: 0 }}>A live summary of items actively managed by your Event Perfekt team.</p>
      </div>

      {/* Status summary strip */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Active Risks",   count: activeRisks.length, color: G.amber, icon: "⚠️" },
          { label: "Open Issues",    count: openIssues.length,  color: G.red,   icon: "🔴" },
          { label: "Resolved",       count: resolved.length,    color: G.green, icon: "✅" },
        ].map(({ label, count, color, icon }) => (
          <div key={label} style={{ flex: 1, minWidth: 110, background: `${color}12`, border: `1px solid ${color}40`, borderTop: `3px solid ${color}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 4, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: G.muted }}>Loading project status…</div>
      ) : risks.length === 0 ? (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderTop: `4px solid ${G.green}`, borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
          <h3 style={{ color: G.green, marginBottom: 8, fontSize: 18, fontWeight: 800 }}>Everything is on track</h3>
          <p style={{ color: G.muted, fontSize: 13, maxWidth: 420, margin: "0 auto" }}>No risks or issues are currently being tracked for your project. We'll update this section if anything requires your awareness.</p>
        </div>
      ) : (
        <div>
          {/* EP active management banner */}
          <div style={{ background: `${G.blue}12`, border: `1px solid ${G.blue}40`, borderLeft: `4px solid ${G.blue}`, borderRadius: 10, padding: "14px 18px", marginBottom: 28, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 800, color: G.blue, fontSize: 14, marginBottom: 4 }}>Event Perfekt is actively managing your project</div>
              <div style={{ color: G.muted, fontSize: 13, lineHeight: 1.6 }}>
                The items below are being monitored and addressed by your dedicated Event Perfekt team. We keep this section updated so you always know we're on top of everything.
              </div>
            </div>
          </div>

          {activeRisks.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <SectionHeader type="risk" count={activeRisks.length} />
              {activeRisks.map(r => <RiskCard key={r.id} item={r} type="risk" />)}
            </div>
          )}

          {openIssues.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <SectionHeader type="issue" count={openIssues.length} />
              {openIssues.map(r => <RiskCard key={r.id} item={r} type="issue" />)}
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <SectionHeader type="resolved" count={resolved.length} />
              {resolved.map(r => <RiskCard key={r.id} item={r} type="resolved" />)}
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
