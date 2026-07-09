import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import GoalBar from "@/components/GoalBar";
import {
  ExecutiveHealth, MetricCard, GrowthRing, RecommendationCard, PriorityRow, SectionTitle, StatusPill,
} from "@/components/executive";
import { ArrowRight, Plus, Users, GitBranch, Calendar, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
type ResumeState = { eventId: string; eventName: string; page: string; action: string };

// Resume links are built from server-supplied `page`. Whitelist against real routes
// so a stale/unexpected value falls back to the dashboard instead of a 404.
const VALID_RESUME_PAGES = new Set([
  "wizard", "discovery", "screen", "outreach", "outreach-workspace", "messaging-studio",
  "pipeline", "intelligence", "presentation-studio", "learning-engine", "site-builder",
  "personas", "sponsors", "pr-pipeline", "referrals", "corporate-targets", "ai-communications",
  "campaign-workspace", "outreach-control", "scheduler", "project-setup", "commercial", "insights", "events",
]);
const resumeHref = (page: string) => (VALID_RESUME_PAGES.has(page) ? `/${page}` : "/dashboard");

const fetchDashboard = () => apiGet<DashboardData>("/api/growth/dashboard");
const fetchResume = () => apiGet<{ ok: boolean; states: ResumeState[] }>("/api/growth/resume");

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextStepFor(e: DashboardData["recentEvents"][0]) {
  const prospectCount = Number(e?.prospectCount ?? 0);
  const pipelineCount = Number(e?.pipelineCount ?? 0);

  if (!e?.strategyPack) return { label: "Set strategy", href: "/wizard", reason: "needs a strategy before anything else", rank: 0 };
  if (prospectCount === 0) return { label: "Find people", href: "/discovery", reason: "has a strategy but no prospects yet", rank: 1 };
  if (pipelineCount === 0) return { label: "Review prospects", href: "/screen", reason: "has prospects waiting to be screened", rank: 2 };
  return { label: "View pipeline", href: "/pipeline", reason: "is progressing — review the pipeline", rank: 3 };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });
  const { data: resumeData } = useQuery({ queryKey: ["resume"], queryFn: fetchResume });

  const events = Array.isArray(data?.recentEvents) ? data.recentEvents : [];
  const n = events.length;
  const withStrategy = events.filter((e) => !!e.strategyPack).length;
  const withProspects = events.filter((e) => e.prospectCount > 0).length;
  const withPipeline = events.filter((e) => e.pipelineCount > 0).length;
  const readiness = n ? Math.round(((withStrategy / n + withProspects / n + withPipeline / n) / 3) * 100) : 0;

  // Real per-event series for sparklines (never fabricated).
  const prospectSeries = events.map((e) => e.prospectCount);
  const pipelineSeries = events.map((e) => e.pipelineCount);
  const totalPipeline = pipelineSeries.reduce((s, v) => s + v, 0);
  const totalProspects = data?.totalProspects ?? 0;
  const totalEvents = data?.totalEvents ?? 0;
  const totalCampaigns = data?.totalCampaigns ?? 0;
  const totalSpend = data?.totalSpend ?? 0;
  const conversion = totalProspects > 0 ? Math.round((totalPipeline / totalProspects) * 100) : 0;

  const firstName = (user?.name || user?.email || "").split(/[ @]/)[0];
  const now = new Date();

  // Upcoming deadlines — real event dates only.
  const upcoming = events
    .map((e) => ({ ...e, when: parseDate(e.startDate) }))
    .filter((e): e is typeof e & { when: Date } => !!e.when && e.when >= now)
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .slice(0, 4);
  const preparedAt = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const summary = !data
    ? "Preparing your briefing…"
    : n === 0
    ? "You haven't started a campaign yet. The quickest first move is to research your market, then create your first event — I'll build the strategy with you from there."
    : `You have ${totalEvents} event${totalEvents === 1 ? "" : "s"} in play. ${withStrategy} ${withStrategy === 1 ? "has" : "have"} a strategy, ${totalProspects} prospect${totalProspects === 1 ? "" : "s"} are in discovery, and ${withPipeline} ${withPipeline === 1 ? "event is" : "events are"} building a pipeline. ${n - withStrategy > 0 ? `Today's focus: give the ${n - withStrategy} unplanned event${n - withStrategy === 1 ? "" : "s"} a strategy before going wider.` : "Momentum is good — keep the pipeline moving."}`;

  const priorities = [...events].map((e) => ({ e, step: nextStepFor(e) }))
    .sort((a, b) => a.step.rank - b.step.rank).slice(0, 5);

  // Honest, derived recommendations (no fabricated figures).
  const recs: React.ReactNode[] = [];
  if (n - withStrategy > 0) recs.push(
    <RecommendationCard key="r1" kind="Risk" title={`${n - withStrategy} event${n - withStrategy === 1 ? "" : "s"} without a strategy`}
      observation={`${n - withStrategy} of your ${n} events have no strategy pack.`}
      meaning="Discovery and outreach can't begin until each event has a defined audience and positioning."
      action="Run the strategy wizard for each unplanned event."
      impact="Unblocks discovery" confidence="High" actLabel="Open wizard"
      handPrompt="Help me set a strategy for my events that don't have one yet." />
  );
  if (withProspects > withPipeline) recs.push(
    <RecommendationCard key="r2" kind="Opportunity" title="Prospects waiting to be screened"
      observation={`${withProspects - withPipeline} event${withProspects - withPipeline === 1 ? "" : "s"} have prospects but no pipeline yet.`}
      meaning="Warm prospects lose value the longer they sit unscreened."
      action="Screen and score prospects, then draft outreach for approval."
      impact="Improves conversion readiness" confidence="High" actLabel="Screen prospects"
      handPrompt="Screen and score my waiting prospects, then draft outreach for approval." />
  );
  recs.push(
    <RecommendationCard key="r3" kind="Recommendation" title="Research the market before spending"
      observation="Market demand and pricing aren't confirmed for every event."
      meaning="A quick market scan reduces the risk of mispricing or chasing the wrong audience."
      action="Generate a market intelligence report for your next event."
      impact="Reduces commercial risk" confidence="Medium" actLabel="Research market"
      handPrompt="Research the market — demand and pricing — for my next event." />
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Executive Briefing"
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}.`}
        intro={summary}
        preparedAt={preparedAt}
        actions={
          <Link href="/wizard">
            <button className="text-[13px] font-medium text-white bg-burgundy hover:bg-burgundy/90 rounded-full px-5 py-2.5 shadow-soft">
              Start a campaign
            </button>
          </Link>
        }
      />

      <GoalBar />

      {/* Growth Score + Today's Priorities */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-2xl bg-card text-card-foreground p-6 shadow-soft flex items-center gap-5 animate-fade-rise">
          <GrowthRing value={readiness} label="Readiness" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Growth Score</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-snug mb-3">The honest average of your readiness across active events.</p>
            <ul className="space-y-1.5 text-[13px]">
              <li className="flex justify-between"><span className="text-muted-foreground">Strategy set</span><span className="tabular-nums text-foreground">{withStrategy}/{n}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Prospects found</span><span className="tabular-nums text-foreground">{withProspects}/{n}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Pipeline started</span><span className="tabular-nums text-foreground">{withPipeline}/{n}</span></li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl bg-card text-card-foreground shadow-soft overflow-hidden animate-fade-rise">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading text-[18px] text-foreground">Today's priorities</h2>
          </div>
          {isLoading ? (
            <div className="divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-5">
                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : priorities.length === 0 ? (
            <p className="text-[13px] text-muted-foreground p-6">Nothing needs you right now. Create an event to begin building your pipeline.</p>
          ) : (
            <div className="divide-y divide-border">
              {priorities.map(({ e, step }, i) => (
                <PriorityRow key={e.id} index={i + 1} title={e.name} reason={`${e.name} ${step.reason}`}
                  actionLabel={step.label} onAction={() => { window.location.href = step.href; }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Executive Health */}
      <ExecutiveHealth items={[
        { label: "Events", value: isLoading ? "—" : totalEvents, note: `${withStrategy} with a strategy` },
        { label: "Growth Score", value: isLoading ? "—" : readiness, note: readiness >= 75 ? "Strong" : readiness >= 45 ? "Building" : "Early" },
        { label: "Prospects", value: isLoading ? "—" : totalProspects, note: "In discovery", spark: prospectSeries },
        { label: "Pipeline", value: isLoading ? "—" : withPipeline, note: "Events building a pipeline", spark: pipelineSeries },
        { label: "Campaigns", value: isLoading ? "—" : totalCampaigns, note: "Active" },
        { label: "Spend", value: isLoading ? "—" : `£${totalSpend.toFixed(2)}`, note: "Compute & outreach" },
      ]} />

      {/* Pipelines at a glance + Upcoming deadlines */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl bg-card text-card-foreground p-6 shadow-soft animate-fade-rise">
          <h2 className="font-heading text-[16px] text-foreground">Audience pipeline at a glance</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">From discovered prospects to an active pipeline.</p>
          {isLoading ? (
            <div className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-2/3" /></div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Prospects discovered", value: totalProspects, frac: 1 },
                { label: "Moved into pipeline", value: totalPipeline, frac: totalProspects > 0 ? totalPipeline / totalProspects : 0 },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="tabular-nums font-medium text-foreground">{s.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface overflow-hidden">
                    <div className="h-full rounded-full bg-burgundy transition-all" style={{ width: `${Math.max(s.frac * 100, s.value > 0 ? 6 : 0)}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-[12px] text-muted-foreground pt-1">
                {totalProspects > 0
                  ? <><span className="font-medium text-foreground">{conversion}%</span> of discovered prospects have entered the pipeline.</>
                  : "No prospects discovered yet — run discovery to begin the funnel."}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-card text-card-foreground p-6 shadow-soft animate-fade-rise">
          <h2 className="font-heading text-[16px] text-foreground flex items-center gap-2"><Calendar className="w-4 h-4 text-burgundy" /> Upcoming deadlines</h2>
          {isLoading ? (
            <div className="space-y-3 mt-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : upcoming.length === 0 ? (
            <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed">No dated events ahead. Add a date to an event and it will appear here.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {upcoming.map((e) => {
                const days = Math.ceil((e.when.getTime() - now.getTime()) / 86400000);
                // Red / Amber / Green urgency: ≤3 days = red, ≤14 = amber, else green.
                const tone = days <= 3
                  ? { badge: "bg-[#B3261E]/20 text-[#8F1D17] ring-1 ring-inset ring-[#B3261E]/40", text: "text-[#8F1D17]" }
                  : days <= 14
                  ? { badge: "bg-[#B45309]/20 text-[#8A3F07] ring-1 ring-inset ring-[#B45309]/40", text: "text-[#8A3F07]" }
                  : { badge: "bg-[#1E7A46]/20 text-[#155C34] ring-1 ring-inset ring-[#1E7A46]/40", text: "text-[#155C34]" };
                return (
                  <li key={e.id} className="flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 ${tone.badge}`}>
                      <span className="text-[15px] font-bold leading-none tabular-nums">{e.when.getDate()}</span>
                      <span className="text-[9px] uppercase tracking-wide mt-0.5 opacity-80">{e.when.toLocaleString("en-GB", { month: "short" })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">{e.name}</p>
                      <p className={`text-[11px] font-semibold flex items-center gap-1 ${tone.text}`}><Clock className="w-3 h-3" /> {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Commercial Snapshot */}
      <div>
        <SectionTitle sub="Every number, interpreted.">Commercial snapshot</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Events" value={isLoading ? "—" : data?.totalEvents ?? 0}
            status={{ status: n > 0 ? "growing" : "review", label: n > 0 ? "Active" : "None yet" }}
            interpretation={n > 0 ? `${withStrategy} of ${n} have a strategy in place.` : "Create your first event to begin."} />
          <MetricCard label="Prospects" value={isLoading ? "—" : data?.totalProspects ?? 0}
            status={{ status: (data?.totalProspects ?? 0) > 0 ? "growing" : "waiting", label: (data?.totalProspects ?? 0) > 0 ? "In discovery" : "None yet" }}
            interpretation={(data?.totalProspects ?? 0) > 0 ? "Screen and score these into your pipeline." : "Run discovery once a strategy is set."} />
          <MetricCard label="Campaigns" value={isLoading ? "—" : data?.totalCampaigns ?? 0}
            status={{ status: (data?.totalCampaigns ?? 0) > 0 ? "healthy" : "review", label: (data?.totalCampaigns ?? 0) > 0 ? "Running" : "None" }}
            interpretation="Active outreach campaigns across your events." />
          <MetricCard label="Spend" value={isLoading ? "—" : `£${(data?.totalSpend ?? 0).toFixed(2)}`}
            status={{ status: "healthy", label: "On track" }}
            interpretation="Total compute and outreach cost to date." />
        </div>
      </div>

      {/* Growth Intelligence */}
      <div>
        <SectionTitle sub="Prepared by your Growth Advisor.">Growth intelligence</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{recs}</div>
      </div>

      {/* Continue where you left off */}
      {resumeData?.states && resumeData.states.length > 0 && (
        <div>
          <SectionTitle>Continue where you left off</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {resumeData.states.map((s) => (
              <div key={s.eventId} className="rounded-2xl bg-card text-card-foreground p-5 shadow-soft flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-bold text-[15px] text-foreground truncate">{s.eventName}</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">{s.action}</p>
                </div>
                <Link href={resumeHref(s.page)}>
                  <span className="text-[12px] font-medium text-burgundy inline-flex items-center">Continue <ArrowRight className="w-3 h-3 ml-1" /></span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Your events</SectionTitle>
          <Link href="/events">
            <span className="text-[12px] font-medium text-ivory/80 hover:text-ivory inline-flex items-center"><Plus className="w-3 h-3 mr-1" /> Create event</span>
          </Link>
        </div>
        {events.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const step = nextStepFor(event);
              // 3-stage RAG from real progress: no strategy → amber, mid-funnel →
              // amber, progressing → green. (See nextStepFor ranks 0–3.)
              const rag = step.rank === 3
                ? { status: "healthy" as const, label: "On track" }
                : step.rank === 0
                ? { status: "review" as const, label: "Needs strategy" }
                : { status: "waiting" as const, label: step.rank === 1 ? "No prospects" : "To screen" };
              return (
                <div key={event.id} className="rounded-2xl bg-card text-card-foreground p-5 shadow-soft">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-[15px] text-foreground truncate">{event.name}</h3>
                      <div className="mt-1.5"><StatusPill status={rag.status} label={rag.label} /></div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.prospectCount}</span>
                      <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{event.pipelineCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-border">
                    <Link href={step.href}>
                      <span className="text-[12px] font-medium text-burgundy inline-flex items-center">{step.label}<ArrowRight className="w-3 h-3 ml-1" /></span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ivory/25 p-8 text-center">
            <p className="text-[14px] font-medium text-ivory">No events yet</p>
            <p className="text-[13px] text-ivory/60 mt-1 mb-4">Start by creating your first event — I'll build the strategy with you.</p>
            <Link href="/events">
              <button className="text-[13px] font-medium text-white bg-burgundy hover:bg-burgundy/90 rounded-full px-5 py-2.5">Create your first event</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
