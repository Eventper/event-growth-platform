import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Calendar, Users, DollarSign, Clock, Search, Send, Trash2, MessageCircle, PenTool, Save, ArrowRight, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight, Circle, CheckCircle, FileText, Bell, Ticket, Loader2, X, Printer, Flag, Mail, Phone, TrendingUp } from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PlannerLayout from "@/components/PlannerLayout";
import { useAuth } from "@/lib/auth";
import EmailStatusBanner from "@/components/EmailStatusBanner";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  format, differenceInWeeks, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO,
} from "date-fns";
import { formatNigerianPhone } from "@/lib/phone-formatter";
import { cn } from "@/lib/utils";

export default function PlannerDashboard() {
  usePageMeta({ title: "Planner Dashboard — Event Perfekt" });

  const { user, trackActivity } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const savedCountry = localStorage.getItem('ep_dashboard_country') as "all" | "UK" | "Nigeria" | null;
  const [countryFilter, setCountryFilter] = useState<"all" | "UK" | "Nigeria">(savedCountry || "all");

  useEffect(() => {
    if (savedCountry) {
      localStorage.removeItem('ep_dashboard_country');
    }
  }, [savedCountry]);
  const { toast } = useToast();

  useEffect(() => {
    trackActivity('viewed_planner_dashboard', 'dashboard');
  }, [trackActivity]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
  });

  const allEvents = events as any[];

  // Country classification helpers
  const isUKEvent = (e: any) => {
    const c = (e.country || "").toLowerCase();
    return c.includes("uk") || c.includes("united kingdom") || c.includes("england") || c.includes("wales") || c.includes("scotland") || e.currency === "GBP";
  };
  const isNigeriaEvent = (e: any) => {
    const c = (e.country || "").toLowerCase();
    return c.includes("nigeria") || e.currency === "NGN";
  };

  const filteredEvents = allEvents.filter((event: any) => {
    const matchesSearch = !searchQuery || event.name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (countryFilter === "UK") return isUKEvent(event);
    if (countryFilter === "Nigeria") return isNigeriaEvent(event);
    return true;
  });

  const urgentEvents = filteredEvents.filter(e => { try { return differenceInWeeks(new Date(e.startDate), new Date()) <= 4; } catch { return false; } });
  const activeEvents = filteredEvents.filter(e => { try { const w = differenceInWeeks(new Date(e.startDate), new Date()); return w > 4 && w <= 12; } catch { return false; } });
  const upcomingEvents = filteredEvents.filter(e => { try { return differenceInWeeks(new Date(e.startDate), new Date()) > 12; } catch { return false; } });

  const ukCount = allEvents.filter(isUKEvent).length;
  const nigeriaCount = allEvents.filter(isNigeriaEvent).length;

  const countryMeta = {
    all:     { label: "All Events", flag: "🌍", accent: "from-[#1a3a6b] to-[#2a5a9b]", badge: "bg-white/20 text-white" },
    UK:      { label: "UK Events",  flag: "🇬🇧", accent: "from-[#012169] to-[#003580]", badge: "bg-white/20 text-white" },
    Nigeria: { label: "Nigeria Events", flag: "🇳🇬", accent: "from-[#008751] to-[#006b3f]", badge: "bg-white/20 text-white" },
  };
  const meta = countryMeta[countryFilter];

  const getEventPriority = (event: any) => {
    const weeksUntil = differenceInWeeks(new Date(event.startDate), new Date());
    if (weeksUntil <= 4) return { label: 'Urgent', color: 'bg-red-100 text-red-800', border: 'border-red-300' };
    if (weeksUntil <= 12) return { label: 'Active', color: 'bg-amber-100 text-amber-800', border: 'border-amber-300' };
    return { label: 'Upcoming', color: 'bg-green-100 text-green-800', border: 'border-green-300' };
  };

  if (isLoading) {
    return (
      <PlannerLayout>
        <div className="p-6">
          <EmailStatusBanner />
        </div>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto" />
        </div>
      </PlannerLayout>
    );
  }

  return (
    <PlannerLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* HERO SECTION — Event Command Centre */}
        <div className={`bg-gradient-to-r ${meta.accent} rounded-xl shadow-lg p-6 sm:p-8 transition-all duration-300`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{meta.flag}</span>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{meta.label} — Command Centre</h1>
              </div>
              {user && (
                <p className="text-white/70 text-sm">
                  Welcome back, {user.name} &bull; {filteredEvents.length} {countryFilter === "all" ? "total" : countryFilter} events
                  {countryFilter === "all" && <span className="ml-2 text-white/50">🇬🇧 {ukCount} UK · 🇳🇬 {nigeriaCount} Nigeria</span>}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
              <Button
                onClick={() => setLocation('/create-event')}
                className="bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg px-4 py-2 border border-white/30"
              >
                + Create Event
              </Button>
              <Button
                onClick={() => setLocation('/create-event?type=day_coordination')}
                className="bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg px-4 py-2 border border-white/30"
              >
                + Day Coordination
              </Button>
            </div>
          </div>

          {/* ── Country / Region Toggle — prominent, inside hero ── */}
          <div className="mt-5 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white/60 text-xs font-medium uppercase tracking-wider mr-1">Viewing:</span>
              {([
                { value: "all",     label: "All Events",      flag: "🌍", count: allEvents.length },
                { value: "Nigeria", label: "Nigeria",         flag: "🇳🇬", count: nigeriaCount },
                { value: "UK",      label: "United Kingdom",  flag: "🇬🇧", count: ukCount },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCountryFilter(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                    countryFilter === opt.value
                      ? "bg-white text-gray-900 border-white shadow-md"
                      : "bg-white/10 text-white border-white/30 hover:bg-white/20"
                  }`}
                >
                  <span className="text-base">{opt.flag}</span>
                  <span>{opt.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    countryFilter === opt.value ? "bg-gray-900/10 text-gray-700" : "bg-white/20 text-white"
                  }`}>{opt.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3-COLUMN INFO LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN — Briefing & Deadlines */}
          <div className="space-y-6">
            {/* Briefing Panel */}
            <BriefingPanel />

            {/* Deadlines This Week */}
            <DeadlinesThisWeek events={allEvents} />
          </div>

          {/* RIGHT COLUMN — Team, Live Funnel & Agent */}
          <div className="space-y-6">
            {/* I Am Her Live Funnel — real-time conversion widget */}
            <IAmHerFunnelWidget />

            {/* Team Assignments */}
            <TeamAssignmentsOverview events={allEvents} />

          </div>
        </div>

        {/* QUICK STATS SECTION — always reflects the active country filter */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{filteredEvents.length}</p>
              <p className="text-xs text-gray-400">{meta.flag} {countryFilter === "all" ? "All" : countryFilter} Events</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{urgentEvents.length}</p>
              <p className="text-xs text-gray-400">Urgent (≤4 weeks)</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{activeEvents.length}</p>
              <p className="text-xs text-gray-400">Active Planning</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{upcomingEvents.length}</p>
              <p className="text-xs text-gray-400">Upcoming</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Event Lifecycle Journey Guide ── */}
        <Card className="bg-gradient-to-r from-[#1a0508] to-[#16213e] border-[#330311]/40">
          <CardContent className="p-4">
            <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-3">Event Lifecycle — how every event flows</p>
            <div className="flex flex-wrap gap-2">
              {[
                { num: "1", label: "Enquiry & Sales", desc: "Lead → proposal → booking" },
                { num: "2", label: "Create Event", desc: "Wizard & event record" },
                { num: "3", label: "Pre-Event Planning", desc: "Budget, vendors, guests, venue" },
                { num: "4", label: "Creative & Design", desc: "Decor, floor plan, branding" },
                { num: "5", label: "Communication", desc: "Invitations, WhatsApp, reminders" },
                { num: "6", label: "Event Day", desc: "Run sheet, check-in, polling" },
                { num: "7", label: "Post-Event", desc: "Reports, surveys, closure" },
              ].map((phase, i, arr) => (
                <div key={phase.num} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[#8B1538] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{phase.num}</span>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{phase.label}</p>
                      <p className="text-white/40 text-[10px] truncate">{phase.desc}</p>
                    </div>
                  </div>
                  {i < arr.length - 1 && <span className="text-white/20 text-sm">→</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Event Calendar — filtered by active country */}
        <EventCalendar events={filteredEvents} />

        {/* ClickUp-STYLE EVENTS BOARD */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{meta.flag}</span>
              <h2 className="text-lg font-semibold text-white">{meta.label}</h2>
              {filteredEvents.length > 0 && (
                <Badge className="bg-white/20 text-white border-white/30 text-xs">{filteredEvents.length} events</Badge>
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400 text-sm rounded-lg"
              />
            </div>
          </div>

          {/* Kanban Board View — Grouped by urgency, fully filtered */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
            {/* URGENT COLUMN */}
            <div className="bg-gradient-to-br from-red-50 to-red-50 rounded-xl border border-red-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Urgent (≤4w)
                  </h3>
                  <Badge className="bg-white text-red-700 text-xs">{urgentEvents.length}</Badge>
                </div>
              </div>
              <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                {urgentEvents
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map(event => (
                    <EventCard key={event.id} event={event} showCountry={countryFilter === "all"} onOpen={(id) => setLocation(`/event-dashboard/${id}`)} />
                  ))}
                {urgentEvents.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-4">No urgent {countryFilter !== "all" ? countryFilter + " " : ""}events</p>
                )}
              </div>
            </div>

            {/* ACTIVE COLUMN */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-50 rounded-xl border border-amber-200 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Active (4-12w)
                  </h3>
                  <Badge className="bg-white text-amber-700 text-xs">{activeEvents.length}</Badge>
                </div>
              </div>
              <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                {activeEvents
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map(event => (
                    <EventCard key={event.id} event={event} showCountry={countryFilter === "all"} onOpen={(id) => setLocation(`/event-dashboard/${id}`)} />
                  ))}
                {activeEvents.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-4">No active {countryFilter !== "all" ? countryFilter + " " : ""}events</p>
                )}
              </div>
            </div>

            {/* UPCOMING COLUMN */}
            <div className="bg-gradient-to-br from-green-50 to-green-50 rounded-xl border border-green-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Upcoming ({'>'}12w)
                  </h3>
                  <Badge className="bg-white text-green-700 text-xs">{upcomingEvents.length}</Badge>
                </div>
              </div>
              <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                {upcomingEvents
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map(event => (
                    <EventCard key={event.id} event={event} showCountry={countryFilter === "all"} onOpen={(id) => setLocation(`/event-dashboard/${id}`)} />
                  ))}
                {upcomingEvents.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-4">No upcoming {countryFilter !== "all" ? countryFilter + " " : ""}events</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes + Team Chat side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickNotes />
          <TeamChat />
        </div>
      </div>
    </PlannerLayout>
  );
}

// ClickUp-Style Event Card Component
function EventCard({ event, onOpen, showCountry = false }: { event: any; onOpen: (id: string) => void; showCountry?: boolean }) {
  const [, setLocation] = useLocation();

  let weeksUntil = 999;
  try {
    const startDate = new Date(event.startDate);
    if (!isNaN(startDate.getTime())) {
      weeksUntil = differenceInWeeks(startDate, new Date());
    }
  } catch {
    weeksUntil = 999;
  }

  const countryFlag = (() => {
    const c = (event.country || "").toLowerCase();
    const cur = event.currency || "";
    if (c.includes("nigeria") || cur === "NGN") return "🇳🇬";
    if (c.includes("uk") || c.includes("united kingdom") || c.includes("england") || c.includes("wales") || c.includes("scotland") || cur === "GBP") return "🇬🇧";
    if (c.includes("ghana") || cur === "GHS") return "🇬🇭";
    if (c.includes("kenya") || cur === "KES") return "🇰🇪";
    if (c.includes("united states") || c.includes("usa") || cur === "USD") return "🇺🇸";
    return "🌍";
  })();

  const dateLabel = (() => {
    try {
      const d = new Date(event.startDate);
      return isNaN(d.getTime()) ? "Date TBC" : format(d, "MMM d, yyyy");
    } catch { return "Date TBC"; }
  })();

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all group">
      <div
        className="cursor-pointer"
        onClick={() => onOpen(event.id)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {showCountry && <span className="text-sm flex-shrink-0" title={event.country}>{countryFlag}</span>}
              <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate">{event.name}</h4>
            </div>
            <p className="text-xs text-gray-500">{dateLabel} · {event.city || event.country || ""}</p>
          </div>
          <Badge className={`text-xs flex-shrink-0 ${weeksUntil <= 4 ? "bg-red-100 text-red-700 border-red-200" : weeksUntil <= 12 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-blue-100 text-blue-700 border-blue-200"}`}>
            {weeksUntil > 900 ? "—" : `${weeksUntil}w`}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600 pb-2 border-b border-gray-100 mb-2">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {event.guestCount || 0} guests
          </span>
          <span className="flex items-center gap-1 font-medium">
            {event.currency || "NGN"} {Number(event.budget || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setLocation(`/event-planner/${event.id}`); }}
        className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold text-[#8B1538] hover:bg-[#8B1538]/5 px-2 py-1.5 rounded-md border border-[#8B1538]/20 hover:border-[#8B1538]/40 transition-all"
      >
        <Flag className="w-3 h-3" />
        Open Enhanced Planner
      </button>
    </div>
  );
}

// ── Lifecycle progress helper ──────────────────────────────────────────────────
function getLifecycleProgress(event: any): { pct: number; step: string; nextStep: string; quickActions: { label: string; path: string }[] } {
  const ws = event.workflowStatus || 'new_intake';
  const stages: Record<string, { pct: number; step: string; nextStep: string; quickActions: { label: string; path: string }[] }> = {
    new_intake:  { pct: 10, step: 'Intake',      nextStep: 'Awaiting manager review & assignment', quickActions: [] },
    assigned:    { pct: 25, step: 'Assigned',     nextStep: 'Accept ownership & build your team',   quickActions: [{ label: 'Open Event', path: '' }] },
    in_planning: { pct: 55, step: 'Planning',     nextStep: 'Complete budget, vendors & guest list', quickActions: [{ label: 'Budget', path: '/budget-management' }, { label: 'Vendors', path: '/vendor-management' }, { label: 'Guests', path: '/guest-hub' }] },
    event_day:   { pct: 80, step: 'Event Day',    nextStep: 'Run sheet active — manage check-in',   quickActions: [{ label: 'Run Sheet', path: '/run-sheet' }, { label: 'Check-in', path: '/checkin/select' }] },
    post_event:  { pct: 92, step: 'Post-Event',   nextStep: 'Gather surveys & close finances',       quickActions: [{ label: 'Surveys', path: '/survey-builder' }, { label: 'Reports', path: '/management-dashboard' }] },
    closed:      { pct: 100, step: 'Closed',      nextStep: 'Event complete and archived',           quickActions: [] },
  };
  return stages[ws] || stages['new_intake'];
}

const WORKFLOW_STATUS_GROUPS = [
  { key: 'new_intake',  label: '🔴 Action Required',  desc: 'Awaiting manager review',    badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { key: 'assigned',    label: '🔵 Newly Assigned',    desc: 'Accept ownership & build team', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { key: 'in_planning', label: '🟡 In Planning',       desc: 'Active planning phase',      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { key: 'event_day',   label: '🟣 Event Day',         desc: 'Live execution today',       badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { key: 'post_event',  label: '🔷 Post-Event',        desc: 'Wrap-up & closure',          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { key: 'closed',      label: '✅ Closed',            desc: 'Archived events',            badge: 'bg-green-500/20 text-green-300 border-green-500/30' },
];

function EventLifecycleGroups({ events, onOpen }: { events: any[]; onOpen: (id: string) => void }) {
  const [, setLocation] = useLocation();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['closed', 'new_intake']));
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) =>
    setCollapsedGroups(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  const toggleActions = (id: string) =>
    setExpandedActions(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="space-y-4">
      {WORKFLOW_STATUS_GROUPS.map(group => {
        const groupEvents = events.filter(e => (e.workflowStatus || 'new_intake') === group.key);
        if (groupEvents.length === 0) return null;
        const isCollapsed = collapsedGroups.has(group.key);
        return (
          <div key={group.key} className="space-y-3">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-white">{group.label}</h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${group.badge}`}>
                  {groupEvents.length} event{groupEvents.length !== 1 ? 's' : ''}
                </span>
                <span className="text-white/40 text-xs hidden sm:block">{group.desc}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 text-white/40 transition-transform", !isCollapsed && "rotate-90")} />
            </button>

            {/* Event cards */}
            {!isCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupEvents.map((event: any) => {
                  const lifecycle = getLifecycleProgress(event);
                  let weeksUntil = 999;
                  try {
                    const startDate = new Date(event.startDate);
                    if (!isNaN(startDate.getTime())) {
                      weeksUntil = differenceInWeeks(startDate, new Date());
                    }
                  } catch {
                    weeksUntil = 999;
                  }
                  return (
                    <Card
                      key={event.id}
                      className="bg-white/8 backdrop-blur-sm border-white/15 cursor-pointer hover:bg-white/13 hover:border-white/25 transition-all group overflow-hidden"
                      onClick={() => onOpen(event.id)}
                    >
                      {/* Lifecycle progress bar */}
                      <div className="h-1 bg-white/10 w-full">
                        <div
                          className={cn("h-full transition-all", 
                            lifecycle.pct === 100 ? "bg-green-500" :
                            lifecycle.pct >= 80 ? "bg-purple-500" :
                            lifecycle.pct >= 55 ? "bg-amber-500" :
                            lifecycle.pct >= 25 ? "bg-blue-500" : "bg-red-500"
                          )}
                          style={{ width: `${lifecycle.pct}%` }}
                        />
                      </div>

                      <CardContent className="p-4">
                        {/* Title & step */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1 pr-2">
                            <h3 className="font-semibold text-white text-sm leading-tight truncate">{event.name}</h3>
                            <p className="text-white/40 text-[10px] mt-0.5">{lifecycle.step} · {lifecycle.pct}% complete</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] border-white/20 text-white/50 shrink-0 capitalize">
                            {event.eventCategory || event.type}
                          </Badge>
                        </div>

                        {/* Event info */}
                        <div className="space-y-1 text-xs text-white/55 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{(() => { try { const d = new Date(event.startDate); return isNaN(d.getTime()) ? 'Date invalid' : format(d, 'MMM d, yyyy'); } catch { return 'Date invalid'; } })()}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{weeksUntil > 0 && weeksUntil < 999 ? `${weeksUntil}w away` : 'TBA'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.guestCount} guests</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{event.currency} {Number(event.budget).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Next step hint */}
                        <div className="bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 mb-3">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-0.5">Next Step</p>
                          <p className="text-xs text-white/75">{lifecycle.nextStep}</p>
                        </div>

                        {/* Quick actions — collapsible */}
                        {lifecycle.quickActions.length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={e => { e.stopPropagation(); toggleActions(event.id); }}
                              className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                            >
                              <span className="uppercase tracking-wider font-semibold">Actions</span>
                              <ChevronRight className={cn("w-3 h-3 transition-transform", expandedActions.has(event.id) && "rotate-90")} />
                            </button>
                            {expandedActions.has(event.id) && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {lifecycle.quickActions.map(action => (
                                  <button
                                    key={action.label}
                                    onClick={e => { e.stopPropagation(); action.path ? setLocation(action.path) : onOpen(event.id); }}
                                    className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/15 transition-colors"
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-end mt-2">
                          <span className="text-xs text-amber-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Open <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BriefingPanel() {
  const [dismissed, setDismissed] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: briefing, isLoading, isError, error } = useQuery<any>({
    queryKey: ["/api/briefing"],
  });

  if (isError) {
    toast({ title: "Unable to load briefing", description: "Please refresh the page or try again later", variant: "destructive" });
    return (
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-300 text-sm font-medium">Failed to load briefing</p>
            <p className="text-red-400 text-xs mt-0.5">{error?.message || "Unable to fetch your status update"}</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-red-300 hover:text-red-200 text-xs px-2 py-1 rounded border border-red-500/30 hover:border-red-500/50 transition-colors">Retry</button>
        </CardContent>
      </Card>
    );
  }

  if (dismissed || (!isLoading && !briefing)) return null;

  const ICON_MAP: Record<string, any> = {
    next_event: Calendar,
    upcoming_event: Calendar,
    overdue_tasks: AlertTriangle,
    overdue_invoices: DollarSign,
    unpaid_invoices: FileText,
    reminders: Bell,
    tickets: Ticket,
    all_clear: CheckCircle,
  };

  const PRIORITY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
    urgent: { bg: "bg-red-500/10", border: "border-red-500/30", icon: "text-red-400" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "text-amber-400" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "text-blue-400" },
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "text-emerald-400" },
  };

  const NAV_MAP: Record<string, string> = {
    overdue_tasks: "/project-management",
    overdue_invoices: "/invoicing",
    unpaid_invoices: "/invoicing",
    reminders: "/reminders",
    tickets: "/tickets",
  };

  const handleItemClick = (item: any) => {
    if (item.eventId) {
      setLocation(`/event-dashboard/${item.eventId}`);
    } else if (NAV_MAP[item.type]) {
      setLocation(NAV_MAP[item.type]);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-[#330311]/80 to-[#1a0208]/80 backdrop-blur-sm border-amber-500/20 overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">📋</span>
            {isLoading ? "Loading your briefing..." : `${briefing?.greeting || "Hello"}, ${user?.name?.split(' ')[0] || 'there'}!`}
          </CardTitle>
          {!isLoading && briefing && (
            <p className="text-white/50 text-xs mt-1">Here's your status update</p>
          )}
        </div>
        <button onClick={() => setDismissed(true)} className="text-white/60 hover:text-white transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-white/40 py-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Gathering your updates...</span>
          </div>
        ) : (
          <>
            {briefing?.summary && (
              <div className="flex flex-wrap gap-3 mb-4 text-xs">
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/60">
                  <span className="text-white font-bold">{briefing.summary.totalEvents}</span> events
                </span>
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/60">
                  <span className="text-white font-bold">{briefing.summary.totalTasks}</span> tasks
                  {briefing.summary.completedTasks > 0 && <span className="text-emerald-400"> · {briefing.summary.completedTasks} done</span>}
                </span>
                {briefing.summary.inProgressTasks > 0 && (
                  <span className="bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 text-blue-300">
                    {briefing.summary.inProgressTasks} in progress
                  </span>
                )}
                {briefing.summary.overdueTasks > 0 && (
                  <span className="bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1 text-red-300">
                    {briefing.summary.overdueTasks} overdue
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2">
              {briefing?.items?.map((item: any, idx: number) => {
                const Icon = ICON_MAP[item.type] || Bell;
                const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.info;
                const isClickable = !!item.eventId || !!NAV_MAP[item.type];

                return (
                  <div
                    key={idx}
                    onClick={() => isClickable && handleItemClick(item)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      style.bg, style.border,
                      isClickable && "cursor-pointer hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", style.icon)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{item.message}</p>
                      {item.detail && <p className="text-white/40 text-xs mt-0.5">{item.detail}</p>}
                    </div>
                    {isClickable && <ArrowRight className="w-4 h-4 text-white/20 mt-0.5 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EventCalendar({ events }: { events: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [, setLocation] = useLocation();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((e: any) => {
      if (!e.startDate || typeof e.startDate !== 'string') return false;
      try {
        const start = new Date(e.startDate);
        const end = e.endDate ? new Date(e.endDate) : start;
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        return dayOnly >= startOnly && dayOnly <= endOnly;
      } catch { return false; }
    });
  };

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            Booked Events Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-sm font-medium min-w-[120px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentMonth(new Date())} className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white ml-1">Today</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7">
          {weekDays.map(d => (
            <div key={d} className="p-1.5 text-center text-[10px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calDays.map((day) => {
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0 && inMonth;
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "relative p-1 min-h-[44px] sm:min-h-[52px] border border-white/5 text-left transition-colors",
                  inMonth ? "hover:bg-white/5" : "opacity-20",
                  isSelected && "bg-white/10",
                )}
              >
                <span className={cn(
                  "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                  today ? "ring-2 ring-amber-400 bg-amber-400/20 text-white" : inMonth ? "text-white/70" : "text-white/30",
                )}>
                  {format(day, "d")}
                </span>
                {hasEvents && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5 px-0.5">
                    {dayEvents.slice(0, 3).map((_e: any, i: number) => (
                      <div key={i} className="w-full h-1 rounded-full bg-amber-400/70" />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-amber-400/70">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="border-t border-white/10 p-4">
            <h4 className="text-white font-medium text-sm mb-3">{format(selectedDay, "EEEE, MMMM d, yyyy")}</h4>
            {selectedEvents.length === 0 ? (
              <p className="text-white/30 text-xs">No events booked on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((e: any) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/event-dashboard/${e.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{e.name}</p>
                      <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                        <span>{format(new Date(e.startDate), "MMM d")} {e.endDate && e.endDate !== e.startDate ? `— ${format(new Date(e.endDate), "MMM d")}` : ""}</span>
                        <span className="capitalize">{e.type} · {e.eventCategory}</span>
                        {e.guestCount > 0 && <span>{e.guestCount} guests</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickNotes() {
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery<any[]>({ queryKey: ["/api/events"] });

  const { data: notes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events", selectedEventId, "notes"],
    queryFn: () => selectedEventId
      ? fetch(`/api/events/${selectedEventId}/notes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.ok ? r.json() : [])
      : Promise.resolve([]),
    enabled: !!selectedEventId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/events/${selectedEventId}/notes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "notes"] });
      setNoteTitle("");
      setNoteContent("");
      toast({ title: "Note saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save note.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/notes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "notes"] }),
  });

  const handleSave = () => {
    if (!noteContent.trim() || !selectedEventId) return;
    createMutation.mutate({
      section: "planner_dashboard",
      eventId: selectedEventId,
      title: noteTitle.trim() || `Note - ${format(new Date(), "MMM d, yyyy")}`,
      content: noteContent,
      tags: ["planner_dashboard"],
      isPrivate: true,
    });
  };

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="text-white text-base font-semibold flex items-center">
          <PenTool className="w-5 h-5 mr-2 text-amber-400" />
          Quick Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-white/20 bg-white/10 text-white text-sm"
          >
            <option value="" className="bg-[#330311] text-white">Select an event for notes...</option>
            {(events as any[]).map((e: any) => (
              <option key={e.id} value={e.id} className="bg-[#330311] text-white">{e.name}</option>
            ))}
          </select>
          <Input
            placeholder="Title (optional)"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            disabled={!selectedEventId}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-10"
          />
          <Textarea
            placeholder={selectedEventId ? "Write your note here..." : "Select an event above to start writing notes"}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            disabled={!selectedEventId}
            className="min-h-[80px] bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none text-sm"
          />
          <Button
            onClick={handleSave}
            disabled={!noteContent.trim() || !selectedEventId || createMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-5"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending ? "Saving..." : "Save Note"}
          </Button>

          {notes.length > 0 && (
            <div className="border-t border-white/10 pt-3 space-y-2 max-h-[130px] overflow-y-auto">
              {notes.slice(0, 5).map((note: any) => (
                <div key={note.id} className="bg-white/5 px-3 py-2 rounded border border-white/10 group flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{note.title}</p>
                    <p className="text-xs text-white/50 truncate">{note.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(note.id); }}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-white/60 hover:text-red-400 shrink-0 ml-2"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamChat() {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/team-chat"],
    queryFn: async () => {
      const res = await fetch(`/api/team-chat`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      return res.ok ? res.json() : [];
    },
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/team-chat", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-chat"] });
      setMessage("");
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/team-chat/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/team-chat"] }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate({ message: message.trim() });
  };

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 flex flex-col overflow-hidden max-h-[300px] sm:max-h-[460px]">
      <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Team Chat</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col bg-black/20">
        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-white/40">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3">
              <MessageCircle className="h-8 w-8 text-white/30" />
            </div>
            <p className="text-sm font-medium text-white/50">No messages yet</p>
            <p className="text-xs text-white/30 mt-1">Say hello to your team</p>
          </div>
        ) : (
          <>
            <div className="flex-1" />
            {messages.map((msg: any, idx: number) => {
              const isMe = msg.sender_id === user?.id || msg.sender_name === user?.name;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const sameSender = prevMsg && ((prevMsg.sender_id === msg.sender_id) || (prevMsg.sender_name === msg.sender_name));
              return (
                <div key={msg.id} className={cn("flex group items-end gap-1", isMe ? "justify-end" : "justify-start", sameSender ? "mt-0.5" : "mt-3")}>
                  {!isMe && !sameSender && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-0.5">
                      {(msg.sender_name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!isMe && sameSender && <div className="w-7 shrink-0" />}
                  <div className={cn(
                    "max-w-[75%] px-3 py-1.5 text-[13px] leading-relaxed relative",
                    isMe
                      ? "bg-[#8B1538] text-white rounded-2xl rounded-br-md"
                      : "bg-white/15 text-white rounded-2xl rounded-bl-md border border-white/10"
                  )}>
                    {!isMe && !sameSender && (
                      <div className="mb-0.5">
                        <p className="text-[11px] font-semibold text-amber-400">{msg.sender_name}</p>
                        {(msg.sender_job_title || msg.sender_phone) && (
                          <div className="text-[10px] text-white/60 flex items-center gap-1.5">
                            {msg.sender_job_title && <span>{msg.sender_job_title}</span>}
                            {msg.sender_job_title && msg.sender_phone && <span>•</span>}
                            {msg.sender_phone && (() => {
                              const formatted = formatNigerianPhone(msg.sender_phone);
                              return formatted ? (
                                <a 
                                  href={`tel:${formatted.tel}`}
                                  className="text-blue-300 hover:text-blue-200 underline flex items-center gap-0.5"
                                  title={`Call ${formatted.display}`}
                                >
                                  <Phone className="w-3 h-3" />
                                  {formatted.display}
                                </a>
                              ) : (
                                <span>{msg.sender_phone}</span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <p className={cn("text-[10px] mt-0.5 leading-none", isMe ? "text-white/50 text-right" : "text-white/40")}>
                      {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
                    </p>
                  </div>
                  {isMe && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(msg.id)}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-white/60 hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <div className="shrink-0 border-t border-white/10 px-3 py-2 bg-white/5">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Aa"
            className="flex-1 bg-white/10 border-0 text-white placeholder:text-white/40 h-9 rounded-full px-4 text-sm focus-visible:ring-1 focus-visible:ring-amber-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={!message.trim() || sendMutation.isPending}
            size="sm"
            className={cn(
              "rounded-full h-9 w-9 p-0 transition-colors",
              message.trim() ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-white/10 text-white/40"
            )}
          >
            {sendMutation.isPending ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}

// ── DEADLINES THIS WEEK ────────────────────────────────────────
function DeadlinesThisWeek({ events }: { events: any[] }) {
  const today = new Date();
  const weekEnd = addMonths(today, 0);
  weekEnd.setDate(today.getDate() + 7);

  const deadlineEvents = events
    .filter(e => {
      const eventDate = new Date(e.startDate);
      return eventDate >= today && eventDate <= weekEnd;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const keyDeadlines = [
    { label: "Send Invitations", daysOut: 14 },
    { label: "Finalize Guest List", daysOut: 7 },
    { label: "Confirm Vendors", daysOut: 3 },
    { label: "Final Payment Due", daysOut: 1 },
  ];

  if (deadlineEvents.length === 0) return null;

  return (
    <Card className="bg-gradient-to-r from-[#5a4a1a] to-[#8b6914] border-yellow-500/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-yellow-100 text-base flex items-center gap-2">
          <Clock className="w-5 h-5" />
          ⏰ Deadlines This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deadlineEvents.map(event => {
            const daysUntil = differenceInWeeks(new Date(event.startDate), today) * 7 +
              (new Date(event.startDate).getDate() - today.getDate());
            return (
              <div key={event.id} className="flex items-center justify-between p-3 bg-yellow-600/30 border border-yellow-500/40 rounded-lg">
                <div>
                  <h4 className="font-semibold text-white text-sm">{event.name}</h4>
                  <p className="text-xs text-yellow-100">Event in {Math.max(daysUntil, 0)} days ({format(new Date(event.startDate), 'MMM d')})</p>
                  <p className="text-xs text-white/60 mt-1">Key actions: Send invites → Finalize guests → Confirm vendors → Final payment</p>
                </div>
                <Button size="sm" className="h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => window.location.href = `/event-dashboard/${event.id}`}>
                  View
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── TEAM ASSIGNMENTS ────────────────────────────────────────
function TeamAssignmentsOverview({ events }: { events: any[] }) {
  const [teamData, setTeamData] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      const assignments: Record<string, any[]> = {};
      for (const event of events.slice(0, 5)) {
        try {
          const res = await fetch(`/api/events/${event.id}/team`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          if (res.ok) {
            const team = await res.json();
            if (team && team.length > 0) assignments[event.id] = team;
          }
        } catch {}
      }
      setTeamData(assignments);
      setIsLoading(false);
    };
    fetchTeam();
  }, [events]);

  const assignedEventCount = Object.keys(teamData).length;
  if (isLoading || assignedEventCount === 0) return null;

  return (
    <Card className="bg-gradient-to-r from-[#1a3a6b] to-[#2a5a9b] border-blue-400/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-blue-100 text-base flex items-center gap-2">
          <Users className="w-5 h-5" />
          👥 Team Assignments ({assignedEventCount} events with teams)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(teamData)
            .slice(0, 3)
            .map(([eventId, members]: [string, any[]]) => {
              const event = events.find(e => e.id === eventId);
              return (
                <div key={eventId} className="p-3 bg-blue-500/25 border border-blue-400/40 rounded-lg">
                  <h4 className="font-semibold text-white text-sm mb-2">{event?.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {members.slice(0, 5).map((m: any, i) => (
                      <Badge key={i} className="text-xs bg-blue-500 text-white border-blue-400">
                        {m.name || m.email} · {m.role}
                      </Badge>
                    ))}
                    {members.length > 5 && <Badge className="text-xs bg-blue-500/30 text-blue-100 border-blue-400">+{members.length - 5} more</Badge>}
                  </div>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── I AM HER LIVE FUNNEL WIDGET ────────────────────────────────────────
function IAmHerFunnelWidget() {
  const [, setLocation] = useLocation();
  const { data: liveData, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/iamher-funnel/live"],
    queryFn: async () => {
      const res = await fetch("/api/admin/iamher-funnel/live", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch funnel");
      return res.json();
    },
    refetchInterval: 60000,
    retry: 1,
  });

  const f = liveData?.funnel || {};
  const visitors = f.visitors || 0;
  const cta = f.cta_clicks || 0;
  const starts = f.form_starts || 0;
  const success = f.submit_success || 0;
  const topSource = liveData?.topSource?.source || "—";
  const submitRate = f.submit_rate || "0";

  const miniStat = (label: string, value: number | string, accent?: string) => (
    <div className="text-center flex-1 min-w-[70px]">
      <div className={`text-lg font-bold ${accent || "text-white"}`}>{value}</div>
      <div className="text-[10px] text-gray-300 uppercase tracking-wider font-medium">{label}</div>
    </div>
  );

  return (
    <Card className="bg-gradient-to-br from-[#8B1538] to-[#330311] border-[#C9A961]/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#C9A961] text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            I Am Her — Live Conversion
          </span>
          <span className="text-[10px] text-gray-400 font-normal flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Today
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C9A961]" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 py-2 border-b border-white/10">
              {miniStat("Visitors", visitors, "text-[#C9A961]")}
              {miniStat("CTA", cta)}
              {miniStat("Forms", starts)}
              {miniStat("Submit", success)}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white font-semibold">{submitRate}%</span>
                <span className="text-[10px] text-gray-300 uppercase">Conversion rate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-300 uppercase">Top source:</span>
                <span className="text-xs text-[#C9A961] font-medium">{topSource}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setLocation("/admin/visitor-analytics")}
                className="text-[10px] text-[#C9A961] hover:text-white underline underline-offset-2 transition-colors"
              >
                View full funnel →
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── MILESTONE TIMELINE ────────────────────────────────────────
function MilestoneTimeline({ events }: { events: any[] }) {
  const urgentEvents = events
    .filter(e => differenceInWeeks(new Date(e.startDate), new Date()) <= 4)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  if (urgentEvents.length === 0) return null;

  const milestones = [
    { daysOut: 14, label: "Send Invitations", icon: Mail },
    { daysOut: 7, label: "Final Guest List", icon: Users },
    { daysOut: 3, label: "Confirm Vendors", icon: CheckCircle },
    { daysOut: 1, label: "Final Walkthrough", icon: Calendar },
    { daysOut: 0, label: "Event Day", icon: Flag },
  ];

  return (
    <Card className="bg-gradient-to-r from-[#4a2a7a] to-[#6b3a9b] border-purple-400/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-purple-100 text-base">📅 Upcoming Key Milestones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {urgentEvents.map(event => {
            const daysUntil = Math.ceil(differenceInWeeks(new Date(event.startDate), new Date()) * 7);
            return (
              <div key={event.id}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm">{event.name}</h4>
                  <span className="text-xs text-purple-100">{format(new Date(event.startDate), 'MMM d')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {milestones.map((m, i) => {
                    const isActive = daysUntil <= m.daysOut && (i === 0 || daysUntil > milestones[i - 1].daysOut);
                    const Icon = m.icon;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col items-center gap-1 px-2 py-1 rounded",
                          isActive
                            ? "bg-purple-500 text-purple-50"
                            : daysUntil < m.daysOut
                            ? "bg-purple-600/40 text-purple-200"
                            : "bg-white/10 text-white/50"
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="text-[10px] truncate w-12 text-center">{m.label.split(" ")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
