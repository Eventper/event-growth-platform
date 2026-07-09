import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEventContext } from "@/contexts/EventContext";
import { PipelineStep } from "@/components/PipelineStep";
import { apiGet, apiPost, saveResume } from "@/lib/api";
import {
  Brain,
  Loader2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Mail,
  Users,
  Target,
  Clock,
  Sparkles,
  Check,
  AlertTriangle,
} from "lucide-react";

interface EventRecord {
  id: string;
  name: string;
  status: string;
  strategyPack?: any;
}

interface LearningInsight {
  id: string;
  insightType: string;
  insight: string;
  evidence: any;
  confidence: number;
  applied: boolean;
  createdAt: string;
}

interface Stats {
  total_messages: number;
  sent: number;
  approved: number;
  pending: number;
  positive_replies: number;
  not_now_replies: number;
  unsubscribes: number;
  total_replies: number;
  total_prospects: number;
  approved_prospects: number;
  pipeline_entries: number;
  avg_score: number;
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchInsights(eventId: string): Promise<{ ok: boolean; insights: LearningInsight[] }> {
  return apiGet(`/api/growth/learning?eventId=${eventId}`);
}

function generateInsights(eventId: string): Promise<{ ok: boolean; insights: LearningInsight[]; stats: Stats }> {
  return apiPost(`/api/growth/learning/${eventId}`, {});
}

const TYPE_LABELS: Record<string, string> = {
  message_pattern: "Message Pattern",
  channel_performance: "Channel Performance",
  persona_fit: "Persona Fit",
  timing: "Timing",
  sector: "Sector",
  overall: "Overall",
};

const TYPE_COLORS: Record<string, string> = {
  message_pattern: "bg-[#4A8BAE]/10 text-[#4A8BAE]",
  channel_performance: "bg-[#8A6B4A]/10 text-[#8A6B4A]",
  persona_fit: "bg-[#7B6B5D]/10 text-[#1A1714]",
  timing: "bg-[#6E2433]/10 text-[#6E2433]",
  sector: "bg-[#C74A4A]/10 text-[#C74A4A]",
  overall: "bg-[#4A9E6A]/10 text-[#4A9E6A]",
};

const TYPE_ICONS: Record<string, any> = {
  message_pattern: MessageSquare,
  channel_performance: Mail,
  persona_fit: Users,
  timing: Clock,
  sector: Target,
  overall: Brain,
};

function InsightCard({ insight }: { insight: LearningInsight }) {
  const Icon = TYPE_ICONS[insight.insightType] || Brain;
  const confidence = insight.confidence || 0;
  const confidenceColor = confidence >= 80 ? "text-[#4A9E6A]" : confidence >= 60 ? "text-[#6E2433]" : "text-[#C74A4A]";

  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#1A1714]/5 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#1A1714]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-[10px] h-5 border-0 ${TYPE_COLORS[insight.insightType] || "bg-[#1A1714]/5 text-[#1A1714]"}`}>
              {TYPE_LABELS[insight.insightType] || insight.insightType}
            </Badge>
            <span className={`text-[11px] font-medium ${confidenceColor}`}>
              {confidence}% confidence
            </span>
            {insight.applied && (
              <Badge className="text-[10px] h-5 border-0 bg-[#4A9E6A]/10 text-[#4A9E6A]">
                <Check className="w-3 h-3 mr-1" />
                Applied
              </Badge>
            )}
          </div>
          <p className="text-[13px] text-[#1A1714] font-medium leading-relaxed">{insight.insight}</p>
          {insight.evidence && Array.isArray(insight.evidence) && insight.evidence.length > 0 && (
            <div className="mt-2 space-y-1">
              {insight.evidence.map((e: string, i: number) => (
                <p key={i} className="text-[11px] text-[#1A1714]">• {e}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, icon: Icon }: { label: string; value: number | string; trend?: string; icon: any }) {
  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3 h-3 text-[#6E2433]" />
        <span className="text-[11px] text-[#1A1714] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[20px] font-bold text-[#1A1714]">{value}</p>
      {trend && <p className="text-[10px] text-[#1A1714]">{trend}</p>}
    </div>
  );
}

export default function LearningEngine() {
  const { selectedEventId, setSelectedEventId } = useEventContext();
  const [stats, setStats] = useState<Stats | null>(null);

  // Save resume state
  useEffect(() => {
    if (selectedEventId) {
      saveResume(selectedEventId, "learning-engine", "Viewing campaign insights", null);
    }
  }, [selectedEventId]);

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const { data: insightsData, refetch: refetchInsights } = useQuery({
    queryKey: ["learning", selectedEventId],
    queryFn: () => (selectedEventId ? fetchInsights(selectedEventId) : Promise.resolve({ ok: true, insights: [] })),
    enabled: !!selectedEventId,
  });

  const generateMutation = useMutation({
    mutationFn: (eventId: string) => generateInsights(eventId),
    onSuccess: (data) => {
      setStats(data.stats);
      refetchInsights();
    },
  });

  const selectedEvent = events?.find((e: EventRecord) => e.id === selectedEventId);
  const insights = insightsData?.insights || [];

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-ink min-h-[140px] flex items-end">
        <img
          src={`${import.meta.env.BASE_URL}assets/hero-intelligence.png`}
          alt="Learning Engine"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-[28px] font-bold tracking-tight text-ivory font-heading">Learning Engine</h1>
          <p className="text-[14px] text-ivory/70 mt-1">Auto-learn from every campaign and apply to future events.</p>
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
                  onClick={() => {
                    setSelectedEventId(e.id);
                    setStats(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedEventId === e.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{e.name}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedEvent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">ANALYSE</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => generateMutation.mutate(selectedEvent.id)}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Brain className="w-4 h-4 mr-2" />
                  )}
                  Generate Insights
                </Button>
                <p className="text-[11px] text-[#1A1714] mt-2 text-center">
                  Analyses outreach, replies, pipeline, and scores
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Insights and Stats */}
        <div className="lg:col-span-2 space-y-4">
          {selectedEvent ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ivory">{selectedEvent.name}</h2>
                  <p className="text-[12px] text-ivory/70">{insights.length} insights generated</p>
                </div>
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <StatCard label="Messages" value={stats.total_messages} icon={MessageSquare} />
                  <StatCard label="Sent" value={stats.sent} icon={Mail} />
                  <StatCard label="Replies" value={stats.total_replies} icon={TrendingUp} />
                  <StatCard label="Positive" value={stats.positive_replies} icon={TrendingUp} />
                  <StatCard label="Prospects" value={stats.total_prospects} icon={Users} />
                  <StatCard label="Approved" value={stats.approved_prospects} icon={Target} />
                  <StatCard label="Pipeline" value={stats.pipeline_entries} icon={Sparkles} />
                  <StatCard label="Avg Score" value={stats.avg_score} icon={Brain} />
                </div>
              )}

              {/* Insights */}
              {insights.length === 0 ? (
                <div className="text-center py-12 text-ivory/70">
                  <Brain className="w-12 h-12 mx-auto mb-3 text-champagne/50" />
                  <p className="text-ivory">No learning insights yet.</p>
                  <p className="text-[12px] text-ivory/60 mt-1">
                    Click "Generate Insights" to analyse this event's campaign data.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-ivory/70">
              <Brain className="w-12 h-12 mx-auto mb-3 text-champagne/50" />
              <p className="text-ivory">Select an event to analyse.</p>
              <p className="text-[12px] text-ivory/60 mt-1">
                The Learning Engine analyses outreach, replies, pipeline, and scores.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="learning" />
    </div>
  );
}
