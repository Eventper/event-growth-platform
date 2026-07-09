import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { epgFetch, useEPGlobalAuth } from "@/lib/epglobal-auth";
import EPGlobalLayout from "@/components/EPGlobalLayout";
import { format, parseISO } from "date-fns";
import { Plus, Search, Edit2, ExternalLink, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const emptyForm = {
  invoice_number: "", client: "", project_programme: "", country: "UK",
  amount: "", currency: "GBP", due_date: "", status: "pending",
  quickbooks_url: "", project_co_url: "", document_link: "", notes: "",
};

export default function EPGlobalInvoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useEPGlobalAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editInv, setEditInv] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/epglobal/invoices", filterStatus],
    queryFn: () => epgFetch(`/api/epglobal/invoices${filterStatus ? `?status=${filterStatus}` : ""}`),
  });

  const { data: users = [] } = useQuery({ queryKey: ["/api/epglobal/users"], queryFn: () => epgFetch("/api/epglobal/users") });

  const createInv = useMutation({
    mutationFn: (data: any) => epgFetch("/api/epglobal/invoices", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/invoices"] }); setShowForm(false); setForm(emptyForm); toast({ title: "Invoice added" }); },
  });

  const updateInv = useMutation({
    mutationFn: ({ id, data }: any) => epgFetch(`/api/epglobal/invoices/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/invoices"] }); setEditInv(null); toast({ title: "Invoice updated" }); },
  });

  const filtered = (invoices as any[]).filter(i =>
    !search || i.client?.toLowerCase().includes(search.toLowerCase()) ||
    i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.project_programme?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPaid = filtered.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalPending = filtered.filter(i => i.status === "pending" || i.status === "sent").reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalOverdue = filtered.filter(i => i.status === "overdue").reduce((s, i) => s + Number(i.amount || 0), 0);

  const fmt = (n: number, c = "GBP") => new Intl.NumberFormat("en-GB", { style: "currency", currency: c }).format(n);

  const InvForm = ({ onSubmit, initial, onCancel }: any) => {
    const [f, setF] = useState(initial || form);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="font-semibold text-gray-900 mb-4">{initial ? "Edit Invoice" : "Add Invoice"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Number *</label>
            <Input value={f.invoice_number} onChange={e => setF({...f, invoice_number: e.target.value})} placeholder="INV-2025-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Client *</label>
            <Input value={f.client} onChange={e => setF({...f, client: e.target.value})} placeholder="Client name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project/Programme</label>
            <Input value={f.project_programme} onChange={e => setF({...f, project_programme: e.target.value})} placeholder="Project name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
            <Input type="number" value={f.amount} onChange={e => setF({...f, amount: e.target.value})} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
            <select value={f.currency} onChange={e => setF({...f, currency: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {["GBP","USD","EUR","NGN"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
            <Input type="date" value={f.due_date?.slice(0,10)} onChange={e => setF({...f, due_date: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={f.status} onChange={e => setF({...f, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {["pending","sent","paid","overdue","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
            <Input value={f.country} onChange={e => setF({...f, country: e.target.value})} placeholder="UK" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">QuickBooks URL</label>
            <Input value={f.quickbooks_url} onChange={e => setF({...f, quickbooks_url: e.target.value})} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project.co URL</label>
            <Input value={f.project_co_url} onChange={e => setF({...f, project_co_url: e.target.value})} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Document Link</label>
            <Input value={f.document_link} onChange={e => setF({...f, document_link: e.target.value})} placeholder="https://..." />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <Input value={f.notes} onChange={e => setF({...f, notes: e.target.value})} placeholder="Notes about this invoice..." />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onSubmit(f)} disabled={!f.invoice_number || !f.client} className="bg-[#1a3a6b] text-white">
            {initial ? "Save Changes" : "Add Invoice"}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  };

  return (
    <EPGlobalLayout title="Invoices" subtitle="Track and manage all invoice control cards">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium">Paid</p>
          <p className="text-xl font-bold text-green-800 mt-1">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium">Pending / Sent</p>
          <p className="text-xl font-bold text-blue-800 mt-1">{fmt(totalPending)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium">Overdue</p>
          <p className="text-xl font-bold text-red-800 mt-1">{fmt(totalOverdue)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {["pending","sent","paid","overdue","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={() => { setShowForm(true); setEditInv(null); }} className="bg-[#1a3a6b] text-white gap-2">
          <Plus className="h-4 w-4" /> Add Invoice
        </Button>
      </div>

      {showForm && !editInv && <InvForm onSubmit={(f: any) => createInv.mutate(f)} onCancel={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1a3a6b] border-t-transparent" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Invoice #</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Project</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Due</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Links</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inv: any) => (
                  editInv?.id === inv.id ? (
                    <tr key={inv.id}><td colSpan={8} className="p-4">
                      <InvForm
                        initial={{...inv, due_date: inv.due_date ? inv.due_date.slice(0,10) : ""}}
                        onSubmit={(f: any) => updateInv.mutate({ id: inv.id, data: f })}
                        onCancel={() => setEditInv(null)}
                      />
                    </td></tr>
                  ) : (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-[#1a3a6b]">{inv.invoice_number}</p>
                        {inv.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]">{inv.notes}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{inv.client}</p>
                        <p className="text-xs text-gray-400">{inv.country}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-gray-600">{inv.project_programme || "—"}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="text-sm font-bold text-gray-900">{fmt(Number(inv.amount || 0), inv.currency)}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <p className="text-sm text-gray-600">{inv.due_date ? format(parseISO(inv.due_date), "d MMM yyyy") : "—"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge className={`text-xs ${statusColors[inv.status] || ""}`}>{inv.status}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          {inv.quickbooks_url && <a href={inv.quickbooks_url} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-700" title="QuickBooks"><ExternalLink className="h-3.5 w-3.5" /></a>}
                          {inv.project_co_url && <a href={inv.project_co_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700" title="Project.co"><ExternalLink className="h-3.5 w-3.5" /></a>}
                          {inv.document_link && <a href={inv.document_link} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-700" title="Document"><ExternalLink className="h-3.5 w-3.5" /></a>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setEditInv(inv)} className="text-gray-400 hover:text-[#1a3a6b] p-1 rounded hover:bg-gray-100">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No invoices found</p>}
          </div>
        </div>
      )}
    </EPGlobalLayout>
  );
}
