import { useState, type FormEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Users, Plus, Edit2, Trash2, UserCheck, Shield, Sparkles,
  Phone, Mail, Building, Clock, DollarSign, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp, Search, Filter,
  Briefcase, Shirt, Wrench, CalendarDays, BarChart3,
  ArrowLeft, Eye, TrendingUp, Hammer, Palette, Camera,
  Award, FileText, PieChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface InternalResource {
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
  resourceType: string;
  eventPhase: string;
  hoursPerDay?: string;
  totalDays?: number;
  uniformRequired?: boolean;
  uniformDescription?: string;
  equipment?: string;
  availabilityStatus?: string;
  assignedEventCount?: number;
  approvalStatus?: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approverName?: string;
  approverSignature?: string;
  approvedAt?: string;
  rejectedReason?: string;
  addedToBill?: boolean;
  billAddedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const CURRENCIES = [
  { code: "GBP", symbol: "£" },
  { code: "USD", symbol: "$" },
  { code: "NGN", symbol: "₦" },
  { code: "EUR", symbol: "€" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "ZAR", symbol: "R" },
  { code: "GHS", symbol: "₵" },
  { code: "KES", symbol: "KSh" },
  { code: "AED", symbol: "د.إ" },
];

const EVENT_PHASES = [
  { value: "pre-event", label: "Pre-Event (Setup & Preparation)" },
  { value: "during", label: "During Event" },
  { value: "post-event", label: "Post-Event (Teardown & Cleanup)" },
  { value: "pre-and-during", label: "Pre-Event + During" },
  { value: "during-and-post", label: "During + Post-Event" },
  { value: "all-phases", label: "All Phases (Pre + During + Post)" },
];

const AVAILABILITY = [
  { value: "available", label: "Available", color: "bg-green-100 text-green-800" },
  { value: "partially-available", label: "Partially Available", color: "bg-yellow-100 text-yellow-800" },
  { value: "unavailable", label: "Unavailable", color: "bg-red-100 text-red-800" },
  { value: "on-another-event", label: "On Another Event", color: "bg-blue-100 text-blue-800" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "completed", label: "Completed", color: "bg-blue-100 text-blue-800" },
];

const RATE_PERIODS = [
  { value: "hour", label: "Per Hour" },
  { value: "day", label: "Per Day" },
  { value: "event", label: "Per Event" },
  { value: "shift", label: "Per Shift" },
];

const SHIFTS = [
  "Morning (6am - 12pm)", "Afternoon (12pm - 6pm)", "Evening (6pm - 12am)",
  "Night (12am - 6am)", "Full Day", "Setup Only", "Teardown Only", "On-Call",
];

function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol || code;
}

function calcTotalCost(r: InternalResource): number {
  const rate = r.ratePerUnit ? parseFloat(r.ratePerUnit) : 0;
  const qty = r.quantity || 1;
  if (r.ratePeriod === "hour") {
    const hours = r.hoursPerDay ? parseFloat(r.hoursPerDay) : 8;
    const days = r.totalDays || 1;
    return rate * hours * days * qty;
  } else if (r.ratePeriod === "day") {
    const days = r.totalDays || 1;
    return rate * days * qty;
  }
  return rate * qty;
}

const emptyForm = {
  role: "",
  name: "",
  email: "",
  phone: "",
  company: "",
  quantity: 1,
  ratePerUnit: "",
  ratePeriod: "day",
  currency: "GBP",
  startDate: "",
  endDate: "",
  shift: "",
  notes: "",
  status: "pending",
  resourceType: "internal",
  eventPhase: "during",
  hoursPerDay: "8",
  totalDays: 1,
  uniformRequired: false,
  uniformDescription: "",
  equipment: "",
  availabilityStatus: "available",
};

export default function InternalTeamBudget() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterAvailability, setFilterAvailability] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [approverName, setApproverName] = useState("");
  const [approverSignature, setApproverSignature] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailRecipientName, setEmailRecipientName] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecterName, setRejecterName] = useState("");

  const { data: roles = [] } = useQuery<string[]>({
    queryKey: ["/api/event-resources/roles"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const { data: allResources = [], isLoading } = useQuery<InternalResource[]>({
    queryKey: ["/api/internal-resources", selectedEventId],
    queryFn: async () => {
      if (selectedEventId === "all") {
        const allRes: InternalResource[] = [];
        for (const event of events) {
          try {
            const res = await fetch(`/api/events/${event.id}/resources`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            if (res.ok) {
              const data = await res.json();
              const internal = data.filter((r: InternalResource) => r.resourceType === "internal");
              allRes.push(...internal);
            }
          } catch {}
        }
        return allRes;
      } else {
        const res = await fetch(`/api/events/${selectedEventId}/resources`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.filter((r: InternalResource) => r.resourceType === "internal");
      }
    },
    enabled: events.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const eventId = selectedEventId !== "all" ? selectedEventId : events[0]?.id;
      if (!eventId) throw new Error("No event selected");
      return apiRequest("POST", `/api/events/${eventId}/resources`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-resources"] });
      toast({ title: "Internal team member added" });
      resetForm();
    },
    onError: (e: any) => toast({ title: e.message || "Failed to add", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, eventId, data }: { id: string; eventId: string; data: typeof form }) => {
      return apiRequest("PATCH", `/api/events/${eventId}/resources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-resources"] });
      toast({ title: "Team member updated" });
      resetForm();
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      return apiRequest("DELETE", `/api/events/${eventId}/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-resources"] });
      toast({ title: "Team member removed" });
    },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async ({ eventId, resourceIds, name }: { eventId: string; resourceIds: string[]; name: string }) => {
      return apiRequest("POST", `/api/events/${eventId}/resources/submit-for-approval`, { resourceIds, submitterName: name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-resources"] });
      toast({ title: "Submitted for approval" });
      setSelectedIds(new Set());
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ eventId, resourceIds, name, signature }: { eventId: string; resourceIds: string[]; name: string; signature: string }) => {
      return apiRequest("POST", `/api/events/${eventId}/resources/approve`, { resourceIds, approverName: name, approverSignature: signature });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-resources"] });
      toast({ title: "Resources approved" });
      setShowApprovalModal(false);
      setApproverName("");
      setApproverSignature("");
      setSelectedIds(new Set());
    },
    onError: () => toast({ title: "Failed to approve", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ eventId, resourceIds, reason, name }: { eventId: string; resourceIds: string[]; reason: string; name: string }) => {
      return apiRequest("POST", `/api/events/${eventId}/resources/reject`, { resourceIds, reason, approverName: name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-resources"] });
      toast({ title: "Resources rejected" });
      setSelectedIds(new Set());
    },
    onError: () => toast({ title: "Failed to reject", variant: "destructive" }),
  });

  const addToBillMutation = useMutation({
    mutationFn: async ({ eventId, resourceIds }: { eventId: string; resourceIds: string[] }) => {
      return apiRequest("POST", `/api/events/${eventId}/resources/add-to-bill`, { resourceIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-resources"] });
      toast({ title: "Added to overall bill" });
      setSelectedIds(new Set());
    },
    onError: () => toast({ title: "Failed to add to bill", variant: "destructive" }),
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ eventId, email, name, submitter, resourceIds, eventName }: { eventId: string; email: string; name: string; submitter: string; resourceIds: string[]; eventName: string }) => {
      return apiRequest("POST", `/api/events/${eventId}/resources/send-approval-email`, {
        recipientEmail: email, recipientName: name, submitterName: submitter, resourceIds, eventName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-resources"] });
      toast({ title: "Approval email sent successfully" });
      setShowEmailModal(false);
      setEmailRecipient("");
      setEmailRecipientName("");
    },
    onError: () => toast({ title: "Failed to send email", variant: "destructive" }),
  });

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  function selectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id)));
    }
  }

  function handleExport() {
    const eventName = selectedEventId !== "all" ? events.find((e: any) => e.id === selectedEventId)?.name || "Event" : "All Events";
    const rows = filtered.map(r => ({
      Role: r.role,
      Name: r.name,
      Qty: r.quantity,
      Phase: EVENT_PHASES.find(p => p.value === r.eventPhase)?.label || r.eventPhase,
      "Hours/Day": r.hoursPerDay || "8",
      "Total Days": r.totalDays || 1,
      Rate: r.ratePerUnit || "0",
      "Rate Period": r.ratePeriod || "event",
      Currency: r.currency || "GBP",
      "Total Cost": calcTotalCost(r),
      Uniform: r.uniformRequired ? (r.uniformDescription || "Yes") : "No",
      Equipment: r.equipment || "",
      Status: r.approvalStatus || "draft",
      "Approved By": r.approverName || "",
      "Added to Bill": r.addedToBill ? "Yes" : "No",
    }));
    const header = Object.keys(rows[0] || {}).join(",");
    const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Internal_Team_Budget_${eventName.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Budget exported as CSV" });
  }

  function handlePrint() {
    const eventName = selectedEventId !== "all" ? events.find((e: any) => e.id === selectedEventId)?.name || "Event" : "All Events";
    const printRows = filtered.map(r => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;">${r.role}</td>
        <td style="padding:6px;border:1px solid #ddd;">${r.name}</td>
        <td style="padding:6px;border:1px solid #ddd;">${r.quantity}</td>
        <td style="padding:6px;border:1px solid #ddd;">${EVENT_PHASES.find(p => p.value === r.eventPhase)?.label || r.eventPhase}</td>
        <td style="padding:6px;border:1px solid #ddd;">${r.hoursPerDay || 8}hrs x ${r.totalDays || 1}d</td>
        <td style="padding:6px;border:1px solid #ddd;">${getCurrencySymbol(r.currency || "GBP")}${r.ratePerUnit || "0"} / ${r.ratePeriod || "event"}</td>
        <td style="padding:6px;border:1px solid #ddd;font-weight:bold;">${sym}${calcTotalCost(r).toLocaleString()}</td>
        <td style="padding:6px;border:1px solid #ddd;">${r.uniformRequired ? (r.uniformDescription || "Yes") : "No"}</td>
      </tr>
    `).join("");

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Internal Team Budget - ${eventName}</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;} table{width:100%;border-collapse:collapse;margin:20px 0;} th{background:#8B1538;color:white;padding:10px;text-align:left;} h1{color:#8B1538;} .sig-box{border:2px dashed #8B1538;padding:20px;margin:30px 0;border-radius:8px;} .sig-line{border-bottom:1px solid #333;min-width:200px;display:inline-block;margin:0 10px;}</style>
        </head><body>
        <div style="text-align:center;margin-bottom:30px;">
          <h1>Event Perfekt Global Ltd</h1>
          <h2>Internal Team Budget</h2>
          <p style="color:#666;">${eventName} | Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div style="display:flex;gap:20px;margin-bottom:20px;">
          <div style="flex:1;text-align:center;padding:15px;background:#f0f7ff;border-radius:8px;"><strong style="font-size:20px;">${totalStaff}</strong><br/><small>Total Staff</small></div>
          <div style="flex:1;text-align:center;padding:15px;background:#f0fff4;border-radius:8px;"><strong style="font-size:20px;">${sym}${totalCost.toLocaleString()}</strong><br/><small>Total Budget</small></div>
          <div style="flex:1;text-align:center;padding:15px;background:#f5f0ff;border-radius:8px;"><strong style="font-size:20px;">${totalHours.toLocaleString()}</strong><br/><small>Total Hours</small></div>
        </div>
        <table>
          <thead><tr>
            <th>Role</th><th>Name</th><th>Qty</th><th>Phase</th><th>Schedule</th><th>Rate</th><th>Total</th><th>Uniform</th>
          </tr></thead>
          <tbody>${printRows}
          <tr style="background:#f9f9f9;font-weight:bold;">
            <td colspan="6" style="padding:10px;border:1px solid #ddd;text-align:right;">GRAND TOTAL</td>
            <td style="padding:10px;border:1px solid #ddd;color:#8B1538;font-size:16px;">${sym}${totalCost.toLocaleString()}</td>
            <td style="padding:10px;border:1px solid #ddd;"></td>
          </tr></tbody>
        </table>
        <div class="sig-box">
          <h3 style="color:#8B1538;margin-top:0;">Approval Section</h3>
          <table style="border:none;"><tbody>
            <tr><td style="border:none;padding:8px;"><strong>Submitted By:</strong></td><td style="border:none;padding:8px;"><span class="sig-line">&nbsp;</span></td><td style="border:none;padding:8px;"><strong>Date:</strong></td><td style="border:none;padding:8px;"><span class="sig-line">&nbsp;</span></td></tr>
            <tr><td style="border:none;padding:8px;"><strong>Planner in Charge:</strong></td><td style="border:none;padding:8px;"><span class="sig-line">&nbsp;</span></td><td style="border:none;padding:8px;"><strong>Signature:</strong></td><td style="border:none;padding:8px;"><span class="sig-line">&nbsp;</span></td></tr>
            <tr><td style="border:none;padding:8px;"><strong>Approved By (Lead/Manager):</strong></td><td style="border:none;padding:8px;"><span class="sig-line">&nbsp;</span></td><td style="border:none;padding:8px;"><strong>Signature:</strong></td><td style="border:none;padding:8px;"><span class="sig-line">&nbsp;</span></td></tr>
            <tr><td style="border:none;padding:8px;"><strong>Date Approved:</strong></td><td style="border:none;padding:8px;"><span class="sig-line">&nbsp;</span></td><td style="border:none;padding:8px;"><strong>Position:</strong></td><td style="border:none;padding:8px;"><span class="sig-line">&nbsp;</span></td></tr>
          </tbody></table>
        </div>
        <p style="color:#999;font-size:11px;text-align:center;margin-top:40px;">Event Perfekt Global Ltd &copy; ${new Date().getFullYear()} | This document is confidential</p>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(resource: InternalResource) {
    setForm({
      role: resource.role,
      name: resource.name,
      email: resource.email || "",
      phone: resource.phone || "",
      company: resource.company || "",
      quantity: resource.quantity,
      ratePerUnit: resource.ratePerUnit || "",
      ratePeriod: resource.ratePeriod || "day",
      currency: resource.currency || "GBP",
      startDate: resource.startDate || "",
      endDate: resource.endDate || "",
      shift: resource.shift || "",
      notes: resource.notes || "",
      status: resource.status,
      resourceType: "internal",
      eventPhase: resource.eventPhase || "during",
      hoursPerDay: resource.hoursPerDay || "8",
      totalDays: resource.totalDays || 1,
      uniformRequired: resource.uniformRequired || false,
      uniformDescription: resource.uniformDescription || "",
      equipment: resource.equipment || "",
      availabilityStatus: resource.availabilityStatus || "available",
    });
    setEditingId(resource.id);
    setSelectedEventId(resource.eventId);
    setShowForm(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.role || !form.name) {
      toast({ title: "Please fill in role and name", variant: "destructive" });
      return;
    }
    if (editingId) {
      const resource = allResources.find(r => r.id === editingId);
      if (resource) {
        updateMutation.mutate({ id: editingId, eventId: resource.eventId, data: form });
      }
    } else {
      createMutation.mutate(form);
    }
  }

  const filtered = allResources.filter(r => {
    const matchesSearch = !searchTerm ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || r.role === filterRole;
    const matchesPhase = filterPhase === "all" || r.eventPhase === filterPhase;
    const matchesAvail = filterAvailability === "all" || r.availabilityStatus === filterAvailability;
    return matchesSearch && matchesRole && matchesPhase && matchesAvail;
  });

  const totalStaff = filtered.reduce((sum, r) => sum + (r.quantity || 1), 0);
  const totalCost = filtered.reduce((sum, r) => sum + calcTotalCost(r), 0);
  const totalHours = filtered.reduce((sum, r) => {
    const hours = r.hoursPerDay ? parseFloat(r.hoursPerDay) : 8;
    const days = r.totalDays || 1;
    return sum + (hours * days * (r.quantity || 1));
  }, 0);
  const uniformCount = filtered.filter(r => r.uniformRequired).reduce((sum, r) => sum + (r.quantity || 1), 0);

  const uniqueRoles = Array.from(new Set(allResources.map(r => r.role)));

  const costByRole: Record<string, { count: number; cost: number; hours: number }> = {};
  filtered.forEach(r => {
    if (!costByRole[r.role]) costByRole[r.role] = { count: 0, cost: 0, hours: 0 };
    costByRole[r.role].count += r.quantity || 1;
    costByRole[r.role].cost += calcTotalCost(r);
    const hours = r.hoursPerDay ? parseFloat(r.hoursPerDay) : 8;
    costByRole[r.role].hours += hours * (r.totalDays || 1) * (r.quantity || 1);
  });

  const costByPhase: Record<string, number> = {};
  filtered.forEach(r => {
    const phase = r.eventPhase || "during";
    costByPhase[phase] = (costByPhase[phase] || 0) + calcTotalCost(r);
  });

  const mainCurrency = filtered[0]?.currency || "GBP";
  const sym = getCurrencySymbol(mainCurrency);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="outline" onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/planner-dashboard")} className="mb-2 border-gray-300 hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Internal Team Budget</h1>
            <p className="text-gray-500 mt-1">Assign internal resources to events, cost them, track availability, hours & uniforms</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedEventId} onValueChange={v => { setSelectedEventId(v); queryClient.invalidateQueries({ queryKey: ["/api/internal-resources"] }); }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-[#8B1538] hover:bg-[#6d102c] text-white"
              disabled={selectedEventId === "all" && events.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Team Member
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStaff}</p>
                  <p className="text-xs text-gray-500">Total Team</p>
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
                  <p className="text-2xl font-bold">{sym}{totalCost.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total Budget</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalHours.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Shirt className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniformCount}</p>
                  <p className="text-xs text-gray-500">Need Uniforms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {filtered.length > 0 && (
          <Card className="mb-6 border-[#8B1538]/20">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedIds.size === filtered.length ? "Deselect All" : "Select All"}
                  </Button>
                  {selectedIds.size > 0 && <span className="text-sm text-gray-500">{selectedIds.size} selected</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <FileText className="w-4 h-4 mr-1" /> Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <FileText className="w-4 h-4 mr-1" /> Print / PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowEmailModal(true)} disabled={selectedEventId === "all"}>
                    <Mail className="w-4 h-4 mr-1" /> Email for Approval
                  </Button>
                  {selectedIds.size > 0 && selectedEventId !== "all" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Input placeholder="Planner in Charge" value={submitterName} onChange={e => setSubmitterName(e.target.value)} className="w-40 h-8 text-sm" />
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!submitterName} onClick={() => {
                          const ids = Array.from(selectedIds);
                          submitForApprovalMutation.mutate({ eventId: selectedEventId, resourceIds: ids, name: submitterName });
                        }}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Submit
                        </Button>
                      </div>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowApprovalModal(true)}>
                        <Award className="w-4 h-4 mr-1" /> Approve & Sign
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setShowRejectModal(true)}>
                        <AlertCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" className="bg-[#8B1538] hover:bg-[#6d102c] text-white" onClick={() => {
                        const ids = Array.from(selectedIds);
                        const approvedIds = ids.filter(id => filtered.find(r => r.id === id)?.approvalStatus === "approved");
                        if (approvedIds.length === 0) { toast({ title: "Only approved items can be added to bill", variant: "destructive" }); return; }
                        addToBillMutation.mutate({ eventId: selectedEventId, resourceIds: approvedIds });
                      }}>
                        <DollarSign className="w-4 h-4 mr-1" /> Add to Bill
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showApprovalModal && (
          <Card className="mb-6 border-green-300 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-800 flex items-center gap-2"><Award className="w-5 h-5" /> Approve & Sign</CardTitle>
              <CardDescription>As lead/manager, approve the selected internal team resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Approved By (Lead/Manager Name) *</Label>
                  <Input value={approverName} onChange={e => setApproverName(e.target.value)} placeholder="e.g. Mrs. Adedoyin Akindele" />
                </div>
                <div>
                  <Label>Digital Signature (Type Full Name) *</Label>
                  <Input value={approverSignature} onChange={e => setApproverSignature(e.target.value)} placeholder="Type your full name as signature" className="italic font-serif text-lg" />
                </div>
              </div>
              {approverSignature && (
                <div className="mb-4 p-4 bg-white rounded-lg border-2 border-dashed border-green-300">
                  <p className="text-xs text-gray-400 mb-1">Signature Preview:</p>
                  <p className="text-2xl font-serif italic text-[#8B1538]">{approverSignature}</p>
                  <p className="text-xs text-gray-400 mt-2">Date: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button className="bg-green-600 hover:bg-green-700 text-white" disabled={!approverName || !approverSignature || approveMutation.isPending} onClick={() => {
                  approveMutation.mutate({ eventId: selectedEventId, resourceIds: Array.from(selectedIds), name: approverName, signature: approverSignature });
                }}>
                  {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
                </Button>
                <Button variant="outline" onClick={() => { setShowApprovalModal(false); setApproverName(""); setApproverSignature(""); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showRejectModal && (
          <Card className="mb-6 border-red-300 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-red-800 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Reject Selected Resources</CardTitle>
              <CardDescription>Provide a reason for rejecting these resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Your Name (Manager/Lead) *</Label>
                  <Input value={rejecterName} onChange={e => setRejecterName(e.target.value)} placeholder="e.g. Mrs. Adedoyin Akindele" />
                </div>
                <div>
                  <Label>Reason for Rejection *</Label>
                  <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Budget exceeds allocation, need fewer staff" rows={2} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="destructive" disabled={!rejecterName || !rejectReason || rejectMutation.isPending} onClick={() => {
                  rejectMutation.mutate({ eventId: selectedEventId, resourceIds: Array.from(selectedIds), reason: rejectReason, name: rejecterName });
                  setShowRejectModal(false);
                  setRejectReason("");
                  setRejecterName("");
                }}>
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </Button>
                <Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectReason(""); setRejecterName(""); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showEmailModal && (
          <Card className="mb-6 border-blue-300 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-800 flex items-center gap-2"><Mail className="w-5 h-5" /> Send Budget for Approval</CardTitle>
              <CardDescription>Email the internal team budget to your lead or manager for review and approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Recipient Email (Lead/Manager) *</Label>
                  <Input type="email" value={emailRecipient} onChange={e => setEmailRecipient(e.target.value)} placeholder="manager@company.com" />
                </div>
                <div>
                  <Label>Recipient Name</Label>
                  <Input value={emailRecipientName} onChange={e => setEmailRecipientName(e.target.value)} placeholder="e.g. Mrs. Adedoyin Akindele" />
                </div>
                <div>
                  <Label>Your Name (Planner in Charge)</Label>
                  <Input value={submitterName} onChange={e => setSubmitterName(e.target.value)} placeholder="Your full name" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!emailRecipient || sendEmailMutation.isPending} onClick={() => {
                  const eventName = events.find((e: any) => e.id === selectedEventId)?.name || "Event";
                  sendEmailMutation.mutate({
                    eventId: selectedEventId,
                    email: emailRecipient,
                    name: emailRecipientName,
                    submitter: submitterName,
                    resourceIds: selectedIds.size > 0 ? Array.from(selectedIds) : filtered.map(r => r.id),
                    eventName,
                  });
                }}>
                  {sendEmailMutation.isPending ? "Sending..." : "Send Approval Email"}
                </Button>
                <Button variant="outline" onClick={() => { setShowEmailModal(false); setEmailRecipient(""); setEmailRecipientName(""); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto flex-nowrap h-auto gap-1 p-1">
            <TabsTrigger value="team" className="flex-shrink-0 text-xs sm:text-sm">Team Members</TabsTrigger>
            <TabsTrigger value="budget" className="flex-shrink-0 text-xs sm:text-sm">Budget Breakdown</TabsTrigger>
            <TabsTrigger value="approval" className="flex-shrink-0 text-xs sm:text-sm">Approval Status</TabsTrigger>
            <TabsTrigger value="schedule" className="flex-shrink-0 text-xs sm:text-sm">Schedule & Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or role..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPhase} onValueChange={setFilterPhase}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All Phases" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Phases</SelectItem>
                  {EVENT_PHASES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterAvailability} onValueChange={setFilterAvailability}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Availability" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {AVAILABILITY.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {showForm && (
              <Card className="border-[#8B1538]/20 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{editingId ? "Edit Team Member" : "Add Internal Team Member"}</CardTitle>
                  <CardDescription>Assign to event, set rate, hours, uniform and equipment</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Basic Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Role *</Label>
                          <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                              {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Full Name *</Label>
                          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tunde Bakare" />
                        </div>
                        <div>
                          <Label>Quantity (Number of People)</Label>
                          <Input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+234 801 234 5678" />
                        </div>
                        <div>
                          <Label>Company / Team</Label>
                          <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="e.g. In-house Decor Team" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Costing</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Rate Per Person</Label>
                          <div className="flex gap-2">
                            <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input type="number" min="0" step="0.01" value={form.ratePerUnit} onChange={e => setForm({ ...form, ratePerUnit: e.target.value })} placeholder="0.00" className="flex-1" />
                          </div>
                        </div>
                        <div>
                          <Label>Rate Period</Label>
                          <Select value={form.ratePeriod} onValueChange={v => setForm({ ...form, ratePeriod: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {RATE_PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Hours Per Day</Label>
                          <Input type="number" min="1" max="24" value={form.hoursPerDay} onChange={e => setForm({ ...form, hoursPerDay: e.target.value })} />
                        </div>
                        <div>
                          <Label>Total Days</Label>
                          <Input type="number" min="1" value={form.totalDays} onChange={e => setForm({ ...form, totalDays: parseInt(e.target.value) || 1 })} />
                        </div>
                      </div>
                      {form.ratePerUnit && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800">
                            Estimated Total: {getCurrencySymbol(form.currency)}
                            {calcTotalCost({
                              ...form as any,
                              ratePerUnit: form.ratePerUnit,
                              quantity: form.quantity,
                              hoursPerDay: form.hoursPerDay,
                              totalDays: form.totalDays,
                              ratePeriod: form.ratePeriod,
                            }).toLocaleString()}
                            {" "}({form.quantity} people x {form.totalDays} days{form.ratePeriod === "hour" ? ` x ${form.hoursPerDay}hrs` : ""})
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Schedule & Phase</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Event Phase</Label>
                          <Select value={form.eventPhase} onValueChange={v => setForm({ ...form, eventPhase: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {EVENT_PHASES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Start Date</Label>
                          <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                        <div>
                          <Label>Shift</Label>
                          <Select value={form.shift} onValueChange={v => setForm({ ...form, shift: v })}>
                            <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                            <SelectContent>
                              {SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2"><Shirt className="w-4 h-4" /> Uniform & Equipment</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 pt-6">
                          <Switch checked={form.uniformRequired} onCheckedChange={v => setForm({ ...form, uniformRequired: v })} />
                          <Label>Uniform Required</Label>
                        </div>
                        {form.uniformRequired && (
                          <div>
                            <Label>Uniform Description</Label>
                            <Input value={form.uniformDescription} onChange={e => setForm({ ...form, uniformDescription: e.target.value })} placeholder="e.g. Black trousers, white shirt, branded apron" />
                          </div>
                        )}
                        <div>
                          <Label>Equipment Needed</Label>
                          <Input value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })} placeholder="e.g. Drill, paint supplies, laptop" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Status</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Status</Label>
                          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Availability</Label>
                          <Select value={form.availabilityStatus} onValueChange={v => setForm({ ...form, availabilityStatus: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {AVAILABILITY.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Special instructions, arrival time, etc." rows={2} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" className="bg-[#8B1538] hover:bg-[#6d102c] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update" : "Add Team Member"}
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
                <p className="text-gray-500">Loading team...</p>
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Internal Team Members Yet</h3>
                  <p className="text-gray-400 mb-4">
                    Add decorators, carpenters, florists, drappers, graphics artists, lights installers, and all internal team members here with their rates, hours and uniform needs.
                  </p>
                  <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[#8B1538] hover:bg-[#6d102c] text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add First Team Member
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map(resource => {
                  const isExpanded = expandedId === resource.id;
                  const cost = calcTotalCost(resource);
                  const eventName = events.find((e: any) => e.id === resource.eventId)?.name || "Unknown Event";
                  const availOpt = AVAILABILITY.find(a => a.value === resource.availabilityStatus);
                  const phaseLabel = EVENT_PHASES.find(p => p.value === resource.eventPhase)?.label || resource.eventPhase;
                  const approvalBadge = resource.approvalStatus === "approved"
                    ? <Badge className="bg-green-100 text-green-800">Approved</Badge>
                    : resource.approvalStatus === "pending_approval"
                    ? <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
                    : resource.approvalStatus === "rejected"
                    ? <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                    : <Badge variant="outline" className="text-gray-500">Draft</Badge>;
                  const isSelected = selectedIds.has(resource.id);

                  return (
                    <Card key={resource.id} className={`hover:shadow-md transition-shadow ${isSelected ? "ring-2 ring-[#8B1538]" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(resource.id)} className="w-4 h-4 accent-[#8B1538]" />
                            <div className="w-10 h-10 rounded-full bg-[#8B1538]/10 flex items-center justify-center">
                              <Briefcase className="w-5 h-5 text-[#8B1538]" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-gray-900">{resource.name}</h4>
                                {approvalBadge}
                                {resource.addedToBill && <Badge className="bg-[#8B1538]/10 text-[#8B1538]">On Bill</Badge>}
                                {availOpt && <Badge className={availOpt.color}>{availOpt.label}</Badge>}
                                {resource.uniformRequired && <Badge variant="outline" className="text-orange-600 border-orange-300"><Shirt className="w-3 h-3 mr-1" />Uniform</Badge>}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1 flex-wrap">
                                <span className="font-medium text-[#8B1538]">{resource.role}</span>
                                {resource.quantity > 1 && <span>{resource.quantity} people</span>}
                                <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{phaseLabel}</span>
                                {cost > 0 && <span className="flex items-center gap-1 font-medium text-green-700"><DollarSign className="w-3 h-3" />{sym}{cost.toLocaleString()}</span>}
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{resource.hoursPerDay || 8}hrs x {resource.totalDays || 1} days</span>
                                {selectedEventId === "all" && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{eventName}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : resource.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(resource)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteMutation.mutate({ id: resource.id, eventId: resource.eventId })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {resource.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{resource.email}</div>}
                              {resource.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{resource.phone}</div>}
                              {resource.company && <div className="flex items-center gap-2"><Building className="w-4 h-4 text-gray-400" />{resource.company}</div>}
                              {resource.shift && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" />{resource.shift}</div>}
                              {resource.startDate && <div><span className="text-gray-400">Start: </span>{resource.startDate}</div>}
                              {resource.endDate && <div><span className="text-gray-400">End: </span>{resource.endDate}</div>}
                              {resource.ratePerUnit && (
                                <div><span className="text-gray-400">Rate: </span>{sym}{parseFloat(resource.ratePerUnit).toLocaleString()} / {resource.ratePeriod}</div>
                              )}
                            </div>
                            {(resource.uniformRequired || resource.equipment) && (
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <p className="font-medium text-sm text-orange-800 mb-1">Uniform & Equipment</p>
                                {resource.uniformDescription && <p className="text-sm"><Shirt className="w-3 h-3 inline mr-1" />{resource.uniformDescription}</p>}
                                {resource.equipment && <p className="text-sm"><Wrench className="w-3 h-3 inline mr-1" />{resource.equipment}</p>}
                              </div>
                            )}
                            {resource.notes && <div className="text-sm"><span className="text-gray-400">Notes: </span>{resource.notes}</div>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5" /> Cost Breakdown by Role</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(costByRole).length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No internal team members to budget yet.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(costByRole)
                      .sort(([, a], [, b]) => b.cost - a.cost)
                      .map(([role, data]) => {
                        const pct = totalCost > 0 ? (data.cost / totalCost) * 100 : 0;
                        return (
                          <div key={role} className="flex items-center gap-4">
                            <div className="w-40 text-sm font-medium truncate">{role}</div>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                              <div className="bg-[#8B1538] h-full rounded-full flex items-center pl-2 text-xs text-white font-medium" style={{ width: `${Math.max(pct, 5)}%` }}>
                                {pct.toFixed(1)}%
                              </div>
                            </div>
                            <div className="w-32 text-right text-sm">
                              <span className="font-bold">{sym}{data.cost.toLocaleString()}</span>
                              <span className="text-gray-400 ml-2">({data.count})</span>
                            </div>
                          </div>
                        );
                      })}
                    <div className="border-t pt-3 flex justify-between font-bold text-lg">
                      <span>Grand Total</span>
                      <span>{sym}{totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Cost by Event Phase</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(costByPhase).map(([phase, cost]) => {
                    const label = EVENT_PHASES.find(p => p.value === phase)?.label || phase;
                    return (
                      <Card key={phase}>
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-gray-500 mb-1">{label}</p>
                          <p className="text-xl font-bold text-[#8B1538]">{sym}{cost.toLocaleString()}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shirt className="w-5 h-5" /> Uniform Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                {filtered.filter(r => r.uniformRequired).length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No uniform requirements set.</p>
                ) : (
                  <div className="space-y-2">
                    {filtered.filter(r => r.uniformRequired).map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <span className="font-medium">{r.role}</span> - {r.name}
                          <span className="text-gray-500 ml-2">x{r.quantity}</span>
                        </div>
                        <span className="text-sm text-orange-700">{r.uniformDescription || "Not specified"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approval" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-400">{filtered.filter(r => !r.approvalStatus || r.approvalStatus === "draft").length}</p>
                  <p className="text-xs text-gray-500">Draft</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{filtered.filter(r => r.approvalStatus === "pending_approval").length}</p>
                  <p className="text-xs text-gray-500">Pending Approval</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{filtered.filter(r => r.approvalStatus === "approved").length}</p>
                  <p className="text-xs text-gray-500">Approved</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-[#8B1538]">{filtered.filter(r => r.addedToBill).length}</p>
                  <p className="text-xs text-gray-500">On Bill</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5" /> Approval History</CardTitle>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No resources to show.</p>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(r => (
                      <div key={r.id} className={`flex items-center justify-between p-4 rounded-lg border ${r.addedToBill ? "bg-[#8B1538]/5 border-[#8B1538]/20" : r.approvalStatus === "approved" ? "bg-green-50 border-green-200" : r.approvalStatus === "pending_approval" ? "bg-yellow-50 border-yellow-200" : r.approvalStatus === "rejected" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{r.role}</span>
                            <span className="text-gray-500">-</span>
                            <span>{r.name}</span>
                            <span className="text-gray-400">x{r.quantity}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
                            {r.submittedBy && <span>Submitted by: {r.submittedBy}</span>}
                            {r.submittedAt && <span>on {new Date(r.submittedAt).toLocaleDateString("en-GB")}</span>}
                            {r.approverName && <span>Approved by: <strong>{r.approverName}</strong></span>}
                            {r.approvedAt && <span>on {new Date(r.approvedAt).toLocaleDateString("en-GB")}</span>}
                            {r.rejectedReason && <span className="text-red-600">Reason: {r.rejectedReason}</span>}
                          </div>
                          {r.approverSignature && r.approvalStatus === "approved" && (
                            <div className="mt-2 p-2 bg-white rounded border border-dashed border-green-300 inline-block">
                              <p className="text-xs text-gray-400">Signature:</p>
                              <p className="text-lg font-serif italic text-[#8B1538]">{r.approverSignature}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-lg">{sym}{calcTotalCost(r).toLocaleString()}</span>
                          {r.approvalStatus === "approved" ? (
                            <Badge className="bg-green-100 text-green-800">Approved</Badge>
                          ) : r.approvalStatus === "pending_approval" ? (
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          ) : r.approvalStatus === "rejected" ? (
                            <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                          {r.addedToBill && <Badge className="bg-[#8B1538] text-white">Added to Bill</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {filtered.some(r => r.approvalStatus === "approved" && !r.addedToBill) && selectedEventId !== "all" && (
              <Card className="border-[#8B1538]/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ready to add to overall bill</p>
                      <p className="text-sm text-gray-500">{filtered.filter(r => r.approvalStatus === "approved" && !r.addedToBill).length} approved items worth {sym}{filtered.filter(r => r.approvalStatus === "approved" && !r.addedToBill).reduce((s, r) => s + calcTotalCost(r), 0).toLocaleString()}</p>
                    </div>
                    <Button className="bg-[#8B1538] hover:bg-[#6d102c] text-white" onClick={() => {
                      const approvedIds = filtered.filter(r => r.approvalStatus === "approved" && !r.addedToBill).map(r => r.id);
                      addToBillMutation.mutate({ eventId: selectedEventId, resourceIds: approvedIds });
                    }}>
                      <DollarSign className="w-4 h-4 mr-1" /> Add All Approved to Bill
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {EVENT_PHASES.map(phase => {
                const phaseResources = filtered.filter(r => r.eventPhase === phase.value || r.eventPhase === "all-phases" || 
                  (r.eventPhase === "pre-and-during" && (phase.value === "pre-event" || phase.value === "during")) ||
                  (r.eventPhase === "during-and-post" && (phase.value === "during" || phase.value === "post-event"))
                );
                if (phase.value.includes("-and-") || phase.value === "all-phases") return null;
                const phaseTotal = phaseResources.reduce((s, r) => s + (r.quantity || 1), 0);
                return (
                  <Card key={phase.value}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{phase.label}</CardTitle>
                      <CardDescription>{phaseTotal} staff members</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {phaseResources.length === 0 ? (
                        <p className="text-sm text-gray-400">No staff assigned</p>
                      ) : (
                        <div className="space-y-2">
                          {phaseResources.map(r => (
                            <div key={r.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{r.name}</span>
                                <span className="text-gray-400 ml-2">{r.role}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{r.quantity}x</span>
                                <Badge className={AVAILABILITY.find(a => a.value === r.availabilityStatus)?.color || ""} variant="outline">
                                  {r.availabilityStatus}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5" /> Equipment Needed</CardTitle>
              </CardHeader>
              <CardContent>
                {filtered.filter(r => r.equipment).length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No equipment requirements set.</p>
                ) : (
                  <div className="space-y-2">
                    {filtered.filter(r => r.equipment).map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <span className="font-medium">{r.role}</span> - {r.name}
                        </div>
                        <span className="text-sm text-blue-700">{r.equipment}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
