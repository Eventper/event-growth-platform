import { Sparkles } from "lucide-react";

// Summon Elizabeth with a seeded ask from anywhere. She opens with the prompt
// pre-filled — the human still reviews and sends, keeping judgement in the loop.
export function handToElizabeth(prompt?: string) {
  window.dispatchEvent(new CustomEvent("elizabeth:open", { detail: { prompt } }));
}

export default function HandToElizabeth({
  prompt,
  label = "Hand to Elizabeth",
  className = "",
}: {
  prompt?: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={() => handToElizabeth(prompt)}
      className={
        "inline-flex items-center gap-1.5 text-[12px] font-medium text-burgundy hover:text-burgundy/80 transition-colors " +
        className
      }
    >
      <Sparkles className="w-3.5 h-3.5 text-champagne" />
      {label}
    </button>
  );
}
