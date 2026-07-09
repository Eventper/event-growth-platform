import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { clearPortalSession, getPortalUser, isTrusteePortalUser } from "@/lib/client-portal-auth";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";
import AskEPTeamWidget from "@/components/client-portal/AskEPTeamWidget";
import CookieBanner, { PolicyLinks } from "@/components/client-portal/CookieBanner";
import { Globe2, LogOut } from "lucide-react";

const BURGUNDY = "#3D0B0B";
const GOLD = "#C9A84C";
const TEXT = "#1f2937";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const SURFACE = "#ffffff";
const PAGE_BG = "#3D0B0B";
const PANEL_BG = "#f8fafc";

const BASE_NAV = [
  { href: "/client-portal/home",      label: "Home" },
  { href: "/client-portal/project",   label: "Project" },
  { href: "/client-portal/weekly-reports", label: "Weekly Reports" },
  { href: "/client-portal/documents", label: "Documents" },
  { href: "/client-portal/calendar",  label: "Calendar" },
  { href: "/client-portal/messages",  label: "Messages" },
  { href: "/client-portal/payments",  label: "Payments" },
];

const ALLI_NAV = [
  { href: "/client-portal/alli/strategic-overview", label: "Strategic Overview" },
  { href: "/client-portal/alli/young-people", label: "Case Management" },
  { href: "/client-portal/alli/partners",     label: "Partners" },
  { href: "/client-portal/alli/funders",     label: "Funders" },
  { href: "/client-portal/alli/events",       label: "Events" },
];

function isAlliUser(user: any) {
  if (!user) return false;
  const org = (user.organisation || user.organization || "").toLowerCase();
  const pid = (user.project_id || user.projectId || "").toLowerCase();
  return org.includes("alli") || pid.includes("alli");
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const user = getPortalUser();
  const trustee = isTrusteePortalUser(user);
  const alli = isAlliUser(user);
  const NAV = trustee || alli ? [...BASE_NAV, ...ALLI_NAV] : BASE_NAV;
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const handleSignOut = () => {
    clearPortalSession();
    setLocation("/client-portal/login");
  };

  return (
    <div className="ep-client-portal" style={{ minHeight: "100vh", background: PAGE_BG, fontFamily: "'Poppins', sans-serif" }}>
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: isMobile ? "10px 14px" : "14px 24px" }}>
          {/* Logo + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <img src={logoPath} alt="Event Perfekt" style={{ height: isMobile ? 28 : 34, objectFit: "contain", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: TEXT, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {isMobile ? "Event Perfekt" : "Event Perfekt Global Ltd"}
              </div>
              {!isMobile && <div style={{ fontSize: 12, color: TEXT_MUTED }}>Client Portal</div>}
            </div>
          </div>

          {/* Right-side actions */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14, flexShrink: 0 }}>
            {!isMobile && (
              <a href="https://www.eventperfekt.com" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: BURGUNDY, textDecoration: "none", padding: "8px 12px", borderRadius: 999, background: "#f8ecef", border: `1px solid ${BORDER}` }}>
                <Globe2 size={16} />
                Visit Website
              </a>
            )}
            {!isMobile && (
              <div style={{ textAlign: "right" }}>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{user?.fullName || user?.full_name}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{user?.organisation}</div>
              </div>
            )}
            <button
              onClick={handleSignOut}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: BURGUNDY,
                border: "none",
                color: "#fff",
                borderRadius: 999,
                padding: isMobile ? "8px 12px" : "9px 14px",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <LogOut size={14} />
              {!isMobile && "Sign Out"}
            </button>
          </div>
        </div>
      </header>

      <nav className="ep-portal-nav" style={{
        background: SURFACE,
        borderBottom: `1px solid ${BORDER}`,
        padding: isMobile ? "0 8px" : "0 20px",
        display: "flex", gap: isMobile ? 2 : 6, overflowX: "auto",
        WebkitOverflowScrolling: "touch" as any,
        scrollbarWidth: "none" as any,
      }}>
        {NAV.map(n => {
          const active = location === n.href;
          if (trustee && !n.href.startsWith("/client-portal")) return null;
          return (
            <a
              key={n.href}
              href={n.href}
              onClick={(e) => { e.preventDefault(); setLocation(n.href); }}
              style={{
                display: "block",
                padding: isMobile ? "10px 12px" : "14px 18px",
                fontSize: isMobile ? 12 : 15,
                fontWeight: 800,
                textDecoration: "none",
                whiteSpace: "nowrap",
                color: "#000",
                borderBottom: active ? `2px solid ${BURGUNDY}` : "2px solid transparent",
                transition: "color 0.15s, background 0.15s",
                background: active ? "#f1f1f1" : "transparent",
                borderRadius: "8px 8px 0 0",
              }}
            >
              {n.label}
            </a>
          );
        })}
      </nav>

      {/* Page content */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 14px 60px" : "28px 24px 60px" }}>
        {children}
      </main>

      {/* Portal footer */}
      <footer style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "18px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10, lineHeight: 1.6 }}>
          Event Perfekt Global Ltd · 20 Wenlock Road, London, N1 7PG · info@eventperfekt.com
        </div>
        <PolicyLinks light />
      </footer>

      <AskEPTeamWidget />
      <CookieBanner />
    </div>
  );
}

/* ── Shared card / section helpers exported for portal pages ── */
export const portalCard = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.04)",
  ...extra,
});

export const portalHeading = (extra?: React.CSSProperties): React.CSSProperties => ({
  color: TEXT, fontWeight: 700, margin: "0 0 4px", ...extra,
});

export const portalMuted = (extra?: React.CSSProperties): React.CSSProperties => ({
  color: TEXT_MUTED, fontSize: 13, ...extra,
});

export const portalBadge = (color = GOLD): React.CSSProperties => ({
  display: "inline-block", padding: "2px 10px", borderRadius: 999,
  fontSize: 11, fontWeight: 700, background: color + "22", color: color, border: `1px solid ${color}55`,
});

export { BURGUNDY, GOLD, TEXT, TEXT_MUTED, BORDER };
