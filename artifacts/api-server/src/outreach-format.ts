// ── Outreach formatting & readability — one shared layer for ALL outreach ────
// Every outreach email (guest, sponsor/partner, media/PR, hotel, civic, introducer,
// referral, follow-ups, manual previews) must read clean, premium and easy to scan.
//
// This module holds the GLOBAL rules in one place so no category can drift:
//   • normalizeOutreachText()  — auto-FIX: sentence capitals, bullet capitals,
//                                clean spacing. Applied at the render choke points
//                                (bodyToHtml / nl2brHtml) so it covers bodies from
//                                every origin (hardcoded template, DB template, AI,
//                                hand-pasted) on every send path.
//   • findOutreachContentIssues() — BLOCK: unresolved placeholders, bad dummy data,
//                                duplicate sign-off, marketing/unsubscribe footer,
//                                phone on a cold guest first-touch. Used by the send
//                                gate and the AI-send routes that bypass the gate.
//
// Signature/sign-off assembly itself lives in growth-outreach-config.appendSignoff
// (strips any existing sign-off, appends exactly one). This module only VALIDATES
// that the body it is handed does not already carry a second sign-off or a footer.

// ── Placeholder rule ─────────────────────────────────────────────────────────
// Block BOTH formats: double-brace {{field}} AND single-brace {Field}. Single
// source of truth — the send gate and the builders import this instead of
// re-declaring their own copy (they used to drift).
export const OUTREACH_PLACEHOLDER_RE = /\{\{\s*[\w.]+\s*\}\}|\{\s*[A-Za-z][\w.\s]*\}/;

// Approved Champion ask phrase. Champion outreach is manually reviewed and must not
// sound like operational work — this is the single approved framing to use.
export const CHAMPION_ASK_PHRASE =
  "At this stage, the ask is simply to explore whether you would consider lending " +
  "your perspective to the founding room and helping us position the conversation " +
  "at the level it deserves.";

// ── Normalizer (auto-fix) ────────────────────────────────────────────────────

// Abbreviations that end in "." but do NOT end a sentence — never capitalise the
// following word after these.
const SENTENCE_ABBREV = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "eg", "ie",
  "no", "vol", "pp", "approx", "dept", "inc", "ltd", "co", "uk", "us", "e.g", "i.e",
  "re", "cf", "al", "ca", "no", "nos", "figs", "fig",
]);

// Capital letter at the start of the text and at the start of every new sentence
// (after . ! ?). Never touches URLs/emails/decimals (their dots have no following
// whitespace) and skips known abbreviations.
function capitalizeSentences(text: string): string {
  // Very first visible letter of the body.
  let out = text.replace(/^(\s*)([a-z])/, (_m, pre, ch) => pre + ch.toUpperCase());
  // First letter after sentence-ending punctuation + whitespace.
  out = out.replace(/([.!?])([ \t]+|\n+)([a-z])/g, (m, punc, gap, ch, offset: number, str: string) => {
    if (punc === ".") {
      const before = str.slice(0, offset);
      const wm = before.match(/([A-Za-z]+)$/);
      if (wm && SENTENCE_ABBREV.has(wm[1].toLowerCase())) return m; // abbreviation — leave as-is
    }
    return punc + gap + ch.toUpperCase();
  });
  return out;
}

// Capital letter at the start of every bullet point. Preserves a leading emphasis /
// quote marker (e.g. "**Named** …" stays bold; the "N" is capitalised).
function capitalizeBullets(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\s*[-*•]\s+)(.*)$/);
      if (!m) return line;
      const [, marker, content] = m;
      const cm = content.match(/^([*_"'`([]*)([a-z])([\s\S]*)$/);
      if (!cm) return line;
      return marker + cm[1] + cm[2].toUpperCase() + cm[3];
    })
    .join("\n");
}

// Clean spacing: normalise newlines, strip trailing whitespace per line, collapse
// 3+ blank lines to a single blank line, and trim leading/trailing blank lines.
function normalizeSpacing(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .replace(/\s+$/, "");
}

// The one global normaliser. Safe to run on a body that already includes the
// appended sign-off (the signature carries no bullets and no sentence-ending dots
// followed by a space, so it is left untouched).
export function normalizeOutreachText(text: string | null | undefined): string {
  if (!text) return "";
  let t = String(text);
  t = capitalizeBullets(t);
  t = capitalizeSentences(t);
  t = normalizeSpacing(t);
  return t;
}

// ── Validator (block) ────────────────────────────────────────────────────────

// Sign-off openers — more than one in a single body means a duplicate sign-off.
const SIGNOFF_RE = /\b(warm regards|kind regards|best regards|best wishes|many thanks|warmly|sincerely)\b/gi;

// The marketing/brand footer line the spec forbids ("Event Perfekt Global ·/| The
// Woman Who Leads The Room"). The approved signature does NOT use this "·"-joined
// form, so its presence is always a duplicate/marketing footer.
const MARKETING_FOOTER_RE = /event\s*perfekt\s*global\s*[·•|]\s*the woman who leads the room/i;

// Marketing unsubscribe / preference-management footer — never allowed.
const UNSUBSCRIBE_RE = /\b(unsubscribe|manage (your )?(email )?preferences|opt[-\s]?out of these emails|email preferences|update your preferences)\b/i;

// Obvious non-name dummy tokens that must never reach a real greeting.
const BAD_DUMMY_NAMES = new Set([
  "cheap", "test", "tester", "testing", "asdf", "qwerty", "xxx", "tbd", "tba",
  "name", "firstname", "first_name", "fname", "foo", "bar", "baz", "lorem",
  "ipsum", "dummy", "placeholder", "null", "undefined", "user", "recipient", "client",
]);
const GREETING_RE = /^\s*(hi|hello|dear|hey)\s+([A-Za-z][\w'-]*)\s*[,.:]/im;

export interface OutreachContentOpts {
  category?: string | null;
  sequencePosition?: number | null;
}

// Returns a list of human-readable blocking reasons. Empty array = clean.
// Mirrors the send gate's wording for the placeholder case so existing callers
// keep the same message.
export function findOutreachContentIssues(
  subject: string | null | undefined,
  body: string | null | undefined,
  opts: OutreachContentOpts = {},
): string[] {
  const issues: string[] = [];
  const s = String(subject || "");
  const b = String(body || "");

  // Unresolved placeholder — subject OR body, both brace formats.
  if (OUTREACH_PLACEHOLDER_RE.test(s) || OUTREACH_PLACEHOLDER_RE.test(b)) {
    issues.push("Merge field error — unresolved placeholder found");
  }

  // Bad dummy data — greeting addressed to a non-name token (e.g. "Hi Cheap,").
  const g = b.match(GREETING_RE);
  if (g && BAD_DUMMY_NAMES.has(g[2].toLowerCase())) {
    issues.push(`Bad dummy data — greeting name "${g[2]}" is not a real recipient`);
  }

  // One sign-off only (count in the body; subjects never carry a sign-off).
  const signoffs = (b.match(SIGNOFF_RE) || []).length;
  if (signoffs > 1) {
    issues.push("Duplicate sign-off — an outreach email must have exactly one");
  }

  // No marketing unsubscribe footer, no duplicate brand footer line.
  const combined = `${s}\n${b}`;
  if (UNSUBSCRIBE_RE.test(combined)) {
    issues.push("Marketing/unsubscribe footer is not allowed");
  }
  if (MARKETING_FOOTER_RE.test(combined)) {
    issues.push("Duplicate brand footer line is not allowed");
  }

  // No phone number on a cold guest first-touch email.
  const category = String(opts.category || "").toLowerCase();
  const position = Number(opts.sequencePosition || 1);
  if (category === "guest" && position <= 1 && /\b0\d[\d\s]{7,}\d\b/.test(b)) {
    issues.push("Phone number must not appear on a cold guest first-touch email");
  }

  return issues;
}
