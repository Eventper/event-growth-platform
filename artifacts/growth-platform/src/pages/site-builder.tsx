import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { PipelineStep } from "@/components/PipelineStep";
import { apiGet, apiPost, saveResume } from "@/lib/api";
import {
  Globe,
  Loader2,
  CheckCircle,
  Copy,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface EventRecord {
  id: string;
  name: string;
  status: string;
  strategyPack: any | null;
}

function fetchEvents(): Promise<EventRecord[]> {
  return apiGet("/api/growth/events");
}

function buildSite(eventId: string): Promise<{ ok: boolean; siteHtml: string; note: string }> {
  return apiPost(`/api/growth/events/${eventId}/site-builder`, {});
}

export default function SiteBuilderPage() {
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Save resume state
  useEffect(() => {
    if (selectedEvent?.id) {
      saveResume(selectedEvent.id, "site-builder", "Building event site", null);
    }
  }, [selectedEvent?.id]);

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const buildMutation = useMutation({
    mutationFn: (eventId: string) => buildSite(eventId),
  });

  const siteHtml = buildMutation.data?.siteHtml || "";

  const handleCopy = () => {
    if (!siteHtml) return;
    navigator.clipboard.writeText(siteHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="relative rounded-2xl overflow-hidden bg-ink min-h-[140px] flex items-end">
        <img src={`${import.meta.env.BASE_URL}assets/hero-wizard.png`} alt="Site Builder" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-[28px] font-bold tracking-tight text-ivory font-heading">Site Builder</h1>
          <p className="text-[14px] text-ivory/70 mt-1">Generate a static event site from your approved strategy pack.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: Event selector */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] font-heading uppercase tracking-wider text-muted-foreground">
                Select Event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events?.map((e: EventRecord) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEvent(e);
                    buildMutation.reset();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${
                    selectedEvent?.id === e.id
                      ? "bg-gold/10 text-gold font-medium"
                      : "hover:bg-surface text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{e.name}</span>
                    <Badge variant="outline" className="text-[10px] h-5 ml-2 border-border/60">
                      {e.status}
                    </Badge>
                  </div>
                </button>
              ))}
              {(!events || events.length === 0) && (
                <p className="text-[13px] text-muted-foreground px-3 py-2">
                  No events yet. Create one in the wizard first.
                </p>
              )}
            </CardContent>
          </Card>

          {selectedEvent?.strategyPack && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-[13px] font-heading uppercase tracking-wider text-muted-foreground">
                  Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier</span>
                  <span className="font-medium capitalize">
                    {selectedEvent.strategyPack.positioning_tier || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Personas</span>
                  <span className="font-medium">
                    {selectedEvent.strategyPack.audience_personas?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sponsors</span>
                  <span className="font-medium">
                    {selectedEvent.strategyPack.sponsor_personas?.length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Build + preview */}
        <div className="space-y-6">
          {selectedEvent ? (
            <>
              <Card className="border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-semibold font-heading">{selectedEvent.name}</h3>
                      <p className="text-[13px] text-muted-foreground mt-1">
                        {selectedEvent.strategyPack
                          ? "Strategy pack ready. Generate your event site."
                          : "No strategy pack. Complete the wizard first."}
                      </p>
                    </div>
                    <Button
                      onClick={() => buildMutation.mutate(selectedEvent.id)}
                      disabled={buildMutation.isPending || !selectedEvent.strategyPack}
                      className="bg-ink text-ivory hover:bg-ink/90"
                    >
                      {buildMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate Site
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {buildMutation.isSuccess && siteHtml && (
                <>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-[13px] font-heading uppercase tracking-wider text-muted-foreground">
                          Generated Site
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopy}
                          className="h-7 text-[12px] border-gold/30 text-ink hover:bg-gold/10"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy HTML
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-[11px] text-muted-foreground mb-3">
                        {buildMutation.data?.note}
                      </div>
                      <div className="bg-[#1A0A0E] rounded-lg border border-gold/10 p-4 overflow-x-auto">
                        <pre className="text-[11px] text-ivory/60 font-mono leading-relaxed whitespace-pre-wrap">
                          {siteHtml.slice(0, 1200)}...
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/60 bg-gold/[0.04]">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Globe className="w-4 h-4 text-gold mt-0.5" />
                        <div>
                          <h3 className="text-[13px] font-semibold text-foreground">What's Next?</h3>
                          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                            Copy the HTML above and paste it into a single <code className="text-[11px] bg-surface px-1 py-0.5 rounded">index.html</code> file. Deploy it anywhere — Netlify, Vercel, GitHub Pages, or your own hosting. The form submits directly to the Growth Platform inbound API.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {buildMutation.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  Failed to generate site: {buildMutation.error?.message}
                </div>
              )}
            </>
          ) : (
            <Card className="border-dashed border-border/60 bg-card">
              <CardContent className="p-8 text-center">
                <img src={`${import.meta.env.BASE_URL}assets/empty-data.png`} alt="No event" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
                <p className="text-[14px] font-medium text-muted-foreground">No event selected</p>
                <p className="text-[12px] text-muted-foreground mt-1 mb-4">
                  Select an event from the sidebar to generate a site.
                </p>
                <Link href="/wizard">
                  <Button size="sm" className="bg-ink text-ivory hover:bg-ink/90">
                    <ArrowRight className="w-3 h-3 mr-1.5" />
                    Go to Wizard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="site-builder" />
    </div>
  );
}
