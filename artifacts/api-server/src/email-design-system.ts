// ════════════════════════════════════════════════════════════════════════════
// Email Design System
// ────────────────────────────────────────────────────────────────────────────
// The single source of truth for how a communication is *rendered*. The AI
// produces structured content (headline, opening, paragraphs, story); this
// module composes that content into a premium, branded, modular email.
//
// Principles (from the product brief):
//   • Reusable brand themes — presets + per-client custom themes (SaaS).
//   • Modular blocks composed into distinct layouts per message type.
//   • Exactly ONE smart, context-aware CTA. Never a generic button.
//   • Never an information dump (no date / venue / ticket / price footers).
//   • Never expose pricing unless the campaign explicitly enables it.
//   • Inline-styled, table-based HTML for email-client safety.
// ════════════════════════════════════════════════════════════════════════════

export interface BrandTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: number; // px
  logoUrl?: string | null;
  logoPlacement: "left" | "center" | "right" | "none";
  buttonStyle: "solid" | "outline" | "pill" | "minimal";
  emailWidth: number; // px
  headerStyle: "minimal" | "banner" | "logo_only" | "hero";
  footerStyle: "minimal" | "standard" | "branded";
  heroImageUrl?: string | null;
  photographyStyle?: string | null;
}

// ── Built-in presets ─────────────────────────────────────────────────────────
export const BRAND_PRESETS: Record<"luxury" | "corporate" | "creative", BrandTheme> = {
  luxury: {
    name: "Luxury",
    primaryColor: "#4B1E2F", // deep burgundy
    secondaryColor: "#6E2A3F",
    accentColor: "#C9A961", // champagne gold
    backgroundColor: "#FBF7F0", // soft ivory
    surfaceColor: "#FFFFFF",
    textColor: "#2A0A15",
    mutedTextColor: "#8A7B6F",
    fontHeading: "Georgia, 'Times New Roman', serif",
    fontBody: "'Helvetica Neue', Arial, sans-serif",
    borderRadius: 4,
    logoPlacement: "center",
    buttonStyle: "pill",
    emailWidth: 600,
    headerStyle: "hero",
    footerStyle: "branded",
    photographyStyle: "editorial",
  },
  corporate: {
    name: "Corporate",
    primaryColor: "#0F2A4A", // navy
    secondaryColor: "#1E3A5F",
    accentColor: "#2563EB", // clean blue
    backgroundColor: "#FFFFFF",
    surfaceColor: "#F7F9FC",
    textColor: "#0F172A",
    mutedTextColor: "#64748B",
    fontHeading: "'Helvetica Neue', Arial, sans-serif",
    fontBody: "'Helvetica Neue', Arial, sans-serif",
    borderRadius: 6,
    logoPlacement: "left",
    buttonStyle: "solid",
    emailWidth: 600,
    headerStyle: "banner",
    footerStyle: "standard",
    photographyStyle: "clean",
  },
  creative: {
    name: "Creative",
    primaryColor: "#1A1A2E",
    secondaryColor: "#16213E",
    accentColor: "#E94560", // bold
    backgroundColor: "#FFFFFF",
    surfaceColor: "#FAFAFA",
    textColor: "#1A1A2E",
    mutedTextColor: "#6B7280",
    fontHeading: "'Poppins', 'Helvetica Neue', Arial, sans-serif",
    fontBody: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    borderRadius: 16,
    logoPlacement: "center",
    buttonStyle: "pill",
    emailWidth: 600,
    headerStyle: "hero",
    footerStyle: "minimal",
    photographyStyle: "bold",
  },
};

const DEFAULT_THEME = BRAND_PRESETS.luxury;

// ── Smart CTAs ─────────────────────────────────────────────────────────────
// Label changes with the communication / recipient. Never generic.
const MESSAGE_TYPE_CTAS: Record<string, string> = {
  referral: "Meet the Room",
  sponsor_pitch: "Explore Partnership",
  corporate_partnership: "Request the Information Pack",
  pr_pitch: "Read the Story",
  press_response: "Read the Story",
  guest_invitation: "Request Access",
  speaker_invitation: "Discuss the Programme",
  sales_outreach: "Book a Call",
  linkedin_dm: "Start a Conversation",
  follow_up: "Continue the Conversation",
  thank_you: "Stay Close",
  proposal_cover: "Review the Proposal",
  investor_update: "Read the Update",
  community_announcement: "Learn More",
};

const RECIPIENT_TYPE_CTAS: Record<string, string> = {
  referral: "Meet the Room",
  sponsor: "Explore Partnership",
  pr: "Read the Story",
  guest: "Request Access",
  corporate: "Request the Information Pack",
};

/** Resolve the smart CTA label. Recipient type wins, then message type. */
export function resolveSmartCta(messageType: string, recipientType?: string): string {
  if (recipientType && RECIPIENT_TYPE_CTAS[recipientType]) return RECIPIENT_TYPE_CTAS[recipientType];
  return MESSAGE_TYPE_CTAS[messageType] || "Learn More";
}

// ── Theme resolution ─────────────────────────────────────────────────────────
function presetForBrandVoice(brandVoice?: string): BrandTheme {
  switch ((brandVoice || "").toLowerCase()) {
    case "luxury": return BRAND_PRESETS.luxury;
    case "corporate":
    case "technical":
    case "minimal": return BRAND_PRESETS.corporate;
    case "creative":
    case "warm": return BRAND_PRESETS.creative;
    default: return BRAND_PRESETS.luxury;
  }
}

/** Merge a partial (e.g. a DB theme row) over the default so renderers never see undefined. */
export function mergeTheme(partial: Partial<BrandTheme> | null | undefined, base: BrandTheme = DEFAULT_THEME): BrandTheme {
  if (!partial) return { ...base };
  const merged: any = { ...base };
  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined && v !== null && v !== "") merged[k] = v;
  }
  return merged as BrandTheme;
}

/**
 * Campaign branding is inherited automatically:
 *   campaign theme row → client default theme row → preset from client.brandVoice.
 * `themeRow` is whichever theme was loaded from the DB for this send (may be null).
 */
export function resolveTheme(client: any, campaign: any, themeRow?: any): BrandTheme {
  if (themeRow) return mergeTheme(themeRow);
  return presetForBrandVoice(client?.brandVoice);
}

// ── Low-level helpers ─────────────────────────────────────────────────────────
function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Black or white text that reads on the given background colour. */
function readableOn(bg: string): string {
  const c = (bg || "#000000").replace("#", "");
  if (c.length < 6) return "#ffffff";
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1A1A1A" : "#FFFFFF";
}

function row(inner: string): string {
  return `<tr><td>${inner}</td></tr>`;
}

// ── Block renderers ───────────────────────────────────────────────────────────
// Each returns a `<tr>` to sit inside the centred content table.

function renderHeader(theme: BrandTheme, clientName: string): string {
  if (theme.logoPlacement === "none" && !theme.logoUrl) return "";
  const align = theme.logoPlacement === "none" ? "center" : theme.logoPlacement;
  const banner = theme.headerStyle === "banner";
  const bg = banner ? theme.primaryColor : "transparent";
  const brandColor = banner ? readableOn(theme.primaryColor) : theme.mutedTextColor;
  const inner = theme.logoUrl
    ? `<img src="${esc(theme.logoUrl)}" alt="${esc(clientName)}" height="36" style="display:inline-block;max-height:36px;border:0;outline:none;" />`
    : `<span style="font-family:${theme.fontHeading};font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${brandColor};">${esc(clientName)}</span>`;
  return row(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};">
      <tr><td align="${align}" style="padding:24px 32px;">${inner}</td></tr>
    </table>`
  );
}

function renderHero(theme: BrandTheme, imageUrl?: string | null): string {
  if (!imageUrl) return "";
  return row(
    `<img src="${esc(imageUrl)}" alt="" width="${theme.emailWidth}" style="display:block;width:100%;max-width:${theme.emailWidth}px;height:auto;border:0;outline:none;" />`
  );
}

function renderHeadline(theme: BrandTheme, text: string): string {
  if (!text) return "";
  return row(
    `<div style="padding:32px 40px 0;">
      <h1 style="margin:0;font-family:${theme.fontHeading};font-size:30px;line-height:1.2;font-weight:600;color:${theme.primaryColor};">${esc(text)}</h1>
    </div>`
  );
}

function renderOpening(theme: BrandTheme, text: string): string {
  if (!text) return "";
  return row(
    `<div style="padding:20px 40px 0;">
      <p style="margin:0;font-family:${theme.fontBody};font-size:18px;line-height:1.6;color:${theme.textColor};">${esc(text)}</p>
    </div>`
  );
}

function renderBody(theme: BrandTheme, paragraphs: string[]): string {
  const ps = (paragraphs || []).filter(Boolean);
  if (!ps.length) return "";
  const html = ps
    .map(p => `<p style="margin:0 0 16px;font-family:${theme.fontBody};font-size:16px;line-height:1.7;color:${theme.textColor};">${esc(p)}</p>`)
    .join("");
  return row(`<div style="padding:20px 40px 0;">${html}</div>`);
}

function renderStory(theme: BrandTheme, text: string): string {
  if (!text) return "";
  return row(
    `<div style="padding:24px 40px 0;">
      <blockquote style="margin:0;padding:4px 0 4px 20px;border-left:3px solid ${theme.accentColor};font-family:${theme.fontHeading};font-size:18px;line-height:1.6;font-style:italic;color:${theme.secondaryColor};">${esc(text)}</blockquote>
    </div>`
  );
}

function renderCta(theme: BrandTheme, label: string, url: string): string {
  if (!label || !url) return "";
  const radius = theme.buttonStyle === "pill" ? 999 : theme.borderRadius;

  if (theme.buttonStyle === "minimal") {
    return row(
      `<div style="padding:28px 40px 4px;">
        <a href="${esc(url)}" style="font-family:${theme.fontBody};font-size:16px;font-weight:600;color:${theme.accentColor};text-decoration:none;">${esc(label)} &rarr;</a>
      </div>`
    );
  }

  const outline = theme.buttonStyle === "outline";
  const bg = outline ? "transparent" : theme.accentColor;
  const fg = outline ? theme.accentColor : readableOn(theme.accentColor);
  const border = outline ? `2px solid ${theme.accentColor}` : "none";

  return row(
    `<div style="padding:28px 40px 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:${radius}px;background:${bg};">
        <a href="${esc(url)}" style="display:inline-block;padding:14px 32px;border:${border};border-radius:${radius}px;font-family:${theme.fontBody};font-size:15px;font-weight:600;letter-spacing:0.3px;color:${fg};text-decoration:none;">${esc(label)}</a>
      </td></tr></table>
    </div>`
  );
}

/** One short supporting line, optionally linking to the campaign page. NEVER pricing / venue / date. */
function renderSupporting(theme: BrandTheme, text?: string, linkLabel?: string, linkUrl?: string): string {
  if (!text && !(linkLabel && linkUrl)) return "";
  const link = linkLabel && linkUrl
    ? ` <a href="${esc(linkUrl)}" style="color:${theme.accentColor};text-decoration:none;">${esc(linkLabel)}</a>`
    : "";
  return row(
    `<div style="padding:24px 40px 0;">
      <p style="margin:0;font-family:${theme.fontBody};font-size:13px;line-height:1.6;color:${theme.mutedTextColor};">${esc(text || "")}${link}</p>
    </div>`
  );
}

function renderSignature(theme: BrandTheme, sig?: { name?: string; title?: string; org?: string }): string {
  if (!sig || (!sig.name && !sig.title && !sig.org)) return "";
  const lines = [
    sig.name ? `<span style="font-weight:600;color:${theme.textColor};">${esc(sig.name)}</span>` : "",
    sig.title ? `<span style="color:${theme.mutedTextColor};">${esc(sig.title)}</span>` : "",
    sig.org ? `<span style="color:${theme.mutedTextColor};">${esc(sig.org)}</span>` : "",
  ].filter(Boolean).join("<br/>");
  return row(
    `<div style="padding:32px 40px 8px;">
      <p style="margin:0;font-family:${theme.fontBody};font-size:15px;line-height:1.6;">${lines}</p>
    </div>`
  );
}

function renderFooter(theme: BrandTheme, opts: { clientName: string; websiteUrl?: string; unsubscribeUrl?: string }): string {
  const branded = theme.footerStyle === "branded";
  const bg = branded ? theme.primaryColor : theme.surfaceColor;
  const textCol = branded ? readableOn(theme.primaryColor) : theme.mutedTextColor;
  const linkCol = branded ? theme.accentColor : theme.accentColor;

  if (theme.footerStyle === "minimal") {
    return row(
      `<div style="padding:32px 40px;border-top:1px solid ${theme.backgroundColor};text-align:center;">
        ${opts.unsubscribeUrl ? `<a href="${esc(opts.unsubscribeUrl)}" style="font-family:${theme.fontBody};font-size:11px;color:${theme.mutedTextColor};text-decoration:underline;">Unsubscribe</a>` : ""}
      </div>`
    );
  }

  const website = opts.websiteUrl
    ? `<a href="${esc(opts.websiteUrl)}" style="color:${linkCol};text-decoration:none;">${esc(opts.websiteUrl.replace(/^https?:\/\//, ""))}</a>`
    : "";
  const unsub = opts.unsubscribeUrl
    ? ` &middot; <a href="${esc(opts.unsubscribeUrl)}" style="color:${textCol};text-decoration:underline;">Unsubscribe</a>`
    : "";
  return row(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};margin-top:40px;">
      <tr><td align="center" style="padding:28px 40px;">
        <p style="margin:0;font-family:${theme.fontBody};font-size:12px;line-height:1.6;color:${textCol};">
          ${esc(opts.clientName)}${website ? " &middot; " + website : ""}${unsub}
        </p>
      </td></tr>
    </table>`
  );
}

// ── Layouts ─────────────────────────────────────────────────────────────────
// Each message type composes a distinct set of blocks in a distinct order.
type BlockName = "header" | "hero" | "headline" | "opening" | "story" | "body" | "cta" | "supporting" | "signature" | "footer";

const LAYOUTS: Record<string, BlockName[]> = {
  pr_pitch:               ["header", "headline", "opening", "story", "body", "cta", "signature", "footer"],
  press_response:         ["header", "headline", "opening", "story", "body", "cta", "signature", "footer"],
  sponsor_pitch:          ["header", "hero", "headline", "opening", "body", "cta", "supporting", "signature", "footer"],
  corporate_partnership:  ["header", "hero", "headline", "opening", "body", "cta", "supporting", "signature", "footer"],
  guest_invitation:       ["header", "hero", "headline", "opening", "body", "cta", "supporting", "footer"],
  speaker_invitation:     ["header", "hero", "headline", "opening", "body", "cta", "signature", "footer"],
  thank_you:              ["header", "headline", "opening", "body", "signature", "footer"],
  follow_up:              ["header", "headline", "opening", "body", "cta", "signature", "footer"],
  linkedin_dm:            ["headline", "opening", "body", "cta"],
  sales_outreach:         ["header", "headline", "opening", "body", "cta", "signature", "footer"],
  proposal_cover:         ["header", "headline", "opening", "body", "cta", "signature", "footer"],
  investor_update:        ["header", "headline", "opening", "body", "cta", "signature", "footer"],
  community_announcement: ["header", "hero", "headline", "opening", "body", "cta", "footer"],
};

const DEFAULT_LAYOUT: BlockName[] = ["header", "headline", "opening", "body", "cta", "signature", "footer"];

export interface EmailContent {
  subject: string;
  preheader?: string;
  headline?: string;
  opening?: string;
  paragraphs?: string[];
  story?: string;
  signature?: { name?: string; title?: string; org?: string };
  supportingText?: string;
  heroImageUrl?: string | null;
  clientName?: string;
  websiteUrl?: string;
  unsubscribeUrl?: string;
  campaignLinkLabel?: string; // e.g. "View event details"
  campaignLinkUrl?: string;
}

export interface SmartCta {
  label: string;
  url: string;
}

/** Compose the final, themed, modular HTML email. Replaces the old single-layout builder. */
export function buildEmailHtml(
  messageType: string,
  content: EmailContent,
  theme: BrandTheme,
  cta: SmartCta
): string {
  const layout = LAYOUTS[messageType] || DEFAULT_LAYOUT;
  const clientName = content.clientName || "";
  const heroUrl = content.heroImageUrl || theme.heroImageUrl;

  const blocks: Record<BlockName, () => string> = {
    header: () => renderHeader(theme, clientName),
    hero: () => renderHero(theme, heroUrl),
    headline: () => renderHeadline(theme, content.headline || content.subject),
    opening: () => renderOpening(theme, content.opening || ""),
    body: () => renderBody(theme, content.paragraphs || []),
    story: () => renderStory(theme, content.story || ""),
    cta: () => renderCta(theme, cta.label, cta.url),
    supporting: () => renderSupporting(theme, content.supportingText, content.campaignLinkLabel, content.campaignLinkUrl),
    signature: () => renderSignature(theme, content.signature),
    footer: () => renderFooter(theme, { clientName, websiteUrl: content.websiteUrl, unsubscribeUrl: content.unsubscribeUrl }),
  };

  const rows = layout.map(b => blocks[b]()).join("\n");

  const preheader = content.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(content.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(content.subject)}</title></head>
<body style="margin:0;padding:0;background:${theme.backgroundColor};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.backgroundColor};">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="${theme.emailWidth}" cellpadding="0" cellspacing="0" style="width:100%;max-width:${theme.emailWidth}px;background:${theme.surfaceColor};border-radius:${theme.borderRadius}px;overflow:hidden;">
      ${rows}
    </table>
  </td></tr>
</table>
</body></html>`;
}
