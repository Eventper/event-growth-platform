import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import PlannerSidebar from "@/components/PlannerSidebar";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ticket,
  Plus,
  Search,
  AlertCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  CheckCircle2,
  XCircle,
  CircleDot,
  Loader2,
  MessageSquare,
  User,
  Calendar,
  Send,
  Filter,
  ChevronLeft,
  Trash2,
  Tag,
  Lock,
  Printer,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface TicketItem {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  event_id: string;
  event_name: string;
  reported_by: string;
  reporter_name: string;
  reporter_email: string;
  assigned_to: string;
  assignee_name: string;
  resolution: string;
  resolved_at: string;
  created_at: string;
  updated_at: string;
}

interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "bug", label: "Bug / Error" },
  { value: "vendor", label: "Vendor Issue" },
  { value: "payment", label: "Payment / Billing" },
  { value: "access", label: "Access / Permissions" },
  { value: "event", label: "Event Issue" },
  { value: "feature", label: "Feature Request" },
  { value: "urgent", label: "Urgent / Emergency" },
];

const PRIORITIES = [
  { value: "low", label: "Low", icon: ArrowDown, color: "text-blue-400" },
  { value: "medium", label: "Medium", icon: Minus, color: "text-amber-400" },
  { value: "high", label: "High", icon: ArrowUp, color: "text-orange-400" },
  { value: "critical", label: "Critical", icon: AlertCircle, color: "text-red-400" },
];

const STATUSES = [
  { value: "open", label: "Open", icon: CircleDot, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "in_progress", label: "In Progress", icon: Loader2, color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { value: "waiting", label: "Waiting", icon: Clock, color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { value: "resolved", label: "Resolved", icon: CheckCircle2, color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { value: "closed", label: "Closed", icon: XCircle, color: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
];

export default function TicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManagement = user?.role === "admin" || user?.role === "planner";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPriority, setNewPriority] = useState("medium");
  const [newEventId, setNewEventId] = useState("");

  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Pending edits for inline fields on selected ticket: { field: value }
  const [pendingEdits, setPendingEdits] = useState<Record<string, string>>({});
  const [savedFlash, setSavedFlash] = useState<Record<string, number>>({});

  const setPending = (field: string, value: string) => {
    setPendingEdits(prev => ({ ...prev, [field]: value }));
  };
  const isDirty = (field: string) => pendingEdits[field] !== undefined;
  const savePending = (field: string) => {
    const val = pendingEdits[field];
    if (val === undefined || !selectedTicket) return;
    updateMutation.mutate({ id: selectedTicket.id, [field === "assignedTo" ? "assigned_to" : field]: val });
    setPendingEdits(prev => { const n = { ...prev }; delete n[field]; return n; });
    setSavedFlash(prev => ({ ...prev, [field]: Date.now() }));
  };

  const { data: tickets = [], isLoading } = useQuery<TicketItem[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const { data: allUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isManagement,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery<TicketComment[]>({
    queryKey: ["/api/tickets", selectedTicket?.id, "comments"],
    enabled: !!selectedTicket,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tickets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setCreateOpen(false);
      setNewTitle(""); setNewDescription(""); setNewCategory("general"); setNewPriority("medium"); setNewEventId("");
      toast({ title: "Ticket created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create ticket", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: string; priority?: string; assignedTo?: string; resolution?: string; category?: string }) =>
      apiRequest("PATCH", `/api/tickets/${id}`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, ...data });
      }
      toast({ title: "Ticket updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ ticketId, message, isInternal }: { ticketId: number; message: string; isInternal: boolean }) =>
      apiRequest("POST", `/api/tickets/${ticketId}/comments`, { message, isInternal }),
    onSuccess: () => {
      refetchComments();
      setCommentText("");
      toast({ title: "Comment added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add comment", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tickets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setDeleteConfirmId(null);
      setSelectedTicket(null);
      toast({ title: "Ticket deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch = t.title?.toLowerCase().includes(search.toLowerCase()) || t.ticket_number?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchCategory = categoryFilter === "all" || t.category === categoryFilter;
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchCategory && matchPriority;
    });
  }, [tickets, search, statusFilter, categoryFilter, priorityFilter]);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    critical: tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved' && t.status !== 'closed').length,
  };

  const getPriorityIcon = (priority: string) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    if (!p) return { Icon: Minus, color: "text-white/40" };
    return { Icon: p.icon, color: p.color };
  };

  const getStatusConfig = (status: string) => {
    return STATUSES.find(s => s.value === status) || STATUSES[0];
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const timeAgo = (d?: string) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (selectedTicket) {
    const ticket = selectedTicket;
    const statusCfg = getStatusConfig(ticket.status);
    const StatusIcon = statusCfg.icon;
    const { Icon: PriorityIcon, color: priorityColor } = getPriorityIcon(ticket.priority);

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
        <PlannerSidebar />
        <main className="lg:ml-60 p-4 sm:p-6 lg:p-8">
          <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-1 text-white/50 hover:text-white text-sm mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to tickets
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-white/10 text-white/60 border border-white/10 text-xs font-mono">{ticket.ticket_number}</Badge>
                      <Badge className={`${statusCfg.color} border text-xs`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusCfg.label}
                      </Badge>
                      <span className={`flex items-center gap-1 text-xs ${priorityColor}`}>
                        <PriorityIcon className="w-3 h-3" />
                        {ticket.priority}
                      </span>
                    </div>
                    <h1 className="text-xl font-bold text-white">{ticket.title}</h1>
                  </div>
                  {user?.role === 'admin' && (
                    <Button size="sm" variant="ghost" className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10" onClick={() => setDeleteConfirmId(ticket.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {ticket.description && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
                    <p className="text-white/70 text-sm whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ticket.reporter_name || "Unknown"}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(ticket.created_at)}</span>
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}</span>
                  {ticket.event_name && <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> {ticket.event_name}</span>}
                </div>
              </div>

              {(ticket.status === 'resolved' || ticket.status === 'closed') && ticket.resolution && (
                <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-4">
                  <h3 className="text-emerald-300 font-medium text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Resolution
                  </h3>
                  <p className="text-white/70 text-sm">{ticket.resolution}</p>
                </div>
              )}

              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  Activity ({comments.length})
                </h3>

                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {comments.length === 0 && (
                    <p className="text-white/30 text-sm text-center py-6">No comments yet</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className={`rounded-lg p-3 border ${c.is_internal ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-medium">{c.user_name}</span>
                          <Badge className="bg-white/10 text-white/40 border-white/10 text-[10px]">{c.user_role}</Badge>
                          {c.is_internal && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]"><Lock className="w-2 h-2 mr-1" />Internal</Badge>}
                        </div>
                        <span className="text-white/30 text-[10px]">{formatDateTime(c.created_at)}</span>
                      </div>
                      <p className="text-white/70 text-sm">{c.message}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px] mb-2" />
                  <div className="flex items-center justify-between">
                    {isManagement && (
                      <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                        <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded border-white/20" />
                        <Lock className="w-3 h-3" />
                        Internal note (not visible to reporter)
                      </label>
                    )}
                    <div className="ml-auto">
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black gap-1" disabled={!commentText.trim() || addCommentMutation.isPending}
                        onClick={() => addCommentMutation.mutate({ ticketId: ticket.id, message: commentText, isInternal })}>
                        <Send className="w-3 h-3" />
                        {addCommentMutation.isPending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {isManagement && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-5 space-y-4">
                  <h3 className="text-white font-medium text-sm">Manage Ticket</h3>

                  <div>
                    <Label className="text-white/50 text-xs">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Select value={isDirty("status") ? pendingEdits.status! : ticket.status} onValueChange={(v) => setPending("status", v)}>
                        <SelectTrigger className={`bg-white/5 text-white flex-1 ${isDirty("status") ? "border-amber-400" : "border-white/10"}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {isDirty("status") && <Button size="sm" onClick={() => savePending("status")} disabled={updateMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black text-xs">{updateMutation.isPending ? "Saving..." : "Save"}</Button>}
                      {savedFlash["status"] && Date.now() - savedFlash["status"] < 2500 && <span className="text-emerald-400 text-xs font-bold">✓ Saved</span>}
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/50 text-xs">Priority</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Select value={isDirty("priority") ? pendingEdits.priority! : ticket.priority} onValueChange={(v) => setPending("priority", v)}>
                        <SelectTrigger className={`bg-white/5 text-white flex-1 ${isDirty("priority") ? "border-amber-400" : "border-white/10"}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {isDirty("priority") && <Button size="sm" onClick={() => savePending("priority")} disabled={updateMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black text-xs">{updateMutation.isPending ? "Saving..." : "Save"}</Button>}
                      {savedFlash["priority"] && Date.now() - savedFlash["priority"] < 2500 && <span className="text-emerald-400 text-xs font-bold">✓ Saved</span>}
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/50 text-xs">Assign To</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Select value={isDirty("assignedTo") ? pendingEdits.assignedTo! : (ticket.assigned_to || "")} onValueChange={(v) => setPending("assignedTo", v)}>
                        <SelectTrigger className={`bg-white/5 text-white flex-1 ${isDirty("assignedTo") ? "border-amber-400" : "border-white/10"}`}><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          {allUsers.filter(u => u.role === 'admin' || u.role === 'planner' || u.role === 'staff').map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isDirty("assignedTo") && <Button size="sm" onClick={() => savePending("assignedTo")} disabled={updateMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black text-xs">{updateMutation.isPending ? "Saving..." : "Save"}</Button>}
                      {savedFlash["assignedTo"] && Date.now() - savedFlash["assignedTo"] < 2500 && <span className="text-emerald-400 text-xs font-bold">✓ Saved</span>}
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/50 text-xs">Category</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Select value={isDirty("category") ? pendingEdits.category! : ticket.category} onValueChange={(v) => setPending("category", v)}>
                        <SelectTrigger className={`bg-white/5 text-white flex-1 ${isDirty("category") ? "border-amber-400" : "border-white/10"}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {isDirty("category") && <Button size="sm" onClick={() => savePending("category")} disabled={updateMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black text-xs">{updateMutation.isPending ? "Saving..." : "Save"}</Button>}
                      {savedFlash["category"] && Date.now() - savedFlash["category"] < 2500 && <span className="text-emerald-400 text-xs font-bold">✓ Saved</span>}
                    </div>
                  </div>

                  {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                    <div>
                      <Label className="text-white/50 text-xs">Resolution Notes</Label>
                      <Textarea value={resolutionText || ticket.resolution || ""} onChange={(e) => setResolutionText(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1 min-h-[60px]" placeholder="Describe how this was resolved..." />
                      <Button size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => updateMutation.mutate({ id: ticket.id, resolution: resolutionText })}>
                        Save Resolution
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-5 space-y-3">
                <h3 className="text-white font-medium text-sm">Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-white/40">Ticket ID</span><span className="text-white font-mono">{ticket.ticket_number}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Reported By</span><span className="text-white">{ticket.reporter_name}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Assigned To</span><span className="text-white">{ticket.assignee_name || "Unassigned"}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Created</span><span className="text-white">{formatDate(ticket.created_at)}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Updated</span><span className="text-white">{formatDate(ticket.updated_at)}</span></div>
                  {ticket.resolved_at && <div className="flex justify-between"><span className="text-white/40">Resolved</span><span className="text-emerald-400">{formatDate(ticket.resolved_at)}</span></div>}
                  {ticket.event_name && <div className="flex justify-between"><span className="text-white/40">Event</span><span className="text-white">{ticket.event_name}</span></div>}
                </div>
              </div>
            </div>
          </div>
        </main>

        <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="bg-[#1a0508] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2"><Trash2 className="w-5 h-5" />Delete Ticket</DialogTitle>
            </DialogHeader>
            <p className="text-white/70">Are you sure you want to permanently delete this ticket and all its comments?</p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="text-white/60">Cancel</Button>
              <Button onClick={() => { if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId); }} disabled={deleteMutation.isPending} className="bg-red-500 hover:bg-red-600 text-white">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
      <PlannerSidebar />
      <main className="lg:ml-60 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Ticket className="w-7 h-7 text-amber-400" />
              Issue Tickets
            </h1>
            <p className="text-white/50 text-sm mt-1">Log, track, and resolve issues across your events</p>
          </div>
          <div className="flex gap-2">
            {filtered.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => openPrintWindow({
                  title: "Issue Tickets",
                  stats: [
                    { label: "Total", value: stats.total },
                    { label: "Open", value: stats.open },
                    { label: "In Progress", value: stats.inProgress },
                    { label: "Resolved", value: stats.resolved },
                    { label: "Critical", value: stats.critical },
                  ],
                  columns: [
                    { header: "Ticket #", key: "ticket_number" },
                    { header: "Subject", key: "title" },
                    { header: "Priority", key: "priority" },
                    { header: "Status", key: "status", format: (v: string) => STATUSES.find(s => s.value === v)?.label || v },
                    { header: "Assigned To", key: "assignee_name", format: (v: string) => v || "Unassigned" },
                    { header: "Created", key: "created_at", format: (v: string) => formatDate(v) },
                  ],
                  rows: filtered,
                  orientation: "landscape",
                })}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-medium gap-2">
              <Plus className="w-4 h-4" />
              New Ticket
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <Ticket className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-white/50 text-xs">Total</p>
            <p className="text-white text-xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <CircleDot className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-white/50 text-xs">Open</p>
            <p className="text-white text-xl font-bold">{stats.open}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <Loader2 className="w-5 h-5 text-amber-400 mb-1" />
            <p className="text-white/50 text-xs">In Progress</p>
            <p className="text-white text-xl font-bold">{stats.inProgress}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
            <p className="text-white/50 text-xs">Resolved</p>
            <p className="text-white text-xl font-bold">{stats.resolved}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4 col-span-2 sm:col-span-1">
            <AlertCircle className="w-5 h-5 text-red-400 mb-1" />
            <p className="text-white/50 text-xs">Critical</p>
            <p className="text-white text-xl font-bold">{stats.critical}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/40" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-white/10 border-white/10 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 bg-white/10 border-white/10 text-white"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 bg-white/10 border-white/10 text-white"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-white/30">
              <Ticket className="w-12 h-12 mx-auto mb-3 text-white/10" />
              <p className="font-medium">No tickets found</p>
              <p className="text-xs mt-1">Create a new ticket to start tracking issues</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Ticket</th>
                    <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Priority</th>
                    <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider hidden lg:table-cell">Assignee</th>
                    <th className="text-left text-white/50 font-medium py-3 px-4 text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const statusCfg = getStatusConfig(t.status);
                    const StatusIcon = statusCfg.icon;
                    const { Icon: PIcon, color: pColor } = getPriorityIcon(t.priority);
                    return (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => { setSelectedTicket(t); setResolutionText(t.resolution || ""); }}>
                        <td className="py-3 px-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-white/40 text-[10px] font-mono">{t.ticket_number}</span>
                              {t.event_name && <span className="text-white/30 text-[10px]">• {t.event_name}</span>}
                            </div>
                            <p className="text-white font-medium truncate max-w-xs">{t.title}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <Badge className="bg-white/10 text-white/60 border border-white/10 text-[10px]">
                            {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`flex items-center gap-1 text-xs ${pColor}`}>
                            <PIcon className="w-3 h-3" />
                            <span className="hidden sm:inline">{t.priority}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${statusCfg.color} border text-[10px]`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <span className="text-white/60 text-xs">{t.assignee_name || "—"}</span>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <span className="text-white/40 text-xs">{timeAgo(t.created_at)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1a0508] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Create New Ticket
            </DialogTitle>
            <DialogDescription className="text-white/40">Log an issue, bug, or request for your team to track and resolve.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/60 text-xs">Title *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1" placeholder="Brief summary of the issue" />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="bg-white/10 border-white/10 text-white mt-1 min-h-[100px]" placeholder="Detailed description of the issue, steps to reproduce, expected vs actual behavior..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Related Event</Label>
                <Select value={newEventId} onValueChange={setNewEventId}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {events.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-white/60">Cancel</Button>
            <Button onClick={() => createMutation.mutate({ title: newTitle, description: newDescription, category: newCategory, priority: newPriority, eventId: newEventId && newEventId !== "none" ? newEventId : undefined })}
              disabled={createMutation.isPending || !newTitle.trim()} className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
              {createMutation.isPending ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}