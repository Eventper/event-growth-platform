import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  User,
  MapPin,
  Clock,
  Circle,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

type BoothBooking = {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  venue: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  duration: string | null;
  service: string | null;
  packageName: string | null;
  status: string;
  totalDue: string | null;
  depositDue: string | null;
  balanceDue: string | null;
  agreementAccepted: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  new_enquiry: "bg-blue-50 text-blue-600 border-blue-200",
  quote_sent: "bg-yellow-50 text-yellow-700 border-yellow-200",
  awaiting_deposit: "bg-amber-50 text-amber-700 border-amber-200",
  deposit_paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  confirmed: "bg-green-50 text-green-700 border-green-200",
  completed: "bg-slate-50 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  new_enquiry: "New Enquiry",
  quote_sent: "Quote Sent",
  awaiting_deposit: "Awaiting Deposit",
  deposit_paid: "Deposit Paid",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function AdminBoothCalendar() {
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "list">("month");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/booth-bookings"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/booth-bookings", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load bookings");
      return res.json() as Promise<BoothBooking[]>;
    },
  });

  const parsedBookings = useMemo(() => {
    return bookings.map((b) => {
      const dateStr = b.eventDate;
      let parsed: Date | null = null;
      if (dateStr) {
        const match = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
        if (match) {
          const [, day, monthName, year] = match;
          const monthIndex = [
            "January","February","March","April","May","June",
            "July","August","September","October","November","December",
          ].indexOf(monthName);
          if (monthIndex !== -1) {
            parsed = new Date(parseInt(year), monthIndex, parseInt(day));
          }
        }
      }
      return { ...b, parsedDate: parsed };
    });
  }, [bookings]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("en-GB", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [year, month, startOffset, daysInMonth]);

  const bookingsForDay = (day: Date) => {
    return parsedBookings.filter(
      (b) =>
        b.parsedDate &&
        b.parsedDate.getDate() === day.getDate() &&
        b.parsedDate.getMonth() === day.getMonth() &&
        b.parsedDate.getFullYear() === day.getFullYear()
    );
  };

  const today = new Date();

  return (
    <PlannerLayout>
    <div className="min-h-screen bg-[#f8f5f6]">
      <header className="bg-[#330311] text-white py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Photo Booth Calendar</h1>
            <p className="text-white/70 text-sm mt-1">View bookings by event date</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView(view === "month" ? "list" : "month")}
              className="text-white hover:bg-white/10"
            >
              {view === "month" ? <List className="w-4 h-4 mr-1" /> : <CalendarIcon className="w-4 h-4 mr-1" />}
              {view === "month" ? "List View" : "Calendar View"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/booth-bookings")}
              className="text-white hover:bg-white/10"
            >
              <List className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#330311]" />
          </div>
        ) : view === "month" ? (
          <>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="border-gray-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold text-[#330311]">{monthName}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="border-gray-300"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day)
                  return <div key={`empty-${i}`} className="h-28 bg-gray-50/50 rounded-lg" />;

                const dayBookings = bookingsForDay(day);
                const isToday =
                  day.getDate() === today.getDate() &&
                  day.getMonth() === today.getMonth() &&
                  day.getFullYear() === today.getFullYear();

                return (
                  <motion.div
                    key={day.toISOString()}
                    className={`h-28 bg-white rounded-lg border p-1 overflow-hidden ${
                      isToday ? "border-[#330311] ring-1 ring-[#330311]/20" : "border-gray-200"
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex justify-between items-center px-1">
                      <span
                        className={`text-sm font-medium ${
                          isToday ? "text-[#330311]" : "text-gray-700"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="text-[10px] bg-[#330311] text-white px-1.5 py-0.5 rounded-full">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayBookings.slice(0, 2).map((b) => (
                        <button
                          key={b.id}
                          onClick={() => window.open(`https://eventperfekt.net/booking-confirmation/${b.token}`, "_blank")}
                          className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate ${
                            STATUS_COLORS[b.status] || "bg-gray-100 text-gray-600"
                          }`}
                          title={`${b.clientName} — ${STATUS_LABELS[b.status] || b.status}`}
                        >
                          {b.clientName}
                        </button>
                      ))}
                      {dayBookings.length > 2 && (
                        <p className="text-[10px] text-gray-400 px-1">
                          +{dayBookings.length - 2} more
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          /* List View */
          <div className="space-y-3">
            <AnimatePresence>
              {parsedBookings
                .filter((b) => b.parsedDate)
                .sort((a, b) => (a.parsedDate!.getTime() - b.parsedDate!.getTime()))
                .map((b) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-shrink-0 w-14 h-14 bg-[#330311] rounded-lg flex flex-col items-center justify-center text-white">
                          <span className="text-xs font-medium">
                            {b.parsedDate!.toLocaleString("en-GB", { month: "short" })}
                          </span>
                          <span className="text-lg font-bold">{b.parsedDate!.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-[#330311]">{b.clientName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[b.status] || "bg-gray-100"}`}>
                              {STATUS_LABELS[b.status] || b.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                            {b.eventStartTime && b.eventEndTime && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {b.eventStartTime} – {b.eventEndTime}
                              </span>
                            )}
                            {b.venue && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {b.venue}
                              </span>
                            )}
                            {b.duration && <span>{b.duration}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://eventperfekt.net/booking-confirmation/${b.token}`, "_blank")}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/booth-bookings`)}
                          >
                            Manage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
            </AnimatePresence>
            {parsedBookings.filter((b) => b.parsedDate).length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No bookings with dates found.</p>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-2">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <span key={key} className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[key] || ""}`}>
              {label}
            </span>
          ))}
        </div>
      </main>
    </div>
    </PlannerLayout>
  );
}
