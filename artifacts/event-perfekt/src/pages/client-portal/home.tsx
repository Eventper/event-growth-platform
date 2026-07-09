import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout, { portalCard, portalBadge } from "./layout";
import { getPortalToken, getPortalUser, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";
import { ChevronDown, ChevronRight } from "lucide-react";

const G = {
  card:   "#ffffff",
  border: "#e5e7eb",
  gold:   "#C9A84C",
  green:  "#16a34a",
  amber:  "#d97706",
  red:    "#dc2626",
  blue:   "#2563eb",
  text:   "#1f2937",
  muted:  "#6b7280",
};

function StatCard({ label, value, sub, accent, icon }: { label: string; value: string | number; sub?: string; accent: string; icon: string }) {
  return (
    <div style={{ ...portalCard({ borderTop: `3px solid ${accent}`, padding: "20px 22px" }) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: G.muted, marginTop: 5 }}>{sub}</div>}
        </div>
        <span style={{ fontSize: 22, opacity: 0.7 }}>{icon}</span>
      </div>
    </div>
  );
}

function DonutChart({ approved, pending, inProgress, notStarted }: { approved: number; pending: number; inProgress: number; notStarted: number }) {
  const total = approved + pending + inProgress + notStarted || 1;
  const approvedPct = (approved / total) * 100;
  const pendingPct = (pending / total) * 100;
  const inProgressPct = (inProgress / total) * 100;
  const notStartedPct = (notStarted / total) * 100;
  const c1 = `${G.green} ${approvedPct}%`;
  const c2 = `${G.amber} ${approvedPct}% ${approvedPct + pendingPct}%`;
  const c3 = `${G.blue} ${approvedPct + pendingPct}% ${approvedPct + pendingPct + inProgressPct}%`;
  const c4 = `${G.red} ${approvedPct + pendingPct + inProgressPct}% 100%`;
  return (
    <div className="ep-donut-grid" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18, alignItems: "center" }}>
      <div style={{
        width: 220,
        height: 220,
        borderRadius: "50%",
        background: `conic-gradient(${c1}, ${c2}, ${c3}, ${c4})`,
        position: "relative",
        margin: "0 auto",
      }}>
        <div style={{
          position: "absolute",
          inset: 28,
          borderRadius: "50%",
          background: "#3D0B0B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textAlign: "center",
          color: "#fff",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{total}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", fontWeight: 700 }}>Total items</div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
          {[
            { label: "Approved", value: approved, color: G.green },
            { label: "Review", value: pending, color: G.amber },
            { label: "Active", value: inProgress, color: G.blue },
            { label: "Not started", value: notStarted, color: G.red },
          ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "#f1f5f9" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, color: G.text, fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, display: "inline-block" }} />
              {item.label}
            </span>
            <span style={{ color: item.color, fontWeight: 800 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientPortalHome() {
  const [, setLocation] = useLocation();
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [activity, setActivity] = useState<{ documents: any[]; events: any[] }>({ documents: [], events: [] });
  const [risks, setRisks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [actionReply, setActionReply] = useState<Record<number, string>>({});
  const [actionSaving, setActionSaving] = useState<Record<number, boolean>>({});
  const [actionNotesOpen, setActionNotesOpen] = useState<Record<number, boolean>>({});
  const [actionNotes, setActionNotes] = useState<Record<number, any[]>>({});
  const [actionAudit, setActionAudit] = useState<Record<number, any[]>>({});
  const [editActionId, setEditActionId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [noteInput, setNoteInput] = useState<Record<number, string>>({});
  const [raid, setRaid] = useState<{ risk: any[]; assumption: any[]; issue: any[]; dependency: any[] }>({ risk: [], assumption: [], issue: [], dependency: [] });
  const [raidTab, setRaidTab] = useState<"risk" | "assumption" | "issue" | "dependency">("risk");
  const [requests, setRequests] = useState<any[]>([]);
  const [requestReply, setRequestReply] = useState<Record<number, string>>({});
  const [requestSaving, setRequestSaving] = useState<Record<number, boolean>>({});
  const [weeklyReports, setWeeklyReports] = useState<any[]>([]);
  const [panelsOpen, setPanelsOpen] = useState<{ raid: boolean; requests: boolean; deliverables: boolean; weeklyReports: boolean; actions: boolean }>({ raid: true, requests: true, deliverables: true, weeklyReports: true, actions: true });
  const togglePanel = (key: "raid" | "requests" | "deliverables" | "weeklyReports" | "actions") => setPanelsOpen(p => ({ ...p, [key]: !p[key] }));
  const [loading, setLoading] = useState(true);
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const user = getPortalUser();
  const projectName = project?.name || (user?.projectId === "alli-foundation-2024" ? "Youth Violence Prevention Model Design" : "Your Project");

  useEffect(() => {
    const token = getPortalToken();
    if (!token) { setLocation("/client-portal/login"); return; }
    setDeliverables([]);
    (async () => {
      try {
        const [p, d, m, a, r, i, ac, rd, rq, epAct] = await Promise.all([
          portalFetch("GET", "/api/client-portal/project").catch(() => null),
          portalFetch("GET", "/api/client-portal/alli/deliverables").catch(() => []),
          portalFetch("GET", "/api/client-portal/messages").catch(() => []),
          portalFetch("GET", "/api/client-portal/activity").catch(() => ({ documents: [], events: [] })),
          portalFetch("GET", "/api/client-portal/alli/risks").catch(() => []),
          portalFetch("GET", "/api/client-portal/invoices").catch(() => []),
          portalFetch("GET", "/api/client-portal/alli/client-actions").catch(() => []),
          portalFetch("GET", "/api/client-portal/alli/raid").catch(() => ({ risk: [], assumption: [], issue: [], dependency: [] })),
          portalFetch("GET", "/api/client-portal/alli/client-action-requests").catch(() => []),
          portalFetch("GET", "/api/ep-client-portal/activity").catch(() => ({ documents: [], events: [] })),
        ]);
        setProject(p);
        const portalDeliverables = Array.isArray(d) ? d : [];
        setDeliverables(portalDeliverables);
        if (!p && user?.projectId === "alli-foundation-2024") {
          setProject({ name: "Youth Violence Prevention Model Design", id: "alli-foundation-2024" });
        }
        setMessages(Array.isArray(m) ? m : []);
        const epDocs = Array.isArray((epAct as any)?.documents) ? (epAct as any).documents : [];
        const epEvents = Array.isArray((epAct as any)?.events) ? (epAct as any).events : [];
        const legacyDocs = Array.isArray((a as any)?.documents) ? (a as any).documents : [];
        const legacyEvents = Array.isArray((a as any)?.events) ? (a as any).events : [];
        setActivity({
          documents: epDocs.length ? epDocs : legacyDocs,
          events: epEvents.length ? epEvents : legacyEvents,
        });
        const allRisks = Array.isArray(r) ? r : [];
        setRisks(allRisks.filter((risk: any) => risk.is_internal !== true && risk.isInternal !== true && risk.internal !== true));
        setInvoices(Array.isArray(i) ? i : []);
        setActions(Array.isArray(ac) ? ac : []);
        const filterInternal = (items: any[]) => (Array.isArray(items) ? items.filter((item: any) => item.is_internal !== true && item.isInternal !== true && item.internal !== true) : []);
        setRaid({
          risk: filterInternal(rd?.risk),
          assumption: filterInternal(rd?.assumption),
          issue: filterInternal(rd?.issue),
          dependency: filterInternal(rd?.dependency),
        });
        setRequests(Array.isArray(rq) ? rq : []);
        const weekly = await portalFetch("GET", "/api/client-portal/alli/weekly-reports").catch(() => []);
        setWeeklyReports(Array.isArray(weekly) ? weekly : []);
      } catch (err: any) {
        if (err.message?.includes("401") || err.message?.includes("Unauthorised") || err.message?.includes("expired")) {
          clearPortalSession(); setLocation("/client-portal/login");
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const handleActionRespond = async (id: number, responseType: string) => {
    const text = actionReply[id]?.trim() || "";
    if (responseType === "message" && !text) return;
    setActionSaving(s => ({ ...s, [id]: true }));
    try {
      await portalFetch("PATCH", `/api/client-portal/alli/client-actions/${id}/respond`, {
        response_type: responseType,
        response_text: text || undefined,
        client_name: user?.fullName || "Trustee",
      });
      setActionReply(r => ({ ...r, [id]: "" }));
      const refreshed = await portalFetch("GET", "/api/client-portal/alli/client-actions").catch(() => null);
      if (Array.isArray(refreshed)) setActions(refreshed);
    } catch { /* silent */ }
    setActionSaving(s => ({ ...s, [id]: false }));
  };

  const handleActionResolve = async (id: number) => {
    setActionSaving(s => ({ ...s, [id]: true }));
    try {
      await portalFetch("PATCH", `/api/client-portal/alli/client-actions/${id}/resolve`, {});
      const refreshed = await portalFetch("GET", "/api/client-portal/alli/client-actions").catch(() => null);
      if (Array.isArray(refreshed)) setActions(refreshed);
    } catch { /* silent */ }
    setActionSaving(s => ({ ...s, [id]: false }));
  };

  const handleActionClose = async (id: number) => {
    setActionSaving(s => ({ ...s, [id]: true }));
    try {
      await portalFetch("PATCH", `/api/client-portal/alli/client-actions/${id}/close`, {});
      const refreshed = await portalFetch("GET", "/api/client-portal/alli/client-actions").catch(() => null);
      if (Array.isArray(refreshed)) setActions(refreshed);
    } catch { /* silent */ }
    setActionSaving(s => ({ ...s, [id]: false }));
  };

  const handleActionTreat = async (id: number) => {
    const text = noteInput[id]?.trim();
    if (!text) return;
    setActionSaving(s => ({ ...s, [id]: true }));
    try {
      await portalFetch("POST", `/api/client-portal/alli/client-actions/${id}/treat`, { note: text });
      setNoteInput(r => ({ ...r, [id]: "" }));
      const notes = await portalFetch("GET", `/api/client-portal/alli/client-actions/${id}/notes`).catch(() => []);
      setActionNotes(n => ({ ...n, [id]: Array.isArray(notes) ? notes : [] }));
    } catch { /* silent */ }
    setActionSaving(s => ({ ...s, [id]: false }));
  };

  const handleActionEditSave = async (id: number) => {
    setActionSaving(s => ({ ...s, [id]: true }));
    try {
      await portalFetch("PATCH", `/api/client-portal/alli/client-actions/${id}/edit`, {
        title: editForm.title,
        priority: editForm.priority,
        due_date: editForm.due_date,
        owner: editForm.owner,
        linked_deliverable_code: editForm.linked_deliverable_code,
      });
      setEditActionId(null);
      const refreshed = await portalFetch("GET", "/api/client-portal/alli/client-actions").catch(() => null);
      if (Array.isArray(refreshed)) setActions(refreshed);
    } catch { /* silent */ }
    setActionSaving(s => ({ ...s, [id]: false }));
  };

  const loadActionDetail = async (id: number) => {
    if (actionNotes[id] && actionAudit[id]) {
      setActionNotesOpen(o => ({ ...o, [id]: !o[id] }));
      return;
    }
    try {
      const detail = await portalFetch("GET", `/api/client-portal/alli/client-actions/${id}/detail`).catch(() => null);
      if (detail) {
        setActionNotes(n => ({ ...n, [id]: detail.notes || [] }));
        setActionAudit(a => ({ ...a, [id]: detail.audit || [] }));
        setActionNotesOpen(o => ({ ...o, [id]: true }));
      }
    } catch { /* silent */ }
  };

  function statusLabel(status: string) {
    switch (status) {
      case "pending": return "Awaiting response";
      case "acknowledged": return "In Progress";
      case "completed": return "Resolved";
      case "resolved": return "Resolved";
      case "closed": return "Closed";
      default: return status;
    }
  }

  function statusColor(status: string) {
    switch (status) {
      case "pending": return { bg: "rgba(245,158,11,0.18)", color: "#f59e0b" };
      case "acknowledged": return { bg: "rgba(59,130,246,0.18)", color: "#60a5fa" };
      case "completed":
      case "resolved": return { bg: "rgba(34,197,94,0.18)", color: "#4ade80" };
      case "closed": return { bg: "rgba(156,163,175,0.18)", color: "#9ca3af" };
      default: return { bg: "rgba(156,163,175,0.18)", color: "#9ca3af" };
    }
  }

  function priorityColor(priority: string) {
    switch (priority) {
      case "urgent": return { bg: "#dc2626", color: "#fff" };
      case "high": return { bg: "#d97706", color: "#fff" };
      case "medium": return { bg: "#2563eb", color: "#fff" };
      default: return { bg: "#6b7280", color: "#fff" };
    }
  }

  function isOverdue(dueDate?: string) {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  const total = deliverables.length;
  const approved = deliverables.filter(d => d.status === "approved").length;
  const pending = deliverables.filter(d => d.status === "awaiting_review").length;
  const inProgress = deliverables.filter(d => d.status === "in_progress").length;
  const notStarted = deliverables.filter(d => d.status === "pending").length;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const lastMsg = messages[messages.length - 1];
  const activeRisks = risks.filter(r => r.status === "open" && ((r.raid_type || r.category) === "risk")).length;
  const openIssues = risks.filter(r => r.status === "open" && ((r.raid_type || r.category) === "issue")).length;
  const resolved = risks.filter(r => r.status === "resolved").length;
  const overdueInvoices = invoices.filter(i => i.status === "overdue").length;
  const phaseGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    deliverables.forEach((d: any) => {
      const phase = d.phase || d.stage || d.milestone_phase || "Other";
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(d);
    });
    return Object.entries(groups).map(([phase, items]) => ({ phase, items }));
  }, [deliverables]);

  if (loading) {
    return (
      <PortalLayout>
        <div style={{ textAlign: "center", padding: "60px 0", color: "#fff" }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${G.gold}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
          Loading your project…
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <style>{`
        @keyframes portalFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Welcome */}
      <div style={{ marginBottom: 30, animation: "portalFadeUp 0.5s ease both" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 4px" }}>
          Welcome back, {user?.fullName || user?.full_name} 👋
        </h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, margin: 0 }}>
          {projectName} · <span style={{ color: "#fff", fontWeight: 600 }}>{user?.organisation || "Event Perfekt Global Ltd"}</span>
        </p>
      </div>

      <div style={{ ...portalCard({ padding: "22px 24px", marginBottom: 24, borderTop: `3px solid ${G.blue}` }), animation: "portalFadeUp 0.6s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, color: G.text, fontSize: 18, fontWeight: 900 }}>Project Snapshot</h2>
            <p style={{ margin: "4px 0 0", color: G.muted, fontSize: 13 }}>Live performance overview from your portal activity</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{ ...portalBadge(G.green), fontSize: 12, padding: "5px 14px", fontWeight: 800 }}>Approved {approved}</span>
            <span style={{ ...portalBadge(G.amber), fontSize: 12, padding: "5px 14px", fontWeight: 800 }}>Awaiting Review {pending}</span>
            <span style={{ ...portalBadge(G.blue), fontSize: 12, padding: "5px 14px", fontWeight: 800 }}>Active {inProgress}</span>
          </div>
        </div>
        <DonutChart approved={approved} pending={pending} inProgress={inProgress} notStarted={notStarted} />
      </div>

      {/* KPI stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 28, animation: "portalFadeUp 0.7s ease both" }}>
        <StatCard label="Total Deliverables" value={total}      sub="across all phases"     accent={G.blue}  icon="📋" />
        <StatCard label="Approved by You"    value={approved}   sub={`${pct}% of total`}    accent={G.green} icon="✅" />
        <StatCard label="Awaiting Review"    value={pending}    sub="ready for your sign-off" accent={G.amber} icon="⏳" />
        <StatCard label="In Progress"        value={inProgress} sub="being worked on"         accent={G.blue}  icon="🔄" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 28, animation: "portalFadeUp 0.8s ease both" }}>
        <StatCard label="Documents" value={activity.documents.length} sub="shared in portal" accent={G.blue} icon="📄" />
        <StatCard label="Events" value={activity.events.length} sub="upcoming and past" accent={G.gold} icon="📅" />
        <StatCard label="Risks" value={activeRisks} sub={`${openIssues} issues, ${resolved} resolved`} accent={G.red} icon="⚠️" />
        <StatCard label="Invoices" value={invoices.length} sub={`${overdueInvoices} overdue`} accent={G.green} icon="💳" />
      </div>

      {/* Progress bar */}
      <div style={{ ...portalCard({ padding: "20px 24px", marginBottom: 24 }), animation: "portalFadeUp 0.9s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <span style={{ fontWeight: 700, color: G.text, fontSize: 14 }}>Overall Project Progress</span>
            <div style={{ color: G.muted, fontSize: 12, marginTop: 2 }}>{approved} of {total} deliverables approved</div>
          </div>
          <span style={{ fontSize: 26, fontWeight: 900, color: pct >= 75 ? G.green : pct >= 40 ? G.amber : G.red }}>{pct}%</span>
        </div>
        <div style={{ background: "#e5e7eb", borderRadius: 99, height: 10, overflow: "hidden" }}>
          <div style={{ background: pct >= 75 ? G.green : pct >= 40 ? G.amber : G.red, height: "100%", width: `${pct}%`, borderRadius: 99, transition: "width 0.5s" }} />
        </div>
          <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { dot: G.green, label: `${approved} Approved` },
            { dot: G.amber, label: `${pending} Awaiting Review` },
            { dot: G.blue,  label: `${inProgress} In Progress` },
            { dot: G.red, label: `${notStarted} Not Started` },
          ].map(({ dot, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 160, fontSize: 12, color: "#fff", background: dot, border: `1px solid ${dot}`, borderRadius: 999, padding: "8px 14px", fontWeight: 800, boxShadow: `0 6px 16px ${dot}33` }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
                {label}
              </span>
              <span style={{ color: "#fff", fontWeight: 900 }}>{label.split(" ")[0]}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Alert banner if pending review */}
      {pending > 0 && (
        <div className="ep-alert-banner" style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderLeft: `4px solid ${G.amber}`, borderRadius: 16, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 800, color: G.text, fontSize: 14 }}>{pending} deliverable{pending > 1 ? "s" : ""} awaiting sign off</div>
            <div style={{ color: G.muted, fontSize: 12, marginTop: 2 }}>Review and sign off to keep your project on track</div>
          </div>
          <button onClick={() => setLocation("/client-portal/project")} style={{ marginLeft: "auto", background: "#3D0B0B", color: "#fff", border: "none", borderRadius: 999, padding: "8px 18px", fontWeight: 800, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Review Now →</button>
        </div>
      )}

      {(raid.risk.length + raid.assumption.length + raid.issue.length + raid.dependency.length) > 0 && (
        <div style={{ ...portalCard({ padding: "20px 24px", marginBottom: 20, borderTop: `3px solid ${G.red}` }), animation: "portalFadeUp 0.95s ease both" }}>
          <div onClick={() => togglePanel("raid")} style={{ marginBottom: panelsOpen.raid ? 14 : 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5 }}>RAID Register</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: G.muted }}>Risks, Assumptions, Issues and Dependencies tracked by your delivery team</p>
            </div>
            {panelsOpen.raid ? <ChevronDown size={18} color={G.muted} /> : <ChevronRight size={18} color={G.muted} />}
          </div>
          {panelsOpen.raid && (<>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {([
              { key: "risk", label: "Risk", count: raid.risk.length },
              { key: "assumption", label: "Assumption", count: raid.assumption.length },
              { key: "issue", label: "Issue", count: raid.issue.length },
              { key: "dependency", label: "Dependency", count: raid.dependency.length },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setRaidTab(t.key)} style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: `1px solid ${raidTab === t.key ? G.red : G.border}`,
                background: raidTab === t.key ? G.red : "#fff",
                color: raidTab === t.key ? "#fff" : G.text,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          {raid[raidTab].length === 0 ? (
            <div style={{ color: G.muted, fontSize: 13, padding: "14px 0" }}>
              0 open {raidTab === "dependency" ? "dependencies" : raidTab + "s"}.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {raid[raidTab].map((row: any) => (
                <div key={row.id} style={{ border: `1px solid ${G.border}`, borderLeft: `4px solid ${G.red}`, borderRadius: 8, padding: "10px 14px", background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: G.text }}>{row.title || row.description}</span>
                    {row.severity && <span style={{ fontSize: 10, fontWeight: 800, color: G.muted, textTransform: "uppercase" }}>{row.severity}</span>}
                  </div>
                  {row.description && row.title && (
                    <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.5 }}>{row.description}</div>
                  )}
                  {row.mitigation && (
                    <div style={{ fontSize: 12, color: G.text, marginTop: 6 }}><strong>Mitigation:</strong> {row.mitigation}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          </>)}
        </div>
      )}

      {requests.length > 0 && (
        <div style={{ ...portalCard({ padding: "20px 24px", marginBottom: 20, borderTop: `3px solid ${G.gold}` }), animation: "portalFadeUp 0.97s ease both" }}>
          <div onClick={() => togglePanel("requests")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: panelsOpen.requests ? 14 : 0, flexWrap: "wrap", gap: 8, cursor: "pointer" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5 }}>📨 Requests From Your Delivery Team</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: G.muted }}>Specific questions or decisions needing your input as Trustee</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: G.gold, color: "#fff", borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 800 }}>
                {requests.filter((r: any) => r.status === "open").length} open
              </span>
              {panelsOpen.requests ? <ChevronDown size={18} color={G.muted} /> : <ChevronRight size={18} color={G.muted} />}
            </div>
          </div>
          {panelsOpen.requests && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requests.map((r: any) => {
              const isClosed = r.status === "responded" || r.status === "closed";
              const isHigh = r.priority === "high";
              return (
                <div key={r.id} style={{
                  border: `1px solid ${isHigh ? "#fde68a" : G.border}`,
                  borderLeft: `4px solid ${isClosed ? G.green : isHigh ? G.amber : G.gold}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  background: isClosed ? "#f0fdf4" : "#fffdf7",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: G.text }}>{r.subject || r.title || "Untitled request"}</div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: G.muted, textTransform: "uppercase" }}>{r.status}</span>
                  </div>
                  {r.trustee_name && (
                    <div style={{ fontSize: 11, color: G.muted, marginBottom: 4 }}>
                      <strong>Owner:</strong> {r.trustee_name}
                      {r.deliverable_number && <> · Deliverable D{r.deliverable_number}</>}
                    </div>
                  )}
                  {(r.body || r.description) && <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.5, marginBottom: 8 }}>{r.body || r.description}</div>}
                  {(r.response || r.response_text) && <div style={{ fontSize: 12, color: G.green, marginBottom: 8 }}><strong>Your response:</strong> {r.response || r.response_text}</div>}
                  {!isClosed && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={requestReply[r.id] || ""}
                        onChange={e => setRequestReply(s => ({ ...s, [r.id]: e.target.value }))}
                        placeholder="Type your response…"
                        style={{ flex: 1, padding: "7px 10px", border: `1px solid ${G.border}`, borderRadius: 7, fontSize: 12, outline: "none", fontFamily: "Poppins, sans-serif", color: G.text }}
                      />
                      <button
                        onClick={async () => {
                          const text = (requestReply[r.id] || "").trim();
                          if (!text) return;
                          setRequestSaving(s => ({ ...s, [r.id]: true }));
                          try {
                            await portalFetch("POST", `/api/client-portal/alli/client-action-requests/${r.id}/respond`, { response_text: text });
                            setRequestReply(s => ({ ...s, [r.id]: "" }));
                            const refreshed = await portalFetch("GET", "/api/client-portal/alli/client-action-requests").catch(() => []);
                            setRequests(Array.isArray(refreshed) ? refreshed : []);
                          } finally {
                            setRequestSaving(s => ({ ...s, [r.id]: false }));
                          }
                        }}
                        disabled={requestSaving[r.id] || !requestReply[r.id]?.trim()}
                        style={{ padding: "7px 14px", background: G.gold, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: !requestReply[r.id]?.trim() ? "not-allowed" : "pointer", opacity: !requestReply[r.id]?.trim() ? 0.4 : 1, whiteSpace: "nowrap" }}
                      >
                        Respond
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>)}
        </div>
      )}

      {weeklyReports.length > 0 && (
        <div style={{ ...portalCard({ padding: "20px 24px", marginBottom: 20, borderTop: `3px solid ${G.blue}` }), animation: "portalFadeUp 0.98s ease both" }}>
          <div onClick={() => togglePanel("weeklyReports")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: panelsOpen.weeklyReports ? 14 : 0, flexWrap: "wrap", gap: 8, cursor: "pointer" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5 }}>📊 Latest Weekly Report</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: G.muted }}>Most recent update from your delivery team</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {(() => {
                const rag = (weeklyReports[0]?.rag_status || weeklyReports[0]?.rag || "").toLowerCase();
                const ragColor = rag === "green" ? G.green : rag === "amber" ? G.amber : rag === "red" ? G.red : G.blue;
                const openActions = weeklyReports[0]?.client_actions?.filter((a: any) => a.done !== true && a.status !== "done").length || 0;
                return (
                  <>
                    {rag && <span style={{ background: ragColor, color: "#fff", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{rag}</span>}
                    {openActions > 0 && <span style={{ background: G.gold, color: "#fff", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{openActions} action{openActions !== 1 ? "s" : ""}</span>}
                  </>
                );
              })()}
              {panelsOpen.weeklyReports ? <ChevronDown size={18} color={G.muted} /> : <ChevronRight size={18} color={G.muted} />}
            </div>
          </div>
          {panelsOpen.weeklyReports && (() => {
            const latest = weeklyReports[0];
            return (
              <div>
                <div style={{ border: `1px solid ${G.border}`, borderRadius: 10, padding: "14px 16px", background: "#fff", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: G.text }}>{latest.title || latest.week || "Weekly Report"}</div>
                    <div style={{ fontSize: 11, color: G.muted }}>Week ending: {latest.week_ending || latest.date || "—"}</div>
                  </div>
                  {latest.summary && <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.5 }}>{latest.summary}</div>}
                </div>
                <button
                  onClick={() => setLocation("/client-portal/weekly-reports")}
                  style={{ background: G.blue, color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  View all reports →
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Mini Kanban board */}
      {deliverables.length > 0 && (
        <div style={{ ...portalCard({ padding: 20, marginBottom: 20 }), animation: "portalFadeUp 1s ease both" }}>
          <div onClick={() => togglePanel("deliverables")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: panelsOpen.deliverables ? 16 : 0, gap: 12, flexWrap: "wrap", cursor: "pointer" }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>🗂 Deliverables Board</h3>
              <p style={{ margin: "4px 0 0", color: G.muted, fontSize: 12 }}>Click a phase header to expand · <span style={{ color: G.blue, cursor: "pointer", fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); setLocation("/client-portal/project"); }}>Open full board →</span></p>
            </div>
            {panelsOpen.deliverables ? <ChevronDown size={18} color={G.muted} /> : <ChevronRight size={18} color={G.muted} />}
          </div>
          {panelsOpen.deliverables && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {[
              { key: "pending", label: "Not Started", color: G.muted, bg: "#f3f4f6" },
              { key: "in_progress", label: "In Progress", color: G.amber, bg: "#fef3c7" },
              { key: "awaiting_review", label: "Ready for Review", color: G.blue, bg: "#dbeafe" },
              { key: "approved", label: "Approved", color: G.green, bg: "#dcfce7" },
            ].map(col => {
              const colItems = deliverables.filter((d: any) => {
                if (d.client_approved) return col.key === "approved";
                return (d.status || "pending") === col.key;
              });
              const phases = Array.from(new Set(colItems.map((d: any) => d.phase || "General"))).sort();
              return (
                <div key={col.key} style={{ minWidth: 180 }}>
                  <div style={{ background: col.bg, border: `1px solid ${col.color}40`, borderTop: `3px solid ${col.color}`, borderRadius: "8px 8px 0 0", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: col.color, textTransform: "uppercase", letterSpacing: 0.4 }}>{col.label}</span>
                    <span style={{ background: col.color, color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{colItems.length}</span>
                  </div>
                  <div style={{ background: col.bg, border: `1px solid ${col.color}40`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 8, minHeight: 80, display: "flex", flexDirection: "column", gap: 6 }}>
                    {colItems.length === 0 ? (
                      <div style={{ textAlign: "center", color: G.muted, fontSize: 11, padding: "14px 0", opacity: 0.6 }}>—</div>
                    ) : phases.map(phase => {
                      const phaseItems = colItems.filter((d: any) => (d.phase || "General") === phase);
                      const phaseKey = `${col.key}::${phase}`;
                      const collapsed = openPhases[phaseKey] === false;
                      return (
                        <div key={phase}>
                          <button
                            onClick={() => setOpenPhases(p => {
                              if (collapsed) {
                                const { [phaseKey]: _, ...rest } = p;
                                return rest as Record<string, boolean>;
                              }
                              return { ...p, [phaseKey]: false };
                            })}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 4, background: "#fff", border: `1px solid ${col.color}30`, borderRadius: 5, padding: "4px 7px", cursor: "pointer", marginBottom: collapsed ? 0 : 4, textAlign: "left", color: G.text }}
                          >
                            {collapsed ? <ChevronRight size={11} style={{ color: col.color, flexShrink: 0 }} /> : <ChevronDown size={11} style={{ color: col.color, flexShrink: 0 }} />}
                            <span style={{ fontSize: 10, fontWeight: 700, color: col.color, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{phase}</span>
                            <span style={{ fontSize: 9, color: col.color, opacity: 0.7, flexShrink: 0 }}>{phaseItems.length}</span>
                          </button>
                          {!collapsed && phaseItems.map((d: any) => (
                            <div
                              key={d.id}
                              onClick={() => col.key === "awaiting_review" ? setLocation("/client-portal/project") : undefined}
                              style={{ background: "#fff", border: `1px solid ${G.border}`, borderLeft: `3px solid ${col.color}`, borderRadius: 6, padding: "7px 9px", marginBottom: 4, cursor: col.key === "awaiting_review" ? "pointer" : "default", color: G.text }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 700, color: G.text, lineHeight: 1.3 }}>{(d.deliverable_name || d.title || "—").trim?.() || "—"}</div>
                              {d.due_date && (
                                <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>
                                  📅 {new Date(d.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 20 }}>
          {/* Upcoming events */}
          <div style={portalCard({ padding: 20 })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>📅 Upcoming</h3>
              <button onClick={() => setLocation("/client-portal/calendar")} style={{ background: "none", border: "none", color: G.gold, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>View all →</button>
            </div>
            {activity.events.length === 0 ? (
              <div style={{ color: G.muted, fontSize: 12, textAlign: "center", padding: "20px 0" }}>No upcoming events scheduled</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activity.events.slice(0, 4).map((e: any) => {
                  const d = new Date(e.start_date);
                  const isPast = d < new Date();
                  return (
                    <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: `${isPast ? G.muted : G.blue}15`, borderLeft: `3px solid ${isPast ? G.muted : G.blue}`, borderRadius: 6 }}>
                      <div style={{ minWidth: 38, textAlign: "center" }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: G.muted, textTransform: "uppercase" }}>{d.toLocaleDateString("en-GB", { month: "short" })}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: G.text }}>{d.getDate()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: G.text }}>{e.title}</div>
                        {!e.all_day && <div style={{ fontSize: 10, color: G.muted }}>{d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>}
                      </div>
                      {isPast && <span style={{ fontSize: 9, color: G.muted, fontWeight: 700 }}>PAST</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent documents */}
          <div style={portalCard({ padding: 20 })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>📄 Recent Documents</h3>
              <button onClick={() => setLocation("/client-portal/documents")} style={{ background: "none", border: "none", color: G.gold, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>View all →</button>
            </div>
            {activity.documents.length === 0 ? (
              <div style={{ color: G.muted, fontSize: 12, textAlign: "center", padding: "20px 0" }}>No documents shared yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activity.documents.slice(0, 4).map((d: any) => {
                  const isClientUpload = d.uploaded_by_type === "client";
                  return (
                    <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: `${isClientUpload ? G.gold : G.blue}15`, borderRadius: 6, borderLeft: `3px solid ${isClientUpload ? G.gold : G.blue}` }}>
                      <span style={{ fontSize: 18 }}>📄</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.document_name}</div>
                        <div style={{ fontSize: 10, color: G.muted }}>{isClientUpload ? "Uploaded by you" : "Shared by EP"} · {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                      </div>
                      <span style={{ background: isClientUpload ? `${G.gold}22` : `${G.blue}22`, color: isClientUpload ? G.gold : G.blue, borderRadius: 99, padding: "2px 8px", fontSize: 9, fontWeight: 700 }}>{isClientUpload ? "YOURS" : "EP"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      {/* What Next — top priority actions */}
      {actions.filter(a => a.status === "pending").length > 0 && (
        <div style={portalCard({ borderLeft: `4px solid ${G.blue}`, padding: 22 })}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px" }}>🎯 What Next</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {actions.filter(a => a.status === "pending").slice(0, 3).map((action: any, idx: number) => (
              <div key={action.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: idx === 0 ? `${G.blue}12` : "#f8fafc", borderRadius: 8, border: `1px solid ${idx === 0 ? `${G.blue}30` : G.border}` }}>
                <span style={{ fontSize: 16, minWidth: 24, textAlign: "center" }}>{idx === 0 ? "🔥" : idx === 1 ? "⚡" : "→"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: G.text }}>{action.title}</div>
                  <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{action.owner || action.assignee_name || "—"} · Due {action.due_date ? new Date(action.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "soon"}</div>
                </div>
                {action.linked_deliverable_code || (action.deliverable_number ? `D${action.deliverable_number}` : null) ? (
                  <button
                    onClick={() => setLocation(`/client-portal/project#${(action.linked_deliverable_code || `D${action.deliverable_number}`).toLowerCase()}`)}
                    style={{ background: "#3D0B0B", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Open →
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <button
            onClick={() => setLocation("/client-portal/action-items")}
            style={{ marginTop: 12, background: `${G.blue}12`, border: `1px solid ${G.border}`, color: G.text, borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            View all action items →
          </button>
        </div>
      )}

      {/* Latest message */}
      {lastMsg && (
        <div style={portalCard({ borderLeft: `4px solid ${G.gold}`, padding: 22 })}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px" }}>💬 Latest Message</h3>
          <div style={{ padding: "12px 16px", background: `${G.gold}12`, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.text, marginBottom: 6 }}>
              {lastMsg.sender_name} · {new Date(lastMsg.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </div>
            <div style={{ fontSize: 14, color: G.text, lineHeight: 1.6 }}>{lastMsg.content}</div>
          </div>
          <button
            onClick={() => setLocation("/client-portal/messages")}
            style={{ marginTop: 12, background: `${G.gold}12`, border: `1px solid ${G.border}`, color: G.text, borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            View all messages →
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 20 }}>
        <div style={portalCard({ padding: 20 })}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px" }}>⚠️ Status</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: G.text, fontSize: 13 }}><span>Active risks</span><strong>{activeRisks}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", color: G.text, fontSize: 13 }}><span>Open issues</span><strong>{openIssues}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", color: G.text, fontSize: 13 }}><span>Resolved</span><strong>{resolved}</strong></div>
          </div>
        </div>
        <div style={portalCard({ padding: 20 })}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: G.text, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px" }}>💳 Billing</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: G.text, fontSize: 13 }}><span>Invoices</span><strong>{invoices.length}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", color: G.text, fontSize: 13 }}><span>Overdue</span><strong style={{ color: G.red }}>{overdueInvoices}</strong></div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
