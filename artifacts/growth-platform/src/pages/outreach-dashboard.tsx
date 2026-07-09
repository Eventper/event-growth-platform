import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard, SectionTitle, GrowthRing } from "@/components/executive";
import { Card, CardContent } from "@/components/ui/card";
import { handToElizabeth } from "@/components/HandToElizabeth";
import { Sparkles } from "lucide-react";

interface Counts {
  totalProspects: number; verified: number; approvedForOutreach: number;
  emailsSent: number; replies: number; interested: number; declines: number;
  followUpsDue: number; bounces: number; doNotContact: number;
}
interface CatRow { category: string; total: number; new: number; approved: number; inSequence: number; replied: number }
interface Health { score: number; band: string; factors: { label: string; value: string }[] }
interface Analytics {
  note: string;
  replyRateByCategory: { category: string; sent: number; replies: number; replyRate: number }[];
  performanceBySubject: { subject: string; sent: number; replies: number; replyRate: number }[];
}
interface Suggestion { title: string; detail: string; prompt: string }
const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fetchDash = () => apiGet<{ counts: Counts; perCategory: CatRow[] }>("/api/growth/outreach/dashboard");
const fetchHealth = () => apiGet<Health>("/api/growth/outreach/health");
const fetchAnalytics = () => apiGet<Analytics>("/api/growth/outreach/analytics");
const fetchSuggestions = () => apiGet<{ suggestions: Suggestion[] }>("/api/growth/outreach/suggestions");

export default function OutreachDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["outreach-dashboard"], queryFn: fetchDash });
  const { data: health } = useQuery({ queryKey: ["outreach-health"], queryFn: fetchHealth });
  const { data: analytics } = useQuery({ queryKey: ["outreach-analytics"], queryFn: fetchAnalytics });
  const { data: sugg } = useQuery({ queryKey: ["outreach-suggestions"], queryFn: fetchSuggestions });
  const c = data?.counts;
  const v = (n?: number) => (isLoading ? "—" : n ?? 0);
  const suggestions = sugg?.suggestions ?? [];

  const metrics: { label: string; value: number | undefined; note: string }[] = [
    { label: "Total prospects", value: c?.totalProspects, note: "Across all categories" },
    { label: "Verified", value: c?.verified, note: "Email verified" },
    { label: "Approved", value: c?.approvedForOutreach, note: "Ready to send" },
    { label: "Emails sent", value: c?.emailsSent, note: "Delivered touches" },
    { label: "Replies", value: c?.replies, note: "Inbound" },
    { label: "Interested", value: c?.interested, note: "Warm" },
    { label: "Declines", value: c?.declines, note: "Closed — no" },
    { label: "Follow-ups due", value: c?.followUpsDue, note: "Scheduled & ready" },
    { label: "Bounces", value: c?.bounces, note: "Undeliverable" },
    { label: "Do Not Contact", value: c?.doNotContact, note: "Suppressed" },
  ];

  return (
    <>
      <PageHeader eyebrow="Communications · Outreach Dashboard" title="Outreach at a glance"
        intro="The state of every controlled outreach campaign — verification, sending, replies, and the pipeline by category." />

      {/* Health + Elizabeth suggestions */}
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr] mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-5">
            <GrowthRing value={health?.score ?? 0} label={health?.band ?? "Health"} />
            <div className="min-w-0">
              <p className="font-heading text-[16px] text-foreground">Campaign health</p>
              <ul className="mt-2 space-y-1 text-[12px]">
                {(health?.factors ?? []).map((f) => (
                  <li key={f.label} className="flex justify-between gap-3"><span className="text-muted-foreground">{f.label}</span><span className="tabular-nums text-foreground">{f.value}</span></li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="font-heading text-[16px] text-foreground flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-champagne" /> Elizabeth suggests</p>
            {suggestions.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nothing needs attention right now.</p>
            ) : (
              <ul className="space-y-3">
                {suggestions.map((s) => (
                  <li key={s.title} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{s.title}</p>
                      <p className="text-[12px] text-muted-foreground">{s.detail}</p>
                    </div>
                    <button onClick={() => handToElizabeth(s.prompt)}
                      className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium text-burgundy hover:text-burgundy/80">
                      <Sparkles className="w-3.5 h-3.5 text-champagne" /> Hand to Elizabeth
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={v(m.value)} interpretation={m.note} />
        ))}
      </div>

      <SectionTitle sub="Prospects by category and stage.">Pipelines by category</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {(data?.perCategory ?? []).map((cat) => (
          <Card key={cat.category}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-bold text-foreground">{label(cat.category)} pipeline</p>
                <span className="text-[20px] font-heading text-foreground tabular-nums">{cat.total}</span>
              </div>
              <div className="space-y-1.5 text-[13px]">
                <div className="flex justify-between"><span className="text-muted-foreground">New / research</span><span className="tabular-nums text-foreground">{cat.new}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span className="tabular-nums text-foreground">{cat.approved}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">In sequence</span><span className="tabular-nums text-foreground">{cat.inSequence}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Replied</span><span className="tabular-nums text-foreground">{cat.replied}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics */}
      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <div>
          <SectionTitle sub="Replies per sent, by category.">Reply rate by category</SectionTitle>
          <Card className="mt-4"><CardContent className="p-5">
            <div className="space-y-2">
              {(analytics?.replyRateByCategory ?? []).map((r) => (
                <div key={r.category} className="flex items-center gap-3 text-[13px]">
                  <span className="w-24 shrink-0 text-foreground">{label(r.category)}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                    <div className="h-full rounded-full bg-burgundy" style={{ width: `${Math.min(r.replyRate, 100)}%` }} />
                  </div>
                  <span className="w-20 text-right tabular-nums text-muted-foreground">{r.replies}/{r.sent} · {r.replyRate}%</span>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </div>

        <div>
          <SectionTitle sub="Which subject lines earn replies. Opens aren't tracked.">Performance by subject</SectionTitle>
          <Card className="mt-4"><CardContent className="p-5">
            {(analytics?.performanceBySubject ?? []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No sent emails yet.</p>
            ) : (
              <div className="space-y-2">
                {(analytics?.performanceBySubject ?? []).map((s) => (
                  <div key={s.subject} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate text-foreground">{s.subject}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{s.replies}/{s.sent} · {s.replyRate}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </div>
      </div>
      {analytics?.note && <p className="text-[11px] text-ivory/50 mt-3">{analytics.note}</p>}
    </>
  );
}
