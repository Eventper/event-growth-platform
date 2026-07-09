import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
  addDays,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Circle,
  X,
  Plus,
  Video,
  MapPin,
  Clock,
  Users,
  ExternalLink,
  Trash2,
  Monitor,
  Phone,
  Download,
  CalendarDays,
  LayoutGrid,
  Printer,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface CalendarEvent {
  id: string;
  name: string;
  type: string;
  event_category: string;
  start_date: string;
  end_date: string;
  status: string;
  currency: string;
}

interface CalendarActivity {
  id: string;
  title: string;
  deadline: string;
  status: string;
  priority: string;
  event_id: string;
  event_name: string;
}

interface CalendarInvoice {
  id: string;
  invoice_number: string;
  due_date: string;
  amount: number;
  currency: string;
  status: string;
  event_id: string;
}

interface CalendarMeeting {
  id: string;
  title: string;
  meeting_date: string;
  event_id: string;
  event_name: string;
  duration: number;
  meeting_platform: string;
  meeting_link: string;
  location: string;
  status: string;
  description: string;
  attendees: any[];
}

interface CalendarEntryItem {
  id: string;
  title: string;
  description: string;
  entry_type: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  event_id: string;
  created_by: string;
  creator_name: string;
  meeting_platform: string;
  meeting_link: string;
  location: string;
  attendees: any[];
  color: string;
  is_global: boolean;
  status: string;
}

interface CalendarData {
  events: CalendarEvent[];
  activities: CalendarActivity[];
  invoices: CalendarInvoice[];
  meetings: CalendarMeeting[];
  calendarEntries: CalendarEntryItem[];
}

const PLATFORM_OPTIONS = [
  { value: "in_person", label: "In Person", icon: MapPin, color: "text-emerald-400" },
  { value: "google_meet", label: "Google Meet", icon: Video, color: "text-blue-400" },
  { value: "zoom", label: "Zoom", icon: Monitor, color: "text-indigo-400" },
  { value: "teams", label: "Microsoft Teams", icon: Monitor, color: "text-violet-400" },
  { value: "phone", label: "Phone Call", icon: Phone, color: "text-green-400" },
  { value: "other", label: "Other", icon: ExternalLink, color: "text-gray-400" },
];

const ENTRY_TYPES = [
  { value: "meeting", label: "Meeting", color: "#22c55e" },
  { value: "event", label: "Event Booking", color: "#7f1d3a" },
  { value: "task", label: "Task / Deadline", color: "#3b82f6" },
  { value: "reminder", label: "Reminder", color: "#f59e0b" },
  { value: "blocked", label: "Blocked Time", color: "#6b7280" },
  { value: "recce", label: "Venue Recce", color: "#8b5cf6" },
  { value: "rehearsal", label: "Rehearsal", color: "#ec4899" },
  { value: "setup", label: "Setup / Breakdown", color: "#14b8a6" },
];

const ENTRY_COLORS: Record<string, string> = {
  meeting: "#22c55e",
  event: "#7f1d3a",
  task: "#3b82f6",
  reminder: "#f59e0b",
  blocked: "#6b7280",
  recce: "#8b5cf6",
  rehearsal: "#ec4899",
  setup: "#14b8a6",
};

function generateICS(event: CalendarEvent): string {
  const startDate = parseISO(event.start_date);
  const endDate = parseISO(event.end_date);
  const formatICSDate = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");
  const now = new Date();

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Event Perfekt//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `UID:${event.id}@eventperfekt.com`,
    `SUMMARY:${event.name}`,
    `DESCRIPTION:${event.event_category || ""} - ${event.type || ""}`,
    `STATUS:${event.status === "completed" ? "COMPLETED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(event: CalendarEvent) {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.name.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForDate, setCreateForDate] = useState<Date | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const [newEntry, setNewEntry] = useState({
    title: "",
    description: "",
    entryType: "meeting",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    allDay: false,
    eventId: "",
    meetingPlatform: "in_person",
    meetingLink: "",
    location: "",
    color: "#22c55e",
    isGlobal: true,
  });

  const monthParam = format(currentDate, "yyyy-MM");

  const { data, isLoading } = useQuery<CalendarData>({
    queryKey: ["/api/calendar", monthParam],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/calendar?month=${monthParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { events: [], activities: [], invoices: [], meetings: [], calendarEntries: [] };
      return res.json();
    },
  });

  const { data: allEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/events", { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
  });

  const events = data?.events ?? [];
  const activities = data?.activities ?? [];
  const invoices = data?.invoices ?? [];
  const meetings = data?.meetings ?? [];
  const calendarEntries = data?.calendarEntries ?? [];

  const createEntryMutation = useMutation({
    mutationFn: async (entryData: any) => apiRequest("POST", "/api/calendar-entries", entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Calendar entry created" });
    },
    onError: () => {
      toast({ title: "Failed to create entry", variant: "destructive" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/calendar-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Entry deleted" });
    },
  });

  const resetForm = () => {
    setNewEntry({
      title: "",
      description: "",
      entryType: "meeting",
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "10:00",
      allDay: false,
      eventId: "",
      meetingPlatform: "in_person",
      meetingLink: "",
      location: "",
      color: "#22c55e",
      isGlobal: true,
    });
  };

  const openCreateForDate = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    setCreateForDate(day);
    setNewEntry((prev) => ({
      ...prev,
      startDate: dateStr,
      endDate: dateStr,
    }));
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!newEntry.title || !newEntry.startDate) return;
    const startDateTime = newEntry.allDay
      ? new Date(newEntry.startDate + "T00:00:00")
      : new Date(newEntry.startDate + "T" + newEntry.startTime + ":00");
    const endDateTime = newEntry.allDay
      ? (newEntry.endDate ? new Date(newEntry.endDate + "T23:59:59") : startDateTime)
      : new Date((newEntry.endDate || newEntry.startDate) + "T" + newEntry.endTime + ":00");

    createEntryMutation.mutate({
      title: newEntry.title,
      description: newEntry.description,
      entryType: newEntry.entryType,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      allDay: newEntry.allDay,
      eventId: newEntry.eventId || null,
      meetingPlatform: newEntry.meetingPlatform,
      meetingLink: newEntry.meetingLink,
      location: newEntry.location,
      color: ENTRY_COLORS[newEntry.entryType] || newEntry.color,
      isGlobal: newEntry.isGlobal,
    });
  };

  const navigatePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, viewMode]);

  const getItemsForDay = (day: Date) => {
    const dayEvents = events.filter((e) => {
      try {
        const start = parseISO(e.start_date);
        const end = parseISO(e.end_date);
        return day >= new Date(start.toDateString()) && day <= new Date(end.toDateString());
      } catch { return false; }
    });
    const dayActivities = activities.filter((a) => a.deadline && isSameDay(parseISO(a.deadline), day));
    const dayInvoices = invoices.filter((i) => i.due_date && isSameDay(parseISO(i.due_date), day));
    const dayMeetings = meetings.filter((m) => m.meeting_date && isSameDay(parseISO(m.meeting_date), day));
    const dayEntries = calendarEntries.filter((ce) => {
      try {
        const start = parseISO(ce.start_date);
        const end = ce.end_date ? parseISO(ce.end_date) : start;
        return day >= new Date(start.toDateString()) && day <= new Date(end.toDateString());
      } catch { return false; }
    });

    const overdue = dayActivities.filter((a) => a.status !== "completed" && new Date(a.deadline) < new Date());
    return { dayEvents, dayActivities, dayInvoices, dayMeetings, dayEntries, overdue };
  };

  const selectedItems = selectedDay ? getItemsForDay(selectedDay) : null;
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekDaysShort = ["M", "T", "W", "T", "F", "S", "S"];

  const getPlatformInfo = (platform: string) =>
    PLATFORM_OPTIONS.find((p) => p.value === platform) || PLATFORM_OPTIONS[0];

  const headerLabel = viewMode === "month"
    ? format(currentDate, "MMMM yyyy")
    : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] flex">
      <PlannerSidebar />

      <main className="flex-1 lg:ml-60 p-3 sm:p-4 md:p-6 lg:p-8 pt-16 lg:pt-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 sm:w-7 h-5 sm:h-7 text-white" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-white">Global Calendar</h1>
                <p className="text-white/50 text-xs sm:text-sm">Shared team calendar — events, meetings, tasks, and bookings</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(events.length > 0 || activities.length > 0 || meetings.length > 0 || calendarEntries.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm"
                  onClick={() => {
                    const allItems: Record<string, any>[] = [];
                    events.forEach(e => allItems.push({ title: e.name, type: "Event", date: e.start_date, status: e.status, details: e.event_category || "" }));
                    activities.forEach(a => allItems.push({ title: a.title, type: "Task", date: a.deadline, status: a.status, details: `${a.priority} priority` }));
                    meetings.forEach(m => allItems.push({ title: m.title, type: "Meeting", date: m.meeting_date, status: m.status, details: m.location || m.meeting_platform || "" }));
                    calendarEntries.forEach(ce => allItems.push({ title: ce.title, type: ENTRY_TYPES.find(t => t.value === ce.entry_type)?.label || ce.entry_type, date: ce.start_date, status: ce.status || "", details: ce.location || ce.meeting_platform || "" }));
                    invoices.forEach(i => allItems.push({ title: i.invoice_number, type: "Invoice Due", date: i.due_date, status: i.status, details: `${i.currency} ${i.amount}` }));
                    openPrintWindow({
                      title: `Global Calendar — ${format(currentDate, "MMMM yyyy")}`,
                      stats: [
                        { label: "Events", value: events.length },
                        { label: "Tasks Due", value: activities.length },
                        { label: "Meetings", value: meetings.length + calendarEntries.filter(e => e.entry_type === 'meeting').length },
                        { label: "Invoices Due", value: invoices.length },
                      ],
                      columns: [
                        { header: "Title", key: "title" },
                        { header: "Type", key: "type" },
                        { header: "Date", key: "date", format: (v: string) => v ? new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—" },
                        { header: "Status", key: "status" },
                        { header: "Details", key: "details" },
                      ],
                      rows: allItems,
                    });
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
              )}
              <div className="flex bg-white/10 rounded-lg border border-white/20 overflow-hidden">
                <button
                  onClick={() => setViewMode("month")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${viewMode === "month" ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Month
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${viewMode === "week" ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Week
                </button>
              </div>

              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    onClick={() => {
                      resetForm();
                      setCreateForDate(null);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {createForDate
                        ? `Add to ${format(createForDate, "EEEE, MMM d")}`
                        : "Create Calendar Entry"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={newEntry.title}
                        onChange={(e) => setNewEntry((p) => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Vendor walkthrough, Client meeting..."
                      />
                    </div>

                    <div>
                      <Label>Type</Label>
                      <Select
                        value={newEntry.entryType}
                        onValueChange={(v) => setNewEntry((p) => ({ ...p, entryType: v, color: ENTRY_COLORS[v] || p.color }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTRY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                                {t.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={newEntry.allDay}
                        onCheckedChange={(c) => setNewEntry((p) => ({ ...p, allDay: !!c }))}
                      />
                      <Label className="cursor-pointer">All day</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start Date *</Label>
                        <Input
                          type="date"
                          value={newEntry.startDate}
                          onChange={(e) => setNewEntry((p) => ({ ...p, startDate: e.target.value }))}
                        />
                      </div>
                      {!newEntry.allDay && (
                        <div>
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={newEntry.startTime}
                            onChange={(e) => setNewEntry((p) => ({ ...p, startTime: e.target.value }))}
                          />
                        </div>
                      )}
                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={newEntry.endDate}
                          onChange={(e) => setNewEntry((p) => ({ ...p, endDate: e.target.value }))}
                        />
                      </div>
                      {!newEntry.allDay && (
                        <div>
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={newEntry.endTime}
                            onChange={(e) => setNewEntry((p) => ({ ...p, endTime: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Meeting Platform</Label>
                      <Select
                        value={newEntry.meetingPlatform}
                        onValueChange={(v) => setNewEntry((p) => ({ ...p, meetingPlatform: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORM_OPTIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              <div className="flex items-center gap-2">
                                <p.icon className="w-4 h-4" />
                                {p.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {newEntry.meetingPlatform !== "in_person" && newEntry.meetingPlatform !== "phone" && (
                      <div>
                        <Label>
                          {newEntry.meetingPlatform === "google_meet"
                            ? "Google Meet Link"
                            : newEntry.meetingPlatform === "zoom"
                            ? "Zoom Link"
                            : newEntry.meetingPlatform === "teams"
                            ? "Teams Link"
                            : "Meeting Link"}
                        </Label>
                        <Input
                          value={newEntry.meetingLink}
                          onChange={(e) => setNewEntry((p) => ({ ...p, meetingLink: e.target.value }))}
                          placeholder={
                            newEntry.meetingPlatform === "google_meet"
                              ? "https://meet.google.com/xxx-xxxx-xxx"
                              : newEntry.meetingPlatform === "zoom"
                              ? "https://zoom.us/j/123456789"
                              : "https://..."
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Paste your {newEntry.meetingPlatform === "google_meet" ? "Google Meet" : newEntry.meetingPlatform === "zoom" ? "Zoom" : "meeting"} link here
                        </p>
                      </div>
                    )}

                    {(newEntry.meetingPlatform === "in_person" || newEntry.meetingPlatform === "phone") && (
                      <div>
                        <Label>{newEntry.meetingPlatform === "phone" ? "Phone Number" : "Location"}</Label>
                        <Input
                          value={newEntry.location}
                          onChange={(e) => setNewEntry((p) => ({ ...p, location: e.target.value }))}
                          placeholder={newEntry.meetingPlatform === "phone" ? "+234..." : "Office, venue address..."}
                        />
                      </div>
                    )}

                    <div>
                      <Label>Link to Event (Optional)</Label>
                      <Select
                        value={newEntry.eventId || "none"}
                        onValueChange={(v) => setNewEntry((p) => ({ ...p, eventId: v === "none" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No event linked" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No event linked</SelectItem>
                          {allEvents.map((ev: any) => (
                            <SelectItem key={ev.id} value={ev.id}>
                              {ev.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newEntry.description}
                        onChange={(e) => setNewEntry((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Agenda, notes, details..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!newEntry.title || !newEntry.startDate || createEntryMutation.isPending}
                      style={{ backgroundColor: "#330311", color: "white" }}
                    >
                      {createEntryMutation.isPending ? "Creating..." : "Add to Calendar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-white/60 text-xs uppercase tracking-wider">Events</p>
              <p className="text-2xl font-bold text-white mt-1">{events.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-white/60 text-xs uppercase tracking-wider">Tasks Due</p>
              <p className="text-2xl font-bold text-white mt-1">{activities.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-white/60 text-xs uppercase tracking-wider">Meetings</p>
              <p className="text-2xl font-bold text-white mt-1">{meetings.length + calendarEntries.filter(e => e.entry_type === 'meeting').length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-white/60 text-xs uppercase tracking-wider">Bookings</p>
              <p className="text-2xl font-bold text-white mt-1">{calendarEntries.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-white/60 text-xs uppercase tracking-wider">Invoices Due</p>
              <p className="text-2xl font-bold text-white mt-1">{invoices.length}</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={navigatePrev}
                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white">
                  {headerLabel}
                </h2>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  Today
                </button>
              </div>
              <button
                onClick={navigateNext}
                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7">
              {weekDays.map((day, i) => (
                <div
                  key={day}
                  className="p-1 sm:p-2 text-center text-[10px] sm:text-xs font-semibold text-white/50 uppercase tracking-wider border-b border-white/5"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{weekDaysShort[i]}</span>
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const inCurrentMonth = viewMode === "week" || isSameMonth(day, currentDate);
                  const today = isToday(day);
                  const { dayEvents, dayActivities, dayInvoices, dayMeetings, dayEntries, overdue } = getItemsForDay(day);
                  const hasItems = dayEvents.length > 0 || dayActivities.length > 0 || dayInvoices.length > 0 || dayMeetings.length > 0 || dayEntries.length > 0;
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const minH = viewMode === "week" ? "min-h-[80px] sm:min-h-[140px] md:min-h-[180px]" : "min-h-[50px] sm:min-h-[80px] md:min-h-[100px]";

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        relative p-1.5 ${minH} border border-white/5 text-left transition-colors group
                        ${inCurrentMonth ? "hover:bg-white/5" : "opacity-30"}
                        ${isSelected ? "bg-white/10" : ""}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={`
                            text-xs sm:text-sm font-medium inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full
                            ${today ? "ring-2 ring-white bg-white/20 text-white" : inCurrentMonth ? "text-white/80 hover:bg-white/10" : "text-white/30"}
                          `}
                        >
                          {format(day, "d")}
                        </button>
                        {inCurrentMonth && (
                          <button
                            onClick={() => openCreateForDate(day)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-white/20 text-white/40 hover:text-white transition-all"
                            title="Add entry"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {hasItems && inCurrentMonth && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {dayEvents.length > 0 && <Circle className="w-2.5 h-2.5 fill-[#7f1d3a] text-[#7f1d3a]" />}
                          {dayActivities.length > 0 && <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />}
                          {dayMeetings.length > 0 && <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />}
                          {dayInvoices.length > 0 && <Circle className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />}
                          {overdue.length > 0 && <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />}
                          {dayEntries.map((ce) => (
                            <Circle key={ce.id} className="w-2.5 h-2.5" style={{ fill: ce.color || '#3b82f6', color: ce.color || '#3b82f6' }} />
                          ))}
                        </div>
                      )}
                      {inCurrentMonth && (
                        <div className="hidden md:block mt-1 space-y-0.5">
                          {dayEvents.slice(0, viewMode === "week" ? 3 : 1).map((ev) => (
                            <div
                              key={`ev-${ev.id}`}
                              className="text-[10px] leading-tight text-white/80 px-1 py-0.5 rounded truncate"
                              style={{ backgroundColor: "#7f1d3a40" }}
                            >
                              {ev.name}
                            </div>
                          ))}
                          {dayEntries.slice(0, viewMode === "week" ? 3 : 2).map((ce) => (
                            <div
                              key={ce.id}
                              className="text-[10px] leading-tight text-white/80 px-1 py-0.5 rounded truncate"
                              style={{ backgroundColor: (ce.color || '#3b82f6') + '30' }}
                            >
                              {ce.title}
                            </div>
                          ))}
                          {viewMode === "week" && dayActivities.slice(0, 2).map((a) => (
                            <div
                              key={`act-${a.id}`}
                              className="text-[10px] leading-tight text-white/80 px-1 py-0.5 rounded truncate"
                              style={{ backgroundColor: "#3b82f630" }}
                            >
                              {a.title}
                            </div>
                          ))}
                          {viewMode === "week" && dayMeetings.slice(0, 2).map((m) => (
                            <div
                              key={`mt-${m.id}`}
                              className="text-[10px] leading-tight text-white/80 px-1 py-0.5 rounded truncate"
                              style={{ backgroundColor: "#22c55e30" }}
                            >
                              {m.title}
                            </div>
                          ))}
                          {(() => {
                            const total = dayEvents.length + dayEntries.length +
                              (viewMode === "week" ? dayActivities.length + dayMeetings.length : 0);
                            const shown = viewMode === "week"
                              ? Math.min(dayEvents.length, 3) + Math.min(dayEntries.length, 3) + Math.min(dayActivities.length, 2) + Math.min(dayMeetings.length, 2)
                              : Math.min(dayEvents.length, 1) + Math.min(dayEntries.length, 2);
                            return total > shown ? (
                              <span className="text-[9px] text-white/40">+{total - shown} more</span>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 p-3 border-t border-white/10">
              <span className="text-xs text-white/40">Legend:</span>
              <div className="flex items-center gap-1.5">
                <Circle className="w-2.5 h-2.5 fill-[#7f1d3a] text-[#7f1d3a]" />
                <span className="text-xs text-white/60">Events</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />
                <span className="text-xs text-white/60">Tasks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />
                <span className="text-xs text-white/60">Meetings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Circle className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                <span className="text-xs text-white/60">Invoices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
                <span className="text-xs text-white/60">Overdue</span>
              </div>
              {ENTRY_TYPES.filter(t => !['meeting'].includes(t.value)).map(t => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <Circle className="w-2.5 h-2.5" style={{ fill: t.color, color: t.color }} />
                  <span className="text-xs text-white/60">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedDay && selectedItems && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {format(selectedDay, "EEEE, MMMM d, yyyy")}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => openCreateForDate(selectedDay)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {selectedItems.dayEvents.length === 0 &&
                selectedItems.dayActivities.length === 0 &&
                selectedItems.dayMeetings.length === 0 &&
                selectedItems.dayInvoices.length === 0 &&
                selectedItems.dayEntries.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-white/40 text-sm mb-3">No items scheduled for this day.</p>
                    <Button
                      size="sm"
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      onClick={() => openCreateForDate(selectedDay)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Book something
                    </Button>
                  </div>
                )}

              {selectedItems.dayEvents.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-[#e8a0b5] mb-2 flex items-center gap-2">
                    <Circle className="w-2.5 h-2.5 fill-[#7f1d3a] text-[#7f1d3a]" /> Events
                  </h4>
                  <div className="space-y-2">
                    {selectedItems.dayEvents.map((e) => (
                      <div key={e.id} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">{e.name}</p>
                            <p className="text-white/50 text-xs mt-1">
                              {e.event_category} &middot; {e.status}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              downloadICS(e);
                              toast({ title: "ICS file downloaded" });
                            }}
                            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                            title="Export to .ics"
                          >
                            <Download className="w-3.5 h-3.5" />
                            .ics
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedItems.dayActivities.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" /> Tasks
                  </h4>
                  <div className="space-y-2">
                    {selectedItems.dayActivities.map((a) => {
                      const isOverdue = a.status !== "completed" && new Date(a.deadline) < new Date();
                      return (
                        <div key={a.id} className={`rounded-lg p-3 ${isOverdue ? "bg-red-500/10 border border-red-500/20" : "bg-white/5"}`}>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium text-sm">{a.title}</p>
                            {isOverdue && (
                              <Badge className="bg-red-500/20 text-red-300 text-[10px] border-red-500/30">Overdue</Badge>
                            )}
                          </div>
                          <p className="text-white/50 text-xs mt-1">
                            {a.event_name} &middot; {a.priority} &middot; {a.status}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedItems.dayMeetings.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                    <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" /> Meetings
                  </h4>
                  <div className="space-y-2">
                    {selectedItems.dayMeetings.map((m) => {
                      const platform = getPlatformInfo(m.meeting_platform || "in_person");
                      const PlatformIcon = platform.icon;
                      return (
                        <div key={m.id} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">{m.title}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {m.event_name && (
                                  <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                                    {m.event_name}
                                  </Badge>
                                )}
                                <span className="flex items-center gap-1 text-xs text-white/50">
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(m.meeting_date), "h:mm a")}
                                  {m.duration && ` · ${m.duration}min`}
                                </span>
                                <span className={`flex items-center gap-1 text-xs ${platform.color}`}>
                                  <PlatformIcon className="w-3 h-3" />
                                  {platform.label}
                                </span>
                              </div>
                              {m.location && (
                                <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />{m.location}
                                </p>
                              )}
                            </div>
                            {m.meeting_link && (
                              <a
                                href={m.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                              >
                                <Video className="w-3.5 h-3.5" />
                                Join
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedItems.dayEntries.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Calendar Bookings
                  </h4>
                  <div className="space-y-2">
                    {selectedItems.dayEntries.map((ce) => {
                      const platform = getPlatformInfo(ce.meeting_platform || "in_person");
                      const PlatformIcon = platform.icon;
                      const entryTypeDef = ENTRY_TYPES.find(t => t.value === ce.entry_type);
                      return (
                        <div key={ce.id} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ce.color || '#3b82f6' }} />
                                <p className="text-white font-medium text-sm">{ce.title}</p>
                                {entryTypeDef && (
                                  <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">
                                    {entryTypeDef.label}
                                  </Badge>
                                )}
                              </div>
                              {ce.description && (
                                <p className="text-white/40 text-xs mt-1 ml-4">{ce.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5 ml-4">
                                {!ce.all_day && ce.start_date && (
                                  <span className="flex items-center gap-1 text-xs text-white/50">
                                    <Clock className="w-3 h-3" />
                                    {format(parseISO(ce.start_date), "h:mm a")}
                                    {ce.end_date && ` - ${format(parseISO(ce.end_date), "h:mm a")}`}
                                  </span>
                                )}
                                {ce.all_day && (
                                  <span className="text-xs text-white/50">All day</span>
                                )}
                                {ce.meeting_platform && ce.meeting_platform !== "in_person" && (
                                  <span className={`flex items-center gap-1 text-xs ${platform.color}`}>
                                    <PlatformIcon className="w-3 h-3" />
                                    {platform.label}
                                  </span>
                                )}
                                {ce.location && (
                                  <span className="flex items-center gap-1 text-xs text-white/40">
                                    <MapPin className="w-3 h-3" />{ce.location}
                                  </span>
                                )}
                                {ce.creator_name && (
                                  <span className="flex items-center gap-1 text-xs text-white/30">
                                    <Users className="w-3 h-3" />{ce.creator_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {ce.meeting_link && (
                                <a
                                  href={ce.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  Join
                                </a>
                              )}
                              <button
                                onClick={() => deleteEntryMutation.mutate(ce.id)}
                                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedItems.dayInvoices.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <Circle className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Invoices Due
                  </h4>
                  <div className="space-y-2">
                    {selectedItems.dayInvoices.map((i) => (
                      <div key={i.id} className="bg-white/5 rounded-lg p-3">
                        <p className="text-white font-medium text-sm">{i.invoice_number}</p>
                        <p className="text-white/50 text-xs mt-1">
                          {i.currency} {i.amount?.toLocaleString()} &middot; {i.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
