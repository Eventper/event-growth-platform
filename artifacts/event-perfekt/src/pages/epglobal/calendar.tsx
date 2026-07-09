import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { epgFetch } from "@/lib/epglobal-auth";
import EPGlobalLayout from "@/components/EPGlobalLayout";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const typeColors: Record<string, string> = {
  meeting: "bg-blue-500",
  task_deadline: "bg-orange-500",
  finance_deadline: "bg-green-600",
  compliance_deadline: "bg-red-500",
  reporting_deadline: "bg-purple-500",
  recurring_review: "bg-gray-500",
  other: "bg-teal-500",
};

const typeLabels: Record<string, string> = {
  meeting: "Meeting",
  task_deadline: "Task Deadline",
  finance_deadline: "Finance Deadline",
  compliance_deadline: "Compliance",
  reporting_deadline: "Reporting",
  recurring_review: "Review",
  other: "Other",
};

const emptyForm = { title: "", description: "", item_type: "meeting", start_date: "", end_date: "", location: "" };

export default function EPGlobalCalendar() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const from = format(calStart, "yyyy-MM-dd");
  const to = format(calEnd, "yyyy-MM-dd");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/epglobal/calendar", from, to],
    queryFn: () => epgFetch(`/api/epglobal/calendar?from=${from}T00:00:00&to=${to}T23:59:59`),
  });

  const { data: users = [] } = useQuery({ queryKey: ["/api/epglobal/users"], queryFn: () => epgFetch("/api/epglobal/users") });

  const createEvent = useMutation({
    mutationFn: (data: any) => epgFetch("/api/epglobal/calendar", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/calendar"] }); setShowForm(false); setForm(emptyForm); toast({ title: "Calendar item added" }); },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: number) => epgFetch(`/api/epglobal/calendar/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/epglobal/calendar"] }); toast({ title: "Removed" }); },
  });

  const eventsOnDay = (day: Date) => (events as any[]).filter(e => {
    try { return isSameDay(parseISO(e.start_date), day); } catch { return false; }
  });

  const selectedDayEvents = selected ? eventsOnDay(selected) : [];

  return (
    <EPGlobalLayout title="Calendar" subtitle="Meetings, deadlines, and scheduled reviews">
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Calendar Grid */}
        <div className="flex-1">
          {/* Month Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{format(currentMonth, "MMMM yyyy")}</h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 text-xs bg-[#1a3a6b] text-white rounded-lg font-medium">Today</button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
              {days.map(day => {
                const dayEvents = eventsOnDay(day);
                const inMonth = isSameMonth(day, currentMonth);
                const isSel = selected && isSameDay(day, selected);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelected(isSel ? null : day)}
                    className={`bg-white min-h-[70px] p-1.5 cursor-pointer hover:bg-blue-50 transition-colors ${!inMonth ? "opacity-40" : ""} ${isSel ? "ring-2 ring-[#1a3a6b] ring-inset" : ""}`}
                  >
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? "bg-[#1a3a6b] text-white" : "text-gray-700"}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((e: any) => (
                        <div key={e.id} className={`text-white text-xs px-1 py-0.5 rounded truncate ${typeColors[e.item_type] || "bg-gray-400"}`}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-xs text-gray-400">+{dayEvents.length - 2} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Legend</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(typeLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${typeColors[key]}`} />
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:w-80 space-y-4">
          {/* Add Button */}
          <Button onClick={() => { setShowForm(!showForm); }} className="w-full bg-[#1a3a6b] text-white gap-2">
            <Plus className="h-4 w-4" /> Add Calendar Item
          </Button>

          {/* Add Form */}
          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">New Calendar Item</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                  <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Event title" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select value={form.item_type} onChange={e => setForm({...form, item_type: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Start Date & Time *</label>
                  <Input type="datetime-local" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">End Date & Time</label>
                  <Input type="datetime-local" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                  <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Room, Zoom link, etc." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Details..." />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { if (form.title && form.start_date) createEvent.mutate(form); }} disabled={!form.title || !form.start_date} className="flex-1 bg-[#1a3a6b] text-white">Add</Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {/* Selected Day Events */}
          {selected && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">{format(selected, "EEEE, d MMMM")}</h3>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-gray-400">No events on this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((e: any) => (
                    <div key={e.id} className={`border-l-4 ${typeColors[e.item_type]?.replace("bg-", "border-")} pl-3 pr-1`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{e.title}</p>
                          <Badge className={`text-xs mt-0.5 ${typeColors[e.item_type]} text-white`}>{typeLabels[e.item_type]}</Badge>
                          <div className="mt-1 space-y-0.5">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" /> {format(parseISO(e.start_date), "HH:mm")}
                              {e.end_date && ` — ${format(parseISO(e.end_date), "HH:mm")}`}
                            </div>
                            {e.location && <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="h-3 w-3" /> {e.location}</div>}
                            {e.description && <p className="text-xs text-gray-400 italic">{e.description}</p>}
                            {e.owner_name && <p className="text-xs text-gray-400">By {e.owner_name}</p>}
                          </div>
                        </div>
                        <button onClick={() => { if (confirm("Remove this item?")) deleteEvent.mutate(e.id); }} className="text-gray-300 hover:text-red-400 ml-2">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">This Month ({format(currentMonth, "MMM yyyy")})</h3>
            <p className="text-sm text-gray-500">{(events as any[]).length} item{(events as any[]).length !== 1 ? "s" : ""} scheduled</p>
          </div>
        </div>
      </div>
    </EPGlobalLayout>
  );
}
