import React from "react";

/**
 * Executive Header — the standard top of every workspace (v1.0).
 * Sits directly on the burgundy workspace, so text is light.
 * Editorial heading + advisor-written summary + status/prepared-by + actions.
 */
export function PageHeader({
  eyebrow = "Growth Intelligence",
  title,
  intro,
  preparedAt,
  actions,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  preparedAt?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 animate-fade-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-champagne">
              {eyebrow}
            </span>
          )}
          <h1 className="font-heading text-[34px] leading-[1.1] text-ivory mt-1.5">{title}</h1>
          {intro && <p className="text-[15px] text-ivory/75 mt-3 max-w-2xl leading-relaxed">{intro}</p>}
          {preparedAt && (
            <p className="text-[12px] text-ivory/50 mt-3 italic">Prepared by your Growth Advisor · {preparedAt}</p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-5 h-px bg-ivory/15" />
    </div>
  );
}

export default PageHeader;
