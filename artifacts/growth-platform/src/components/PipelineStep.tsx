import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

export const PIPELINE_STEPS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", desc: "Overview & progress" },
  { key: "events", label: "Events", href: "/events", desc: "Create your event" },
  { key: "insights", label: "Insights", href: "/insights", desc: "Research the market" },
  { key: "wizard", label: "Strategy", href: "/wizard", desc: "Position your event" },
  { key: "personas", label: "Personas", href: "/personas", desc: "Define targets" },
  { key: "discovery", label: "Discovery", href: "/discovery", desc: "Find prospects" },
  { key: "review", label: "Review", href: "/screen", desc: "Approve prospects" },
  { key: "messaging", label: "Messaging", href: "/messaging-studio", desc: "Craft messages" },
  { key: "presentations", label: "Presentations", href: "/presentation-studio", desc: "Create attachments" },
  { key: "outreach-workspace", label: "Outreach Workspace", href: "/outreach-workspace", desc: "Refine & approve" },
  { key: "outreach", label: "Outreach", href: "/outreach", desc: "Send outreach" },
  { key: "pipeline", label: "Pipeline", href: "/pipeline", desc: "Track progress" },
  { key: "intelligence", label: "Intelligence", href: "/intelligence", desc: "Analyse results" },
  { key: "learning", label: "Learning", href: "/learning-engine", desc: "Capture insights" },
  { key: "site-builder", label: "Site Builder", href: "/site-builder", desc: "Publish your site" },
] as const;

export type PipelineStepKey = (typeof PIPELINE_STEPS)[number]["key"];

export function PipelineStep({
  current,
  eventName,
  eventId,
  children,
}: {
  current: PipelineStepKey;
  eventName?: string;
  eventId?: string;
  children?: React.ReactNode;
}) {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.key === current);
  const prev = currentIndex > 0 ? PIPELINE_STEPS[currentIndex - 1] : null;
  const next = currentIndex < PIPELINE_STEPS.length - 1 ? PIPELINE_STEPS[currentIndex + 1] : null;

  return (
    <div className="border-t border-[#6E2433]/20 pt-4 mt-6 space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {PIPELINE_STEPS.map((s, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={s.key} className="flex items-center gap-1 flex-1">
              <div
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  isDone
                    ? "bg-[#4A9E6A]"
                    : isCurrent
                    ? "bg-[#6E2433]"
                    : "bg-[#E8E0D5]"
                }`}
                title={s.label}
              />
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`w-1 h-1 rounded-full ${isDone ? "bg-[#4A9E6A]" : "bg-[#E8E0D5]"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-[10px] text-ivory/60 uppercase tracking-wider">
        <span>Pipeline</span>
        <span>
          Step {currentIndex + 1} of {PIPELINE_STEPS.length}
        </span>
      </div>

      {/* Next step CTA */}
      {next && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-ivory/70 mb-1">
              {eventName ? `For "${eventName}"` : "Next step"}
            </p>
            <p className="text-[13px] font-medium text-ivory">
              {next.desc}
            </p>
          </div>
          <Link href={next.href}>
            <Button className="bg-[#1A1714] text-ivory hover:bg-[#1A1714]/90">
              {next.label}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Previous step */}
      {prev && (
        <div className="flex items-center gap-2">
          <Link href={prev.href}>
            <Button variant="ghost" size="sm" className="text-[11px] text-ivory/70 h-7">
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back to {prev.label}
            </Button>
          </Link>
        </div>
      )}

      {children}
    </div>
  );
}

export function PipelineMini({
  current,
  className = "",
}: {
  current: PipelineStepKey;
  className?: string;
}) {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.key === current);
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {PIPELINE_STEPS.map((s, i) => (
        <Link
          key={s.key}
          href={s.href}
          className={`h-1.5 rounded-full flex-1 transition-all hover:opacity-80 ${
            i < currentIndex
              ? "bg-[#4A9E6A]"
              : i === currentIndex
              ? "bg-[#6E2433]"
              : "bg-[#E8E0D5]"
          }`}
          title={`${s.label}: ${s.desc}`}
        />
      ))}
    </div>
  );
}
