import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineStep } from "@/components/PipelineStep";
import { apiGet, apiPost, apiPatch, saveResume } from "@/lib/api";
import {
  GitBranch,
  ArrowRight,
  ArrowLeft,
  User,
  Building,
  Loader2,
  Zap,
  Plus,
} from "lucide-react";

interface PipelineEntry {
  id: string;
  eventId: string;
  prospectId: string | null;
  pipelineType: string;
  stage: string;
  movedBy: string;
  notes: string | null;
  prospectName?: string;
  prospectTitle?: string;
  prospectCompany?: string;
  prospectEmail?: string;
}

interface EventRecord {
  id: string;
  name: string;
  status: string;
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchPipeline(eventId: string, type: string): Promise<{ ok: boolean; entries: PipelineEntry[]; counts: Record<string, number>; stages: string[] }> {
  return apiGet(`/api/growth/events/${eventId}/pipeline?type=${type}`);
}

function advanceStage(id: string): Promise<{ ok: boolean; entry: PipelineEntry }> {
  return apiPost(`/api/growth/pipeline/${id}/advance`, {});
}

function moveStage(id: string, stage: string): Promise<{ ok: boolean; entry: PipelineEntry }> {
  return apiPatch(`/api/growth/pipeline/${id}/stage`, { stage });
}

function ProspectCard({ entry, stages, onAdvance, onMove, isPending }: {
  entry: PipelineEntry;
  stages: string[];
  onAdvance: () => void;
  onMove: (stage: string) => void;
  isPending: boolean;
}) {
  const stageIdx = stages.indexOf(entry.stage);
  const canAdvance = stageIdx < stages.length - 1;
  const canRetreat = stageIdx > 0;

  return (
    <div className="border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{entry.prospectName || "Unknown"}</h3>
            <Badge variant="outline" className="text-xs h-5 capitalize">{entry.stage.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {entry.prospectTitle}
            {entry.prospectCompany && ` · ${entry.prospectCompany}`}
          </p>
          {entry.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{entry.notes}</p>}
        </div>
        <div className="flex items-center gap-1">
          {canRetreat && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onMove(stages[stageIdx - 1])} disabled={isPending}>
              <ArrowLeft className="w-3 h-3" />
            </Button>
          )}
          {canAdvance && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onAdvance} disabled={isPending}>
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [activeTab, setActiveTab] = useState<string>("audience");

  // Save resume state
  useEffect(() => {
    if (selectedEvent?.id) {
      saveResume(selectedEvent.id, "pipeline", `Tracking ${activeTab} pipeline`, activeTab);
    }
  }, [selectedEvent?.id, activeTab]);

  const { data: events } = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const { data: pipelineData, refetch } = useQuery({
    queryKey: ["pipeline", selectedEvent?.id, activeTab],
    queryFn: () => (selectedEvent ? fetchPipeline(selectedEvent.id, activeTab) : Promise.resolve({ ok: true, entries: [], counts: {}, stages: [] })),
    enabled: !!selectedEvent,
  });

  const advanceMutation = useMutation({
    mutationFn: (id: string) => advanceStage(id),
    onSuccess: () => refetch(),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => moveStage(id, stage),
    onSuccess: () => refetch(),
  });

  const entries = pipelineData?.entries || [];
  const stages = pipelineData?.stages || [];
  const counts = pipelineData?.counts || {};

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-ink min-h-[140px] flex items-end">
        <img src={`${import.meta.env.BASE_URL}assets/hero-pipeline.png`} alt="Pipeline" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-[28px] font-bold tracking-tight text-ivory font-heading">Pipeline</h1>
          <p className="text-[14px] text-ivory/70 mt-1">Track prospects as they move through stages. Click arrows to advance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  onClick={() => { setSelectedEvent(e); }}
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

          {selectedEvent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {stages.map((s) => (
                  <div key={s} className="flex justify-between capitalize">
                    <span className="text-muted-foreground">{s.replace(/_/g, " ")}</span>
                    <span className="font-medium">{counts[s] || 0}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t font-medium">
                  <span>Total</span>
                  <span>{entries.length}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Pipeline columns */}
        <div className="lg:col-span-2 space-y-4">
          {selectedEvent ? (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="audience" className="gap-1">
                    <User className="w-3 h-3" />
                    Audience
                  </TabsTrigger>
                  <TabsTrigger value="sponsor" className="gap-1">
                    <Building className="w-3 h-3" />
                    Sponsor
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {stages.map((stage) => {
                  const stageEntries = entries.filter((e) => e.stage === stage);
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-ivory/70 capitalize">
                          {stage.replace(/_/g, " ")}
                        </h3>
                        <Badge variant="secondary" className="text-xs h-5">{stageEntries.length}</Badge>
                      </div>
                      <div className="space-y-2 min-h-[100px]">
                        {stageEntries.map((entry) => (
                          <ProspectCard
                            key={entry.id}
                            entry={entry}
                            stages={stages}
                            onAdvance={() => advanceMutation.mutate(entry.id)}
                            onMove={(stage) => moveMutation.mutate({ id: entry.id, stage })}
                            isPending={
                              (advanceMutation.isPending && advanceMutation.variables === entry.id) ||
                              (moveMutation.isPending && moveMutation.variables?.id === entry.id)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-ivory/70">
              <img src={`${import.meta.env.BASE_URL}assets/empty-data.png`} alt="Select event" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
              <p>Select an event to view the pipeline.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="pipeline" />
    </div>
  );
}
