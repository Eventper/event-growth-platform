import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { epgFetch } from "@/lib/epglobal-auth";
import EPGlobalLayout from "@/components/EPGlobalLayout";
import { Plus, Search, Edit2, ExternalLink, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const emptyForm = {
  name: "", vendor_type: "", country: "UK", contact_name: "",
  contact_email: "", contact_phone: "", status: "active", project_co_url: "", notes: "",
};

export default function EPGlobalVendors() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["/api/epglobal/vendors"],
    queryFn: () => epgFetch("/api/epglobal/vendors"),
  });

  const createVendor = useMutation({
    mutationFn: (data: any) => epgFetch("/api/epglobal/vendors", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/vendors"] }); setShowForm(false); setForm(emptyForm); toast({ title: "Vendor added" }); },
  });

  const updateVendor = useMutation({
    mutationFn: ({ id, data }: any) => epgFetch(`/api/epglobal/vendors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/vendors"] }); setEditVendor(null); toast({ title: "Updated" }); },
  });

  const filtered = (vendors as any[]).filter(v =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.vendor_type?.toLowerCase().includes(search.toLowerCase()) ||
    v.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  const VendorForm = ({ onSubmit, initial, onCancel }: any) => {
    const [f, setF] = useState(initial || form);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="font-semibold text-gray-900 mb-4">{initial ? "Edit Vendor" : "Add Vendor"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vendor Name *</label>
            <Input value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="Company name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <Input value={f.vendor_type} onChange={e => setF({...f, vendor_type: e.target.value})} placeholder="e.g. Venue, Catering, AV" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
            <Input value={f.country} onChange={e => setF({...f, country: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Name</label>
            <Input value={f.contact_name} onChange={e => setF({...f, contact_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Email</label>
            <Input type="email" value={f.contact_email} onChange={e => setF({...f, contact_email: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Phone</label>
            <Input value={f.contact_phone} onChange={e => setF({...f, contact_phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={f.status} onChange={e => setF({...f, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {["active","inactive","pending"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project.co URL</label>
            <Input value={f.project_co_url} onChange={e => setF({...f, project_co_url: e.target.value})} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <Input value={f.notes} onChange={e => setF({...f, notes: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onSubmit(f)} disabled={!f.name} className="bg-[#1a3a6b] text-white">{initial ? "Save" : "Add Vendor"}</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  };

  return (
    <EPGlobalLayout title="Partners & Vendors" subtitle="Manage supplier and partner relationships">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..." className="pl-9" />
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#1a3a6b] text-white gap-2">
          <Plus className="h-4 w-4" /> Add Vendor
        </Button>
      </div>

      {showForm && !editVendor && <VendorForm onSubmit={(f: any) => createVendor.mutate(f)} onCancel={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1a3a6b] border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v: any) => (
            editVendor?.id === v.id ? (
              <div key={v.id} className="lg:col-span-3">
                <VendorForm initial={v} onSubmit={(f: any) => updateVendor.mutate({ id: v.id, data: f })} onCancel={() => setEditVendor(null)} />
              </div>
            ) : (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    {v.vendor_type && <p className="text-xs text-gray-500">{v.vendor_type}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${v.status === "active" ? "bg-green-100 text-green-700" : v.status === "inactive" ? "bg-gray-100 text-gray-500" : "bg-yellow-100 text-yellow-700"}`}>
                      {v.status}
                    </Badge>
                    <button onClick={() => setEditVendor(v)} className="text-gray-400 hover:text-[#1a3a6b] p-1 rounded hover:bg-gray-100">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {v.contact_name && <p className="text-sm text-gray-700 mb-1">{v.contact_name}</p>}
                <div className="space-y-1">
                  {v.contact_email && <a href={`mailto:${v.contact_email}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><Mail className="h-3.5 w-3.5" />{v.contact_email}</a>}
                  {v.contact_phone && <div className="flex items-center gap-1.5 text-sm text-gray-600"><Phone className="h-3.5 w-3.5" />{v.contact_phone}</div>}
                </div>
                {v.notes && <p className="text-xs text-gray-400 mt-2 italic">{v.notes}</p>}
                {v.project_co_url && (
                  <a href={v.project_co_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Project.co
                  </a>
                )}
              </div>
            )
          ))}
          {filtered.length === 0 && <div className="lg:col-span-3 text-center py-12 text-gray-400 text-sm">No vendors found</div>}
        </div>
      )}
    </EPGlobalLayout>
  );
}
