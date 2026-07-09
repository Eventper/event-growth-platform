import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, FileText, Download, Printer, BarChart3, Users, DollarSign,
  CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown, Shield,
  ClipboardList, Truck, Calendar, Check, X, ChevronDown, ChevronUp,
  Plus, Trash2, Edit2, Save, Lightbulb, MessageSquare, Star, Award,
  PieChart, Target, UserCheck, BookOpen
} from "lucide-react";

function fmtCurrency(amount: number, currency: string) {
  const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", NGN: "₦", CAD: "C$", AUD: "A$" };
  return `${symbols[currency] || currency + " "}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-900/40 text-green-400", red: "bg-red-900/40 text-red-400",
    yellow: "bg-yellow-900/40 text-yellow-400", blue: "bg-blue-900/40 text-blue-400",
    gray: "bg-gray-800/40 text-gray-400", purple: "bg-purple-900/40 text-purple-400",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[color] || colors.gray}`}>{status}</span>;
}

export default function EventClosurePage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [newNote, setNewNote] = useState({ title: "", content: "", noteType: "lesson_learned" });
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const { data: closure, isLoading } = useQuery({
    queryKey: ["/api/events", eventId, "closure-package"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/closure-package`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load closure package");
      return res.json();
    },
    enabled: !!eventId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: any) => {
      return apiRequest("POST", `/api/events/${eventId}/notes`, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "closure-package"] });
      setNewNote({ title: "", content: "", noteType: "lesson_learned" });
      setShowAddNote(false);
      toast({ title: "Note added successfully" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "closure-package"] });
      toast({ title: "Note deleted" });
    },
  });

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  const isExpanded = (key: string) => expandedSections[key] !== false;

  const printReport = () => window.print();

  const downloadFullReport = () => {
    if (!closure) return;
    const e = closure.event;
    const f = closure.financials;
    const g = closure.guestSummary;
    const t = closure.taskSummary;
    const v = closure.vendorSummary;

    let csv = `EVENT CLOSURE REPORT\n`;
    csv += `Event Perfekt Global Ltd - Confidential\n\n`;
    csv += `Event: ${e.name}\nType: ${e.category || e.type}\nDate: ${fmtDate(e.startDate)}\nLocation: ${e.city || ''}, ${e.country || ''}\nStatus: ${e.status}\nGenerated: ${fmtDate(closure.generatedAt)}\n\n`;

    csv += `=== FINANCIAL SUMMARY ===\n`;
    csv += `Total Estimated,${f.totalEstimated}\nTotal Actual,${f.totalActual}\nTotal Paid,${f.totalPaid}\nOutstanding,${f.outstanding}\nVariance,${f.variance}\n\n`;

    csv += `=== BUDGET BY CATEGORY ===\nCategory,Estimated,Actual,Paid,Items\n`;
    Object.entries(f.categoryBreakdown).forEach(([cat, data]: [string, any]) => {
      csv += `"${cat}",${data.estimated},${data.actual},${data.paid},${data.count}\n`;
    });

    csv += `\n=== ALL BUDGET ITEMS ===\nItem,Category,Estimated,Actual,Paid,Status\n`;
    closure.allBudgetItems.forEach((b: any) => {
      csv += `"${b.name}","${b.category || ''}",${b.estimated || 0},${b.actual || 0},${b.paid || 0},${b.isPaid ? 'Paid' : 'Unpaid'}\n`;
    });

    csv += `\n=== GUEST SUMMARY ===\nTotal,${g.total}\nAccepted,${g.accepted}\nDeclined,${g.declined}\nChecked In,${g.checkedIn}\nNo Shows,${g.noShows}\nTables,${g.tables}\n`;

    csv += `\n=== GUEST LIST ===\nName,Group,RSVP,Checked In,Table,Plus Ones,Dietary,Meal\n`;
    closure.guestList.forEach((guest: any) => {
      csv += `"${guest.name}","${guest.group || ''}","${guest.rsvpStatus}","${guest.checkedIn ? 'Yes' : 'No'}","${guest.table || ''}",${guest.plusOnes || 0},"${guest.dietary || ''}","${guest.meal || ''}"\n`;
    });

    csv += `\n=== TASK SUMMARY ===\nTotal,${t.total}\nCompleted,${t.completed}\nCompletion Rate,${t.completionRate}%\nOverdue,${t.overdue}\n`;

    csv += `\n=== VENDOR SUMMARY ===\nTotal,${v.total}\nConfirmed,${v.confirmed}\n`;
    csv += `\nCompany,Service,Quoted,Final,Deposit,Payment,Contract\n`;
    v.vendors.forEach((vendor: any) => {
      csv += `"${vendor.company || ''}","${vendor.service || ''}",${vendor.quoted || 0},${vendor.final || 0},${vendor.deposit || 0},"${vendor.paymentStatus || ''}","${vendor.contractStatus || ''}"\n`;
    });

    csv += `\n=== LESSONS LEARNED ===\n`;
    closure.lessonsLearned.forEach((l: any) => {
      csv += `"${l.title}","${l.content}"\n`;
    });

    csv += `\n=== RECOMMENDATIONS ===\n`;
    closure.recommendations.forEach((r: any) => {
      csv += `"${r.title}","${r.content}"\n`;
    });

    csv += `\n=== CLOSURE CHECKLIST ===\nItem,Status,Detail\n`;
    closure.closureChecklist.forEach((c: any) => {
      csv += `"${c.item}","${c.status ? 'Complete' : 'Pending'}","${c.detail}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${e.name.replace(/\s+/g, '_')}_Full_Closure_Report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Full closure report downloaded" });
  };

  const SectionHeader = ({ title, sectionKey, icon: Icon, count, badge }: { title: string; sectionKey: string; icon: any; count?: number; badge?: string }) => (
    <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center justify-between py-3 text-left">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-white/60" />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {count !== undefined && <span className="text-gray-500 text-xs">({count})</span>}
        {badge && <StatusBadge status={badge} color={badge === "Complete" ? "green" : "yellow"} />}
      </div>
      {isExpanded(sectionKey) ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
    </button>
  );

  const tabs = [
    { key: "overview", label: "Overview", icon: <PieChart className="w-4 h-4" /> },
    { key: "financials", label: "Financials", icon: <DollarSign className="w-4 h-4" /> },
    { key: "guests", label: "Guests", icon: <Users className="w-4 h-4" /> },
    { key: "vendors", label: "Vendors", icon: <Truck className="w-4 h-4" /> },
    { key: "lessons", label: "Lessons & Notes", icon: <Lightbulb className="w-4 h-4" /> },
    { key: "checklist", label: "Closure Checklist", icon: <Shield className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Generating closure package...</p>
        </div>
      </div>
    );
  }

  if (!closure) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] flex items-center justify-center p-4">
        <Card className="bg-[#2a020d] border-[#4a0a1e] max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Unable to load closure package</h2>
            <Button onClick={() => setLocation(`/events/${eventId}`)} className="bg-white text-[#330311] mt-4">Back to Event</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const e = closure.event;
  const f = closure.financials;
  const g = closure.guestSummary;
  const t = closure.taskSummary;
  const v = closure.vendorSummary;
  const completedChecks = closure.closureChecklist.filter((c: any) => c.status).length;
  const totalChecks = closure.closureChecklist.length;
  const closureProgress = totalChecks > 0 ? Math.round(completedChecks / totalChecks * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] p-4 sm:p-6 print:bg-white print:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-white p-2" onClick={() => setLocation(`/events/${eventId}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Event Closure</h1>
              <p className="text-gray-400 text-sm">{e.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-white text-[#330311] font-semibold" onClick={downloadFullReport}>
              <Download className="w-4 h-4 mr-1" /> Download Full Report
            </Button>
            <Button size="sm" className="bg-[#4a0a1e] text-white" onClick={printReport}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button size="sm" className="bg-[#4a0a1e] text-white" onClick={() => setLocation(`/events/${eventId}/reports`)}>
              <FileText className="w-4 h-4 mr-1" /> Individual Reports
            </Button>
          </div>
        </header>

        <div className="print:hidden mb-6">
          <Card className="bg-[#2a020d] border-[#4a0a1e]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-white" />
                  <div>
                    <p className="text-white font-bold">{e.name}</p>
                    <p className="text-gray-400 text-xs">{e.category || e.type} | {e.city}, {e.country} | {fmtDate(e.startDate)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-bold">Closure Progress</p>
                  <p className={`text-xs font-medium ${closureProgress === 100 ? "text-green-400" : "text-yellow-400"}`}>{closureProgress}% ({completedChecks}/{totalChecks})</p>
                </div>
              </div>
              <div className="w-full bg-[#1a0108] rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${closureProgress === 100 ? "bg-green-500" : "bg-yellow-500"}`} style={{ width: `${closureProgress}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="print:hidden mb-6">
          <div className="flex bg-[#1a0108] rounded-xl p-1 border border-[#4a0a1e] overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key ? "bg-[#4a0a1e] text-white shadow-lg" : "text-white/50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="print:block">
          <div className="hidden print:block mb-8 text-center border-b-2 border-gray-300 pb-6">
            <p className="text-gray-500 text-xs uppercase tracking-widest">Event Perfekt Global Ltd</p>
            <h1 className="text-2xl font-bold mt-2">{e.name} — Event Closure Report</h1>
            <p className="text-gray-500 text-sm mt-1">{e.category || e.type} | {e.city}, {e.country} | {fmtDate(e.startDate)}</p>
            <p className="text-gray-400 text-xs mt-2">Generated: {fmtDate(closure.generatedAt)}</p>
          </div>
        </div>

        {(activeTab === "overview" || typeof window !== "undefined" && window.matchMedia?.("print")?.matches) && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <p className="text-white font-bold text-lg">{fmtCurrency(f.totalActual, e.currency)}</p>
                  <p className="text-gray-500 text-[10px] uppercase">Total Spend</p>
                  <p className={`text-[10px] mt-1 ${f.variance >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {f.variance >= 0 ? "Under" : "Over"} by {fmtCurrency(Math.abs(f.variance), e.currency)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-white font-bold text-lg">{g.total}</p>
                  <p className="text-gray-500 text-[10px] uppercase">Total Guests</p>
                  <p className="text-green-400 text-[10px] mt-1">{g.accepted} accepted | {g.checkedIn} attended</p>
                </CardContent>
              </Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <p className="text-white font-bold text-lg">{t.completionRate}%</p>
                  <p className="text-gray-500 text-[10px] uppercase">Tasks Done</p>
                  <p className="text-gray-400 text-[10px] mt-1">{t.completed}/{t.total} tasks</p>
                </CardContent>
              </Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-4 text-center">
                  <Truck className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <p className="text-white font-bold text-lg">{v.total}</p>
                  <p className="text-gray-500 text-[10px] uppercase">Vendors</p>
                  <p className="text-gray-400 text-[10px] mt-1">{v.confirmed} confirmed</p>
                </CardContent>
              </Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-4 text-center">
                  <Shield className={`w-5 h-5 mx-auto mb-1 ${closureProgress === 100 ? "text-green-400" : "text-yellow-400"}`} />
                  <p className="text-white font-bold text-lg">{closureProgress}%</p>
                  <p className="text-gray-500 text-[10px] uppercase">Closure</p>
                  <p className={`text-[10px] mt-1 ${closureProgress === 100 ? "text-green-400" : "text-yellow-400"}`}>{completedChecks}/{totalChecks} items</p>
                </CardContent>
              </Card>
            </div>

            {f.outstanding > 0 && (
              <Card className="bg-red-900/10 border-red-900/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-red-400 font-semibold text-sm">Outstanding Payments</p>
                    <p className="text-red-300 text-xs">{fmtCurrency(f.outstanding, e.currency)} still unpaid across {f.unpaidItems.length} items</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {t.overdue > 0 && (
              <Card className="bg-yellow-900/10 border-yellow-900/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-400 font-semibold text-sm">Overdue Tasks</p>
                    <p className="text-yellow-300 text-xs">{t.overdue} task{t.overdue > 1 ? "s" : ""} past due date</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {g.noShows > 0 && (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-4 flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-300 font-semibold text-sm">No-Shows</p>
                    <p className="text-gray-400 text-xs">{g.noShows} guest{g.noShows > 1 ? "s" : ""} accepted but did not check in</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "financials" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
                <p className="text-gray-500 text-[10px] uppercase">Estimated</p>
                <p className="text-white font-bold text-lg">{fmtCurrency(f.totalEstimated, e.currency)}</p>
              </CardContent></Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
                <p className="text-gray-500 text-[10px] uppercase">Actual</p>
                <p className="text-white font-bold text-lg">{fmtCurrency(f.totalActual, e.currency)}</p>
              </CardContent></Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
                <p className="text-gray-500 text-[10px] uppercase">Paid</p>
                <p className="text-green-400 font-bold text-lg">{fmtCurrency(f.totalPaid, e.currency)}</p>
              </CardContent></Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
                <p className="text-gray-500 text-[10px] uppercase">Outstanding</p>
                <p className={`font-bold text-lg ${f.outstanding > 0 ? "text-red-400" : "text-green-400"}`}>{fmtCurrency(f.outstanding, e.currency)}</p>
              </CardContent></Card>
            </div>

            <Card className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-5">
                <SectionHeader title="Budget Variance" sectionKey="variance" icon={BarChart3} />
                {isExpanded("variance") && (
                  <div className="pt-2">
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-[#1a0108]">
                      {f.variance >= 0 ? <TrendingDown className="w-5 h-5 text-green-400" /> : <TrendingUp className="w-5 h-5 text-red-400" />}
                      <div>
                        <p className={`font-bold ${f.variance >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {fmtCurrency(Math.abs(f.variance), e.currency)} {f.variance >= 0 ? "under budget" : "over budget"}
                        </p>
                        <p className="text-gray-400 text-xs">{f.variancePercent}% variance from estimated budget</p>
                      </div>
                    </div>
                    <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-[#330311] mb-2">
                      <div className="bg-green-500 rounded-l-full" style={{ width: `${Math.min(100, f.totalPaid / Math.max(1, f.totalEstimated) * 100)}%` }} />
                      <div className="bg-yellow-500" style={{ width: `${Math.min(100, Math.max(0, f.totalActual - f.totalPaid) / Math.max(1, f.totalEstimated) * 100)}%` }} />
                    </div>
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded bg-green-500 inline-block" /> Paid</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded bg-yellow-500 inline-block" /> Unpaid</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded bg-[#330311] inline-block" /> Remaining budget</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-5">
                <SectionHeader title="By Category" sectionKey="categories" icon={PieChart} count={Object.keys(f.categoryBreakdown).length} />
                {isExpanded("categories") && (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-500 uppercase text-[10px] border-b border-[#4a0a1e]">
                        <th className="text-left py-2">Category</th><th className="text-right py-2">Items</th><th className="text-right py-2">Estimated</th><th className="text-right py-2">Actual</th><th className="text-right py-2">Paid</th><th className="text-right py-2">Variance</th>
                      </tr></thead>
                      <tbody>
                        {Object.entries(f.categoryBreakdown).map(([cat, d]: [string, any]) => (
                          <tr key={cat} className="border-b border-[#4a0a1e]/50">
                            <td className="text-gray-300 py-2">{cat}</td>
                            <td className="text-white text-right py-2">{d.count}</td>
                            <td className="text-white text-right py-2">{fmtCurrency(d.estimated, e.currency)}</td>
                            <td className={`text-right py-2 ${d.actual > d.estimated ? "text-red-400" : "text-white"}`}>{fmtCurrency(d.actual, e.currency)}</td>
                            <td className="text-green-400 text-right py-2">{fmtCurrency(d.paid, e.currency)}</td>
                            <td className={`text-right py-2 ${d.estimated - d.actual >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtCurrency(d.estimated - d.actual, e.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr className="border-t-2 border-[#4a0a1e] font-bold">
                        <td className="text-white py-2">Total</td><td></td>
                        <td className="text-white text-right py-2">{fmtCurrency(f.totalEstimated, e.currency)}</td>
                        <td className="text-white text-right py-2">{fmtCurrency(f.totalActual, e.currency)}</td>
                        <td className="text-green-400 text-right py-2">{fmtCurrency(f.totalPaid, e.currency)}</td>
                        <td className={`text-right py-2 ${f.variance >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtCurrency(f.variance, e.currency)}</td>
                      </tr></tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-5">
                <SectionHeader title="All Budget Line Items" sectionKey="allItems" icon={ClipboardList} count={closure.allBudgetItems.length} />
                {isExpanded("allItems") && (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-500 uppercase text-[10px] border-b border-[#4a0a1e]">
                        <th className="text-left py-2">Item</th><th className="text-left py-2">Category</th><th className="text-right py-2">Estimated</th><th className="text-right py-2">Actual</th><th className="text-right py-2">Paid</th><th className="text-center py-2">Status</th>
                      </tr></thead>
                      <tbody>
                        {closure.allBudgetItems.map((b: any, i: number) => (
                          <tr key={i} className="border-b border-[#4a0a1e]/50">
                            <td className="text-gray-300 py-2">{b.name}</td><td className="text-gray-400 py-2">{b.category}</td>
                            <td className="text-white text-right py-2">{fmtCurrency(parseFloat(b.estimated || 0), e.currency)}</td>
                            <td className="text-white text-right py-2">{fmtCurrency(parseFloat(b.actual || 0), e.currency)}</td>
                            <td className="text-white text-right py-2">{fmtCurrency(parseFloat(b.paid || 0), e.currency)}</td>
                            <td className="text-center py-2">{b.isPaid ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <Clock className="w-4 h-4 text-yellow-400 mx-auto" />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {f.overBudgetItems.length > 0 && (
              <Card className="bg-red-900/10 border-red-900/30">
                <CardContent className="p-5">
                  <SectionHeader title="Over-Budget Items" sectionKey="overBudget" icon={AlertTriangle} count={f.overBudgetItems.length} />
                  {isExpanded("overBudget") && (
                    <div className="space-y-2 pt-2">
                      {f.overBudgetItems.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between p-3 rounded-lg bg-[#1a0108]">
                          <div>
                            <p className="text-white text-sm">{item.name}</p>
                            <p className="text-gray-500 text-xs">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-red-400 text-sm font-medium">+{fmtCurrency(item.over, e.currency)}</p>
                            <p className="text-gray-500 text-xs">Est: {fmtCurrency(parseFloat(item.estimated), e.currency)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {f.unpaidItems.length > 0 && (
              <Card className="bg-yellow-900/10 border-yellow-900/30">
                <CardContent className="p-5">
                  <SectionHeader title="Unpaid Items" sectionKey="unpaid" icon={Clock} count={f.unpaidItems.length} />
                  {isExpanded("unpaid") && (
                    <div className="space-y-2 pt-2">
                      {f.unpaidItems.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between p-3 rounded-lg bg-[#1a0108]">
                          <span className="text-gray-300 text-sm">{item.name} <span className="text-gray-500 text-xs">({item.category})</span></span>
                          <span className="text-yellow-400 text-sm font-medium">{fmtCurrency(parseFloat(String(item.amount || 0)), e.currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "guests" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total", value: g.total, color: "white" },
                { label: "Accepted", value: g.accepted, color: "text-green-400" },
                { label: "Checked In", value: g.checkedIn, color: "text-blue-400" },
                { label: "No Shows", value: g.noShows, color: "text-red-400" },
                { label: "Tables", value: g.tables, color: "text-purple-400" },
              ].map(s => (
                <Card key={s.label} className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
                  <p className={`${s.color} font-bold text-xl`}>{s.value}</p>
                  <p className="text-gray-500 text-[10px] uppercase">{s.label}</p>
                </CardContent></Card>
              ))}
            </div>

            <Card className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-5">
                <SectionHeader title="Full Guest List" sectionKey="guestList" icon={Users} count={g.total} />
                {isExpanded("guestList") && (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-500 uppercase text-[10px] border-b border-[#4a0a1e]">
                        <th className="text-left py-2">Name</th><th className="text-left py-2">Group</th><th className="text-center py-2">RSVP</th><th className="text-center py-2">Attended</th><th className="text-left py-2">Table</th><th className="text-center py-2">+</th><th className="text-left py-2">Dietary</th><th className="text-left py-2">Meal</th>
                      </tr></thead>
                      <tbody>
                        {closure.guestList.map((guest: any, i: number) => (
                          <tr key={i} className="border-b border-[#4a0a1e]/50">
                            <td className="text-white py-2 font-medium">{guest.name}</td>
                            <td className="text-gray-400 py-2">{guest.group || "—"}</td>
                            <td className="text-center py-2"><StatusBadge status={guest.rsvpStatus} color={guest.rsvpStatus === "accepted" ? "green" : guest.rsvpStatus === "declined" ? "red" : guest.rsvpStatus === "tentative" ? "yellow" : "gray"} /></td>
                            <td className="text-center py-2">{guest.checkedIn ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-gray-600 mx-auto" />}</td>
                            <td className="text-gray-300 py-2">{guest.table || "—"}</td>
                            <td className="text-white text-center py-2">{guest.plusOnes || 0}</td>
                            <td className="text-gray-400 py-2">{guest.dietary || "—"}</td>
                            <td className="text-gray-400 py-2">{guest.meal || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "vendors" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
                <p className="text-white font-bold text-xl">{v.total}</p><p className="text-gray-500 text-[10px] uppercase">Total Vendors</p>
              </CardContent></Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
                <p className="text-green-400 font-bold text-xl">{v.confirmed}</p><p className="text-gray-500 text-[10px] uppercase">Confirmed</p>
              </CardContent></Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
                <p className="text-white font-bold text-xl">{fmtCurrency(v.totalQuoted, e.currency)}</p><p className="text-gray-500 text-[10px] uppercase">Total Quoted</p>
              </CardContent></Card>
              <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
                <p className="text-white font-bold text-xl">{fmtCurrency(v.totalDeposit, e.currency)}</p><p className="text-gray-500 text-[10px] uppercase">Deposits Paid</p>
              </CardContent></Card>
            </div>

            <Card className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-5">
                <SectionHeader title="All Vendors" sectionKey="vendorList" icon={Truck} count={v.total} />
                {isExpanded("vendorList") && (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-500 uppercase text-[10px] border-b border-[#4a0a1e]">
                        <th className="text-left py-2">Company</th><th className="text-left py-2">Service</th><th className="text-right py-2">Quoted</th><th className="text-right py-2">Final</th><th className="text-right py-2">Deposit</th><th className="text-center py-2">Contract</th><th className="text-center py-2">Payment</th>
                      </tr></thead>
                      <tbody>
                        {v.vendors.map((vendor: any, i: number) => (
                          <tr key={i} className="border-b border-[#4a0a1e]/50">
                            <td className="text-white py-2 font-medium">{vendor.company || "—"}</td>
                            <td className="text-gray-400 py-2">{vendor.service || "—"}</td>
                            <td className="text-white text-right py-2">{vendor.quoted ? fmtCurrency(parseFloat(vendor.quoted), e.currency) : "—"}</td>
                            <td className="text-white text-right py-2">{vendor.final ? fmtCurrency(parseFloat(vendor.final), e.currency) : "—"}</td>
                            <td className="text-white text-right py-2">{vendor.deposit ? fmtCurrency(parseFloat(vendor.deposit), e.currency) : "—"}</td>
                            <td className="text-center py-2"><StatusBadge status={vendor.contractStatus || "pending"} color={vendor.contractStatus === "signed" ? "green" : "yellow"} /></td>
                            <td className="text-center py-2"><StatusBadge status={vendor.paymentStatus || "pending"} color={vendor.paymentStatus === "paid" ? "green" : vendor.paymentStatus === "partial" ? "yellow" : "gray"} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "lessons" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Lessons Learned, Notes & Recommendations</h2>
              <Button size="sm" className="bg-white text-[#330311]" onClick={() => setShowAddNote(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Note
              </Button>
            </div>

            {showAddNote && (
              <Card className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-5 space-y-3">
                  <div className="flex gap-2">
                    {[
                      { key: "lesson_learned", label: "Lesson Learned", icon: <Lightbulb className="w-3 h-3" /> },
                      { key: "recommendation", label: "Recommendation", icon: <Star className="w-3 h-3" /> },
                      { key: "closure", label: "Closure Note", icon: <BookOpen className="w-3 h-3" /> },
                      { key: "general", label: "General Note", icon: <MessageSquare className="w-3 h-3" /> },
                    ].map(type => (
                      <button key={type.key} onClick={() => setNewNote({ ...newNote, noteType: type.key })}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          newNote.noteType === type.key ? "bg-[#4a0a1e] text-white" : "bg-[#1a0108] text-gray-400"
                        }`}>
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                  <Input value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} placeholder="Title" className="bg-white text-black border-gray-300" />
                  <textarea value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })} placeholder="Details..." rows={4} className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm" />
                  <div className="flex gap-2">
                    <Button onClick={() => { if (newNote.title && newNote.content) addNoteMutation.mutate(newNote); }}
                      disabled={!newNote.title || !newNote.content || addNoteMutation.isPending}
                      className="bg-white text-[#330311]">
                      <Save className="w-4 h-4 mr-1" /> {addNoteMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" className="text-white border-white/70 hover:bg-white/10 hover:border-white" onClick={() => setShowAddNote(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {[
              { title: "Lessons Learned", items: closure.lessonsLearned, icon: Lightbulb, color: "yellow", emptyText: "No lessons recorded yet. Document what went well and what could be improved." },
              { title: "Recommendations", items: closure.recommendations, icon: Star, color: "blue", emptyText: "No recommendations yet. Add suggestions for future events." },
              { title: "Closure Notes", items: closure.closureNotes, icon: BookOpen, color: "purple", emptyText: "No closure notes yet. Add any final observations or notes." },
            ].map(section => (
              <Card key={section.title} className="bg-[#2a020d] border-[#4a0a1e]">
                <CardContent className="p-5">
                  <SectionHeader title={section.title} sectionKey={section.title} icon={section.icon} count={section.items.length} />
                  {isExpanded(section.title) && (
                    <div className="space-y-3 pt-2">
                      {section.items.length === 0 ? (
                        <div className="text-center py-6">
                          <section.icon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">{section.emptyText}</p>
                          <Button size="sm" className="mt-3 bg-[#4a0a1e] text-white" onClick={() => { setNewNote({ ...newNote, noteType: section.title === "Lessons Learned" ? "lesson_learned" : section.title === "Recommendations" ? "recommendation" : "closure" }); setShowAddNote(true); }}>
                            <Plus className="w-3 h-3 mr-1" /> Add {section.title.slice(0, -1)}
                          </Button>
                        </div>
                      ) : (
                        section.items.map((note: any) => (
                          <div key={note.id} className="p-4 rounded-lg bg-[#1a0108] border border-[#4a0a1e]">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-white font-medium text-sm">{note.title}</h4>
                                <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{note.content}</p>
                                <p className="text-gray-600 text-[10px] mt-2">{fmtDate(note.createdAt)}</p>
                              </div>
                              <Button size="sm" variant="ghost" className="text-red-400 p-1" onClick={() => deleteNoteMutation.mutate(note.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "checklist" && (
          <div className="space-y-4">
            <Card className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">Event Closure Checklist</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{completedChecks} of {totalChecks} items complete</p>
                  </div>
                  <div className={`text-2xl font-bold ${closureProgress === 100 ? "text-green-400" : "text-yellow-400"}`}>{closureProgress}%</div>
                </div>
                <div className="w-full bg-[#1a0108] rounded-full h-3 mb-6">
                  <div className={`h-3 rounded-full transition-all ${closureProgress === 100 ? "bg-green-500" : "bg-yellow-500"}`} style={{ width: `${closureProgress}%` }} />
                </div>
                <div className="space-y-2">
                  {closure.closureChecklist.map((item: any, i: number) => (
                    <div key={i} className={`flex items-center gap-3 p-4 rounded-lg border ${item.status ? "bg-green-900/10 border-green-900/30" : "bg-[#1a0108] border-[#4a0a1e]"}`}>
                      {item.status ? (
                        <div className="w-7 h-7 rounded-full bg-green-900/40 flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-green-400" /></div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-yellow-900/40 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-yellow-400" /></div>
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${item.status ? "text-green-300" : "text-yellow-300"}`}>{item.item}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{item.detail}</p>
                      </div>
                      <StatusBadge status={item.status ? "Complete" : "Pending"} color={item.status ? "green" : "yellow"} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {closureProgress === 100 && (
              <Card className="bg-green-900/10 border-green-800/50">
                <CardContent className="p-6 text-center">
                  <Award className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <h3 className="text-green-400 font-bold text-lg">Event Closure Complete</h3>
                  <p className="text-green-300/60 text-sm mt-1">All closure items have been resolved. This event is ready for final sign-off.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card className="bg-[#2a020d] border-[#4a0a1e] mt-6 print:bg-white print:border-gray-300">
          <CardContent className="p-4 text-center">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest">Confidential — End-to-End Event Closure Report</p>
            <p className="text-white text-xs font-semibold mt-1 print:text-black">Event Perfekt Global Ltd</p>
            <p className="text-gray-500 text-[10px]">Generated {fmtDate(closure.generatedAt)} | {e.name}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
