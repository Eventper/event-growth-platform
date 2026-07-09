import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { epgFetch, useEPGlobalAuth } from "@/lib/epglobal-auth";
import EPGlobalLayout from "@/components/EPGlobalLayout";
import { format, isAfter, parseISO } from "date-fns";
import {
  CheckSquare, AlertTriangle, Clock, DollarSign, Bell, Calendar,
  ShieldCheck, ArrowRight, ExternalLink, CheckCircle2, TrendingUp,
  FileText, Activity, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  waiting: "bg-yellow-100 text-yellow-700",
  complete: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

const invStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const calendarTypeIcons: Record<string, any> = {
  meeting: Calendar,
  task_deadline: CheckSquare,
  finance_deadline: DollarSign,
  compliance_deadline: ShieldCheck,
  reporting_deadline: FileText,
  recurring_review: RefreshCw,
};

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function EPGlobalDashboard() {
  const { user } = useEPGlobalAuth();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/epglobal/dashboard"],
    queryFn: () => epgFetch("/api/epglobal/dashboard"),
    refetchInterval: 60000,
  });

  const markAlertRead = useMutation({
    mutationFn: (id: number) => epgFetch(`/api/epglobal/alerts/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/epglobal/dashboard"] }),
  });

  if (isLoading) return (
    <EPGlobalLayout>
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1a3a6b] border-t-transparent" />
      </div>
    </EPGlobalLayout>
  );

  const stats = data?.stats || {};
  const tasks = data?.recentTasks || [];
  const invoices = data?.recentInvoices || [];
  const alerts = (data?.alerts || []).filter((a: any) => !a.is_read);
  const calendar = data?.upcomingCalendar || [];
  const compliance = data?.upcomingCompliance || [];

  const isOverdue = (date: string) => date && isAfter(new Date(), parseISO(date));

  return (
    <EPGlobalLayout
      title={`Good morning, ${user?.name?.split(" ")[0]} 👋`}
      subtitle={`${format(new Date(), "EEEE, d MMMM yyyy")} · ${user?.role?.charAt(0).toUpperCase()}${user?.role?.slice(1)} Dashboard`}
    >
      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {alerts.slice(0, 3).map((a: any) => (
            <div key={a.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">{a.title}</p>
                {a.message && <p className="text-xs text-red-600 mt-0.5">{a.message}</p>}
              </div>
              <button
                onClick={() => markAlertRead.mutate(a.id)}
                className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open Tasks" value={stats.totalOpen || 0} icon={CheckSquare} color="bg-blue-100 text-blue-600" sub="Awaiting action" />
        <StatCard label="Overdue" value={stats.overdue || 0} icon={AlertTriangle} color="bg-red-100 text-red-600" sub="Need immediate attention" />
        <StatCard label="Due Today" value={stats.dueToday || 0} icon={Clock} color="bg-orange-100 text-orange-600" sub="Today's deadline" />
        <StatCard
          label="Invoiced"
          value={`£${Number(stats.totalInvoiced || 0).toLocaleString("en-GB", { minimumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="bg-green-100 text-green-600"
          sub={stats.totalOverdueInv > 0 ? `£${Number(stats.totalOverdueInv).toLocaleString("en-GB")} overdue` : "All current"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* My Tasks */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-[#1a3a6b]" /> Open Tasks
              </h2>
              <button onClick={() => setLocation("/epglobal/tasks")} className="text-sm text-[#1a3a6b] hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {tasks.length === 0 ? (
                <p className="px-5 py-6 text-center text-gray-400 text-sm">No open tasks — great work!</p>
              ) : tasks.map((task: any) => (
                <div key={task.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <Badge className={`text-xs ${priorityColors[task.priority] || ""}`}>{task.priority}</Badge>
                        <Badge className={`text-xs ${statusColors[task.status] || ""}`}>{task.status?.replace("_", " ")}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {task.assignee_name && <span>→ {task.assignee_name}</span>}
                        {task.due_date && (
                          <span className={isOverdue(task.due_date) ? "text-red-500 font-semibold" : ""}>
                            {isOverdue(task.due_date) ? "⚠ " : ""}Due {format(parseISO(task.due_date), "d MMM")}
                          </span>
                        )}
                        {task.category && <span className="capitalize">{task.category}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {task.quickbooks_link && (
                        <a href={task.quickbooks_link} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-700">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {task.project_co_link && (
                        <a href={task.project_co_link} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoices */}
          {(user?.role === "admin" || user?.role === "finance" || user?.role === "accountant") && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1a3a6b]" /> Recent Invoices
                </h2>
                <button onClick={() => setLocation("/epglobal/invoices")} className="text-sm text-[#1a3a6b] hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{inv.client}</p>
                        <p className="text-xs text-gray-400">{inv.invoice_number} {inv.project_programme ? `· ${inv.project_programme}` : ""}</p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">£{Number(inv.amount || 0).toLocaleString("en-GB")}</p>
                        <Badge className={`text-xs ${invStatusColors[inv.status] || ""}`}>{inv.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Calendar */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#1a3a6b]" /> Upcoming (14 days)
              </h2>
              <button onClick={() => setLocation("/epglobal/calendar")} className="text-sm text-[#1a3a6b] hover:underline">
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {calendar.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400 text-center">Nothing scheduled</p>
              ) : calendar.slice(0, 6).map((item: any) => {
                const ItemIcon = calendarTypeIcons[item.item_type] || Calendar;
                return (
                  <div key={item.id} className="px-5 py-3">
                    <div className="flex items-start gap-2.5">
                      <ItemIcon className="h-3.5 w-3.5 text-[#1a3a6b] mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                        <p className="text-xs text-gray-400">{format(parseISO(item.start_date), "EEE d MMM · HH:mm")}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#1a3a6b]" /> Compliance Due
              </h2>
              <button onClick={() => setLocation("/epglobal/compliance")} className="text-sm text-[#1a3a6b] hover:underline">
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {compliance.length === 0 ? (
                <p className="px-5 py-4 text-sm text-green-600 text-center flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> All clear
                </p>
              ) : compliance.map((item: any) => (
                <div key={item.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.item_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {item.deadline ? format(parseISO(item.deadline), "d MMM yyyy") : "No deadline"}
                    </span>
                    <Badge className={`text-xs ${
                      item.status === "overdue" ? "bg-red-100 text-red-700" :
                      item.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{item.status?.replace("_", " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-[#1a3a6b] rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3 text-sm">Quick Actions</h2>
            <div className="space-y-2">
              <Button size="sm" className="w-full bg-white text-[#1a3a6b] hover:bg-gray-100 justify-start gap-2" onClick={() => setLocation("/epglobal/tasks")}>
                <CheckSquare className="h-3.5 w-3.5" /> Create Task
              </Button>
              <Button size="sm" className="w-full bg-white/10 text-white hover:bg-white/20 justify-start gap-2" onClick={() => setLocation("/epglobal/invoices")}>
                <FileText className="h-3.5 w-3.5" /> Add Invoice
              </Button>
              <Button size="sm" className="w-full bg-white/10 text-white hover:bg-white/20 justify-start gap-2" onClick={() => setLocation("/epglobal/calendar")}>
                <Calendar className="h-3.5 w-3.5" /> Add Calendar Item
              </Button>
              <a href="https://quickbooks.intuit.com" target="_blank" rel="noreferrer">
                <Button size="sm" className="w-full bg-green-600 text-white hover:bg-green-700 justify-start gap-2 mt-1">
                  <ExternalLink className="h-3.5 w-3.5" /> Open QuickBooks
                </Button>
              </a>
              <a href="https://app.project.co" target="_blank" rel="noreferrer">
                <Button size="sm" className="w-full bg-blue-600 text-white hover:bg-blue-700 justify-start gap-2">
                  <ExternalLink className="h-3.5 w-3.5" /> Open Project.co
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </EPGlobalLayout>
  );
}
