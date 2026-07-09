// ── Communications core ─────────────────────────────────────────────────────
// The single generation engine both surfaces call: the AI-Communications page
// AND Elizabeth's autonomous outreach. Given a brand context, a recipient, an
// objective, an (optional) persona + theme, and institutional memory, it runs
// the full pipeline — reasoning strategy → write → quality gate → themed HTML —
// and returns a structured, scored, branded communication.
//
// This is what "unify the core" means: Growth outreach stops using a thin
// prompt and gets the same reasoning + quality + persona + brand system as the
// editorial engine, sharing one implementation.

import {
  buildCommunicationStrategy,
  generateEmail,
  refineEmail,
  runQualityGate,
  inferLayoutType,
  resolveCtaUrl,
  resolveCampaignLink,
  type RecipientIntelligence,
  type CommunicationObjective,
  type CommunicationStrategy,
} from "./ai-communications-engine";
import { buildEmailHtml, resolveTheme, resolveSmartCta, type BrandTheme } from "./email-design-system";
import { publicEngine, buildScorecard } from "./engines";

export interface CommsInput {
  ownerId: string;
  brand: any; // client-shaped: { name, brandVoice, approvedPhrases, bannedPhrases, commercialRules, sector, brandPositioning, websiteUrl, ... }
  campaign?: any; // optional campaign-shaped context (objective, keyMessages, approvedLinks, ...)
  recipient: RecipientIntelligence;
  objective: CommunicationObjective;
  persona?: any;
  theme?: BrandTheme;
  themeRow?: any;
  memoryContext?: string;
}

export interface CommsResult {
  subject: string;
  preheader?: string;
  headline?: string;
  body: string;
  html: string;
  layoutType: string;
  ctaLabel: string;
  ctaUrl: string;
  themeName: string;
  strategy: CommunicationStrategy;
  quality: any;
  reasoningSummary: string;
  trust: TrustReport;
  cost: number;
}

// The user-facing "why this communication" report — branded engines, the angle
// that was chosen vs the ones rejected, and the quality scorecard. This is the
// single shape both the AI-Comms page and the Growth approval queue render.
export interface TrustReport {
  engines: Array<{ id: string; name: string; role: string; accent: string }>;
  recipientProfile: string;
  chosenAngle: string;
  consideredAngles: Array<{ angle: string; why: string; chosen: boolean }>;
  tone: string;
  scorecard: ReturnType<typeof buildScorecard>;
}

function buildTrust(strategy: CommunicationStrategy, quality: any): TrustReport {
  return {
    // Every communication is reasoned, written, then graded — three engines.
    engines: [publicEngine("reasoning"), publicEngine("editorial"), publicEngine("quality")],
    recipientProfile: strategy.recipientProfile || "",
    chosenAngle: strategy.storyAngle || "",
    consideredAngles: strategy.consideredAngles || [],
    tone: strategy.tone || "",
    scorecard: buildScorecard(quality),
  };
}

export async function generateCommunication(input: CommsInput): Promise<CommsResult> {
  const { brand, campaign, recipient, objective, persona, memoryContext } = input;

  // 1. Reason about strategy (memory-aware)
  const { strategy, cost: c1 } = await buildCommunicationStrategy(brand, campaign, recipient, objective, persona, memoryContext);

  // 2. Write from the strategy
  let { email, cost: c2 } = await generateEmail(strategy, brand, campaign, recipient, persona);
  let cost = c1 + c2;

  // 3. Score it — refine up to twice if it fails the quality gate
  let quality = runQualityGate(email.subject, email.body, strategy, brand, campaign);
  let attempts = 0;
  while (!quality.passed && attempts < 2) {
    attempts++;
    const refined = await refineEmail(strategy, (quality.feedback || []).join("\n"), recipient.name);
    email = refined.email;
    cost += refined.cost;
    quality = runQualityGate(email.subject, email.body, strategy, brand, campaign);
  }

  // 4. Theme + smart CTA + branded HTML
  const layoutType = inferLayoutType(recipient, objective);
  const theme = input.theme || resolveTheme(brand, campaign, input.themeRow);
  const ctaLabel = strategy.cta || resolveSmartCta(layoutType, recipient.role);
  const ctaUrl = resolveCtaUrl(brand, campaign);
  const campaignLink = resolveCampaignLink(campaign);
  const content = {
    subject: email.subject,
    preheader: email.preheader,
    headline: email.headline || email.subject,
    opening: email.opening,
    paragraphs: email.paragraphs,
    story: email.story,
    signature: email.signature,
    clientName: brand?.name || "",
    websiteUrl: brand?.websiteUrl || undefined,
    campaignLinkLabel: campaignLink.label,
    campaignLinkUrl: campaignLink.url,
  };
  const html = buildEmailHtml(layoutType, content, theme, { label: ctaLabel, url: ctaUrl });

  const reasoningSummary = `${strategy.recipientProfile} — angle: ${strategy.storyAngle}`;

  return {
    subject: email.subject,
    preheader: email.preheader,
    headline: email.headline,
    body: email.body,
    html,
    layoutType,
    ctaLabel,
    ctaUrl,
    themeName: theme.name,
    strategy,
    quality,
    reasoningSummary,
    trust: buildTrust(strategy, quality),
    cost,
  };
}
