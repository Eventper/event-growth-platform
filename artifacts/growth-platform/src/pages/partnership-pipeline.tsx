import { useState } from "react";
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
import { Plus, Mail, Phone, Calendar, Trash2, Edit, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Partner {
  id: string;
  name: string;
  category: "Strategic Sponsors" | "Brand Partners" | "Media" | "Civic/Regional" | "Guest Nominators";
  partnerType?: string;
  status: "Prospect" | "Contacted" | "In Discussion" | "Committed" | "Declined";
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  lastContact?: string;
  nextFollowUp?: string;
  value?: string;
}

const INITIAL_PARTNERS: Partner[] = [
  {
    id: "1",
    name: "Funding Bay",
    category: "Strategic Sponsors",
    partnerType: "Business Finance",
    status: "Contacted",
    lastContact: "2026-06-15",
    value: "£2,500-5,000",
  },
  {
    id: "2",
    name: "GenM",
    category: "Strategic Sponsors",
    partnerType: "Business Finance",
    status: "Contacted",
    lastContact: "2026-06-18",
    value: "£3,000-6,000",
  },
  {
    id: "3",
    name: "Ridgeview",
    category: "Brand Partners",
    partnerType: "Premium Lifestyle",
    status: "Contacted",
    lastContact: "2026-06-20",
    value: "£1,500-3,000",
  },
  {
    id: "4",
    name: "Prestat",
    category: "Brand Partners",
    partnerType: "Premium Lifestyle",
    status: "Contacted",
    lastContact: "2026-06-18",
    value: "£1,000-2,500",
  },
  {
    id: "5",
    name: "Muddy Stilettos",
    category: "Media",
    partnerType: "Media",
    status: "Contacted",
    lastContact: "2026-06-22",
    value: "Brand exposure + event coverage",
  },
  {
    id: "6",
    name: "Affinity",
    category: "Strategic Sponsors",
    partnerType: "Business Finance",
    status: "Contacted",
    lastContact: "2026-06-17",
    value: "£2,000-4,000",
  },
  {
    id: "7",
    name: "Temple Spa",
    category: "Brand Partners",
    partnerType: "Women's Health",
    status: "Contacted",
    lastContact: "2026-06-19",
    value: "£800-2,000",
  },
  {
    id: "8",
    name: "Mercedes-Benz",
    category: "Brand Partners",
    partnerType: "Automotive",
    status: "Prospect",
    value: "£3,000-8,000",
  },
  {
    id: "9",
    name: "Little Legend",
    category: "Brand Partners",
    partnerType: "Premium Lifestyle",
    status: "Prospect",
    value: "£1,500-3,500",
  },
  {
    id: "10",
    name: "West Northamptonshire Council",
    category: "Civic/Regional",
    partnerType: "Civic / Economic Growth",
    status: "Contacted",
    lastContact: "2026-06-21",
    value: "Event support + visibility",
  },
  {
    id: "11",
    name: "MILA",
    category: "Brand Partners",
    partnerType: "Women's Health",
    status: "Prospect",
    value: "£1,200-2,500",
  },
];

const PARTNER_CATEGORIES = [
  "Strategic Sponsors",
  "Brand Partners",
  "Media",
  "Civic/Regional",
  "Guest Nominators",
] as const;

const PARTNER_TYPES = [
  "Business Finance",
  "Women's Health",
  "Premium Lifestyle",
  "Automotive",
  "Media",
  "Hospitality",
  "Civic / Economic Growth",
];

const STATUS_COLORS: Record<Partner["status"], string> = {
  "Prospect": "bg-blue-100 text-blue-800",
  "Contacted": "bg-yellow-100 text-yellow-800",
  "In Discussion": "bg-purple-100 text-purple-800",
  "Committed": "bg-green-100 text-green-800",
  "Declined": "bg-red-100 text-red-800",
};

export default function PartnershipPipeline() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Partner["category"] | "all">("all");
  const [form, setForm] = useState({
    name: "",
    category: "Brand Partners" as Partner["category"],
    partnerType: "",
    status: "Prospect" as Partner["status"],
    contactName: "",
    email: "",
    phone: "",
    website: "",
    notes: "",
    lastContact: "",
    nextFollowUp: "",
    value: "",
  });

  const filteredPartners = selectedCategory === "all"
    ? partners
    : partners.filter(p => p.category === selectedCategory);

  const stats = {
    total: partners.length,
    contacted: partners.filter(p => p.status === "Contacted" || p.status === "In Discussion").length,
    committed: partners.filter(p => p.status === "Committed").length,
    declined: partners.filter(p => p.status === "Declined").length,
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "Partner name is required" });
      return;
    }

    if (editingId) {
      setPartners(partners.map(p => p.id === editingId ? { ...form, id: editingId } : p));
      toast({ title: "Success", description: "Partner updated" });
      setEditingId(null);
    } else {
      const newPartner: Partner = {
        ...form,
        id: Date.now().toString(),
      };
      setPartners([...partners, newPartner]);
      toast({ title: "Success", description: "Partner added to pipeline" });
    }

    setForm({
      name: "",
      category: "Brand Partners",
      partnerType: "",
      status: "Prospect",
      contactName: "",
      email: "",
      phone: "",
      website: "",
      notes: "",
      lastContact: "",
      nextFollowUp: "",
      value: "",
    });
    setShowForm(false);
  };

  const handleEdit = (partner: Partner) => {
    setForm(partner);
    setEditingId(partner.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setPartners(partners.filter(p => p.id !== id));
    toast({ title: "Success", description: "Partner removed" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Partnership Pipeline</h1>
          <p className="text-gray-600">Manage strategic sponsors, brand partners, media, civic and guest nomination partners</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Partners</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600">{stats.contacted}</div>
              <p className="text-sm text-gray-600">Contacted/In Discussion</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{stats.committed}</div>
              <p className="text-sm text-gray-600">Committed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-red-600">{stats.declined}</div>
              <p className="text-sm text-gray-600">Declined</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Add */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={selectedCategory} onValueChange={(val: any) => setSelectedCategory(val)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {PARTNER_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setForm({
                name: "",
                category: "Brand Partners",
                partnerType: "",
                status: "Prospect",
                contactName: "",
                email: "",
                phone: "",
                website: "",
                notes: "",
                lastContact: "",
                nextFollowUp: "",
                value: "",
              });
              setEditingId(null);
              setShowForm(true);
            }}
            className="ml-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Partner
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-8 border-2 border-blue-200">
            <CardHeader>
              <CardTitle>{editingId ? "Edit Partner" : "Add New Partner"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Partner Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Funding Bay"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <Select value={form.category} onValueChange={(val: any) => setForm({ ...form, category: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNER_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Partner Type</label>
                  <Select value={form.partnerType} onValueChange={(val) => setForm({ ...form, partnerType: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNER_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status *</label>
                  <Select value={form.status} onValueChange={(val: any) => setForm({ ...form, status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Prospect", "Contacted", "In Discussion", "Committed", "Declined"].map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Name</label>
                  <Input
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    type="email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+44 XXXX XXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Value / Sponsorship Amount</label>
                  <Input
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="£2,000-5,000 or Brand exposure"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Contact</label>
                  <Input
                    value={form.lastContact}
                    onChange={(e) => setForm({ ...form, lastContact: e.target.value })}
                    type="date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Next Follow-up</label>
                  <Input
                    value={form.nextFollowUp}
                    onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })}
                    type="date"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Add any relevant notes, previous conversations, interests..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                  {editingId ? "Update Partner" : "Add Partner"}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Partners Grid */}
        <div className="space-y-6">
          {PARTNER_CATEGORIES.map(category => {
            const categoryPartners = filteredPartners.filter(p => p.category === category);
            if (selectedCategory !== "all" && selectedCategory !== category) return null;
            if (categoryPartners.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{category}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {categoryPartners.map(partner => (
                    <Card key={partner.id} className="hover:shadow-lg transition">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{partner.name}</h3>
                            {partner.partnerType && (
                              <p className="text-sm text-gray-600">{partner.partnerType}</p>
                            )}
                          </div>
                          <Badge className={STATUS_COLORS[partner.status]}>
                            {partner.status}
                          </Badge>
                        </div>

                        {partner.contactName && (
                          <p className="text-sm text-gray-700 mb-2"><strong>Contact:</strong> {partner.contactName}</p>
                        )}
                        {partner.value && (
                          <p className="text-sm text-gray-700 mb-2"><strong>Value:</strong> {partner.value}</p>
                        )}

                        <div className="space-y-2 mb-4 text-sm">
                          {partner.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="w-4 h-4" />
                              <a href={`mailto:${partner.email}`} className="text-blue-600 hover:underline">{partner.email}</a>
                            </div>
                          )}
                          {partner.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="w-4 h-4" />
                              <a href={`tel:${partner.phone}`} className="text-blue-600 hover:underline">{partner.phone}</a>
                            </div>
                          )}
                          {partner.lastContact && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              Last: {new Date(partner.lastContact).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {partner.notes && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-4 italic">"{partner.notes}"</p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(partner)}
                            className="flex-1"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(partner.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
