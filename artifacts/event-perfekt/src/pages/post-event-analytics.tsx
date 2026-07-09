import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PlannerSidebar from "@/components/PlannerSidebar";
import {
  ArrowLeft, BarChart3, Users, DollarSign, CheckCircle, Star, ThumbsUp,
  MessageSquare, Send, Download, Printer, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Target, Award, Smile, Frown, Meh,
  Mail, FileText, Eye, Plus, Copy, ExternalLink, Filter,
} from "lucide-react";

const C = {
  bg: "#0a0008",
  panel: "#1a0015",
  border: "#3a1030",
  gold: "#d4a843",
  burgundy: "#8B1538",
  text: "#e8e0e4",
  muted: "#8a7080",
};

function fmt(n: number, currency = "GBP") {
  const sym: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", NGN: "₦" };
  return `${sym[currency] || currency + " "}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function npsColor(score: number | null) {
  if (score === null) return C.muted;
  if (score >= 50) return "#22c55e";
  if (score >= 0) return "#f59e0b";
  return "#ef4444";
}
function npsLabel(score: number | null) {
  if (score === null) return "No data";
  if (score >= 50) return "Excellent";
  if (score >= 0) return "Good";
  return "Needs Work";
}

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={14} style={{ fill: i < Math.round(rating) ? C.gold : "none", color: i < Math.round(rating) ? C.gold : C.muted }} />
      ))}
    </div>
  );
}

function KPI({ label, value, sub, color = "#fff", icon: Icon }: { label: string; value: any; sub?: string; color?: string; icon?: any }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
          <div style={{ color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{sub}</div>}
        </div>
        {Icon && <div style={{ background: "#ffffff0a", borderRadius: 8, padding: 8 }}><Icon size={18} style={{ color: C.gold }} /></div>}
      </div>
    </div>
  );
}

function Section({ title, children, extra }: { title: string; children: any; extra?: any }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ color: C.gold, margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
        {extra}
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = C.burgundy }: { value: number; max?: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: "#ffffff10", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s" }} />
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  venue: "Venue & Location", food: "Food & Catering", entertainment: "Entertainment",
  organization: "Organisation", decoration: "Décor & Styling", communication: "Communication",
  service: "Service Quality", value: "Value for Money",
};

export default function PostEventAnalytics() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "feedback" | "surveys" | "send">("overview");
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [emailList, setEmailList] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [filterRating, setFilterRating] = useState("all");
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [newFeedback, setNewFeedback] = useState({ respondentName: "", respondentEmail: "", respondentType: "guest", overallRating: 5, npsScore: 8, wouldRecommend: true, wouldAttendAgain: true, comments: "", highlights: "", improvements: "", categoryRatings: {} as Record<string, number> });

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const authHeaders = { Authorization: `Bearer ${token}` };

  const { data: summary, isLoading } = useQuery({
    queryKey: ["/api/events", eventId, "post-event-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/post-event-summary`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!eventId,
  });

  const { data: surveysAll = [] } = useQuery<any[]>({
    queryKey: ["/api/surveys"],
  });

  const { data: surveyResults = [] } = useQuery<any[]>({
    queryKey: ["/api/surveys", selectedSurvey?.id, "results"],
    queryFn: async () => {
      const res = await fetch(`/api/surveys/${selectedSurvey.id}/results`, { headers: authHeaders });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedSurvey,
  });

  const addFeedbackMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/events/${eventId}/feedback`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "post-event-summary"] });
      setShowAddFeedback(false);
      setNewFeedback({ respondentName: "", respondentEmail: "", respondentType: "guest", overallRating: 5, npsScore: 8, wouldRecommend: true, wouldAttendAgain: true, comments: "", highlights: "", improvements: "", categoryRatings: {} });
      toast({ title: "Feedback recorded" });
    },
    onError: () => toast({ title: "Failed to record feedback", variant: "destructive" }),
  });

  const sendSurveyEmails = async () => {
    if (!selectedSurvey) return toast({ title: "Select a survey first", variant: "destructive" });
    const emails = emailList.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes("@"));
    if (emails.length === 0) return toast({ title: "No valid email addresses found", variant: "destructive" });
    setSending(true);
    try {
      const res = await fetch(`/api/surveys/${selectedSurvey.id}/send-email`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ emails, event_name: summary?.event?.name, custom_message: customMsg }),
      });
      const d = await res.json();
      toast({ title: `Survey sent to ${d.sent} of ${d.total} addresses` });
      setShowSendModal(false);
      setEmailList("");
    } catch { toast({ title: "Email send failed", variant: "destructive" }); }
    setSending(false);
    return undefined;
  };

  const downloadSurveyCSV = async (surveyId: number) => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/results/csv`, { headers: authHeaders });
      if (!res.ok) { toast({ title: "Export failed", variant: "destructive" }); return; }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `survey-${surveyId}-results.csv`;
      a.click();
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
  };

  const exportFeedbackCSV = () => {
    const responses = summary?.feedback?.recentComments || [];
    if (responses.length === 0) return toast({ title: "No feedback to export", variant: "destructive" });
    const headers = ["Name", "Rating", "NPS Score", "Would Recommend", "Comments", "Highlights", "Improvements", "Date"];
    const rows = responses.map((f: any) => [f.name || "Anonymous", f.rating, f.npsScore ?? "", f.wouldRecommend ? "Yes" : "No", (f.comment || "").replace(/"/g, '""'), (f.highlights || "").replace(/"/g, '""'), (f.improvements || "").replace(/"/g, '""'), f.date ? new Date(f.date).toLocaleDateString("en-GB") : ""]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `feedback-${summary?.event?.name || eventId}.csv`;
    a.click();
    return undefined;
  };

  const printReport = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const s = summary;
    const cur = s?.event?.currency || "GBP";
    w.document.write(`<!DOCTYPE html><html><head><title>Post-Event Report — ${s?.event?.name || ""}</title><style>
      body{font-family: 'Poppins', sans-serif;,Arial,sans-serif;padding:40px;color:#333;max-width:900px;margin:0 auto}
      h1{color:#330311;border-bottom:3px solid #8B1538;padding-bottom:10px;margin-bottom:24px}
      h2{color:#8B1538;margin-top:32px;font-size:16px}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}
      .kpi{border:1px solid #ddd;border-radius:8px;padding:16px;text-align:center}
      .kv{font-size:28px;font-weight:800;color:#330311}
      .kl{font-size:11px;color:#666;text-transform:uppercase;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}
      th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}
      th{background:#f5f5f5;font-weight:600}
      .footer{margin-top:40px;padding-top:20px;border-top:2px solid #8B1538;text-align:center;color:#888;font-size:12px}
      @media print{.no-print{display:none}}
    </style></head><body>
      <h1>Post-Event Analytics Report</h1>
      <p><strong>Event:</strong> ${s?.event?.name || "—"} &nbsp;|&nbsp; <strong>Date:</strong> ${s?.event?.startDate ? new Date(s.event.startDate).toLocaleDateString("en-GB") : "—"} &nbsp;|&nbsp; <strong>Type:</strong> ${s?.event?.type || "—"}</p>
      <div class="grid">
        <div class="kpi"><div class="kl">Attendance</div><div class="kv">${s?.attendance?.attendanceRate || 0}%</div><div style="font-size:12px;color:#666">${s?.attendance?.checkedIn || 0} / ${s?.attendance?.total || 0} guests</div></div>
        <div class="kpi"><div class="kl">Avg. Rating</div><div class="kv">${s?.feedback?.averageRating || "—"}/5</div><div style="font-size:12px;color:#666">${s?.feedback?.count || 0} responses</div></div>
        <div class="kpi"><div class="kl">NPS Score</div><div class="kv">${s?.feedback?.npsScore ?? "—"}</div><div style="font-size:12px;color:#666">${npsLabel(s?.feedback?.npsScore)}</div></div>
        <div class="kpi"><div class="kl">Task Completion</div><div class="kv">${s?.tasks?.completionRate || 0}%</div><div style="font-size:12px;color:#666">${s?.tasks?.completed || 0} / ${s?.tasks?.total || 0}</div></div>
      </div>
      ${s?.feedback?.categoryAverages && Object.keys(s.feedback.categoryAverages).length > 0 ? `
        <h2>Category Ratings</h2>
        <table><tr><th>Category</th><th>Score</th><th>Grade</th></tr>
        ${Object.entries(s.feedback.categoryAverages).map(([k, v]: any) => `<tr><td>${CATEGORY_LABELS[k] || k}</td><td>${v}/5</td><td>${v >= 4.5 ? "Excellent" : v >= 3.5 ? "Good" : v >= 2.5 ? "Average" : "Poor"}</td></tr>`).join("")}
        </table>
      ` : ""}
      ${(s?.feedback?.recentComments || []).length > 0 ? `
        <h2>Feedback Responses</h2>
        <table><tr><th>Name</th><th>Rating</th><th>NPS</th><th>Recommend</th><th>Comments</th></tr>
        ${s.feedback.recentComments.map((f: any) => `<tr><td>${f.name || "Anonymous"}</td><td>${f.rating}/5</td><td>${f.npsScore ?? "—"}</td><td>${f.wouldRecommend ? "Yes" : "No"}</td><td>${f.comment || "—"}</td></tr>`).join("")}
        </table>
      ` : ""}
      <div class="footer">Generated by Event Perfekt Global Ltd &nbsp;·&nbsp; ${new Date().toLocaleDateString("en-GB")} &nbsp;·&nbsp; eventperfekt.net</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const surveysForEvent = surveysAll.filter((s: any) => !s.event_id || s.event_id == eventId || s.event_id === eventId);
  const s = summary;
  const nps = s?.feedback?.npsScore ?? null;
  const ratingDist = s?.feedback?.ratingDistribution || {};
  const catAvg = s?.feedback?.categoryAverages || {};
  const responses = (s?.feedback?.recentComments || []).filter((f: any) => filterRating === "all" || String(f.rating) === filterRating);

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Poppins', sans-serif" }}>
        <PlannerSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${C.burgundy}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: C.muted }}>Loading post-event data…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Poppins', sans-serif" }}>
      <PlannerSidebar />
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <div>
            <button onClick={() => setLocation(`/event-dashboard/${eventId}`)} style={{ background: "none", border: "none", color: C.gold, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 8 }}>← Back to Event</button>
            <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>Post-Event Analytics</h1>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{s?.event?.name || "Event"} — {s?.event?.startDate ? new Date(s.event.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowSendModal(true)} style={{ background: C.burgundy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Send size={14} />Send Survey</button>
            <button onClick={exportFeedbackCSV} style={{ background: C.panel, color: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Download size={14} />Export CSV</button>
            <button onClick={printReport} style={{ background: C.panel, color: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Printer size={14} />Print Report</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
          {[
            { key: "overview", label: "Overview", Icon: BarChart3 },
            { key: "feedback", label: "Feedback", Icon: MessageSquare },
            { key: "surveys", label: "Surveys", Icon: FileText },
            { key: "send", label: "Send & Collect", Icon: Send },
          ].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setActiveTab(key as any)} style={{ padding: "10px 18px", background: "none", border: "none", cursor: "pointer", color: activeTab === key ? C.gold : C.muted, fontWeight: 700, fontSize: 13, borderBottom: activeTab === key ? `2px solid ${C.gold}` : "2px solid transparent", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
              <KPI label="Attendance Rate" value={`${s?.attendance?.attendanceRate || 0}%`} sub={`${s?.attendance?.checkedIn || 0} of ${s?.attendance?.total || 0} guests`} color="#22c55e" icon={Users} />
              <KPI label="Avg. Rating" value={s?.feedback?.averageRating ? `${s.feedback.averageRating}/5` : "—"} sub={`${s?.feedback?.count || 0} responses`} color={C.gold} icon={Star} />
              <KPI label="NPS Score" value={nps ?? "—"} sub={npsLabel(nps)} color={npsColor(nps)} icon={TrendingUp} />
              <KPI label="Recommend Rate" value={`${s?.feedback?.recommendRate || 0}%`} sub="Would recommend" color="#3b82f6" icon={ThumbsUp} />
              <KPI label="Task Completion" value={`${s?.tasks?.completionRate || 0}%`} sub={`${s?.tasks?.completed || 0} / ${s?.tasks?.total || 0} tasks`} color="#8b5cf6" icon={CheckCircle} />
              <KPI label="Budget Variance" value={s?.budget?.total ? fmt(Math.abs(s.budget.variance), s.budget.currency) : "—"} sub={s?.budget?.variance > 0 ? "Over budget" : s?.budget?.variance < 0 ? "Under budget" : "On budget"} color={s?.budget?.variance > 0 ? "#ef4444" : "#22c55e"} icon={DollarSign} />
            </div>

            {/* NPS + Rating distribution */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <Section title="NPS Score">
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 64, fontWeight: 900, color: npsColor(nps), lineHeight: 1 }}>{nps ?? "—"}</div>
                  <div style={{ color: npsColor(nps), fontWeight: 700, fontSize: 16, marginTop: 4 }}>{npsLabel(nps)}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Net Promoter Score (−100 to +100)</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16, fontSize: 12 }}>
                    {[{ label: "Promoters (9–10)", color: "#22c55e" }, { label: "Passives (7–8)", color: "#f59e0b" }, { label: "Detractors (0–6)", color: "#ef4444" }].map(x => (
                      <div key={x.label} style={{ textAlign: "center" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: x.color, margin: "0 auto 3px" }} />
                        <div style={{ color: C.muted }}>{x.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="Rating Distribution">
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const cnt = ratingDist[star] || 0;
                    const total = s?.feedback?.count || 0;
                    const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                    return (
                      <div key={star} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ display: "flex", gap: 2, width: 78 }}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} style={{ fill: i < star ? C.gold : "none", color: i < star ? C.gold : C.muted }} />)}</div>
                        <div style={{ flex: 1 }}><ProgressBar value={pct} color={star >= 4 ? "#22c55e" : star === 3 ? C.gold : "#ef4444"} /></div>
                        <span style={{ color: C.muted, fontSize: 12, width: 32, textAlign: "right" }}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>

            {/* Category breakdown */}
            {Object.keys(catAvg).length > 0 && (
              <Section title="Category Performance">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {Object.entries(catAvg).map(([k, v]: any) => {
                    const grade = v >= 4.5 ? { label: "Excellent", color: "#22c55e" } : v >= 3.5 ? { label: "Good", color: "#84cc16" } : v >= 2.5 ? { label: "Average", color: C.gold } : { label: "Poor", color: "#ef4444" };
                    return (
                      <div key={k} style={{ background: "#ffffff06", borderRadius: 10, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{CATEGORY_LABELS[k] || k}</span>
                          <span style={{ color: grade.color, fontSize: 12, fontWeight: 700 }}>{grade.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ProgressBar value={v} max={5} color={grade.color} />
                          <span style={{ color: grade.color, fontWeight: 800, fontSize: 14, minWidth: 30 }}>{v}</span>
                        </div>
                        <StarRow rating={v} />
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Comments highlights */}
            {(s?.feedback?.recentComments || []).filter((f: any) => f.highlights).length > 0 && (
              <Section title="What Guests Loved">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                  {(s.feedback.recentComments || []).filter((f: any) => f.highlights).slice(0, 6).map((f: any, i: number) => (
                    <div key={i} style={{ background: "#22c55e08", border: "1px solid #22c55e22", borderRadius: 10, padding: 14 }}>
                      <div style={{ color: "#22c55e", fontSize: 18, marginBottom: 6 }}>"</div>
                      <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: "0 0 8px" }}>{f.highlights}</p>
                      <div style={{ color: C.muted, fontSize: 11 }}>{f.name || "Anonymous"} · {f.rating}/5 ⭐</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Improvement areas */}
            {(s?.feedback?.recentComments || []).filter((f: any) => f.improvements).length > 0 && (
              <Section title="Areas for Improvement">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(s.feedback.recentComments || []).filter((f: any) => f.improvements).slice(0, 5).map((f: any, i: number) => (
                    <div key={i} style={{ background: "#ef444408", border: "1px solid #ef444422", borderRadius: 8, padding: 12, display: "flex", gap: 10 }}>
                      <div style={{ color: "#ef4444", fontSize: 20, lineHeight: 1 }}>•</div>
                      <div>
                        <p style={{ color: C.text, fontSize: 13, lineHeight: 1.5, margin: "0 0 4px" }}>{f.improvements}</p>
                        <div style={{ color: C.muted, fontSize: 11 }}>{f.name || "Anonymous"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {/* FEEDBACK TAB */}
        {activeTab === "feedback" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["all", "5", "4", "3", "2", "1"].map(r => (
                  <button key={r} onClick={() => setFilterRating(r)} style={{ background: filterRating === r ? C.gold : C.panel, color: filterRating === r ? "#000" : C.muted, border: `1px solid ${filterRating === r ? C.gold : C.border}`, borderRadius: 999, padding: "4px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {r === "all" ? "All" : `${r} ★`}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAddFeedback(true)} style={{ background: C.burgundy, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Plus size={14} />Log Feedback</button>
            </div>

            {responses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>No feedback recorded yet. Click "Log Feedback" to add responses manually, or send a survey to collect them automatically.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {responses.map((f: any, i: number) => (
                  <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      <div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{f.name || "Anonymous"}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{f.date ? new Date(f.date).toLocaleDateString("en-GB") : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <StarRow rating={f.rating} />
                        {f.npsScore !== undefined && f.npsScore !== null && (
                          <span style={{ background: npsColor(f.npsScore) + "22", color: npsColor(f.npsScore), borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>NPS: {f.npsScore}</span>
                        )}
                        <span style={{ background: f.wouldRecommend ? "#22c55e22" : "#ef444422", color: f.wouldRecommend ? "#22c55e" : "#ef4444", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                          {f.wouldRecommend ? "✓ Recommend" : "✗ No recommend"}
                        </span>
                      </div>
                    </div>
                    {f.comment && <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: "0 0 8px" }}>{f.comment}</p>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {f.highlights && <div style={{ background: "#22c55e08", border: "1px solid #22c55e22", borderRadius: 6, padding: 10 }}><div style={{ color: "#22c55e", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Loved</div><p style={{ color: C.text, fontSize: 12, margin: 0 }}>{f.highlights}</p></div>}
                      {f.improvements && <div style={{ background: "#ef444408", border: "1px solid #ef444422", borderRadius: 6, padding: 10 }}><div style={{ color: "#ef4444", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Would improve</div><p style={{ color: C.text, fontSize: 12, margin: 0 }}>{f.improvements}</p></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* SURVEYS TAB */}
        {activeTab === "surveys" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{surveysForEvent.length} survey{surveysForEvent.length !== 1 ? "s" : ""} for this event</p>
              <button onClick={() => setLocation("/survey-builder")} style={{ background: C.panel, color: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Plus size={14} />Create Survey</button>
            </div>
            {surveysAll.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>No surveys yet. Create one in the Survey Builder and link it to this event.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {surveysAll.map((sv: any) => (
                  <div key={sv.id} style={{ background: C.panel, border: `1px solid ${selectedSurvey?.id === sv.id ? C.gold : C.border}`, borderRadius: 12, padding: 18, cursor: "pointer" }} onClick={() => setSelectedSurvey(selectedSurvey?.id === sv.id ? null : sv)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{sv.title}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ background: sv.status === "active" ? "#22c55e22" : sv.status === "closed" ? "#6b728022" : "#f59e0b22", color: sv.status === "active" ? "#22c55e" : sv.status === "closed" ? "#9ca3af" : "#f59e0b", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{sv.status?.toUpperCase()}</span>
                          {sv.event_id && <span style={{ background: C.burgundy + "33", color: C.burgundy, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>Linked to event</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={e => { e.stopPropagation(); const url = `https://eventperfekt.net/survey/${sv.id}`; navigator.clipboard.writeText(url); toast({ title: "Survey link copied!" }); }} style={{ background: "#ffffff10", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Copy size={12} />Link</button>
                        <button onClick={e => { e.stopPropagation(); downloadSurveyCSV(sv.id); }} style={{ background: "#ffffff10", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Download size={12} />CSV</button>
                        <button onClick={e => { e.stopPropagation(); setSelectedSurvey(sv); setShowSendModal(true); }} style={{ background: C.burgundy, border: "none", color: "#fff", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Send size={12} />Send</button>
                      </div>
                    </div>

                    {selectedSurvey?.id === sv.id && (
                      <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                        <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Recent Responses ({surveyResults.length})</div>
                        {surveyResults.length === 0 ? (
                          <div style={{ color: C.muted, fontSize: 13 }}>No responses yet.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {surveyResults.slice(0, 5).map((r: any, i: number) => (
                              <div key={i} style={{ background: "#ffffff05", borderRadius: 8, padding: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{r.respondent_name || "Anonymous"}</span>
                                  <span style={{ color: C.muted, fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString("en-GB")}</span>
                                </div>
                              </div>
                            ))}
                            {surveyResults.length > 5 && <div style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>+{surveyResults.length - 5} more responses</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* SEND & COLLECT TAB */}
        {activeTab === "send" && (
          <Section title="Send Survey to Guests">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Select Survey</label>
                  <select value={selectedSurvey?.id || ""} onChange={e => setSelectedSurvey(surveysAll.find((s: any) => s.id == e.target.value) || null)} style={{ width: "100%", padding: "9px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: "#fff", fontSize: 13 }}>
                    <option value="">— Choose a survey —</option>
                    {surveysAll.map((sv: any) => <option key={sv.id} value={sv.id}>{sv.title}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email Addresses</label>
                  <textarea value={emailList} onChange={e => setEmailList(e.target.value)} rows={8} placeholder="Paste email addresses here — one per line, or comma/semicolon separated" style={{ width: "100%", padding: "9px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: "#fff", fontSize: 13, resize: "vertical", fontFamily: "Poppins, sans-serif", boxSizing: "border-box" }} />
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                    {emailList.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes("@")).length} valid addresses detected
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Personal Message (optional)</label>
                  <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={3} placeholder="Add a personal note to include in the email…" style={{ width: "100%", padding: "9px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: "#fff", fontSize: 13, resize: "vertical", fontFamily: "Poppins, sans-serif", boxSizing: "border-box" }} />
                </div>
                <button onClick={sendSurveyEmails} disabled={sending || !selectedSurvey} style={{ background: sending || !selectedSurvey ? C.border : C.burgundy, color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontWeight: 800, fontSize: 14, cursor: sending || !selectedSurvey ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <Send size={16} />{sending ? "Sending…" : "Send Survey Emails"}
                </button>
              </div>
              <div>
                <div style={{ background: "#ffffff06", borderRadius: 12, padding: 20 }}>
                  <h4 style={{ color: C.gold, fontWeight: 700, margin: "0 0 14px", fontSize: 13 }}>How to collect feedback</h4>
                  {[
                    { n: "1", t: "Create a survey", d: "Go to the Surveys tab and create a new survey, or use a template from the Survey Builder." },
                    { n: "2", t: "Set it to Active", d: "The survey must be set to 'Active' before guests can respond." },
                    { n: "3", t: "Enter guest emails", d: "Paste in the guest email list — you can export this from Guest Management." },
                    { n: "4", t: "Send & track", d: "Guests receive a branded email with a link. Responses appear here automatically." },
                  ].map(step => (
                    <div key={step.n} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                      <div style={{ minWidth: 26, height: 26, borderRadius: "50%", background: C.burgundy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{step.n}</div>
                      <div>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{step.t}</div>
                        <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.5 }}>{step.d}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Quick Actions</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => setLocation("/survey-builder")} style={{ background: C.panel, color: "#fff", border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Plus size={12} />New Survey</button>
                      <button onClick={() => setLocation(`/events/${eventId}/guests`)} style={{ background: C.panel, color: "#fff", border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Users size={12} />Guest List</button>
                      <button onClick={() => setLocation(`/events/${eventId}/analytics`)} style={{ background: C.panel, color: "#fff", border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><BarChart3 size={12} />Full Analytics</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Add Feedback Modal */}
        {showAddFeedback && (
          <div onClick={() => setShowAddFeedback(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#1a0015", border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
              <h2 style={{ color: "#fff", margin: "0 0 20px" }}>Log Feedback Manually</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {[{ l: "Name", v: newFeedback.respondentName, k: "respondentName" }, { l: "Email", v: newFeedback.respondentEmail, k: "respondentEmail" }].map(f => (
                  <div key={f.k}>
                    <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 3 }}>{f.l}</label>
                    <input value={f.v} onChange={e => setNewFeedback(prev => ({ ...prev, [f.k]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: "#fff", fontSize: 13, boxSizing: "border-box" as any }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Type</label>
                  <select value={newFeedback.respondentType} onChange={e => setNewFeedback(prev => ({ ...prev, respondentType: e.target.value }))} style={{ width: "100%", padding: "8px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: "#fff", fontSize: 13 }}>
                    {["guest", "client", "vendor", "staff"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Overall Rating</label>
                  <div style={{ display: "flex", gap: 4, paddingTop: 8 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={22} style={{ cursor: "pointer", fill: i <= newFeedback.overallRating ? C.gold : "none", color: i <= newFeedback.overallRating ? C.gold : C.muted }} onClick={() => setNewFeedback(prev => ({ ...prev, overallRating: i }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 3 }}>NPS (0–10)</label>
                  <input type="number" min={0} max={10} value={newFeedback.npsScore} onChange={e => setNewFeedback(prev => ({ ...prev, npsScore: parseInt(e.target.value) || 0 }))} style={{ width: "100%", padding: "8px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: "#fff", fontSize: 13 }} />
                </div>
              </div>
              {[{ l: "Comments", k: "comments" }, { l: "Highlights (what they loved)", k: "highlights" }, { l: "Areas for improvement", k: "improvements" }].map(f => (
                <div key={f.k} style={{ marginBottom: 12 }}>
                  <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 3 }}>{f.l}</label>
                  <textarea value={(newFeedback as any)[f.k]} onChange={e => setNewFeedback(prev => ({ ...prev, [f.k]: e.target.value }))} rows={2} style={{ width: "100%", padding: "8px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: "#fff", fontSize: 13, resize: "vertical", fontFamily: "Poppins, sans-serif", boxSizing: "border-box" as any }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", color: C.muted, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={newFeedback.wouldRecommend} onChange={e => setNewFeedback(prev => ({ ...prev, wouldRecommend: e.target.checked }))} />Would recommend
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", color: C.muted, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={newFeedback.wouldAttendAgain} onChange={e => setNewFeedback(prev => ({ ...prev, wouldAttendAgain: e.target.checked }))} />Would attend again
                </label>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => addFeedbackMutation.mutate(newFeedback)} disabled={addFeedbackMutation.isPending} style={{ flex: 1, background: C.burgundy, color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>{addFeedbackMutation.isPending ? "Saving…" : "Save Feedback"}</button>
                <button onClick={() => setShowAddFeedback(false)} style={{ flex: 1, background: "transparent", color: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 0", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Send Survey Modal */}
        {showSendModal && (
          <div onClick={() => setShowSendModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#1a0015", border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: "100%", maxWidth: 500 }}>
              <h2 style={{ color: "#fff", margin: "0 0 20px" }}>Send Survey</h2>
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Survey</label>
                <select value={selectedSurvey?.id || ""} onChange={e => setSelectedSurvey(surveysAll.find((s: any) => s.id == e.target.value) || null)} style={{ width: "100%", padding: "9px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: "#fff", fontSize: 13 }}>
                  <option value="">— Choose —</option>
                  {surveysAll.map((sv: any) => <option key={sv.id} value={sv.id}>{sv.title}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email Addresses</label>
                <textarea value={emailList} onChange={e => setEmailList(e.target.value)} rows={6} placeholder="One per line or comma/semicolon separated" style={{ width: "100%", padding: "9px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: "#fff", fontSize: 13, resize: "vertical", fontFamily: "Poppins, sans-serif", boxSizing: "border-box" as any }} />
                <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{emailList.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes("@")).length} valid addresses</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Personal Message (optional)</label>
                <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={2} style={{ width: "100%", padding: "9px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: "#fff", fontSize: 13, resize: "vertical", fontFamily: "Poppins, sans-serif", boxSizing: "border-box" as any }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={sendSurveyEmails} disabled={sending || !selectedSurvey} style={{ flex: 1, background: sending || !selectedSurvey ? C.border : C.burgundy, color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>{sending ? "Sending…" : "Send"}</button>
                <button onClick={() => setShowSendModal(false)} style={{ flex: 1, background: "transparent", color: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 0", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
