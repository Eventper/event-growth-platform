import { Badge } from "@/components/ui/badge";

// The shared "Why this email" trust report shape, produced by the unified
// comms-core and attached to every communication (draft metadata.trust on the
// Growth side, communication.trust on the Comms side).
export interface TrustReport {
  engines: Array<{ id: string; name: string; role: string; accent: string }>;
  recipientProfile: string;
  chosenAngle: string;
  consideredAngles: Array<{ angle: string; why: string; chosen: boolean }>;
  tone: string;
  scorecard: {
    overall: number;
    passed: boolean;
    dimensions: Array<{ key: string; label: string; hint: string; score: number }>;
  };
}

export const scoreColor = (s: number) => (s >= 80 ? "#4A9E6A" : s >= 60 ? "#6E2433" : "#C74A4A");

// Renders the branded engines, the angle chosen vs the ones rejected, and the
// quality scorecard. Used on both the Growth approval queue and the Comms
// page so the "trust layer" looks identical wherever a communication appears.
export function TrustPanel({ trust }: { trust: TrustReport }) {
  const rejected = (trust.consideredAngles || []).filter((a) => !a.chosen);
  const sc = trust.scorecard;
  return (
    <div className="space-y-4">
      {/* Engines that touched this communication */}
      {trust.engines?.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Engines used</p>
          <div className="flex flex-wrap gap-1.5">
            {trust.engines.map((e) => (
              <span
                key={e.id}
                title={e.role}
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border"
                style={{ color: e.accent, borderColor: `${e.accent}55`, backgroundColor: `${e.accent}14` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.accent }} />
                {e.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* The angle we chose */}
      {trust.chosenAngle && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">The angle we chose</p>
          <p className="text-sm">{trust.chosenAngle}</p>
          {trust.tone && <p className="text-xs text-muted-foreground mt-0.5">Tone: {trust.tone}</p>}
        </div>
      )}

      {/* Angles we rejected — the reasoning made visible */}
      {rejected.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Angles we considered &amp; rejected</p>
          <ul className="space-y-1.5">
            {rejected.map((a, i) => (
              <li key={i} className="text-xs">
                <span className="line-through text-muted-foreground">{a.angle}</span>
                {a.why && <span className="text-muted-foreground"> — {a.why}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quality scorecard */}
      {sc && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Quality scorecard</p>
            <span className="text-sm font-bold" style={{ color: scoreColor(sc.overall) }}>{sc.overall}/100</span>
            <Badge variant={sc.passed ? "default" : "destructive"} className="text-[10px] h-4">
              {sc.passed ? "Passed" : "Below bar"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {(sc.dimensions || []).map((d) => (
              <div key={d.key} title={d.hint} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-24 shrink-0 truncate">{d.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${d.score}%`, backgroundColor: scoreColor(d.score) }} />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground w-6 text-right">{d.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
