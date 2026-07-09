import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, BarChart3, Users, DollarSign, CheckCircle, Clock, AlertTriangle,
  TrendingUp, TrendingDown, Star, ThumbsUp, MessageSquare, Download, Printer,
  Plus, Trash2, Eye, Filter, ChevronDown, ChevronUp, Award, Target,
  PieChart, Smile, Frown, Meh, UserCheck, Building, ClipboardList, Shield, Loader2
} from "lucide-react";

function fmtCurrency(amount: number, currency: string) {
  const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", NGN: "₦", CAD: "C$", AUD: "A$", ZAR: "R", KES: "KSh", GHS: "GH₵" };
  return `${symbols[currency] || currency + " "}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const FEEDBACK_CATEGORIES = [
  { key: "venue", label: "Venue & Location" },
  { key: "food", label: "Food & Catering" },
  { key: "entertainment", label: "Entertainment" },
  { key: "organization", label: "Organization" },
  { key: "decoration", label: "Décor & Styling" },
  { key: "communication", label: "Communication" },
  { key: "service", label: "Service Quality" },
  { key: "value", label: "Value for Money" },
];

function StarRating({ value, onChange, readonly = false, size = "md" }: { value: number; onChange?: (v: number) => void; readonly?: boolean; size?: string }) {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sizeClass} ${i <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} ${!readonly ? "cursor-pointer hover:text-yellow-400" : ""}`}
          onClick={() => !readonly && onChange?.(i)}
        />
      ))}
    </div>
  );
}

function RatingBar({ label, value, max = 5, count }: { label: string; value: number; max?: number; count?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300 w-32 truncate">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-2.5">
        <div className="bg-yellow-400 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-white w-10 text-right">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-gray-400 w-8 text-right">({count})</span>}
    </div>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, color, trend }: { title: string; value: string | number; subtitle?: string; icon: any; color: string; trend?: string }) {
  const colors: Record<string, string> = {
    green: "from-green-600/20 to-green-900/10 border-green-500/30",
    blue: "from-blue-600/20 to-blue-900/10 border-blue-500/30",
    yellow: "from-yellow-600/20 to-yellow-900/10 border-yellow-500/30",
    red: "from-red-600/20 to-red-900/10 border-red-500/30",
    purple: "from-purple-600/20 to-purple-900/10 border-purple-500/30",
    burgundy: "from-[#330311]/30 to-[#1a0508]/20 border-[#8B1538]/40",
  };
  const iconColors: Record<string, string> = {
    green: "text-green-400", blue: "text-blue-400", yellow: "text-yellow-400",
    red: "text-red-400", purple: "text-purple-400", burgundy: "text-[#d4a0b0]",
  };
  return (
    <Card className={`bg-gradient-to-br ${colors[color] || colors.blue} border`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-black/20 ${iconColors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.startsWith("+") ? <TrendingUp className="w-3 h-3 text-green-400" /> : trend.startsWith("-") ? <TrendingDown className="w-3 h-3 text-red-400" /> : null}
            <span className="text-xs text-gray-400">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EventAnalyticsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterRating, setFilterRating] = useState("all");

  const [newFeedback, setNewFeedback] = useState({
    respondentType: "guest",
    respondentName: "",
    respondentEmail: "",
    overallRating: 0,
    categoryRatings: {} as Record<string, number>,
    comments: "",
    highlights: "",
    improvements: "",
    wouldRecommend: true,
    wouldAttendAgain: true,
    npsScore: 8,
  });

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/events", eventId, "analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/analytics`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    enabled: !!eventId,
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/events/${eventId}/feedback`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "analytics"] });
      setShowFeedbackForm(false);
      setNewFeedback({ respondentType: "guest", respondentName: "", respondentEmail: "", overallRating: 0, categoryRatings: {}, comments: "", highlights: "", improvements: "", wouldRecommend: true, wouldAttendAgain: true, npsScore: 8 });
      toast({ title: "Feedback submitted successfully" });
    },
    onError: () => toast({ title: "Failed to submit feedback", variant: "destructive" }),
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/feedback/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "analytics"] });
      toast({ title: "Feedback removed" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/feedback/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "analytics"] });
    },
  });

  const handleSubmitFeedback = () => {
    if (newFeedback.overallRating === 0) {
      toast({ title: "Please provide an overall rating", variant: "destructive" });
      return;
    }
    submitFeedbackMutation.mutate(newFeedback);
  };

  const exportFeedbackCSV = () => {
    if (!analytics?.feedback?.responses) return;
    let csv = "Name,Email,Type,Overall Rating,NPS Score,Would Recommend,Comments,Highlights,Improvements,Submitted\n";
    analytics.feedback.responses.forEach((f: any) => {
      csv += `"${f.respondentName || ''}","${f.respondentEmail || ''}","${f.respondentType}","${f.overallRating}","${f.npsScore || ''}","${f.wouldRecommend ? 'Yes' : 'No'}","${(f.comments || '').replace(/"/g, '""')}","${(f.highlights || '').replace(/"/g, '""')}","${(f.improvements || '').replace(/"/g, '""')}","${f.submittedAt || ''}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `feedback-${analytics?.event?.name || eventId}.csv`;
    a.click();
  };

  const printAnalytics = () => {
    const printContent = document.getElementById("analytics-print-area");
    if (!printContent) { window.print(); return; }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Event Analytics - ${analytics?.event?.name || ''}</title>
      <style>
        body { font-family: 'Poppins', sans-serif;, sans-serif; padding: 40px; color: #333; }
        h1 { color: #330311; border-bottom: 3px solid #8B1538; padding-bottom: 10px; }
        h2 { color: #8B1538; margin-top: 30px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
        .kpi-card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; }
        .kpi-value { font-size: 28px; font-weight: bold; color: #330311; }
        .kpi-label { font-size: 12px; color: #666; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #8B1538; text-align: center; color: #666; font-size: 12px; }
      </style></head><body>
      <h1>Post-Event Analytics Report</h1>
      <p><strong>Event:</strong> ${analytics?.event?.name || ''} | <strong>Date:</strong> ${analytics?.event?.startDate ? new Date(analytics.event.startDate).toLocaleDateString() : ''} | <strong>Status:</strong> ${analytics?.event?.status || ''}</p>
      
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Attendance Rate</div><div class="kpi-value">${analytics?.attendance?.attendanceRate || 0}%</div><div>${analytics?.attendance?.accepted || 0} of ${analytics?.attendance?.total || 0} guests</div></div>
        <div class="kpi-card"><div class="kpi-label">Budget Variance</div><div class="kpi-value">${analytics?.budget?.variance || 0}%</div><div>${fmtCurrency(analytics?.budget?.actual || 0, analytics?.event?.currency || 'USD')} spent</div></div>
        <div class="kpi-card"><div class="kpi-label">Task Completion</div><div class="kpi-value">${analytics?.tasks?.completionRate || 0}%</div><div>${analytics?.tasks?.completed || 0} of ${analytics?.tasks?.total || 0} tasks</div></div>
        <div class="kpi-card"><div class="kpi-label">Avg. Rating</div><div class="kpi-value">${analytics?.feedback?.averageRating || 'N/A'}</div><div>${analytics?.feedback?.total || 0} responses</div></div>
      </div>

      <h2>Feedback Responses</h2>
      <table><tr><th>Name</th><th>Type</th><th>Rating</th><th>NPS</th><th>Recommend</th><th>Comments</th></tr>
      ${(analytics?.feedback?.responses || []).map((f: any) => `<tr><td>${f.respondentName || 'Anonymous'}</td><td>${f.respondentType}</td><td>${f.overallRating}/5</td><td>${f.npsScore ?? '-'}</td><td>${f.wouldRecommend ? 'Yes' : 'No'}</td><td>${f.comments || '-'}</td></tr>`).join('')}
      </table>
      
      <div class="footer"><p>Generated by Event Perfekt Global Ltd | ${new Date().toLocaleDateString()}</p></div>
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredResponses = (analytics?.feedback?.responses || []).filter((f: any) => {
    if (filterType !== "all" && f.respondentType !== filterType) return false;
    if (filterRating !== "all" && f.overallRating !== parseInt(filterRating)) return false;
    return true;
  });

  const tabs = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "attendance", label: "Attendance", icon: Users },
    { key: "budget", label: "Budget Analysis", icon: DollarSign },
    { key: "feedback", label: "Feedback", icon: MessageSquare },
    { key: "responses", label: "Responses", icon: ClipboardList },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-[#8B1538] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const a = analytics || { event: {}, attendance: {}, budget: {}, tasks: {}, vendors: {}, staff: {}, feedback: {} };
  const currency = a.event?.currency || "USD";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation(`/events/${eventId}/dashboard`)} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Post-Event Analytics</h1>
              <p className="text-gray-400 text-sm">{a.event?.name || "Event"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportFeedbackCSV} className="border-gray-600 text-gray-300">
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={printAnalytics} className="border-gray-600 text-gray-300">
              <Printer className="w-4 h-4 mr-1" /> Print Report
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                ${activeTab === tab.key ? "text-[#d4a0b0] border-b-2 border-[#8B1538]" : "text-gray-400 hover:text-gray-200"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6" id="analytics-print-area">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="Attendance Rate" value={`${a.attendance?.attendanceRate || 0}%`} subtitle={`${a.attendance?.accepted || 0} of ${a.attendance?.total || 0} guests accepted`} icon={Users} color="blue" />
              <KPICard title="Budget Variance" value={`${a.budget?.variance > 0 ? '+' : ''}${a.budget?.variance || 0}%`} subtitle={`${fmtCurrency(a.budget?.actual || 0, currency)} actual spend`} icon={DollarSign} color={a.budget?.variance > 0 ? "red" : "green"} />
              <KPICard title="Task Completion" value={`${a.tasks?.completionRate || 0}%`} subtitle={`${a.tasks?.completed || 0} of ${a.tasks?.total || 0} tasks`} icon={CheckCircle} color={a.tasks?.completionRate >= 80 ? "green" : "yellow"} />
              <KPICard title="Avg Rating" value={a.feedback?.averageRating > 0 ? `${a.feedback.averageRating}/5` : "N/A"} subtitle={`${a.feedback?.total || 0} responses`} icon={Star} color="yellow" />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="Vendors" value={`${a.vendors?.confirmed || 0}/${a.vendors?.total || 0}`} subtitle="Confirmed" icon={Building} color="purple" />
              <KPICard title="Staff" value={`${a.staff?.approved || 0}/${a.staff?.total || 0}`} subtitle="Approved" icon={UserCheck} color="burgundy" />
              <KPICard title="NPS Score" value={a.feedback?.npsScore != null ? a.feedback.npsScore : "N/A"} subtitle="Net Promoter Score" icon={Target} color={a.feedback?.npsScore >= 50 ? "green" : a.feedback?.npsScore >= 0 ? "yellow" : "red"} />
              <KPICard title="Recommend Rate" value={`${a.feedback?.recommendRate || 0}%`} subtitle="Would recommend" icon={ThumbsUp} color="green" />
            </div>

            {/* Rating Distribution + Category Ratings side by side */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Rating Distribution */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2"><PieChart className="w-5 h-5 text-yellow-400" /> Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {a.feedback?.total > 0 ? (
                    [5, 4, 3, 2, 1].map(rating => {
                      const count = a.feedback?.ratingDistribution?.[rating] || 0;
                      const pct = a.feedback.total > 0 ? Math.round((count / a.feedback.total) * 100) : 0;
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-16">
                            <span className="text-sm text-white">{rating}</span>
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          </div>
                          <div className="flex-1 bg-gray-700 rounded-full h-3">
                            <div className="bg-yellow-400 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm text-gray-300 w-16 text-right">{count} ({pct}%)</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-center py-4">No feedback collected yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Category Averages */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2"><Award className="w-5 h-5 text-[#d4a0b0]" /> Category Ratings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.keys(a.feedback?.categoryAverages || {}).length > 0 ? (
                    Object.entries(a.feedback.categoryAverages).map(([key, val]) => {
                      const label = FEEDBACK_CATEGORIES.find(c => c.key === key)?.label || key;
                      return <RatingBar key={key} label={label} value={Number(val)} />;
                    })
                  ) : (
                    <p className="text-gray-500 text-center py-4">No category ratings yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Feedback Preview */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-400" /> Recent Feedback</CardTitle>
                  <Button size="sm" onClick={() => setShowFeedbackForm(true)} className="bg-[#8B1538] hover:bg-[#6d1030]">
                    <Plus className="w-4 h-4 mr-1" /> Add Feedback
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(a.feedback?.responses || []).length > 0 ? (
                  <div className="space-y-3">
                    {a.feedback.responses.slice(0, 5).map((f: any) => (
                      <div key={f.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className={`p-2 rounded-full ${f.respondentType === 'guest' ? 'bg-blue-900/40' : f.respondentType === 'vendor' ? 'bg-purple-900/40' : 'bg-green-900/40'}`}>
                          {f.respondentType === 'guest' ? <Users className="w-4 h-4 text-blue-400" /> : f.respondentType === 'vendor' ? <Building className="w-4 h-4 text-purple-400" /> : <UserCheck className="w-4 h-4 text-green-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{f.respondentName || "Anonymous"}</span>
                            <span className="text-xs text-gray-500 capitalize">{f.respondentType}</span>
                          </div>
                          <StarRating value={f.overallRating} readonly size="sm" />
                          {f.comments && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{f.comments}</p>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {f.submittedAt ? new Date(f.submittedAt).toLocaleDateString() : ""}
                        </div>
                      </div>
                    ))}
                    {a.feedback.responses.length > 5 && (
                      <button onClick={() => setActiveTab("responses")} className="text-sm text-[#d4a0b0] hover:underline">
                        View all {a.feedback.responses.length} responses →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No feedback collected yet</p>
                    <p className="text-gray-500 text-sm mt-1">Start collecting feedback from guests, clients, and vendors</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="Total Guests" value={a.attendance?.total || 0} icon={Users} color="blue" />
              <KPICard title="Accepted" value={a.attendance?.accepted || 0} subtitle={`${a.attendance?.attendanceRate || 0}% acceptance`} icon={CheckCircle} color="green" />
              <KPICard title="Declined" value={a.attendance?.declined || 0} icon={AlertTriangle} color="red" />
              <KPICard title="Pending" value={a.attendance?.pending || 0} icon={Clock} color="yellow" />
            </div>

            {/* Attendance Visual */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">RSVP Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {a.attendance?.total > 0 ? (
                  <div className="space-y-4">
                    <div className="flex h-8 rounded-full overflow-hidden">
                      {a.attendance.accepted > 0 && (
                        <div className="bg-green-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(a.attendance.accepted / a.attendance.total) * 100}%` }}>
                          {a.attendance.accepted}
                        </div>
                      )}
                      {a.attendance.declined > 0 && (
                        <div className="bg-red-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(a.attendance.declined / a.attendance.total) * 100}%` }}>
                          {a.attendance.declined}
                        </div>
                      )}
                      {a.attendance.pending > 0 && (
                        <div className="bg-yellow-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(a.attendance.pending / a.attendance.total) * 100}%` }}>
                          {a.attendance.pending}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-6 justify-center">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full" /><span className="text-sm text-gray-300">Accepted ({a.attendance.accepted})</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full" /><span className="text-sm text-gray-300">Declined ({a.attendance.declined})</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full" /><span className="text-sm text-gray-300">Pending ({a.attendance.pending})</span></div>
                    </div>

                    {a.attendance.checkedIn > 0 && (
                      <div className="mt-4 p-4 bg-gray-800/50 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Checked In</p>
                        <p className="text-3xl font-bold text-white">{a.attendance.checkedIn}</p>
                        <p className="text-gray-500 text-sm">{a.attendance.total > 0 ? Math.round((a.attendance.checkedIn / a.attendance.total) * 100) : 0}% of total guests</p>
                      </div>
                    )}

                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400 text-sm mb-2">Event Capacity</p>
                      <p className="text-sm text-gray-300">Expected: <strong className="text-white">{a.event?.guestCount || 0}</strong> | Actual RSVPs: <strong className="text-white">{a.attendance.total}</strong></p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No guest data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Budget Analysis Tab */}
        {activeTab === "budget" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="Total Budget" value={fmtCurrency(a.budget?.total || 0, currency)} icon={DollarSign} color="blue" />
              <KPICard title="Estimated Spend" value={fmtCurrency(a.budget?.estimated || 0, currency)} subtitle={`${a.budget?.utilization || 0}% utilization`} icon={Target} color="purple" />
              <KPICard title="Actual Spend" value={fmtCurrency(a.budget?.actual || 0, currency)} icon={DollarSign} color={a.budget?.actual > a.budget?.total ? "red" : "green"} />
              <KPICard title="Variance" value={`${a.budget?.variance > 0 ? '+' : ''}${a.budget?.variance || 0}%`} subtitle={a.budget?.variance > 0 ? "Over budget" : "Under budget"} icon={a.budget?.variance > 0 ? TrendingUp : TrendingDown} color={a.budget?.variance > 0 ? "red" : "green"} />
            </div>

            {/* Budget By Category */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(a.budget?.byCategory || {}).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(a.budget.byCategory as Record<string, { estimated: number; actual: number }>)
                      .sort(([, a], [, b]) => b.estimated - a.estimated)
                      .map(([cat, data]) => {
                        const pct = a.budget.estimated > 0 ? (data.estimated / a.budget.estimated) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">{cat}</span>
                              <span className="text-gray-400">{fmtCurrency(data.estimated, currency)} est / {fmtCurrency(data.actual, currency)} actual</span>
                            </div>
                            <div className="flex h-3 rounded-full overflow-hidden bg-gray-700">
                              <div className="bg-[#8B1538] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No budget data available</p>
                )}
              </CardContent>
            </Card>

            {/* Vendor Payment Status */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Vendor & Staff Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Vendors</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-gray-300">Total Vendors</span><span className="text-white font-medium">{a.vendors?.total || 0}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-300">Confirmed</span><span className="text-green-400 font-medium">{a.vendors?.confirmed || 0}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-300">Paid</span><span className="text-blue-400 font-medium">{a.vendors?.paid || 0}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Internal Staff</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-gray-300">Total Staff</span><span className="text-white font-medium">{a.staff?.total || 0}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-300">Approved</span><span className="text-green-400 font-medium">{a.staff?.approved || 0}</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feedback Collection Tab */}
        {activeTab === "feedback" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Feedback Collection</h2>
              <Button onClick={() => setShowFeedbackForm(true)} className="bg-[#8B1538] hover:bg-[#6d1030]">
                <Plus className="w-4 h-4 mr-1" /> Add Feedback
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="Total Responses" value={a.feedback?.total || 0} icon={MessageSquare} color="blue" />
              <KPICard title="Avg Rating" value={a.feedback?.averageRating > 0 ? `${a.feedback.averageRating}/5` : "N/A"} icon={Star} color="yellow" />
              <KPICard title="NPS Score" value={a.feedback?.npsScore ?? "N/A"} icon={Target} color={a.feedback?.npsScore >= 50 ? "green" : "yellow"} />
              <KPICard title="Would Recommend" value={`${a.feedback?.recommendRate || 0}%`} icon={ThumbsUp} color="green" />
            </div>

            {/* NPS Explanation */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2"><Target className="w-5 h-5 text-blue-400" /> Net Promoter Score (NPS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className={`text-4xl font-bold ${(a.feedback?.npsScore ?? 0) >= 50 ? 'text-green-400' : (a.feedback?.npsScore ?? 0) >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {a.feedback?.npsScore ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">NPS Score</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Smile className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-300">Promoters (9-10): Very likely to recommend</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Meh className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-300">Passives (7-8): Satisfied but not enthusiastic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Frown className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-gray-300">Detractors (0-6): Unlikely to recommend</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Respondent Breakdown */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Respondent Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(a.feedback?.respondentBreakdown || {}).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(a.feedback.respondentBreakdown as Record<string, number>).map(([type, count]) => (
                      <div key={type} className="text-center p-4 bg-gray-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-white">{count as number}</p>
                        <p className="text-sm text-gray-400 capitalize">{type}s</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No responses yet</p>
                )}
              </CardContent>
            </Card>

            {/* Category Ratings */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2"><Award className="w-5 h-5 text-yellow-400" /> Category Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.keys(a.feedback?.categoryAverages || {}).length > 0 ? (
                  Object.entries(a.feedback.categoryAverages)
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .map(([key, val]) => {
                      const label = FEEDBACK_CATEGORIES.find(c => c.key === key)?.label || key;
                      return <RatingBar key={key} label={label} value={Number(val)} />;
                    })
                ) : (
                  <p className="text-gray-500 text-center py-4">No category ratings available</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Responses Tab */}
        {activeTab === "responses" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold">All Feedback Responses</h2>
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportFeedbackCSV} className="border-gray-600 text-gray-300">
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            {filteredResponses.length > 0 ? (
              <div className="space-y-4">
                {filteredResponses.map((f: any) => (
                  <Card key={f.id} className="bg-gray-900/50 border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full flex-shrink-0 ${f.respondentType === 'guest' ? 'bg-blue-900/40' : f.respondentType === 'vendor' ? 'bg-purple-900/40' : f.respondentType === 'client' ? 'bg-green-900/40' : 'bg-gray-800'}`}>
                            {f.respondentType === 'guest' ? <Users className="w-5 h-5 text-blue-400" /> : f.respondentType === 'vendor' ? <Building className="w-5 h-5 text-purple-400" /> : <UserCheck className="w-5 h-5 text-green-400" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white">{f.respondentName || "Anonymous"}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 capitalize">{f.respondentType}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${f.status === 'reviewed' ? 'bg-green-900/40 text-green-400' : f.status === 'flagged' ? 'bg-red-900/40 text-red-400' : 'bg-gray-800 text-gray-400'}`}>{f.status}</span>
                            </div>
                            <StarRating value={f.overallRating} readonly size="sm" />
                            {f.respondentEmail && <p className="text-xs text-gray-500 mt-1">{f.respondentEmail}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{f.submittedAt ? new Date(f.submittedAt).toLocaleDateString() : ''}</span>
                          <Select defaultValue={f.status} onValueChange={(status) => updateStatusMutation.mutate({ id: f.id, status })}>
                            <SelectTrigger className="w-[100px] h-7 text-xs bg-gray-800 border-gray-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="reviewed">Reviewed</SelectItem>
                              <SelectItem value="flagged">Flagged</SelectItem>
                            </SelectContent>
                          </Select>
                          {updateStatusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-red-400" onClick={() => deleteFeedbackMutation.mutate(f.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {(f.comments || f.highlights || f.improvements) && (
                        <div className="mt-3 ml-12 space-y-2">
                          {f.comments && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Comments</p>
                              <p className="text-sm text-gray-300">{f.comments}</p>
                            </div>
                          )}
                          {f.highlights && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Highlights</p>
                              <p className="text-sm text-green-300">{f.highlights}</p>
                            </div>
                          )}
                          {f.improvements && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Areas for Improvement</p>
                              <p className="text-sm text-yellow-300">{f.improvements}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {f.categoryRatings && Object.keys(f.categoryRatings).length > 0 && (
                        <div className="mt-3 ml-12">
                          <p className="text-xs text-gray-500 font-medium mb-2">Category Ratings</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(f.categoryRatings).map(([key, val]) => (
                              <div key={key} className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 capitalize">{key}:</span>
                                <StarRating value={Number(val)} readonly size="sm" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 ml-12 flex gap-4 text-xs text-gray-500">
                        {f.npsScore != null && <span>NPS: <strong className="text-white">{f.npsScore}</strong></span>}
                        {f.wouldRecommend != null && <span>Recommend: <strong className={f.wouldRecommend ? "text-green-400" : "text-red-400"}>{f.wouldRecommend ? "Yes" : "No"}</strong></span>}
                        {f.wouldAttendAgain != null && <span>Attend again: <strong className={f.wouldAttendAgain ? "text-green-400" : "text-red-400"}>{f.wouldAttendAgain ? "Yes" : "No"}</strong></span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No feedback responses {filterType !== "all" || filterRating !== "all" ? "match your filters" : "yet"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Feedback Form Dialog */}
        <Dialog open={showFeedbackForm} onOpenChange={setShowFeedbackForm}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Collect Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm">Respondent Type</Label>
                  <Select value={newFeedback.respondentType} onValueChange={v => setNewFeedback({ ...newFeedback, respondentType: v })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Name</Label>
                  <Input value={newFeedback.respondentName} onChange={e => setNewFeedback({ ...newFeedback, respondentName: e.target.value })} className="bg-gray-800 border-gray-700 text-white" placeholder="Respondent name" />
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-sm">Email</Label>
                <Input type="email" value={newFeedback.respondentEmail} onChange={e => setNewFeedback({ ...newFeedback, respondentEmail: e.target.value })} className="bg-gray-800 border-gray-700 text-white" placeholder="email@example.com" />
              </div>

              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Overall Rating *</Label>
                <StarRating value={newFeedback.overallRating} onChange={v => setNewFeedback({ ...newFeedback, overallRating: v })} size="lg" />
              </div>

              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Category Ratings</Label>
                <div className="grid grid-cols-2 gap-3">
                  {FEEDBACK_CATEGORIES.map(cat => (
                    <div key={cat.key} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-xs text-gray-300">{cat.label}</span>
                      <StarRating value={newFeedback.categoryRatings[cat.key] || 0} onChange={v => setNewFeedback({ ...newFeedback, categoryRatings: { ...newFeedback.categoryRatings, [cat.key]: v } })} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-sm">NPS Score (0-10): How likely to recommend?</Label>
                <div className="flex gap-1 mt-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button key={n} onClick={() => setNewFeedback({ ...newFeedback, npsScore: n })}
                      className={`w-8 h-8 rounded text-xs font-medium transition-colors ${newFeedback.npsScore === n ? (n >= 9 ? 'bg-green-600 text-white' : n >= 7 ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white') : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">0 = Not at all likely | 10 = Extremely likely</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newFeedback.wouldRecommend} onChange={e => setNewFeedback({ ...newFeedback, wouldRecommend: e.target.checked })} className="rounded border-gray-600" />
                  <span className="text-sm text-gray-300">Would recommend</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newFeedback.wouldAttendAgain} onChange={e => setNewFeedback({ ...newFeedback, wouldAttendAgain: e.target.checked })} className="rounded border-gray-600" />
                  <span className="text-sm text-gray-300">Would attend again</span>
                </label>
              </div>

              <div>
                <Label className="text-gray-300 text-sm">Comments</Label>
                <Textarea value={newFeedback.comments} onChange={e => setNewFeedback({ ...newFeedback, comments: e.target.value })} className="bg-gray-800 border-gray-700 text-white" placeholder="General comments about the event..." rows={3} />
              </div>

              <div>
                <Label className="text-gray-300 text-sm">Highlights</Label>
                <Textarea value={newFeedback.highlights} onChange={e => setNewFeedback({ ...newFeedback, highlights: e.target.value })} className="bg-gray-800 border-gray-700 text-white" placeholder="What did you enjoy most?" rows={2} />
              </div>

              <div>
                <Label className="text-gray-300 text-sm">Areas for Improvement</Label>
                <Textarea value={newFeedback.improvements} onChange={e => setNewFeedback({ ...newFeedback, improvements: e.target.value })} className="bg-gray-800 border-gray-700 text-white" placeholder="What could be improved?" rows={2} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowFeedbackForm(false)} className="border-gray-600 text-gray-300">Cancel</Button>
                <Button onClick={handleSubmitFeedback} disabled={submitFeedbackMutation.isPending} className="bg-[#8B1538] hover:bg-[#6d1030]">
                  {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}