// Anonymous visitor tracking: page views, IP geolocation, session stitching, email capture
import { type Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendMail } from "./emailService";
import { logger } from "./lib/logger";
import { authenticateToken } from "./auth";

// ─── Bot Detection ────────────────────────────────────────────────────────────
// Comprehensive list of known crawler / bot user-agent patterns.
// Covers: search engines, social media link fetchers, SEO tools, headless browsers,
// HTTP libraries, AI crawlers, and monitoring bots.
const BOT_UA_PATTERNS: RegExp[] = [
  // Headless browsers
  /HeadlessChrome/i,
  /PhantomJS/i,
  /Selenium/i,
  /Puppeteer/i,
  /Playwright/i,
  /webdriver/i,

  // Search engine crawlers
  /Googlebot/i,
  /Google-InspectionTool/i,
  /Google-PageRenderer/i,
  /Storebot-Google/i,
  /bingbot/i,
  /BingPreview/i,
  /Slurp/i, // Yahoo
  /DuckDuckBot/i,
  /Baiduspider/i,
  /YandexBot/i,
  /Sogou/i,
  /Exabot/i,
  /facebot/i,
  /ia_archiver/i, // Alexa/Wayback Machine
  /archive\.org_bot/i,
  /Applebot/i,
  /PetalBot/i,

  // Social media / link-preview fetchers
  /facebookexternalhit/i,
  /LinkedInBot/i,
  /Twitterbot/i,
  /WhatsApp/i,
  /Slackbot/i,
  /Slack-ImgProxy/i,
  /Discordbot/i,
  /TelegramBot/i,
  /SkypeUriPreview/i,
  /Pinterest/i,
  /Viber/i,
  /Line\/\d/i,

  // SEO / commercial crawlers
  /AhrefsBot/i,
  /SemrushBot/i,
  /DotBot/i,
  /MajesticBot/i,
  /MJ12bot/i,
  /rogerbot/i,
  /SiteAuditBot/i,
  /screaming frog/i,
  /Screaming.Frog/i,
  /DataForSeoBot/i,
  /SEOkicks/i,
  /BLEXBot/i,
  /SeznamBot/i,
  /Sistrix/i,
  /seoscanners\.net/i,
  /SEOdiver/i,
  /CheckMarkNetwork/i,
  /proximic/i,
  /Qwantify/i,
  /Swiftbot/i,
  /Superfeedr/i,

  // AI / LLM crawlers
  /GPTBot/i,
  /ChatGPT/i,
  /anthropic-ai/i,
  /Claude-Web/i,
  /Bytespider/i, // TikTok/ByteDance
  /Amazonbot/i,
  /cohere-ai/i,
  /PerplexityBot/i,

  // HTTP libraries / scripts
  /python-requests/i,
  /Python-urllib/i,
  /Go-http-client/i,
  /Java\/\d/i,
  /okhttp/i,
  /libwww-perl/i,
  /curl\//i,
  /wget\//i,
  /axios\//i,
  /node-fetch/i,
  /node\.js/i,
  /Scrapy/i,
  /colly/i,

  // Monitoring / uptime tools
  /UptimeRobot/i,
  /pingdom/i,
  /StatusCake/i,
  /freshping/i,
  /Site24x7/i,
  /Datadog/i,
  /NewRelic/i,

  // Generic spider / bot indicators
  /[Bb]ot[^a-z]/,
  /[Ss]pider[^m]/,
  /[Cc]rawler/,
  /[Ss]craper/,
];

function isBotUserAgent(ua: string): boolean {
  if (!ua || ua.trim() === "") return true;
  return BOT_UA_PATTERNS.some(p => p.test(ua));
}

/** Full bot verdict: UA-based + behavioural (single page, zero time) */
function classifyBot(ua: string, pageCount = 1, timeOnPage: number | null = null): boolean {
  if (isBotUserAgent(ua)) return true;
  // Single-page sessions with literally zero dwell time are almost certainly bots or link-fetchers
  if (pageCount <= 1 && timeOnPage !== null && timeOnPage === 0) return true;
  return false;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function geolocate(ip: string): Promise<{ country?: string; city?: string; region?: string; isp?: string; org?: string }> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")) return {};
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city,isp,org,status`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return {};
    const d = await res.json() as any;
    if (d.status !== "success") return {};
    return { country: d.country, city: d.city, region: d.regionName, isp: d.isp, org: d.org };
  } catch {
    return {};
  }
}

function getClientIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.ip ||
    req.socket?.remoteAddress ||
    ""
  );
}

// ─── Real-time visitor alert ────────────────────────────────────────────────
// MUTED — real-time alerts create inbox noise. Visitor data is in the daily digest.
let _alertLastSent = 0;
const ALERT_COOLDOWN_MS = 60000; // max 1 email per minute

async function notifyNewVisitor(
  sessionId: string,
  page: string,
  geo: { country?: string; city?: string; region?: string; isp?: string; org?: string },
  referrer: string | null,
  utmSource: string | null,
  userAgent: string
) {
  const now = Date.now();
  if (now - _alertLastSent < ALERT_COOLDOWN_MS) return;
  _alertLastSent = now;

  try {
    const { emailService } = await import("./emailService");
    const time = new Date().toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/London",
    });
    const location = [geo.city, geo.region, geo.country].filter(Boolean).join(", ") || "Unknown";
    const source = utmSource ? `UTM: ${utmSource}` : (referrer ? `Referrer: ${referrer}` : "Direct / unknown source");
    const device = userAgent.includes("Mobile") ? "Mobile" : userAgent.includes("Tablet") ? "Tablet" : "Desktop";

    // Use org (organization name) if available and specific; fall back to isp
    const rawName = (geo.org && geo.org !== "Unknown" && geo.org.trim()) ? geo.org : (geo.isp || "Unknown");
    const isUnknown = !rawName || rawName === "Unknown";

    // Only flag as corporate if we have a high-confidence named organization
    // High confidence = org field is set (not ISP), or ISP name contains "Inc", "Ltd", "LLC", "PLC", "Corp", "GmbH", "S.A."
    const hasOrgName = !!(geo.org && geo.org !== "Unknown" && geo.org.trim());
    const namedEntity = rawName.toLowerCase();
    const isNamedCorp = hasOrgName && /inc\.?|ltd\.?|llc|plc\.?|corp\.?|gmbh|s\.?a\.?|s\.?l\.?|b\.?v\.?|nv\.?|ab\.?|ag\.?|k\.?k\.?|pty\.?|ltda|s\.?r\.?l|s\.?p\.?a|holding|group|technologies|systems|solutions|software|networks|services|consulting|partner|bank|insurance|hospital|clinic|university|college|school|government|ministry|agency|police|nhs/i.test(namedEntity);

    // Residential / consumer ISP markers
    const isResidential = !isUnknown && /bt|virgin|sky|talktalk|vodafone|orange|ee limited|three|o2|giffgaff|plusnet|zen internet|hyperoptic|kcom|isp|broadband|internet|telecom|fibre|fiber|dsl|cable|wireless|wireless|mobile|4g|5g|3g|2g|cellular|net|online|t-online|home|connect|home|residential|consumer|telstra|telecom|verizon|comcast|spectrum|cox|att|at&t|sprint|tmobile|t-mobile|bell|rogers|shaw|telus|vodafone|ee|o2|three|lloyds|barclays|hsbc|natwest|santander|halifax|nationwide|monzo|starling|revolut|tsb|metro|co-operative|bank|building society|credit union|first direct|danske|handelsbanken|alliance|yorkshire|saga|post office|cashplus|i|l&|s|i&|i&|g|ing/i.test(namedEntity);

    // Proxy / CDN / hosting — not a company visitor
    const isProxy = !isUnknown && /cloudflare|fastly|incapsula|akamai|cdn|cloudfront|maxcdn|keycdn|stackpath|sucuri|bunny|bunnycdn|quic|cdn77|cdnetworks|chinacache|level3|centurylink|limelight|edgecast|verizon digital|highwinds|onapp|cachefly|fly|silk|alicdn|alibaba|baidu|tencent|aws amazon|amazon web|google cloud|microsoft azure|azure|gcp|google platform|digitalocean|linode|vultr|hetzner|ovh|contabo|scaleway|packet|equinix|server|hosting|datacenter|data centre|data center|colo|colocation|host|webhost|web host|hostgator|bluehost|godaddy|namecheap|dreamhost|siteground|inmotion|a2hosting|hostinger|ionos|1&1|1&1|oneandone|network solutions|register|registrar|domain|dns|vpn|proxy|tor|anonym|hide|exit node|private internet|nordvpn|expressvpn|cyberghost|surfshark|protonvpn|ipvanish|tunnelbear|hotspot shield|windscribe|vypr|purevpn|cyber|ghost|surf|shark|proton|ipvanish|tunnel|bear|hotspot|shield|wind|scribe|vypr|pure/i.test(namedEntity);

    // Corporate only if we have a named company (not ISP/proxy/unknown)
    const isCorporate = !isUnknown && !isResidential && !isProxy && isNamedCorp;

    const displayIsp = isUnknown ? "Unidentified" : rawName;
    const badgeLabel = isCorporate ? "🏢 Brand Visitor" : (isUnknown ? "❓ Unidentified" : "🌐 ISP");

    const html = `
      <div style="font-family:Georgia,serif;max-width:620px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
        <div style="background:#330311;padding:28px 32px;text-align:center;">
          <p style="margin:0;color:#C9A961;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;font-family:Arial,sans-serif;">Event Perfekt · Site Intelligence</p>
          <h1 style="margin:10px 0 0;color:#fff;font-size:22px;font-weight:normal;">New I Am Her Visitor</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;font-family:Arial,sans-serif;">${time} · UK time</p>
        </div>
        <div style="padding:32px;">
          <div style="display:flex;gap:16px;margin-bottom:24px;">
            <div style="flex:1;background:#f5f0ed;padding:18px 16px;text-align:center;border-radius:4px;">
              <div style="font-size:28px;font-weight:bold;color:#330311;">1</div>
              <div style="font-size:11px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">New visitor</div>
            </div>
            <div style="flex:1;background:#f5f0ed;padding:18px 16px;text-align:center;border-radius:4px;">
              <div style="font-size:28px;font-weight:bold;color:#330311;">${location}</div>
              <div style="font-size:11px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">Location</div>
            </div>
            <div style="flex:1;background:${isCorporate ? '#C9A961' : (isUnknown ? '#f5f0ed' : '#f5f0ed')};padding:18px 16px;text-align:center;border-radius:4px;">
              <div style="font-size:14px;font-weight:bold;color:#330311;word-break:break-word;">${displayIsp}</div>
              <div style="font-size:11px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">${badgeLabel}</div>
            </div>
          </div>

          <div style="border-left:3px solid #C9A961;padding:12px 16px;margin-bottom:20px;background:#faf8f6;">
            <strong style="color:#330311;">Page:</strong> ${page}<br/>
            <strong style="color:#330311;">Source:</strong> ${source}<br/>
            <strong style="color:#330311;">Device:</strong> ${device}<br/>
            <strong style="color:#330311;">ISP / Org:</strong> ${displayIsp}<br/>
            <strong style="color:#330311;">Session:</strong> <span style="font-size:12px;color:#888;">${sessionId}</span>
          </div>

          <p style="font-size:13px;color:#888;margin:0 0 20px;">
            This is a real-time alert. You will also get the daily digest at 8am UK time with a full summary.
          </p>

          <div style="margin-top:24px;">
            <a href="https://eventperfekt.net/admin/visitor-analytics" style="background:#330311;color:#fff;text-decoration:none;padding:12px 28px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.08em;display:inline-block;">VIEW FULL DASHBOARD</a>
          </div>
        </div>
        <p style="text-align:center;font-size:11px;color:#bbb;font-family:Arial,sans-serif;padding-bottom:24px;">Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG · …making yours perfekt</p>
      </div>`;

    // MUTED — real-time alerts consolidated into daily digest.
    // console.log(`[VisitorTracking] Real-time alert suppressed — ${location} (${displayIsp}) -> ${page}`);
  } catch (err: any) {
    console.warn("[VisitorTracking] Real-time alert failed:", err.message);
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

export async function bootstrapVisitorTracking() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS visitor_sessions (
      id TEXT PRIMARY KEY,
      first_seen TIMESTAMP DEFAULT NOW(),
      last_seen TIMESTAMP DEFAULT NOW(),
      page_count INTEGER DEFAULT 1,
      ip_address TEXT,
      country TEXT,
      city TEXT,
      region TEXT,
      isp TEXT,
      user_agent TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      captured_email TEXT,
      captured_name TEXT,
      capture_page TEXT,
      captured_at TIMESTAMP,
      is_bot BOOLEAN DEFAULT FALSE
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS page_views (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      page TEXT NOT NULL,
      title TEXT,
      referrer TEXT,
      occurred_at TIMESTAMP DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      time_on_page INTEGER,
      is_bot BOOLEAN DEFAULT FALSE
    )
  `);

  // Additive migrations — safe to re-run
  await db.execute(sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS utm_content TEXT`);
  await db.execute(sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE`);
  // is_staff = the site owner / staff (any session that has opened an admin page).
  // Excluded from analytics so "Real Visitors" means external people only.
  await db.execute(sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE`);
  await db.execute(sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS org TEXT`);
  await db.execute(sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS referral_source TEXT`);
  await db.execute(sql`ALTER TABLE page_views ADD COLUMN IF NOT EXISTS time_on_page INTEGER`);
  await db.execute(sql`ALTER TABLE page_views ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE`);

  // Funnel events for I Am Her conversion tracking
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS iamher_funnel_events (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      page TEXT NOT NULL,
      occurred_at TIMESTAMP DEFAULT NOW(),
      metadata JSONB DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      is_bot BOOLEAN DEFAULT FALSE
    )
  `);
  await db.execute(sql`ALTER TABLE iamher_funnel_events ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON iamher_funnel_events(session_id, event_type)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON iamher_funnel_events(event_type, occurred_at DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_funnel_events_page ON iamher_funnel_events(page, event_type, occurred_at DESC)`);

  // Digest sent log — tracks when analytics digests were sent so missed digests can be detected after server restarts
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS digest_sent_log (
      id SERIAL PRIMARY KEY,
      digest_type TEXT NOT NULL,
      sent_at TIMESTAMP DEFAULT NOW(),
      period_label TEXT
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_funnel_events_bot ON iamher_funnel_events(is_bot, occurred_at DESC)`);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views(page, occurred_at DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_visitor_sessions_first ON visitor_sessions(first_seen DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_visitor_sessions_bot ON visitor_sessions(is_bot, first_seen DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_visitor_sessions_staff ON visitor_sessions(is_staff, first_seen DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_page_views_bot ON page_views(is_bot, occurred_at DESC)`);

  // Owner/staff IPs to exclude from analytics. Any session from one of these IPs
  // is flagged is_staff (same mechanism as admin-page visits).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS analytics_excluded_ips (
      ip_address TEXT PRIMARY KEY,
      label TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Backfill is_staff: any session that has ever viewed an admin page is staff/owner ──
  try {
    await db.execute(sql`
      UPDATE visitor_sessions s
      SET is_staff = TRUE
      WHERE (s.is_staff = FALSE OR s.is_staff IS NULL)
        AND (
          EXISTS (
            SELECT 1 FROM page_views pv
            WHERE pv.session_id = s.id AND pv.page ILIKE '%admin%'
          )
          OR s.ip_address IN (SELECT ip_address FROM analytics_excluded_ips)
        )
    `);
    console.log("[VisitorTracking] is_staff backfill complete ✓");
  } catch (e: any) {
    console.warn("[VisitorTracking] is_staff backfill warning:", e.message);
  }

  // ── Backfill is_bot on existing rows where user_agent is known ──────────────
  // ADDITIVE: only sets is_bot = true where we can confirm it; never clears a manual flag
  try {
    const ua24 = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36";
    // Mark sessions with known-bot UAs
    await db.execute(sql`
      UPDATE visitor_sessions
      SET is_bot = TRUE
      WHERE is_bot = FALSE
        AND (
          user_agent IS NULL
          OR user_agent = ''
          OR user_agent ILIKE '%HeadlessChrome%'
          OR user_agent ILIKE '%bot%'
          OR user_agent ILIKE '%spider%'
          OR user_agent ILIKE '%crawler%'
          OR user_agent ILIKE '%Googlebot%'
          OR user_agent ILIKE '%bingbot%'
          OR user_agent ILIKE '%AhrefsBot%'
          OR user_agent ILIKE '%SemrushBot%'
          OR user_agent ILIKE '%LinkedInBot%'
          OR user_agent ILIKE '%Twitterbot%'
          OR user_agent ILIKE '%facebookexternalhit%'
          OR user_agent ILIKE '%python%'
          OR user_agent ILIKE '%curl%'
          OR user_agent ILIKE '%wget%'
          OR user_agent ILIKE '%Slackbot%'
          OR user_agent ILIKE '%PhantomJS%'
          OR user_agent ILIKE '%Selenium%'
          OR user_agent ILIKE '%Puppeteer%'
          OR user_agent ILIKE '%GPTBot%'
          OR user_agent ILIKE '%Bytespider%'
        )
    `);

    // Mirror is_bot onto page_views from their session
    await db.execute(sql`
      UPDATE page_views pv
      SET is_bot = TRUE
      FROM visitor_sessions s
      WHERE pv.session_id = s.id
        AND s.is_bot = TRUE
        AND pv.is_bot = FALSE
    `);

    // Also catch page_views with bot UAs directly (belt + braces)
    await db.execute(sql`
      UPDATE page_views
      SET is_bot = TRUE
      WHERE is_bot = FALSE
        AND (
          user_agent IS NULL
          OR user_agent = ''
          OR user_agent ILIKE '%HeadlessChrome%'
          OR user_agent ILIKE '%bot%'
          OR user_agent ILIKE '%spider%'
          OR user_agent ILIKE '%crawler%'
          OR user_agent ILIKE '%python%'
          OR user_agent ILIKE '%curl%'
          OR user_agent ILIKE '%PhantomJS%'
          OR user_agent ILIKE '%Selenium%'
        )
    `);

    // ── Backfill funnel events: flag known-bot UAs ───────────────────────
    await db.execute(sql`
      UPDATE iamher_funnel_events
      SET is_bot = TRUE
      WHERE is_bot = FALSE
        AND (
          user_agent IS NULL
          OR user_agent = ''
          OR user_agent ILIKE '%HeadlessChrome%'
          OR user_agent ILIKE '%bot%'
          OR user_agent ILIKE '%spider%'
          OR user_agent ILIKE '%crawler%'
          OR user_agent ILIKE '%Googlebot%'
          OR user_agent ILIKE '%bingbot%'
          OR user_agent ILIKE '%AhrefsBot%'
          OR user_agent ILIKE '%SemrushBot%'
          OR user_agent ILIKE '%LinkedInBot%'
          OR user_agent ILIKE '%Twitterbot%'
          OR user_agent ILIKE '%facebook%'
          OR user_agent ILIKE '%python%'
          OR user_agent ILIKE '%curl%'
          OR user_agent ILIKE '%Slackbot%'
          OR user_agent ILIKE '%PhantomJS%'
          OR user_agent ILIKE '%Selenium%'
          OR user_agent ILIKE '%Puppeteer%'
          OR user_agent ILIKE '%GPTBot%'
          OR user_agent ILIKE '%Bytespider%'
        )
    `);

    console.log("[VisitorTracking] Backfill complete ✓");
  } catch (e: any) {
    console.warn("[VisitorTracking] Backfill warning:", e.message);
  }

  console.log("[VisitorTracking] Tables verified ✓");
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export function registerVisitorTrackingRoutes(app: Express) {
  const requireAnalyticsAccess = (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!["admin", "planner", "manager", "staff"].includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };


  // ── Public: pageview ping ─────────────────────────────────────────────────
  app.post("/api/track/pageview", async (req, res) => {
    res.json({ ok: true }); // respond immediately, track async
    try {
      const clientIp = getClientIp(req);
      logger.info({ clientIp, xForwardedFor: req.headers["x-forwarded-for"], page: req.body?.page }, "[Track] pageview received");
    } catch (e) { /* ignore logging errors */ }
    try {
      const { sessionId, page, title, referrer, utmSource, utmMedium, utmCampaign, utmContent } = req.body;
      if (!sessionId || !page) return;

      const ip = getClientIp(req);
      const ua = (req.headers["user-agent"] as string) || "";
      const now = new Date();
      const isBot = classifyBot(ua);

      const existing: any = await db.execute(sql`SELECT id FROM visitor_sessions WHERE id = ${sessionId} LIMIT 1`);
      const isNewSession = !existing.rows?.length;
      if (isNewSession) {
        const geo = isBot ? {} : await geolocate(ip);
        await db.execute(sql`
          INSERT INTO visitor_sessions (id, first_seen, last_seen, page_count, ip_address, country, city, region, isp, org, user_agent, referrer, utm_source, utm_medium, utm_campaign, utm_content, is_bot)
          VALUES (${sessionId}, ${now}, ${now}, 1, ${ip}, ${geo.country || null}, ${geo.city || null}, ${geo.region || null}, ${geo.isp || null}, ${geo.org || null}, ${ua}, ${referrer || null}, ${utmSource || null}, ${utmMedium || null}, ${utmCampaign || null}, ${utmContent || null}, ${isBot})
        `);

        // ── Real-time alert: new human visitor on I Am Her pages ──────────────
        if (!isBot && page.startsWith("/iamher")) {
          notifyNewVisitor(sessionId, page, geo, referrer || null, utmSource || null, ua).catch(() => {});
        }
      } else {
        await db.execute(sql`
          UPDATE visitor_sessions SET last_seen = ${now}, page_count = page_count + 1 WHERE id = ${sessionId}
        `);
      }

      await db.execute(sql`
        INSERT INTO page_views (session_id, page, title, referrer, occurred_at, ip_address, user_agent, is_bot)
        VALUES (${sessionId}, ${page}, ${title || null}, ${referrer || null}, ${now}, ${ip}, ${ua}, ${isBot})
      `);

      // Opening any admin page marks this session as staff/owner so it's
      // excluded from "Real Visitors". Once true, it stays true.
      if (/admin/i.test(page)) {
        await db.execute(sql`UPDATE visitor_sessions SET is_staff = TRUE WHERE id = ${sessionId}`);
      } else if (isNewSession) {
        // New session from a known owner/staff IP → flag as staff.
        await db.execute(sql`
          UPDATE visitor_sessions SET is_staff = TRUE
          WHERE id = ${sessionId}
            AND (is_staff = FALSE OR is_staff IS NULL)
            AND ip_address IN (SELECT ip_address FROM analytics_excluded_ips)
        `);
      }
    } catch (err: any) {
      console.warn("[VisitorTracking] pageview error:", err.message);
    }
  });

  // ── Public: time-on-page update (sent on page unload via sendBeacon) ────────
  app.post("/api/track/time-on-page", async (req, res) => {
    res.json({ ok: true });
    try {
      const { sessionId, page, seconds } = req.body;
      if (!sessionId || !page || typeof seconds !== "number") return;

      // Update the most recent page_view for this session+page combo
      await db.execute(sql`
        UPDATE page_views
        SET time_on_page = ${Math.round(seconds)}
        WHERE id = (
          SELECT id FROM page_views
          WHERE session_id = ${sessionId} AND page = ${page}
          ORDER BY occurred_at DESC
          LIMIT 1
        )
      `);

      // Re-evaluate bot flag: if single-page session with zero dwell time → bot
      if (seconds === 0) {
        await db.execute(sql`
          UPDATE visitor_sessions
          SET is_bot = TRUE
          WHERE id = ${sessionId} AND page_count <= 1
        `);
        await db.execute(sql`
          UPDATE page_views
          SET is_bot = TRUE
          WHERE session_id = ${sessionId}
        `);
      }
    } catch (err: any) {
      console.warn("[VisitorTracking] time-on-page error:", err.message);
    }
  });

  // ── Public: email capture ─────────────────────────────────────────────────
  // Disposable / throwaway domains only — real providers (gmail, yahoo, outlook, etc.) are NOT blocked
  const DISPOSABLE_DOMAINS = new Set([
    "gzeos.com",
    "mailinator.com","tempmail.com","10minutemail.com","guerrillamail.com","throwaway.email",
    "yopmail.com","dispostable.com","getnada.com","sharklasers.com","fakeinbox.com",
    "trashmail.com","maildrop.cc","mailnull.com","spamgourmet.com","spamgourmet.net","spamgourmet.org",
    "temp-mail.org","tempinbox.com","tempr.email","discard.email"
  ]);

  function looksLikeRandomString(str: string): boolean {
    if (str.length < 6) return false;
    const clean = str.replace(/\s/g, "");
    if (clean.length < 6) return false;
    const upper = (clean.match(/[A-Z]/g) || []).length;
    const lower = (clean.match(/[a-z]/g) || []).length;
    const upperRatio = upper / clean.length;
    const lowerRatio = lower / clean.length;
    // Random strings tend to have mixed case and no common name patterns
    if (upperRatio > 0.2 && lowerRatio > 0.2 && upperRatio + lowerRatio > 0.9) {
      // Check for non-name characters: digits, underscores, random-looking sequences
      const digitRatio = (clean.match(/\d/g) || []).length / clean.length;
      if (digitRatio > 0.15) return true;
      // Check for unusual consonant clusters
      const vowels = (clean.match(/[aeiouAEIOU]/g) || []).length;
      if (vowels === 0 && clean.length > 6) return true;
      // Long strings with no spaces and many capitals
      if (clean.length > 12 && upperRatio > 0.3 && upperRatio < 0.7) return true;
    }
    return false;
  }

  function validateEmailCapture(email: string, name: string, ip: string, honeypot?: string): { ok: boolean; error: string } {
    if (honeypot) return { ok: false, error: "Invalid" };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Invalid email" };
    const domain = email.split("@")[1].toLowerCase();
    if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, error: "Invalid email" };
    // Block excessive dots in local part
    const localPart = email.split("@")[0];
    if ((localPart.match(/\./g) || []).length > 3) return { ok: false, error: "Invalid email" };
    // Block sequential dots
    if (email.includes("..") || email.includes(".@")) return { ok: false, error: "Invalid email" };
    // Name validation
    const nameTrim = (name || "").trim();
    if (!nameTrim) return { ok: false, error: "Name required" };
    const nameWords = nameTrim.split(/\s+/).filter(w => w.length > 0);
    if (nameWords.length < 2) return { ok: false, error: "First and last name required" };
    // Block random names
    if (looksLikeRandomString(nameTrim)) return { ok: false, error: "Invalid name" };
    // Rate limit: max 5 captures per IP per hour
    // Simple in-memory limit
    return { ok: true, error: "" };
  }

  // IP-based rate limiting for email capture
  const emailCaptureLimits = new Map<string, { count: number; resetAt: number }>();
  function checkEmailRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = emailCaptureLimits.get(ip);
    if (!entry || now > entry.resetAt) {
      emailCaptureLimits.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
      return true;
    }
    if (entry.count >= 5) return false;
    entry.count++;
    return true;
  }

  app.post("/api/track/email-capture", async (req, res) => {
    try {
      const { sessionId, email, name, page, honeypot, referral_source } = req.body;
      if (!email || !sessionId) return res.status(400).json({ error: "email and sessionId required" });

      const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();

      // Validation
      const validation = validateEmailCapture(email, name, ip, honeypot);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }
      if (!checkEmailRateLimit(ip)) {
        return res.status(429).json({ error: "Too many attempts. Please try again later." });
      }

      await db.execute(sql`
        INSERT INTO visitor_sessions (id, first_seen, captured_email, captured_name, capture_page, captured_at, referral_source)
        VALUES (${sessionId}, NOW(), ${email}, ${name || null}, ${page || null}, NOW(), ${referral_source || null})
        ON CONFLICT (id) DO UPDATE
          SET captured_email = EXCLUDED.captured_email,
              captured_name  = EXCLUDED.captured_name,
              capture_page   = EXCLUDED.capture_page,
              captured_at    = NOW(),
              referral_source = EXCLUDED.referral_source
      `);

      // Send confirmation email to the visitor
      const visitorName = name ? name.split("|")[0].trim() : "there";
      const emailHtml = `<div style="max-width:520px;margin:0 auto;font-family:Georgia,serif;color:#330311;">
          <div style="text-align:center;padding:32px 0 24px;border-bottom:1px solid #F4ECD8;">
            <p style="font-size:22px;color:#C9A961;margin:0;letter-spacing:0.12em;text-transform:uppercase;">I Am Her</p>
            <p style="font-size:11px;color:#330311;margin:8px 0 0;letter-spacing:0.08em;opacity:0.6;">The Stories Behind the Room</p>
          </div>
          <div style="padding:28px 24px;">
            <p style="font-size:14px;color:#330311;line-height:1.8;margin:0 0 18px;">Dear ${visitorName},</p>
            <p style="font-size:14px;color:#330311;line-height:1.8;margin:0 0 18px;">
              Thank you for your interest in <strong>I Am Her</strong>. We have received your details and will be in touch with exclusive updates about the event.
            </p>
            <p style="font-size:14px;color:#330311;line-height:1.8;margin:0 0 18px;">
              In the meantime, you can <a href="https://eventperfekt.net/iamher" style="color:#8B1538;text-decoration:none;border-bottom:1px solid #8B1538;">explore the event</a> or <a href="https://eventperfekt.net/iamher/submit" style="color:#8B1538;text-decoration:none;border-bottom:1px solid #8B1538;">share your story</a> with our community.
            </p>
            <p style="font-size:14px;color:#330311;line-height:1.8;margin:0 0 18px;">
              With care,<br/><strong>Event Perfekt Global Ltd</strong>
            </p>
          </div>
          <div style="background:#330311;color:#F4ECD8;padding:16px;text-align:center;font-size:11px;letter-spacing:0.04em;">
            <p style="margin:0 0 4px;">20 Wenlock Road, London, N1 7PG</p>
            <p style="margin:0;opacity:0.6;">adminuk@eventperfekt.com &middot; eventperfekt.com</p>
          </div>
        </div>`;
      sendMail(email.toLowerCase().trim(), "Thank you for your interest in I Am Her", emailHtml, undefined, "GB").catch(() => {});

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Public: funnel event tracking (I Am Her conversion) ───────────────────
  app.post("/api/track/funnel-event", async (req, res) => {
    try {
      const { sessionId, eventType, page, metadata } = req.body;
      if (!sessionId || !eventType || !page) {
        return res.status(400).json({ error: "sessionId, eventType, and page required" });
      }
      const ip = getClientIp(req); // was storing raw "ip1, ip2" proxy chain; normalise like other routes
      const ua = (req.headers["user-agent"] as string) || "";
      // Bot block: silently drop funnel events from known bots
      const isBot = classifyBot(ua);
      await db.execute(sql`
        INSERT INTO iamher_funnel_events (session_id, event_type, page, metadata, ip_address, user_agent, referrer, is_bot)
        VALUES (${sessionId}, ${eventType}, ${page}, ${metadata ? JSON.stringify(metadata) : null}, ${ip || null}, ${ua || null}, ${req.headers.referer || null}, ${isBot})
      `);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: exclude my own IP from analytics ───────────────────────────────
  // POST with no body uses the caller's current IP. Flags all existing sessions
  // from that IP as staff and remembers the IP so future sessions are excluded too.
  app.post("/api/admin/analytics/exclude-ip", authenticateToken, requireAnalyticsAccess, async (req: any, res) => {
    try {
      const ip = (req.body?.ip as string)?.trim() || getClientIp(req);
      const label = (req.body?.label as string)?.trim() || "owner";
      if (!ip) { res.status(400).json({ error: "Could not determine an IP to exclude" }); return; }

      await db.execute(sql`
        INSERT INTO analytics_excluded_ips (ip_address, label)
        VALUES (${ip}, ${label})
        ON CONFLICT (ip_address) DO UPDATE SET label = EXCLUDED.label
      `);
      const upd: any = await db.execute(sql`
        UPDATE visitor_sessions SET is_staff = TRUE
        WHERE ip_address = ${ip} AND (is_staff = FALSE OR is_staff IS NULL)
      `);
      res.json({ ok: true, ip, sessionsFlagged: upd.rowCount ?? null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // List excluded IPs (shows which is the caller's current IP).
  app.get("/api/admin/analytics/excluded-ips", authenticateToken, requireAnalyticsAccess, async (req: any, res) => {
    try {
      const rows: any = await db.execute(sql`SELECT ip_address, label, created_at FROM analytics_excluded_ips ORDER BY created_at DESC`);
      res.json({ ok: true, currentIp: getClientIp(req), ips: rows.rows || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Remove an excluded IP (existing sessions stay flagged).
  app.delete("/api/admin/analytics/excluded-ips/:ip", authenticateToken, requireAnalyticsAccess, async (req: any, res) => {
    try {
      await db.execute(sql`DELETE FROM analytics_excluded_ips WHERE ip_address = ${req.params.ip}`);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: analytics dashboard data ──────────────────────────────────────
  // ?days=30  — date window
  // ?show_bots=true — include bots (default: false = human only)
  app.get("/api/admin/visitor-analytics", authenticateToken, requireAnalyticsAccess, async (req: any, res) => {
    try {
      const range = parseInt((req.query.days as string) || "30");
      const showBots = req.query.show_bots === "true";
      const excludeMyTraffic = req.query.exclude_my_traffic === "true";
      const since = new Date(Date.now() - range * 86400000);

      // ── bot_filter clause — applied consistently everywhere ───────────────
      // Human-only: is_bot = FALSE (or NULL for old rows not yet backfilled)
      // Staff/owner sessions are ALWAYS excluded (even when showing bots), so
      // "Real Visitors" never includes your own admin traffic.
      const sessionBotFilter = showBots
        ? sql`(s.is_staff = FALSE OR s.is_staff IS NULL)`
        : sql`(s.is_bot = FALSE OR s.is_bot IS NULL) AND (s.is_staff = FALSE OR s.is_staff IS NULL)`;
      const pvBotFilter = showBots
        ? sql`TRUE`
        : sql`(pv.is_bot = FALSE OR pv.is_bot IS NULL)`;
      const sessionBotFilterSimple = showBots
        ? sql`TRUE`
        : sql`(is_bot = FALSE OR is_bot IS NULL)`;
      const pvBotFilterSimple = showBots
        ? sql`TRUE`
        : sql`(is_bot = FALSE OR is_bot IS NULL)`;

      // ── exclude_my_traffic filter — exclude sessions with no geo (dev/local) ───────────────
      const myTrafficFilter = excludeMyTraffic
        ? sql`(s.country IS NOT NULL AND s.country != '')`
        : sql`TRUE`;
      const myTrafficFilterSimple = excludeMyTraffic
        ? sql`(country IS NOT NULL AND country != '')`
        : sql`TRUE`;
      const myTrafficPvFilter = excludeMyTraffic
        ? sql`(s.country IS NOT NULL AND s.country != '')`
        : sql`TRUE`;

      // ── Count bots for the "Bots filtered" badge ─────────────────────────
      const botCountRes = await db.execute(sql`
        SELECT COUNT(DISTINCT s.id)::int AS bot_sessions, COUNT(pv.id)::int AS bot_views
        FROM visitor_sessions s
        LEFT JOIN page_views pv ON pv.session_id = s.id AND pv.occurred_at >= ${since}
        WHERE s.first_seen >= ${since}
          AND (s.is_bot = TRUE)
      `);

      // ── All queries use the same date window (occurred_at for PVs) ────────
      const [summaryRes, byPageRes, byCountryRes, byDayRes, capturesRes, recentRes, sourcesRes, byCityRes] = await Promise.all([
        // Summary — based on page_views.occurred_at so it matches byPage counts
        db.execute(sql`
          SELECT
            COUNT(pv.id)::int AS total_views,
            COUNT(DISTINCT pv.session_id)::int AS total_sessions,
            COUNT(DISTINCT CASE WHEN s.captured_email IS NOT NULL THEN s.captured_email END)::int AS email_captures,
            COUNT(DISTINCT CASE WHEN s.country IS NOT NULL THEN s.country END)::int AS countries
          FROM page_views pv
          JOIN visitor_sessions s ON s.id = pv.session_id
          WHERE pv.occurred_at >= ${since}
            AND ${pvBotFilter}
            AND ${sessionBotFilter}
            AND ${myTrafficFilter}
        `),
        // byPage — same date window, same bot filter
        db.execute(sql`
          SELECT pv.page, COUNT(pv.id)::int AS views, COUNT(DISTINCT pv.session_id)::int AS uniq
          FROM page_views pv
          JOIN visitor_sessions s ON s.id = pv.session_id
          WHERE pv.occurred_at >= ${since}
            AND ${pvBotFilter}
            AND ${sessionBotFilter}
            AND ${myTrafficFilter}
          GROUP BY pv.page ORDER BY views DESC LIMIT 20
        `),
        // byCountry — sessions that had page views in the window
        db.execute(sql`
          SELECT s.country, COUNT(DISTINCT s.id)::int AS sessions
          FROM page_views pv
          JOIN visitor_sessions s ON s.id = pv.session_id
          WHERE pv.occurred_at >= ${since}
            AND s.country IS NOT NULL
            AND ${pvBotFilter}
            AND ${sessionBotFilter}
            AND ${myTrafficFilter}
          GROUP BY s.country ORDER BY sessions DESC LIMIT 15
        `),
        // byDay — page_view date, consistent bot filter
        db.execute(sql`
          SELECT DATE(pv.occurred_at) AS day, COUNT(pv.id)::int AS views, COUNT(DISTINCT pv.session_id)::int AS sessions
          FROM page_views pv
          JOIN visitor_sessions s ON s.id = pv.session_id
          WHERE pv.occurred_at >= ${since}
            AND ${pvBotFilter}
            AND ${sessionBotFilter}
            AND ${myTrafficFilter}
          GROUP BY day ORDER BY day ASC
        `),
        // email captures — sessions with captured email that had page views in the window
        db.execute(sql`
          SELECT s.id, s.captured_email, s.captured_name, s.capture_page, s.captured_at, s.country, s.city, s.utm_source, s.utm_campaign
          FROM visitor_sessions s
          WHERE s.captured_email IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM page_views pv WHERE pv.session_id = s.id AND pv.occurred_at >= ${since}
                AND (pv.is_bot = FALSE OR pv.is_bot IS NULL)
            )
            AND ${sessionBotFilter}
            AND ${myTrafficFilter}
          ORDER BY s.captured_at DESC LIMIT 100
        `),
        // recent sessions — sessions that had page views in the window
        db.execute(sql`
          SELECT s.id, s.first_seen, s.last_seen, s.page_count, s.country, s.city, s.isp, s.org, s.referrer,
                 s.captured_email, s.utm_source, s.utm_campaign, s.is_bot,
                 STRING_AGG(pv.page, ' → ' ORDER BY pv.occurred_at) AS journey
          FROM visitor_sessions s
          JOIN page_views pv ON pv.session_id = s.id AND pv.occurred_at >= ${since}
          WHERE ${sessionBotFilter}
            AND ${myTrafficFilter}
            AND ${pvBotFilter}
          GROUP BY s.id, s.first_seen, s.last_seen, s.page_count, s.country, s.city, s.isp, s.org, s.referrer,
                   s.captured_email, s.utm_source, s.utm_campaign, s.is_bot
          ORDER BY MAX(pv.occurred_at) DESC LIMIT 50
        `),
        // traffic sources — sessions with page views in the window
        db.execute(sql`
          SELECT
            COALESCE(NULLIF(s.utm_source, ''), 'direct') AS source,
            COALESCE(NULLIF(s.utm_medium, ''), '') AS medium,
            COALESCE(NULLIF(s.utm_campaign, ''), '') AS campaign,
            CASE
              WHEN s.utm_source IS NOT NULL THEN s.utm_source
              WHEN s.referrer IS NOT NULL AND s.referrer != '' THEN
                regexp_replace(s.referrer, '^https?://([^/]+).*', '\\1')
              ELSE 'direct'
            END AS display_source,
            COUNT(DISTINCT s.id)::int AS sessions
          FROM page_views pv
          JOIN visitor_sessions s ON s.id = pv.session_id
          WHERE pv.occurred_at >= ${since}
            AND ${pvBotFilter}
            AND ${sessionBotFilter}
            AND ${myTrafficFilter}
          GROUP BY source, medium, campaign, display_source
          ORDER BY sessions DESC
          LIMIT 20
        `),
        // byCity — UK cities from sessions with page views in the window
        db.execute(sql`
          SELECT s.city, COUNT(DISTINCT s.id)::int AS sessions
          FROM page_views pv
          JOIN visitor_sessions s ON s.id = pv.session_id
          WHERE pv.occurred_at >= ${since}
            AND s.country = 'United Kingdom'
            AND s.city IS NOT NULL AND s.city != ''
            AND ${pvBotFilter}
            AND ${sessionBotFilter}
            AND ${myTrafficFilter}
          GROUP BY s.city
          ORDER BY sessions DESC
          LIMIT 20
        `),
      ]);

      res.json({
        summary: summaryRes.rows?.[0] || {},
        byPage: byPageRes.rows || [],
        byCountry: byCountryRes.rows || [],
        byDay: byDayRes.rows || [],
        emailCaptures: capturesRes.rows || [],
        recentSessions: recentRes.rows || [],
        trafficSources: sourcesRes.rows || [],
        byCity: byCityRes.rows || [],
        botCount: botCountRes.rows?.[0] || { bot_sessions: 0, bot_views: 0 },
        filters: { days: range, showBots },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: I Am Her funnel analytics ────────────────────────────
  app.get("/api/admin/iamher-funnel", authenticateToken, requireAnalyticsAccess, async (req: any, res) => {
    try {
      const range = parseInt((req.query.days as string) || "30");
      const excludeMyTraffic = req.query.exclude_my_traffic === "true";
      const since = new Date(Date.now() - range * 86400000);

      // Staff/owner sessions are always excluded from the funnel too.
      const geoFilter = excludeMyTraffic
        ? sql`AND s.country IS NOT NULL AND s.country != '' AND (s.is_staff = FALSE OR s.is_staff IS NULL)`
        : sql`AND (s.is_staff = FALSE OR s.is_staff IS NULL)`;
      const geoFilterSimple = excludeMyTraffic
        ? sql`AND (SELECT country FROM visitor_sessions s2 WHERE s2.id = session_id) IS NOT NULL
            AND (SELECT country FROM visitor_sessions s2 WHERE s2.id = session_id) != ''
            AND NOT EXISTS (SELECT 1 FROM visitor_sessions s3 WHERE s3.id = session_id AND s3.is_staff = TRUE)`
        : sql`AND NOT EXISTS (SELECT 1 FROM visitor_sessions s3 WHERE s3.id = session_id AND s3.is_staff = TRUE)`;

      // Funnel counts: unique sessions that performed each event
      const [funnelRes, eventsRes, byDayRes, bySourceRes, referralBreakdown] = await Promise.all([
        db.execute(sql`
          SELECT
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'page_visit' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS visitors,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'form_view' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_views,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'interest_capture' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS interest_captures,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'cta_click' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS cta_clicks,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'form_start' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_starts,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'form_complete' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_completes,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'submit_error' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS submit_errors,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'submit_success' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS submit_success,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'payment_view' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS payment_views,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'payment_initiated' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS payment_initiated
        `),
        // Recent events (human only)
        db.execute(sql`
          SELECT e.event_type, e.page, e.occurred_at, e.metadata, s.country, s.city
          FROM iamher_funnel_events e
          LEFT JOIN visitor_sessions s ON s.id = e.session_id
          WHERE e.occurred_at >= ${since} AND (e.is_bot = FALSE OR e.is_bot IS NULL)
            ${geoFilter}
          ORDER BY e.occurred_at DESC
          LIMIT 200
        `),
        // Daily funnel (human only)
        db.execute(sql`
          SELECT
            DATE(occurred_at) AS day,
            COUNT(DISTINCT CASE WHEN event_type = 'page_visit' THEN session_id END) AS visitors,
            COUNT(DISTINCT CASE WHEN event_type = 'form_view' THEN session_id END) AS form_views,
            COUNT(DISTINCT CASE WHEN event_type = 'interest_capture' THEN session_id END) AS interest_captures,
            COUNT(DISTINCT CASE WHEN event_type = 'cta_click' THEN session_id END) AS cta_clicks,
            COUNT(DISTINCT CASE WHEN event_type = 'form_start' THEN session_id END) AS form_starts,
            COUNT(DISTINCT CASE WHEN event_type = 'form_complete' THEN session_id END) AS form_completes,
            COUNT(DISTINCT CASE WHEN event_type = 'submit_error' THEN session_id END) AS submit_errors,
            COUNT(DISTINCT CASE WHEN event_type = 'submit_success' THEN session_id END) AS submit_success
          FROM iamher_funnel_events
          WHERE occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
            ${geoFilterSimple}
          GROUP BY day
          ORDER BY day ASC
        `),
        // By source (join with visitor_sessions, human only)
        db.execute(sql`
          SELECT
            COALESCE(NULLIF(s.utm_source, ''), 'direct') AS source,
            COUNT(DISTINCT CASE WHEN e.event_type = 'page_visit' THEN e.session_id END) AS visitors,
            COUNT(DISTINCT CASE WHEN s.captured_email IS NOT NULL THEN e.session_id END) AS email_captures,
            COUNT(DISTINCT CASE WHEN e.event_type = 'cta_click' THEN e.session_id END) AS cta_clicks,
            COUNT(DISTINCT CASE WHEN e.event_type = 'form_start' THEN e.session_id END) AS form_starts,
            COUNT(DISTINCT CASE WHEN e.event_type = 'submit_success' THEN e.session_id END) AS submit_success
          FROM iamher_funnel_events e
          JOIN visitor_sessions s ON s.id = e.session_id
          WHERE e.occurred_at >= ${since} AND (e.is_bot = FALSE OR e.is_bot IS NULL)
            ${geoFilter}
          GROUP BY source
          ORDER BY visitors DESC
          LIMIT 15
        `),
        // Referral source breakdown (from visitor_sessions.email_captures + interest table)
        db.execute(sql`
          SELECT
            COALESCE(NULLIF(s.referral_source, ''), 'not_specified') AS source,
            COUNT(DISTINCT s.id) AS email_captures,
            COUNT(DISTINCT i.id) AS registrations
          FROM visitor_sessions s
          LEFT JOIN event_16july_interest i ON i.email = s.captured_email AND i.referral_source = s.referral_source
          WHERE s.captured_at >= ${since}
            AND s.captured_email IS NOT NULL
            ${geoFilter}
          GROUP BY s.referral_source
          ORDER BY email_captures DESC
          LIMIT 15
        `),
      ]);

      const f = funnelRes.rows?.[0] || {};
      const visitors = Number(f.visitors) || 0;
      const formViews = Number(f.form_views) || 0;
      const interestCaptures = Number(f.interest_captures) || 0;
      const cta = Number(f.cta_clicks) || 0;
      const starts = Number(f.form_starts) || 0;
      const completes = Number(f.form_completes) || 0;
      const submitErrors = Number(f.submit_errors) || 0;
      const success = Number(f.submit_success) || 0;

      const funnel = {
        visitors,
        form_views: formViews,
        interest_captures: interestCaptures,
        cta_clicks: cta,
        form_starts: starts,
        form_completes: completes,
        submit_errors: submitErrors,
        submit_success: success,
        payment_views: Number(f.payment_views) || 0,
        payment_initiated: Number(f.payment_initiated) || 0,
        // Conversion rates
        interest_capture_rate: visitors ? ((interestCaptures / visitors) * 100).toFixed(1) : "0",
        cta_rate: visitors ? ((cta / visitors) * 100).toFixed(1) : "0",
        form_start_rate: visitors ? ((starts / visitors) * 100).toFixed(1) : "0",
        form_complete_rate: starts ? ((completes / starts) * 100).toFixed(1) : "0",
        submit_rate: visitors ? ((success / visitors) * 100).toFixed(1) : "0",
        submit_error_rate: starts ? ((submitErrors / starts) * 100).toFixed(1) : "0",
        drop_cta_to_start: cta ? (((cta - starts) / cta) * 100).toFixed(1) : "0",
        drop_start_to_complete: starts ? (((starts - completes) / starts) * 100).toFixed(1) : "0",
        drop_complete_to_submit: completes ? (((completes - success) / completes) * 100).toFixed(1) : "0",
      };

      res.json({
        funnel,
        events: eventsRes.rows || [],
        byDay: byDayRes.rows || [],
        bySource: bySourceRes.rows || [],
        referralBreakdown: referralBreakdown.rows || [],
        days: range,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: I Am Her funnel live (today, real-time) ───────────────────
  app.get("/api/admin/iamher-funnel/live", authenticateToken, requireAnalyticsAccess, async (req: any, res) => {
    try {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const excludeMyTraffic = req.query.exclude_my_traffic === "true";
      // Staff/owner sessions are always excluded from the funnel too.
      const geoFilter = excludeMyTraffic
        ? sql`AND s.country IS NOT NULL AND s.country != '' AND (s.is_staff = FALSE OR s.is_staff IS NULL)`
        : sql`AND (s.is_staff = FALSE OR s.is_staff IS NULL)`;
      const geoFilterSimple = excludeMyTraffic
        ? sql`AND (SELECT country FROM visitor_sessions s2 WHERE s2.id = session_id) IS NOT NULL
            AND (SELECT country FROM visitor_sessions s2 WHERE s2.id = session_id) != ''
            AND NOT EXISTS (SELECT 1 FROM visitor_sessions s3 WHERE s3.id = session_id AND s3.is_staff = TRUE)`
        : sql`AND NOT EXISTS (SELECT 1 FROM visitor_sessions s3 WHERE s3.id = session_id AND s3.is_staff = TRUE)`;

      const [funnel, topSource] = await Promise.all([
        db.execute(sql`
          SELECT
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'page_visit' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS visitors,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'form_view' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_views,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'interest_capture' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS interest_captures,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'cta_click' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS cta_clicks,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'form_start' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_starts,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'form_complete' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_completes,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'submit_error' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS submit_errors,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE event_type = 'submit_success' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS submit_success
        `),
        db.execute(sql`
          SELECT COALESCE(NULLIF(s.utm_source, ''), 'direct') AS source, COUNT(DISTINCT e.session_id) AS visitors
          FROM iamher_funnel_events e
          JOIN visitor_sessions s ON s.id = e.session_id
          WHERE e.event_type = 'page_visit' AND e.occurred_at >= ${startOfDay} AND (e.is_bot = FALSE OR e.is_bot IS NULL)
            ${geoFilter}
          GROUP BY source
          ORDER BY visitors DESC
          LIMIT 1
        `),
      ]);

      const f = funnel.rows?.[0] || {};
      const visitors = Number(f.visitors) || 0;
      const formViews = Number(f.form_views) || 0;
      const interestCaptures = Number(f.interest_captures) || 0;
      const cta = Number(f.cta_clicks) || 0;
      const starts = Number(f.form_starts) || 0;
      const completes = Number(f.form_completes) || 0;
      const submitErrors = Number(f.submit_errors) || 0;
      const success = Number(f.submit_success) || 0;

      res.json({
        funnel: {
          visitors,
          form_views: formViews,
          interest_captures: interestCaptures,
          cta_clicks: cta,
          form_starts: starts,
          form_completes: completes,
          submit_errors: submitErrors,
          submit_success: success,
          interest_capture_rate: visitors ? ((interestCaptures / visitors) * 100).toFixed(1) : "0",
          cta_rate: visitors ? ((cta / visitors) * 100).toFixed(1) : "0",
          form_start_rate: visitors ? ((starts / visitors) * 100).toFixed(1) : "0",
          submit_error_rate: starts ? ((submitErrors / starts) * 100).toFixed(1) : "0",
          submit_rate: visitors ? ((success / visitors) * 100).toFixed(1) : "0",
          drop_cta_to_start: cta ? (((cta - starts) / cta) * 100).toFixed(1) : "0",
        },
        topSource: topSource.rows?.[0] || null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: Booth Funnel analytics ───────────────────────────────
  app.get("/api/admin/booth-funnel", authenticateToken, requireAnalyticsAccess, async (req: any, res) => {
    try {
      const range = parseInt((req.query.days as string) || "30");
      const excludeMyTraffic = req.query.exclude_my_traffic === "true";
      const since = new Date(Date.now() - range * 86400000);
      // Staff/owner sessions are always excluded from the funnel too.
      const geoFilter = excludeMyTraffic
        ? sql`AND s.country IS NOT NULL AND s.country != '' AND (s.is_staff = FALSE OR s.is_staff IS NULL)`
        : sql`AND (s.is_staff = FALSE OR s.is_staff IS NULL)`;
      const geoFilterSimple = excludeMyTraffic
        ? sql`AND (SELECT country FROM visitor_sessions s2 WHERE s2.id = session_id) IS NOT NULL
            AND (SELECT country FROM visitor_sessions s2 WHERE s2.id = session_id) != ''
            AND NOT EXISTS (SELECT 1 FROM visitor_sessions s3 WHERE s3.id = session_id AND s3.is_staff = TRUE)`
        : sql`AND NOT EXISTS (SELECT 1 FROM visitor_sessions s3 WHERE s3.id = session_id AND s3.is_staff = TRUE)`;
      const pageFilter = sql`(page = '/360-booth-hire-milton-keynes' OR page = '/photo-booth-nigeria' OR page = '/photobooth')`;
      const ukPageFilter = sql`(page = '/360-booth-hire-milton-keynes' OR page = '/photobooth')`;
      const ngPageFilter = sql`(page = '/photo-booth-nigeria')`;

      const [funnelRes, eventsRes, byDayRes, byPageRes, bySourceRes] = await Promise.all([
        db.execute(sql`
          SELECT
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${ukPageFilter} AND event_type = 'page_visit' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS uk_visitors,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${ngPageFilter} AND event_type = 'page_visit' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS ng_visitors,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${pageFilter} AND event_type = 'cta_click' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS cta_clicks,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${pageFilter} AND event_type = 'form_start' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_starts,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${pageFilter} AND event_type = 'form_complete' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_completes,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${pageFilter} AND event_type = 'submit_success' AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS submit_success
        `),
        db.execute(sql`
          SELECT e.event_type, e.page, e.occurred_at, e.metadata, s.country, s.city
          FROM iamher_funnel_events e
          LEFT JOIN visitor_sessions s ON s.id = e.session_id
          WHERE (e.page = '/360-booth-hire-milton-keynes' OR e.page = '/photo-booth-nigeria' OR e.page = '/photobooth')
            AND e.occurred_at >= ${since} AND (e.is_bot = FALSE OR e.is_bot IS NULL)
            ${geoFilter}
          ORDER BY e.occurred_at DESC
          LIMIT 200
        `),
        db.execute(sql`
          SELECT
            DATE(occurred_at) AS day,
            COUNT(DISTINCT CASE WHEN event_type = 'page_visit' THEN session_id END) AS visitors,
            COUNT(DISTINCT CASE WHEN event_type = 'cta_click' THEN session_id END) AS cta_clicks,
            COUNT(DISTINCT CASE WHEN event_type = 'form_start' THEN session_id END) AS form_starts,
            COUNT(DISTINCT CASE WHEN event_type = 'submit_success' THEN session_id END) AS submit_success
          FROM iamher_funnel_events
          WHERE (page = '/360-booth-hire-milton-keynes' OR page = '/photo-booth-nigeria' OR page = '/photobooth')
            AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
            ${geoFilterSimple}
          GROUP BY day
          ORDER BY day ASC
        `),
        db.execute(sql`
          SELECT
            page,
            COUNT(DISTINCT CASE WHEN event_type = 'page_visit' THEN session_id END) AS visitors,
            COUNT(DISTINCT CASE WHEN event_type = 'cta_click' THEN session_id END) AS cta_clicks,
            COUNT(DISTINCT CASE WHEN event_type = 'form_start' THEN session_id END) AS form_starts,
            COUNT(DISTINCT CASE WHEN event_type = 'submit_success' THEN session_id END) AS submit_success
          FROM iamher_funnel_events
          WHERE (page = '/360-booth-hire-milton-keynes' OR page = '/photo-booth-nigeria' OR page = '/photobooth')
            AND occurred_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
            ${geoFilterSimple}
          GROUP BY page
        `),
        db.execute(sql`
          SELECT
            COALESCE(NULLIF(s.utm_source, ''), 'direct') AS source,
            COUNT(DISTINCT CASE WHEN e.event_type = 'page_visit' THEN e.session_id END) AS visitors,
            COUNT(DISTINCT CASE WHEN e.event_type = 'cta_click' THEN e.session_id END) AS cta_clicks,
            COUNT(DISTINCT CASE WHEN e.event_type = 'submit_success' THEN e.session_id END) AS submit_success
          FROM iamher_funnel_events e
          JOIN visitor_sessions s ON s.id = e.session_id
          WHERE (e.page = '/360-booth-hire-milton-keynes' OR e.page = '/photo-booth-nigeria' OR e.page = '/photobooth')
            AND e.occurred_at >= ${since} AND (e.is_bot = FALSE OR e.is_bot IS NULL)
            ${geoFilter}
          GROUP BY source
          ORDER BY visitors DESC
          LIMIT 15
        `),
      ]);

      const f = funnelRes.rows?.[0] || {};
      const uk = Number(f.uk_visitors) || 0;
      const ng = Number(f.ng_visitors) || 0;
      const cta = Number(f.cta_clicks) || 0;
      const starts = Number(f.form_starts) || 0;
      const completes = Number(f.form_completes) || 0;
      const success = Number(f.submit_success) || 0;
      const total = uk + ng;

      const funnel = {
        uk_visitors: uk,
        ng_visitors: ng,
        cta_clicks: cta,
        form_starts: starts,
        form_completes: completes,
        submit_success: success,
        cta_rate: total ? ((cta / total) * 100).toFixed(1) : "0",
        form_start_rate: total ? ((starts / total) * 100).toFixed(1) : "0",
        form_complete_rate: starts ? ((completes / starts) * 100).toFixed(1) : "0",
        submit_rate: total ? ((success / total) * 100).toFixed(1) : "0",
        drop_cta_to_start: cta ? (((cta - starts) / cta) * 100).toFixed(1) : "0",
        drop_start_to_complete: starts ? (((starts - completes) / starts) * 100).toFixed(1) : "0",
      };

      res.json({
        funnel,
        events: eventsRes.rows || [],
        byDay: byDayRes.rows || [],
        byPage: byPageRes.rows || [],
        bySource: bySourceRes.rows || [],
        days: range,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: Booth Funnel live (today, real-time) ───────────────────
  app.get("/api/admin/booth-funnel/live", authenticateToken, requireAnalyticsAccess, async (req: any, res) => {
    try {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const excludeMyTraffic = req.query.exclude_my_traffic === "true";
      // Staff/owner sessions are always excluded from the funnel too.
      const geoFilter = excludeMyTraffic
        ? sql`AND s.country IS NOT NULL AND s.country != '' AND (s.is_staff = FALSE OR s.is_staff IS NULL)`
        : sql`AND (s.is_staff = FALSE OR s.is_staff IS NULL)`;
      const geoFilterSimple = excludeMyTraffic
        ? sql`AND (SELECT country FROM visitor_sessions s2 WHERE s2.id = session_id) IS NOT NULL
            AND (SELECT country FROM visitor_sessions s2 WHERE s2.id = session_id) != ''
            AND NOT EXISTS (SELECT 1 FROM visitor_sessions s3 WHERE s3.id = session_id AND s3.is_staff = TRUE)`
        : sql`AND NOT EXISTS (SELECT 1 FROM visitor_sessions s3 WHERE s3.id = session_id AND s3.is_staff = TRUE)`;
      const pageFilter = sql`(page = '/360-booth-hire-milton-keynes' OR page = '/photo-booth-nigeria' OR page = '/photobooth')`;
      const ukPageFilter = sql`(page = '/360-booth-hire-milton-keynes' OR page = '/photobooth')`;
      const ngPageFilter = sql`(page = '/photo-booth-nigeria')`;

      const [funnel, topSource] = await Promise.all([
        db.execute(sql`
          SELECT
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${ukPageFilter} AND event_type = 'page_visit' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS uk_visitors,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${ngPageFilter} AND event_type = 'page_visit' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS ng_visitors,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${pageFilter} AND event_type = 'cta_click' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS cta_clicks,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${pageFilter} AND event_type = 'form_start' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_starts,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${pageFilter} AND event_type = 'form_complete' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS form_completes,
            (SELECT COUNT(DISTINCT session_id) FROM iamher_funnel_events WHERE ${pageFilter} AND event_type = 'submit_success' AND occurred_at >= ${startOfDay} AND (is_bot = FALSE OR is_bot IS NULL) ${geoFilterSimple}) AS submit_success
        `),
        db.execute(sql`
          SELECT COALESCE(NULLIF(s.utm_source, ''), 'direct') AS source, COUNT(DISTINCT e.session_id) AS visitors
          FROM iamher_funnel_events e
          JOIN visitor_sessions s ON s.id = e.session_id
          WHERE (e.page = '/360-booth-hire-milton-keynes' OR e.page = '/photo-booth-nigeria' OR e.page = '/photobooth')
            AND e.event_type = 'page_visit' AND e.occurred_at >= ${startOfDay} AND (e.is_bot = FALSE OR e.is_bot IS NULL)
            ${geoFilter}
          GROUP BY source
          ORDER BY visitors DESC
          LIMIT 1
        `),
      ]);

      const f = funnel.rows?.[0] || {};
      const ukVisitors = Number(f.uk_visitors) || 0;
      const ngVisitors = Number(f.ng_visitors) || 0;
      const visitors = ukVisitors + ngVisitors;
      const cta = Number(f.cta_clicks) || 0;
      const starts = Number(f.form_starts) || 0;
      const completes = Number(f.form_completes) || 0;
      const success = Number(f.submit_success) || 0;

      res.json({
        funnel: {
          uk_visitors: ukVisitors,
          ng_visitors: ngVisitors,
          visitors,
          cta_clicks: cta,
          form_starts: starts,
          form_completes: completes,
          submit_success: success,
          cta_rate: visitors ? ((cta / visitors) * 100).toFixed(1) : "0",
          form_start_rate: visitors ? ((starts / visitors) * 100).toFixed(1) : "0",
          submit_rate: visitors ? ((success / visitors) * 100).toFixed(1) : "0",
        },
        topSource: topSource.rows?.[0] || null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: Recent conversions (for real-time alerts) ───────────────
  app.get("/api/admin/conversions/recent", authenticateToken, requireAnalyticsAccess, async (req: any, res) => {
    try {
      const minutes = parseInt((req.query.minutes as string) || "30");
      const since = new Date(Date.now() - minutes * 60000);

      const [emailCaptures, storySubmissions, boothSubmissions] = await Promise.all([
        db.execute(sql`
          SELECT id, captured_email, captured_name, capture_page, captured_at, country, city, utm_source
          FROM visitor_sessions
          WHERE captured_at >= ${since} AND (is_bot = FALSE OR is_bot IS NULL)
          ORDER BY captured_at DESC LIMIT 50
        `),
        db.execute(sql`
          SELECT id, email, name, category, created_at
          FROM iamher_stories
          WHERE created_at >= ${since}
          ORDER BY created_at DESC LIMIT 50
        `),
        db.execute(sql`
          SELECT e.id, e.session_id, e.page, e.occurred_at, e.metadata, s.country, s.city
          FROM iamher_funnel_events e
          LEFT JOIN visitor_sessions s ON s.id = e.session_id
          WHERE e.event_type = 'submit_success' AND e.occurred_at >= ${since} AND (e.is_bot = FALSE OR e.is_bot IS NULL)
          ORDER BY e.occurred_at DESC LIMIT 50
        `),
      ]);

      res.json({
        emailCaptures: emailCaptures.rows || [],
        storySubmissions: storySubmissions.rows || [],
        boothSubmissions: boothSubmissions.rows || [],
        since: since.toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: Mark conversion alert as seen ───────────────────────────
  app.post("/api/admin/conversions/seen", authenticateToken, requireAnalyticsAccess, async (_req: any, res) => {
    res.json({ ok: true });
  });
}
