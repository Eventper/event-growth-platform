import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Clock, Play, CheckCircle2, AlertTriangle, Pause,
  Users, Phone, Plus, Edit2, Save, X,
  ChevronDown, ChevronUp, MessageSquare, RefreshCw,
  Timer, MapPin, Calendar, Printer
} from "lucide-react";
import { format } from "date-fns";

interface Activity {
  id: string;
  eventId: string;
  taskName: string;
  description?: string;
  phase: string;
  owner: string;
  customOwner?: string;
  deadline?: string;
  status: string;
  priority: string;
  notes?: string;
  sortOrder?: number;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
}

interface RunSheetNote {
  id: string;
  activityId: string;
  text: string;
  timestamp: string;
  author: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bgClass: string }> = {
  not_started: { label: "Upcoming", color: "text-blue-400", icon: Clock, bgClass: "bg-blue-500/20 border-blue-500/30" },
  in_progress: { label: "In Progress", color: "text-amber-400", icon: Play, bgClass: "bg-amber-500/20 border-amber-500/30" },
  completed: { label: "Completed", color: "text-emerald-400", icon: CheckCircle2, bgClass: "bg-emerald-500/20 border-emerald-500/30" },
  delayed: { label: "Delayed", color: "text-red-400", icon: AlertTriangle, bgClass: "bg-red-500/20 border-red-500/30" },
  on_hold: { label: "On Hold", color: "text-gray-400", icon: Pause, bgClass: "bg-gray-500/20 border-gray-500/30" },
  cancelled: { label: "Cancelled", color: "text-gray-500", icon: X, bgClass: "bg-gray-600/20 border-gray-600/30" },
};

export default function RunSheet() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { id: "1", name: "Event Manager", role: "Lead Coordinator", phone: "+234 800 000 0001" },
    { id: "2", name: "Venue Contact", role: "Venue Manager", phone: "+234 800 000 0002" },
    { id: "3", name: "Security Lead", role: "Security", phone: "+234 800 000 0003" },
  ]);
  const [newContact, setNewContact] = useState({ name: "", role: "", phone: "" });
  const [showAddContact, setShowAddContact] = useState(false);
  const [activityNotes, setActivityNotes] = useState<Record<string, RunSheetNote[]>>({});
  const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>({});
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [teamInput, setTeamInput] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const { data: activitiesRaw = [], isLoading: activitiesLoading, refetch: refetchActivities } = useQuery<Activity[]>({
    queryKey: ["/api/events", selectedEventId, "activities"],
    queryFn: () => fetch(`/api/events/${selectedEventId}/activities`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).then(r => r.json()),
    enabled: !!selectedEventId,
    refetchInterval: 60000,
  });

  const activities = useMemo(() => {
    return [...activitiesRaw]
      .filter(a => a.phase === "event_day" || a.phase === "final_preparations")
      .sort((a, b) => {
        if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });
  }, [activitiesRaw]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/activities/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "activities"] });
      toast({ title: "Status updated", description: "Activity status has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiRequest("PATCH", `/api/activities/${id}`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "activities"] });
      toast({ title: "Notes saved" });
    },
  });

  const selectedEvent = events.find((e: any) => e.id === selectedEventId);

  const stats = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter(a => a.status === "completed").length;
    const inProgress = activities.filter(a => a.status === "in_progress").length;
    const delayed = activities.filter(a => a.status === "delayed").length;
    const upcoming = activities.filter(a => a.status === "not_started").length;
    return { total, completed, inProgress, delayed, upcoming };
  }, [activities]);

  const currentActivityIndex = useMemo(() => {
    const now = currentTime.getTime();
    for (let i = activities.length - 1; i >= 0; i--) {
      const a = activities[i];
      if (a.deadline && new Date(a.deadline).getTime() <= now && a.status !== "completed") {
        return i;
      }
    }
    for (let i = 0; i < activities.length; i++) {
      if (activities[i].status === "in_progress") return i;
    }
    for (let i = 0; i < activities.length; i++) {
      if (activities[i].status === "not_started") return i;
    }
    return -1;
  }, [activities, currentTime]);

  const handleAddNote = (activityId: string) => {
    if (!noteText.trim()) return;
    const note: RunSheetNote = {
      id: Date.now().toString(),
      activityId,
      text: noteText,
      timestamp: new Date().toISOString(),
      author: "Planner",
    };
    setActivityNotes(prev => ({
      ...prev,
      [activityId]: [...(prev[activityId] || []), note],
    }));
    setNoteText("");
    setEditingNote(null);
  };

  const handleSaveTeam = (activityId: string) => {
    setTeamAssignments(prev => ({ ...prev, [activityId]: teamInput }));
    setEditingTeam(null);
    setTeamInput("");
  };

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) return;
    setEmergencyContacts(prev => [
      ...prev,
      { ...newContact, id: Date.now().toString() },
    ]);
    setNewContact({ name: "", role: "", phone: "" });
    setShowAddContact(false);
  };

  const handleRemoveContact = (id: string) => {
    setEmergencyContacts(prev => prev.filter(c => c.id !== id));
  };

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handlePrintRunSheet = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const eventName = selectedEvent?.name || selectedEvent?.eventName || "Event";
    const statusSymbol = (s: string) => s === "completed" ? "✅" : s === "in_progress" ? "🔵" : s === "delayed" ? "🔴" : "⬜";
    const rows = activities.map(a => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap;">${a.deadline ? format(new Date(a.deadline), "h:mm a") : "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-weight:500;">${a.taskName}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${a.description || "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${teamAssignments[a.id] || a.customOwner || a.owner || "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${statusSymbol(a.status)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${(activityNotes[a.id] || []).map(n => n.text).join("; ") || "-"}</td>
      </tr>
    `).join("");
    const contactRows = emergencyContacts.map(c => `
      <tr><td style="padding:6px;border-bottom:1px solid #eee;">${c.name}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;">${c.role}</td>
      <td style="padding:6px;border-bottom:1px solid #eee;font-family:monospace;">${c.phone}</td></tr>
    `).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Run Sheet - ${eventName}</title>
      <style>
        body { font-family: 'Poppins', sans-serif;, Arial, sans-serif; padding: 30px; color: #333; }
        h1 { color: #330311; margin-bottom: 5px; }
        h2 { color: #330311; margin-top: 25px; margin-bottom: 10px; font-size: 16px; }
        .subtitle { color: #666; margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; padding: 12px; background: #f8f8f8; border-radius: 8px; flex-wrap: wrap; }
        .stat-item { text-align: center; min-width: 80px; }
        .stat-value { font-size: 22px; font-weight: bold; color: #330311; }
        .stat-label { font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 8px; background: #330311; color: white; font-size: 12px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 25px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        .emergency { margin-top: 20px; }
        .emergency table { max-width: 500px; }
        @media print { body { padding: 15px; } }
      </style></head><body>
      <h1>${eventName} — Day-of Run Sheet</h1>
      <p class="subtitle">Printed: ${new Date().toLocaleString()}</p>
      <div class="stats">
        <div class="stat-item"><div class="stat-value">${stats.total}</div><div class="stat-label">Total</div></div>
        <div class="stat-item"><div class="stat-value">${stats.completed}</div><div class="stat-label">Done</div></div>
        <div class="stat-item"><div class="stat-value">${stats.inProgress}</div><div class="stat-label">In Progress</div></div>
        <div class="stat-item"><div class="stat-value">${stats.delayed}</div><div class="stat-label">Delayed</div></div>
        <div class="stat-item"><div class="stat-value">${progressPercent}%</div><div class="stat-label">Progress</div></div>
      </div>
      <table><thead><tr>
        <th>Time</th><th>Activity</th><th>Description</th><th>Assigned To</th><th>Status</th><th>Notes</th>
      </tr></thead><tbody>${rows}</tbody></table>
      ${emergencyContacts.length > 0 ? `
        <div class="emergency">
          <h2>Emergency Contacts</h2>
          <table><thead><tr><th>Name</th><th>Role</th><th>Phone</th></tr></thead><tbody>${contactRows}</tbody></table>
        </div>
      ` : ""}
      <div class="footer">Event Perfekt — ...making yours perfekt</div>
    </body></html>`);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#16213e] via-[#1a1a2e] to-[#0f3460]">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 p-4 md:p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white font-[Poppins]">
                Day-of Run Sheet
              </h1>
              <p className="text-gray-400 mt-1">Real-time event day schedule & coordination</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20">
                <Timer className="w-4 h-4 text-amber-400" />
                <span className="text-white font-mono text-sm">
                  {format(currentTime, "h:mm a")}
                </span>
              </div>
              {selectedEventId && activities.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={handlePrintRunSheet}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => refetchActivities()}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white w-full sm:w-80">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event: any) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name || event.eventName || `Event ${event.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="default"
              className={`border-red-500/40 text-red-300 hover:bg-red-500/20 ${showEmergencyContacts ? "bg-red-500/20" : ""}`}
              onClick={() => setShowEmergencyContacts(!showEmergencyContacts)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Emergency Contacts
              {showEmergencyContacts ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          </div>

          {showEmergencyContacts && (
            <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-300 text-lg flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {emergencyContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div>
                        <p className="text-white font-medium text-sm">{contact.name}</p>
                        <p className="text-gray-400 text-xs">{contact.role}</p>
                        <a href={`tel:${contact.phone}`} className="text-red-300 text-sm font-mono hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-red-400 h-6 w-6 p-0"
                        onClick={() => handleRemoveContact(contact.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {showAddContact ? (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Name"
                      value={newContact.name}
                      onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                    <Input
                      placeholder="Role"
                      value={newContact.role}
                      onChange={e => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                    <Input
                      placeholder="Phone"
                      value={newContact.phone}
                      onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={handleAddContact} className="bg-red-600 hover:bg-red-700 text-white">
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddContact(false)} className="text-gray-400">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-red-300 hover:text-red-200"
                    onClick={() => setShowAddContact(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Contact
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {selectedEventId && selectedEvent && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/10 border-emerald-500/20 backdrop-blur-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
                  <p className="text-xs text-gray-400">Completed</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/10 border-amber-500/20 backdrop-blur-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">{stats.inProgress}</p>
                  <p className="text-xs text-gray-400">In Progress</p>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{stats.delayed}</p>
                  <p className="text-xs text-gray-400">Delayed</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/20 backdrop-blur-sm col-span-2 md:col-span-1">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{progressPercent}%</p>
                  <p className="text-xs text-gray-400">Progress</p>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedEventId && selectedEvent && (
            <div className="mb-2">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {!selectedEventId && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-white text-lg font-medium mb-2">Select an Event</h3>
                <p className="text-gray-400">Choose an event above to view its day-of run sheet</p>
              </CardContent>
            </Card>
          )}

          {selectedEventId && activitiesLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3" />
              <p className="text-gray-400">Loading run sheet...</p>
            </div>
          )}

          {selectedEventId && !activitiesLoading && activities.length === 0 && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-white text-lg font-medium mb-2">No Event Day Activities</h3>
                <p className="text-gray-400">
                  No activities found for the "event_day" or "final_preparations" phases.
                  Add activities in the Activity Planner first.
                </p>
              </CardContent>
            </Card>
          )}

          {selectedEventId && !activitiesLoading && activities.length > 0 && (
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10" />

              <div className="space-y-3">
                {activities.map((activity, index) => {
                  const config = STATUS_CONFIG[activity.status] || STATUS_CONFIG.not_started;
                  const StatusIcon = config.icon;
                  const isCurrent = index === currentActivityIndex;
                  const isExpanded = expandedActivity === activity.id;
                  const notes = activityNotes[activity.id] || [];
                  const assigned = teamAssignments[activity.id] || activity.customOwner || activity.owner;

                  return (
                    <div key={activity.id} className="relative pl-14">
                      <div
                        className={`absolute left-4 top-4 w-4 h-4 rounded-full border-2 z-10 flex items-center justify-center ${
                          isCurrent
                            ? "bg-amber-400 border-amber-300 ring-4 ring-amber-400/30 animate-pulse"
                            : activity.status === "completed"
                            ? "bg-emerald-500 border-emerald-400"
                            : activity.status === "delayed"
                            ? "bg-red-500 border-red-400"
                            : activity.status === "in_progress"
                            ? "bg-amber-500 border-amber-400"
                            : "bg-gray-600 border-gray-500"
                        }`}
                      />

                      {isCurrent && (
                        <div className="absolute left-1.5 top-1 z-0">
                          <div className="w-9 h-9 rounded-full bg-amber-400/20 animate-ping" />
                        </div>
                      )}

                      <Card
                        className={`border backdrop-blur-sm cursor-pointer transition-all ${
                          isCurrent
                            ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20"
                            : `${config.bgClass} bg-opacity-50`
                        }`}
                        onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <StatusIcon className={`w-5 h-5 flex-shrink-0 ${config.color}`} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-white font-medium text-sm truncate">
                                    {activity.taskName}
                                  </h3>
                                  {isCurrent && (
                                    <Badge className="bg-amber-500/30 text-amber-300 border-amber-500/40 text-[10px] px-1.5">
                                      NOW
                                    </Badge>
                                  )}
                                  {activity.priority === "critical" && (
                                    <Badge className="bg-red-500/30 text-red-300 border-red-500/40 text-[10px] px-1.5">
                                      CRITICAL
                                    </Badge>
                                  )}
                                </div>
                                {activity.deadline && (
                                  <p className="text-gray-400 text-xs mt-0.5">
                                    {format(new Date(activity.deadline), "h:mm a")}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex items-center gap-1 text-gray-400 text-xs">
                                <Users className="w-3 h-3" />
                                <span className="capitalize">{assigned}</span>
                              </div>
                              <Badge className={`${config.bgClass} ${config.color} border text-[10px]`}>
                                {config.label}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 space-y-4" onClick={e => e.stopPropagation()}>
                              <Separator className="bg-white/10" />

                              {activity.description && (
                                <p className="text-gray-300 text-sm">{activity.description}</p>
                              )}

                              <div className="flex flex-wrap gap-2">
                                <span className="text-gray-400 text-xs mr-1 self-center">Status:</span>
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                  <Button
                                    key={key}
                                    size="sm"
                                    variant={activity.status === key ? "default" : "outline"}
                                    className={`text-xs h-7 px-2 ${
                                      activity.status === key
                                        ? "bg-white/20 text-white"
                                        : "border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
                                    }`}
                                    onClick={() => updateStatusMutation.mutate({ id: activity.id, status: key })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    {cfg.label}
                                  </Button>
                                ))}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-400 text-xs">Assigned Team:</span>
                                  {editingTeam === activity.id ? (
                                    <div className="flex items-center gap-1 flex-1">
                                      <Input
                                        value={teamInput}
                                        onChange={e => setTeamInput(e.target.value)}
                                        placeholder="e.g. John, Sarah, Mike"
                                        className="bg-white/10 border-white/20 text-white text-xs h-7 flex-1"
                                      />
                                      <Button size="sm" className="h-7 px-2" onClick={() => handleSaveTeam(activity.id)}>
                                        <Save className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-gray-400"
                                        onClick={() => setEditingTeam(null)}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="text-white text-xs capitalize">{assigned}</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 p-0 text-gray-500 hover:text-white"
                                        onClick={() => {
                                          setEditingTeam(activity.id);
                                          setTeamInput(assigned);
                                        }}
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <MessageSquare className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-400 text-xs">Notes & Issues:</span>
                                </div>

                                {activity.notes && (
                                  <div className="p-2 rounded bg-white/5 border border-white/10 mb-2">
                                    <p className="text-gray-300 text-xs">{activity.notes}</p>
                                  </div>
                                )}

                                {notes.map(note => (
                                  <div key={note.id} className="p-2 rounded bg-white/5 border border-white/10 mb-1">
                                    <p className="text-gray-300 text-xs">{note.text}</p>
                                    <p className="text-gray-500 text-[10px] mt-1">
                                      {note.author} — {format(new Date(note.timestamp), "h:mm a")}
                                    </p>
                                  </div>
                                ))}

                                {editingNote === activity.id ? (
                                  <div className="flex gap-1 mt-2">
                                    <Textarea
                                      value={noteText}
                                      onChange={e => setNoteText(e.target.value)}
                                      placeholder="Add a note or issue..."
                                      className="bg-white/10 border-white/20 text-white text-xs min-h-[60px] flex-1"
                                    />
                                    <div className="flex flex-col gap-1">
                                      <Button size="sm" className="h-7 px-2" onClick={() => handleAddNote(activity.id)}>
                                        <Save className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-gray-400"
                                        onClick={() => { setEditingNote(null); setNoteText(""); }}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-white text-xs mt-1 h-6 px-2"
                                    onClick={() => setEditingNote(activity.id)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Note
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
