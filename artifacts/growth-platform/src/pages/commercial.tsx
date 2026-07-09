import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventContext } from "@/contexts/EventContext";
import { apiGet, saveResume } from "@/lib/api";
import {
  BarChart3, Users, Crown, MessageSquare, TrendingUp, DollarSign,
  Target, Loader2,
} from "lucide-react";

interface EventRecord {
  id: string;
  name: string;
  status: string;
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchCommercial(eventId: string) {
  return apiGet<{ ok: boolean; guests: any; sponsors: any; pr: any; referrals: number; corporateTargets: number; eventName: string }>(`/api/growth/commercial/${eventId}`);
}

export default function Commercial() {
  const { selectedEventId } = useEventContext();
  const { data: events } = useQuery({ queryKey: ["growth-events"], queryFn: fetchEvents });
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const { data: commercial, isLoading } = useQuery({
    queryKey: ["commercial", selectedEvent?.id],
    queryFn: () => selectedEvent ? fetchCommercial(selectedEvent.id) : Promise.resolve(null),
    enabled: !!selectedEvent,
  });

  useEffect(() => {
    if (selectedEvent) {
      saveResume(selectedEvent.id, "commercial", "Review commercial dashboard", "overview");
    }
  }, [selectedEvent]);

  const c = commercial || null;

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-ink min-h-[140px] flex items-end">
        <img src={`${import.meta.env.BASE_URL}assets/hero-dashboard.png`} alt="Commercial" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-[28px] font-bold tracking-tight text-ivory font-heading">Commercial</h1>
          <p className="text-[14px] text-ivory/70 mt-1">Live revenue, sponsorship, and media coverage tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">SELECT EVENT</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {events?.map((e: EventRecord) => (
                <button key={e.id} onClick={() => setSelectedEvent(e)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedEvent?.id === e.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                  {e.name}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading commercial data...
            </div>
          )}

          {c && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Guest Prospects" value={c.guests?.prospects ?? 0} accent />
                <StatCard icon={Target} label="Applications" value={c.guests?.applications ?? 0} />
                <StatCard icon={DollarSign} label="Tickets Sold" value={c.guests?.approved ?? 0} />
                <StatCard icon={TrendingUp} label="Guest Revenue" value={`£${c.guests?.revenue?.toLocaleString() ?? 0}`} accent />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Crown} label="Sponsor Prospects" value={c.sponsors?.prospects ?? 0} accent />
                <StatCard icon={Users} label="Meetings Booked" value={c.sponsors?.meetings ?? 0} />
                <StatCard icon={MessageSquare} label="Proposals Sent" value={c.sponsors?.proposals ?? 0} />
                <StatCard icon={TrendingUp} label="PR Coverage" value={c.pr?.coverage ?? 0} accent />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={MessageSquare} label="PR Opportunities" value={c.pr?.opportunities ?? 0} />
                <StatCard icon={BarChart3} label="Pitches Sent" value={c.pr?.sent ?? 0} />
                <StatCard icon={Users} label="Referrals" value={c.referrals ?? 0} />
                <StatCard icon={Target} label="Corporate Targets" value={c.corporateTargets ?? 0} />
              </div>

              <Tabs defaultValue="guests" className="w-full">
                <TabsList className="bg-muted">
                  <TabsTrigger value="guests">Guests</TabsTrigger>
                  <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
                  <TabsTrigger value="pr">PR</TabsTrigger>
                </TabsList>
                <TabsContent value="guests" className="space-y-3">
                  <ProgressCard label="Guest pipeline" current={c.guests?.approved ?? 0} target={60} sub={`${c.guests?.prospects ?? 0} prospects discovered`} />
                </TabsContent>
                <TabsContent value="sponsors" className="space-y-3">
                  <ProgressCard label="Sponsor pipeline" current={c.sponsors?.meetings ?? 0} target={10} sub={`${c.sponsors?.prospects ?? 0} prospects discovered`} />
                </TabsContent>
                <TabsContent value="pr" className="space-y-3">
                  <ProgressCard label="PR pipeline" current={c.pr?.coverage ?? 0} target={5} sub={`${c.pr?.opportunities ?? 0} opportunities found`} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: boolean }) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${accent ? "bg-gold/10 text-gold" : "bg-surface text-warm"}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressCard({ label, current, target, sub }: { label: string; current: number; target: number; sub?: string }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant="outline">{current} / {target}</Badge>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
      </CardContent>
    </Card>
  );
}
