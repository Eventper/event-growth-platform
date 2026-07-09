import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Send, Loader2, Copy, Download, Trash2, BookOpen,
  Bot, User, FileText, Wand2, Calendar, TrendingUp,
  Link as LinkIcon, CheckCircle
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MarketingPlan {
  id: number;
  title: string;
  content: string;
  created_at: string;
  period_days: number;
}

interface LiveInsight {
  id: string;
  severity: "critical" | "high" | "medium" | "info";
  priority: number;
  title: string;
  evidence: string;
  nextSteps: string[];
}

interface LiveInsightsResponse {
  generatedAt: string;
  snapshot: {
    periodDays: number;
    totalViews: number;
    totalSessions: number;
    emailCaptures: number;
    visitors: number;
    ctaClicks: number;
    formStarts: number;
    formCompletes: number;
    submitSuccess: number;
    paymentViews: number;
    ctaRate: number;
    formStartRate: number;
    completionRate: number;
    submitRate: number;
    emailCaptureRate: number;
    directShare: number;
    topSource: { source: string; sessions: number } | null;
    topPage: { page: string; views: number } | null;
  };
  insights: LiveInsight[];
}

interface IntelligenceOSResponse {
  generatedAt: string;
  periodDays: number;
  snapshot: LiveInsightsResponse["snapshot"];
  kpiTree: {
    northStar: { name: string; value: number; targetRange: string };
    supporting: Array<{ name: string; value: string; threshold: string }>;
  };
  thresholds: Array<{ metric: string; current: number; target: number; status: "on-track" | "off-track" }>;
  weeklyCadence: Array<{ name: string; agenda: string[] }>;
  agencyBriefs: Array<{
    id: string;
    objective: string;
    evidence: string;
    deliverables: string[];
    acceptanceCriteria: string[];
    dueInDays: number;
  }>;
  experimentBacklog: Array<{
    id: string;
    hypothesis: string;
    primaryMetric: string;
    successThreshold: string;
    owner: string;
    priority: number;
  }>;
  automation: {
    principle: string;
    autoTasks: string[];
    manualApprovals: string[];
    recommendedRunCadence: string;
  };
  dataSources: {
    traffic: {
      utmSources: Array<{ source: string; sessions: number }>;
      referrerDomains: Array<{ referrer_domain: string; sessions: number }>;
      utmBreakdown: Array<{ source: string; medium: string; campaign: string; sessions: number }>;
    };
    identity: {
      ipCoverage: { sessionsWithIp: number; coveragePct: number };
      emailCapture: { sessionsWithEmail: number; coveragePct: number };
    };
    geo: {
      sessionsWithCountry: number;
      countryCoveragePct: number;
      sessionsWithCity: number;
      cityCoveragePct: number;
      topCountries: Array<{ country: string; sessions: number }>;
      topCities: Array<{ city: string; sessions: number }>;
    };
  };
  next7Days: string[];
  topFindings: LiveInsight[];
}

interface IntelligenceRunItem {
  id: number;
  created_at: string;
  triggered_by: string;
  period_days: number;
  run_summary?: {
    topFinding?: string;
    submitRate?: number;
    ctaRate?: number;
    visitors?: number;
    submitSuccess?: number;
  };
}

const QUICK_PROMPTS = [
  "What's the BIG IDEA for this campaign?",
  "Write a headline that gives goosebumps",
  "What's our brand arc for the next 3 weeks?",
  "Why aren't more people accessing?",
  "What would Nike do with our Instagram?",
  "Which page is losing people emotionally?",
  "Write a LinkedIn post that stops the scroll",
  "Suggest email copy that makes people cry (in a good way)",
  "What's the funnel drop-off look like?",
  "How do I create FOMO for I AM HER?",
  "Should I run paid ads?",
  "How do I get more ticket sales?",
];

export default function AdminMarketingAgent() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "live" | "intelligence" | "plans">("chat");
  const [selectedPlan, setSelectedPlan] = useState<MarketingPlan | null>(null);
  const [liveDays, setLiveDays] = useState<number>(30);
  const [runningIntelligence, setRunningIntelligence] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { data: plansData, refetch: refetchPlans } = useQuery({
    queryKey: ["/api/admin/marketing-agent/plans"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/marketing-agent/plans", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
    enabled: activeTab === "plans",
  });

  const { data: liveInsights, isLoading: liveLoading, refetch: refetchLive } = useQuery<LiveInsightsResponse>({
    queryKey: ["/api/admin/marketing-agent/live-insights", liveDays],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/marketing-agent/live-insights?days=${liveDays}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch live insights");
      return res.json();
    },
    enabled: activeTab === "live",
  });

  const { data: intelligenceOS, isLoading: intelligenceLoading, refetch: refetchIntelligence } = useQuery<IntelligenceOSResponse>({
    queryKey: ["/api/admin/marketing-agent/intelligence-os", liveDays],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/marketing-agent/intelligence-os?days=${liveDays}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch intelligence OS");
      return res.json();
    },
    enabled: activeTab === "intelligence",
  });

  const { data: runHistory, refetch: refetchRunHistory } = useQuery<{ runs: IntelligenceRunItem[] }>({
    queryKey: ["/api/admin/marketing-agent/intelligence-os/runs"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/marketing-agent/intelligence-os/runs?limit=12", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch Intelligence OS runs");
      return res.json();
    },
    enabled: activeTab === "intelligence",
  });

  const runIntelligenceNow = async () => {
    try {
      setRunningIntelligence(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/marketing-agent/intelligence-os/run", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ days: liveDays }),
      });
      if (!res.ok) throw new Error("Failed to run Intelligence OS");
      await refetchIntelligence();
      await refetchRunHistory();
      toast({ title: "Intelligence Run Complete", description: "New run saved to history." });
    } catch {
      toast({ title: "Error", description: "Could not run Intelligence OS.", variant: "destructive" });
    } finally {
      setRunningIntelligence(false);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/marketing-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          days: 30,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();

      const assistantMsg: Message = { role: "assistant", content: data.response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      toast({ title: "Error", description: "Could not reach the Creative Director. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const generatePlan = async () => {
    setGeneratingPlan(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/marketing-agent/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ days: 30 }),
      });
      if (!res.ok) throw new Error("Failed to generate plan");
      const data = await res.json();
      setSelectedPlan(data.plan);
      setActiveTab("plans");
      refetchPlans();
      toast({ title: "Campaign Plan Generated", description: "Your creative campaign plan is ready!" });
    } catch {
      toast({ title: "Error", description: "Could not generate plan. Please try again.", variant: "destructive" });
    }
    setGeneratingPlan(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  const downloadPlan = (plan: MarketingPlan) => {
    const blob = new Blob([plan.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.title.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deletePlan = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/marketing-agent/plans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      refetchPlans();
      if (selectedPlan?.id === id) setSelectedPlan(null);
      toast({ title: "Deleted", description: "Plan removed" });
    } catch {
      toast({ title: "Error", description: "Could not delete plan", variant: "destructive" });
    }
  };

  const plans: MarketingPlan[] = plansData?.plans || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <PlannerSidebar />
      <main className="lg:ml-60" style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ background: "#330311", borderRadius: 8, padding: 8 }}>
                  <Sparkles style={{ color: "#C9A961", width: 18, height: 18 }} />
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#330311", margin: 0 }}>Creative Director</h1>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>The creative brain of Coca-Cola, Nike, and Apple. Now working for I AM HER.</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", padding: 4 }}>
                <button
                  onClick={() => setActiveTab("chat")}
                  style={{
                    padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: activeTab === "chat" ? "#330311" : "transparent",
                    color: activeTab === "chat" ? "#fff" : "#374151",
                  }}
                >
                  <Bot style={{ width: 14, height: 14, display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab("live")}
                  style={{
                    padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: activeTab === "live" ? "#330311" : "transparent",
                    color: activeTab === "live" ? "#fff" : "#374151",
                  }}
                >
                  <TrendingUp style={{ width: 14, height: 14, display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                  Live Insights
                </button>
                <button
                  onClick={() => setActiveTab("intelligence")}
                  style={{
                    padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: activeTab === "intelligence" ? "#330311" : "transparent",
                    color: activeTab === "intelligence" ? "#fff" : "#374151",
                  }}
                >
                  <CheckCircle style={{ width: 14, height: 14, display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                  Intelligence OS
                </button>
                <button
                  onClick={() => setActiveTab("plans")}
                  style={{
                    padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: activeTab === "plans" ? "#330311" : "transparent",
                    color: activeTab === "plans" ? "#fff" : "#374151",
                  }}
                >
                  <FileText style={{ width: 14, height: 14, display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                  Plans ({plans.length})
                </button>
              </div>
              <Button
                onClick={generatePlan}
                disabled={generatingPlan}
                style={{ background: "#C9A961", color: "#330311", fontWeight: 700, fontSize: 13, border: "none" }}
              >
                {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                <span style={{ marginLeft: 6 }}>Generate Plan</span>
              </Button>
            </div>
          </div>

          {/* Intelligence OS Tab */}
          {activeTab === "intelligence" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card>
                <CardContent style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                      CMO Intelligence AI Run
                    </p>
                    <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
                      One-run operating pack: KPI tree, agency briefs, experiments, weekly cadence, and next actions.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Button onClick={() => refetchIntelligence()} variant="outline">
                      Refresh View
                    </Button>
                    <Button onClick={runIntelligenceNow} disabled={runningIntelligence} style={{ background: "#330311", color: "#fff" }}>
                      {runningIntelligence ? "Running..." : "Run Intelligence AI"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {intelligenceLoading ? (
                <Card>
                  <CardContent style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
                    <Loader2 className="w-5 h-5 animate-spin" style={{ margin: "0 auto 8px" }} />
                    Running Intelligence OS...
                  </CardContent>
                </Card>
              ) : intelligenceOS ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                    <Card><CardContent style={{ padding: 14 }}><div style={{ fontSize: 11, color: "#6b7280" }}>North Star</div><div style={{ fontSize: 18, fontWeight: 800, color: "#330311" }}>{intelligenceOS.kpiTree.northStar.name}</div><div style={{ fontSize: 12, color: "#6b7280" }}>Current: {intelligenceOS.kpiTree.northStar.value} · Target: {intelligenceOS.kpiTree.northStar.targetRange}</div></CardContent></Card>
                    <Card><CardContent style={{ padding: 14 }}><div style={{ fontSize: 11, color: "#6b7280" }}>Top Source</div><div style={{ fontSize: 18, fontWeight: 800, color: "#330311" }}>{intelligenceOS.snapshot.topSource?.source || "N/A"}</div><div style={{ fontSize: 12, color: "#6b7280" }}>{intelligenceOS.snapshot.topSource?.sessions || 0} sessions</div></CardContent></Card>
                    <Card><CardContent style={{ padding: 14 }}><div style={{ fontSize: 11, color: "#6b7280" }}>Submit Rate</div><div style={{ fontSize: 18, fontWeight: 800, color: "#330311" }}>{intelligenceOS.snapshot.submitRate}%</div><div style={{ fontSize: 12, color: "#6b7280" }}>Period: {intelligenceOS.periodDays} days</div></CardContent></Card>
                  </div>

                  <Card>
                    <CardContent style={{ padding: 16 }}>
                      <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#330311" }}>Threshold Board</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                        {intelligenceOS.thresholds.map((t, i) => (
                          <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, background: t.status === "on-track" ? "#f0fdf4" : "#fef2f2" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{t.metric}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>Current {t.current}% vs Target {t.target}%</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Card>
                      <CardContent style={{ padding: 16 }}>
                        <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#330311" }}>Agency Briefs</h3>
                        {intelligenceOS.agencyBriefs.map((b, i) => (
                          <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#330311" }}>{b.id} · {b.objective}</div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{b.evidence}</div>
                            <div style={{ fontSize: 11, color: "#374151" }}>Due in {b.dueInDays} days</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent style={{ padding: 16 }}>
                        <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#330311" }}>Experiment Backlog</h3>
                        {intelligenceOS.experimentBacklog.map((e, i) => (
                          <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{e.id} · P{e.priority}</div>
                            <div style={{ fontSize: 12, color: "#374151" }}>{e.hypothesis}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>Metric: {e.primaryMetric} · Success: {e.successThreshold}</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Card>
                      <CardContent style={{ padding: 16 }}>
                        <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#330311" }}>Weekly Cadence</h3>
                        {intelligenceOS.weeklyCadence.map((c, i) => (
                          <div key={i} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{c.name}</div>
                            <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "#6b7280" }}>
                              {c.agenda.map((a, j) => <li key={j}>{a}</li>)}
                            </ul>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent style={{ padding: 16 }}>
                        <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#330311" }}>Next 7 Days</h3>
                        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
                          {intelligenceOS.next7Days.map((n, i) => <li key={i}>{n}</li>)}
                        </ol>
                      </CardContent>
                    </Card>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Card>
                      <CardContent style={{ padding: 16 }}>
                        <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#330311" }}>Automation Model</h3>
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280" }}>{intelligenceOS.automation.principle}</p>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 4 }}>Auto Tasks</div>
                        <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
                          {intelligenceOS.automation.autoTasks.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#9a3412", marginBottom: 4 }}>Manual Approvals</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
                          {intelligenceOS.automation.manualApprovals.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                        <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>Cadence: {intelligenceOS.automation.recommendedRunCadence}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent style={{ padding: 16 }}>
                        <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#330311" }}>Data Source Coverage</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>IP Coverage</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#330311" }}>{intelligenceOS.dataSources.identity.ipCoverage.coveragePct}%</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{intelligenceOS.dataSources.identity.ipCoverage.sessionsWithIp} sessions</div>
                          </div>
                          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>Email Capture Coverage</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#330311" }}>{intelligenceOS.dataSources.identity.emailCapture.coveragePct}%</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{intelligenceOS.dataSources.identity.emailCapture.sessionsWithEmail} sessions</div>
                          </div>
                          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>Country Coverage</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#330311" }}>{intelligenceOS.dataSources.geo.countryCoveragePct}%</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{intelligenceOS.dataSources.geo.sessionsWithCountry} sessions</div>
                          </div>
                          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>City Coverage</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#330311" }}>{intelligenceOS.dataSources.geo.cityCoveragePct}%</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{intelligenceOS.dataSources.geo.sessionsWithCity} sessions</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>Top Traffic Sources (UTM)</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {intelligenceOS.dataSources.traffic.utmSources.slice(0, 6).map((s, i) => (
                            <Badge key={i} variant="outline">{s.source}: {s.sessions}</Badge>
                          ))}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>
                          Referrer domains tracked: {intelligenceOS.dataSources.traffic.referrerDomains.length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent style={{ padding: 16 }}>
                      <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#330311" }}>Run History</h3>
                      <div style={{ display: "grid", gap: 8 }}>
                        {(runHistory?.runs || []).map((r) => (
                          <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, background: "#fafafa" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Run #{r.id}</div>
                              <Badge variant="outline">{r.triggered_by}</Badge>
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {new Date(r.created_at).toLocaleString("en-GB")} · {r.period_days}d period
                            </div>
                            {r.run_summary?.topFinding && (
                              <div style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>
                                Top finding: {r.run_summary.topFinding}
                              </div>
                            )}
                          </div>
                        ))}
                        {(runHistory?.runs || []).length === 0 && (
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>No runs saved yet.</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div style={{ fontSize: 11, color: "#6b7280", textAlign: "right" }}>
                    Last run {new Date(intelligenceOS.generatedAt).toLocaleString("en-GB")}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Live Insights Tab */}
          {activeTab === "live" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card>
                <CardContent style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                      Real Data Insight Engine
                    </p>
                    <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
                      Deterministic recommendations from live analytics and funnel metrics.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      value={liveDays}
                      onChange={(e) => setLiveDays(Number(e.target.value))}
                      style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 12, background: "#fff" }}
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={14}>Last 14 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                    <Button variant="outline" onClick={() => refetchLive()} style={{ fontSize: 12 }}>
                      Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {liveLoading ? (
                <Card>
                  <CardContent style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
                    <Loader2 className="w-5 h-5 animate-spin" style={{ margin: "0 auto 8px" }} />
                    Loading live insights...
                  </CardContent>
                </Card>
              ) : liveInsights ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    {[
                      ["Sessions", liveInsights.snapshot.totalSessions],
                      ["Views", liveInsights.snapshot.totalViews],
                      ["Funnel Visitors", liveInsights.snapshot.visitors],
                      ["Submissions", liveInsights.snapshot.submitSuccess],
                      ["CTA Rate", `${liveInsights.snapshot.ctaRate}%`],
                      ["Submit Rate", `${liveInsights.snapshot.submitRate}%`],
                    ].map(([label, value]) => (
                      <Card key={String(label)}>
                        <CardContent style={{ padding: 14 }}>
                          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "#330311" }}>{value as any}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                    {liveInsights.insights.map((ins) => {
                      const tone = ins.severity === "critical"
                        ? { border: "#dc2626", bg: "#fef2f2", fg: "#991b1b" }
                        : ins.severity === "high"
                        ? { border: "#ea580c", bg: "#fff7ed", fg: "#9a3412" }
                        : ins.severity === "medium"
                        ? { border: "#2563eb", bg: "#eff6ff", fg: "#1e40af" }
                        : { border: "#16a34a", bg: "#f0fdf4", fg: "#166534" };

                      return (
                        <Card key={ins.id}>
                          <CardContent style={{ padding: 16, borderLeft: `4px solid ${tone.border}`, background: tone.bg }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <h3 style={{ margin: 0, fontSize: 14, color: tone.fg, fontWeight: 800 }}>{ins.title}</h3>
                              <Badge variant="outline" style={{ fontSize: 10 }}>Priority {ins.priority}</Badge>
                            </div>
                            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
                              {ins.evidence}
                            </p>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                              Next steps
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
                              {ins.nextSteps.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: 11, color: "#6b7280", textAlign: "right" }}>
                    Updated {new Date(liveInsights.generatedAt).toLocaleString("en-GB")}
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
                    No live insight data yet.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && (
            <div style={{ display: "flex", gap: 20, height: "calc(100vh - 220px)" }}>
              {/* Left sidebar — quick prompts + hints */}
              <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                <Card>
                  <CardContent style={{ padding: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      Quick Questions
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {QUICK_PROMPTS.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(p)}
                          style={{
                            textAlign: "left", fontSize: 12, color: "#374151", padding: "8px 10px",
                            borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#fef3f7"; e.currentTarget.style.borderColor = "#330311"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent style={{ padding: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      <LinkIcon style={{ width: 12, height: 12, display: "inline", marginRight: 4, verticalAlign: "-1px" }} />
                      UTM Tip
                    </p>
                    <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
                      LinkedIn strips referrers by default. Add UTM tags to every post:
                    </p>
                    <code style={{ display: "block", marginTop: 8, fontSize: 11, background: "#f3f4f6", padding: 8, borderRadius: 6, wordBreak: "break-all" }}>
                      ?utm_source=linkedin&utm_medium=social&utm_campaign=iamher-aug26
                    </code>
                    <button
                      onClick={() => copyToClipboard("?utm_source=linkedin&utm_medium=social&utm_campaign=iamher-aug26")}
                      style={{ marginTop: 8, fontSize: 11, color: "#330311", fontWeight: 600, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Copy style={{ width: 12, height: 12 }} /> Copy tag
                    </button>
                  </CardContent>
                </Card>
              </div>

              {/* Main chat area */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                  {messages.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
                      <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, #330311 0%, #4a0520 100%)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, border: "2px solid #C9A961" }}>
                        <Sparkles style={{ width: 32, height: 32, color: "#C9A961" }} />
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#330311", margin: "0 0 6px" }}>Creative Director</h3>
                      <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 380, lineHeight: 1.6 }}>
                        The creative brain of Coca-Cola, Nike, and Apple. Ask me anything about your campaign big idea, brand arc, emotional hooks, funnel fixes, or content strategy. I have real-time access to your visitor data.
                      </p>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        background: msg.role === "user" ? "#330311" : "#fef3f7", border: msg.role === "user" ? "none" : "1px solid #330311"
                      }}>
                        {msg.role === "user" ? <User style={{ width: 16, height: 16, color: "#fff" }} /> : <Sparkles style={{ width: 16, height: 16, color: "#330311" }} />}
                      </div>
                      <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                        <div style={{
                          borderRadius: 14, padding: "12px 16px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap",
                          background: msg.role === "user" ? "#330311" : "#f9fafb",
                          color: msg.role === "user" ? "#fff" : "#111827",
                          border: msg.role === "user" ? "none" : "1px solid #e5e7eb",
                          borderTopRightRadius: msg.role === "user" ? 4 : 14,
                          borderTopLeftRadius: msg.role === "user" ? 14 : 4,
                        }}>
                          {msg.content}
                        </div>
                        {msg.role === "assistant" && (
                          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                            <button onClick={() => copyToClipboard(msg.content)} style={{ fontSize: 11, color: "#9ca3af", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <Copy style={{ width: 12, height: 12 }} /> Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef3f7", border: "1px solid #330311" }}>
                        <Sparkles style={{ width: 16, height: 16, color: "#330311" }} />
                      </div>
                      <div style={{ borderRadius: 14, padding: "12px 16px", background: "#f9fafb", border: "1px solid #e5e7eb", borderTopLeftRadius: 4 }}>
                        <Loader2 style={{ width: 16, height: 16, color: "#330311", animation: "spin 1s linear infinite" }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{ borderTop: "1px solid #e5e7eb", padding: 16, display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Ask your Creative Director anything..."
                      style={{ fontSize: 13, minHeight: 44 }}
                    />
                  </div>
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    style={{ background: "#330311", color: "#fff", border: "none", minHeight: 44, padding: "0 20px" }}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Plans Tab */}
          {activeTab === "plans" && (
            <div style={{ display: "flex", gap: 20, height: "calc(100vh - 220px)" }}>
              {/* Plans list */}
              <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
                {plans.length === 0 && (
                  <Card>
                    <CardContent style={{ padding: 24, textAlign: "center" }}>
                      <BookOpen style={{ width: 32, height: 32, color: "#d1d5db", margin: "0 auto 12px" }} />
                      <p style={{ fontSize: 13, color: "#6b7280" }}>No plans yet. Click "Generate Plan" to create your first marketing plan.</p>
                    </CardContent>
                  </Card>
                )}
                {plans.map((plan: MarketingPlan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    style={{
                      textAlign: "left", padding: 14, borderRadius: 10, border: selectedPlan?.id === plan.id ? "2px solid #330311" : "1px solid #e5e7eb",
                      background: "#fff", cursor: "pointer", transition: "all 0.15s", width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <FileText style={{ width: 14, height: 14, color: "#330311" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#330311" }}>{plan.title}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#9ca3af" }}>
                      <Calendar style={{ width: 12, height: 12 }} />
                      {new Date(plan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      <span style={{ marginLeft: "auto" }}>{plan.period_days} days</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Plan viewer */}
              <div style={{ flex: 1, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {selectedPlan ? (
                  <>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#330311", margin: 0 }}>{selectedPlan.title}</h2>
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>
                          Generated {new Date(selectedPlan.created_at).toLocaleString("en-GB")}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPlan(selectedPlan)}
                          style={{ fontSize: 12, borderColor: "#e5e7eb" }}
                        >
                          <Download style={{ width: 14, height: 14, marginRight: 6 }} /> Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePlan(selectedPlan.id)}
                          style={{ fontSize: 12, borderColor: "#e5e7eb", color: "#ef4444" }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </Button>
                      </div>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: 24, fontSize: 13, lineHeight: 1.8, color: "#374151" }}>
                      <div style={{ whiteSpace: "pre-wrap" }}>{selectedPlan.content}</div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af" }}>
                    <FileText style={{ width: 48, height: 48, marginBottom: 12, color: "#d1d5db" }} />
                    <p style={{ fontSize: 14 }}>Select a plan to view it</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
