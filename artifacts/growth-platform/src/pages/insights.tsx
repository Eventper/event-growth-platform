import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { PipelineStep, PipelineMini } from "@/components/PipelineStep";
import { apiGet, apiPost } from "@/lib/api";
import {
  Lightbulb,
  Search,
  TrendingUp,
  DollarSign,
  Users,
  Building,
  Calendar,
  Loader2,
  ArrowRight,
  Target,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface MarketInsight {
  id: string;
  query: string;
  demandScore: number;
  competitorEvents?: any[];
  pricingBenchmarks?: any[];
  sponsorActivity?: any[];
  audienceTrends?: any[];
  marketOpportunity?: any;
  sources?: { title?: string; url?: string }[];
  generatedAt: string;
}

function fetchInsights(): Promise<{ ok: boolean; insights: MarketInsight[] }> {
  return apiGet(`/api/growth/market-intelligence`);
}

function generateInsight(query: string): Promise<{ ok: boolean; insight: MarketInsight }> {
  return apiPost(`/api/growth/market-intelligence`, { query });
}

export default function Insights() {
  const [query, setQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["market-insights"],
    queryFn: fetchInsights,
  });

  const insights = Array.isArray(data?.insights) ? data.insights : [];
  const latest = insights[0];
  const loadError = error instanceof Error ? error.message : "Unable to load insights right now.";

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setGenerating(true);
    setRequestError(null);
    try {
      await generateInsight(query);
      setQuery("");
      await refetch();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to generate insights right now.";
      setRequestError(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Market Insights"
        intro="Research market demand before you build your strategy."
      />

      {/* Query Input */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Input
              placeholder="e.g. Women's leadership events in Milton Keynes 2026"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="flex-1"
            />
            <Button
              onClick={handleGenerate}
              disabled={generating || !query.trim()}
              className="bg-burgundy text-white hover:bg-burgundy/90"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Research
                </>
              )}
            </Button>
          </div>
          <p className="text-[12px] text-muted-foreground mt-2">
            Enter an event concept, location, and date. The system will research competitors, pricing, audience trends, and sponsor activity.
          </p>
        </CardContent>
      </Card>

      {requestError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {requestError}
        </div>
      )}

      {loadError && !requestError && !isLoading && !latest && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-700">
          {loadError}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-ivory/70" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !latest && (
        <div className="text-center py-12 text-ivory/70">
          <img
            src={`${import.meta.env.BASE_URL}assets/empty-state.png`}
            alt="No insights"
            className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80"
          />
          <p className="text-[14px] font-medium">No market insights yet.</p>
          <p className="text-[12px] mt-1 mb-4">Enter an event concept above to research the market.</p>
        </div>
      )}

      {/* Latest Report */}
      {latest && (
        <div className="space-y-6">
          {/* Market Opportunity Header */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[16px] flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-burgundy" />
                  Market Opportunity Report
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {latest.generatedAt ? new Date(latest.generatedAt).toLocaleDateString() : "Just now"}
                </Badge>
              </div>
              <p className="text-[12px] text-muted-foreground">Query: {latest.query}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Honesty notice — this report is AI-generated, not measured data */}
              <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[12px] text-amber-800">
                  AI-estimated from live web research. Treat as a starting point and verify key
                  figures{latest.sources && latest.sources.length > 0 ? " against the sources below" : ""} before relying on them.
                </p>
              </div>

              {/* Demand Score */}
              {latest.marketOpportunity && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-surface rounded-lg p-4 text-center">
                    <div className="text-[32px] font-bold text-ink font-heading">{latest.marketOpportunity.demandScore || 0}</div>
                    <div className="text-[12px] text-muted-foreground">Demand Score</div>
                    <div className="text-[11px] text-warm mt-1">0-100 scale</div>
                  </div>
                  <div className="bg-surface rounded-lg p-4 text-center">
                    <div className="text-[32px] font-bold text-burgundy font-heading">{latest.marketOpportunity.recommendedPrice || "-"}</div>
                    <div className="text-[12px] text-muted-foreground">Recommended Price</div>
                    <div className="text-[11px] text-warm mt-1">per ticket</div>
                  </div>
                  <div className="bg-surface rounded-lg p-4 text-center">
                    <div className="text-[32px] font-bold text-ink font-heading">{latest.marketOpportunity.recommendedCapacity || "-"}</div>
                    <div className="text-[12px] text-muted-foreground">Capacity</div>
                    <div className="text-[11px] text-warm mt-1">attendees</div>
                  </div>
                  <div className="bg-surface rounded-lg p-4 text-center">
                    <div className="text-[32px] font-bold text-ink font-heading">
                      <AlertTriangle className="w-6 h-6 mx-auto" />
                    </div>
                    <div className="text-[12px] text-muted-foreground">Risk Level</div>
                    <div className="text-[11px] text-warm mt-1">{latest.marketOpportunity.risks?.length || 0} risks</div>
                  </div>
                </div>
              )}

              {/* Summary */}
              {latest.marketOpportunity?.summary && (
                <div className="bg-surface rounded-lg p-4">
                  <p className="text-[14px] leading-relaxed">{latest.marketOpportunity.summary}</p>
                </div>
              )}

              {/* Next Steps */}
              <div className="flex gap-3">
                <Link href="/wizard">
                  <Button className="bg-burgundy text-white hover:bg-burgundy/90">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Start Strategy Wizard
                  </Button>
                </Link>
                <Link href="/events">
                  <Button variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Competitor Events */}
          {latest.competitorEvents && latest.competitorEvents.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] flex items-center gap-2">
                  <Target className="w-4 h-4 text-burgundy" />
                  Competitor Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latest.competitorEvents.map((event: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-surface rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-ink font-bold text-[12px]">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[13px] font-semibold">{event.name}</h4>
                        <span className="text-[11px] text-muted-foreground">{event.date}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground">{event.location} · {event.audience} · {event.price}</p>
                      <p className="text-[11px] text-warm mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pricing Benchmarks */}
          {latest.pricingBenchmarks && latest.pricingBenchmarks.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gold" />
                  Pricing Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latest.pricingBenchmarks.map((b: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                    <div>
                      <div className="text-[13px] font-medium">{b.eventType}</div>
                      <div className="text-[11px] text-muted-foreground">{b.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[14px] font-bold text-gold">{b.priceRange}</div>
                      <div className="text-[11px] text-muted-foreground">{b.note}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sponsor Activity */}
          {latest.sponsorActivity && latest.sponsorActivity.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] flex items-center gap-2">
                  <Building className="w-4 h-4 text-gold" />
                  Sponsor Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latest.sponsorActivity.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                    <div>
                      <div className="text-[13px] font-medium">{s.company}</div>
                      <div className="text-[11px] text-muted-foreground">{s.sector}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] text-warm">{s.activity}</div>
                      <div className="text-[11px] text-muted-foreground">{s.relevance}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Audience Trends */}
          {latest.audienceTrends && latest.audienceTrends.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold" />
                  Audience Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latest.audienceTrends.map((t: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-surface rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-ink/10 flex items-center justify-center text-ink text-[10px]">
                      <CheckCircle className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium">{t.trend}</div>
                      <div className="text-[11px] text-muted-foreground">{t.evidence}</div>
                      <div className="text-[11px] text-gold mt-1">{t.opportunity}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sources — real web citations backing the report */}
          {latest.sources && latest.sources.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] flex items-center gap-2">
                  <Search className="w-4 h-4 text-burgundy" />
                  Sources ({latest.sources.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latest.sources.map((s, i: number) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 bg-surface rounded-lg hover:bg-surface/70 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-ink/10 flex items-center justify-center text-ink font-bold text-[11px] shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{s.title || s.url}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{s.url}</div>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pipeline Step */}
          <PipelineStep current="insights" />
        </div>
      )}
    </div>
  );
}
