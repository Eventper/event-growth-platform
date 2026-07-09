import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { epgFetch } from "@/lib/epglobal-auth";
import EPGlobalLayout from "@/components/EPGlobalLayout";
import { format, parseISO, differenceInDays } from "date-fns";
import { Plus, Search, Edit2, ExternalLink, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

const emptyForm = { item_name: "", category: "", deadline: "", owner_id: "", status: "pending", document_link: "", notes: "" };

export default function EPGlobalCompliance() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/epglobal/compliance"],
    queryFn: () => epgFetch("/api/epglobal/compliance"),
  });

  const { data: users = [] } = useQuery({ queryKey: ["/api/epglobal/users"], queryFn: () => epgFetch("/api/epglobal/users") });

  const createItem = useMutation({
    mutationFn: (data: any) => epgFetch("/api/epglobal/compliance", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/compliance"] }); setShowForm(false); setForm(emptyForm); toast({ title: "Compliance item added" }); },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }: any) => epgFetch(`/api/epglobal/compliance/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/compliance"] }); setEditItem(null); toast({ title: "Updated" }); },
  });

  const filtered = (items as any[]).filter(i =>
    !search || i.item_name?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase())
  );

  const urgent = filtered.filter(i => i.deadline && differenceInDays(parseISO(i.deadline), new Date()) <= 14 && i.status !== "complete").length;
  const complete = filtered.filter(i => i.status === "complete").length;
  const overdue = filtered.filter(i => i.deadline && differenceInDays(parseISO(i.deadline), new Date()) < 0 && i.status !== "complete").length;

  const CompForm = ({ onSubmit, initial, onCancel }: any) => {
    const [f, setF] = useState(initial || form);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="font-semibold text-gray-900 mb-4">{initial ? "Edit Compliance Item" : "Add Compliance Item"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Item Name *</label>
            <Input value={f.item_name} onChange={e => setF({...f, item_name: e.target.value})} placeholder="e.g. VAT Return Filing Q4 2024" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select value={f.category} onChange={e => setF({...f, category: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Select...</option>
              {["Tax","Insurance","GDPR","Legal","HR/Compliance","Regulatory","Other"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Deadline</label>
            <Input type="date" value={f.deadline?.slice(0,10)} onChange={e => setF({...f, deadline: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Owner</label>
            <select value={f.owner_id} onChange={e => setF({...f, owner_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Select owner...</option>
              {(users as any[]).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={f.status} onChange={e => setF({...f, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {["pending","in_progress","complete","overdue"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Document Link</label>
            <Input value={f.document_link} onChange={e => setF({...f, document_link: e.target.value})} placeholder="https://..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <Input value={f.notes} onChange={e => setF({...f, notes: e.target.value})} placeholder="Notes about this compliance item..." />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onSubmit(f)} disabled={!f.item_name} className="bg-[#1a3a6b] text-white">{initial ? "Save" : "Add Item"}</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  };

  return (
    <EPGlobalLayout title="Compliance Tracker" subtitle="Track deadlines, filings, and regulatory requirements">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className={`rounded-xl p-4 ${overdue > 0 ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${overdue > 0 ? "text-red-500" : "text-gray-400"}`} />
            <p className={`text-xs font-medium ${overdue > 0 ? "text-red-600" : "text-gray-600"}`}>Overdue</p>
          </div>
          <p className={`text-2xl font-bold mt-1 ${overdue > 0 ? "text-red-800" : "text-gray-800"}`}>{overdue}</p>
        </div>
        <div className={`rounded-xl p-4 ${urgent > 0 ? "bg-orange-50 border border-orange-200" : "bg-gray-50 border border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${urgent > 0 ? "text-orange-500" : "text-gray-400"}`} />
            <p className={`text-xs font-medium ${urgent > 0 ? "text-orange-600" : "text-gray-600"}`}>Due within 14 days</p>
          </div>
          <p className={`text-2xl font-bold mt-1 ${urgent > 0 ? "text-orange-800" : "text-gray-800"}`}>{urgent}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs font-medium text-green-600">Complete</p>
          </div>
          <p className="text-2xl font-bold text-green-800 mt-1">{complete}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search compliance items..." className="pl-9" />
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#1a3a6b] text-white gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {showForm && !editItem && <CompForm onSubmit={(f: any) => createItem.mutate(f)} onCancel={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1a3a6b] border-t-transparent" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => {
            const daysLeft = item.deadline ? differenceInDays(parseISO(item.deadline), new Date()) : null;
            const isUrgent = daysLeft !== null && daysLeft <= 14 && daysLeft >= 0 && item.status !== "complete";
            const isPastDue = daysLeft !== null && daysLeft < 0 && item.status !== "complete";

            return editItem?.id === item.id ? (
              <CompForm
                key={item.id}
                initial={{...item, deadline: item.deadline?.slice(0,10), owner_id: item.owner_id || ""}}
                onSubmit={(f: any) => updateItem.mutate({ id: item.id, data: f })}
                onCancel={() => setEditItem(null)}
              />
            ) : (
              <div key={item.id} className={`bg-white rounded-xl border p-5 ${isPastDue ? "border-red-200 bg-red-50/30" : isUrgent ? "border-orange-200" : "border-gray-200"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-900">{item.item_name}</p>
                      {item.category && <Badge className="text-xs bg-purple-100 text-purple-700">{item.category}</Badge>}
                      <Badge className={`text-xs ${statusColors[item.status] || ""}`}>{item.status?.replace("_"," ")}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      {item.deadline && (
                        <span className={isPastDue ? "text-red-600 font-semibold" : isUrgent ? "text-orange-600 font-semibold" : ""}>
                          {isPastDue ? `⚠ ${Math.abs(daysLeft!)} days overdue` :
                           isUrgent ? `⏰ ${daysLeft} days left` :
                           `Due ${format(parseISO(item.deadline), "d MMM yyyy")}`}
                        </span>
                      )}
                      {item.owner_name && <span>Owner: {item.owner_name}</span>}
                      {item.notes && <span className="italic">{item.notes}</span>}
                    </div>
                    {item.document_link && (
                      <a href={item.document_link} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="h-3 w-3" /> View Document
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {item.status !== "complete" && (
                      <button
                        onClick={() => updateItem.mutate({ id: item.id, data: { status: "complete" } })}
                        className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded bg-green-50 hover:bg-green-100"
                      >
                        Mark Done
                      </button>
                    )}
                    <button onClick={() => setEditItem(item)} className="text-gray-400 hover:text-[#1a3a6b] p-1 rounded hover:bg-gray-100">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No compliance items found</div>}
        </div>
      )}
    </EPGlobalLayout>
  );
}
