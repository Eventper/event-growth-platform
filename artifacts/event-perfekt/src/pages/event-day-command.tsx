import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Radio, Users, CheckSquare, AlertTriangle, Clock, UserCheck, Activity,
  Zap, Send, RefreshCw, MessageSquare, User, ChevronRight, Plus, X,
  Timer, MapPin, Phone, Flag, ChevronDown, Bell, Flame, Shield
} from "lucide-react";
import { format, differenceInMinutes, isPast, isWithinInterval, addMinutes } from "date-fns";

function safeFormat(dateVal: string | null | undefined, fmt: string, fallback = "—"): string {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, fmt);
  } catch {
    return fallback;
  }
}

interface CheckinStats {
  total: number;
  checkedIn: number;
  accepted: number;
  vip: number;
  vipCheckedIn: number;
}

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  group: string;
  tableAssignment: string;
  rsvpStatus: string;
  checkedIn: boolean;
  checkedInAt: string | null;
}

function Countdown({ startDate }: { startDate: string }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    const target = new Date(startDate);
    if (isNaN(target.getTime())) {
      setDisplay("—");
      return;
    }
    const tick = () => {
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      if (diffMs < 0) {
        const elapsed = Math.abs(diffMs);
        const h = Math.floor(elapsed / 3600000);
        const m = Math.floor((elapsed % 3600000) / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);
        setDisplay(`Event in progress: +${h}h ${m}m ${s}s`);
      } else {
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const s = Math.floor((diffMs % 60000) / 1000);
        setDisplay(`Starts in ${h}h ${m}m ${s}s`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startDate]);
  return <span className="font-mono text-lg">{display}</span>;
}

export default function EventDayCommand() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [teamMessage, setTeamMessage] = useState("");
  const [incidentForm, setIncidentForm] = useState({ title: "", description: "", priority: "medium" });
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: events = [] } = useQuery<any[]>({ queryKey: ["/api/events"] });

  const selectedEvent = events.find((e: any) => String(e.id) === selectedEventId);

  const { data: checkinData, refetch: refetchCheckin } = useQuery<{ stats: CheckinStats; guests: Guest[]; event: any }>({
    queryKey: ["/api/events", selectedEventId, "checkin-status"],
    enabled: !!selectedEventId,
    queryFn: () =>
      fetch(`/api/events/${selectedEventId}/guests/checkin-status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).then((r) => r.json()),
    refetchInterval: 30000,
  });

  const { data: activities = [] } = useQuery<any[]>({
    queryKey: ["/api/activities", selectedEventId],
    enabled: !!selectedEventId,
    queryFn: () =>
      fetch(`/api/events/${selectedEventId}/activities`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).then((r) => r.json()),
    refetchInterval: 60000,
  });

  const { data: teamData = [] } = useQuery<any[]>({
    queryKey: ["/api/events", selectedEventId, "team"],
    enabled: !!selectedEventId,
    queryFn: () =>
      fetch(`/api/events/${selectedEventId}/team`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).then((r) => r.json()),
    refetchInterval: 60000,
  });

  const { data: tickets = [], refetch: refetchTickets } = useQuery<any[]>({
    queryKey: ["/api/tickets"],
    refetchInterval: 30000,
  });

  const { data: teamMessages = [], refetch: refetchMessages } = useQuery<any[]>({
    queryKey: ["/api/team-chat"],
    queryFn: () =>
      fetch("/api/team-chat", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).then((r) => r.json()),
    refetchInterval: 15000,
  });

  const checkinMutation = useMutation({
    mutationFn: (guestId: string) =>
      apiRequest("POST", `/api/events/${selectedEventId}/guests/${guestId}/checkin`, {}),
    onSuccess: () => {
      refetchCheckin();
      toast({ title: "Guest checked in" });
    },
  });

  const incidentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tickets", data),
    onSuccess: () => {
      refetchTickets();
      setShowIncidentDialog(false);
      setIncidentForm({ title: "", description: "", priority: "medium" });
      toast({ title: "Incident logged", description: "Your team has been notified." });
    },
  });

  const taskStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/activities/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/activities", selectedEventId] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => apiRequest("POST", "/api/team-chat", { message }),
    onSuccess: () => {
      setTeamMessage("");
      refetchMessages();
    },
  });

  const stats = checkinData?.stats;
  const guestList: Guest[] = checkinData?.guests || [];
  const recentCheckins = guestList
    .filter((g) => g.checkedIn && g.checkedInAt)
    .sort((a, b) => new Date(b.checkedInAt!).getTime() - new Date(a.checkedInAt!).getTime())
    .slice(0, 10);

  const notYetCheckedIn = guestList
    .filter((g) => !g.checkedIn && (g.rsvpStatus === "accepted" || g.rsvpStatus === "confirmed"))
    .slice(0, 8);

  const activitiesArr = Array.isArray(activities) ? activities : [];
  const dayTasks = activitiesArr.filter((a) => a.phase === "event_day" || a.status === "in_progress");
  const completedTasks = activitiesArr.filter((a) => a.status === "completed").length;
  const openIncidents = (Array.isArray(tickets) ? tickets : []).filter(
    (t: any) => t.status === "open" || t.status === "in_progress"
  );

  const checkinRate = stats?.accepted ? Math.round((stats.checkedIn / stats.accepted) * 100) : 0;

  const priorityColor = {
    low: "bg-blue-500/20 text-blue-300",
    medium: "bg-yellow-500/20 text-yellow-300",
    high: "bg-orange-500/20 text-orange-300",
    critical: "bg-red-500/20 text-red-300",
  } as Record<string, string>;

  const taskStatusColor = {
    not_started: "text-gray-400",
    in_progress: "text-blue-400",
    completed: "text-green-400",
    blocked: "text-red-400",
  } as Record<string, string>;

  if (!selectedEventId) {
    return (
      <PlannerLayout>
        <div className="px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Radio className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Event Day Command Centre</h1>
              <p className="text-white/60 text-sm">Live event management — check-in, team, tasks, incidents</p>
            </div>
          </div>

          <Card className="max-w-2xl mx-auto mt-16 bg-white/5 border-white/10">
            <CardContent className="pt-12 pb-12 text-center">
              <Radio className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Select an Event to Begin</h2>
              <p className="text-white/50 mb-6">Choose the event you are managing today to open the Command Centre</p>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white max-w-sm mx-auto">
                  <SelectValue placeholder="Choose event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{e.name}</span>
                        <span className="text-xs text-gray-400">
                          {safeFormat(e.startDate, "dd MMM yyyy", "TBD")} · {e.guestCount || 0} guests
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </PlannerLayout>
    );
  }

  return (
    <PlannerLayout>
      <div className="px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg flex-shrink-0">
              <Radio className="h-5 w-5 text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white truncate">{selectedEvent?.name || "Event Day Command"}</h1>
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 border animate-pulse text-xs">LIVE</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedEvent?.venue || selectedEvent?.city || "Venue TBD"}
                </span>
                {selectedEvent?.startDate && (
                  <span className="flex items-center gap-1 text-yellow-300">
                    <Timer className="h-3 w-3" />
                    <Countdown startDate={selectedEvent.startDate} />
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white h-8 text-xs w-40">
                <SelectValue placeholder="Switch event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((e: any) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-gray-300 hover:bg-white/10 h-8"
              onClick={() => { refetchCheckin(); refetchTickets(); refetchMessages(); }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs"
              onClick={() => setShowIncidentDialog(true)}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Log Incident
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs"
              onClick={() => {
                apiRequest("PATCH", `/api/events/${selectedEventId}/workflow`, { workflowStatus: 'post_event' });
                setLocation(`/post-event/${selectedEventId}`);
              }}
            >
              Wrap Up
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="h-5 w-5 text-green-400" />
                <span className="text-xs text-green-300">{checkinRate}%</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats?.checkedIn ?? 0}<span className="text-sm font-normal text-white/50">/{stats?.accepted ?? stats?.total ?? 0}</span>
              </div>
              <div className="text-xs text-green-300 mt-1">Guests Checked In</div>
              <Progress value={checkinRate} className="mt-2 h-1.5" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-blue-400" />
                <span className="text-xs text-blue-300">Team</span>
              </div>
              <div className="text-2xl font-bold text-white">{teamData.length}</div>
              <div className="text-xs text-blue-300 mt-1">Team Members Assigned</div>
              <div className="flex items-center gap-1 mt-2">
                {teamData.slice(0, 5).map((m: any, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-blue-500/40 border border-blue-500/50 flex items-center justify-center text-xs text-blue-200">
                    {(m.userName || m.role || "?")[0]?.toUpperCase()}
                  </div>
                ))}
                {teamData.length > 5 && <span className="text-xs text-blue-400">+{teamData.length - 5}</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckSquare className="h-5 w-5 text-purple-400" />
                <span className="text-xs text-purple-300">
                  {activitiesArr.length > 0 ? Math.round((completedTasks / activitiesArr.length) * 100) : 0}%
                </span>
              </div>
              <div className="text-2xl font-bold text-white">
                {completedTasks}<span className="text-sm font-normal text-white/50">/{activitiesArr.length}</span>
              </div>
              <div className="text-xs text-purple-300 mt-1">Tasks Completed</div>
              <Progress
                value={activitiesArr.length > 0 ? (completedTasks / activitiesArr.length) * 100 : 0}
                className="mt-2 h-1.5"
              />
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${openIncidents.length > 0 ? "from-red-900/40 to-red-800/20 border-red-500/30" : "from-gray-900/40 to-gray-800/20 border-gray-500/30"}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className={`h-5 w-5 ${openIncidents.length > 0 ? "text-red-400" : "text-gray-400"}`} />
                {openIncidents.length > 0 && (
                  <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                    {openIncidents.length}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white">{openIncidents.length}</div>
              <div className={`text-xs mt-1 ${openIncidents.length > 0 ? "text-red-300" : "text-gray-400"}`}>
                Open Incidents
              </div>
              {openIncidents.length === 0 && (
                <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> All clear
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* VIP Alert */}
        {stats && stats.vip > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Flag className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-300 font-medium">VIP Status:</span>
              <span className="text-white">{stats.vipCheckedIn}/{stats.vip} VIP guests checked in</span>
              {stats.vipCheckedIn < stats.vip && (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 border text-xs">
                  {stats.vip - stats.vipCheckedIn} VIP awaited
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Left: Check-in Feed */}
          <div className="xl:col-span-2 space-y-4">
            {/* Live Check-in */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-400" />
                    Live Check-in Feed
                  </CardTitle>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 border text-xs">
                    {recentCheckins.length} recent
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {recentCheckins.length === 0 ? (
                  <div className="text-center py-6 text-white/40 text-sm">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No check-ins yet
                  </div>
                ) : (
                  recentCheckins.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-1.5 px-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-500/30 flex items-center justify-center text-xs text-green-300 font-medium">
                          {g.firstName?.[0]}{g.lastName?.[0]}
                        </div>
                        <div>
                          <div className="text-sm text-white font-medium">{g.firstName} {g.lastName}</div>
                          <div className="text-xs text-white/40">
                            {g.group && <span className="mr-1">{g.group} ·</span>}
                            {g.tableAssignment && <span>Table {g.tableAssignment} ·</span>}
                            {g.checkedInAt && <span> {safeFormat(g.checkedInAt, "HH:mm")}</span>}
                          </div>
                        </div>
                      </div>
                      <CheckSquare className="h-4 w-4 text-green-400" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Awaiting Guests */}
            {notYetCheckedIn.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    Awaited Guests ({notYetCheckedIn.length}
                    {guestList.filter((g) => !g.checkedIn && (g.rsvpStatus === "accepted" || g.rsvpStatus === "confirmed")).length > 8
                      ? `+ more`
                      : ""})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {notYetCheckedIn.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-1.5 px-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">
                          {g.firstName?.[0]}{g.lastName?.[0]}
                        </div>
                        <div>
                          <div className="text-sm text-white">{g.firstName} {g.lastName}</div>
                          {g.group && <div className="text-xs text-white/40">{g.group}</div>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => checkinMutation.mutate(g.id)}
                        disabled={checkinMutation.isPending}
                      >
                        <UserCheck className="h-3 w-3 mr-1" /> Check In
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Team Board */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  Team Board
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamData.length === 0 ? (
                  <div className="text-center py-4 text-white/40 text-sm">No team members assigned to this event</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {teamData.map((member: any) => (
                      <div key={member.id} className="flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-sm text-blue-200 font-medium flex-shrink-0">
                          {(member.userName || member.role || "?")[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm text-white font-medium truncate">
                            {member.userName || `Member ${member.id?.slice(0, 4)}`}
                          </div>
                          <div className="text-xs text-blue-300 truncate">{member.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Tasks + Incidents + Chat */}
          <div className="space-y-4">
            {/* Today's Tasks */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-purple-400" />
                  Event Day Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {activitiesArr.length === 0 ? (
                  <div className="text-center py-4 text-white/40 text-sm">No tasks for this event</div>
                ) : (
                  activitiesArr.slice(0, 12).map((task: any) => (
                    <div key={task.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5">
                      <button
                        onClick={() => taskStatusMutation.mutate({
                          id: task.id,
                          status: task.status === "completed" ? "in_progress" : "completed",
                        })}
                        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          task.status === "completed"
                            ? "bg-green-500 border-green-500"
                            : "border-white/30 hover:border-green-400"
                        }`}
                      >
                        {task.status === "completed" && <span className="text-white text-xs">✓</span>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm ${task.status === "completed" ? "line-through text-white/30" : "text-white"}`}>
                          {task.taskName || task.task_name}
                        </div>
                        {task.owner && task.owner !== "planner" && (
                          <div className="text-xs text-white/40">{task.owner}</div>
                        )}
                      </div>
                      <div className={`text-xs flex-shrink-0 ${taskStatusColor[task.status] || "text-gray-400"}`}>
                        {task.status === "in_progress" ? "●" : task.status === "completed" ? "✓" : "○"}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Open Incidents */}
            <Card className={`border ${openIncidents.length > 0 ? "bg-red-900/10 border-red-500/20" : "bg-white/5 border-white/10"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-base flex items-center gap-2 ${openIncidents.length > 0 ? "text-red-300" : "text-white"}`}>
                    <AlertTriangle className={`h-4 w-4 ${openIncidents.length > 0 ? "text-red-400" : "text-gray-400"}`} />
                    Incidents
                  </CardTitle>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setShowIncidentDialog(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Log
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {openIncidents.length === 0 ? (
                  <div className="text-center py-3 text-white/40 text-xs flex items-center justify-center gap-1">
                    <Shield className="h-4 w-4" /> No open incidents
                  </div>
                ) : (
                  openIncidents.slice(0, 5).map((t: any) => (
                    <div key={t.id} className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm text-white font-medium">{t.title}</div>
                        <Badge className={`text-xs ${priorityColor[t.priority] || priorityColor.medium} border flex-shrink-0`}>
                          {t.priority}
                        </Badge>
                      </div>
                      {t.description && (
                        <div className="text-xs text-white/50 mt-1 line-clamp-2">{t.description}</div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Team Chat */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-pink-400" />
                  Team Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {(Array.isArray(teamMessages) ? teamMessages : []).slice(-5).reverse().map((msg: any) => (
                    <div key={msg.id} className="text-xs p-2 bg-white/5 rounded">
                      <span className="text-purple-300 font-medium">{msg.userName || "Team"}: </span>
                      <span className="text-white/70">{msg.message}</span>
                    </div>
                  ))}
                  {!teamMessages.length && (
                    <div className="text-center text-white/30 text-xs py-2">No messages yet</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={teamMessage}
                    onChange={(e) => setTeamMessage(e.target.value)}
                    placeholder="Send team message..."
                    className="bg-white/5 border-white/20 text-white text-sm h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && teamMessage.trim()) {
                        sendMessageMutation.mutate(teamMessage.trim());
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 bg-[#8B1538] hover:bg-[#a01d45] text-white flex-shrink-0"
                    disabled={!teamMessage.trim() || sendMessageMutation.isPending}
                    onClick={() => sendMessageMutation.mutate(teamMessage.trim())}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Log Incident Dialog */}
        <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
          <DialogContent className="bg-[#1A0812] border-red-500/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-300">
                <AlertTriangle className="h-5 w-5" />
                Log Incident
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Incident Title *</label>
                <Input
                  value={incidentForm.title}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Microphone not working, Guest injury, Catering delay..."
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Description</label>
                <Textarea
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What happened? Location, people involved, actions taken so far..."
                  rows={3}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Priority</label>
                <Select value={incidentForm.priority} onValueChange={(v) => setIncidentForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — Monitor</SelectItem>
                    <SelectItem value="medium">Medium — Needs attention</SelectItem>
                    <SelectItem value="high">High — Act now</SelectItem>
                    <SelectItem value="critical">Critical — Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10" onClick={() => setShowIncidentDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!incidentForm.title || incidentMutation.isPending}
                onClick={() => incidentMutation.mutate({
                  title: incidentForm.title,
                  description: incidentForm.description,
                  priority: incidentForm.priority,
                  status: "open",
                  eventId: selectedEventId,
                })}
              >
                <Flame className="h-4 w-4 mr-2" />
                {incidentMutation.isPending ? "Logging..." : "Log Incident"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlannerLayout>
  );
}
