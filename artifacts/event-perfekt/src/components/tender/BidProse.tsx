// Renders a drafted bid section the way the buyer will read it: Poppins, clear
// headings, generous white space and bullet points. Deliberately dependency-free
// and XSS-safe — it parses a small, known subset of Markdown into React elements
// (no dangerouslySetInnerHTML), so AI-generated prose can never inject markup.
import { POPPINS_STACK } from "./ui";

// Inline **bold** → <strong>; everything else stays literal text.
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p)
      ? <strong key={i} style={{ color: "#fff", fontWeight: 700 }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export default function BidProse({ content }: { content: string }) {
  const lines = (content || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${key++}`} style={{ margin: "6px 0 12px", paddingLeft: 22, display: "grid", gap: 4 }}>
        {bullets.map((b, i) => <li key={i} style={{ lineHeight: 1.6 }}>{renderInline(b)}</li>)}
      </ul>
    );
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) { flushBullets(); continue; }

    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    const bullet = trimmed.match(/^([-*•])\s+(.*)$/);

    if (h) {
      flushBullets();
      const level = h[1].length;
      const size = level <= 1 ? 19 : level === 2 ? 16 : 14;
      blocks.push(
        <div key={`h-${key++}`} style={{ color: "#fff", fontWeight: 700, fontSize: size, margin: "16px 0 6px", lineHeight: 1.3 }}>
          {renderInline(h[2])}
        </div>
      );
    } else if (bullet) {
      bullets.push(bullet[2]);
    } else {
      flushBullets();
      blocks.push(
        <p key={`p-${key++}`} style={{ margin: "0 0 12px", lineHeight: 1.7 }}>{renderInline(trimmed)}</p>
      );
    }
  }
  flushBullets();

  return (
    <div style={{ fontFamily: POPPINS_STACK, fontSize: 15, color: "#e5edf7", wordBreak: "break-word" }}>
      {blocks}
    </div>
  );
}
