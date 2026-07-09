import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { GrowthRing } from "@/components/executive";
import HandToElizabeth from "@/components/HandToElizabeth";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Crown, Sparkles, CheckCircle2, Circle, ArrowRight, Calendar } from "lucide-react";

interface EventRow {
  id: string; name: string; status: string; startDate: string | null;
  strategyPack: any | null; prospectCount: number; pipelineCount: number;
}
interface DashboardData { recentEvents: EventRow[] }

const fetchDashboard = () => apiGet<DashboardData>("/api/growth/dashboard");

function healthOf(e: EventRow) {
  const parts = [!!e.strategyPack, e.prospectCount > 0, e.pipelineCount > 0];
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
}

export default function CampaignWorkspace() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });
  const events = data?.recentEvents ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const event = events.find((e) => e.id === selectedId) ?? events[0] ?? null;

  if (!isLoading && events.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Campaigns" title="Campaign workspace"
          intro="The command surface for a single campaign — strategy, audience, sponsors, and communications in one place." />
        <Card><CardContent className="p-8 text-center">
          <p className="text-[14px] font-medium text-foreground">No campaigns yet</p>
          <p className="text-[13px] text-muted-foreground mt-1 mb-4">Create an event and set its strategy to open its workspace.</p>
          <Link href="/events"><button className="text-[13px] font-medium text-white bg-burgundy rounded-full px-5 py-2.5">Create an event</button></Link>
        </CardContent></Card>
      </>
    );
  }

  const health = event ? healthOf(event) : 0;
  const tier = event?.strategyPack?.positioning_tier as string | undefined;
  const objective = event?.strategyPack?.tagline || (tier ? `${tier[0].toUpperCase()}${tier.slice(1)} positioning` : "Strategy not set yet");
  const days = event?.startDate ? Math.ceil((new Date(event.startDate).getTime() - Date.now()) / 86400000) : null;
  const pacing = !event?.strategyPack ? "Needs a strategy to begin"
    : health >= 67 ? "On track" : health >= 34 ? "Building momentum" : "Early — needs attention";

  // Narrative timeline — the campaign's real progress, in order.
  const stages = event ? [
    { label: "Strategy set", done: !!event.strategyPack, href: "/wizard" },
    { label: "Audience discovered", done: event.prospectCount > 0, href: "/discovery" },
    { label: "Prospects screened", done: event.pipelineCount > 0, href: "/screen" },
    { label: "Pipeline in motion", done: event.pipelineCount > 0, href: "/pipeline" },
    { label: "Outreach drafted", done: false, href: "/ai-communications" },
  ] : [];

  const rails = event ? [
    { icon: Users, label: "Audience", stat: `${event.prospectCount} prospects`, sub: `${event.pipelineCount} in pipeline`, href: "/discovery" },
    { icon: Crown, label: "Sponsors", stat: "Commercial pipeline", sub: "Find & track partners", href: "/sponsors" },
    { icon: Sparkles, label: "Communications", stat: "Outreach & approvals", sub: "Drafts await your sign-off", href: "/ai-communications" },
  ] : [];

  return (
    <>
      <PageHeader eyebrow="Campaigns · Workspace" title="Campaign workspace"
        intro="The command surface for a single campaign — strategy, audience, sponsors, and communications in one place." />

      {events.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {events.map((e) => (
            <button key={e.id} onClick={() => setSelectedId(e.id)}
              className={"text-[12px] font-medium px-3.5 py-1.5 rounded-full border transition-colors " +
                (event?.id === e.id ? "bg-champagne text-[#2A1E08] border-champagne" : "bg-white/5 text-ivory/70 border-ivory/15 hover:text-ivory")}>
              {e.name}
            </button>
          ))}
        </div>
      )}

      {event && (
        <>
          {/* Campaign header */}
          <Card className="mb-6">
            <CardContent className="p-6 flex flex-wrap items-center gap-6">
              <GrowthRing value={health} label="Health" />
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-[22px] text-foreground leading-tight">{event.name}</h2>
                <p className="text-[13px] text-muted-foreground mt-1">{objective}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[12px]">
                  <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                    <span className={"w-1.5 h-1.5 rounded-full " + (health >= 67 ? "bg-success" : health >= 34 ? "bg-warning" : "bg-danger")} />
                    {pacing}
                  </span>
                  {days !== null && (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {days < 0 ? "Past" : days === 0 ? "Today" : `${days} days away`}
                    </span>
                  )}
                </div>
              </div>
              <HandToElizabeth prompt={`Give me your read on the "${event.name}" campaign — what's working, what's at risk, and what to do next.`}
                label="Elizabeth's read" className="self-start" />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {/* Three rails */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ivory/70">The campaign at a glance</h3>
              {rails.map((r) => (
                <Link key={r.label} href={r.href}>
                  <Card className="cursor-pointer hover:shadow-card transition-shadow">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-surface"><r.icon className="w-5 h-5 text-burgundy" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-foreground">{r.label}</p>
                        <p className="text-[12px] text-muted-foreground">{r.stat} · {r.sub}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Narrative timeline */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ivory/70 mb-4">Where the campaign is</h3>
              <Card>
                <CardContent className="p-5">
                  <ol className="relative border-l border-border ml-2">
                    {stages.map((s) => (
                      <li key={s.label} className="ml-5 pb-5 last:pb-0 relative">
                        <span className="absolute -left-[26px] top-0 bg-card">
                          {s.done ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                        </span>
                        <Link href={s.href}>
                          <p className={"text-[13px] " + (s.done ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>{s.label}</p>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
