import { useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, ArrowRight } from "lucide-react";

// Goal Mode — a single calm prompt that assembles a workflow. Each goal maps to
// the destination where that work begins, so picking one drops the user straight
// into the right starting point rather than a form.
type Goal = { label: string; href: string; keywords: string[] };

const GOALS: Goal[] = [
  { label: "Sell out my event", href: "/discovery", keywords: ["sell", "tickets", "fill", "attend"] },
  { label: "Find sponsors", href: "/sponsors", keywords: ["sponsor", "partner money", "funding"] },
  { label: "Increase registrations", href: "/outreach", keywords: ["registration", "sign up", "rsvp", "register"] },
  { label: "Grow awareness", href: "/pr-pipeline", keywords: ["awareness", "reach", "brand", "visibility"] },
  { label: "Secure media coverage", href: "/pr-pipeline", keywords: ["media", "press", "coverage", "journalist", "pr"] },
  { label: "Launch a campaign", href: "/wizard", keywords: ["launch", "campaign", "new event", "start"] },
  { label: "Build partnerships", href: "/corporate-targets", keywords: ["partnership", "partner", "corporate", "collaborat"] },
];

export default function GoalBar() {
  const [, navigate] = useLocation();
  const [text, setText] = useState("");

  function go(href: string) {
    navigate(href);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim().toLowerCase();
    if (!q) return;
    const match = GOALS.find((g) => g.keywords.some((k) => q.includes(k)) || q.includes(g.label.toLowerCase()));
    go(match?.href ?? "/insights");
  }

  return (
    <div className="rounded-2xl bg-card text-card-foreground p-5 shadow-soft animate-fade-rise">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-champagne" />
        <p className="text-[13px] font-medium text-foreground">What would you like to achieve today?</p>
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 mb-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell Elizabeth a goal — or pick one below"
          className="flex-1 px-4 py-2.5 text-[13px] bg-surface rounded-full border border-border outline-none focus:border-champagne/50 transition-colors text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-medium text-white bg-burgundy hover:bg-burgundy/90 rounded-full px-4 py-2.5 transition-colors"
        >
          Go <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {GOALS.map((g) => (
          <button
            key={g.label}
            onClick={() => go(g.href)}
            className="text-[12px] font-medium px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-hover text-foreground border border-border transition-colors"
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
