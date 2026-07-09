import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import HandToElizabeth from "@/components/HandToElizabeth";

/* ── Status pill — consistent, colour only where it means something ───────── */
export type Status =
  | "healthy" | "growing" | "complete" | "approved"
  | "review" | "waiting" | "scheduled" | "priority"
  | "blocked" | "risk";

// Red / Amber / Green (+ blue = scheduled, burgundy = priority). Stronger, more
// visible fills with a defining ring so status reads at a glance — not a faint tint.
const STATUS_STYLES: Record<Status, string> = {
  healthy: "bg-[#1E7A46]/20 text-[#155C34] ring-1 ring-inset ring-[#1E7A46]/40",   // GREEN
  growing: "bg-[#1E7A46]/20 text-[#155C34] ring-1 ring-inset ring-[#1E7A46]/40",   // GREEN
  complete: "bg-[#1E7A46]/20 text-[#155C34] ring-1 ring-inset ring-[#1E7A46]/40",  // GREEN
  approved: "bg-[#1E7A46]/20 text-[#155C34] ring-1 ring-inset ring-[#1E7A46]/40",  // GREEN
  review: "bg-[#B45309]/20 text-[#8A3F07] ring-1 ring-inset ring-[#B45309]/40",    // AMBER
  waiting: "bg-[#B45309]/20 text-[#8A3F07] ring-1 ring-inset ring-[#B45309]/40",   // AMBER
  scheduled: "bg-[#2563EB]/15 text-[#1D4ED8] ring-1 ring-inset ring-[#2563EB]/40", // blue
  priority: "bg-[#6E2433]/15 text-[#6E2433] ring-1 ring-inset ring-[#6E2433]/40",  // burgundy
  blocked: "bg-[#B3261E]/20 text-[#8F1D17] ring-1 ring-inset ring-[#B3261E]/45",   // RED
  risk: "bg-[#B3261E]/20 text-[#8F1D17] ring-1 ring-inset ring-[#B3261E]/45",      // RED
};

export function StatusPill({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[status]}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {label || status}
    </span>
  );
}

/* ── Trend chip ───────────────────────────────────────────────────────────── */
export function Trend({ dir, value }: { dir: "up" | "down" | "flat"; value?: string }) {
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const color = dir === "up" ? "text-[#1E7A46]" : dir === "down" ? "text-[#B3261E]" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />{value}
    </span>
  );
}

/* ── Executive metric card — never a number without interpretation ────────── */
export function MetricCard({
  label, value, status, trend, interpretation,
}: {
  label: string;
  value: React.ReactNode;
  status?: { status: Status; label?: string };
  trend?: { dir: "up" | "down" | "flat"; value?: string };
  interpretation?: string;
}) {
  return (
    <div className="rounded-2xl bg-card text-card-foreground p-5 shadow-soft animate-fade-rise">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {trend && <Trend dir={trend.dir} value={trend.value} />}
      </div>
      <p className="font-heading text-[30px] leading-none text-foreground mt-2 tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {status && <StatusPill status={status.status} label={status.label} />}
      </div>
      {interpretation && <p className="text-[12px] text-muted-foreground mt-3 leading-relaxed">{interpretation}</p>}
    </div>
  );
}

/* ── Growth / confidence ring — the one place champagne shines ────────────── */
export function GrowthRing({ value, label, onDark = false }: { value: number; label?: string; onDark?: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const offset = c - (v / 100) * c;
  const band = v >= 75 ? "Strong" : v >= 45 ? "Building" : "Early";
  const track = onDark ? "rgba(255,255,255,0.18)" : "rgba(110,36,51,0.12)";
  const num = onDark ? "text-white" : "text-foreground";
  const sub = onDark ? "text-white/70" : "text-muted-foreground";
  return (
    <div className="relative w-[140px] h-[140px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke={track} strokeWidth="9" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="#C9A86A" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[34px] font-heading leading-none ${num}`}>{v}</span>
        <span className={`text-[11px] uppercase tracking-[0.16em] mt-1 ${sub}`}>{label || band}</span>
      </div>
    </div>
  );
}

/* ── Executive Health bar — KPIs with value + trend + interpretation ──────── */
export type HealthItem = {
  label: string;
  value: React.ReactNode;
  trend?: { dir: "up" | "down" | "flat"; value?: string };
  note?: string;
  spark?: number[];
};
export function ExecutiveHealth({ items }: { items: HealthItem[] }) {
  return (
    <div className="rounded-2xl bg-card text-card-foreground shadow-soft overflow-hidden animate-fade-rise">
      <div className="grid divide-y md:divide-y-0 md:divide-x divide-border md:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => (
          <div key={it.label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{it.label}</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="font-heading text-[22px] text-foreground tabular-nums">{it.value}</span>
              {it.trend && <Trend dir={it.trend.dir} value={it.trend.value} />}
            </div>
            {it.spark && it.spark.length > 1 && <Sparkline data={it.spark} className="mt-2 opacity-80" />}
            {it.note && <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{it.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Advisor recommendation card — an executive paper, not a chat bubble ──── */
export function RecommendationCard({
  kind = "Recommendation", title, observation, meaning, action, impact, confidence, onAct, actLabel = "Prepare draft", handPrompt,
}: {
  kind?: "Opportunity" | "Risk" | "Win" | "Recommendation";
  title: string;
  observation?: string;
  meaning?: string;
  action?: string;
  impact?: string;
  confidence?: "Very high" | "High" | "Medium" | "Low" | "Unknown";
  onAct?: () => void;
  actLabel?: string;
  handPrompt?: string;
}) {
  const kindColor =
    kind === "Opportunity" ? "text-[#1E7A46]"
    : kind === "Risk" ? "text-[#B3261E]"
    : kind === "Win" ? "text-[#9A7327]"
    : "text-burgundy";
  return (
    <div className="rounded-2xl bg-card text-card-foreground p-5 shadow-soft animate-fade-rise flex flex-col">
      <span className={`text-[11px] font-semibold uppercase tracking-wider ${kindColor}`}>{kind}</span>
      <h3 className="font-heading text-[17px] text-foreground mt-1 leading-snug">{title}</h3>
      <dl className="mt-3 space-y-2 text-[13px] leading-relaxed flex-1">
        {observation && (<div><dt className="text-muted-foreground text-[11px] uppercase tracking-wider">Observation</dt><dd className="text-foreground/90">{observation}</dd></div>)}
        {meaning && (<div><dt className="text-muted-foreground text-[11px] uppercase tracking-wider">What it means</dt><dd className="text-foreground/90">{meaning}</dd></div>)}
        {action && (<div><dt className="text-muted-foreground text-[11px] uppercase tracking-wider">Recommended action</dt><dd className="text-foreground/90">{action}</dd></div>)}
      </dl>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border gap-3">
        <div className="text-[12px] text-muted-foreground min-w-0">
          {impact && <span className="text-foreground font-medium">{impact}</span>}
          {impact && confidence && <span> · </span>}
          {confidence && <span>Confidence: {confidence}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {handPrompt && <HandToElizabeth prompt={handPrompt} />}
          <button
            onClick={onAct}
            className="text-[12px] font-medium text-white bg-burgundy hover:bg-burgundy/90 rounded-full px-3.5 py-1.5 transition-colors"
          >
            {actLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Today's priority row ─────────────────────────────────────────────────── */
export function PriorityRow({
  index, title, reason, impact, time, actionLabel = "Open", onAction,
}: {
  index: number; title: string; reason?: string; impact?: string; time?: string;
  actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-surface transition-colors">
      <span className="font-heading text-[18px] text-burgundy w-6 text-center shrink-0">{index}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-foreground truncate">{title}</p>
        <p className="text-[12px] text-muted-foreground">
          {reason}
          {(impact || time) && reason ? " · " : ""}
          {impact && <span className="text-foreground/80">{impact}</span>}
          {impact && time ? " · " : ""}
          {time && <span>{time}</span>}
        </p>
      </div>
      <button
        onClick={onAction}
        className="shrink-0 text-[12px] font-medium text-white bg-burgundy hover:bg-burgundy/90 rounded-full px-3.5 py-1.5 transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  );
}

/* ── Section heading on the burgundy workspace (light) ────────────────────── */
export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-heading text-[20px] text-ivory">{children}</h2>
      {sub && <p className="text-[13px] text-ivory/60 mt-0.5">{sub}</p>}
    </div>
  );
}
