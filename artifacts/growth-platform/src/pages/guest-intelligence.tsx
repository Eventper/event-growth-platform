import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Guest {
  id: string;
  name: string;
  company: string;
  role: string;
  sector: string;
  region: string;
  type: "Founder" | "Executive" | "NED" | "Investor" | "Civic" | "Other";
  reach: "Local" | "Regional" | "National" | "International";
  companySize: string;
  influenceScore: number;
  sponsorIntroductionPotential: boolean;
  employerInfluence: string;
  speakerPotential: boolean;
  mediaProfile: string;
  warmIntroductionRoute?: string;
  invitePriority: "A" | "B" | "C";
  status: "Identified" | "Invited" | "Interested" | "Applied" | "Approved" | "Confirmed" | "Paid" | "I Am Her Complete";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const SECTORS = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail", "Hospitality", "Education", "Media", "Charity", "Civic", "Other"];
const REGIONS = ["London", "South East", "South West", "East Anglia", "East Midlands", "West Midlands", "North West", "North East", "Yorkshire", "Scotland", "Wales", "Northern Ireland", "International"];
const TYPES = ["Founder", "Executive", "NED", "Investor", "Civic", "Other"];
const REACH = ["Local", "Regional", "National", "International"];

export default function GuestIntelligenceDatabase() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSector, setFilterSector] = useState("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "A" | "B" | "C">("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    company: "",
    role: "",
    sector: "Technology" as const,
    region: "London" as const,
    type: "Executive" as const,
    reach: "National" as const,
    companySize: "500-1000",
    influenceScore: 5,
    sponsorIntroductionPotential: false,
    employerInfluence: "",
    speakerPotential: false,
    mediaProfile: "",
    warmIntroductionRoute: "",
    invitePriority: "B" as "A" | "B" | "C",
    status: "Identified" as Guest["status"],
    notes: "",
  });

  const { data: guestData, isLoading, refetch } = useQuery({
    queryKey: ["/api/growth/guests"],
    queryFn: async () => {
      const res = await fetch("/api/growth/guests");
      if (!res.ok) throw new Error("Failed to fetch guests");
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/growth/guests/stats"],
    queryFn: async () => {
      const res = await fetch("/api/growth/guests/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const guests = guestData?.guests || [];
  const stats = statsData?.stats;

  const filteredGuests = guests.filter((g: Guest) => {
    if (searchTerm && !g.name.toLowerCase().includes(searchTerm.toLowerCase()) && !g.company.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterSector !== "all" && g.sector !== filterSector) return false;
    if (filterPriority !== "all" && g.invitePriority !== filterPriority) return false;
    if (filterStatus !== "all" && g.status !== filterStatus) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.company.trim()) {
      toast({ title: "Error", description: "Name and company are required" });
      return;
    }

    const method = editingId ? "PATCH" : "POST";
    const url = editingId ? `/api/growth/guests/${editingId}` : "/api/growth/guests";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Success", description: editingId ? "Guest updated" : "Guest added" });
      setForm({
        name: "",
        company: "",
        role: "",
        sector: "Technology",
        region: "London",
        type: "Executive",
        reach: "National",
        companySize: "500-1000",
        influenceScore: 5,
        sponsorIntroductionPotential: false,
        employerInfluence: "",
        speakerPotential: false,
        mediaProfile: "",
        warmIntroductionRoute: "",
        invitePriority: "B",
        status: "Identified",
        notes: "",
      });
      setEditingId(null);
      setShowForm(false);
      refetch();
    } catch (err) {
      toast({ title: "Error", description: "Failed to save guest" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this guest?")) return;
    try {
      const res = await fetch(`/api/growth/guests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Success", description: "Guest deleted" });
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to delete guest" });
    }
  };

  const handleEdit = (guest: Guest) => {
    setForm(guest);
    setEditingId(guest.id);
    setShowForm(true);
  };

  const PRIORITY_COLORS = { A: "bg-red-100 text-red-800", B: "bg-yellow-100 text-yellow-800", C: "bg-blue-100 text-blue-800" };
  const STATUS_COLORS: Record<string, string> = {
    "Identified": "bg-gray-100 text-gray-800",
    "Invited": "bg-blue-100 text-blue-800",
    "Interested": "bg-purple-100 text-purple-800",
    "Applied": "bg-cyan-100 text-cyan-800",
    "Approved": "bg-indigo-100 text-indigo-800",
    "Confirmed": "bg-green-100 text-green-800",
    "Paid": "bg-emerald-100 text-emerald-800",
    "I Am Her Complete": "bg-lime-100 text-lime-800",
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Guest Intelligence Database</h1>
          <p className="text-gray-600">Manage 130+ women identified for The Woman Who Leads The Room</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-sm text-gray-600">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-red-600">{stats.byPriority.A}</div>
                <p className="text-sm text-gray-600">Priority A</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-yellow-600">{stats.byPriority.B}</div>
                <p className="text-sm text-gray-600">Priority B</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600">{stats.byPriority.C}</div>
                <p className="text-sm text-gray-600">Priority C</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{Object.values(stats.byStatus).reduce((a: number, b: number) => a + b, 0) - stats.total + stats.total}</div>
                <p className="text-sm text-gray-600">Sectors</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter & Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search name or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterSector} onValueChange={setFilterSector}>
            <SelectTrigger>
              <SelectValue placeholder="Filter sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={(v: any) => setFilterPriority(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {["A", "B", "C"].map(p => <SelectItem key={p} value={p}>Priority {p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)} className="ml-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Guest
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-8 border-2 border-blue-200">
            <CardHeader>
              <CardTitle>{editingId ? "Edit Guest" : "Add Guest"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company *</label>
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Job title" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sector</label>
                  <Select value={form.sector} onValueChange={(v: any) => setForm({ ...form, sector: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Region</label>
                  <Select value={form.region} onValueChange={(v: any) => setForm({ ...form, region: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Reach</label>
                  <Select value={form.reach} onValueChange={(v: any) => setForm({ ...form, reach: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REACH.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Influence Score (1-10)</label>
                  <Input type="number" min="1" max="10" value={form.influenceScore} onChange={(e) => setForm({ ...form, influenceScore: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <Select value={form.invitePriority} onValueChange={(v: any) => setForm({ ...form, invitePriority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C"].map(p => <SelectItem key={p} value={p}>Priority {p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Identified", "Invited", "Interested", "Applied", "Approved", "Confirmed", "Paid", "I Am Her Complete"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company Size</label>
                  <Input value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })} placeholder="1-10, 10-50, 50-500..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Employer Influence</label>
                  <Input value={form.employerInfluence} onChange={(e) => setForm({ ...form, employerInfluence: e.target.value })} placeholder="FTSE, Unicorn, Startup..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Warm Introduction Route</label>
                  <Input value={form.warmIntroductionRoute} onChange={(e) => setForm({ ...form, warmIntroductionRoute: e.target.value })} placeholder="Through whom?" />
                </div>
                <div className="flex gap-2">
                  <label className="flex items-center">
                    <input type="checkbox" checked={form.sponsorIntroductionPotential} onChange={(e) => setForm({ ...form, sponsorIntroductionPotential: e.target.checked })} className="w-4 h-4" />
                    <span className="ml-2 text-sm">Sponsor intro potential</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <label className="flex items-center">
                    <input type="checkbox" checked={form.speakerPotential} onChange={(e) => setForm({ ...form, speakerPotential: e.target.checked })} className="w-4 h-4" />
                    <span className="ml-2 text-sm">Speaker potential</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Media Profile</label>
                  <Input value={form.mediaProfile} onChange={(e) => setForm({ ...form, mediaProfile: e.target.value })} placeholder="LinkedIn, Press, Podcast..." />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  {editingId ? "Update Guest" : "Add Guest"}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guests List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredGuests.map((guest: Guest) => (
            <Card key={guest.id} className="hover:shadow-lg transition">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{guest.name}</h3>
                    <p className="text-sm text-gray-600">{guest.role} at {guest.company}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={PRIORITY_COLORS[guest.invitePriority]}>Priority {guest.invitePriority}</Badge>
                    <Badge className={STATUS_COLORS[guest.status]}>{guest.status}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-4">
                  <p><strong>Sector:</strong> {guest.sector}</p>
                  <p><strong>Region:</strong> {guest.region}</p>
                  <p><strong>Type:</strong> {guest.type}</p>
                  <p><strong>Reach:</strong> {guest.reach}</p>
                  <p><strong>Influence:</strong> {guest.influenceScore}/10</p>
                  {guest.speakerPotential && <p className="text-blue-600">🎤 Speaker</p>}
                  {guest.sponsorIntroductionPotential && <p className="text-green-600">💼 Sponsor potential</p>}
                </div>
                {guest.notes && <p className="text-sm italic text-gray-600 bg-gray-50 p-2 rounded mb-4">"{guest.notes}"</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(guest)} className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(guest.id)}>
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
