import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineStep } from "@/components/PipelineStep";
import { PageHeader } from "@/components/PageHeader";
import { apiGet, apiPost, saveResume } from "@/lib/api";
import {
  CheckCircle,
  XCircle,
  Star,
  Loader2,
  User,
  Building,
  Globe,
  ExternalLink,
  AlertTriangle,
  Filter,
  MessageSquare,
  Zap,
} from "lucide-react";

interface Prospect {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  industry: string | null;
  companySize: string | null;
  profileUrl: string | null;
  individualOrCorporate: string | null;
  prospectType: string;
  status: string;
  enriched: boolean | null;
  source: string;
  confidenceLevel: string | null;
  verified: boolean | null;
  score?: number;
  scoreReasons?: string[];
  intelligence?: any;
}

interface RelationshipIntelligence {
  fit_score: string;
  fit_reason: string;
  signals: Array<{ type: string; label: string; value: string }>;
  engagement_insights: string;
  recommended_approach: string;
  priority: string;
}

interface EventRecord {
  id: string;
  name: string;
  status: string;
  strategyPack: any | null;
}

function isApprovedStatus(status: string | null | undefined) {
  return status === "approved" || status === "approved_for_outreach";
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchProspects(eventId: string, type?: string): Promise<{ ok: boolean; prospects: Prospect[] }> {
  const url = new URL(`/api/growth/events/${eventId}/prospects`, window.location.origin);
  if (type) url.searchParams.set("type", type);
  return apiGet(url.toString());
}

function scoreProspect(id: string): Promise<{ ok: boolean; score: any; cost: number }> {
  return apiPost(`/api/growth/prospects/${id}/score`, {});
}

function getRelationshipIntelligence(id: string): Promise<{ ok: boolean; intelligence: RelationshipIntelligence }> {
  return apiPost(`/api/growth/prospects/${id}/relationship-intelligence`, {});
}

function approveProspect(id: string): Promise<{ ok: boolean; prospect: Prospect }> {
  return apiPost(`/api/growth/prospects/${id}/approve`, {});
}

function rejectProspect(id: string): Promise<{ ok: boolean; prospect: Prospect }> {
  return apiPost(`/api/growth/prospects/${id}/reject`, {});
}

function ProspectCard({
  prospect,
  onScore,
  onIntelligence,
  onApprove,
  onReject,
  isScoring,
  isIntelligencing,
  isApproving,
  isRejecting,
}: {
  prospect: Prospect;
  onScore: () => void;
  onIntelligence: () => void;
  onApprove: () => void;
  onReject: () => void;
  isScoring: boolean;
  isIntelligencing: boolean;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const score = prospect.score ?? 0;
  const scoreColor = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  const [showIntel, setShowIntel] = useState(false);
  const intel = prospect.intelligence as RelationshipIntelligence | undefined;
  const approved = isApprovedStatus(prospect.status);

  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{prospect.name}</h3>
            {approved && (
              <Badge variant="default" className="text-xs h-5">
                <CheckCircle className="w-3 h-3 mr-1" />
                Approved
              </Badge>
            )}
            {prospect.status === "rejected" && (
              <Badge variant="destructive" className="text-xs h-5">
                <XCircle className="w-3 h-3 mr-1" />
                Rejected
              </Badge>
            )}
            {prospect.individualOrCorporate === "individual" ? (
              <Badge variant="outline" className="text-xs h-5">Sole trader</Badge>
            ) : (
              <Badge variant="outline" className="text-xs h-5">Corporate</Badge>
            )}
            {intel && (
              <Badge className={`text-[10px] h-5 border-0 ${
                intel.priority === "high" ? "bg-[#C74A4A]/15 text-[#C74A4A]" :
                intel.priority === "low" ? "bg-[#4A9E6A]/15 text-[#4A9E6A]" :
                "bg-[#6E2433]/15 text-[#6E2433]"
              }`}>
                {intel.priority} priority
              </Badge>
            )}
            {/* Part 4: FLAG AND CONTINUE — low score or unverified needs review */}
            {(score < 50 || prospect.confidenceLevel === "unverified") && prospect.status === "new" && (
              <Badge className="text-[10px] h-5 border-0 bg-[#C74A4A]/15 text-[#C74A4A]">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Needs review
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {prospect.title || "Unknown title"}
            {prospect.company && ` · ${prospect.company}`}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {prospect.location && (
              <Badge variant="outline" className="text-xs h-5">
                <Globe className="w-3 h-3 mr-1" />
                {prospect.location}
              </Badge>
            )}
            {prospect.industry && (
              <Badge variant="outline" className="text-xs h-5">{prospect.industry}</Badge>
            )}
            {prospect.companySize && (
              <Badge variant="outline" className="text-xs h-5">{prospect.companySize}</Badge>
            )}
            {prospect.enriched && (
              <Badge variant="secondary" className="text-xs h-5">Enriched</Badge>
            )}
            {prospect.confidenceLevel && (
              <Badge variant="outline" className={`text-xs h-5 ${
                prospect.confidenceLevel === "high" ? "border-green-500/50 text-green-700" :
                prospect.confidenceLevel === "medium" ? "border-yellow-500/50 text-yellow-700" :
                "border-red-500/50 text-red-700"
              }`}>
                {prospect.confidenceLevel === "unverified" ? "Unverified" : `${prospect.confidenceLevel} confidence`}
              </Badge>
            )}
          </div>
          {prospect.profileUrl && (
            <a href={prospect.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-2">
              <ExternalLink className="w-3 h-3" />
              View profile
            </a>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {score !== undefined && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${scoreColor}`} />
              <span className="font-bold text-lg">{score}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            {!approved && prospect.status !== "rejected" && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onScore} disabled={isScoring}>
                  {isScoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                  Score
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onIntelligence} disabled={isIntelligencing}>
                  {isIntelligencing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Intel
                </Button>
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={onApprove} disabled={isApproving}>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onReject} disabled={isRejecting}>
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Relationship Intelligence */}
      {intel && (
        <div className="mt-3 pt-3 border-t border-[#6E2433]/20">
          <button
            onClick={() => setShowIntel(!showIntel)}
            className="text-[11px] text-[#6E2433] font-medium uppercase tracking-wider flex items-center gap-1 mb-2"
          >
            {showIntel ? "Hide" : "Show"} Relationship Intelligence
          </button>
          {showIntel && (
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  intel.fit_score === "high" ? "bg-[#4A9E6A]/15 text-[#4A9E6A]" :
                  intel.fit_score === "low" ? "bg-[#C74A4A]/15 text-[#C74A4A]" :
                  "bg-[#6E2433]/15 text-[#6E2433]"
                }`}>
                  {intel.fit_score} fit
                </span>
                <span className="text-[#1A1714]">{intel.fit_reason}</span>
              </div>
              {intel.signals?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {intel.signals.map((s, i) => (
                    <Badge key={i} className={`text-[10px] border-0 ${
                      s.value === "positive" ? "bg-[#4A9E6A]/10 text-[#4A9E6A]" :
                      s.value === "negative" ? "bg-[#C74A4A]/10 text-[#C74A4A]" :
                      "bg-[#6E2433]/10 text-[#6E2433]"
                    }`}>
                      {s.label}
                    </Badge>
                  ))}
                </div>
              )}
              {intel.engagement_insights && (
                <p className="text-[#1A1714]">
                  <span className="font-medium text-[#1A1714]">Engagement:</span> {intel.engagement_insights}
                </p>
              )}
              {intel.recommended_approach && (
                <p className="text-[#1A1714]">
                  <span className="font-medium text-[#1A1714]">Approach:</span> {intel.recommended_approach}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {prospect.scoreReasons && prospect.scoreReasons.length > 0 && (
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Score reasons:</p>
          {prospect.scoreReasons.map((r, i) => (
            <p key={i}>• {r}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScreenPage() {
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [activeTab, setActiveTab] = useState<string>("audience");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Save resume state
  useEffect(() => {
    if (selectedEvent?.id) {
      saveResume(selectedEvent.id, "screen", `Reviewing ${activeTab} prospects`, activeTab);
    }
  }, [selectedEvent?.id, activeTab]);

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const { data: prospectsData, refetch: refetchProspects } = useQuery({
    queryKey: ["prospects", selectedEvent?.id, activeTab],
    queryFn: () => (selectedEvent ? fetchProspects(selectedEvent.id, activeTab) : Promise.resolve({ ok: true, prospects: [] })),
    enabled: !!selectedEvent,
  });

  const scoreMutation = useMutation({
    mutationFn: (id: string) => scoreProspect(id),
    onSuccess: () => refetchProspects(),
  });

  const intelligenceMutation = useMutation({
    mutationFn: (id: string) => getRelationshipIntelligence(id),
    onSuccess: () => refetchProspects(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveProspect(id),
    onSuccess: () => refetchProspects(),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectProspect(id),
    onSuccess: () => refetchProspects(),
  });

  const prospects = prospectsData?.prospects || [];
  const filteredProspects = filterStatus === "all"
    ? prospects
    : filterStatus === "approved"
    ? prospects.filter((p) => isApprovedStatus(p.status))
    : prospects.filter((p) => p.status === filterStatus);

  const stats = {
    total: prospects.length,
    approved: prospects.filter((p) => isApprovedStatus(p.status)).length,
    rejected: prospects.filter((p) => p.status === "rejected").length,
    pending: prospects.filter((p) => p.status === "new").length,
    verified: prospects.filter((p) => p.verified).length,
    unconfirmed: prospects.filter((p) => !p.verified && p.confidenceLevel !== "unverified").length,
    unverified: prospects.filter((p) => p.confidenceLevel === "unverified").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Screen" intro="Human gate: review prospects, score them, approve or reject for outreach." />

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
                    setSelectedEvent(e);
                    setFilterStatus("all");
                  }}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-medium">{stats.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-green-600">Approved</span>
                  <span className="font-medium text-green-600">{stats.approved}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-red-600">Rejected</span>
                  <span className="font-medium text-red-600">{stats.rejected}</span>
                </div>
                {/* Provenance stats */}
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-green-600">Verified</span>
                    <span className="font-medium text-green-600">{stats.verified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-yellow-600">Unconfirmed</span>
                    <span className="font-medium text-yellow-600">{stats.unconfirmed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-red-600">Unverified</span>
                    <span className="font-medium text-red-600">{stats.unverified}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Prospect list */}
        <div className="lg:col-span-2 space-y-4">
          {selectedEvent ? (
            <>
              <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="audience" className="gap-1">
                      <User className="w-3 h-3" />
                      Audience
                    </TabsTrigger>
                    <TabsTrigger value="sponsor" className="gap-1">
                      <Building className="w-3 h-3" />
                      Sponsors
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                  <select
                    className="text-sm border rounded-md px-2 py-1 bg-background"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="new">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {filteredProspects.length === 0 ? (
                <div className="text-center py-12 text-ivory/70">
                  <img src={`${import.meta.env.BASE_URL}assets/empty-state.png`} alt="No prospects" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
                  <p>No prospects. Go to Discovery to source them.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProspects.map((p) => (
                    <ProspectCard
                      key={p.id}
                      prospect={p}
                      onScore={() => scoreMutation.mutate(p.id)}
                      onIntelligence={() => intelligenceMutation.mutate(p.id)}
                      onApprove={() => approveMutation.mutate(p.id)}
                      onReject={() => rejectMutation.mutate(p.id)}
                      isScoring={scoreMutation.isPending && scoreMutation.variables === p.id}
                      isIntelligencing={intelligenceMutation.isPending && intelligenceMutation.variables === p.id}
                      isApproving={approveMutation.isPending && approveMutation.variables === p.id}
                      isRejecting={rejectMutation.isPending && rejectMutation.variables === p.id}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-ivory/70">
              <img src={`${import.meta.env.BASE_URL}assets/empty-state.png`} alt="Select event" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
              <p>Select an event from the sidebar to start screening.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="review" />
    </div>
  );
}
