import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import PlannerLayout from "@/components/PlannerLayout";
import { BarChart3, TrendingUp, CheckCircle, Star, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const C = {
  bg: "#0a0008",
  panel: "#1a0015",
  border: "#3a1030",
  gold: "#d4a843",
  burgundy: "#8B1538",
  text: "#e8e0e4",
  muted: "#8a7080",
};

const STATUS_COLORS: Record<string, string> = {
  post_event: "#8b5cf6",
  closed: "#22c55e",
  event_day: "#3b82f6",
  in_planning: "#f59e0b",
  assigned: C.muted,
};

export default function PostEventHub() {
  const [, setLocation] = useLocation();

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const postEventEvents = events.filter((e: any) =>
    ["post_event", "closed", "event_day"].includes(e.workflowStatus || e.status)
  );

  const recentEvents = events.slice(0, 12);
  const displayEvents = postEventEvents.length > 0 ? postEventEvents : recentEvents;

  return (
    <PlannerLayout>
      <div className="min-h-screen bg-[#f7f2f4]">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-[#330311] via-[#5a0e23] to-[#8B1538] p-6 md:p-8 text-white shadow-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Post-Event Hub</p>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <TrendingUp size={28} />
                  Post-Event Analytics
                </h1>
                <p className="max-w-2xl text-sm text-white/75">
                  Select an event to view its post-event report, NPS scores, survey responses, and feedback summary.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setLocation("/planner-dashboard")}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {[
              { Icon: BarChart3, label: "Attendance & Budget Analytics" },
              { Icon: Star, label: "NPS & Guest Ratings" },
              { Icon: CheckCircle, label: "Survey Dispatch & CSV Export" },
            ].map(({ Icon, label }) => (
              <Card key={label} className="border-[#e8d8df] shadow-sm">
                <CardContent className="flex items-center gap-2 px-4 py-2">
                  <Icon size={14} style={{ color: C.gold }} />
                  <span className="text-xs text-[#6b5560]">{label}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {postEventEvents.length > 0 && (
            <div style={{ marginBottom: 8, color: C.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Post-event & closed events ({postEventEvents.length})
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>Loading events…</div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
              <BarChart3 size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p>No events found. Create your first event to start tracking post-event analytics.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {displayEvents.map((event: any) => {
                const status = event.workflowStatus || event.status;
                const statusColor = STATUS_COLORS[status] || C.muted;
                const eventDate = event.startDate ? new Date(event.startDate) : null;
                return (
                  <Card
                    key={event.id}
                    className="cursor-pointer border-[#e8d8df] shadow-md transition-all hover:border-[#8B1538] hover:shadow-lg"
                    onClick={() => setLocation(`/events/${event.id}/post-event`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span style={{ background: statusColor + "22", color: statusColor, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                          {status?.replace(/_/g, " ").toUpperCase()}
                        </span>
                        {event.type && <span style={{ color: C.muted, fontSize: 11 }}>{event.type}</span>}
                      </div>
                      <div className="font-semibold text-[#330311] mb-1 line-clamp-1">{event.name}</div>
                      <div className="flex items-center gap-2 text-xs text-[#7b6670] mb-4">
                        <Calendar size={12} />
                        {eventDate ? eventDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date not set"}
                      </div>
                      <div className="rounded-lg bg-[#8B1538] px-4 py-2 text-center text-sm font-semibold text-white">
                        View Post-Event Analytics <ArrowRight className="ml-1 inline h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {postEventEvents.length === 0 && events.length > 0 && (
            <div style={{ marginTop: 16, color: C.muted, fontSize: 12, textAlign: "center" }}>
              Showing all recent events. Events with "Post-Event" or "Closed" status will appear here automatically.
            </div>
          )}
        </div>
      </div>
    </PlannerLayout>
  );
}
