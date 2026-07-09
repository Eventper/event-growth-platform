import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { epgFetch } from "@/lib/epglobal-auth";
import EPGlobalLayout from "@/components/EPGlobalLayout";
import { format, parseISO, isAfter } from "date-fns";
import { Plus, Search, Edit2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  complete: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const emptyForm = {
  name: "", project_programme: "", country: "UK", deadline: "",
  owner_id: "", status: "active", project_co_url: "", finance_status: "", notes: "",
};

export default function EPGlobalActivities() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editAct, setEditAct] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["/api/epglobal/activities", filterStatus],
    queryFn: () => epgFetch(`/api/epglobal/activities${filterStatus ? `?status=${filterStatus}` : ""}`),
  });

  const { data: users = [] } = useQuery({ queryKey: ["/api/epglobal/users"], queryFn: () => epgFetch("/api/epglobal/users") });

  const createAct = useMutation({
    mutationFn: (data: any) => epgFetch("/api/epglobal/activities", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/activities"] }); setShowForm(false); setForm(emptyForm); toast({ title: "Activity added" }); },
  });

  const updateAct = useMutation({
    mutationFn: ({ id, data }: any) => epgFetch(`/api/epglobal/activities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/activities"] }); setEditAct(null); toast({ title: "Updated" }); },
  });

  const filtered = (activities as any[]).filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.project_programme?.toLowerCase().includes(search.toLowerCase())
  );

  const ActForm = ({ onSubmit, initial, onCancel }: any) => {
    const [f, setF] = useState(initial || form);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="font-semibold text-gray-900 mb-4">{initial ? "Edit Activity" : "Add Activity"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Activity Name *</label>
            <Input value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="Activity / event name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project/Programme</label>
            <Input value={f.project_programme} onChange={e => setF({...f, project_programme: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
            <Input value={f.country} onChange={e => setF({...f, country: e.target.value})} />
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
              {["active","on_hold","complete","cancelled"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Finance Status</label>
            <Input value={f.finance_status} onChange={e => setF({...f, finance_status: e.target.value})} placeholder="e.g. Invoice sent, Deposit paid" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project.co URL</label>
            <Input value={f.project_co_url} onChange={e => setF({...f, project_co_url: e.target.value})} placeholder="https://..." />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <Input value={f.notes} onChange={e => setF({...f, notes: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onSubmit(f)} disabled={!f.name} className="bg-[#1a3a6b] text-white">{initial ? "Save" : "Add Activity"}</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  };

  return (
    <EPGlobalLayout title="Activities" subtitle="Track events, projects and programme activities">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activities..." className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {["active","on_hold","complete","cancelled"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
        <Button onClick={() => setShowForm(true)} className="bg-[#1a3a6b] text-white gap-2">
          <Plus className="h-4 w-4" /> Add Activity
        </Button>
      </div>

      {showForm && !editAct && <ActForm onSubmit={(f: any) => createAct.mutate(f)} onCancel={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1a3a6b] border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((act: any) => (
            editAct?.id === act.id ? (
              <div key={act.id} className="md:col-span-2">
                <ActForm initial={{...act, deadline: act.deadline?.slice(0,10), owner_id: act.owner_id || ""}} onSubmit={(f: any) => updateAct.mutate({ id: act.id, data: f })} onCancel={() => setEditAct(null)} />
              </div>
            ) : (
              <div key={act.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{act.name}</p>
                    {act.project_programme && <p className="text-sm text-gray-500">{act.project_programme}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge className={`text-xs ${statusColors[act.status] || ""}`}>{act.status?.replace("_"," ")}</Badge>
                    <button onClick={() => setEditAct(act)} className="text-gray-400 hover:text-[#1a3a6b] p-1 rounded hover:bg-gray-100">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  {act.country && <div className="flex items-center gap-2 text-gray-500"><span className="font-medium w-20">Country:</span> {act.country}</div>}
                  {act.deadline && <div className="flex items-center gap-2 text-gray-500"><span className="font-medium w-20">Deadline:</span> <span className={isAfter(new Date(), parseISO(act.deadline)) && act.status !== "complete" ? "text-red-600 font-semibold" : ""}>{format(parseISO(act.deadline), "d MMM yyyy")}</span></div>}
                  {act.owner_name && <div className="flex items-center gap-2 text-gray-500"><span className="font-medium w-20">Owner:</span> {act.owner_name}</div>}
                  {act.finance_status && <div className="flex items-center gap-2 text-gray-500"><span className="font-medium w-20">Finance:</span> {act.finance_status}</div>}
                  {act.notes && <div className="flex items-center gap-2 text-gray-500"><span className="font-medium w-20">Notes:</span> <span className="italic">{act.notes}</span></div>}
                </div>
                {act.project_co_url && (
                  <a href={act.project_co_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Open in Project.co
                  </a>
                )}
              </div>
            )
          ))}
          {filtered.length === 0 && <div className="md:col-span-2 text-center py-12 text-gray-400 text-sm">No activities found</div>}
        </div>
      )}
    </EPGlobalLayout>
  );
}
