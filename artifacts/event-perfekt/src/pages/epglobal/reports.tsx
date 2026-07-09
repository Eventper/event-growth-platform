import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { epgFetch } from "@/lib/epglobal-auth";
import EPGlobalLayout from "@/components/EPGlobalLayout";
import { format, parseISO } from "date-fns";
import { Download, BarChart3, CheckSquare, FileText, ShieldCheck, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function downloadCSV(filename: string, rows: any[], columns: { key: string; label: string }[]) {
  const header = columns.map(c => c.label).join(",");
  const body = rows.map(r => columns.map(c => `"${String(r[c.key] || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const statusBadge: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  waiting: "bg-yellow-100 text-yellow-700",
  complete: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  sent: "bg-blue-100 text-blue-700",
};

export default function EPGlobalReports() {
  const [activeTab, setActiveTab] = useState<"summary" | "tasks" | "invoices" | "compliance">("summary");
  const [taskStatus, setTaskStatus] = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [invStatus, setInvStatus] = useState("");

  const { data: summary } = useQuery({
    queryKey: ["/api/epglobal/reports/summary"],
    queryFn: () => epgFetch("/api/epglobal/reports/summary"),
  });

  const { data: taskData = [] } = useQuery({
    queryKey: ["/api/epglobal/reports/tasks", taskStatus, taskCategory],
    queryFn: () => {
      const p = new URLSearchParams();
      if (taskStatus) p.set("status", taskStatus);
      if (taskCategory) p.set("category", taskCategory);
      return epgFetch(`/api/epglobal/reports/tasks?${p}`);
    },
    enabled: activeTab === "tasks",
  });

  const { data: invReport } = useQuery({
    queryKey: ["/api/epglobal/reports/invoices", invStatus],
    queryFn: () => epgFetch(`/api/epglobal/reports/invoices${invStatus ? `?status=${invStatus}` : ""}`),
    enabled: activeTab === "invoices",
  });

  const { data: complianceData = [] } = useQuery({
    queryKey: ["/api/epglobal/compliance"],
    queryFn: () => epgFetch("/api/epglobal/compliance"),
    enabled: activeTab === "compliance",
  });

  const fmt = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

  const tabs = [
    { key: "summary", label: "Overview", icon: BarChart3 },
    { key: "tasks", label: "Tasks Report", icon: CheckSquare },
    { key: "invoices", label: "Invoice Report", icon: FileText },
    { key: "compliance", label: "Compliance Report", icon: ShieldCheck },
  ];

  const s = summary as any;

  return (
    <EPGlobalLayout title="Reports" subtitle="Exportable reports and analytics">
      {/* Tab Nav */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1.5 mb-5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key ? "bg-[#1a3a6b] text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && s && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Tasks */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CheckSquare className="h-4 w-4 text-[#1a3a6b]" /> Tasks by Status</h3>
              <div className="space-y-2">
                {(s.tasks || []).map((r: any) => (
                  <div key={r.status} className="flex items-center justify-between">
                    <Badge className={`text-xs ${statusBadge[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status?.replace("_"," ")}</Badge>
                    <span className="text-sm font-semibold text-gray-900">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-[#1a3a6b]" /> Invoices by Status</h3>
              <div className="space-y-2">
                {(s.invoices || []).map((r: any) => (
                  <div key={r.status} className="flex items-center justify-between">
                    <Badge className={`text-xs ${statusBadge[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</Badge>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{r.count}</span>
                      {r.total && <span className="text-xs text-gray-400 ml-2">{fmt(Number(r.total))}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#1a3a6b]" /> Compliance by Status</h3>
              <div className="space-y-2">
                {(s.compliance || []).map((r: any) => (
                  <div key={r.status} className="flex items-center justify-between">
                    <Badge className={`text-xs ${statusBadge[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status?.replace("_"," ")}</Badge>
                    <span className="text-sm font-semibold text-gray-900">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-[#1a3a6b]" /> Activities by Status</h3>
              <div className="space-y-2">
                {(s.activities || []).map((r: any) => (
                  <div key={r.status} className="flex items-center justify-between">
                    <Badge className={`text-xs ${r.status === "active" ? "bg-green-100 text-green-700" : r.status === "complete" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{r.status?.replace("_"," ")}</Badge>
                    <span className="text-sm font-semibold text-gray-900">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-[#1a3a6b]" /> Payments by Status</h3>
              <div className="space-y-2">
                {(s.payments || []).map((r: any) => (
                  <div key={r.status} className="flex items-center justify-between">
                    <Badge className={`text-xs ${statusBadge[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</Badge>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{r.count}</span>
                      {r.total && <span className="text-xs text-gray-400 ml-2">{fmt(Number(r.total))}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Report Tab */}
      {activeTab === "tasks" && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              {["not_started","in_progress","waiting","complete","overdue"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
            </select>
            <select value={taskCategory} onChange={e => setTaskCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm capitalize">
              <option value="">All Categories</option>
              {["finance","operations","compliance","reporting","admin"].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
            <Button variant="outline" className="gap-2" onClick={() => downloadCSV("tasks-report.csv", taskData as any[], [
              { key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "priority", label: "Priority" },
              { key: "category", label: "Category" }, { key: "owner_name", label: "Owner" }, { key: "assignee_name", label: "Assigned To" },
              { key: "due_date", label: "Due Date" }, { key: "notes", label: "Notes" }
            ])}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Task</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Priority</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Category</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Owner</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(taskData as any[]).map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5"><p className="text-sm font-medium text-gray-900">{t.title}</p></td>
                      <td className="px-4 py-3.5"><Badge className={`text-xs ${statusBadge[t.status] || ""}`}>{t.status?.replace("_"," ")}</Badge></td>
                      <td className="px-4 py-3.5"><span className="text-sm capitalize text-gray-600">{t.priority}</span></td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-sm capitalize text-gray-600">{t.category}</span></td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-sm text-gray-600">{t.assignee_name || t.owner_name || "—"}</span></td>
                      <td className="px-4 py-3.5 hidden lg:table-cell"><span className="text-sm text-gray-600">{t.due_date ? format(parseISO(t.due_date), "d MMM yyyy") : "—"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(taskData as any[]).length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No tasks found</p>}
            </div>
          </div>
        </div>
      )}

      {/* Invoices Report */}
      {activeTab === "invoices" && invReport && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total Invoiced", val: fmt(Number((invReport as any).summary?.total || 0)), color: "bg-blue-50 border-blue-200 text-blue-800" },
              { label: "Paid", val: fmt(Number((invReport as any).summary?.paid || 0)), color: "bg-green-50 border-green-200 text-green-800" },
              { label: "Pending", val: fmt(Number((invReport as any).summary?.pending || 0)), color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
              { label: "Overdue", val: fmt(Number((invReport as any).summary?.overdue || 0)), color: "bg-red-50 border-red-200 text-red-800" },
            ].map(card => (
              <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
                <p className="text-xs font-medium opacity-70">{card.label}</p>
                <p className="text-lg font-bold mt-1">{card.val}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mb-4">
            <select value={invStatus} onChange={e => setInvStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              {["pending","sent","paid","overdue","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button variant="outline" className="gap-2" onClick={() => downloadCSV("invoices-report.csv", (invReport as any).invoices || [], [
              { key: "invoice_number", label: "Invoice Number" }, { key: "client", label: "Client" }, { key: "project_programme", label: "Project" },
              { key: "amount", label: "Amount" }, { key: "currency", label: "Currency" }, { key: "status", label: "Status" },
              { key: "due_date", label: "Due Date" }, { key: "owner_name", label: "Owner" }, { key: "notes", label: "Notes" }
            ])}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Invoice #","Client","Amount","Due Date","Status"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {((invReport as any).invoices || []).map((i: any) => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-sm font-medium text-[#1a3a6b]">{i.invoice_number}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">{i.client}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{new Intl.NumberFormat("en-GB",{style:"currency",currency:i.currency||"GBP"}).format(Number(i.amount||0))}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{i.due_date ? format(parseISO(i.due_date),"d MMM yyyy") : "—"}</td>
                      <td className="px-5 py-3.5"><Badge className={`text-xs ${statusBadge[i.status]||""}`}>{i.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Report */}
      {activeTab === "compliance" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button variant="outline" className="gap-2" onClick={() => downloadCSV("compliance-report.csv", complianceData as any[], [
              { key: "item_name", label: "Item" }, { key: "category", label: "Category" }, { key: "status", label: "Status" },
              { key: "deadline", label: "Deadline" }, { key: "owner_name", label: "Owner" }, { key: "notes", label: "Notes" }
            ])}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Item","Category","Deadline","Owner","Status"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(complianceData as any[]).map((i: any) => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{i.item_name}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{i.category || "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{i.deadline ? format(parseISO(i.deadline),"d MMM yyyy") : "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{i.owner_name || "—"}</td>
                      <td className="px-5 py-3.5"><Badge className={`text-xs ${statusBadge[i.status]||""}`}>{i.status?.replace("_"," ")}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </EPGlobalLayout>
  );
}
