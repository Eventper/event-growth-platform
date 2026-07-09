import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import PlannerLayout from "@/components/PlannerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar, Users, DollarSign, TrendingUp, AlertTriangle, CheckCircle,
  Clock, Star, Search, Filter, Plus, Eye, Edit, BarChart3, Globe,
  ArrowLeft, Activity, Target, Award, Briefcase, MapPin, Zap,
  ArrowUpRight, ArrowDownRight, FileText, FolderOpen, PenTool, Download,
  File, FileCheck, FilePlus, Trash2, Save, Printer, Shield
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend
} from "recharts";

interface EventData {
  id: string;
  name: string;
  type: string;
  eventCategory: string | null;
  startDate: string;
  endDate: string;
  guestCount: number;
  budget: string;
  currency: string;
  status: string;
  city: string;
  country: string;
  plannerId: string | null;
  createdAt: string | null;
  weddingScope?: string | null;
  parentEventId?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  planning: "#f59e0b",
  active: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#ef4444",
  on_hold: "#8b5cf6",
};

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

const CATEGORY_COLORS = ["#8B1538", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtCurrency(amount: number) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toLocaleString();
}

export default function ManagementDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [noteTitle, setNoteTitle] = useState("Q3 Venue Walkthrough Debrief");
  const [noteContent, setNoteContent] = useState("Met with the venue coordinator at Grandeur Hall to finalise the room layout for the upcoming gala dinner. Key takeaways:\n\n1. Main ballroom capacity confirmed at 220 seated / 350 standing.\n2. AV package includes dual projectors, wireless microphones, and stage lighting — no additional hire needed.\n3. Catering cutoff is 10 working days before the event; dietary requirements must be submitted by then.\n4. Loading bay access available from 07:00 on setup day — goods lift fits standard flight cases.\n\nAction: Send revised floor plan to client by Friday and confirm linen colour choices.");
  const [noteCategory, setNoteCategory] = useState("logistics");
  const [createNoteEvent, setCreateNoteEvent] = useState<string>("");
  const [selectedNoteEvent, setSelectedNoteEvent] = useState<string>("all");
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>("all");
  const [docFilter, setDocFilter] = useState("all");

  const { data: events = [], isLoading } = useQuery<EventData[]>({
    queryKey: ["/api/events"],
  });

  useEffect(() => {
    if (events.length > 0 && !createNoteEvent) {
      setCreateNoteEvent(events[0].id);
    }
  }, [events, createNoteEvent]);

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks/upcoming-deadlines"],
  });

  const allEventIds = useMemo(() => events.map(e => e.id), [events]);

  const { data: allContracts = [] } = useQuery<any[]>({
    queryKey: ["/api/contracts/all"],
    queryFn: async () => {
      const results: any[] = [];
      for (const event of events) {
        try {
          const res = await fetch(`/api/events/${event.id}/contracts`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const contracts = await res.json();
            results.push(...contracts.map((c: any) => ({ ...c, eventName: event.name, eventId: event.id })));
          }
        } catch {}
      }
      return results;
    },
    enabled: events.length > 0,
  });

  const { data: allNotes = [], isLoading: notesLoading } = useQuery<any[]>({
    queryKey: ["/api/notes/all"],
    queryFn: async () => {
      const results: any[] = [];
      for (const event of events) {
        try {
          const res = await fetch(`/api/events/${event.id}/notes`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const notes = await res.json();
            results.push(...notes.map((n: any) => ({ ...n, eventName: event.name, eventId: event.id })));
          }
        } catch {}
      }
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: events.length > 0,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: { eventId: string; title: string; content: string; section: string; tags: string[] }) => {
      return apiRequest("POST", `/api/events/${data.eventId}/notes`, {
        title: data.title,
        content: data.content,
        noteType: data.section,
        tags: data.tags,
        isPrivate: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes/all"] });
      setNoteTitle("Q3 Venue Walkthrough Debrief");
      setNoteContent("Met with the venue coordinator at Grandeur Hall to finalise the room layout for the upcoming gala dinner. Key takeaways:\n\n1. Main ballroom capacity confirmed at 220 seated / 350 standing.\n2. AV package includes dual projectors, wireless microphones, and stage lighting — no additional hire needed.\n3. Catering cutoff is 10 working days before the event; dietary requirements must be submitted by then.\n4. Loading bay access available from 07:00 on setup day — goods lift fits standard flight cases.\n\nAction: Send revised floor plan to client by Friday and confirm linen colour choices.");
      setNoteCategory("logistics");
      toast({ title: "Note Saved", description: "Your note has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ eventId, noteId }: { eventId: string; noteId: string }) => {
      return apiRequest("DELETE", `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes/all"] });
      toast({ title: "Note Deleted" });
    },
  });

  const filteredNotes = useMemo(() => {
    return allNotes.filter((n: any) => {
      if (selectedNoteEvent !== "all" && n.eventId !== selectedNoteEvent) return false;
      if (noteCategoryFilter !== "all" && (n.noteType || n.section || "general") !== noteCategoryFilter) return false;
      return true;
    });
  }, [allNotes, selectedNoteEvent, noteCategoryFilter]);

  const filteredDocs = useMemo(() => {
    return allContracts.filter((d: any) => {
      if (docFilter !== "all" && d.eventId !== docFilter) return false;
      return true;
    });
  }, [allContracts, docFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    events.forEach(e => {
      const y = new Date(e.startDate).getFullYear();
      if (!isNaN(y)) years.add(String(y));
    });
    return Array.from(years).sort().reverse();
  }, [events]);

  const filteredByYear = useMemo(() => {
    if (yearFilter === "all") return events;
    return events.filter(e => String(new Date(e.startDate).getFullYear()) === yearFilter);
  }, [events, yearFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const total = filteredByYear.length;
    const active = filteredByYear.filter(e => e.status === "active").length;
    const completed = filteredByYear.filter(e => e.status === "completed").length;
    const planning = filteredByYear.filter(e => e.status === "planning").length;
    const cancelled = filteredByYear.filter(e => e.status === "cancelled").length;
    const upcoming = filteredByYear.filter(e => new Date(e.startDate) > now).length;
    const past = filteredByYear.filter(e => new Date(e.endDate) < now).length;
    const totalRevenue = filteredByYear.reduce((s, e) => s + parseFloat(e.budget || "0"), 0);
    const avgBudget = total > 0 ? totalRevenue / total : 0;
    const totalGuests = filteredByYear.reduce((s, e) => s + (e.guestCount || 0), 0);
    const successRate = total > 0 ? Math.round(((completed) / Math.max(completed + cancelled, 1)) * 100) : 0;
    return { total, active, completed, planning, cancelled, upcoming, past, totalRevenue, avgBudget, totalGuests, successRate };
  }, [filteredByYear]);

  const monthlyData = useMemo(() => {
    const data = MONTHS.map((month, idx) => ({
      month,
      events: 0,
      revenue: 0,
      guests: 0,
      completed: 0,
      active: 0,
      planning: 0,
    }));
    filteredByYear.forEach(e => {
      const m = new Date(e.startDate).getMonth();
      if (m >= 0 && m < 12) {
        data[m].events++;
        data[m].revenue += parseFloat(e.budget || "0");
        data[m].guests += e.guestCount || 0;
        if (e.status === "completed") data[m].completed++;
        else if (e.status === "active") data[m].active++;
        else if (e.status === "planning") data[m].planning++;
      }
    });
    return data;
  }, [filteredByYear]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredByYear.forEach(e => {
      counts[e.status] = (counts[e.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || "#6b7280",
    }));
  }, [filteredByYear]);

  const TYPE_LABELS: Record<string, string> = {
    wedding: "Wedding",
    corporate: "Corporate",
    celebration: "Celebration",
    childrens_party: "Children's Party",
    private: "Private",
  };

  const categoryData = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number; guests: number }> = {};
    filteredByYear.forEach(e => {
      const cat = e.type || "other";
      if (!counts[cat]) counts[cat] = { count: 0, revenue: 0, guests: 0 };
      counts[cat].count++;
      counts[cat].revenue += parseFloat(e.budget || "0");
      counts[cat].guests += e.guestCount || 0;
    });
    return Object.entries(counts)
      .map(([name, data], i) => ({
        name: TYPE_LABELS[name] || name.charAt(0).toUpperCase() + name.slice(1),
        ...data,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredByYear]);

  const countryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredByYear.forEach(e => {
      const c = e.country || "Unknown";
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredByYear]);

  const revenueByCategory = useMemo(() => {
    return categoryData.map(c => ({
      name: c.name,
      revenue: c.revenue,
      color: c.color,
    }));
  }, [categoryData]);

  const filteredEvents = useMemo(() => {
    return filteredByYear
      .filter(event => {
        const matchesSearch = (event.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (event.city || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (event.country || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || event.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "date") return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "budget") return parseFloat(b.budget || "0") - parseFloat(a.budget || "0");
        return 0;
      });
  }, [filteredByYear, searchTerm, statusFilter, sortBy]);

  const calendarEvents = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const months: { month: string; year: number; monthIdx: number; events: EventData[] }[] = [];
    for (let i = -2; i <= 9; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      months.push({
        month: MONTHS[d.getMonth()],
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        events: events.filter(e => {
          const sd = new Date(e.startDate);
          return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        }),
      });
    }
    return months;
  }, [events]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t: any) => t.status === "completed" || t.status === "done").length;
    const overdue = tasks.filter((t: any) => {
      if (t.status === "completed" || t.status === "done") return false;
      return t.dueDate && new Date(t.dueDate) < new Date();
    }).length;
    const inProgress = tasks.filter((t: any) => t.status === "in_progress").length;
    return { total, done, overdue, inProgress, completionRate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  if (isLoading) {
    return (
      <PlannerLayout><div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#8B1538] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div></PlannerLayout>
    );
  }

  return (
    <PlannerLayout><div className="min-h-screen text-white">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
                Analytics & Insights Dashboard
              </h1>
              <p className="text-white/70 text-sm">Complete overview of all events, performance, and business metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {events.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  openPrintWindow({
                    title: "Analytics & Insights Dashboard",
                    stats: [
                      { label: "Total Events", value: stats.total },
                      { label: "Active", value: stats.active },
                      { label: "Completed", value: stats.completed },
                      { label: "Total Revenue", value: fmtCurrency(stats.totalRevenue) },
                      { label: "Total Guests", value: stats.totalGuests.toLocaleString() },
                      { label: "Task Completion", value: `${taskStats.completionRate}%` },
                    ],
                    columns: [
                      { header: "Event Name", key: "name" },
                      { header: "Type", key: "type" },
                      { header: "Status", key: "status" },
                      { header: "Date", key: "startDate", format: (v: any) => v ? new Date(v).toLocaleDateString() : '-' },
                      { header: "Guests", key: "guestCount", align: "center" },
                      { header: "Budget", key: "budget", align: "right", format: (v: any, row: any) => `${row.currency || ''} ${Number(v || 0).toLocaleString()}` },
                      { header: "City", key: "city" },
                      { header: "Country", key: "country" },
                    ],
                    rows: filteredEvents as any[],
                    orientation: "landscape",
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            )}
            <Link href="/create-event">
              <Button className="bg-white text-[#330311] font-semibold">
                <Plus className="w-4 h-4 mr-2" /> New Event
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-[#8B1538]" />
                <Badge className="bg-[#330311]/40 text-[#ff6b8a] text-xs">{stats.upcoming} upcoming</Badge>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-gray-400 text-sm">Total Events</p>
            </CardContent>
          </Card>
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <Badge className="bg-blue-900/40 text-blue-300 text-xs">{stats.planning} planning</Badge>
              </div>
              <p className="text-3xl font-bold text-white">{stats.active}</p>
              <p className="text-gray-400 text-sm">Active / In Flight</p>
            </CardContent>
          </Card>
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-xs flex items-center"><ArrowUpRight className="w-3 h-3" /> {stats.successRate}%</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.completed}</p>
              <p className="text-gray-400 text-sm">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-white">{fmtCurrency(stats.totalRevenue)}</p>
              <p className="text-gray-400 text-sm">Total Revenue</p>
            </CardContent>
          </Card>
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalGuests.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Total Guests</p>
            </CardContent>
          </Card>
          <Card className="bg-[#16213e] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-white">{taskStats.completionRate}%</p>
              <p className="text-gray-400 text-sm">Task Completion</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-[#16213e] border border-gray-700 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">Month by Month</TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">All Events</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">
              <FolderOpen className="w-4 h-4 mr-1" /> Files & Contracts
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">
              <PenTool className="w-4 h-4 mr-1" /> Notes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">Deep Analytics</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">Timeline</TabsTrigger>
            <TabsTrigger value="training" className="data-[state=active]:bg-[#330311] data-[state=active]:text-white">🎓 Training Hub</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-[#16213e] border-gray-700 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">Events by Month</CardTitle>
                  <CardDescription className="text-gray-400">Monthly event distribution and revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                        labelStyle={{ color: "#9ca3af" }}
                      />
                      <Legend />
                      <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="active" name="Active" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="planning" name="Planning" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Event Status</CardTitle>
                  <CardDescription className="text-gray-400">Current status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {statusData.map(s => (
                          <div key={s.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                              <span className="text-gray-300">{s.name}</span>
                            </div>
                            <span className="text-white font-medium">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No events yet</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Event Types</CardTitle>
                  <CardDescription className="text-gray-400">Distribution by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={categoryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={100} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                        />
                        <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]}>
                          {categoryData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No data</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Top Countries</CardTitle>
                  <CardDescription className="text-gray-400">Events by location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {countryData.length > 0 ? countryData.map((c, i) => (
                      <div key={c.country} className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-300 flex-1 text-sm">{c.country}</span>
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${(c.count / Math.max(countryData[0]?.count || 1, 1)) * 100}%`,
                              backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                            }}
                          ></div>
                        </div>
                        <span className="text-white font-medium text-sm w-8 text-right">{c.count}</span>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-500">No data</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center w-32 h-32">
                      <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#374151" strokeWidth="10" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="10"
                          strokeDasharray={`${stats.successRate * 3.14} ${314 - stats.successRate * 3.14}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-3xl font-bold text-white">{stats.successRate}%</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-2">{stats.completed} completed of {stats.completed + stats.cancelled} finished</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">Task Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Completed</span>
                        <span className="text-green-400">{taskStats.done}</span>
                      </div>
                      <Progress value={taskStats.total > 0 ? (taskStats.done / taskStats.total) * 100 : 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">In Progress</span>
                        <span className="text-blue-400">{taskStats.inProgress}</span>
                      </div>
                      <Progress value={taskStats.total > 0 ? (taskStats.inProgress / taskStats.total) * 100 : 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Overdue</span>
                        <span className="text-red-400">{taskStats.overdue}</span>
                      </div>
                      <Progress value={taskStats.total > 0 ? (taskStats.overdue / taskStats.total) * 100 : 0} className="h-2" />
                    </div>
                    <p className="text-gray-500 text-xs text-center">{taskStats.total} total tasks</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">Revenue by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueByCategory.length > 0 ? revenueByCategory.map(c => (
                      <div key={c.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }}></div>
                        <span className="text-gray-300 text-sm flex-1 truncate">{c.name}</span>
                        <span className="text-white text-sm font-medium">{fmtCurrency(c.revenue)}</span>
                      </div>
                    )) : (
                      <div className="text-center py-4 text-gray-500 text-sm">No data</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <Card className="bg-[#16213e] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Monthly Event Volume</CardTitle>
                <CardDescription className="text-gray-400">Number of events planned each month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B1538" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8B1538" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                    />
                    <Area type="monotone" dataKey="events" name="Events" stroke="#8B1538" fill="url(#colorEvents)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Monthly Revenue</CardTitle>
                  <CardDescription className="text-gray-400">Revenue generated each month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={v => fmtCurrency(v)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Monthly Guests</CardTitle>
                  <CardDescription className="text-gray-400">Guest count per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                      />
                      <Line type="monotone" dataKey="guests" name="Guests" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#16213e] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Month-by-Month Breakdown</CardTitle>
                <CardDescription className="text-gray-400">Detailed view of each month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {monthlyData.map((m, i) => (
                    <div key={m.month} className={`p-4 rounded-lg border ${m.events > 0 ? "bg-[#1e2a4a] border-[#8B1538]/30" : "bg-[#1a1a2e] border-gray-700"}`}>
                      <p className="text-white font-semibold text-lg">{m.month}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Events</span>
                          <span className="text-white font-medium">{m.events}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Revenue</span>
                          <span className="text-emerald-400 font-medium">{fmtCurrency(m.revenue)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Guests</span>
                          <span className="text-purple-400 font-medium">{m.guests}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Done</span>
                          <span className="text-green-400 font-medium">{m.completed}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card className="bg-[#16213e] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">All Events</CardTitle>
                <CardDescription className="text-gray-400">Browse and manage every event — past, present, and upcoming</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, city, or country..."
                      className="pl-10 bg-[#1a1a2e] border-gray-600 text-white"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] bg-[#1a1a2e] border-gray-600 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px] bg-[#1a1a2e] border-gray-600 text-white">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Latest First</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                      <SelectItem value="budget">Highest Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">No events found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEvents.map(event => {
                      const now = new Date();
                      const start = new Date(event.startDate);
                      const end = new Date(event.endDate);
                      const isPast = end < now;
                      const isActive = start <= now && end >= now;
                      const isUpcoming = start > now;
                      const daysUntil = isUpcoming ? Math.ceil((start.getTime() - now.getTime()) / 86400000) : 0;
                      const timeLabel = isPast ? "Past" : isActive ? "Live Now" : `${daysUntil}d away`;
                      const timeBadgeColor = isPast ? "bg-gray-700 text-gray-300" : isActive ? "bg-green-900/40 text-green-300" : "bg-blue-900/40 text-blue-300";

                      return (
                        <div key={event.id} className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-4 flex items-center gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#330311]/40 flex items-center justify-center text-xl">
                            {event.type === "wedding" ? "💒" : event.type === "corporate" ? "🏢" : event.type === "childrens_party" ? "🎂" : event.type === "celebration" ? "🎉" : "🎊"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-semibold truncate">{event.name}</h3>
                              <Badge className={timeBadgeColor}>{timeLabel}</Badge>
                              <Badge style={{ backgroundColor: STATUS_COLORS[event.status] + "30", color: STATUS_COLORS[event.status] }}>
                                {STATUS_LABELS[event.status] || event.status}
                              </Badge>
                              {event.weddingScope && event.weddingScope !== 'parent' && (
                                <Badge className="bg-purple-900/30 text-purple-300 text-[10px]">
                                  {event.weddingScope === 'traditional' ? 'Traditional Engagement' : event.weddingScope === 'church wedding' ? 'Church Wedding' : event.weddingScope === 'reception' ? 'Reception (Party)' : event.weddingScope === 'after party' ? 'After Party' : event.weddingScope}
                                </Badge>
                              )}
                              {event.weddingScope === 'parent' && (
                                <Badge className="bg-amber-900/30 text-amber-300 text-[10px]">Wedding Group</Badge>
                              )}
                              {event.parentEventId && (
                                <Badge className="bg-indigo-900/30 text-indigo-300 text-[10px]">Linked</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.city}, {event.country}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {event.guestCount} guests</span>
                              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {event.currency} {parseFloat(event.budget).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/event-dashboard/${event.id}`}>
                              <Button variant="ghost" size="sm" className="text-gray-400">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/event-dashboard/${event.id}`}>
                              <Button variant="ghost" size="sm" className="text-gray-400">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card className="bg-[#16213e] border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-[#8B1538]" /> Files, Documents & Contracts
                    </CardTitle>
                    <CardDescription className="text-gray-400">All contracts and documents across every event in one place</CardDescription>
                  </div>
                  <Select value={docFilter} onValueChange={setDocFilter}>
                    <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Filter by event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      {events.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-4 text-center">
                    <FileText className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{filteredDocs.length}</p>
                    <p className="text-gray-400 text-xs">Total Documents</p>
                  </div>
                  <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-4 text-center">
                    <FileCheck className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{filteredDocs.filter((d: any) => d.status === "signed" || d.status === "active").length}</p>
                    <p className="text-gray-400 text-xs">Signed/Active</p>
                  </div>
                  <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-4 text-center">
                    <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{filteredDocs.filter((d: any) => d.status === "pending" || d.status === "draft").length}</p>
                    <p className="text-gray-400 text-xs">Pending/Draft</p>
                  </div>
                  <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-4 text-center">
                    <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{filteredDocs.filter((d: any) => d.status === "expired" || d.status === "cancelled").length}</p>
                    <p className="text-gray-400 text-xs">Expired/Cancelled</p>
                  </div>
                </div>

                {filteredDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No documents or contracts found</p>
                    <p className="text-gray-500 text-sm">Contracts added to events will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDocs.map((doc: any, i: number) => {
                      const statusColor: Record<string, string> = {
                        signed: "bg-green-900/30 text-green-400 border-green-700",
                        active: "bg-blue-900/30 text-blue-400 border-blue-700",
                        pending: "bg-yellow-900/30 text-yellow-400 border-yellow-700",
                        draft: "bg-gray-700/30 text-gray-400 border-gray-600",
                        expired: "bg-red-900/30 text-red-400 border-red-700",
                        cancelled: "bg-red-900/30 text-red-400 border-red-700",
                      };
                      return (
                        <div key={doc.id || i} className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-4 hover:border-[#8B1538]/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <File className="w-5 h-5 text-[#8B1538] mt-1 flex-shrink-0" />
                              <div className="min-w-0">
                                <h4 className="text-white font-medium truncate">{doc.title || doc.vendorName || "Untitled Document"}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <Badge className="bg-[#330311]/40 text-[#ff6b8a] text-xs border-0">{doc.eventName}</Badge>
                                  {doc.vendorName && <span className="text-gray-400 text-xs">Vendor: {doc.vendorName}</span>}
                                  {doc.type && <span className="text-gray-500 text-xs capitalize">{doc.type}</span>}
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  {doc.startDate && <span>Start: {new Date(doc.startDate).toLocaleDateString()}</span>}
                                  {doc.endDate && <span>End: {new Date(doc.endDate).toLocaleDateString()}</span>}
                                  {doc.value && <span>Value: ₦{parseFloat(doc.value).toLocaleString()}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className={`text-xs border ${statusColor[doc.status] || "bg-gray-700/30 text-gray-400 border-gray-600"}`}>
                                {doc.status || "draft"}
                              </Badge>
                              <Link href={`/event-dashboard/${doc.eventId}`}>
                                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-8 w-8 p-0">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Create Note</CardTitle>
                  <CardDescription className="text-gray-400">Add notes linked to any event</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300 text-sm">Event</Label>
                    <Select value={createNoteEvent} onValueChange={setCreateNoteEvent}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Category</Label>
                    <Select value={noteCategory} onValueChange={setNoteCategory}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="budget">Budget</SelectItem>
                        <SelectItem value="venue">Venue</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="decor">Décor</SelectItem>
                        <SelectItem value="guest_list">Guest List</SelectItem>
                        <SelectItem value="timeline">Timeline</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="logistics">Logistics</SelectItem>
                        <SelectItem value="staff">Staff/HR</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Title</Label>
                    <Input
                      value={noteTitle}
                      onChange={e => setNoteTitle(e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-1"
                      placeholder="Note title..."
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Content</Label>
                    <Textarea
                      value={noteContent}
                      onChange={e => setNoteContent(e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-1 min-h-[120px]"
                      placeholder="Write your note here..."
                    />
                  </div>
                  <Button
                    className="w-full bg-[#8B1538] hover:bg-[#6d1029] text-white"
                    disabled={!noteTitle || !noteContent || !createNoteEvent || createNoteMutation.isPending}
                    onClick={() => {
                      if (createNoteEvent) {
                        createNoteMutation.mutate({
                          eventId: createNoteEvent,
                          title: noteTitle,
                          content: noteContent,
                          section: noteCategory,
                          tags: [noteCategory],
                        });
                      }
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createNoteMutation.isPending ? "Saving..." : "Save Note"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-gray-700 lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white text-lg">All Notes</CardTitle>
                      <CardDescription className="text-gray-400">{filteredNotes.length} notes across all events</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={noteCategoryFilter} onValueChange={setNoteCategoryFilter}>
                        <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="budget">Budget</SelectItem>
                          <SelectItem value="venue">Venue</SelectItem>
                          <SelectItem value="catering">Catering</SelectItem>
                          <SelectItem value="decor">Décor</SelectItem>
                          <SelectItem value="guest_list">Guest List</SelectItem>
                          <SelectItem value="timeline">Timeline</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="logistics">Logistics</SelectItem>
                          <SelectItem value="staff">Staff/HR</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedNoteEvent} onValueChange={setSelectedNoteEvent}>
                        <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Filter by event" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Events</SelectItem>
                          {events.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {notesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-[#8B1538] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : filteredNotes.length === 0 ? (
                    <div className="text-center py-12">
                      <PenTool className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No notes yet</p>
                      <p className="text-gray-500 text-sm">Create a note using the form on the left</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {filteredNotes.map((note: any, i: number) => {
                        const categoryColors: Record<string, string> = {
                          general: "bg-gray-700/30 text-gray-300",
                          budget: "bg-green-900/30 text-green-400",
                          venue: "bg-blue-900/30 text-blue-400",
                          catering: "bg-orange-900/30 text-orange-400",
                          decor: "bg-pink-900/30 text-pink-400",
                          guest_list: "bg-purple-900/30 text-purple-400",
                          timeline: "bg-cyan-900/30 text-cyan-400",
                          vendor: "bg-yellow-900/30 text-yellow-400",
                          logistics: "bg-indigo-900/30 text-indigo-400",
                          staff: "bg-teal-900/30 text-teal-400",
                          contract: "bg-red-900/30 text-red-400",
                          follow_up: "bg-amber-900/30 text-amber-400",
                        };
                        return (
                          <div key={note.id || i} className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-white font-medium truncate">{note.title}</h4>
                                  <Badge className={`text-xs border-0 ${categoryColors[note.noteType || note.section] || categoryColors.general}`}>
                                    {note.noteType || note.section || "general"}
                                  </Badge>
                                </div>
                                <Badge className="bg-[#330311]/40 text-[#ff6b8a] text-xs border-0 mb-2">{note.eventName}</Badge>
                                <p className="text-gray-300 text-sm whitespace-pre-wrap">{note.content}</p>
                                <p className="text-gray-500 text-xs mt-2">
                                  {note.createdAt ? new Date(note.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-500 hover:text-red-400 h-8 w-8 p-0 flex-shrink-0"
                                onClick={() => deleteNoteMutation.mutate({ eventId: note.eventId, noteId: note.id })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Revenue by Event Type</CardTitle>
                  <CardDescription className="text-gray-400">Total revenue per category</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={revenueByCategory}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="revenue"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {revenueByCategory.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No data</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Guest Volume by Category</CardTitle>
                  <CardDescription className="text-gray-400">Total guests per event type</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                        />
                        <Bar dataKey="guests" name="Guests" radius={[4, 4, 0, 0]}>
                          {categoryData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#16213e] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Key Business Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                    <Award className="w-8 h-8 mx-auto text-amber-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.successRate}%</p>
                    <p className="text-gray-400 text-sm">Success Rate</p>
                  </div>
                  <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                    <DollarSign className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{fmtCurrency(stats.avgBudget)}</p>
                    <p className="text-gray-400 text-sm">Avg Budget</p>
                  </div>
                  <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                    <Users className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.total > 0 ? Math.round(stats.totalGuests / stats.total) : 0}</p>
                    <p className="text-gray-400 text-sm">Avg Guests/Event</p>
                  </div>
                  <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                    <Globe className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{countryData.length}</p>
                    <p className="text-gray-400 text-sm">Countries Served</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <Card className="bg-[#16213e] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Event Timeline</CardTitle>
                <CardDescription className="text-gray-400">12-month rolling view of all events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {calendarEvents.map((m, i) => {
                    const isCurrentMonth = m.monthIdx === new Date().getMonth() && m.year === new Date().getFullYear();
                    return (
                      <div key={`${m.month}-${m.year}`} className={`p-4 rounded-lg border ${isCurrentMonth ? "bg-[#330311]/20 border-[#8B1538]" : "bg-[#1a1a2e] border-gray-700"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-semibold">
                            {m.month} {m.year}
                            {isCurrentMonth && <Badge className="ml-2 bg-[#8B1538] text-white text-xs">Current</Badge>}
                          </h3>
                          <span className="text-gray-400 text-sm">{m.events.length} event{m.events.length !== 1 ? "s" : ""}</span>
                        </div>
                        {m.events.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {m.events.map(event => (
                              <Link key={event.id} href={`/event-dashboard/${event.id}`}>
                                <div className="bg-[#16213e] border border-gray-700 rounded p-3 cursor-pointer transition-colors">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[event.status] || "#6b7280" }}></div>
                                    <span className="text-white text-sm font-medium truncate">{event.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span>{new Date(event.startDate).getDate()} {m.month}</span>
                                    <span>{event.city}</span>
                                    <span>{event.guestCount} guests</span>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-600 text-sm">No events scheduled</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* GDPR Compliance Training */}
              <Card className="bg-[#16213e] border-gray-700 hover:border-[#8B1538] transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#8B1538]" />
                    GDPR Compliance
                  </CardTitle>
                  <CardDescription className="text-gray-400">Data protection & privacy essentials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm text-gray-300">
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Guest Data Protection</p>
                      <p className="text-gray-400">Secure collection, storage, and handling of guest information</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Consent Management</p>
                      <p className="text-gray-400">Obtaining and tracking explicit consent for data use</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Data Subject Rights</p>
                      <p className="text-gray-400">Right to access, rectify, delete, and port data</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Breach Reporting</p>
                      <p className="text-gray-400">72-hour notification protocol for data incidents</p>
                    </div>
                  </div>
                  <Button className="w-full bg-[#8B1538] hover:bg-[#6a0f2d] text-white">Learn GDPR Module</Button>
                </CardContent>
              </Card>

              {/* Customer Service Training */}
              <Card className="bg-[#16213e] border-gray-700 hover:border-[#8B1538] transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#8B1538]" />
                    Customer Service Excellence
                  </CardTitle>
                  <CardDescription className="text-gray-400">Professional client & guest interactions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm text-gray-300">
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Communication Skills</p>
                      <p className="text-gray-400">Clear, professional, and empathetic interactions</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Problem Resolution</p>
                      <p className="text-gray-400">Quick, effective solutions to client concerns</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Response Times</p>
                      <p className="text-gray-400">Target: 24-hour response to all inquiries</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Feedback Collection</p>
                      <p className="text-gray-400">Post-event surveys and satisfaction tracking</p>
                    </div>
                  </div>
                  <Button className="w-full bg-[#8B1538] hover:bg-[#6a0f2d] text-white">View Best Practices</Button>
                </CardContent>
              </Card>

              {/* Guest Management Training */}
              <Card className="bg-[#16213e] border-gray-700 hover:border-[#8B1538] transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#8B1538]" />
                    Guest Management Mastery
                  </CardTitle>
                  <CardDescription className="text-gray-400">Complete guest journey optimization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm text-gray-300">
                    <div>
                      <p className="font-semibold text-white mb-1">✓ RSVP Management</p>
                      <p className="text-gray-400">Digital invitations, responses, and dietary preferences</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Seating & Check-in</p>
                      <p className="text-gray-400">Table assignments and QR code/badge check-in</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Special Requirements</p>
                      <p className="text-gray-400">Accessibility, dietary, and medical accommodations</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">✓ Post-Event Follow-up</p>
                      <p className="text-gray-400">Thank you messages and feedback surveys</p>
                    </div>
                  </div>
                  <Button className="w-full bg-[#8B1538] hover:bg-[#6a0f2d] text-white">Explore Tools</Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Reference Section */}
            <Card className="bg-[#16213e] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">📚 Quick Reference Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-gray-700">
                    <p className="font-semibold text-white mb-2">🔐 Data Privacy</p>
                    <p className="text-sm text-gray-400 leading-relaxed">Encrypt all sensitive data, collect only necessary info, and get explicit consent.</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-gray-700">
                    <p className="font-semibold text-white mb-2">👥 Service Quality</p>
                    <p className="text-sm text-gray-400 leading-relaxed">Respond within 24 hours, maintain professional tone, and document all interactions.</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-gray-700">
                    <p className="font-semibold text-white mb-2">🎯 Guest Experience</p>
                    <p className="text-sm text-gray-400 leading-relaxed">Personalized communication, easy digital interactions, and a smooth check-in process.</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-gray-700">
                    <p className="font-semibold text-white mb-2">📊 Compliance</p>
                    <p className="text-sm text-gray-400 leading-relaxed">Follow local laws, keep audit logs, and document consents.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div></PlannerLayout>
  );
}
