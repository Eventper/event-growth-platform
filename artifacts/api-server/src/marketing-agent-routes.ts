import { type Express, Request, Response } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { authenticateToken } from "./auth";

const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY?.length || 0) > 50
  ? process.env.ANTHROPIC_API_KEY
  : (process.env.ANTROPIC_API_KEY?.length || 0) > 50
    ? process.env.ANTROPIC_API_KEY
    : process.env.ANTHROPIC_API_KEY || process.env.ANTROPIC_API_KEY;

// ── Helper: call Anthropic API via fetch ───────────────────────────────────
async function callClaude(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens = 4096,
  model = "claude-opus-4-8"
) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  return data.content?.[0]?.text || "I couldn't process that — please try again.";
}

// ── Fetch current analytics snapshot for the AI context ──────────────────────
async function getAnalyticsSnapshot(days: number = 30) {
  const since = new Date(Date.now() - days * 86400000);

  const [summary, byPage, byCountry, byCity, sources, captures, funnel, ipGeoCoverage, referrers, utmMatrix] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(DISTINCT s.id)::int AS total_sessions,
        COUNT(pv.id)::int AS total_views,
        COUNT(DISTINCT CASE WHEN s.captured_email IS NOT NULL THEN s.captured_email END)::int AS email_captures,
        COUNT(DISTINCT s.country)::int AS countries
      FROM visitor_sessions s
      LEFT JOIN page_views pv ON pv.session_id = s.id AND pv.occurred_at >= ${since}
      WHERE s.first_seen >= ${since} AND (s.is_bot = FALSE OR s.is_bot IS NULL)
    `),
    db.execute(sql`
      SELECT pv.page, COUNT(pv.id)::int AS views
      FROM page_views pv
      JOIN visitor_sessions s ON s.id = pv.session_id
      WHERE pv.occurred_at >= ${since} AND (s.is_bot = FALSE OR s.is_bot IS NULL)
      GROUP BY pv.page ORDER BY views DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT country, COUNT(*)::int AS sessions
      FROM visitor_sessions
      WHERE first_seen >= ${since} AND country IS NOT NULL AND (is_bot = FALSE OR is_bot IS NULL)
      GROUP BY country ORDER BY sessions DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT city, COUNT(*)::int AS sessions
      FROM visitor_sessions
      WHERE first_seen >= ${since} AND country = 'United Kingdom' AND city IS NOT NULL AND city != ''
        AND (is_bot = FALSE OR is_bot IS NULL)
      GROUP BY city ORDER BY sessions DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT
        COALESCE(NULLIF(utm_source, ''), 'direct') AS source,
        COUNT(DISTINCT id)::int AS sessions
      FROM visitor_sessions
      WHERE first_seen >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
      GROUP BY source ORDER BY sessions DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT captured_email, capture_page, captured_at, country, utm_source
      FROM visitor_sessions
      WHERE captured_email IS NOT NULL AND first_seen >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
      ORDER BY captured_at DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT
        COUNT(DISTINCT CASE WHEN event_type='page_visit' THEN session_id END)::int AS visitors,
        COUNT(DISTINCT CASE WHEN event_type='cta_click' THEN session_id END)::int AS cta_clicks,
        COUNT(DISTINCT CASE WHEN event_type='form_start' THEN session_id END)::int AS form_starts,
        COUNT(DISTINCT CASE WHEN event_type='form_complete' THEN session_id END)::int AS form_completes,
        COUNT(DISTINCT CASE WHEN event_type='submit_success' THEN session_id END)::int AS submit_success,
        COUNT(DISTINCT CASE WHEN event_type='payment_view' THEN session_id END)::int AS payment_views
      FROM iamher_funnel_events
      WHERE occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
    `),
    db.execute(sql`
      SELECT
        COUNT(DISTINCT id)::int AS total_sessions,
        COUNT(DISTINCT CASE WHEN ip_address IS NOT NULL AND ip_address != '' THEN id END)::int AS sessions_with_ip,
        COUNT(DISTINCT CASE WHEN country IS NOT NULL AND country != '' THEN id END)::int AS sessions_with_country,
        COUNT(DISTINCT CASE WHEN city IS NOT NULL AND city != '' THEN id END)::int AS sessions_with_city,
        COUNT(DISTINCT CASE WHEN captured_email IS NOT NULL AND captured_email != '' THEN id END)::int AS sessions_with_email
      FROM visitor_sessions
      WHERE first_seen >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
    `),
    db.execute(sql`
      SELECT
        COALESCE(NULLIF(regexp_replace(referrer, '^https?://([^/]+).*', '\\1'), ''), 'direct') AS referrer_domain,
        COUNT(*)::int AS sessions
      FROM visitor_sessions
      WHERE first_seen >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
      GROUP BY referrer_domain
      ORDER BY sessions DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT
        COALESCE(NULLIF(utm_source, ''), 'direct') AS source,
        COALESCE(NULLIF(utm_medium, ''), '(none)') AS medium,
        COALESCE(NULLIF(utm_campaign, ''), '(none)') AS campaign,
        COUNT(DISTINCT id)::int AS sessions
      FROM visitor_sessions
      WHERE first_seen >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
      GROUP BY source, medium, campaign
      ORDER BY sessions DESC
      LIMIT 20
    `),
  ]);

  const coverage = ipGeoCoverage.rows?.[0] || {};
  const totalCoverageSessions = Number(coverage.total_sessions) || 0;
  const pct = (n: any) => totalCoverageSessions > 0 ? Number((((Number(n) || 0) / totalCoverageSessions) * 100).toFixed(1)) : 0;

  return {
    summary: summary.rows?.[0] || {},
    topPages: byPage.rows || [],
    topCountries: byCountry.rows || [],
    topCities: byCity.rows || [],
    topSources: sources.rows || [],
    topReferrers: referrers.rows || [],
    utmMatrix: utmMatrix.rows || [],
    recentCaptures: captures.rows || [],
    funnel: funnel.rows?.[0] || {},
    sourceCoverage: {
      totalSessions: totalCoverageSessions,
      sessionsWithIp: Number(coverage.sessions_with_ip) || 0,
      sessionsWithCountry: Number(coverage.sessions_with_country) || 0,
      sessionsWithCity: Number(coverage.sessions_with_city) || 0,
      sessionsWithEmail: Number(coverage.sessions_with_email) || 0,
      ipCoveragePct: pct(coverage.sessions_with_ip),
      countryCoveragePct: pct(coverage.sessions_with_country),
      cityCoveragePct: pct(coverage.sessions_with_city),
      emailCoveragePct: pct(coverage.sessions_with_email),
    },
    period: `${days} days`,
  };
}

// ── Build analytics context string for Claude system prompt ─────────────────
function buildAnalyticsContext(data: any) {
  const s = data.summary;
  const f = data.funnel;
  const pages = data.topPages.map((p: any) => `${p.page} (${p.views} views)`).join(", ");
  const countries = data.topCountries.map((c: any) => `${c.country} (${c.sessions})`).join(", ");
  const cities = data.topCities.map((c: any) => `${c.city} (${c.sessions})`).join(", ");
  const sources = data.topSources.map((s: any) => `${s.source} (${s.sessions})`).join(", ");
  const captures = data.recentCaptures.map((c: any) => `${c.captured_email} from ${c.country} on ${c.capture_page}`).join("; ");

  return `
CURRENT EVENT PERIOD: ${data.period}

SESSIONS: ${s.total_sessions || 0}
PAGE VIEWS: ${s.total_views || 0}
EMAIL CAPTURES: ${s.email_captures || 0}
COUNTRIES: ${s.countries || 0}

TOP PAGES: ${pages || "N/A"}
TOP COUNTRIES: ${countries || "N/A"}
UK CITIES: ${cities || "N/A"}
TRAFFIC SOURCES: ${sources || "N/A"}
RECENT CAPTURES: ${captures || "None"}

I AM HER FUNNEL:
- Visitors: ${f.visitors || 0}
- CTA clicks: ${f.cta_clicks || 0}
- Form starts: ${f.form_starts || 0}
- Form completes: ${f.form_completes || 0}
- Submit success: ${f.submit_success || 0}
- Payment views: ${f.payment_views || 0}

I AM HER EVENT: 30 October 2026. A day of celebration, networking, and empowerment for women. Capacity: 100. Tickets: Bronze, Silver, Gold, Platinum, Diamond, Table. Bank: Event Perfekt Global Ltd, Account 78253411, Sort Code 04-29-09.
LINKEDIN TRACKING GAP: LinkedIn strips referrer headers by default, so traffic appears as "direct" unless UTM tags are used. Recommend adding ?utm_source=linkedin&utm_medium=social&utm_campaign=iamher-aug26 to all LinkedIn posts.
`;
}

function buildLiveInsights(data: any, days: number) {
  const summary = data.summary || {};
  const funnel = data.funnel || {};
  const sources = Array.isArray(data.topSources) ? data.topSources : [];
  const topPages = Array.isArray(data.topPages) ? data.topPages : [];

  const totalViews = Number(summary.total_views) || 0;
  const totalSessions = Number(summary.total_sessions) || 0;
  const emailCaptures = Number(summary.email_captures) || 0;

  const visitors = Number(funnel.visitors) || 0;
  const ctaClicks = Number(funnel.cta_clicks) || 0;
  const formStarts = Number(funnel.form_starts) || 0;
  const formCompletes = Number(funnel.form_completes) || 0;
  const submitSuccess = Number(funnel.submit_success) || 0;
  const paymentViews = Number(funnel.payment_views) || 0;

  const ctaRate = visitors > 0 ? (ctaClicks / visitors) * 100 : 0;
  const formStartRate = ctaClicks > 0 ? (formStarts / ctaClicks) * 100 : 0;
  const completionRate = formStarts > 0 ? (formCompletes / formStarts) * 100 : 0;
  const submitRate = visitors > 0 ? (submitSuccess / visitors) * 100 : 0;
  const emailCaptureRate = totalSessions > 0 ? (emailCaptures / totalSessions) * 100 : 0;

  const totalSourceSessions = sources.reduce((sum: number, s: any) => sum + (Number(s.sessions) || 0), 0);
  const directSource = sources.find((s: any) => String(s.source || "").toLowerCase() === "direct");
  const directSessions = Number(directSource?.sessions) || 0;
  const directShare = totalSourceSessions > 0 ? (directSessions / totalSourceSessions) * 100 : 0;

  const topSource = sources[0] || null;
  const topPage = topPages[0] || null;

  const insights: Array<{
    id: string;
    severity: "critical" | "high" | "medium" | "info";
    priority: number;
    title: string;
    evidence: string;
    nextSteps: string[];
  }> = [];

  if (visitors < 30) {
    insights.push({
      id: "low-traffic",
      severity: "high",
      priority: 95,
      title: "Traffic volume is too low to reliably convert sales",
      evidence: `${visitors} funnel visitors in ${days} days (target baseline: 30+ before conversion optimization).`,
      nextSteps: [
        "Launch 3 UTM-tagged social posts this week (Instagram, LinkedIn, WhatsApp).",
        "Push one email to your existing list with a direct /iamher call-to-action.",
        "Review traffic again after 7 days before making major funnel design changes.",
      ],
    });
  }

  if (visitors >= 20 && ctaRate < 20) {
    insights.push({
      id: "weak-cta",
      severity: "high",
      priority: 90,
      title: "CTA engagement is weak",
      evidence: `${ctaClicks} CTA clicks from ${visitors} visitors (${ctaRate.toFixed(1)}% CTA rate).`,
      nextSteps: [
        "Move the main CTA higher on /iamher and repeat it near social proof blocks.",
        "Test a stronger CTA label focused on outcome and urgency.",
        "Retest CTA rate after the next 100 visitors.",
      ],
    });
  }

  if (ctaClicks >= 10 && formStartRate < 60) {
    insights.push({
      id: "cta-to-form-drop",
      severity: "critical",
      priority: 98,
      title: "High drop-off between CTA click and form start",
      evidence: `${formStarts} form starts from ${ctaClicks} CTA clicks (${formStartRate.toFixed(1)}% start rate).`,
      nextSteps: [
        "Audit page transition after CTA for latency and mobile rendering issues.",
        "Shorten first-step form to essential fields only.",
        "Track this step daily until start rate is above 60%.",
      ],
    });
  }

  if (formStarts >= 10 && completionRate < 60) {
    insights.push({
      id: "form-completion",
      severity: "high",
      priority: 87,
      title: "Form completion needs improvement",
      evidence: `${formCompletes} completions from ${formStarts} starts (${completionRate.toFixed(1)}% completion rate).`,
      nextSteps: [
        "Remove non-essential form fields and defer them to follow-up.",
        "Add explicit progress and error hints to reduce abandonment.",
        "Monitor completion rate against the next 50 starts.",
      ],
    });
  }

  if (visitors >= 20 && submitRate < 5) {
    insights.push({
      id: "low-submit-rate",
      severity: "critical",
      priority: 100,
      title: "End-to-end conversion is below target",
      evidence: `${submitSuccess} successful submissions from ${visitors} visitors (${submitRate.toFixed(1)}% submit rate).`,
      nextSteps: [
        "Prioritize fixing the biggest drop-off stage first (CTA or form).",
        "Review payment-view to submit sequence for friction and trust blockers.",
        "Set a near-term target of 5-8% submit rate and re-check weekly.",
      ],
    });
  }

  if (totalSessions >= 30 && emailCaptureRate < 1) {
    insights.push({
      id: "low-email-capture",
      severity: "medium",
      priority: 70,
      title: "Lead capture is underperforming",
      evidence: `${emailCaptures} captured emails from ${totalSessions} sessions (${emailCaptureRate.toFixed(1)}% capture rate).`,
      nextSteps: [
        "Add a single-field capture prompt tied to a clear value exchange.",
        "Place capture opportunities on high-traffic pages and near exit points.",
        "Track capture rate weekly and target at least 1-2%.",
      ],
    });
  }

  if (totalSourceSessions >= 20 && directShare >= 55) {
    insights.push({
      id: "high-direct-share",
      severity: "medium",
      priority: 60,
      title: "Attribution is limited due to high direct traffic",
      evidence: `${directSessions} of ${totalSourceSessions} source sessions are direct (${directShare.toFixed(1)}%).`,
      nextSteps: [
        "Enforce UTM usage for every campaign link.",
        "Add source tracking fields to key forms.",
        "Compare direct share again after one campaign cycle.",
      ],
    });
  }

  if (topSource) {
    insights.push({
      id: "top-source",
      severity: "info",
      priority: 35,
      title: "Top active traffic source",
      evidence: `${topSource.source}: ${topSource.sessions} sessions in the selected period.`,
      nextSteps: [
        "Replicate best-performing content in this channel.",
        "Protect this source with consistent posting cadence and UTM hygiene.",
      ],
    });
  }

  if (topPage) {
    insights.push({
      id: "top-page",
      severity: "info",
      priority: 30,
      title: "Top viewed page",
      evidence: `${topPage.page}: ${topPage.views} views in the selected period.`,
      nextSteps: [
        "Place strongest conversion CTA on this page.",
        "Ensure this page has fast load, clear messaging, and mobile-first layout.",
      ],
    });
  }

  insights.sort((a, b) => b.priority - a.priority);

  return {
    snapshot: {
      periodDays: days,
      totalViews,
      totalSessions,
      emailCaptures,
      visitors,
      ctaClicks,
      formStarts,
      formCompletes,
      submitSuccess,
      paymentViews,
      ctaRate: Number(ctaRate.toFixed(1)),
      formStartRate: Number(formStartRate.toFixed(1)),
      completionRate: Number(completionRate.toFixed(1)),
      submitRate: Number(submitRate.toFixed(1)),
      emailCaptureRate: Number(emailCaptureRate.toFixed(1)),
      directShare: Number(directShare.toFixed(1)),
      topSource: topSource ? { source: topSource.source, sessions: Number(topSource.sessions) || 0 } : null,
      topPage: topPage ? { page: topPage.page, views: Number(topPage.views) || 0 } : null,
    },
    insights: insights.slice(0, 8),
  };
}

function buildIntelligenceOS(data: any, days: number) {
  const live = buildLiveInsights(data, days);
  const s = live.snapshot;
  const sourceCoverage = data.sourceCoverage || {};
  const topReferrers = Array.isArray(data.topReferrers) ? data.topReferrers : [];
  const utmMatrix = Array.isArray(data.utmMatrix) ? data.utmMatrix : [];
  const topIssues = live.insights.filter((i: any) => i.severity === "critical" || i.severity === "high").slice(0, 3);

  const kpiTree = {
    northStar: {
      name: "Qualified Submissions",
      value: s.submitSuccess,
      targetRange: "5%-8% visitor-to-submit",
    },
    supporting: [
      { name: "CTA Rate", value: `${s.ctaRate}%`, threshold: ">=25%" },
      { name: "CTA->Form Start", value: `${s.formStartRate}%`, threshold: ">=60%" },
      { name: "Form Completion", value: `${s.completionRate}%`, threshold: ">=65%" },
      { name: "Email Capture Rate", value: `${s.emailCaptureRate}%`, threshold: ">=1.5%" },
      { name: "Attribution Direct Share", value: `${s.directShare}%`, threshold: "<=45%" },
    ],
  };

  const thresholds = [
    { metric: "CTA Rate", current: s.ctaRate, target: 25, status: s.ctaRate >= 25 ? "on-track" : "off-track" },
    { metric: "CTA->Form Start", current: s.formStartRate, target: 60, status: s.formStartRate >= 60 ? "on-track" : "off-track" },
    { metric: "Form Completion", current: s.completionRate, target: 65, status: s.completionRate >= 65 ? "on-track" : "off-track" },
    { metric: "Submit Rate", current: s.submitRate, target: 5, status: s.submitRate >= 5 ? "on-track" : "off-track" },
    { metric: "Email Capture", current: s.emailCaptureRate, target: 1.5, status: s.emailCaptureRate >= 1.5 ? "on-track" : "off-track" },
  ];

  const agencyBriefs = topIssues.map((issue: any, idx: number) => ({
    id: `AB-${idx + 1}`,
    objective: issue.title,
    evidence: issue.evidence,
    deliverables: [
      "One revised creative concept",
      "One revised conversion flow",
      "One testable variant with UTMs",
    ],
    acceptanceCriteria: [
      "Hypothesis stated in one sentence",
      "All links UTM-tagged",
      "Primary metric and success threshold defined",
    ],
    dueInDays: 7,
  }));

  const experimentBacklog = live.insights.slice(0, 5).map((issue: any, idx: number) => ({
    id: `EXP-${idx + 1}`,
    hypothesis: `Improving ${issue.title.toLowerCase()} will increase qualified submissions.`,
    primaryMetric: idx === 0 ? "submit_rate" : idx === 1 ? "cta_rate" : "form_start_rate",
    successThreshold: "+15% relative lift",
    owner: "Growth + Agency",
    priority: issue.priority,
  }));

  const weeklyCadence = [
    {
      name: "Monday Performance Review",
      agenda: [
        "Review KPI threshold status",
        "Approve top 3 actions",
        "Assign agency briefs",
      ],
    },
    {
      name: "Wednesday Creative Checkpoint",
      agenda: [
        "Validate live test launches",
        "Check tracking integrity",
        "Remove blockers",
      ],
    },
    {
      name: "Friday Executive Summary",
      agenda: [
        "Report uplift and risks",
        "Decide scale/stop for tests",
        "Set next week priorities",
      ],
    },
  ];

  const next7Days = [
    "Lock KPI thresholds and owners.",
    "Launch top 3 highest-priority fixes from insights.",
    "Deploy 3 UTM-tagged channel pushes and compare source quality.",
    "Run one conversion flow A/B test and one creative message test.",
    "Publish Friday executive summary with scale/stop decisions.",
  ];

  const automation = {
    principle: "Auto-run analysis and task generation. Keep strategic approvals manual.",
    autoTasks: [
      "Refresh live KPI and source coverage snapshot.",
      "Re-rank insights by priority and threshold failures.",
      "Generate agency brief drafts from top issues.",
      "Generate experiment backlog with metrics and thresholds.",
      "Prepare weekly cadence agenda and next-7-day action list.",
    ],
    manualApprovals: [
      "Approve creative direction and messaging for launch.",
      "Approve budget shifts across channels.",
      "Approve final agency brief before deployment.",
    ],
    recommendedRunCadence: "Daily auto-run + Monday/Friday executive review",
  };

  const dataSources = {
    traffic: {
      utmSources: data.topSources || [],
      referrerDomains: topReferrers,
      utmBreakdown: utmMatrix,
    },
    identity: {
      ipCoverage: {
        sessionsWithIp: Number(sourceCoverage.sessionsWithIp) || 0,
        coveragePct: Number(sourceCoverage.ipCoveragePct) || 0,
      },
      emailCapture: {
        sessionsWithEmail: Number(sourceCoverage.sessionsWithEmail) || 0,
        coveragePct: Number(sourceCoverage.emailCoveragePct) || 0,
      },
    },
    geo: {
      sessionsWithCountry: Number(sourceCoverage.sessionsWithCountry) || 0,
      countryCoveragePct: Number(sourceCoverage.countryCoveragePct) || 0,
      sessionsWithCity: Number(sourceCoverage.sessionsWithCity) || 0,
      cityCoveragePct: Number(sourceCoverage.cityCoveragePct) || 0,
      topCountries: data.topCountries || [],
      topCities: data.topCities || [],
    },
  };

  return {
    generatedAt: new Date().toISOString(),
    periodDays: days,
    snapshot: s,
    kpiTree,
    thresholds,
    weeklyCadence,
    agencyBriefs,
    experimentBacklog,
    automation,
    dataSources,
    next7Days,
    topFindings: live.insights.slice(0, 5),
  };
}

const DEFAULT_INTELLIGENCE_DAYS = 30;
let intelligenceSchedulerStarted = false;

async function ensureIntelligenceRunTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS marketing_intelligence_runs (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      triggered_by TEXT NOT NULL,
      period_days INTEGER NOT NULL,
      run_summary JSONB,
      payload JSONB NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_marketing_intelligence_runs_created_at ON marketing_intelligence_runs(created_at DESC)`);
}

async function generateAndPersistIntelligenceRun(days: number, triggeredBy: string) {
  const analytics = await getAnalyticsSnapshot(days);
  const osPack = buildIntelligenceOS(analytics, days);

  const summary = {
    topFinding: osPack.topFindings?.[0]?.title || "No finding",
    submitRate: osPack.snapshot?.submitRate || 0,
    ctaRate: osPack.snapshot?.ctaRate || 0,
    visitors: osPack.snapshot?.visitors || 0,
    submitSuccess: osPack.snapshot?.submitSuccess || 0,
  };

  const inserted = await db.execute(sql`
    INSERT INTO marketing_intelligence_runs (triggered_by, period_days, run_summary, payload)
    VALUES (${triggeredBy}, ${days}, ${JSON.stringify(summary)}::jsonb, ${JSON.stringify(osPack)}::jsonb)
    RETURNING id, created_at
  `);

  return {
    id: inserted.rows?.[0]?.id,
    created_at: inserted.rows?.[0]?.created_at,
    ...osPack,
  };
}

function startIntelligenceAutoScheduler() {
  if (intelligenceSchedulerStarted) return;
  intelligenceSchedulerStarted = true;

  // Startup run so the dashboard has data immediately after deployment/restart.
  generateAndPersistIntelligenceRun(DEFAULT_INTELLIGENCE_DAYS, "auto_startup").catch((e: any) => {
    console.warn("[Marketing Intelligence] startup run failed:", e?.message || e);
  });

  // Daily run.
  setInterval(() => {
    generateAndPersistIntelligenceRun(DEFAULT_INTELLIGENCE_DAYS, "auto_daily").catch((e: any) => {
      console.warn("[Marketing Intelligence] daily run failed:", e?.message || e);
    });
  }, 24 * 60 * 60 * 1000);
}

// ── Register all routes ───────────────────────────────────────────────────
export function registerMarketingAgentRoutes(app: Express) {
  const requireAnalyticsAccess = (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!["admin", "planner", "manager", "staff"].includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };

  ensureIntelligenceRunTable().catch((e: any) => {
    console.warn("[Marketing Intelligence] table init failed:", e?.message || e);
  });
  startIntelligenceAutoScheduler();

  // ── Chat endpoint ──────────────────────────────────────────────────────
  app.post("/api/admin/marketing-agent/chat", authenticateToken, requireAnalyticsAccess, async (req: any, res: Response) => {
    try {
      const { message, history = [], days = 30 } = req.body;
      if (!message) return res.status(400).json({ error: "Message is required" });
      if (!ANTHROPIC_KEY) return res.status(500).json({ error: "Anthropic API key not configured" });

      const analytics = await getAnalyticsSnapshot(days);
      const context = buildAnalyticsContext(analytics);

      const systemPrompt = `You are the Event Perfekt Marketing Agent — a creative marketing strategist who has worked with the world's biggest brands (Coca-Cola, Nike, Apple-level thinking). You combine the analytical rigour of a CMO with the creative instinct of a Cannes Lions-winning creative director. You have full access to the I AM HER event analytics data in real-time.

${context}

Your creative philosophy:
- Every campaign must have a \u201cbig idea\u201d — something people remember and talk about
- Emotion drives action. People don't buy tickets because of logic; they buy because of desire, belonging, and aspiration
- Use storytelling: founder's journey, attendee transformation, the feeling of being in the room
- Think in brand arcs, not just posts: a 3-week narrative that builds anticipation, peaks at the event, and creates FOMO
- Nigerian + UK market expertise: understand both cultures, celebrations, and what women in these markets truly want

Your role:
1. Answer questions with data-backed insights AND creative flair
2. Design campaign concepts with themes, hooks, and emotional beats
3. Flag underperforming pages with creative fixes (not just technical fixes)
4. Propose content ideas that feel like a top brand's campaign: Instagram, LinkedIn, Reels, WhatsApp, email, SMS
5. Identify funnel drop-offs and suggest creative solutions (e.g. rewrite the CTA, add a video, change the visual)
6. Help with positioning, pricing psychology, and audience targeting
7. When the user asks for help, think: \u201cWhat would a Coca-Cola or Nike creative team do here?\u201d

Tone: Creative director energy — confident, inspiring, strategic, slightly provocative. Use bold language. Make the user feel like they're working with a top-tier agency.
When recommending social posts, always include UTM-tagged URLs.
Keep responses concise but powerful — 3-5 bullet points with creative next steps.`;

      const msgHistory = history.slice(-8).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await callClaude(systemPrompt, [...msgHistory, { role: "user", content: message }]);
      return res.json({ response, analyticsSnapshot: analytics.summary });
    } catch (err: any) {
      console.error("Marketing Agent chat error:", err.message);
      return res.status(500).json({ error: "Marketing Agent service error: " + err.message });
    }
  });

  // ── Generate plan endpoint ─────────────────────────────────────────────
  app.post("/api/admin/marketing-agent/generate-plan", authenticateToken, requireAnalyticsAccess, async (req: any, res: Response) => {
    try {
      const { days = 30 } = req.body;
      if (!ANTHROPIC_KEY) return res.status(500).json({ error: "Anthropic API key not configured" });

      const analytics = await getAnalyticsSnapshot(days);
      const context = buildAnalyticsContext(analytics);

      const systemPrompt = `You are the Event Perfekt Marketing Agent — a creative marketing strategist who has shaped campaigns for Coca-Cola, Nike, and Apple-level brands. You are writing a marketing action plan for the I AM HER event that would make a Cannes jury applaud.

${context}

Your creative philosophy for this plan:
- It needs a \u201cbig idea\u201d — a campaign concept people will remember and talk about
- Think in brand arcs: 3-week narrative that builds anticipation, peaks at the event, and creates FOMO
- Emotion over logic: attendees don't buy because of features; they buy because of desire, belonging, and aspiration
- Use storytelling: Kehinde's founder journey, attendee transformation, the feeling of being in that room
- Nigerian + UK cultural intelligence: understand what women in both markets truly celebrate, fear, and aspire to

The plan must include:
1. THE BIG IDEA — The campaign concept. What makes this event unmissable. One sentence that gives goosebumps.
2. CREATIVE STRATEGY — How the idea comes to life across every channel (Instagram, LinkedIn, WhatsApp, email, SMS)
3. PRIORITY ACTIONS — 3-5 immediate actions with owners. Bold moves, not safe bets.
4. CONTENT CALENDAR — Day-by-day plan with actual copy suggestions, not just topics. Write headlines that would make Ogilvy proud.
5. FUNNEL FIXES — Creative solutions for drop-off points (e.g. rewrite CTA, add video, change the visual)
6. BUDGET TIP — Where to spend for maximum impact and where to save
7. SUCCESS METRICS — What to track and targets. Include a stretch goal.

Format: Markdown, bold headings, bullet points. Include UTM tags on every link.
Tone: Creative director energy — confident, inspiring, strategic, slightly provocative.`;

      const response = await callClaude(systemPrompt, [{ role: "user", content: "Generate a 3-day marketing action plan for the I AM HER event based on our current analytics data." }]);

      const title = `I AM HER Marketing Plan — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
      const dataSnap = JSON.stringify(analytics);

      const insert = await db.execute(sql`
        INSERT INTO marketing_plans (title, content, period_days, data_snapshot)
        VALUES (${title}, ${response}, 3, ${dataSnap}::jsonb)
        RETURNING id, title, created_at
      `);

      return res.json({
        plan: { id: insert.rows?.[0]?.id, title, content: response, created_at: insert.rows?.[0]?.created_at },
        analyticsSnapshot: analytics.summary,
      });
    } catch (err: any) {
      console.error("Generate plan error:", err.message);
      return res.status(500).json({ error: "Plan generation failed: " + err.message });
    }
  });

  // ── Live data insight endpoint (deterministic, no LLM generation) ───────
  app.get("/api/admin/marketing-agent/live-insights", authenticateToken, requireAnalyticsAccess, async (req: Request, res: Response) => {
    try {
      const daysParam = parseInt(String(req.query.days || "30"), 10);
      const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 365) : 30;

      const analytics = await getAnalyticsSnapshot(days);
      const live = buildLiveInsights(analytics, days);

      return res.json({
        generatedAt: new Date().toISOString(),
        ...live,
      });
    } catch (err: any) {
      console.error("Live insights error:", err.message);
      return res.status(500).json({ error: "Failed to generate live insights: " + err.message });
    }
  });

  // ── Intelligence OS endpoint (full CMO operating pack) ─────────────────
  app.get("/api/admin/marketing-agent/intelligence-os", authenticateToken, requireAnalyticsAccess, async (req: Request, res: Response) => {
    try {
      const daysParam = parseInt(String(req.query.days || "30"), 10);
      const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 365) : 30;

      const analytics = await getAnalyticsSnapshot(days);
      const osPack = buildIntelligenceOS(analytics, days);

      return res.json(osPack);
    } catch (err: any) {
      console.error("Intelligence OS error:", err.message);
      return res.status(500).json({ error: "Failed to generate Intelligence OS pack: " + err.message });
    }
  });

  // ── Manual run + persistence ───────────────────────────────────────────
  app.post("/api/admin/marketing-agent/intelligence-os/run", authenticateToken, requireAnalyticsAccess, async (req: Request, res: Response) => {
    try {
      const bodyDays = parseInt(String((req.body as any)?.days || DEFAULT_INTELLIGENCE_DAYS), 10);
      const days = Number.isFinite(bodyDays) ? Math.min(Math.max(bodyDays, 1), 365) : DEFAULT_INTELLIGENCE_DAYS;

      const run = await generateAndPersistIntelligenceRun(days, "manual");
      return res.json({ ok: true, run });
    } catch (err: any) {
      console.error("Intelligence OS manual run error:", err.message);
      return res.status(500).json({ error: "Failed to run Intelligence OS: " + err.message });
    }
  });

  // ── Run history list ───────────────────────────────────────────────────
  app.get("/api/admin/marketing-agent/intelligence-os/runs", authenticateToken, requireAnalyticsAccess, async (req: Request, res: Response) => {
    try {
      const limitParam = parseInt(String(req.query.limit || "20"), 10);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
      const rows = await db.execute(sql`
        SELECT id, created_at, triggered_by, period_days, run_summary
        FROM marketing_intelligence_runs
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);
      return res.json({ runs: rows.rows || [] });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to load runs: " + err.message });
    }
  });

  // ── Single run payload ─────────────────────────────────────────────────
  app.get("/api/admin/marketing-agent/intelligence-os/runs/:id", authenticateToken, requireAnalyticsAccess, async (req: Request, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid run id" });

      const row = await db.execute(sql`
        SELECT id, created_at, triggered_by, period_days, run_summary, payload
        FROM marketing_intelligence_runs
        WHERE id = ${id}
        LIMIT 1
      `);
      if (!row.rows?.length) return res.status(404).json({ error: "Run not found" });
      return res.json({ run: row.rows[0] });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to load run: " + err.message });
    }
  });

  // ── List saved plans ───────────────────────────────────────────────────
  app.get("/api/admin/marketing-agent/plans", authenticateToken, requireAnalyticsAccess, async (req: any, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT id, title, content, created_at, period_days
        FROM marketing_plans
        ORDER BY created_at DESC
        LIMIT 50
      `);
      res.json({ plans: result.rows || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Get single plan ────────────────────────────────────────────────────
  app.get("/api/admin/marketing-agent/plans/:id", authenticateToken, requireAnalyticsAccess, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await db.execute(sql`
        SELECT id, title, content, created_at, period_days
        FROM marketing_plans WHERE id = ${id}
      `);
      if (!result.rows?.length) return res.status(404).json({ error: "Plan not found" });
      return res.json({ plan: result.rows[0] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Delete plan ──────────────────────────────────────────────────────
  app.delete("/api/admin/marketing-agent/plans/:id", authenticateToken, requireAnalyticsAccess, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.execute(sql`DELETE FROM marketing_plans WHERE id = ${id}`);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── UTM Link Builder ───────────────────────────────────────────────────
  app.post("/api/admin/utm-builder", authenticateToken, requireAnalyticsAccess, async (req: any, res: Response) => {
    try {
      const { url, source, medium, campaign, content } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      const base = url.includes("?") ? url : url + "?";
      const sep = base.endsWith("?") || base.endsWith("&") ? "" : "&";
      const params = new URLSearchParams();
      if (source) params.set("utm_source", source);
      if (medium) params.set("utm_medium", medium);
      if (campaign) params.set("utm_campaign", campaign);
      if (content) params.set("utm_content", content);

      const full = base + sep + params.toString();
      return res.json({ url: full, short: full });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}
