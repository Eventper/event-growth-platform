import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { epgFetch } from "@/lib/epglobal-auth";
import EPGlobalLayout from "@/components/EPGlobalLayout";
import { format, parseISO } from "date-fns";
import { Plus, Search, Edit2, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const emptyForm = {
  payment_reference: "", recipient: "", country: "UK", amount: "", currency: "GBP",
  payment_method: "", status: "pending", proof_link: "", quickbooks_url: "",
  project_co_url: "", notes: "", payment_date: "",
};

export default function EPGlobalPayments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editPay, setEditPay] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["/api/epglobal/payments", filterStatus],
    queryFn: () => epgFetch(`/api/epglobal/payments${filterStatus ? `?status=${filterStatus}` : ""}`),
  });

  const createPay = useMutation({
    mutationFn: (data: any) => epgFetch("/api/epglobal/payments", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/payments"] }); setShowForm(false); setForm(emptyForm); toast({ title: "Payment added" }); },
  });

  const updatePay = useMutation({
    mutationFn: ({ id, data }: any) => epgFetch(`/api/epglobal/payments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/payments"] }); setEditPay(null); toast({ title: "Payment updated" }); },
  });

  const filtered = (payments as any[]).filter(p =>
    !search || p.recipient?.toLowerCase().includes(search.toLowerCase()) ||
    p.payment_reference?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number, c = "GBP") => new Intl.NumberFormat("en-GB", { style: "currency", currency: c }).format(n);

  const totalCompleted = filtered.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPending = filtered.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount || 0), 0);
  const missingProof = filtered.filter(p => p.status === "completed" && !p.proof_link).length;

  const PayForm = ({ onSubmit, initial, onCancel }: any) => {
    const [f, setF] = useState(initial || form);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="font-semibold text-gray-900 mb-4">{initial ? "Edit Payment" : "Add Payment"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reference *</label>
            <Input value={f.payment_reference} onChange={e => setF({...f, payment_reference: e.target.value})} placeholder="PAY-2025-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Recipient *</label>
            <Input value={f.recipient} onChange={e => setF({...f, recipient: e.target.value})} placeholder="Supplier name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
            <Input type="number" value={f.amount} onChange={e => setF({...f, amount: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
            <select value={f.currency} onChange={e => setF({...f, currency: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {["GBP","USD","EUR","NGN"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
            <select value={f.payment_method} onChange={e => setF({...f, payment_method: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Select...</option>
              {["Bank Transfer","Company Card","Direct Debit","Cheque","Cash"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={f.status} onChange={e => setF({...f, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {["pending","processing","completed","failed","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Date</label>
            <Input type="date" value={f.payment_date?.slice(0,10)} onChange={e => setF({...f, payment_date: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Proof of Payment Link</label>
            <Input value={f.proof_link} onChange={e => setF({...f, proof_link: e.target.value})} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">QuickBooks URL</label>
            <Input value={f.quickbooks_url} onChange={e => setF({...f, quickbooks_url: e.target.value})} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project.co URL</label>
            <Input value={f.project_co_url} onChange={e => setF({...f, project_co_url: e.target.value})} placeholder="https://..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <Input value={f.notes} onChange={e => setF({...f, notes: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onSubmit(f)} disabled={!f.payment_reference || !f.recipient} className="bg-[#1a3a6b] text-white">
            {initial ? "Save" : "Add Payment"}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  };

  return (
    <EPGlobalLayout title="Payments" subtitle="Track payments, proof of payment, and linked records">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium">Completed</p>
          <p className="text-xl font-bold text-green-800 mt-1">{fmt(totalCompleted)}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-xs text-yellow-600 font-medium">Pending</p>
          <p className="text-xl font-bold text-yellow-800 mt-1">{fmt(totalPending)}</p>
        </div>
        <div className={`rounded-xl p-4 ${missingProof > 0 ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}>
          <p className={`text-xs font-medium ${missingProof > 0 ? "text-red-600" : "text-gray-600"}`}>Missing Proof of Payment</p>
          <p className={`text-xl font-bold mt-1 ${missingProof > 0 ? "text-red-800" : "text-gray-800"}`}>{missingProof} payment{missingProof !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {["pending","processing","completed","failed","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={() => setShowForm(true)} className="bg-[#1a3a6b] text-white gap-2">
          <Plus className="h-4 w-4" /> Add Payment
        </Button>
      </div>

      {showForm && !editPay && <PayForm onSubmit={(f: any) => createPay.mutate(f)} onCancel={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1a3a6b] border-t-transparent" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Reference</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Recipient</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Method</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Proof</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((pay: any) => (
                  editPay?.id === pay.id ? (
                    <tr key={pay.id}><td colSpan={8} className="p-4">
                      <PayForm
                        initial={{...pay, payment_date: pay.payment_date?.slice(0,10)}}
                        onSubmit={(f: any) => updatePay.mutate({ id: pay.id, data: f })}
                        onCancel={() => setEditPay(null)}
                      />
                    </td></tr>
                  ) : (
                    <tr key={pay.id} className={`hover:bg-gray-50 transition-colors ${pay.status === "completed" && !pay.proof_link ? "bg-red-50/30" : ""}`}>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-[#1a3a6b]">{pay.payment_reference}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{pay.recipient}</p>
                        <p className="text-xs text-gray-400">{pay.country}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="text-sm font-bold text-gray-900">{fmt(Number(pay.amount || 0), pay.currency)}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell text-sm text-gray-600">{pay.payment_method || "—"}</td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-sm text-gray-600">
                        {pay.payment_date ? format(parseISO(pay.payment_date), "d MMM yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3.5"><Badge className={`text-xs ${statusColors[pay.status] || ""}`}>{pay.status}</Badge></td>
                      <td className="px-4 py-3.5">
                        {pay.proof_link ? (
                          <a href={pay.proof_link} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-700 flex items-center gap-1 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> View
                          </a>
                        ) : (
                          <span className={`text-xs ${pay.status === "completed" ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                            {pay.status === "completed" ? "⚠ Missing" : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setEditPay(pay)} className="text-gray-400 hover:text-[#1a3a6b] p-1 rounded hover:bg-gray-100">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No payments found</p>}
          </div>
        </div>
      )}
    </EPGlobalLayout>
  );
}
