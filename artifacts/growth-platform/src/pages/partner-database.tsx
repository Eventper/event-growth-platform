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
import { Plus, Edit, Trash2, Search, Mail, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Partner {
  id: string;
  name: string;
  category: string;
  whatTheyBring: string;
  whatWeWant: string;
  whatTheyGet: string;
  estimatedValue: string;
  contactPerson?: string;
  email?: string;
  status: "Prospect" | "Contacted" | "In Discussion" | "Committed" | "Declined";
  proposalSent: boolean;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS = ["Prospect", "Contacted", "In Discussion", "Committed", "Declined"] as const;

export default function PartnerDatabase() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "Brand Partner",
    whatTheyBring: "",
    whatWeWant: "",
    whatTheyGet: "",
    estimatedValue: "",
    contactPerson: "",
    email: "",
    status: "Prospect" as const,
    proposalSent: false,
    followUpDate: "",
    notes: "",
  });

  const { data: partnerData, refetch } = useQuery({
    queryKey: ["/api/growth/partners"],
    queryFn: async () => {
      const res = await fetch("/api/growth/partners");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/growth/partners/stats"],
    queryFn: async () => {
      const res = await fetch("/api/growth/partners/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const partners = partnerData?.partners || [];
  const stats = statsData?.stats;

  const filteredPartners = partners.filter((p: Partner) => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "Partner name is required" });
      return;
    }

    const method = editingId ? "PATCH" : "POST";
    const url = editingId ? `/api/growth/partners/${editingId}` : "/api/growth/partners";

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
        category: "Brand Partner",
        whatTheyBring: "",
        whatWeWant: "",
        whatTheyGet: "",
        estimatedValue: "",
        contactPerson: "",
        email: "",
        status: "Prospect",
        proposalSent: false,
        followUpDate: "",
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
      const res = await fetch(`/api/growth/partners/${id}`, { method: "DELETE" });
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Partner Database</h1>
        <p className="text-gray-600 mb-8">All possible partners, vendors, and sponsors with proposal tracking</p>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-sm text-gray-600">Total Partners</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-yellow-600">{stats.proposalsSent}</div>
                <p className="text-sm text-gray-600">Proposals Sent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-red-600">{stats.followUpsDue}</div>
                <p className="text-sm text-gray-600">Follow-ups Due</p>
              </CardContent>
            </Card>
            {Object.entries(stats.byStatus || {}).map(([status, count]: any) => (
              <Card key={status}>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-sm text-gray-600">{status}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search partner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)} className="ml-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Partner
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-8 border-2 border-blue-200">
            <CardHeader>
              <CardTitle>{editingId ? "Edit" : "Add"} Partner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Partner name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Category (e.g., Sponsor, Vendor, Media)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <Input placeholder="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Estimated value (£ or description)" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} />
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">What they bring</label>
                  <Textarea placeholder="Services, products, or value they offer..." value={form.whatTheyBring} onChange={(e) => setForm({ ...form, whatTheyBring: e.target.value })} rows={2} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">What we want</label>
                  <Textarea placeholder="Our requirements or expectations..." value={form.whatWeWant} onChange={(e) => setForm({ ...form, whatWeWant: e.target.value })} rows={2} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">What they get</label>
                  <Textarea placeholder="Benefits, sponsorship benefits, recognition..." value={form.whatTheyGet} onChange={(e) => setForm({ ...form, whatTheyGet: e.target.value })} rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Follow-up date</label>
                  <Input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input type="checkbox" checked={form.proposalSent} onChange={(e) => setForm({ ...form, proposalSent: e.target.checked })} className="w-4 h-4" />
                    <span className="ml-2 text-sm">Proposal sent</span>
                  </label>
                </div>
                <div className="md:col-span-2">
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
          {filteredPartners.map((partner: Partner) => (
            <Card key={partner.id} className="hover:shadow-lg transition">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{partner.name}</h3>
                    <p className="text-sm text-gray-600">{partner.category}</p>
                  </div>
                  <Badge className={STATUS_COLORS[partner.status]}>{partner.status}</Badge>
                </div>
                <div className="text-sm text-gray-700 mb-4">
                  <p><strong>Value:</strong> {partner.estimatedValue}</p>
                  {partner.contactPerson && <p><strong>Contact:</strong> {partner.contactPerson}</p>}
                  {partner.proposalSent && <p className="text-green-600">✓ Proposal sent</p>}
                </div>
                {partner.email && (
                  <div className="flex items-center gap-2 text-blue-600 mb-2 text-sm">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${partner.email}`}>{partner.email}</a>
                  </div>
                )}
                {partner.followUpDate && (
                  <div className="flex items-center gap-2 text-amber-600 mb-2 text-sm">
                    <Calendar className="w-4 h-4" />
                    Follow-up: {new Date(partner.followUpDate).toLocaleDateString()}
                  </div>
                )}
                {partner.notes && <p className="text-sm italic text-gray-600 bg-gray-50 p-2 rounded mb-4">"{partner.notes}"</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setForm(partner); setEditingId(partner.id); setShowForm(true); }} className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(partner.id)}>
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
