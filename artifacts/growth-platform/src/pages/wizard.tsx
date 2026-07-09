import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PipelineStep } from "@/components/PipelineStep";
import { PageHeader } from "@/components/PageHeader";
import ChallengeBanner from "@/components/ChallengeBanner";
import { apiGet, apiPost, saveResume } from "@/lib/api";

import {
  Send,
  Loader2,
  Sparkles,
  Search,
  CheckCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  User,
  Building,
  MessageSquare,
  PoundSterling,
  Lightbulb,
  TrendingUp,
  Globe,
  Plus,
  ArrowRight,
  Save,
  X,
  AlertTriangle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface EventRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  strategyPack: any | null;
  ownerId?: string | null;
}

interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
}

interface InterviewResult {
  interview_complete?: boolean;
  next_question?: string;
  raw_response?: boolean;
  event_name?: string;
  event_type?: string;
  location?: string;
  target_audience?: string;
  estimated_capacity?: number;
  goals?: string[];
  budget_range?: string;
  known_sponsors?: string[];
  timeline?: string;
  content_themes?: string[];
  pricing_estimate?: string;
  positioning_tier?: string;
  ticket_price?: string;
  venue_type?: string;
  format?: string;
  [key: string]: any;
}

interface MarketScanResult {
  demand_score?: number;
  competitor_events?: Array<any>;
  audience_pain_points?: string[];
  relevant_industries?: string[];
  candidate_sponsor_types?: Array<any>;
  trending_themes?: string[];
  pricing_benchmarks?: Array<any>;
  opportunity_score?: number;
  market_opportunity_note?: string;
  raw_response?: string;
  parse_error?: boolean;
}

interface StrategyPack {
  audience_personas?: Array<any>;
  sponsor_personas?: Array<any>;
  messaging_recommendations?: any;
  pricing_recommendations?: any;
  content_themes?: Array<any>;
  market_opportunity_score?: number;
  positioning_tier?: string;
  juno_placeholder?: string;
}

// ── Helpers ────────────────────────────────────────────────────
function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function createEvent(body: any): Promise<EventRecord> {
  return apiPost("/api/growth/events", body);
}

function callInterview(body: {
  messages?: InterviewMessage[];
  eventId?: string;
  goal?: string;
  ownerId?: string | null;
}): Promise<{ ok: boolean; result: InterviewResult; cost: number; model: string }> {
  return apiPost("/api/growth/wizard/interview", body);
}

function callMarketScan(body: {
  eventType: string;
  location: string;
  audience: string;
  capacity?: number;
  positioningTier?: string;
}): Promise<{ ok: boolean; result: MarketScanResult; cost: number }> {
  return apiPost("/api/growth/wizard/market-scan", body);
}

function generateStrategy(body: {
  interviewData: InterviewResult;
  marketScan: MarketScanResult;
}): Promise<{ ok: boolean; result: StrategyPack; cost: number }> {
  return apiPost(`/api/growth/events/${body.interviewData.event_id || "temp"}/generate-strategy`, {
    interviewData: body.interviewData,
    marketScan: body.marketScan,
  });
}

function saveStrategyPack(eventId: string, pack: StrategyPack, approved: boolean, ownerId?: string | null): Promise<any> {
  return apiPost(`/api/growth/events/${eventId}/strategy-pack`, { strategyPack: pack, approved, ownerId });
}

// ── Sub-components ───────────────────────────────────────────────
function EventSelector({
  events,
  selected,
  onSelect,
  onCreate,
}: {
  events: EventRecord[];
  selected: EventRecord | null;
  onSelect: (e: EventRecord) => void;
  onCreate: (name: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Select Event
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 mr-1" />}
          {showForm ? "Cancel" : "New"}
        </Button>
      </div>

      {showForm && (
        <div className="flex gap-2">
          <Input
            placeholder="Event name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                onCreate(newName.trim());
                setNewName("");
                setShowForm(false);
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => {
              if (newName.trim()) {
                onCreate(newName.trim());
                setNewName("");
                setShowForm(false);
              }
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {events.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(e)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
              selected?.id === e.id
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <span className="truncate">{e.name}</span>
            <Badge variant="outline" className="text-xs">
              {e.status}
            </Badge>
          </button>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground px-3 py-2">
            No events yet. Create one above.
          </p>
        )}
      </div>
    </div>
  );
}

function InterviewChat({
  messages,
  onSend,
  isLoading,
}: {
  messages: InterviewMessage[];
  onSend: (text: string) => void;
  isLoading: boolean;
}) {
  const [input, setInput] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-burgundy" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Interview
        </h2>
      </div>

      <div className="border rounded-md p-3 space-y-3 min-h-[120px] max-h-[320px] overflow-y-auto bg-muted/30">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Enter your goal above to start the interview.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Type your answer..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading && input.trim()) {
              onSend(input.trim());
              setInput("");
            }
          }}
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={() => {
            if (!isLoading && input.trim()) {
              onSend(input.trim());
              setInput("");
            }
          }}
          disabled={isLoading || !input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function StrategyPackView({
  pack,
  event,
  onApprove,
  onReject,
  isSaving,
}: {
  pack: StrategyPack;
  event: EventRecord | null;
  onApprove: () => void;
  onReject: () => void;
  isSaving: boolean;
}) {
  const [openSection, setOpenSection] = useState<string | null>("audience");

  const sections = [
    {
      key: "tier",
      label: "Positioning Tier",
      icon: Sparkles,
      content: pack.positioning_tier ? [{ tier: pack.positioning_tier }] : [],
      render: (t: any) => (
        <div className="space-y-2 text-sm">
          <Badge variant={t.tier === "premium" ? "default" : "secondary"} className="capitalize">
            {t.tier}
          </Badge>
          <p className="text-muted-foreground">
            {t.tier === "premium" && "Premium positioning: small, curated audience, elevated language, luxury venue, status and access as value."}
            {t.tier === "mid-market" && "Mid-market positioning: moderate price, targeted audience, value-led language."}
            {t.tier === "mass-market" && "Mass-market positioning: high volume, low price, broad audience, urgency/scarcity language."}
          </p>
        </div>
      ),
    },
    {
      key: "audience",
      label: "Audience Personas",
      icon: User,
      content: pack.audience_personas,
      render: (p: any) => (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{p.name}</p>
          <div className="flex flex-wrap gap-1">
            {p.job_titles?.map((t: string) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
          <p className="text-muted-foreground">
            <span className="font-medium">Sectors:</span> {p.sectors?.join(", ")}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Locations:</span> {p.locations?.join(", ")}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Company size:</span> {p.company_size}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Why attend:</span> {p.why_attend}
          </p>
        </div>
      ),
    },
    {
      key: "sponsors",
      label: "Sponsor Personas",
      icon: Building,
      content: pack.sponsor_personas,
      render: (p: any) => (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{p.type}</p>
          <div className="flex flex-wrap gap-1">
            {p.job_titles?.map((t: string) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
          <p className="text-muted-foreground">
            <span className="font-medium">Sectors:</span> {p.sectors?.join(", ")}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Locations:</span> {p.locations?.join(", ")}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Why sponsor:</span> {p.why_sponsor}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Budget:</span> {p.budget_expectation}
          </p>
        </div>
      ),
    },
    {
      key: "messaging",
      label: "Messaging",
      icon: MessageSquare,
      content: pack.messaging_recommendations ? [pack.messaging_recommendations] : [],
      render: (m: any) => (
        <div className="space-y-2 text-sm">
          <p className="font-medium text-lg">{m.tagline}</p>
          <p className="text-muted-foreground">{m.tone}</p>
          <ul className="space-y-1">
            {m.key_messages?.map((msg: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 mt-1 text-primary" />
                {msg}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      key: "pricing",
      label: "Pricing",
      icon: PoundSterling,
      content: pack.pricing_recommendations ? [pack.pricing_recommendations] : [],
      render: (p: any) => (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ticket price</span>
            <span className="font-medium">{p.ticket_price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sponsor Tier 1</span>
            <span className="font-medium">{p.sponsor_tier_1}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sponsor Tier 2</span>
            <span className="font-medium">{p.sponsor_tier_2}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sponsor Tier 3</span>
            <span className="font-medium">{p.sponsor_tier_3}</span>
          </div>
          <p className="text-muted-foreground text-xs mt-1">{p.notes}</p>
        </div>
      ),
    },
    {
      key: "content",
      label: "Content Themes",
      icon: Lightbulb,
      content: pack.content_themes,
      render: (t: any) => (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{t.theme}</p>
          <p className="text-muted-foreground">{t.rationale}</p>
        </div>
      ),
    },
    {
      key: "juno",
      label: "Juno Insights",
      icon: Globe,
      content: pack.juno_placeholder ? [{ text: pack.juno_placeholder }] : [],
      render: (j: any) => (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {j.text}
          </p>
          <p className="text-xs text-muted-foreground">
            Human insight not yet added. Paste Juno findings here or import later.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Strategy Pack
          </h2>
        </div>
        {pack.market_opportunity_score && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">
              Opportunity Score: {pack.market_opportunity_score}/10
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {sections.map((s) => {
          const isOpen = openSection === s.key;
          if (!s.content || s.content.length === 0) return null;
          return (
            <div key={s.key} className="border rounded-md overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium bg-muted/50 hover:bg-muted transition-colors"
                onClick={() => setOpenSection(isOpen ? null : s.key)}
              >
                <div className="flex items-center gap-2">
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                  {s.label}
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {isOpen && (
                <div className="p-3 space-y-4">
                  {s.content.map((item: any, i: number) => (
                    <div key={i}>{s.render(item)}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={onApprove}
          disabled={isSaving || !event}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Approve & Save
        </Button>
        <Button variant="outline" onClick={onReject} disabled={isSaving}>
          <X className="w-4 h-4 mr-2" />
          Reject
        </Button>
      </div>
    </div>
  );
}

function MarketScanView({
  result,
}: {
  result: MarketScanResult | null;
}) {
  if (!result) return null;
  if (result.parse_error) {
    return (
      <div className="border rounded-md p-3 bg-destructive/10 text-sm text-destructive">
        Market scan returned raw data that could not be parsed.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Market Scan
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="border rounded-md p-3 text-center">
          <p className="text-2xl font-bold">{result.demand_score ?? "?"}</p>
          <p className="text-xs text-muted-foreground">Demand Score</p>
        </div>
        <div className="border rounded-md p-3 text-center">
          <p className="text-2xl font-bold">{result.opportunity_score ?? "?"}</p>
          <p className="text-xs text-muted-foreground">Opportunity</p>
        </div>
      </div>

      {result.market_opportunity_note && (
        <p className="text-sm text-muted-foreground">{result.market_opportunity_note}</p>
      )}

      {result.relevant_industries && result.relevant_industries.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Relevant Industries</p>
          <div className="flex flex-wrap gap-1">
            {result.relevant_industries.map((ind) => (
              <Badge key={ind} variant="secondary" className="text-xs">{ind}</Badge>
            ))}
          </div>
        </div>
      )}

      {result.candidate_sponsor_types && result.candidate_sponsor_types.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Sponsor Types</p>
          {result.candidate_sponsor_types.map((s, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium">{s.type}</span>
              <span className="text-muted-foreground"> — {s.why}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {s.examples?.map((ex: string) => (
                  <Badge key={ex} variant="outline" className="text-xs">{ex}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Wizard Page ───────────────────────────────────────────────────
export default function Wizard() {
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [goal, setGoal] = useState("");
  const [interviewMessages, setInterviewMessages] = useState<InterviewMessage[]>([]);
  const [interviewData, setInterviewData] = useState<InterviewResult | null>(null);
  const [marketScan, setMarketScan] = useState<MarketScanResult | null>(null);
  const [strategyPack, setStrategyPack] = useState<StrategyPack | null>(null);
  const [step, setStep] = useState<"goal" | "interview" | "market" | "strategy" | "review">("goal");
  const [totalCost, setTotalCost] = useState(0);

  // Save resume state as user progresses
  useEffect(() => {
    if (selectedEvent?.id) {
      const actionMap: Record<string, string> = {
        goal: "Entering goal",
        interview: "Intelligence interview",
        market: "Market scan",
        strategy: "Generating strategy",
        review: "Reviewing strategy pack",
      };
      saveResume(selectedEvent.id, "wizard", actionMap[step] || step, step);
    }
  }, [step, selectedEvent?.id]);

  // Challenge: check pricing vs tier
  interface ChallengeResult { ok: boolean; challenge: { suggestion: string; reasoning: string; current: string } | null; }
  const { data: challenge } = useQuery<ChallengeResult>({
    queryKey: ["challenge", selectedEvent?.id, strategyPack?.positioning_tier, strategyPack?.pricing_recommendations?.recommended_ticket_price],
    queryFn: () =>
      selectedEvent?.id && strategyPack?.pricing_recommendations?.recommended_ticket_price
        ? apiPost("/api/growth/challenge", {
            eventId: selectedEvent.id,
            field: "pricing",
            value: strategyPack.pricing_recommendations.recommended_ticket_price,
          })
        : Promise.resolve({ ok: true, challenge: null }),
    enabled: !!selectedEvent?.id && !!strategyPack?.pricing_recommendations?.recommended_ticket_price,
  });

  const { data: events, refetch } = useQuery({
    queryKey: ["growth-events"],
    queryFn: fetchEvents,
  });

  // ── Part 3: Load owner preferences for memory indicator ──
  const ownerId = selectedEvent?.ownerId;
  const { data: ownerPrefs } = useQuery<{ ok: boolean; preferences: any }>({
    queryKey: ["owner-preferences", ownerId],
    queryFn: () =>
      ownerId
        ? apiGet(`/api/growth/preferences/${ownerId}`)
        : Promise.resolve({ ok: true, preferences: null }),
    enabled: !!ownerId,
  });

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: (newEvent) => {
      setSelectedEvent(newEvent);
      refetch();
    },
  });

  const interviewMutation = useMutation({
    mutationFn: callInterview,
    onSuccess: (data) => {
      if (data.ok) {
        setTotalCost((c) => c + data.cost);
        const result = data.result;
        if (result.interview_complete && result.event_name) {
          setInterviewData(result);
          setInterviewMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Interview complete! I've captured all the details." },
          ]);
          setStep("market");
        } else if (result.raw_response) {
          setInterviewMessages((prev) => [
            ...prev,
            { role: "assistant", content: result.next_question || "Could you tell me more?" },
          ]);
        } else {
          setInterviewMessages((prev) => [
            ...prev,
            { role: "assistant", content: result.next_question || "Could you tell me more?" },
          ]);
        }
      }
    },
  });

  const marketScanMutation = useMutation({
    mutationFn: callMarketScan,
    onSuccess: (data) => {
      if (data.ok) {
        setTotalCost((c) => c + data.cost);
        setMarketScan(data.result);
        setStep("strategy");
      }
    },
  });

  const strategyMutation = useMutation({
    mutationFn: generateStrategy,
    onSuccess: (data) => {
      if (data.ok) {
        setTotalCost((c) => c + data.cost);
        setStrategyPack(data.result);
        setStep("review");
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: (approved: boolean) =>
      saveStrategyPack(selectedEvent!.id, strategyPack!, approved, selectedEvent?.ownerId || null),
    onSuccess: (data) => {
      if (data.ok) {
        setSelectedEvent((e) => (e ? { ...e, status: data.status } : e));
        refetch();
      }
    },
  });

  const isApproved = saveMutation.isSuccess && saveMutation.data?.ok;

  function handleSendAnswer(text: string) {
    const newMessages: InterviewMessage[] = [
      ...interviewMessages,
      { role: "user", content: text },
    ];
    setInterviewMessages(newMessages);
    interviewMutation.mutate({
      messages: newMessages,
      eventId: selectedEvent?.id,
      goal: goal,
      ownerId: selectedEvent?.ownerId || null,
    });
  }

  function handleRunMarketScan() {
    if (!interviewData) return;
    marketScanMutation.mutate({
      eventType: interviewData.event_type || "event",
      location: interviewData.location || "",
      audience: interviewData.target_audience || "",
      capacity: interviewData.estimated_capacity,
      positioningTier: interviewData.positioning_tier,
    });
  }

  function handleGenerateStrategy() {
    if (!interviewData || !marketScan) return;
    strategyMutation.mutate({
      interviewData: { ...interviewData, event_id: selectedEvent?.id },
      marketScan,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Strategy Wizard"
        intro="From a plain-language goal to an approved strategy pack."
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar — event selection + step indicator */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-card text-card-foreground shadow-soft p-5">
            <EventSelector
              events={events || []}
              selected={selectedEvent}
              onSelect={setSelectedEvent}
              onCreate={(name) => createMutation.mutate({ name, description: "", type: "general", status: "draft" })}
            />
          </div>

          <div className="rounded-2xl bg-card text-card-foreground shadow-soft p-5 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Your Journey
            </h2>
            <div className="space-y-1">
              {[
                { key: "goal", label: "Enter Goal", icon: "Step 1" },
                { key: "interview", label: "Interview", icon: "Step 2" },
                { key: "market", label: "Market Scan", icon: "Step 3" },
                { key: "strategy", label: "Generate Strategy", icon: "Step 4" },
                { key: "review", label: "Review & Approve", icon: "Step 5" },
              ].map((s) => {
                const sIdx = ["goal","interview","market","strategy","review"].indexOf(s.key);
                const cIdx = ["goal","interview","market","strategy","review"].indexOf(step);
                const isActive = step === s.key;
                const isDone = cIdx > sIdx;
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
                      isActive
                        ? "bg-burgundy/10 text-burgundy font-medium"
                        : isDone
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : isActive ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-burgundy flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-burgundy" />
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {s.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Part 3: Memory indicator */}
          {ownerPrefs?.ok && (ownerPrefs as any).preferences && (
            <div className="rounded-2xl bg-card text-card-foreground shadow-soft p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-burgundy" />
                <p className="text-xs font-medium text-burgundy">Memory Active</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tier: {(ownerPrefs as any).preferences.tier || "mid-market"}
                {(ownerPrefs as any).preferences.houseStyle && " · Style remembered"}
              </p>
            </div>
          )}

          {totalCost > 0 && (
            <div className="text-xs text-ivory/60">
              Compute spend this session: ${totalCost.toFixed(4)}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="space-y-6">
          {/* Step 1: Goal input */}
          {step === "goal" && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-[15px] font-heading">What is your event goal?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g. I am launching a women's leadership event in Milton Keynes..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={4}
                />
                {/* Part 4: CONDITIONAL STOP — vague brief warning */}
                {goal.trim().length > 0 && goal.trim().length < 20 && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-[#6E2433]/10 text-[#6E2433] text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Your brief is very short. Add more detail (audience, location, goals) for better strategy.
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        Selected: {selectedEvent.name}
                      </span>
                    ) : (
                      "Select an event from the sidebar first."
                    )}
                  </p>
                  <Button
                    onClick={() => {
                      if (goal.trim() && selectedEvent) {
                        setStep("interview");
                        // Seed the first interview message
                        setInterviewMessages([
                          { role: "user", content: goal },
                        ]);
                        interviewMutation.mutate({
                          goal: goal.trim(),
                          eventId: selectedEvent.id,
                          ownerId: selectedEvent.ownerId || null,
                          messages: [{ role: "user", content: goal }],
                        });
                      }
                    }}
                    disabled={!goal.trim() || !selectedEvent || interviewMutation.isPending}
                  >
                    {interviewMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Start Interview
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Interview */}
          {step === "interview" && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <InterviewChat
                  messages={interviewMessages}
                  onSend={handleSendAnswer}
                  isLoading={interviewMutation.isPending}
                />
                {interviewData && interviewData.interview_complete && (
                  <div className="flex justify-end">
                    <Button onClick={() => setStep("market")}>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Continue to Market Scan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Market Scan */}
          {step === "market" && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Market Scan</h3>
                  <p className="text-sm text-muted-foreground">
                    Run a market scan to analyse demand, competitors, audience pain points, and sponsor opportunities.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Event type:</strong> {interviewData?.event_type || "Not specified"}</p>
                  <p><strong>Location:</strong> {interviewData?.location || "Not specified"}</p>
                  <p><strong>Audience:</strong> {interviewData?.target_audience || "Not specified"}</p>
                  <p><strong>Capacity:</strong> {interviewData?.estimated_capacity || "Not specified"}</p>
                </div>
                <Button
                  onClick={handleRunMarketScan}
                  disabled={marketScanMutation.isPending}
                >
                  {marketScanMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Run Market Scan
                </Button>
                {marketScan && <MarketScanView result={marketScan} />}
                {marketScan && (
                  <div className="flex justify-end">
                    <Button onClick={handleGenerateStrategy}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Strategy Pack
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Strategy generation */}
          {step === "strategy" && (
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <h3 className="text-sm font-medium">Generating Strategy Pack...</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Synthesising interview data and market research into audience personas, sponsor profiles, messaging, and pricing.
                </p>
                {strategyMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Working...
                  </div>
                )}
                {strategyMutation.isError && (
                  <div className="text-sm text-destructive">
                    Error: {strategyMutation.error?.message}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Review & Approve */}
          {step === "review" && strategyPack && (
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-4">
                {/* Challenge Banner: pricing vs tier */}
                {challenge?.ok && challenge.challenge && (
                  <ChallengeBanner
                    suggestion={challenge.challenge.suggestion}
                    reasoning={challenge.challenge.reasoning}
                    current={challenge.challenge.current}
                    onKeep={() => { /* user keeps their choice — no action needed */ }}
                    onRevise={() => {
                      setStrategyPack(null);
                      setStep("interview");
                    }}
                  />
                )}
                <StrategyPackView
                  pack={strategyPack}
                  event={selectedEvent}
                  onApprove={() => saveMutation.mutate(true)}
                  onReject={() => {
                    setStrategyPack(null);
                    setStep("interview");
                  }}
                  isSaving={saveMutation.isPending}
                />
                {isApproved && (
                  <div className="border-t border-border/60 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <h3 className="text-sm font-medium">Strategy approved</h3>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Link href="/discovery">
                        <Button className="w-full bg-ink text-ivory hover:bg-ink/90">
                          <Search className="w-4 h-4 mr-2" />
                          Find People
                        </Button>
                      </Link>
                      <Link href="/site-builder">
                        <Button variant="outline" className="w-full border-gold/30 text-ink hover:bg-gold/10">
                          <Globe className="w-4 h-4 mr-2" />
                          Build Event Site
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="wizard" />
    </div>
  );
}
