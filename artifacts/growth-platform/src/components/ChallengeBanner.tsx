import { useState } from "react";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChallengeBannerProps {
  suggestion: string;
  reasoning: string;
  current: any;
  onKeep: () => void;
  onRevise: () => void;
}

export default function ChallengeBanner({ suggestion, reasoning, current, onKeep, onRevise }: ChallengeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-amber-900">
            {suggestion}
          </p>
          <p className="text-[12px] text-amber-800/80 mt-1 leading-relaxed">
            {reasoning} Current: <strong>{current}</strong>
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[12px] border-amber-300 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
              onClick={() => { setDismissed(true); onKeep(); }}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Keep my choice
            </Button>
            <Button
              size="sm"
              className="h-7 text-[12px] bg-amber-700 text-white hover:bg-amber-800"
              onClick={() => { setDismissed(true); onRevise(); }}
            >
              Revise
            </Button>
          </div>
        </div>
        <button
          className="shrink-0 text-amber-600 hover:text-amber-800"
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
