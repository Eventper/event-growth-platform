import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineStep } from "@/components/PipelineStep";
import { PageHeader } from "@/components/PageHeader";
import { apiGet, apiPost, apiDelete, saveResume } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Loader2,
  Plus,
  User,
  Building,
  Globe,
  Mail,
  Phone,
  CheckCircle,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Filter,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
interface EventRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  strategyPack: any | null;
}

interface Prospect {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  location: string | null;
  industry: string | null;
  companySize: string | null;
  profileUrl: string | null;
  source: string;
  sourceReference: string | null;
  confidenceLevel: string | null;
  verified: boolean | null;
  enriched: boolean | null;
  enrichmentCost: string | null;
  individualOrCorporate: string | null;
  likelyGender: string | null;
  genderConfidence: string | null;
  prospectType: string;
  status: string;
  createdAt: string;
}

// ── API helpers ───────────────────────────────────────────────────
function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function createEvent(body: any): Promise<EventRecord> {
  return apiPost("/api/growth/events", body);
}

function searchProspects(eventId: string, type: string): Promise<{ ok: boolean; found: number; stored: number; skipped: number; excluded?: number; filteredMen?: number; prospects: Prospect[]; error?: string }> {
  return apiPost(`/api/growth/events/${eventId}/prospects/search`, { prospectType: type });
}

function fetchProspects(eventId: string, type?: string): Promise<{ ok: boolean; prospects: Prospect[] }> {
  const url = new URL(`/api/growth/events/${eventId}/prospects`, window.location.origin);
  if (type) url.searchParams.set("type", type);
  return apiGet(url.toString());
}

function enrichProspect(id: string): Promise<{ ok: boolean; prospect: Prospect; creditsUsed: number }> {
  return apiPost(`/api/growth/prospects/${id}/enrich`, {});
}

function deleteProspect(id: string): Promise<any> {
  return apiDelete(`/api/growth/prospects/${id}`);
}

function fetchCredits(eventId: string): Promise<{ ok: boolean; creditsUsed: number; enrichedCount: number }> {
  return apiGet(`/api/growth/events/${eventId}/enrichment-credits`);
}

// ── Prospect Card ───────────────────────────────────────────────────
function ProspectCard({
  prospect,
  selected,
  onToggle,
  onEnrich,
  onDelete,
  isEnriching,
}: {
  prospect: Prospect;
  selected: boolean;
  onToggle: () => void;
  onEnrich: () => void;
  onDelete: () => void;
  isEnriching: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{prospect.name}</h3>
              {prospect.likelyGender === "female" && (
                <Badge variant="outline" className="text-xs h-5 border-pink-500/50 text-pink-600" title={`Likely woman${prospect.genderConfidence ? ` (${Math.round(Number(prospect.genderConfidence) * 100)}% confidence)` : ""}`}>
                  ♀ Likely woman
                </Badge>
              )}
              {prospect.likelyGender === "unknown" && (
                <Badge variant="outline" className="text-xs h-5 border-muted-foreground/30 text-muted-foreground" title="Gender unclear from name — please verify">
                  ? Verify
                </Badge>
              )}
              {prospect.enriched && (
                <Badge variant="default" className="text-xs h-5">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Enriched
                </Badge>
              )}
              {prospect.verified && (
                <Badge variant="secondary" className="text-xs h-5">
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {prospect.profileUrl && (
                <a
                  href={prospect.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-muted rounded"
                  title="Open profile"
                >
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              )}
              <button
                onClick={onDelete}
                className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                title="Remove"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
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
              <Badge variant="outline" className="text-xs h-5">
                {prospect.industry}
              </Badge>
            )}
            {prospect.companySize && (
              <Badge variant="outline" className="text-xs h-5">
                {prospect.companySize}
              </Badge>
            )}
            {prospect.individualOrCorporate && (
              <Badge
                variant={prospect.individualOrCorporate === "individual" ? "secondary" : "outline"}
                className="text-xs h-5"
              >
                {prospect.individualOrCorporate === "individual" ? "Sole trader" : "Corporate"}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs h-5">
              {prospect.source}
            </Badge>
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

          {prospect.enriched && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {prospect.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {prospect.email}
                </span>
              )}
              {prospect.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {prospect.phone}
                </span>
              )}
              {prospect.enrichmentCost && (
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  {prospect.enrichmentCost} credit
                </span>
              )}
            </div>
          )}

          {!prospect.enriched && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={onEnrich}
                disabled={isEnriching}
              >
                {isEnriching ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <CreditCard className="w-3 h-3 mr-1" />
                )}
                Enrich (1 credit)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function DiscoveryPage() {
  const PAGE_SIZE = 50;
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("audience");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Part 4: Enrichment confirmation dialog state
  const [enrichConfirm, setEnrichConfirm] = useState<{ id: string; name: string } | null>(null);
  const [bulkEnrichConfirm, setBulkEnrichConfirm] = useState(false);

  // Save resume state
  useEffect(() => {
    if (selectedEvent?.id) {
      saveResume(selectedEvent.id, "discovery", `Searching ${activeTab} prospects`, activeTab);
    }
  }, [selectedEvent?.id, activeTab]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedEvent?.id, activeTab]);

  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const { data: prospectsData, refetch: refetchProspects } = useQuery({
    queryKey: ["prospects", selectedEvent?.id, activeTab],
    queryFn: () => (selectedEvent ? fetchProspects(selectedEvent.id, activeTab) : Promise.resolve({ ok: true, prospects: [] })),
    enabled: !!selectedEvent,
  });

  const { data: creditsData, refetch: refetchCredits } = useQuery({
    queryKey: ["credits", selectedEvent?.id],
    queryFn: () => (selectedEvent ? fetchCredits(selectedEvent.id) : Promise.resolve({ ok: true, creditsUsed: 0, enrichedCount: 0 })),
    enabled: !!selectedEvent,
  });

  const searchMutation = useMutation({
    mutationFn: (type: string) => searchProspects(selectedEvent!.id, type),
    onSuccess: (data) => {
      if (data.ok) {
        refetchProspects();
        refetchCredits();
        setSearchError(null);
        const parts = [`${data.stored} added`];
        if (data.skipped) parts.push(`${data.skipped} duplicate${data.skipped === 1 ? "" : "s"}`);
        if (data.excluded) parts.push(`${data.excluded} off-target`);
        if (data.filteredMen) parts.push(`${data.filteredMen} likely men filtered (women-first)`);
        setSearchSummary(parts.join(" · "));
      } else {
        setSearchSummary(null);
        setSearchError(data.error || "Search failed");
      }
    },
    onError: (err: any) => {
      setSearchError(err.message || "Search failed");
    },
  });

  const enrichMutation = useMutation({
    mutationFn: (id: string) => enrichProspect(id),
    onSuccess: () => {
      refetchProspects();
      refetchCredits();
    },
  });

  const bulkEnrichMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedProspects);
      const results = [];
      for (const id of ids) {
        const res = await enrichProspect(id);
        if (res.ok) results.push(res);
      }
      return results;
    },
    onSuccess: () => {
      setSelectedProspects(new Set());
      refetchProspects();
      refetchCredits();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProspect(id),
    onSuccess: () => {
      refetchProspects();
    },
  });

  const prospects = Array.isArray(prospectsData?.prospects) ? prospectsData.prospects : [];
  const creditsUsed = creditsData?.creditsUsed || 0;
  const enrichedCount = creditsData?.enrichedCount || 0;
  const safeEvents = Array.isArray(events) ? events : [];
  const strategyPack = selectedEvent && typeof selectedEvent.strategyPack === "object" ? selectedEvent.strategyPack : null;

  function handleSelect(id: string) {
    const next = new Set(selectedProspects);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProspects(next);
  }

  const allProspects = prospects;
  const visibleProspects = allProspects.slice(0, visibleCount);
  const hasMoreProspects = visibleCount < allProspects.length;
  const selectedCount = selectedProspects.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Discovery" intro="Source audience and sponsor prospects from the approved strategy pack." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Event selector */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>SELECT EVENT</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    const name = prompt("Event name");
                    if (name) {
                      createEvent({ name, type: "general", status: "draft" }).then(() => refetchEvents());
                    }
                  }}
                >
                  <Plus className="w-3 h-3" />
                  New
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {safeEvents.map((e: EventRecord) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEvent(e);
                    setSelectedProspects(new Set());
                    setSearchError(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedEvent?.id === e.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{e.name}</span>
                    <Badge variant="outline" className="text-xs h-5 ml-2">
                      {e.status}
                    </Badge>
                  </div>
                  {strategyPack && e.id === selectedEvent?.id && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Pack: {strategyPack.positioning_tier || "ready"}
                    </p>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Credit counter */}
          {selectedEvent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Enrichment Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{creditsUsed}</div>
                <p className="text-xs text-muted-foreground">
                  {enrichedCount} prospect{enrichedCount !== 1 ? "s" : ""} enriched
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Search is free. Enrichment costs 1 credit per contact.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Strategy pack info */}
          {strategyPack && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Strategy Pack</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedEvent.strategyPack.positioning_tier === "premium" ? "default" : "secondary"} className="capitalize">
                    {strategyPack.positioning_tier}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {strategyPack.audience_personas?.length || 0} audience personas
                </p>
                <p className="text-muted-foreground">
                  {strategyPack.sponsor_personas?.length || 0} sponsor personas
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Prospect list */}
        <div className="lg:col-span-2 space-y-4">
          {selectedEvent ? (
            <>
              {/* Action bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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
                </div>
                <div className="flex items-center gap-2">
                  {selectedCount > 0 && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setBulkEnrichConfirm(true)}
                      disabled={bulkEnrichMutation.isPending}
                    >
                      {bulkEnrichMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <CreditCard className="w-3 h-3 mr-1" />
                      )}
                      Enrich {selectedCount} selected ({selectedCount} credits)
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => searchMutation.mutate(activeTab)}
                    disabled={searchMutation.isPending || !strategyPack}
                  >
                    {searchMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Search className="w-3 h-3 mr-1" />
                    )}
                    Search {activeTab === "audience" ? "Audience" : "Sponsors"}
                  </Button>
                </div>
              </div>

              {/* Error */}
              {searchError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {searchError}
                </div>
              )}

              {/* Search summary (women-first) */}
              {searchSummary && !searchError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-pink-500/10 text-pink-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  {searchSummary}
                </div>
              )}

              {/* No strategy pack warning */}
              {!strategyPack && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 text-yellow-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  No strategy pack. Run the Wizard first to generate personas.
                </div>
              )}

              {/* Stats with provenance */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  {allProspects.length} total
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  {allProspects.filter((p) => p.verified).length} verified
                </span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="w-3 h-3" />
                  {allProspects.filter((p) => !p.verified && p.confidenceLevel !== "unverified").length} unconfirmed
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  {allProspects.filter((p) => p.confidenceLevel === "unverified").length} unverified
                </span>
              </div>

              {/* Prospect list */}
              <div className="space-y-2">
                {allProspects.length === 0 ? (
                  <div className="text-center py-12 text-ivory/70">
                    <img src={`${import.meta.env.BASE_URL}assets/empty-state.png`} alt="No prospects" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
                    <p>No prospects yet. Click Search to find people from the strategy pack.</p>
                  </div>
                ) : (
                  visibleProspects.map((p) => (
                    <ProspectCard
                      key={p.id}
                      prospect={p}
                      selected={selectedProspects.has(p.id)}
                      onToggle={() => handleSelect(p.id)}
                      onEnrich={() => setEnrichConfirm({ id: p.id, name: p.name })}
                      onDelete={() => deleteMutation.mutate(p.id)}
                      isEnriching={enrichMutation.isPending && enrichMutation.variables === p.id}
                    />
                  ))
                )}
                {hasMoreProspects && (
                  <div className="pt-2 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, allProspects.length))}
                    >
                      Show more ({allProspects.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-ivory/70">
              <img src={`${import.meta.env.BASE_URL}assets/empty-state.png`} alt="Select event" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
              <p>Select an event from the sidebar to start discovery.</p>
            </div>
          )}
        </div>
      </div>

      {/* Part 4: Enrichment Confirmation Dialogs (HARD STOP) */}
      <AlertDialog open={!!enrichConfirm} onOpenChange={() => setEnrichConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Enrichment</AlertDialogTitle>
            <AlertDialogDescription>
              Enrich <strong>{enrichConfirm?.name}</strong> with Apollo data? This will spend 1 enrichment credit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (enrichConfirm) {
                  enrichMutation.mutate(enrichConfirm.id);
                  setEnrichConfirm(null);
                }
              }}
            >
              Confirm & Spend 1 Credit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkEnrichConfirm} onOpenChange={() => setBulkEnrichConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Enrichment</AlertDialogTitle>
            <AlertDialogDescription>
              Enrich {selectedCount} selected prospects? This will spend {selectedCount} enrichment credits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkEnrichMutation.mutate();
                setBulkEnrichConfirm(false);
              }}
            >
              Confirm & Spend {selectedCount} Credits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pipeline Step */}
      <PipelineStep current="discovery" />
    </div>
  );
}
