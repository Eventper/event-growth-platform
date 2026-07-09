import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import PlannerLayout from "@/components/PlannerLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, 
  BarChart3, 
  Clock, 
  Users, 
  DollarSign, 
  FileText, 
  Filter, 
  Plus, 
  ArrowLeft,
  Download,
  Upload,
  Settings,
  Grid,
  List,
  Activity,
  Target,
  TrendingUp,
  Columns,
  Play,
  Square,
  Timer,
  Repeat,
  Trash2,
  GripVertical,
  ChevronRight,
  RefreshCw,
  Zap,
  Power,
  ToggleLeft,
  ToggleRight,
  Flag,
  Printer,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import ActivityPlanner from "@/components/ActivityPlanner";
import { PlannerTimeline } from "@/components/PlannerTimeline";
import { BudgetManager } from "@/components/BudgetManager";
import { VendorManager } from "@/components/VendorManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { format, differenceInWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const KANBAN_COLUMNS = [
  { id: "not_started", label: "To Do", color: "bg-gray-500", textColor: "text-gray-200" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500", textColor: "text-blue-200" },
  { id: "completed", label: "Done", color: "bg-green-500", textColor: "text-green-200" },
  { id: "on_hold", label: "On Hold", color: "bg-amber-500", textColor: "text-amber-200" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-600 text-gray-200",
  medium: "bg-blue-600 text-blue-200",
  high: "bg-orange-600 text-orange-200",
  critical: "bg-red-600 text-red-200",
};

export default function ProjectManagementDashboard() {
  const { user, trackActivity } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeView, setActiveView] = useState("overview");
  const [timeRange, setTimeRange] = useState("month");
  const [draggedActivity, setDraggedActivity] = useState<string | null>(null);
  const [activeTimer, setActiveTimer] = useState<{ activityId: string; startTime: Date; elapsed: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [manualTimeOpen, setManualTimeOpen] = useState(false);
  const [manualTimeData, setManualTimeData] = useState({ hours: "", minutes: "", notes: "", activityId: "" });
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", triggerType: "task_completed", actionType: "notify_team", triggerConfig: {} as any, actionConfig: {} as any });
  const queryClient = qc;

  useEffect(() => {
    trackActivity('viewed_project_dashboard', 'project_management');
  }, [trackActivity]);

  useEffect(() => {
    if (activeTimer) {
      timerRef.current = setInterval(() => {
        setActiveTimer(prev => prev ? { ...prev, elapsed: Math.floor((Date.now() - prev.startTime.getTime()) / 1000) } : null);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTimer?.activityId]);

  const { data: events = [], isLoading: eventsLoading } = useQuery({ queryKey: ["/api/events"] });
  const { data: selectedEvent } = useQuery({ queryKey: ["/api/events", selectedEventId], enabled: !!selectedEventId });
  const { data: activities = [] } = useQuery({ queryKey: ["/api/activities", selectedEventId], enabled: !!selectedEventId });
  const { data: budgetData = { totalBudget: 0, spentAmount: 0 } } = useQuery({ queryKey: ["/api/budget", selectedEventId], enabled: !!selectedEventId });
  const { data: vendors = [] } = useQuery({ queryKey: ["/api/vendors", selectedEventId], enabled: !!selectedEventId });
  const { data: timeEntries = [] } = useQuery<any[]>({ queryKey: ["/api/time-entries", selectedEventId], queryFn: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/time-entries?eventId=${selectedEventId}`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? res.json() : [];
  }, enabled: !!selectedEventId });

  const { data: workflowRules = [] } = useQuery<any[]>({ queryKey: ["/api/workflow-rules", selectedEventId], queryFn: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/workflow-rules?eventId=${selectedEventId}`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? res.json() : [];
  }, enabled: !!selectedEventId });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/activities/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", selectedEventId] });
      toast({ title: "Task updated" });
    },
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/time-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries", selectedEventId] });
      toast({ title: "Time logged" });
    },
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/time-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries", selectedEventId] });
    },
  });

  const generateRecurringMutation = useMutation({
    mutationFn: async (activityId: string) => apiRequest("POST", `/api/activities/${activityId}/generate-recurring`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", selectedEventId] });
      toast({ title: "Recurring tasks generated" });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/workflow-rules", { ...data, eventId: selectedEventId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-rules", selectedEventId] });
      setNewRuleOpen(false);
      setNewRule({ name: "", triggerType: "task_completed", actionType: "notify_team", triggerConfig: {}, actionConfig: {} });
      toast({ title: "Automation rule created" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/workflow-rules/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-rules", selectedEventId] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/workflow-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-rules", selectedEventId] });
      toast({ title: "Rule deleted" });
    },
  });

  const activitiesArray = Array.isArray(activities) ? activities : [];
  const vendorsArray = Array.isArray(vendors) ? vendors : [];
  const projectStats = {
    totalActivities: activitiesArray.length || 0,
    completedActivities: activitiesArray.filter((a: any) => a.status === 'completed').length || 0,
    overdueTasks: activitiesArray.filter((a: any) => a.status !== 'completed' && a.deadline && new Date(a.deadline) < new Date()).length || 0,
    totalBudget: (budgetData as any)?.totalBudget || 0,
    spentBudget: (budgetData as any)?.spentAmount || 0,
    activeVendors: vendorsArray.filter((v: any) => v.status === 'confirmed').length || 0,
    completionPercentage: activitiesArray.length > 0 ? Math.round((activitiesArray.filter((a: any) => a.status === 'completed').length / activitiesArray.length) * 100) : 0
  };

  const totalTrackedMinutes = (timeEntries || []).reduce((sum: number, e: any) => sum + (e.durationMinutes || 0), 0);
  const totalTrackedHours = Math.round(totalTrackedMinutes / 60 * 10) / 10;

  const startTimer = (activityId: string) => {
    if (activeTimer) stopTimer();
    setActiveTimer({ activityId, startTime: new Date(), elapsed: 0 });
  };

  const stopTimer = () => {
    if (!activeTimer) return;
    const durationMinutes = Math.max(1, Math.round(activeTimer.elapsed / 60));
    createTimeEntryMutation.mutate({
      activityId: activeTimer.activityId,
      eventId: selectedEventId,
      startTime: activeTimer.startTime.toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes,
    });
    setActiveTimer(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const logManualTime = () => {
    const totalMinutes = (parseInt(manualTimeData.hours || "0") * 60) + parseInt(manualTimeData.minutes || "0");
    if (totalMinutes <= 0) return;
    const now = new Date();
    const start = new Date(now.getTime() - totalMinutes * 60000);
    createTimeEntryMutation.mutate({
      activityId: manualTimeData.activityId || null,
      eventId: selectedEventId,
      startTime: start.toISOString(),
      endTime: now.toISOString(),
      durationMinutes: totalMinutes,
      notes: manualTimeData.notes,
    });
    setManualTimeOpen(false);
    setManualTimeData({ hours: "", minutes: "", notes: "", activityId: "" });
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (e: React.DragEvent, activityId: string) => {
    setDraggedActivity(activityId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (draggedActivity) {
      updateActivityMutation.mutate({ id: draggedActivity, status: targetStatus });
      setDraggedActivity(null);
    }
  };

  const renderOverviewDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="text-2xl font-bold">{projectStats.completionPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                <p className="text-2xl font-bold">{projectStats.totalActivities - projectStats.completedActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-amber-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Budget Used</p>
                <p className="text-2xl font-bold">{Math.round((projectStats.spentBudget / projectStats.totalBudget) * 100) || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vendors</p>
                <p className="text-2xl font-bold">{projectStats.activeVendors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Timer className="h-8 w-8 text-teal-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hours Tracked</p>
                <p className="text-2xl font-bold">{totalTrackedHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Project Timeline</CardTitle></CardHeader>
        <CardContent>
          {selectedEvent && (selectedEvent as any).startDate ? (
            <div className="text-center py-6 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3" />
              <p>Switch to the Timeline tab for the full visual timeline</p>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>Set an event date to see the project timeline</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderKanbanBoard = () => (
    <div className="space-y-4">
      {activeTimer && (
        <Card className="border-green-500/50 bg-green-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Timer running: {activitiesArray.find((a: any) => a.id === activeTimer.activityId)?.taskName || "Task"}</span>
              <span className="text-2xl font-mono font-bold text-green-700">{formatElapsed(activeTimer.elapsed)}</span>
            </div>
            <Button onClick={stopTimer} variant="destructive" size="sm"><Square className="w-4 h-4 mr-2" />Stop & Log</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map(column => {
          const columnActivities = activitiesArray.filter((a: any) => {
            if (column.id === "not_started") return a.status === "not_started" || a.status === "cancelled";
            return a.status === column.id;
          });

          return (
            <div
              key={column.id}
              className="rounded-xl bg-white/5 border border-white/10 min-h-[400px] flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", column.color)} />
                  <h3 className="font-semibold text-sm">{column.label}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">{columnActivities.length}</Badge>
              </div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {columnActivities.map((activity: any) => (
                  <div
                    key={activity.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, activity.id)}
                    className={cn(
                      "rounded-lg p-3 bg-white border border-gray-200 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow",
                      draggedActivity === activity.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900 leading-tight">{activity.taskName}</h4>
                      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    </div>
                    {activity.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{activity.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge className={cn("text-[10px] px-1.5 py-0", PRIORITY_COLORS[activity.priority] || "bg-gray-600 text-gray-200")}>{activity.priority}</Badge>
                        {activity.recurrenceType && activity.recurrenceType !== "none" && (
                          <Repeat className="w-3 h-3 text-blue-500" aria-label="Recurring" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {activity.deadline && (
                          <span className={cn("text-[10px]", new Date(activity.deadline) < new Date() && activity.status !== "completed" ? "text-red-500 font-semibold" : "text-gray-400")}>
                            {format(new Date(activity.deadline), 'MMM d')}
                          </span>
                        )}
                        {column.id !== "completed" && (
                          <button
                            onClick={() => startTimer(activity.id)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-green-600"
                            title="Start timer"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {activity.owner && (
                      <div className="mt-2 text-[10px] text-gray-400 capitalize">{activity.owner === 'custom' ? activity.customOwner : activity.owner}</div>
                    )}
                  </div>
                ))}
                {columnActivities.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Drag tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTimeTracking = () => (
    <div className="space-y-6">
      {activeTimer && (
        <Card className="border-green-500/50 bg-green-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Timer: {activitiesArray.find((a: any) => a.id === activeTimer.activityId)?.taskName || "Task"}</span>
              <span className="text-2xl font-mono font-bold text-green-700">{formatElapsed(activeTimer.elapsed)}</span>
            </div>
            <Button onClick={stopTimer} variant="destructive" size="sm"><Square className="w-4 h-4 mr-2" />Stop & Log</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Timer className="w-8 h-8 mx-auto mb-2 text-teal-600" />
            <p className="text-3xl font-bold">{totalTrackedHours}h</p>
            <p className="text-sm text-gray-500">Total Tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold">{(timeEntries || []).length}</p>
            <p className="text-sm text-gray-500">Time Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="text-3xl font-bold">{new Set((timeEntries || []).map((e: any) => e.activityId).filter(Boolean)).size}</p>
            <p className="text-sm text-gray-500">Tasks Tracked</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Log Time</CardTitle>
            <Dialog open={manualTimeOpen} onOpenChange={setManualTimeOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ backgroundColor: '#330311', color: 'white' }}>
                  <Plus className="w-4 h-4 mr-2" />Manual Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Time Manually</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Task (optional)</label>
                    <Select value={manualTimeData.activityId} onValueChange={(v) => setManualTimeData(d => ({ ...d, activityId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a task" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific task</SelectItem>
                        {activitiesArray.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>{a.taskName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Hours</label>
                      <Input type="number" min="0" value={manualTimeData.hours} onChange={e => setManualTimeData(d => ({ ...d, hours: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Minutes</label>
                      <Input type="number" min="0" max="59" value={manualTimeData.minutes} onChange={e => setManualTimeData(d => ({ ...d, minutes: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Notes</label>
                    <Textarea value={manualTimeData.notes} onChange={e => setManualTimeData(d => ({ ...d, notes: e.target.value }))} placeholder="What did you work on?" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={logManualTime} style={{ backgroundColor: '#330311', color: 'white' }}>Log Time</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 mb-3">Quick Timer — click play on any task to start tracking</p>
            {activitiesArray.filter((a: any) => a.status !== "completed").slice(0, 8).map((activity: any) => (
              <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge className={cn("text-[10px] shrink-0", PRIORITY_COLORS[activity.priority] || "bg-gray-600")}>{activity.priority}</Badge>
                  <span className="text-sm font-medium truncate">{activity.taskName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {activeTimer?.activityId === activity.id ? (
                    <>
                      <span className="text-sm font-mono text-green-700">{formatElapsed(activeTimer!.elapsed)}</span>
                      <Button size="sm" variant="destructive" onClick={stopTimer}><Square className="w-3 h-3" /></Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => startTimer(activity.id)}><Play className="w-3 h-3" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Time Entries</CardTitle></CardHeader>
        <CardContent>
          {(timeEntries || []).length === 0 ? (
            <p className="text-center text-gray-500 py-6">No time entries yet. Start a timer or log time manually.</p>
          ) : (
            <div className="space-y-2">
              {(timeEntries || []).slice(0, 20).map((entry: any) => {
                const task = activitiesArray.find((a: any) => a.id === entry.activityId);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task?.taskName || "General"}</p>
                      {entry.notes && <p className="text-xs text-gray-500 truncate">{entry.notes}</p>}
                      <p className="text-xs text-gray-400">{entry.startTime && format(new Date(entry.startTime), 'MMM d, h:mm a')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium">
                        {entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m` : "—"}
                      </span>
                      <button onClick={() => deleteTimeEntryMutation.mutate(entry.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderRecurringTasks = () => {
    const recurringActivities = activitiesArray.filter((a: any) => a.recurrenceType && a.recurrenceType !== "none");
    const childActivities = activitiesArray.filter((a: any) => a.parentActivityId);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Repeat className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-3xl font-bold">{recurringActivities.length}</p>
              <p className="text-sm text-gray-500">Recurring Templates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-3xl font-bold">{childActivities.length}</p>
              <p className="text-sm text-gray-500">Generated Instances</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-3xl font-bold">{childActivities.filter((a: any) => a.status === "completed").length}</p>
              <p className="text-sm text-gray-500">Completed Instances</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recurring Tasks</CardTitle>
              <p className="text-sm text-gray-500">Set recurrence on any task in the Activities tab, then generate instances here</p>
            </div>
          </CardHeader>
          <CardContent>
            {recurringActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Repeat className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium mb-1">No recurring tasks yet</p>
                <p className="text-sm">Edit a task in the Activities tab and set a recurrence schedule</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recurringActivities.map((activity: any) => {
                  const instances = childActivities.filter((a: any) => a.parentActivityId === activity.id);
                  return (
                    <div key={activity.id} className="p-4 rounded-lg border bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-blue-500" />
                          <h4 className="font-medium">{activity.taskName}</h4>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateRecurringMutation.mutate(activity.id)}
                          disabled={generateRecurringMutation.isPending}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Generate
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="capitalize">Every {activity.recurrenceInterval > 1 ? `${activity.recurrenceInterval} ` : ""}{activity.recurrenceType?.replace("ly", activity.recurrenceInterval > 1 ? "s" : "")}</span>
                        {activity.deadline && <span>Starting {format(new Date(activity.deadline), 'MMM d, yyyy')}</span>}
                        {activity.recurrenceEndDate && <span>Until {format(new Date(activity.recurrenceEndDate), 'MMM d, yyyy')}</span>}
                        <Badge variant="secondary">{instances.length} instances</Badge>
                      </div>
                      {instances.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {instances.slice(0, 12).map((inst: any) => (
                            <Badge
                              key={inst.id}
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                inst.status === "completed" ? "bg-green-50 border-green-300 text-green-700" :
                                inst.deadline && new Date(inst.deadline) < new Date() ? "bg-red-50 border-red-300 text-red-700" :
                                "bg-gray-50"
                              )}
                            >
                              {inst.deadline ? format(new Date(inst.deadline), 'MMM d') : "No date"}
                              {inst.status === "completed" && " ✓"}
                            </Badge>
                          ))}
                          {instances.length > 12 && <Badge variant="outline" className="text-[10px]">+{instances.length - 12} more</Badge>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const TRIGGER_TYPES = [
    { value: "task_completed", label: "When a task is completed" },
    { value: "status_changed", label: "When task status changes" },
    { value: "task_overdue", label: "When a task becomes overdue" },
    { value: "priority_is", label: "When task priority is set" },
  ];
  const ACTION_TYPES = [
    { value: "notify_team", label: "Send notification" },
    { value: "change_status", label: "Change task status" },
    { value: "assign_to", label: "Assign to owner" },
    { value: "set_priority", label: "Set priority" },
    { value: "create_task", label: "Create a new task" },
  ];

  const renderWorkflowAutomation = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-3xl font-bold">{(workflowRules as any[]).length}</p>
            <p className="text-sm text-gray-500">Active Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Power className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold">{(workflowRules as any[]).filter((r: any) => r.isActive).length}</p>
            <p className="text-sm text-gray-500">Enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold">{(workflowRules as any[]).filter((r: any) => !r.isActive).length}</p>
            <p className="text-sm text-gray-500">Paused</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Automation Rules</CardTitle>
            <Dialog open={newRuleOpen} onOpenChange={setNewRuleOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ backgroundColor: '#330311', color: 'white' }}>
                  <Plus className="w-4 h-4 mr-2" />New Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Automation Rule</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Rule Name</label>
                    <Input value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} placeholder="e.g. Notify when task completed" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">When this happens (Trigger)</label>
                    <Select value={newRule.triggerType} onValueChange={v => setNewRule(r => ({ ...r, triggerType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {newRule.triggerType === "status_changed" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">From status</label>
                        <Select value={newRule.triggerConfig.fromStatus || ""} onValueChange={v => setNewRule(r => ({ ...r, triggerConfig: { ...r.triggerConfig, fromStatus: v } }))}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">To status</label>
                        <Select value={newRule.triggerConfig.toStatus || ""} onValueChange={v => setNewRule(r => ({ ...r, triggerConfig: { ...r.triggerConfig, toStatus: v } }))}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {newRule.triggerType === "priority_is" && (
                    <div>
                      <label className="text-xs text-gray-500">Priority level</label>
                      <Select value={newRule.triggerConfig.priority || "critical"} onValueChange={v => setNewRule(r => ({ ...r, triggerConfig: { ...r.triggerConfig, priority: v } }))}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Then do this (Action)</label>
                    <Select value={newRule.actionType} onValueChange={v => setNewRule(r => ({ ...r, actionType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {newRule.actionType === "notify_team" && (
                    <div>
                      <label className="text-xs text-gray-500">Notification message</label>
                      <Input value={newRule.actionConfig.message || ""} onChange={e => setNewRule(r => ({ ...r, actionConfig: { ...r.actionConfig, message: e.target.value } }))} placeholder="Task has been completed" />
                    </div>
                  )}
                  {newRule.actionType === "change_status" && (
                    <div>
                      <label className="text-xs text-gray-500">Change to status</label>
                      <Select value={newRule.actionConfig.newStatus || ""} onValueChange={v => setNewRule(r => ({ ...r, actionConfig: { ...r.actionConfig, newStatus: v } }))}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {newRule.actionType === "assign_to" && (
                    <div>
                      <label className="text-xs text-gray-500">Assign to</label>
                      <Select value={newRule.actionConfig.owner || ""} onValueChange={v => setNewRule(r => ({ ...r, actionConfig: { ...r.actionConfig, owner: v } }))}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planner">Planner</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {newRule.actionType === "set_priority" && (
                    <div>
                      <label className="text-xs text-gray-500">Set priority to</label>
                      <Select value={newRule.actionConfig.priority || ""} onValueChange={v => setNewRule(r => ({ ...r, actionConfig: { ...r.actionConfig, priority: v } }))}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {newRule.actionType === "create_task" && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500">New task name</label>
                        <Input value={newRule.actionConfig.taskName || ""} onChange={e => setNewRule(r => ({ ...r, actionConfig: { ...r.actionConfig, taskName: e.target.value } }))} placeholder="Follow-up task" />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={() => newRule.name && createRuleMutation.mutate(newRule)} disabled={!newRule.name || createRuleMutation.isPending} style={{ backgroundColor: '#330311', color: 'white' }}>
                    Create Rule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {(workflowRules as any[]).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium mb-1">No automation rules yet</p>
              <p className="text-sm">Create rules like "When task completed, notify team" or "When task is overdue, set priority to critical"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(workflowRules as any[]).map((rule: any) => (
                <div key={rule.id} className={cn("p-4 rounded-lg border bg-white", !rule.isActive && "opacity-60")}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Zap className={cn("w-4 h-4", rule.isActive ? "text-amber-500" : "text-gray-400")} />
                      <h4 className="font-medium">{rule.name}</h4>
                      {!rule.isActive && <Badge variant="secondary" className="text-xs">Paused</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRuleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                        className="text-gray-400 hover:text-gray-600"
                        title={rule.isActive ? "Pause rule" : "Enable rule"}
                      >
                        {rule.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => deleteRuleMutation.mutate(rule.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Badge variant="outline" className="text-xs">
                      {TRIGGER_TYPES.find(t => t.value === rule.triggerType)?.label || rule.triggerType}
                    </Badge>
                    <ChevronRight className="w-3 h-3" />
                    <Badge variant="outline" className="text-xs">
                      {ACTION_TYPES.find(a => a.value === rule.actionType)?.label || rule.actionType}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderGanttChart = () => (
    <Card>
      <CardHeader>
        <CardTitle>Gantt Chart View</CardTitle>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activitiesArray.map((activity: any) => (
            <div key={activity.id} className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="w-48 flex-shrink-0">
                <p className="font-medium">{activity.taskName}</p>
                <p className="text-sm text-gray-500">{activity.phase}</p>
              </div>
              <div className="flex-1 relative">
                <div className="h-6 bg-gray-200 rounded">
                  <div
                    className={cn("h-full rounded", activity.status === 'completed' ? "bg-green-500" : activity.status === 'in_progress' ? "bg-blue-500" : "bg-gray-400")}
                    style={{ width: activity.status === 'completed' ? "100%" : activity.status === 'in_progress' ? "50%" : "10%" }}
                  />
                </div>
              </div>
              <div className="w-24 text-sm text-gray-500">
                {activity.deadline && format(new Date(activity.deadline), 'MMM dd')}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderCalendarView = () => (
    <Card>
      <CardHeader>
        <CardTitle>Calendar View</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-600">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {eachDayOfInterval({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }).map((day, index) => (
            <div key={index} className="aspect-square p-2 border border-gray-200 rounded">
              <div className="text-sm">{format(day, 'd')}</div>
              {activitiesArray.filter((activity: any) => activity.deadline && format(new Date(activity.deadline), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).map((activity: any) => (
                <div key={activity.id} className="text-xs bg-blue-100 text-blue-800 p-1 rounded mt-1 truncate">{activity.taskName}</div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderResourcesView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Resource Allocation</CardTitle></CardHeader>
        <CardContent><VendorManager eventId={selectedEventId} /></CardContent>
      </Card>
    </div>
  );

  const renderReportsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Tasks Completed On Time</span>
                <span className="font-bold text-green-600">
                  {projectStats.totalActivities > 0 ? Math.round((projectStats.completedActivities / projectStats.totalActivities) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Budget Utilization</span>
                <span className="font-bold text-blue-600">{Math.round((projectStats.spentBudget / projectStats.totalBudget) * 100) || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span>Time Tracked</span>
                <span className="font-bold text-teal-600">{totalTrackedHours} hours</span>
              </div>
              <div className="flex justify-between">
                <span>Active Vendors</span>
                <span className="font-bold text-purple-600">{projectStats.activeVendors}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Export Reports</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Project Status Report", "Budget Analysis", "Time Tracking Report", "Timeline Performance"].map(report => (
                <Button key={report} variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />{report}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (eventsLoading) {
    return (
      <PlannerLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mx-auto mb-4"></div>
            <p className="text-lg">Loading project management dashboard...</p>
          </div>
        </div>
      </PlannerLayout>
    );
  }

  return (
    <PlannerLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Project Management</h1>
            <p className="text-white/60 text-sm">Plan, track, and manage event activities</p>
          </div>
          {selectedEventId && activitiesArray.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                const eventName = (selectedEvent as any)?.name || 'Event';
                openPrintWindow({
                  title: `Project Management — ${eventName}`,
                  stats: [
                    { label: "Progress", value: `${projectStats.completionPercentage}%` },
                    { label: "Active Tasks", value: projectStats.totalActivities - projectStats.completedActivities },
                    { label: "Overdue", value: projectStats.overdueTasks },
                    { label: "Vendors", value: projectStats.activeVendors },
                    { label: "Hours Tracked", value: `${totalTrackedHours}h` },
                  ],
                  columns: [
                    { header: "Task", key: "taskName" },
                    { header: "Status", key: "status" },
                    { header: "Priority", key: "priority" },
                    { header: "Phase", key: "phase" },
                    { header: "Owner", key: "owner", format: (v: any, row: any) => v === 'custom' ? (row.customOwner || '-') : (v || '-') },
                    { header: "Deadline", key: "deadline", format: (v: any) => v ? format(new Date(v), 'MMM d, yyyy') : '-' },
                  ],
                  rows: activitiesArray as any[],
                  orientation: "landscape",
                });
              }}
            >
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!selectedEventId && (
          <div className="mb-6">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select an event to manage" />
              </SelectTrigger>
              <SelectContent>
                {(events as any[]).map((event: any) => (
                  <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedEventId ? (
          <Tabs value={activeView} onValueChange={setActiveView}>
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="kanban" className="flex items-center gap-1"><Columns className="w-3.5 h-3.5" />Board</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="gantt">Gantt</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="time" className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" />Time</TabsTrigger>
                <TabsTrigger value="recurring" className="flex items-center gap-1"><Repeat className="w-3.5 h-3.5" />Recurring</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-6">{renderOverviewDashboard()}</TabsContent>
            <TabsContent value="kanban" className="mt-6">{renderKanbanBoard()}</TabsContent>
            <TabsContent value="activities" className="mt-6"><ActivityPlanner eventId={selectedEventId} /></TabsContent>
            <TabsContent value="timeline" className="mt-6">
              <Card>
                <CardHeader><CardTitle>Project Timeline</CardTitle></CardHeader>
                <CardContent>
                  {selectedEvent && (selectedEvent as any).startDate && (
                    <PlannerTimeline
                      eventDate={new Date((selectedEvent as any).startDate)}
                      eventType={(selectedEvent as any).type}
                      eventCategory={(selectedEvent as any).eventCategory}
                      guestCount={(selectedEvent as any).guestCount}
                      budget={Number((selectedEvent as any).budget)}
                      complexity="moderate"
                      onTaskUpdate={(taskId, completed) => { console.log(`Task ${taskId} ${completed ? 'completed' : 'uncompleted'}`); }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="gantt" className="mt-6">{renderGanttChart()}</TabsContent>
            <TabsContent value="calendar" className="mt-6">{renderCalendarView()}</TabsContent>
            <TabsContent value="time" className="mt-6">{renderTimeTracking()}</TabsContent>
            <TabsContent value="recurring" className="mt-6">{renderRecurringTasks()}</TabsContent>
            <TabsContent value="resources" className="mt-6">{renderResourcesView()}</TabsContent>
            <TabsContent value="budget" className="mt-6">
              <BudgetManager eventId={selectedEventId} totalBudget={(budgetData as any)?.totalBudget || 0} currency="USD" />
            </TabsContent>
            <TabsContent value="reports" className="mt-6">{renderReportsView()}</TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Select an Event</h3>
              <p className="text-gray-500 mb-4">Choose an event to access the full project management suite</p>
              <Button onClick={() => setLocation('/create-event')} style={{ backgroundColor: '#330311', color: 'white' }}>
                <Plus className="w-4 h-4 mr-2" />Create New Event
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PlannerLayout>
  );
}
