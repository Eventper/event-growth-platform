import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard, GrowthRing, SectionTitle } from "@/components/executive";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, TrendingUp } from "lucide-react";

interface DashboardData {
  totalEvents: number;
  totalProspects: number;
  totalCampaigns: number;
  totalSpend: number;
  recentEvents: Array<{
    id: string; name: string; status: string; startDate: string | null;
    strategyPack: any | null; prospectCount: number; pipelineCount: number;
  }>;
}

const fetchDashboard = () => apiGet<DashboardData>("/api/growth/dashboard");

export default function Performance() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  const events = data?.recentEvents ?? [];
  const n = events.length;
  const withStrategy = events.filter((e) => !!e.strategyPack).length;
  const withProspects = events.filter((e) => e.prospectCount > 0).length;
  const withPipeline = events.filter((e) => e.pipelineCount > 0).length;
  const readiness = n
    ? Math.round(((withStrategy / n + withProspects / n + withPipeline / n) / 3) * 100)
    : 0;

  // Objectives: the milestones every active event should clear. Outcomes are
  // measured honestly against what the platform can currently see.
  const objectives = [
    { label: "Every event has a strategy", done: n > 0 && withStrategy === n, progress: `${withStrategy}/${n}` },
    { label: "Every event is sourcing prospects", done: n > 0 && withProspects === n, progress: `${withProspects}/${n}` },
    { label: "Every event has an active pipeline", done: n > 0 && withPipeline === n, progress: `${withPipeline}/${n}` },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Performance"
        title="Outcomes & benchmarks"
        intro="How your growth engine is performing against its objectives — measured against what the platform can verify, never invented."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardContent className="p-6 flex items-center gap-5">
            <GrowthRing value={readiness} label="Readiness" />
            <div>
              <p className="font-heading text-[16px] text-foreground">Overall readiness</p>
              <p className="text-[13px] text-muted-foreground mt-1 leading-snug">
                The honest average of strategy, sourcing, and pipeline coverage across your {n || "—"} active event{n === 1 ? "" : "s"}.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard label="Events" value={isLoading ? "—" : data?.totalEvents ?? 0}
            interpretation="Active growth initiatives." />
          <MetricCard label="Prospects" value={isLoading ? "—" : data?.totalProspects ?? 0}
            interpretation="People discovered across events." />
          <MetricCard label="Campaigns" value={isLoading ? "—" : data?.totalCampaigns ?? 0}
            interpretation="Outreach campaigns run." />
          <MetricCard label="Spend" value={isLoading ? "—" : `£${(data?.totalSpend ?? 0).toFixed(2)}`}
            interpretation="Tracked discovery & enrichment cost." />
        </div>
      </div>

      <SectionTitle sub="The milestones every active event should clear.">Objectives</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-8">
        {objectives.map((o) => (
          <Card key={o.label}>
            <CardContent className="p-5 flex items-start gap-3">
              {o.done
                ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                : <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />}
              <div>
                <p className="text-[14px] font-medium text-foreground leading-snug">{o.label}</p>
                <p className="text-[12px] text-muted-foreground mt-1 tabular-nums">{o.progress} events</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle sub="Trends over time and peer benchmarks arrive as your event history grows.">What changed</SectionTitle>
      <Card className="mt-4">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <TrendingUp className="w-5 h-5 shrink-0" />
          <p className="text-[13px] leading-relaxed">
            Time-series trends and benchmarking compare each run against your past results. They begin populating once you have
            completed events to measure against — nothing is shown until there is real history behind it.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
