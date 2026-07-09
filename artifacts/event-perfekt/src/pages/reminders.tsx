import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell, Clock, CreditCard, Building, Flag, Plus, Wand2, Trash2, XCircle,
  AlertTriangle, CheckCircle, Loader2, AlarmClock, Printer,
} from "lucide-react";
import { format } from "date-fns";
import { openPrintWindow } from "@/lib/printUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Reminder {
  id: number;
  event_id: number | null;
  user_id: number | null;
  type: string;
  title: string;
  message: string | null;
  due_date: string;
  sent_at: string | null;
  status: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  custom: { icon: Bell, label: "Custom", color: "text-purple-400" },
  task_due: { icon: Clock, label: "Task Due", color: "text-blue-400" },
  payment_due: { icon: CreditCard, label: "Payment Due", color: "text-amber-400" },
  vendor_followup: { icon: Building, label: "Vendor Follow-up", color: "text-emerald-400" },
  milestone: { icon: Flag, label: "Milestone", color: "text-rose-400" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.custom;
}

export default function RemindersPage() {
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType, setFormType] = useState("custom");
  const [formDueDate, setFormDueDate] = useState("");
  const [formEventId, setFormEventId] = useState("");
  const { toast } = useToast();

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const now = new Date();

  const filtered = reminders.filter((r) => {
    if (filter === "pending") return r.status === "pending";
    if (filter === "dismissed") return r.status === "dismissed";
    return true;
  });

  const totalCount = reminders.length;
  const pendingCount = reminders.filter((r) => r.status === "pending").length;
  const overdueCount = reminders.filter(
    (r) => r.status === "pending" && new Date(r.due_date) < now
  ).length;
  const dismissedCount = reminders.filter((r) => r.status === "dismissed").length;

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reminders/generate"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminders Generated", description: `${data.generated || 0} reminders created` });
    },
    onError: () => toast({ title: "Error", description: "Failed to generate reminders", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/reminders", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder Created" });
      setShowAdd(false);
      setFormTitle("");
      setFormMessage("");
      setFormType("custom");
      setFormDueDate("");
      setFormEventId("");
    },
    onError: () => toast({ title: "Error", description: "Failed to create reminder", variant: "destructive" }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/reminders/${id}`, { status: "dismissed" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder Dismissed" });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, hours }: { id: number; hours: number }) => {
      const newDate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      return apiRequest("PATCH", `/api/reminders/${id}`, { dueDate: newDate, status: "pending" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder Snoozed" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder Deleted" });
    },
  });

  const handleCreate = () => {
    if (!formTitle || !formDueDate) return;
    createMutation.mutate({
      eventId: formEventId ? Number(formEventId) : undefined,
      type: formType,
      title: formTitle,
      message: formMessage,
      dueDate: formDueDate,
    });
  };

  const grouped = Object.entries(TYPE_CONFIG).reduce<Record<string, Reminder[]>>((acc, [key]) => {
    const items = filtered.filter((r) => r.type === key);
    if (items.length > 0) acc[key] = items;
    return acc;
  }, {});
  const ungrouped = filtered.filter((r) => !TYPE_CONFIG[r.type]);
  if (ungrouped.length > 0) grouped["custom"] = [...(grouped["custom"] || []), ...ungrouped];

  const summaryCards = [
    { label: "Total", value: totalCount, icon: Bell, bg: "bg-white/10" },
    { label: "Pending", value: pendingCount, icon: Clock, bg: "bg-amber-500/20" },
    { label: "Overdue", value: overdueCount, icon: AlertTriangle, bg: "bg-red-500/20" },
    { label: "Dismissed", value: dismissedCount, icon: CheckCircle, bg: "bg-green-500/20" },
  ];

  return (
    <PlannerLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Reminders & Notifications</h1>
            <p className="text-sm text-white/60">Stay on top of deadlines and follow-ups</p>
          </div>
          <div className="flex gap-2">
            {filtered.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => openPrintWindow({
                  title: "Reminders & Notifications",
                  stats: [
                    { label: "Total", value: totalCount },
                    { label: "Pending", value: pendingCount },
                    { label: "Overdue", value: overdueCount },
                    { label: "Dismissed", value: dismissedCount },
                  ],
                  columns: [
                    { header: "Title", key: "title" },
                    { header: "Type", key: "type", format: (v: string) => getTypeConfig(v).label },
                    { header: "Due Date", key: "due_date", format: (v: string) => format(new Date(v), "MMM d, yyyy h:mm a") },
                    { header: "Status", key: "status" },
                  ],
                  rows: filtered,
                })}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Auto-Generate
            </Button>
            <Button onClick={() => setShowAdd(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              <Plus className="w-4 h-4 mr-2" /> Add Reminder
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <div key={card.label} className={`${card.bg} backdrop-blur-sm rounded-xl p-4 border border-white/10`}>
              <div className="flex items-center gap-3">
                <card.icon className="w-5 h-5 text-white/70" />
                <div>
                  <p className="text-xs text-white/50">{card.label}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {["all", "pending", "dismissed"].map((tab) => (
            <Button
              key={tab}
              variant={filter === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab)}
              className={
                filter === tab
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-transparent text-white/60 border-white/20 hover:bg-white/10 hover:text-white"
              }
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-12 border border-white/10 text-center">
            <Bell className="w-12 h-12 text-white/30 mx-auto mb-3" />
            <p className="text-white/60 font-medium">No reminders found</p>
            <p className="text-white/40 text-sm mt-1">Create or auto-generate reminders to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, items]) => {
              const config = getTypeConfig(type);
              const Icon = config.icon;
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <h2 className="text-lg font-semibold text-white">{config.label}</h2>
                    <Badge className="bg-white/10 text-white/70 text-xs">{items.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {items.map((reminder) => {
                      const isOverdue = reminder.status === "pending" && new Date(reminder.due_date) < now;
                      return (
                        <div
                          key={reminder.id}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-white font-medium">{reminder.title}</h3>
                                {reminder.status === "pending" && !isOverdue && (
                                  <Badge className="bg-amber-500/20 text-amber-300 text-xs">Pending</Badge>
                                )}
                                {isOverdue && (
                                  <Badge className="bg-red-500/20 text-red-300 text-xs">Overdue</Badge>
                                )}
                                {reminder.status === "dismissed" && (
                                  <Badge className="bg-white/10 text-white/50 text-xs">Dismissed</Badge>
                                )}
                              </div>
                              {reminder.message && (
                                <p className="text-white/60 text-sm mb-2">{reminder.message}</p>
                              )}
                              <div className="flex items-center gap-3 text-white/40 text-xs">
                                <span>Due: {format(new Date(reminder.due_date), "MMM d, yyyy h:mm a")}</span>
                                {reminder.event_id && (() => {
                                  const ev = events.find((e: any) => String(e.id) === String(reminder.event_id));
                                  return ev ? <Badge className="bg-white/5 text-white/40 text-xs border-white/10">{ev.name || ev.title}</Badge> : null;
                                })()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {reminder.status === "pending" && (
                                <>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10"
                                        title="Snooze"
                                      >
                                        <AlarmClock className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-[#1a0508] border-white/10 text-white">
                                      <DropdownMenuItem onClick={() => snoozeMutation.mutate({ id: reminder.id, hours: 1 })} className="text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                                        1 hour
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => snoozeMutation.mutate({ id: reminder.id, hours: 24 })} className="text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                                        1 day
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => snoozeMutation.mutate({ id: reminder.id, hours: 168 })} className="text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                                        1 week
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => dismissMutation.mutate(reminder.id)}
                                    className="text-white/50 hover:text-white hover:bg-white/10"
                                    title="Dismiss"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(reminder.id)}
                                className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#1a0508] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Reminder title"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label className="text-white/70">Message</Label>
              <Textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Optional details..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label className="text-white/70">Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="task_due">Task Due</SelectItem>
                  <SelectItem value="payment_due">Payment Due</SelectItem>
                  <SelectItem value="vendor_followup">Vendor Follow-up</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70">Due Date</Label>
              <Input
                type="datetime-local"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label className="text-white/70">Event (optional)</Label>
              <Select value={formEventId} onValueChange={setFormEventId}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select event..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Event</SelectItem>
                  {events.map((ev: any) => (
                    <SelectItem key={ev.id} value={String(ev.id)}>
                      {ev.name || ev.title || `Event #${ev.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formTitle || !formDueDate}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Reminder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PlannerLayout>
  );
}
