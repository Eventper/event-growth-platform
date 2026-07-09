import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/use-page-meta";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, AlertTriangle, Calendar, Clock, ChevronLeft,
  RefreshCw, Loader2, ArrowLeft, ExternalLink, ClipboardList,
  Building2, Palette, Star, Sunrise, PartyPopper, RotateCcw,
  ChevronDown, ChevronRight, Users, Zap
} from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import plannerEmptyImage from "@assets/IMG_7777_1778229052603.png";

const PHASE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: any; order: number }> = {
  "PRE-PLANNING":      { label: "Pre-Planning",       color: "text-purple-700", bg: "bg-purple-50",   border: "border-purple-200", icon: ClipboardList, order: 1 },
  "PLANNING":          { label: "Planning",            color: "text-blue-700",   bg: "bg-blue-50",     border: "border-blue-200",   icon: Building2,     order: 2 },
  "CREATIVE & DESIGN": { label: "Creative & Design",  color: "text-pink-700",   bg: "bg-pink-50",     border: "border-pink-200",   icon: Palette,       order: 3 },
  "PRE-EVENT":         { label: "Pre-Event",           color: "text-amber-700",  bg: "bg-amber-50",    border: "border-amber-200",  icon: Star,          order: 4 },
  "EVENT DAY":         { label: "Event Day",           color: "text-red-700",    bg: "bg-red-50",      border: "border-red-200",    icon: Sunrise,       order: 5 },
  "POST-EVENT":        { label: "Post-Event",          color: "text-green-700",  bg: "bg-green-50",    border: "border-green-200",  icon: PartyPopper,   order: 6 },
};

function extractPhase(title: string): string {
  const match = title.match(/^\[([^\]]+)\]/);
  return match ? match[1] : "GENERAL";
}

function cleanTitle(title: string): string {
  return title.replace(/^\[[^\]]+\]\s*/, "");
}

function getDueDateLabel(dueDate: string | null): { label: string; color: string } {
  if (!dueDate) return { label: "No date", color: "text-gray-400" };
  try {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return { label: "No date", color: "text-gray-400" };
    if (isToday(d)) return { label: "Today", color: "text-orange-600 font-semibold" };
    const diff = differenceInDays(d, new Date());
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "text-red-600 font-semibold" };
    if (diff === 0) return { label: "Today", color: "text-orange-600 font-semibold" };
    if (diff <= 7) return { label: `${diff}d left`, color: "text-amber-600" };
    return { label: format(d, "d MMM yyyy"), color: "text-gray-500" };
  } catch {
    return { label: "No date", color: "text-gray-400" };
  }
}

export default function EventPlanner() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  usePageMeta({ title: "Enhanced Planner — Event Perfekt" });

  const { data: event, isLoading: eventLoading } = useQuery<any>({
    queryKey: ["/api/events", eventId],
    queryFn: () => fetch(`/api/events/${eventId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("bridge_token") || ""}` }
    }).then(r => r.json()),
    enabled: !!eventId,
  });

  const { data: activities = [], isLoading: tasksLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "activities"],
    queryFn: () => fetch(`/api/events/${eventId}/activities`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("bridge_token") || ""}` }
    }).then(r => r.json()),
    enabled: !!eventId,
  });

  const generateMutation = useMutation({
    mutationFn: ({ force }: { force: boolean }) =>
      apiRequest("POST", `/api/events/${eventId}/generate-planner${force ? "?force=true" : ""}`),
    onSuccess: (data: any) => {
      toast({
        title: data.generated > 0 ? `Planner generated` : "Planner already exists",
        description: data.generated > 0 ? `${data.generated} planning tasks have been created` : data.message,
      });
      qc.invalidateQueries({ queryKey: ["/api/events", eventId, "activities"] });
    },
    onError: () => toast({ title: "Failed to generate planner", description: "Please try again in a moment.", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/activities/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/events", eventId, "activities"] }),
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    (activities as any[]).forEach(a => {
      const phase = extractPhase(a.title);
      if (!map.has(phase)) map.set(phase, []);
      map.get(phase)!.push(a);
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      const pa = PHASE_META[a]?.order ?? 99;
      const pb = PHASE_META[b]?.order ?? 99;
      return pa - pb;
    });
    return sorted;
  }, [activities]);

  const totalTasks = (activities as any[]).length;
  const completedTasks = (activities as any[]).filter(a => a.status === "completed").length;
  const overdueTasks = (activities as any[]).filter(a => {
    if (a.status === "completed") return false;
    if (!a.dueDate) return false;
    try { return isPast(new Date(a.dueDate)) && !isToday(new Date(a.dueDate)); } catch { return false; }
  }).length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const toggleCollapse = (phase: string) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      s.has(phase) ? s.delete(phase) : s.add(phase);
      return s;
    });
  };

  const handleToggleTask = (task: any) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    toggleMutation.mutate({ id: task.id, status: newStatus });
  };

  const isLoading = eventLoading || tasksLoading;

  const safeDate = (d: any) => {
    try { const x = new Date(d); return isNaN(x.getTime()) ? null : x; } catch { return null; }
  };
  const eventDate = event ? safeDate(event.startDate) : null;

  if (isLoading) {
    return (
      <PlannerLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#8B1538]" />
        </div>
      </PlannerLayout>
    );
  }

  return (
    <PlannerLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation(`/event-dashboard/${eventId}`)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Enhanced Planner</h1>
                <Badge className="bg-[#8B1538] text-white border-[#8B1538] text-xs">Auto-generated</Badge>
              </div>
              {event && (
                <p className="text-white/60 text-sm mt-0.5">
                  {event.name}
                  {eventDate && <span className="ml-2">· {format(eventDate, "d MMM yyyy")}</span>}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/event-dashboard/${eventId}`)}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Event Dashboard
            </Button>
            {totalTasks === 0 ? (
              <Button
                size="sm"
                onClick={() => generateMutation.mutate({ force: false })}
                disabled={generateMutation.isPending}
                className="bg-[#8B1538] hover:bg-[#6d1029] text-white text-xs"
              >
                {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
                Generate Planner
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate({ force: true })}
                disabled={generateMutation.isPending}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs"
              >
                {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
                Regenerate
              </Button>
            )}
          </div>
        </div>

        {/* Summary stats */}
        {totalTasks > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <StatBox value={totalTasks} label="Total Tasks" color="text-gray-800" />
              <StatBox value={completedTasks} label="Completed" color="text-green-600" />
              <StatBox value={totalTasks - completedTasks} label="Remaining" color="text-blue-600" />
              <StatBox value={overdueTasks} label="Overdue" color="text-red-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Overall Progress</span>
                <span className="font-bold text-[#8B1538]">{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-3 bg-gray-100" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalTasks === 0 && (
          <Card className="overflow-hidden border-0 bg-[#2a0710] shadow-2xl">
            <div className={`${generateMutation.isError ? "bg-[#dc2626]" : "bg-[#8B1538]"} px-4 py-3 text-white text-sm font-bold`}>
              {generateMutation.isError ? "Failed to generate planner" : "No planner tasks yet"}
            </div>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
                <img
                  src={plannerEmptyImage}
                  alt="Planner status"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white object-contain p-2 shadow-lg"
                />
                <div className="text-center sm:text-left">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">No planner tasks yet</h3>
                  <p className="text-white/75 text-sm sm:text-base max-w-lg">
                    Generate the Enhanced Planner to get a full phase-by-phase planning checklist tailored to this event.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-center sm:justify-start">
                <Button
                  onClick={() => generateMutation.mutate({ force: false })}
                  disabled={generateMutation.isPending}
                  className="bg-[#8B1538] hover:bg-[#6d1029] text-white"
                >
                  {generateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" /> Generate Enhanced Planner</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phase groups */}
        <div className="space-y-4">
          {grouped.map(([phase, tasks]) => {
            const meta = PHASE_META[phase] || { label: phase, color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", icon: ClipboardList, order: 99 };
            const PhaseIcon = meta.icon;
            const phaseDone = tasks.filter(t => t.status === "completed").length;
            const phasePct = tasks.length > 0 ? Math.round((phaseDone / tasks.length) * 100) : 0;
            const isCollapsed = collapsed.has(phase);
            const phaseOverdue = tasks.filter(t => {
              if (t.status === "completed") return false;
              if (!t.dueDate) return false;
              try { return isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)); } catch { return false; }
            }).length;

            return (
              <Card key={phase} className={cn("bg-white border shadow-sm overflow-hidden", meta.border)}>
                <button
                  className="w-full"
                  onClick={() => toggleCollapse(phase)}
                >
                  <div className={cn("px-5 py-4 flex items-center justify-between gap-3", meta.bg)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("p-1.5 rounded-lg bg-white/80", meta.border, "border")}>
                        <PhaseIcon className={cn("w-4 h-4", meta.color)} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("font-semibold text-sm", meta.color)}>{meta.label}</span>
                          <span className="text-xs text-gray-500">{phaseDone}/{tasks.length} done</span>
                          {phaseOverdue > 0 && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
                              {phaseOverdue} overdue
                            </Badge>
                          )}
                          {phasePct === 100 && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0">
                              Complete ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-white/60 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", phasePct === 100 ? "bg-green-500" : "bg-[#8B1538]")}
                            style={{ width: `${phasePct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{phasePct}%</span>
                      </div>
                      {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {tasks
                      .sort((a, b) => {
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                      })
                      .map(task => {
                        const isCompleted = task.status === "completed";
                        const dateInfo = getDueDateLabel(task.dueDate);
                        const overdue = !isCompleted && task.dueDate && (() => {
                          try { return isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)); } catch { return false; }
                        })();

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors",
                              isCompleted && "opacity-60"
                            )}
                          >
                            <button
                              onClick={() => handleToggleTask(task)}
                              disabled={toggleMutation.isPending}
                              className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                            >
                              {isCompleted
                                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                : <Circle className={cn("w-5 h-5", overdue ? "text-red-400" : "text-gray-300")} />
                              }
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-medium text-gray-800 leading-snug", isCompleted && "line-through text-gray-400")}>
                                {cleanTitle(task.title)}
                              </p>
                              {task.description && (
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{task.description}</p>
                              )}
                            </div>

                            <div className="flex-shrink-0 text-right">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className={cn("text-xs", dateInfo.color)}>{dateInfo.label}</span>
                              </div>
                              {overdue && !isCompleted && (
                                <div className="flex items-center gap-1 mt-0.5 justify-end">
                                  <AlertTriangle className="w-3 h-3 text-red-500" />
                                  <span className="text-[10px] text-red-500">Action needed</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {totalTasks > 0 && (
          <p className="text-center text-white/30 text-xs pb-4">
            {completedTasks} of {totalTasks} tasks complete · Last refreshed {format(new Date(), "HH:mm")}
          </p>
        )}
      </div>
    </PlannerLayout>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
