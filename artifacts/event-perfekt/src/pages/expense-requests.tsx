import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Receipt, Plus, Search, Filter, Check, X, Clock, ShoppingCart,
  Building, User, DollarSign, TrendingUp, Loader2, AlertCircle,
  Briefcase, ChevronDown, FileText, Trash2,
} from "lucide-react";
import { format } from "date-fns";

interface ExpenseRequest {
  id: number;
  requester_id: number;
  requester_name: string;
  department: string | null;
  category: string;
  item_name: string;
  description: string | null;
  reason: string | null;
  estimated_cost: number;
  actual_cost: number | null;
  currency: string;
  event_id: number | null;
  event_name: string | null;
  status: string;
  priority: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  receipt_url: string | null;
  budget_item_id: string | null;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "equipment", label: "Equipment & Hardware" },
  { value: "software", label: "Software & Licences" },
  { value: "supplies", label: "Office Supplies" },
  { value: "travel", label: "Travel & Transport" },
  { value: "training", label: "Training & Development" },
  { value: "marketing", label: "Marketing Materials" },
  { value: "venue", label: "Venue & Facility" },
  { value: "catering", label: "Catering & Refreshments" },
  { value: "other", label: "Other" },
];

const DEPARTMENTS = ["Management", "Planning", "Design", "Finance", "Operations", "Marketing", "Administration", "IT", "Other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const CURRENCIES = ["GBP", "NGN", "USD", "EUR"];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  pending: { color: "text-amber-300", bg: "bg-amber-500/20 border-amber-500/30", icon: Clock },
  approved: { color: "text-emerald-300", bg: "bg-emerald-500/20 border-emerald-500/30", icon: Check },
  rejected: { color: "text-red-300", bg: "bg-red-500/20 border-red-500/30", icon: X },
  purchased: { color: "text-blue-300", bg: "bg-blue-500/20 border-blue-500/30", icon: ShoppingCart },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function ExpenseRequests() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterEvent, setFilterEvent] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"requests" | "departments" | "team">("requests");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedRequest, setExpandedRequest] = useState<number | null>(null);

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [category, setCategory] = useState("equipment");
  const [department, setDepartment] = useState("");
  const [eventId, setEventId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery<ExpenseRequest[]>({
    queryKey: ["/api/expense-requests", filterDept, filterStatus, filterCategory, filterEvent],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterDept !== "all") params.set("department", filterDept);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterEvent !== "all") params.set("event_id", filterEvent);
      const res = await fetch(`/api/expense-requests?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: summary } = useQuery<any>({
    queryKey: ["/api/expense-requests/summary"],
    queryFn: async () => {
      const res = await fetch("/api/expense-requests/summary", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return res.json();
    },
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/expense-requests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/expense-requests/summary"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expense-requests", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Request Submitted", description: "Your expense request has been submitted for approval" });
      resetForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/expense-requests/${id}/approve`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      invalidateAll();
      const msg = data.budget_item_id ? "Approved and added to event budget" : "Approved as company expense";
      toast({ title: "Expense Approved", description: msg });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/expense-requests/${id}/reject`, { rejected_reason: reason });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Expense Rejected" });
      setRejectDialog(null);
      setRejectReason("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expense-requests/${id}`),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Request Deleted" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setItemName(""); setDescription(""); setReason(""); setEstimatedCost("");
    setCurrency("GBP"); setCategory("equipment"); setDepartment("");
    setEventId(""); setPriority("medium"); setNotes("");
  };

  const handleSubmit = () => {
    if (!itemName || !estimatedCost) {
      toast({ title: "Required", description: "Item name and estimated cost are required", variant: "destructive" });
      return;
    }
    const actualEventId = eventId && eventId !== "none" ? eventId : null;
    const selectedEvent = actualEventId ? events.find((e: any) => String(e.id) === actualEventId) : null;
    createMutation.mutate({
      item_name: itemName,
      description,
      reason,
      estimated_cost: estimatedCost,
      currency,
      category,
      department,
      event_id: actualEventId,
      event_name: selectedEvent?.title || null,
      priority,
      notes,
    });
  };

  const filtered = requests.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.item_name.toLowerCase().includes(q) || r.requester_name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
    }
    return true;
  });

  const totals = summary?.totals || {};
  const formatCost = (v: any) => {
    const num = parseFloat(v) || 0;
    return num.toLocaleString("en-GB", { minimumFractionDigits: 2 });
  };

  return (
    <PlannerLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Receipt className="w-7 h-7 text-[#ffffff]" /> Expense Requests
            </h1>
            <p className="text-white/50 text-sm mt-1">Submit and manage expense requests by department and team</p>
          </div>
          <Button className="bg-[#8B1538] text-white hover:bg-[#6d1029]" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Request
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1a0209] border-[#4a0a1e]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Total Requests</p>
                  <p className="text-2xl font-bold text-white mt-1">{totals.total || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-white/10" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a0209] border-[#4a0a1e]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Pending Approval</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{totals.pending || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-400/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a0209] border-[#4a0a1e]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Approved</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{totals.approved || 0}</p>
                </div>
                <Check className="w-8 h-8 text-emerald-400/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a0209] border-[#4a0a1e]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Approved Total</p>
                  <p className="text-xl font-bold text-[#ffffff] mt-1">{formatCost(totals.approved_total)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-[#ffffff]/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setViewMode("requests")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "requests" ? "bg-[#8B1538] text-white" : "bg-[#1a0209] text-white/50 border border-[#4a0a1e]"}`}>
            All Requests
          </button>
          <button onClick={() => setViewMode("departments")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "departments" ? "bg-[#8B1538] text-white" : "bg-[#1a0209] text-white/50 border border-[#4a0a1e]"}`}>
            <Building className="w-3 h-3 inline mr-1" /> By Department
          </button>
          <button onClick={() => setViewMode("team")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "team" ? "bg-[#8B1538] text-white" : "bg-[#1a0209] text-white/50 border border-[#4a0a1e]"}`}>
            <User className="w-3 h-3 inline mr-1" /> By Team Member
          </button>
        </div>

        {viewMode === "departments" && summary?.byDepartment && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {summary.byDepartment.map((dept: any) => (
              <Card key={dept.department} className="bg-[#1a0209] border-[#4a0a1e] hover:border-[#8B1538]/50 transition-all cursor-pointer"
                onClick={() => { setFilterDept(dept.department); setViewMode("requests"); }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Building className="w-5 h-5 text-[#ffffff]" />
                    <h3 className="text-white font-semibold">{dept.department}</h3>
                  </div>
                  <div className="flex gap-4 text-sm flex-wrap">
                    <div><p className="text-white/40 text-xs">Total</p><p className="text-white font-bold">{dept.count}</p></div>
                    <div><p className="text-white/40 text-xs">Pending</p><p className="text-amber-400 font-bold">{dept.pending}</p></div>
                    <div><p className="text-white/40 text-xs">Approved</p><p className="text-emerald-400 font-bold">{dept.approved}</p></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[#ffffff] font-bold">{formatCost(dept.total_cost)}</p>
                    <p className="text-white/30 text-xs">Total requested</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {summary.byDepartment.length === 0 && (
              <p className="text-white/40 text-sm col-span-3 text-center py-8">No expense requests yet</p>
            )}
          </div>
        )}

        {viewMode === "team" && summary?.byRequester && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {summary.byRequester.map((person: any) => (
              <Card key={person.requester_id} className="bg-[#1a0209] border-[#4a0a1e] hover:border-[#8B1538]/50 transition-all cursor-pointer"
                onClick={() => { setFilterDept("all"); setViewMode("requests"); setSearchQuery(person.requester_name); }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#330311] flex items-center justify-center">
                      <User className="w-4 h-4 text-white/40" />
                    </div>
                    <h3 className="text-white font-semibold">{person.requester_name}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><p className="text-white/40 text-xs">Total</p><p className="text-white font-bold">{person.count}</p></div>
                    <div><p className="text-white/40 text-xs">Pending</p><p className="text-amber-400 font-bold">{person.pending}</p></div>
                    <div><p className="text-white/40 text-xs">Approved</p><p className="text-emerald-400 font-bold">{person.approved}</p></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[#ffffff] font-bold">{formatCost(person.total_cost)}</p>
                    <p className="text-white/30 text-xs">Total requested</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {summary.byRequester.length === 0 && (
              <p className="text-white/40 text-sm col-span-3 text-center py-8">No expense requests yet</p>
            )}
          </div>
        )}

        {viewMode === "requests" && (
          <>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#1a0209] border-[#4a0a1e] text-white pl-10" placeholder="Search requests..." />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-[160px] bg-[#1a0209] border-[#4a0a1e] text-white">
                  <Building className="w-3 h-3 mr-1 text-white/30" /><SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] bg-[#1a0209] border-[#4a0a1e] text-white">
                  <Filter className="w-3 h-3 mr-1 text-white/30" /><SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="purchased">Purchased</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px] bg-[#1a0209] border-[#4a0a1e] text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterEvent} onValueChange={setFilterEvent}>
                <SelectTrigger className="w-[160px] bg-[#1a0209] border-[#4a0a1e] text-white">
                  <Briefcase className="w-3 h-3 mr-1 text-white/30" /><SelectValue placeholder="Event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="company">Company Expense</SelectItem>
                  {events.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40">No expense requests found</p>
                <Button className="mt-4 bg-[#8B1538] text-white" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Submit First Request
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((req) => {
                  const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  const StatusIcon = sc.icon;
                  const isExpanded = expandedRequest === req.id;
                  return (
                    <Card key={req.id} className="bg-[#1a0209] border-[#4a0a1e] hover:border-[#4a0a1e]/80 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setExpandedRequest(isExpanded ? null : req.id)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white font-semibold truncate">{req.item_name}</h3>
                              <Badge className={`text-[10px] ${sc.bg}`}>
                                <StatusIcon className="w-3 h-3 mr-1" /> {req.status}
                              </Badge>
                              <Badge className={`text-[10px] ${PRIORITY_COLORS[req.priority] || PRIORITY_COLORS.medium}`}>
                                {req.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-white/40">
                              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {req.requester_name}</span>
                              {req.department && <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {req.department}</span>}
                              <span>{CATEGORIES.find(c => c.value === req.category)?.label || req.category}</span>
                              {req.event_name ? (
                                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {req.event_name}</span>
                              ) : (
                                <span className="text-[#ffffff]">Company</span>
                              )}
                              <span>{format(new Date(req.created_at), "dd MMM yyyy")}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-white">{req.currency} {formatCost(req.estimated_cost)}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                            {req.description && <div><p className="text-xs text-white/40 uppercase">Description</p><p className="text-sm text-white/70">{req.description}</p></div>}
                            {req.reason && <div><p className="text-xs text-white/40 uppercase">Reason</p><p className="text-sm text-white/70">{req.reason}</p></div>}
                            {req.notes && <div><p className="text-xs text-white/40 uppercase">Notes</p><p className="text-sm text-white/70">{req.notes}</p></div>}
                            {req.approved_by && <div><p className="text-xs text-white/40 uppercase">{req.status === "rejected" ? "Rejected" : "Approved"} By</p><p className="text-sm text-white/70">{req.approved_by} — {req.approved_at ? format(new Date(req.approved_at), "dd MMM yyyy HH:mm") : ""}</p></div>}
                            {req.rejected_reason && <div><p className="text-xs text-white/40 uppercase">Rejection Reason</p><p className="text-sm text-red-300">{req.rejected_reason}</p></div>}
                            {req.budget_item_id && <div><p className="text-xs text-emerald-400">Added to event budget as item {req.budget_item_id}</p></div>}
                            <div className="flex items-center gap-2 pt-2">
                              {req.status === "pending" && (
                                <>
                                  <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={approveMutation.isPending}
                                    onClick={(e) => { e.stopPropagation(); approveMutation.mutate(req.id); }}>
                                    {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />} Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    onClick={(e) => { e.stopPropagation(); setRejectDialog({ open: true, id: req.id }); }}>
                                    <X className="w-3 h-3 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="outline" className="border-white/10 text-white/40 hover:text-red-400 ml-auto"
                                onClick={(e) => { e.stopPropagation(); if (confirm("Delete this request?")) deleteMutation.mutate(req.id); }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-[#1a0209] border-[#4a0a1e] text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#ffffff]" /> New Expense Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Item / What You Need *</Label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)}
                className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. MacBook Pro, Standing Desk, Training Course" />
            </div>
            <div>
              <Label className="text-white/70">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="What is it and what specs?" rows={2} />
            </div>
            <div>
              <Label className="text-white/70">Reason / Business Justification</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
                className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Why do you need this?" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Estimated Cost *</Label>
                <Input type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)}
                  className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-white/70">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-white/70">Link to Event / Project (optional)</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue placeholder="Company Expense (no event)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Company Expense (no event)</SelectItem>
                  {events.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 mb-2 block">Priority</Label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`px-4 py-2 rounded-md border text-sm font-medium transition-all capitalize ${
                      priority === p ? "bg-[#8B1538] border-[#8B1538] text-white" : "bg-[#2a020d] border-[#4a0a1e] text-white/50"
                    }`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-white/70">Additional Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Any extra info..." rows={2} />
            </div>
            <Button className="w-full bg-[#8B1538] text-white" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog?.open} onOpenChange={() => { setRejectDialog(null); setRejectReason(""); }}>
        <DialogContent className="max-w-md bg-[#1a0209] border-[#4a0a1e] text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" /> Reject Expense Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Reason for Rejection</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Why is this request being rejected?" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-white/20 text-white" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" disabled={rejectMutation.isPending}
                onClick={() => { if (rejectDialog) rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason }); }}>
                {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PlannerLayout>
  );
}
