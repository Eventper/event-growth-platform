import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Calendar, Clock, CheckCircle, AlertTriangle, Filter, ListTodo, Diamond, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

interface Activity {
  id: string;
  title: string;
  status: string;
  priority: string;
  phase: string;
  deadline: string | null;
  event_id: string;
  event_name: string;
  event_start: string;
  event_end: string;
  created_at: string;
  owner: string;
  custom_owner: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assigned_to: string;
  assignee_name: string | null;
  description: string;
  event_id: string;
  event_name: string;
  event_start: string;
  event_end: string;
  created_at: string;
}

interface Milestone {
  id: number;
  title: string;
  target_date: string;
  status: string;
  event_id: string;
  event_name: string;
}

interface TimelineData {
  activities: Activity[];
  milestones: Milestone[];
  tasks: TaskItem[];
}

interface GanttRow {
  id: string;
  title: string;
  status: string;
  startDate: Date;
  endDate: Date;
  category: string;
  type: "activity" | "task" | "milestone";
  assignee: string;
  priority?: string;
  eventName: string;
}

const ACTIVITY_PHASES = ["discovery", "planning", "design", "final_preparations", "execution", "event_day", "post_event", "closure"];

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  done: "#22c55e",
  "in-progress": "#3b82f6",
  in_progress: "#3b82f6",
  pending: "#eab308",
  todo: "#eab308",
  not_started: "#94a3b8",
  overdue: "#ef4444",
  on_hold: "#a855f7",
  cancelled: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  done: "Completed",
  "in-progress": "In Progress",
  in_progress: "In Progress",
  pending: "Pending",
  todo: "To Do",
  not_started: "Not Started",
  overdue: "Overdue",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const PRIORITY_INDICATOR: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

function getDateRange(range: string, offset: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (range) {
    case "week":
      start.setDate(now.getDate() - now.getDay() + offset * 7);
      end.setDate(start.getDate() + 6);
      break;
    case "month":
      start.setMonth(now.getMonth() + offset, 1);
      end.setMonth(start.getMonth() + 1, 0);
      break;
    case "3months":
      start.setMonth(now.getMonth() + offset * 3, 1);
      end.setMonth(start.getMonth() + 3, 0);
      break;
    case "6months":
      start.setMonth(now.getMonth() + offset * 6, 1);
      end.setMonth(start.getMonth() + 6, 0);
      break;
    default:
      start.setMonth(now.getMonth() + offset, 1);
      end.setMonth(start.getMonth() + 1, 0);
  }

  return { start, end };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getPositionPercent(date: Date, rangeStart: Date, rangeEnd: Date): number {
  const total = rangeEnd.getTime() - rangeStart.getTime();
  if (total <= 0) return 0;
  const pos = ((date.getTime() - rangeStart.getTime()) / total) * 100;
  return Math.max(0, Math.min(100, pos));
}

function generateDateLabels(start: Date, end: Date): Date[] {
  const labels: Date[] = [];
  const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const step = Math.max(1, Math.floor(totalDays / 10));
  const current = new Date(start);
  while (current <= end) {
    labels.push(new Date(current));
    current.setDate(current.getDate() + step);
  }
  return labels;
}

function isOverdue(dateStr: string | null, status: string): boolean {
  if (!dateStr) return false;
  if (status === "completed" || status === "done" || status === "cancelled") return false;
  return new Date(dateStr) < new Date();
}

function normalizePhase(phase: string): string {
  const p = (phase || "").toLowerCase().replace(/\s+/g, "_");
  if (ACTIVITY_PHASES.includes(p)) return p;
  if (p.includes("discover")) return "discovery";
  if (p.includes("plan")) return "planning";
  if (p.includes("design")) return "design";
  if (p.includes("execut")) return "execution";
  if (p.includes("final") || p.includes("prep")) return "final_preparations";
  if (p.includes("event") && p.includes("day")) return "event_day";
  if (p.includes("post") || p.includes("closure")) return "post_event";
  return "planning";
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    discovery: "Discovery",
    planning: "Planning",
    design: "Design",
    final_preparations: "Final Preparations",
    execution: "Execution",
    event_day: "Event Day",
    post_event: "Post Event",
    closure: "Closure",
  };
  return labels[phase] || phase;
}

export default function TimelineView() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [dateRange, setDateRange] = useState("month");
  const [rangeOffset, setRangeOffset] = useState(0);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const { data: timelineData, isLoading } = useQuery<TimelineData>({
    queryKey: ["/api/timeline", selectedEventId],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/timeline${selectedEventId !== "all" ? `?eventId=${selectedEventId}` : ""}`
      ),
  });

  const activities = timelineData?.activities || [];
  const milestones = timelineData?.milestones || [];
  const tasks = timelineData?.tasks || [];

  const { start: rangeStart, end: rangeEnd } = useMemo(() => getDateRange(dateRange, rangeOffset), [dateRange, rangeOffset]);
  const dateLabels = useMemo(() => generateDateLabels(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  const ganttRows: GanttRow[] = useMemo(() => {
    const rows: GanttRow[] = [];

    activities.forEach((a) => {
      const effectiveStatus = isOverdue(a.deadline, a.status) ? "overdue" : a.status;
      const endDate = a.deadline ? new Date(a.deadline) : null;
      const startDate = a.created_at ? new Date(a.created_at) : null;
      if (!endDate && !startDate) return;

      const actualEnd = endDate || new Date(startDate!.getTime() + 7 * 24 * 60 * 60 * 1000);
      const actualStart = startDate || new Date(actualEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

      rows.push({
        id: `activity-${a.id}`,
        title: a.title,
        status: effectiveStatus,
        startDate: actualStart,
        endDate: actualEnd,
        category: normalizePhase(a.phase),
        type: "activity",
        assignee: a.custom_owner || a.owner || "Planner",
        priority: a.priority,
        eventName: a.event_name || "Unassigned",
      });
    });

    tasks.forEach((t) => {
      const effectiveStatus = isOverdue(t.due_date, t.status) ? "overdue" : t.status;
      const endDate = t.due_date ? new Date(t.due_date) : null;
      const startDate = t.created_at ? new Date(t.created_at) : null;
      if (!endDate && !startDate) return;

      const actualEnd = endDate || new Date(startDate!.getTime() + 7 * 24 * 60 * 60 * 1000);
      const actualStart = startDate || new Date(actualEnd.getTime() - 3 * 24 * 60 * 60 * 1000);

      rows.push({
        id: `task-${t.id}`,
        title: t.title,
        status: effectiveStatus,
        startDate: actualStart,
        endDate: actualEnd,
        category: "tasks",
        type: "task",
        assignee: t.assignee_name || "Unassigned",
        eventName: t.event_name || "Unassigned",
      });
    });

    milestones.forEach((m) => {
      if (!m.target_date) return;
      const date = new Date(m.target_date);
      rows.push({
        id: `milestone-${m.id}`,
        title: m.title,
        status: m.status || "pending",
        startDate: date,
        endDate: date,
        category: "milestones",
        type: "milestone",
        assignee: "",
        eventName: m.event_name || "Unassigned",
      });
    });

    return rows;
  }, [activities, tasks, milestones]);

  const visibleRows = useMemo(() => {
    return ganttRows.filter((row) => {
      if (selectedCategory !== "all" && row.category !== selectedCategory) return false;
      const rowEnd = row.endDate.getTime();
      const rowStart = row.startDate.getTime();
      return rowEnd >= rangeStart.getTime() && rowStart <= rangeEnd.getTime();
    });
  }, [ganttRows, rangeStart, rangeEnd, selectedCategory]);

  const groupedRows = useMemo(() => {
    const groups: Record<string, GanttRow[]> = {};
    visibleRows.forEach((row) => {
      const key = row.category;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    const orderedKeys = [...ACTIVITY_PHASES, "tasks", "milestones"];
    const result: { category: string; rows: GanttRow[] }[] = [];
    orderedKeys.forEach((key) => {
      if (groups[key]?.length) {
        result.push({ category: key, rows: groups[key] });
      }
    });
    Object.keys(groups).forEach((key) => {
      if (!orderedKeys.includes(key) && groups[key]?.length) {
        result.push({ category: key, rows: groups[key] });
      }
    });
    return result;
  }, [visibleRows]);

  const stats = useMemo(() => {
    const total = ganttRows.length;
    const completed = ganttRows.filter((r) => r.status === "completed" || r.status === "done").length;
    const inProgress = ganttRows.filter((r) => r.status === "in-progress" || r.status === "in_progress").length;
    const overdue = ganttRows.filter((r) => r.status === "overdue").length;
    const milestoneCount = ganttRows.filter((r) => r.type === "milestone").length;
    return { total, completed, inProgress, overdue, milestoneCount };
  }, [ganttRows]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    ganttRows.forEach((r) => cats.add(r.category));
    return Array.from(cats);
  }, [ganttRows]);

  const todayPercent = getPositionPercent(new Date(), rangeStart, rangeEnd);

  const summaryCards = [
    { label: "Total Items", value: stats.total, icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/20" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20" },
    { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-cyan-400", bg: "bg-cyan-500/20" },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/20" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#16213e] via-[#330311] to-[#2a0209]">
      <PlannerSidebar />

      <main className="lg:ml-60 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src={logoPath} alt="Logo" className="h-10 w-10 rounded-lg shadow-md ring-1 ring-white/10" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white font-[Poppins]">Timeline View</h1>
            <p className="text-white/50 text-sm">Visual Gantt-style project timeline</p>
          </div>
          {ganttRows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                openPrintWindow({
                  title: "Timeline View",
                  subtitle: `${formatDateFull(rangeStart)} — ${formatDateFull(rangeEnd)}`,
                  stats: [
                    { label: "Total Items", value: stats.total },
                    { label: "Completed", value: stats.completed },
                    { label: "In Progress", value: stats.inProgress },
                    { label: "Overdue", value: stats.overdue },
                  ],
                  columns: [
                    { header: "Title", key: "title" },
                    { header: "Type", key: "type" },
                    { header: "Category", key: "category", format: (v: string) => v === "tasks" ? "Tasks" : v === "milestones" ? "Milestones" : phaseLabel(v) },
                    { header: "Status", key: "status", format: (v: string) => STATUS_LABELS[v] || v },
                    { header: "Assignee", key: "assignee", format: (v: string) => v || "—" },
                    { header: "Start", key: "startDate", format: (v: Date) => formatDateFull(v) },
                    { header: "End", key: "endDate", format: (v: Date) => formatDateFull(v) },
                    { header: "Event", key: "eventName" },
                  ],
                  rows: visibleRows,
                  orientation: "landscape",
                });
              }}
            >
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-white/60 text-xs">{card.label}</p>
                  <p className="text-white text-2xl font-bold">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10">
            <Filter className="w-4 h-4 text-white/60" />
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#330311]">All Events</option>
              {(events as any[]).map((event: any) => (
                <option key={event.id} value={String(event.id)} className="bg-[#330311]">
                  {event.name || event.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10">
            <ListTodo className="w-4 h-4 text-white/60" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#330311]">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#330311]">
                  {cat === "tasks" ? "Tasks" : cat === "milestones" ? "Milestones" : phaseLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-1">
            {[
              { key: "week", label: "Week" },
              { key: "month", label: "Month" },
              { key: "3months", label: "3 Mo" },
              { key: "6months", label: "6 Mo" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setDateRange(opt.key); setRangeOffset(0); }}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  dateRange === opt.key
                    ? "bg-[#8B1538] text-white font-semibold shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setRangeOffset((o) => o - 1)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRangeOffset(0)}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setRangeOffset((o) => o + 1)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="ml-auto text-white/40 text-xs">
            {formatDateFull(rangeStart)} — {formatDateFull(rangeEnd)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
          {Object.entries(STATUS_COLORS).filter(([s]) => ["completed", "in-progress", "pending", "not_started", "overdue", "on_hold"].includes(s)).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-white/50 text-xs capitalize">{STATUS_LABELS[status] || status}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <Diamond className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-white/50 text-xs">Milestone</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-16 flex flex-col items-center justify-center">
            <Calendar className="w-12 h-12 text-white/20 mb-3" />
            <p className="text-white/40 text-sm">No timeline data in this date range</p>
            <p className="text-white/30 text-xs mt-1">Try selecting a different range or event</p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
            <div className="flex border-b border-white/10 sticky top-0 bg-white/5 backdrop-blur-md z-10">
              <div className="w-56 flex-shrink-0 p-3 text-white/60 text-xs font-semibold uppercase tracking-wider border-r border-white/10">
                Category / Item
              </div>
              <div className="flex-1 relative overflow-hidden">
                <div className="flex">
                  {dateLabels.map((d, i) => (
                    <div
                      key={i}
                      className="flex-1 p-3 text-center text-white/40 text-xs border-l border-white/5"
                    >
                      {formatDate(d)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-h-[65vh] overflow-y-auto">
              {groupedRows.map(({ category, rows }) => (
                <div key={category}>
                  <div className="flex items-center border-b border-white/10 bg-white/5 sticky top-0">
                    <div className="w-56 flex-shrink-0 px-3 py-2 border-r border-white/10">
                      <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                        {category === "tasks" ? "📋 Tasks" : category === "milestones" ? "💎 Milestones" : `📌 ${phaseLabel(category)}`}
                      </span>
                      <span className="text-white/40 text-xs ml-2">({rows.length})</span>
                    </div>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  {rows.map((row) => {
                    const barColor = STATUS_COLORS[row.status] || STATUS_COLORS.pending;
                    const isHovered = hoveredRow === row.id;

                    if (row.type === "milestone") {
                      const pos = getPositionPercent(row.startDate, rangeStart, rangeEnd);
                      return (
                        <div
                          key={row.id}
                          className={`flex items-center border-b border-white/5 transition-colors ${isHovered ? "bg-white/10" : "hover:bg-white/5"}`}
                          onMouseEnter={() => setHoveredRow(row.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <div className="w-56 flex-shrink-0 px-3 py-2.5 border-r border-white/10">
                            <div className="flex items-center gap-2">
                              <Diamond className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                              <p className="text-amber-300 text-sm truncate">{row.title}</p>
                            </div>
                            <p className="text-white/30 text-xs mt-0.5 ml-5 truncate">{row.eventName}</p>
                          </div>
                          <div className="flex-1 relative h-10">
                            {dateLabels.map((_, i) => (
                              <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-white/5"
                                style={{ left: `${(i / dateLabels.length) * 100}%` }}
                              />
                            ))}
                            {todayPercent > 0 && todayPercent < 100 && (
                              <div
                                className="absolute top-0 bottom-0 w-px bg-red-500/40 z-[1]"
                                style={{ left: `${todayPercent}%` }}
                              />
                            )}
                            <div
                              className="absolute top-2 z-[2]"
                              style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                            >
                              <div className="w-4 h-4 rotate-45 bg-amber-400 border-2 border-amber-300 shadow-lg shadow-amber-400/30" />
                            </div>
                            {isHovered && (
                              <div
                                className="absolute top-7 text-[10px] text-amber-300/80 whitespace-nowrap z-[3] bg-black/60 px-1.5 py-0.5 rounded"
                                style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                              >
                                {formatDateFull(row.startDate)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    const startPercent = getPositionPercent(row.startDate, rangeStart, rangeEnd);
                    const endPercent = getPositionPercent(row.endDate, rangeStart, rangeEnd);
                    const barLeft = Math.max(0, Math.min(startPercent, 98));
                    const barWidth = Math.max(1.5, endPercent - startPercent);
                    const clampedWidth = Math.min(barWidth, 100 - barLeft);

                    return (
                      <div
                        key={row.id}
                        className={`flex items-center border-b border-white/5 transition-colors ${isHovered ? "bg-white/10" : "hover:bg-white/5"}`}
                        onMouseEnter={() => setHoveredRow(row.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <div className="w-56 flex-shrink-0 px-3 py-2.5 border-r border-white/10">
                          <div className="flex items-center gap-2">
                            {row.priority && PRIORITY_INDICATOR[row.priority] && (
                              <span className="text-xs flex-shrink-0">{PRIORITY_INDICATOR[row.priority]}</span>
                            )}
                            <p className="text-white text-sm truncate flex-1">{row.title}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: barColor }}
                            />
                            <span className="text-white/40 text-xs">{STATUS_LABELS[row.status] || row.status}</span>
                            {row.assignee && row.assignee !== "Unassigned" && (
                              <span className="text-white/30 text-xs truncate">• {row.assignee}</span>
                            )}
                          </div>
                          {row.eventName && (
                            <p className="text-white/20 text-[10px] mt-0.5 truncate">{row.eventName}</p>
                          )}
                        </div>
                        <div className="flex-1 relative h-12">
                          {dateLabels.map((_, i) => (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 border-l border-white/5"
                              style={{ left: `${(i / dateLabels.length) * 100}%` }}
                            />
                          ))}
                          {todayPercent > 0 && todayPercent < 100 && (
                            <div
                              className="absolute top-0 bottom-0 w-px bg-red-500/40 z-[1]"
                              style={{ left: `${todayPercent}%` }}
                            />
                          )}
                          <div
                            className={`absolute top-3.5 h-5 rounded-full transition-opacity z-[2] ${isHovered ? "opacity-100" : "opacity-85"}`}
                            style={{
                              left: `${barLeft}%`,
                              width: `${clampedWidth}%`,
                              backgroundColor: barColor,
                              minWidth: "8px",
                              boxShadow: isHovered ? `0 0 12px ${barColor}40` : "none",
                            }}
                          >
                            {clampedWidth > 8 && (
                              <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
                                <span className="text-[10px] text-white font-medium truncate">
                                  {row.title}
                                </span>
                              </div>
                            )}
                          </div>
                          {isHovered && (
                            <div
                              className="absolute top-9 text-[10px] text-white/70 whitespace-nowrap z-[3] bg-black/70 px-2 py-1 rounded shadow-lg"
                              style={{ left: `${barLeft}%` }}
                            >
                              {formatDate(row.startDate)} → {formatDate(row.endDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}