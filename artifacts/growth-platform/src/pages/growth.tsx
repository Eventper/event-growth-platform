import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { RecommendationCard } from "@/components/executive";
import { Sparkles } from "lucide-react";

interface DashboardData {
  totalEvents: number;
  totalProspects: number;
  recentEvents: Array<{
    id: string; name: string; status: string; startDate: string | null;
    strategyPack: any | null; prospectCount: number; pipelineCount: number;
  }>;
}

const fetchDashboard = () => apiGet<DashboardData>("/api/growth/dashboard");

type Kind = "Opportunity" | "Risk" | "Win" | "Recommendation";
type Insight = {
  kind: Kind;
  title: string;
  observation: string;
  meaning: string;
  action: string;
  impact: string;
  confidence: "Very high" | "High" | "Medium" | "Low" | "Unknown";
  href: string;
  actLabel: string;
};

// Interpretation over visualization — every insight is derived from real event
// state, never invented, and carries the five-part structure + a confidence.
function deriveInsights(events: DashboardData["recentEvents"]): Insight[] {
  const out: Insight[] = [];
  const noStrategy = events.filter((e) => !e.strategyPack);
  const strategyNoProspects = events.filter((e) => e.strategyPack && e.prospectCount === 0);
  const prospectsNoPipeline = events.filter((e) => e.prospectCount > 0 && e.pipelineCount === 0);
  const moving = events.filter((e) => e.pipelineCount > 0);

  if (noStrategy.length) {
    out.push({
      kind: "Risk",
      title: `${noStrategy.length} event${noStrategy.length > 1 ? "s have" : " has"} no strategy yet`,
      observation: `${noStrategy.map((e) => e.name).slice(0, 3).join(", ")}${noStrategy.length > 3 ? "…" : ""} ${noStrategy.length > 1 ? "are" : "is"} live without a strategy pack.`,
      meaning: "Discovery, outreach, and pricing all depend on the strategy. Without it, everything downstream is guesswork.",
      action: "Run the Strategy wizard to set positioning, audience, and pricing.",
      impact: "Unblocks the whole pipeline",
      confidence: "Very high",
      href: "/wizard",
      actLabel: "Set strategy",
    });
  }
  if (strategyNoProspects.length) {
    out.push({
      kind: "Opportunity",
      title: `${strategyNoProspects.length} event${strategyNoProspects.length > 1 ? "s are" : " is"} ready to source an audience`,
      observation: `${strategyNoProspects.length} event${strategyNoProspects.length > 1 ? "s have" : " has"} a strategy but no prospects discovered yet.`,
      meaning: "The hardest step is done. Discovery can now find on-profile people at zero search cost until you enrich.",
      action: "Open Discovery and pull a shortlist against the strategy's personas.",
      impact: "Starts the audience funnel",
      confidence: "High",
      href: "/discovery",
      actLabel: "Find people",
    });
  }
  if (prospectsNoPipeline.length) {
    out.push({
      kind: "Recommendation",
      title: `Screen ${prospectsNoPipeline.length} event${prospectsNoPipeline.length > 1 ? "s'" : "'s"} prospects into the pipeline`,
      observation: `Prospects are sitting unscreened on ${prospectsNoPipeline.length} event${prospectsNoPipeline.length > 1 ? "s" : ""}.`,
      meaning: "Unscreened prospects don't convert. Scoring them prioritises who to approach first.",
      action: "Review and score prospects, then draft outreach for approval.",
      impact: "Improves conversion readiness",
      confidence: "High",
      href: "/screen",
      actLabel: "Screen prospects",
    });
  }
  if (moving.length) {
    out.push({
      kind: "Win",
      title: `${moving.length} event${moving.length > 1 ? "s are" : " is"} moving through the pipeline`,
      observation: `${moving.map((e) => e.name).slice(0, 3).join(", ")}${moving.length > 3 ? "…" : ""} ${moving.length > 1 ? "have" : "has"} an active pipeline.`,
      meaning: "Momentum is real. Now is the moment to add commercial upside — sponsors and partnerships.",
      action: "Open the sponsor pipeline and generate a target shortlist.",
      impact: "Adds commercial revenue",
      confidence: "Medium",
      href: "/sponsors",
      actLabel: "Open sponsors",
    });
  }
  return out;
}

const FILTERS: { label: string; kinds: Kind[] }[] = [
  { label: "All", kinds: ["Opportunity", "Risk", "Win", "Recommendation"] },
  { label: "Opportunities", kinds: ["Opportunity"] },
  { label: "Risks", kinds: ["Risk"] },
  { label: "Wins", kinds: ["Win"] },
  { label: "Recommendations", kinds: ["Recommendation"] },
];

// Featured priority: a live risk outranks an opportunity outranks the rest.
const PRIORITY: Kind[] = ["Risk", "Opportunity", "Recommendation", "Win"];

export default function Growth() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });
  const [filter, setFilter] = useState(0);

  const insights = deriveInsights(data?.recentEvents ?? []);
  const featured = [...insights].sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind))[0];
  const rest = insights.filter((i) => i !== featured);
  const active = FILTERS[filter];
  const shown = rest.filter((i) => active.kinds.includes(i.kind));

  return (
    <>
      <PageHeader
        eyebrow="Growth · Intelligence Centre"
        title="What needs your attention"
        intro="A standing read of your growth — opportunities, risks, wins, and the next best move. Every insight is interpreted from what the platform can see, with its confidence stated."
      />

      {isLoading ? (
        <p className="text-[14px] text-ivory/60">Reading your growth signals…</p>
      ) : insights.length === 0 ? (
        <p className="text-[14px] text-ivory/70">No signals yet. Create an event and set its strategy — insights appear as soon as there's something to interpret.</p>
      ) : (
        <>
          {/* Featured — biggest thing right now */}
          {featured && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-champagne" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ivory/70">Biggest opportunity right now</span>
              </div>
              <div className="lg:max-w-2xl">
                <RecommendationCard
                  kind={featured.kind}
                  title={featured.title}
                  observation={featured.observation}
                  meaning={featured.meaning}
                  action={featured.action}
                  impact={featured.impact}
                  confidence={featured.confidence}
                  actLabel={featured.actLabel}
                  handPrompt={`${featured.title}. ${featured.action}`}
                  onAct={() => navigate(featured.href)}
                />
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            {FILTERS.map((f, i) => {
              const count = f.label === "All" ? rest.length : rest.filter((x) => f.kinds.includes(x.kind)).length;
              return (
                <button
                  key={f.label}
                  onClick={() => setFilter(i)}
                  className={
                    "text-[12px] font-medium px-3.5 py-1.5 rounded-full border transition-colors " +
                    (filter === i
                      ? "bg-champagne text-[#2A1E08] border-champagne"
                      : "bg-white/5 text-ivory/70 border-ivory/15 hover:text-ivory hover:bg-white/10")
                  }
                >
                  {f.label}{count > 0 ? ` · ${count}` : ""}
                </button>
              );
            })}
          </div>

          {/* Feed */}
          {shown.length === 0 ? (
            <p className="text-[13px] text-ivory/55">Nothing in this category right now.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {shown.map((i) => (
                <RecommendationCard
                  key={i.title}
                  kind={i.kind}
                  title={i.title}
                  observation={i.observation}
                  meaning={i.meaning}
                  action={i.action}
                  impact={i.impact}
                  confidence={i.confidence}
                  actLabel={i.actLabel}
                  handPrompt={`${i.title}. ${i.action}`}
                  onAct={() => navigate(i.href)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
