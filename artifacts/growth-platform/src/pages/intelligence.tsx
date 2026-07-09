import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineStep } from "@/components/PipelineStep";
import { PageHeader } from "@/components/PageHeader";
import { apiGet, apiPost, saveResume } from "@/lib/api";
import {
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  Bot,
  Shield,
  ArrowRight,
  Zap,
  Mail,
  Activity,
  Globe,
} from "lucide-react";

interface IntelligenceData {
  ok: boolean;
  pipeline: {
    audience: { stages: string[]; counts: Record<string, number>; total: number };
    sponsor: { stages: string[]; counts: Record<string, number>; total: number };
  };
  target: { paid: number; target: number; breakEven: number; progress_pct: number };
  inbound: { total: number; human: number; bots: number; recent: any[] };
  spend: { total: number; operations: number };
  prospects: { total: number };
}

interface EventRecord {
  id: string;
  name: string;
  status: string;
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchIntelligence(eventId: string): Promise<IntelligenceData> {
  return apiGet(`/api/growth/events/${eventId}/intelligence`);
}

function PipelineFunnel({ stages, counts, total, color }: { stages: string[]; counts: Record<string, number>; total: number; color: string }) {
  return (
    <div className="space-y-2">
      {stages.map((stage) => {
        const count = counts[stage] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={stage} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="capitalize text-muted-foreground">{stage.replace(/_/g, " ")}</span>
              <span className="font-medium">{count}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InboundFeed({ recent, total, human, bots }: { recent: any[]; total: number; human: number; bots: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <Badge variant="default">Human: {human}</Badge>
        <Badge variant="destructive">Bots: {bots}</Badge>
        <Badge variant="outline">Total: {total}</Badge>
      </div>
      <div className="space-y-2">
        {recent.map((lead: any) => (
          <div key={lead.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{lead.name || lead.email || "Unknown"}</span>
              <Badge variant="outline" className="text-xs h-5 capitalize">{lead.leadType?.replace(/_/g, " ")}</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
              {lead.isBot && <Bot className="w-3 h-3 text-destructive" />}
            </div>
          </div>
        ))}
        {recent.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No inbound leads yet.</p>
        )}
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Save resume state
  useEffect(() => {
    if (selectedEvent?.id) {
      saveResume(selectedEvent.id, "intelligence", `Viewing ${activeTab}`, activeTab);
    }
  }, [selectedEvent?.id, activeTab]);

  const { data: events } = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const { data: intel } = useQuery({
    queryKey: ["intelligence", selectedEvent?.id],
    queryFn: () => (selectedEvent ? fetchIntelligence(selectedEvent.id) : Promise.resolve({ ok: true } as IntelligenceData)),
    enabled: !!selectedEvent,
    refetchInterval: 30000, // refresh every 30s
  });

  const target = intel?.target;
  const pipeline = intel?.pipeline;
  const inbound = intel?.inbound;
  const spend = intel?.spend;
  const prospects = intel?.prospects;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intelligence"
        intro="Real-time pipeline, targets, inbound, and spend — bot-excluded."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Event selector */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SELECT EVENT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events?.map((e: EventRecord) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEvent(e)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedEvent?.id === e.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{e.name}</span>
                    <Badge variant="outline" className="text-xs h-5 ml-2">{e.status}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Dashboard */}
        <div className="lg:col-span-3 space-y-4">
          {selectedEvent && intel?.ok ? (
            <>
              {/* Target progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Target Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Paid guests</span>
                    <span className="font-bold text-lg">
                      {target?.paid ?? 0} <span className="text-muted-foreground font-normal text-sm">/ {target?.target ?? 0}</span>
                    </span>
                  </div>
                  <Progress value={target?.progress_pct ?? 0} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Break-even: {target?.breakEven ?? 0}
                    </span>
                    <span>{target?.target ?? 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-xs uppercase">Prospects</span>
                    </div>
                    <p className="text-2xl font-bold">{prospects?.total ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      <span className="text-xs uppercase">Pipeline</span>
                    </div>
                    <p className="text-2xl font-bold">{(pipeline?.audience?.total ?? 0) + (pipeline?.sponsor?.total ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span className="text-xs uppercase">Human Inbound</span>
                    </div>
                    <p className="text-2xl font-bold">{inbound?.human ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs uppercase">Compute Spend</span>
                    </div>
                    <p className="text-2xl font-bold">£{((spend?.total ?? 0) * 0.8).toFixed(3)}</p>
                    <p className="text-xs text-muted-foreground">${(spend?.total ?? 0).toFixed(4)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
                  <TabsTrigger value="inbound">Inbound</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Audience Funnel</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PipelineFunnel stages={pipeline?.audience.stages || []} counts={pipeline?.audience.counts || {}} total={pipeline?.audience.total || 0} color="bg-blue-500" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Sponsor Funnel</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PipelineFunnel stages={pipeline?.sponsor.stages || []} counts={pipeline?.sponsor.counts || {}} total={pipeline?.sponsor.total || 0} color="bg-amber-500" />
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Recent Inbound</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <InboundFeed recent={inbound?.recent || []} total={inbound?.total ?? 0} human={inbound?.human ?? 0} bots={inbound?.bots ?? 0} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pipelines" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Audience Pipeline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PipelineFunnel stages={pipeline?.audience.stages || []} counts={pipeline?.audience.counts || {}} total={pipeline?.audience.total || 0} color="bg-blue-500" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Sponsor Pipeline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PipelineFunnel stages={pipeline?.sponsor.stages || []} counts={pipeline?.sponsor.counts || {}} total={pipeline?.sponsor.total || 0} color="bg-amber-500" />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="inbound" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Inbound Feed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <InboundFeed recent={inbound?.recent || []} total={inbound?.total ?? 0} human={inbound?.human ?? 0} bots={inbound?.bots ?? 0} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-12 text-ivory/70">
              <img src={`${import.meta.env.BASE_URL}assets/empty-data.png`} alt="Select event" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
              <p>Select an event to view intelligence.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="intelligence" />
    </div>
  );
}
