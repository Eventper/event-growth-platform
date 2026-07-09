import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useEventContext } from "@/contexts/EventContext";
import { PipelineStep } from "@/components/PipelineStep";
import { apiGet, apiPost } from "@/lib/api";

import {
  Users,
  Building,
  Radio,
  Shield,
  Search,
  Loader2,
  UserCheck,
  DollarSign,
  MapPin,
  ArrowRight,
  AlertTriangle,
  Tag,
  ChevronRight,
  Wand2,
  CheckCircle,
} from "lucide-react";

interface EventRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  strategyPack?: any;
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function fetchStrategyPack(eventId: string): Promise<{ ok: boolean; strategyPack?: any; status?: string }> {
  return apiGet(`/api/growth/events/${eventId}/strategy-pack`);
}

export default function Personas() {
  const { selectedEventId, setSelectedEventId } = useEventContext();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(selectedEventId);
  const [searchType, setSearchType] = useState<"audience" | "sponsor" | "media">("audience");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const { data: packData } = useQuery({
    queryKey: ["strategy-pack", selectedEvent],
    queryFn: () => fetchStrategyPack(selectedEvent!),
    enabled: !!selectedEvent,
  });

  const strategyPack = packData?.strategyPack;
  const audiencePersonas = strategyPack?.audience_personas || [];
  const sponsorPersonas = strategyPack?.sponsor_personas || [];
  const mediaPersonas = strategyPack?.media_personas || [];
  const exclusionRules = strategyPack?.exclusion_rules || {};
  const positioningTier = strategyPack?.positioning_tier || "mid-market";

  const tierColor: Record<string, string> = {
    "mass-market": "bg-[#E8E0D5] text-[#1A1714]",
    "mid-market": "bg-[#D4C8B8] text-[#1A1714]",
    "premium": "bg-[#6E2433] text-white",
  };
  const tierColorClass = tierColor[positioningTier] || "bg-[#D4C8B8] text-[#1A1714]";

  async function runDiscovery() {
    if (!selectedEvent) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const data = await apiPost(`/api/growth/events/${selectedEvent}/prospects/search`, { prospectType: searchType === "media" ? "audience" : searchType });
      setSearchResult(data);
    } catch (e) {
      setSearchResult({ ok: false, error: "Discovery failed" });
    } finally {
      setSearching(false);
    }
  }

  const event = events.find((e) => e.id === selectedEvent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden bg-ink min-h-[140px] flex items-end">
        <img src={`${import.meta.env.BASE_URL}assets/hero-dashboard.png`} alt="Personas" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-[28px] font-bold tracking-tight text-ivory font-heading">Personas & Discovery</h1>
          <p className="text-[14px] text-ivory/70 mt-1">Review and activate the personas from your strategy pack.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event selector */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>SELECT EVENT</span>
                <Link href="/wizard">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                    <Wand2 className="w-3 h-3" />
                    Wizard
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events.length === 0 && (
                <div className="text-center py-6 text-[13px] text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 text-[#6E2433]/60" />
                  <p>No events yet. Create one in the Wizard.</p>
                  <Link href="/wizard">
                    <Button variant="outline" size="sm" className="mt-3 text-xs">
                      Go to Wizard
                    </Button>
                  </Link>
                </div>
              )}
              {events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEvent(e.id);
                    setSelectedEventId(e.id);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-[13px] transition-all ${
                    selectedEvent === e.id
                      ? "bg-[#6E2433]/15 border-[#6E2433]/40 text-[#1A1714]"
                      : "bg-white border-[#E8E0D5] text-[#1A1714] hover:border-[#6E2433]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{e.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#6E2433]" />
                  </div>
                  {e.status === "approved" && (
                    <div className="mt-1 text-[11px] text-[#6E2433]">Strategy approved</div>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {strategyPack && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">TIER</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={`text-[12px] px-2.5 py-1 ${tierColorClass}`}>
                  {positioningTier}
                </Badge>
                <p className="text-[12px] text-muted-foreground mt-2">
                  {positioningTier === "premium" && "High price, curated audience, exclusive language"}
                  {positioningTier === "mid-market" && "Moderate price, targeted audience, value-led"}
                  {positioningTier === "mass-market" && "Low price, high volume, broad reach"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedEvent && (
            <div className="text-center py-12 text-[13px] text-ivory/70">
              <UserCheck className="w-10 h-10 mx-auto mb-3 text-ivory/50" />
              <p className="font-medium text-ivory">Select an event to review its personas</p>
              <p className="mt-1">Personas are generated during the Wizard. Pick an event with a strategy pack.</p>
            </div>
          )}

          {selectedEvent && !strategyPack && (
            <div className="text-center py-12 text-[13px] text-ivory/70">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-ivory/50" />
              <p className="font-medium text-ivory">No strategy pack found</p>
              <p className="mt-1">Run the Wizard for this event to generate personas.</p>
              <Link href={`/wizard?event=${selectedEvent}`}>
                <Button variant="outline" size="sm" className="mt-3 text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />
                  Open Wizard
                </Button>
              </Link>
            </div>
          )}

          {strategyPack && (
            <>
              {/* Audience Personas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#6E2433]" />
                    AUDIENCE PERSONAS ({audiencePersonas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {audiencePersonas.length === 0 && (
                    <p className="text-[13px] text-muted-foreground">No audience personas generated.</p>
                  )}
                  {audiencePersonas.map((p: any, i: number) => (
                    <div key={i} className="border border-[#E8E0D5] rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[14px] font-semibold text-[#1A1714]">{p.name}</div>
                          <div className="text-[12px] text-[#1A1714] mt-0.5">{p.why_attend}</div>
                        </div>
                        <Badge variant="outline" className="text-[11px] border-[#6E2433]/40 text-[#6E2433]">
                          {p.company_size}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.job_titles?.map((t: string) => (
                          <Badge key={t} className="text-[10px] bg-[#EFE9DF] text-[#1A1714] border-0">
                            {t}
                          </Badge>
                        ))}
                        {p.sectors?.map((s: string) => (
                          <Badge key={s} className="text-[10px] bg-[#E8E0D5] text-[#1A1714] border-0">
                            {s}
                          </Badge>
                        ))}
                        {p.locations?.map((l: string) => (
                          <Badge key={l} className="text-[10px] bg-[#EFE9DF] text-[#1A1714] border-0">
                            <MapPin className="w-2 h-2 mr-0.5" />
                            {l}
                          </Badge>
                        ))}
                      </div>
                      {p.pain_points?.length > 0 && (
                        <div className="mt-2 text-[11px] text-[#1A1714]">
                          <span className="font-medium">Pain points:</span> {p.pain_points.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Sponsor Personas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#6E2433]" />
                    SPONSOR PERSONAS ({sponsorPersonas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sponsorPersonas.length === 0 && (
                    <p className="text-[13px] text-muted-foreground">No sponsor personas generated.</p>
                  )}
                  {sponsorPersonas.map((p: any, i: number) => (
                    <div key={i} className="border border-[#E8E0D5] rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[14px] font-semibold text-[#1A1714]">{p.type}</div>
                          <div className="text-[12px] text-[#1A1714] mt-0.5">{p.why_sponsor}</div>
                        </div>
                        <Badge variant="outline" className="text-[11px] border-[#6E2433]/40 text-[#6E2433]">
                          <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                          {p.budget_expectation}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.job_titles?.map((t: string) => (
                          <Badge key={t} className="text-[10px] bg-[#EFE9DF] text-[#1A1714] border-0">
                            {t}
                          </Badge>
                        ))}
                        {p.sectors?.map((s: string) => (
                          <Badge key={s} className="text-[10px] bg-[#E8E0D5] text-[#1A1714] border-0">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Media Personas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#6E2433]" />
                    MEDIA PERSONAS ({mediaPersonas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mediaPersonas.length === 0 && (
                    <p className="text-[13px] text-muted-foreground">
                      No media personas generated. New in Phase 6 — run the Wizard again to regenerate with media personas.
                    </p>
                  )}
                  {mediaPersonas.map((p: any, i: number) => (
                    <div key={i} className="border border-[#E8E0D5] rounded-lg p-3 bg-white">
                      <div className="text-[14px] font-semibold text-[#1A1714]">{p.type}</div>
                      <div className="text-[12px] text-[#1A1714] mt-0.5">{p.why_cover}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.outlet_types?.map((t: string) => (
                          <Badge key={t} className="text-[10px] bg-[#EFE9DF] text-[#1A1714] border-0">
                            {t}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-[10px] border-[#6E2433]/40 text-[#6E2433]">
                          Reach: {p.reach_estimate}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Exclusion Rules */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#6E2433]" />
                    EXCLUSION RULES
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(!exclusionRules.job_titles?.length && !exclusionRules.keywords?.length && !exclusionRules.sectors?.length) ? (
                    <p className="text-[13px] text-muted-foreground">No exclusion rules configured.</p>
                  ) : (
                    <div className="border border-[#E8E0D5] rounded-lg p-3 bg-white">
                      <div className="text-[12px] text-[#1A1714] mb-2">{exclusionRules.reason || "Red flags that automatically exclude prospects from discovery"}</div>
                      <div className="flex flex-wrap gap-1">
                        {exclusionRules.job_titles?.map((t: string) => (
                          <Badge key={t} className="text-[10px] bg-[#1A1714]/10 text-[#1A1714] border-0">
                            <Tag className="w-2 h-2 mr-0.5" />
                            {t}
                          </Badge>
                        ))}
                        {exclusionRules.keywords?.map((k: string) => (
                          <Badge key={k} className="text-[10px] bg-[#1A1714]/10 text-[#1A1714] border-0">
                            <AlertTriangle className="w-2 h-2 mr-0.5" />
                            {k}
                          </Badge>
                        ))}
                        {exclusionRules.sectors?.map((s: string) => (
                          <Badge key={s} className="text-[10px] bg-[#1A1714]/10 text-[#1A1714] border-0">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Discovery Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#6E2433]" />
                    ACTIVATE DISCOVERY
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    {(["audience", "sponsor", "media"] as const).map((t) => (
                      <Button
                        key={t}
                        variant={searchType === t ? "default" : "outline"}
                        size="sm"
                        className={`text-[12px] capitalize ${searchType === t ? "bg-[#1A1714] text-ivory" : "border-[#E8E0D5]"}`}
                        onClick={() => setSearchType(t)}
                      >
                        {t === "audience" && <Users className="w-3 h-3 mr-1" />}
                        {t === "sponsor" && <Building className="w-3 h-3 mr-1" />}
                        {t === "media" && <Radio className="w-3 h-3 mr-1" />}
                        {t}
                      </Button>
                    ))}
                  </div>
                  <Button
                    className="w-full bg-[#1A1714] hover:bg-[#1A1714]/90 text-ivory text-[13px]"
                    onClick={runDiscovery}
                    disabled={searching || !selectedEvent}
                  >
                    {searching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching Apollo...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Search {searchType} prospects
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  {searchResult && (
                    <div className="text-[13px] space-y-1">
                      {searchResult.ok ? (
                        <>
                          <div className="flex items-center gap-2 text-[#6E2433]">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Found {searchResult.found} prospects</span>
                          </div>
                          <div className="text-[#1A1714]">Stored {searchResult.stored} new prospects</div>
                          {searchResult.skipped > 0 && <div className="text-[#1A1714]">Skipped {searchResult.skipped} duplicates</div>}
                          {searchResult.excluded > 0 && <div className="text-[#1A1714]">Excluded {searchResult.excluded} by rules</div>}
                          <Link href="/discovery">
                            <Button variant="link" size="sm" className="text-[#6E2433] text-[12px] p-0 h-auto mt-1">
                              Go to Discovery to review
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <div className="text-red-600">Error: {searchResult.error}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="personas" />
    </div>
  );
}
