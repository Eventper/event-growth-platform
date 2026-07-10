import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Search, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Organisation {
  id: string;
  name: string;
  sector: string;
  location: string;
  partnerType: "Sponsor" | "Employer" | "Civic" | "Media" | "Gifting" | "Guest Nominator";
  whyMatters: string;
  contactName?: string;
  contactRole?: string;
  email?: string;
  linkedin?: string;
  sponsorshipPotential: string;
  guestNominationPotential: string;
  strategicValueScore: number;
  status: "Prospect" | "Contacted" | "In Discussion" | "Committed" | "Declined";
  nextAction?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const SECTORS = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail", "Hospitality", "Education", "Media", "Charity", "Civic", "Other"];
const PARTNER_TYPES = ["Sponsor", "Employer", "Civic", "Media", "Gifting", "Guest Nominator"] as const;
const STATUS_OPTIONS = ["Prospect", "Contacted", "In Discussion", "Committed", "Declined"] as const;

export default function OrganisationDatabase() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    sector: "Technology" as const,
    location: "",
    partnerType: "Sponsor" as const,
    whyMatters: "",
    contactName: "",
    contactRole: "",
    email: "",
    linkedin: "",
    sponsorshipPotential: "",
    guestNominationPotential: "",
    strategicValueScore: 5,
    status: "Prospect" as const,
    nextAction: "",
    notes: "",
  });

  const { data: orgData, refetch } = useQuery({
    queryKey: ["/api/growth/organisations"],
    queryFn: async () => {
      const res = await fetch("/api/growth/organisations");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/growth/organisations/stats"],
    queryFn: async () => {
      const res = await fetch("/api/growth/organisations/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const orgs = orgData?.organisations || [];
  const stats = statsData?.stats;

  const filteredOrgs = orgs.filter((o: Organisation) => {
    if (searchTerm && !o.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType !== "all" && o.partnerType !== filterType) return false;
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "Organisation name is required" });
      return;
    }

    const method = editingId ? "PATCH" : "POST";
    const url = editingId ? `/api/growth/organisations/${editingId}` : "/api/growth/organisations";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Success", description: editingId ? "Updated" : "Added" });
      setForm({
        name: "",
        sector: "Technology",
        location: "",
        partnerType: "Sponsor",
        whyMatters: "",
        contactName: "",
        contactRole: "",
        email: "",
        linkedin: "",
        sponsorshipPotential: "",
        guestNominationPotential: "",
        strategicValueScore: 5,
        status: "Prospect",
        nextAction: "",
        notes: "",
      });
      setEditingId(null);
      setShowForm(false);
      refetch();
    } catch {
      toast({ title: "Error", description: "Save failed" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    try {
      const res = await fetch(`/api/growth/organisations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Success", description: "Deleted" });
      refetch();
    } catch {
      toast({ title: "Error", description: "Delete failed" });
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    "Prospect": "bg-blue-100 text-blue-800",
    "Contacted": "bg-yellow-100 text-yellow-800",
    "In Discussion": "bg-purple-100 text-purple-800",
    "Committed": "bg-green-100 text-green-800",
    "Declined": "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Organisation Database</h1>
        <p className="text-gray-600 mb-8">Target organisations for sponsorship, partnership, and guest nominations</p>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-sm text-gray-600">Total</p>
              </CardContent>
            </Card>
            {Object.entries(stats.byType || {}).map(([type, count]: any) => (
              <Card key={type}>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-sm text-gray-600">{type}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filter */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PARTNER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Organisation
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-8 border-2 border-blue-200">
            <CardHeader>
              <CardTitle>{editingId ? "Edit" : "Add"} Organisation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Select value={form.sector} onValueChange={(v: any) => setForm({ ...form, sector: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                <Select value={form.partnerType} onValueChange={(v: any) => setForm({ ...form, partnerType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                <Input placeholder="Contact role" value={form.contactRole} onChange={(e) => setForm({ ...form, contactRole: e.target.value })} />
                <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="LinkedIn URL" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
                <div>
                  <label className="block text-sm font-medium mb-2">Strategic Value Score (1-10)</label>
                  <Input type="number" min="1" max="10" value={form.strategicValueScore} onChange={(e) => setForm({ ...form, strategicValueScore: parseInt(e.target.value) })} />
                </div>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-2">Why matters</label>
                  <Textarea placeholder="Strategic importance..." value={form.whyMatters} onChange={(e) => setForm({ ...form, whyMatters: e.target.value })} rows={2} />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-2">Sponsorship potential</label>
                  <Textarea placeholder="Sponsorship opportunities..." value={form.sponsorshipPotential} onChange={(e) => setForm({ ...form, sponsorshipPotential: e.target.value })} rows={2} />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-2">Guest nomination potential</label>
                  <Textarea placeholder="Guest nomination opportunities..." value={form.guestNominationPotential} onChange={(e) => setForm({ ...form, guestNominationPotential: e.target.value })} rows={2} />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrgs.map((org: Organisation) => (
            <Card key={org.id} className="hover:shadow-lg transition">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{org.name}</h3>
                    <p className="text-sm text-gray-600">{org.sector} • {org.location}</p>
                  </div>
                  <Badge className={STATUS_COLORS[org.status]}>{org.status}</Badge>
                </div>
                <div className="text-sm text-gray-700 mb-4">
                  <p><strong>Type:</strong> {org.partnerType}</p>
                  <p><strong>Value Score:</strong> {org.strategicValueScore}/10</p>
                  {org.contactName && <p><strong>Contact:</strong> {org.contactName}</p>}
                </div>
                {org.email && (
                  <div className="flex items-center gap-2 text-blue-600 mb-2 text-sm">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${org.email}`}>{org.email}</a>
                  </div>
                )}
                {org.notes && <p className="text-sm italic text-gray-600 bg-gray-50 p-2 rounded mb-4">"{org.notes}"</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setForm(org); setEditingId(org.id); setShowForm(true); }} className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(org.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
