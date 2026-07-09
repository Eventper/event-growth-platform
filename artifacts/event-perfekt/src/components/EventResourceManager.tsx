import { useState, type FormEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users, Plus, Edit2, Trash2, UserCheck, Shield, Sparkles,
  Phone, Mail, Building, Clock, DollarSign, CheckCircle2, XCircle,
  AlertCircle, ChevronDown, ChevronUp, Search, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface EventResource {
  id: string;
  eventId: string;
  assignedBy: string;
  role: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  quantity: number;
  ratePerUnit?: string;
  ratePeriod?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  shift?: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ResourceSummary {
  totalStaff: number;
  totalCost: number;
  byRole: Record<string, { count: number; cost: number }>;
  byStatus: Record<string, number>;
}

const CURRENCIES = [
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "GHS", symbol: "₵", label: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
];

const SHIFTS = [
  "Morning (6am - 12pm)",
  "Afternoon (12pm - 6pm)",
  "Evening (6pm - 12am)",
  "Night (12am - 6am)",
  "Full Day",
  "Setup Only",
  "Teardown Only",
  "On-Call",
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "completed", label: "Completed", color: "bg-blue-100 text-blue-800" },
];

const ROLE_ICONS: Record<string, typeof Users> = {
  "Usher": UserCheck,
  "Security": Shield,
  "Bouncer": Shield,
  "Decorator": Sparkles,
  "Guest Manager": Users,
  "Day Coordinator": Clock,
  "Event Coordinator": Clock,
  "Event Planner": Users,
};

function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol || code;
}

function getStatusBadge(status: string) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  return opt ? <Badge className={opt.color}>{opt.label}</Badge> : <Badge>{status}</Badge>;
}

const emptyForm = {
  role: "",
  name: "",
  email: "",
  phone: "",
  company: "",
  quantity: 1,
  ratePerUnit: "",
  ratePeriod: "event",
  currency: "GBP",
  startDate: "",
  endDate: "",
  shift: "",
  notes: "",
  status: "pending",
};

export default function EventResourceManager({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: roles = [] } = useQuery<string[]>({
    queryKey: ["/api/event-resources/roles"],
  });

  const { data: resources = [], isLoading } = useQuery<EventResource[]>({
    queryKey: ["/api/events", eventId, "resources"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/resources`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch resources");
      return res.json();
    },
  });

  const { data: summary } = useQuery<ResourceSummary>({
    queryKey: ["/api/events", eventId, "resources", "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/resources/summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      return apiRequest("POST", `/api/events/${eventId}/resources`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "resources"] });
      toast({ title: "Staff member added successfully" });
      resetForm();
    },
    onError: () => toast({ title: "Failed to add staff member", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      return apiRequest("PATCH", `/api/events/${eventId}/resources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "resources"] });
      toast({ title: "Staff member updated" });
      resetForm();
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/events/${eventId}/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "resources"] });
      toast({ title: "Staff member removed" });
    },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(resource: EventResource) {
    setForm({
      role: resource.role,
      name: resource.name,
      email: resource.email || "",
      phone: resource.phone || "",
      company: resource.company || "",
      quantity: resource.quantity,
      ratePerUnit: resource.ratePerUnit || "",
      ratePeriod: resource.ratePeriod || "event",
      currency: resource.currency || "GBP",
      startDate: resource.startDate || "",
      endDate: resource.endDate || "",
      shift: resource.shift || "",
      notes: resource.notes || "",
      status: resource.status,
    });
    setEditingId(resource.id);
    setShowForm(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.role || !form.name) {
      toast({ title: "Please fill in role and name", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const filtered = resources.filter(r => {
    const matchesSearch = !searchTerm ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.company || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || r.role === filterRole;
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueRoles = Array.from(new Set(resources.map(r => r.role)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Event Staff & Resources</h2>
          <p className="text-gray-500 mt-1">Manage ushers, coordinators, security, decorators and all event staff</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-[#8B1538] hover:bg-[#6d102c] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalStaff}</p>
                  <p className="text-xs text-gray-500">Total Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{getCurrencySymbol(resources[0]?.currency || "GBP")}{summary.totalCost.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.byStatus.confirmed || 0}</p>
                  <p className="text-xs text-gray-500">Confirmed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.byStatus.pending || 0}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {summary && Object.keys(summary.byRole).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Staff by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(summary.byRole).map(([role, data]) => {
                const Icon = ROLE_ICONS[role] || Users;
                return (
                  <div key={role} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Icon className="w-5 h-5 text-[#8B1538]" />
                    <div>
                      <p className="font-medium text-sm">{role}</p>
                      <p className="text-xs text-gray-500">{data.count} staff</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, role or company..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {uniqueRoles.map(role => (
              <SelectItem key={role} value={role}>{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card className="border-[#8B1538]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingId ? "Edit Staff Member" : "Add New Staff Member"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Role *</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. John Adewale"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+44 7123 456789"
                  />
                </div>
                <div>
                  <Label>Company / Agency</Label>
                  <Input
                    value={form.company}
                    onChange={e => setForm({ ...form, company: e.target.value })}
                    placeholder="e.g. Elite Security Ltd"
                  />
                </div>
                <div>
                  <Label>Quantity (Number of Staff)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Rate Per Person</Label>
                  <div className="flex gap-2">
                    <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.ratePerUnit}
                      onChange={e => setForm({ ...form, ratePerUnit: e.target.value })}
                      placeholder="0.00"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Rate Period</Label>
                  <Select value={form.ratePeriod} onValueChange={v => setForm({ ...form, ratePeriod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Per Hour</SelectItem>
                      <SelectItem value="day">Per Day</SelectItem>
                      <SelectItem value="event">Per Event</SelectItem>
                      <SelectItem value="shift">Per Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Shift</Label>
                  <Select value={form.shift} onValueChange={v => setForm({ ...form, shift: v })}>
                    <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                    <SelectContent>
                      {SHIFTS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Special instructions, uniform requirements, arrival time, etc."
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="bg-[#8B1538] hover:bg-[#6d102c] text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingId ? "Update Staff Member" : "Add Staff Member"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-[#8B1538] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading staff...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {resources.length === 0 ? "No Staff Allocated Yet" : "No Results Found"}
            </h3>
            <p className="text-gray-400 mb-4">
              {resources.length === 0
                ? "Add ushers, coordinators, security, decorators and other event staff here."
                : "Try adjusting your search or filters."}
            </p>
            {resources.length === 0 && (
              <Button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="bg-[#8B1538] hover:bg-[#6d102c] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Staff Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(resource => {
            const Icon = ROLE_ICONS[resource.role] || Users;
            const isExpanded = expandedId === resource.id;
            const totalCost = resource.ratePerUnit
              ? parseFloat(resource.ratePerUnit) * resource.quantity
              : 0;

            return (
              <Card key={resource.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#8B1538]/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#8B1538]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{resource.name}</h4>
                          {getStatusBadge(resource.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="font-medium text-[#8B1538]">{resource.role}</span>
                          {resource.quantity > 1 && (
                            <span>{resource.quantity} staff</span>
                          )}
                          {resource.company && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" />{resource.company}
                            </span>
                          )}
                          {totalCost > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {getCurrencySymbol(resource.currency || "GBP")}{totalCost.toLocaleString()}
                            </span>
                          )}
                          {resource.shift && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{resource.shift}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : resource.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(resource)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => deleteMutation.mutate(resource.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {resource.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{resource.email}</span>
                        </div>
                      )}
                      {resource.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{resource.phone}</span>
                        </div>
                      )}
                      {resource.startDate && (
                        <div>
                          <span className="text-gray-400">Start: </span>
                          <span>{resource.startDate}</span>
                        </div>
                      )}
                      {resource.endDate && (
                        <div>
                          <span className="text-gray-400">End: </span>
                          <span>{resource.endDate}</span>
                        </div>
                      )}
                      {resource.ratePeriod && resource.ratePerUnit && (
                        <div>
                          <span className="text-gray-400">Rate: </span>
                          <span>
                            {getCurrencySymbol(resource.currency || "GBP")}
                            {parseFloat(resource.ratePerUnit).toLocaleString()} / {resource.ratePeriod}
                          </span>
                        </div>
                      )}
                      {resource.notes && (
                        <div className="col-span-full">
                          <span className="text-gray-400">Notes: </span>
                          <span>{resource.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
