import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { clearPortalSession, getPortalToken, portalFetch } from "@/lib/client-portal-auth";
import { Loader2, RefreshCw, Link2 } from "lucide-react";

type OverviewSection = {
  id?: number;
  project_id?: string;
  phase_number?: number;
  section_key?: string;
  section_title?: string;
  section_body?: string;
  sort_order?: number;
  published?: boolean;
};

const BURGUNDY = "#3D0B0B";
const GOLD = "#C9A84C";
const TEXT = "#1f2937";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

export default function AlliStrategicOverviewPage() {
  const [, setLocation] = useLocation();
  const [sections, setSections] = useState<OverviewSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "failed">("syncing");
  const [lastSyncedAt, setLastSyncedAt] = useState("");

  const load = async () => {
    const token = getPortalToken();
    if (!token) {
      setLocation("/client-portal/login");
      return;
    }
    setSyncStatus("syncing");
    try {
      const data = await portalFetch("GET", "/api/client-portal/alli/strategic-overview").catch(() => []);
      setSections(Array.isArray(data) ? data : []);
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus("synced");
    } catch (e: any) {
      if (String(e.message || "").includes("401")) {
        clearPortalSession();
        setLocation("/client-portal/login");
        return;
      }
      setSyncStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const syncLabel = useMemo(() => {
    if (!lastSyncedAt) return "";
    return `Updated ${new Date(lastSyncedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }, [lastSyncedAt]);

  const publishedSections = useMemo(() => sections.filter((section) => section?.published), [sections]);
  const hasContent = publishedSections.length > 0;

  return (
    <PortalLayout>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 4px" }}>Strategic Overview</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>Published narrative from Group Portal, shown from the last successful mirror.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "7px 14px" }}>
          {syncStatus === "synced" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />}
          {syncStatus === "syncing" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: MUTED }} />}
          {syncStatus === "failed" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />}
          <span style={{ fontSize: 12, color: MUTED }}>{syncStatus === "failed" ? "Sync failed" : syncStatus === "syncing" ? "Syncing…" : syncLabel}</span>
          {syncStatus === "failed" && (
            <button onClick={load} style={{ border: "none", background: "transparent", color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <RefreshCw size={12} /> Retry
            </button>
          )}
        </div>
      </div>

      {!hasContent ? (
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Link2 size={15} color={BURGUNDY} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: TEXT }}>Strategic Overview</h3>
          </div>
          <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>
            Strategic Overview will appear here once published.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          {publishedSections.map((section) => {
            const body = section.section_body || "";
            // Detect bullet-list patterns and array data in section body
            const lines = body.split(/\n+/).filter(l => l.trim());
            const hasBullets = lines.some(l => l.trim().startsWith("-") || l.trim().startsWith("*") || /^\d+\./.test(l.trim()));
            return (
              <div key={section.id || `${section.phase_number}-${section.section_key}`} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: BURGUNDY, marginBottom: 10 }}>
                  Phase {section.phase_number || "—"} · {section.section_key || "overview"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: TEXT, marginBottom: 14 }}>{section.section_title || "Strategic Overview"}</div>
                <div style={{ fontSize: 14, lineHeight: 1.8, color: TEXT, whiteSpace: "pre-wrap" }}>{body}</div>
              </div>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}