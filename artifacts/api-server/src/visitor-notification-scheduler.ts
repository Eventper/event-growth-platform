// Single digest policy: one combined digest at 08:00 UK daily.
import { db } from "./db";
import { sql } from "drizzle-orm";

async function sendEmail(to: string, subject: string, html: string) {
  const { emailService } = await import("./emailService");
  await emailService.sendEmail(to, subject, html);
}

function digestRecipients(): string[] {
  return ["info@eventperfekt.com"];
}

async function sendDigest(subject: string, html: string) {
  const recipients = digestRecipients();
  await Promise.all(recipients.map((to) => sendEmail(to, subject, html)));
}

async function getStatsForPeriod(start: Date, end: Date, excludeStaff: boolean = true) {
  const staffFilter = excludeStaff
    ? sql` AND (s.country IS NOT NULL AND s.country != '') AND (s.is_staff = FALSE OR s.is_staff IS NULL)`
    : sql` AND (s.is_staff = FALSE OR s.is_staff IS NULL)`;
  const [s, pages, countries, captures, excluded] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(pv.id)::int AS views,
        COUNT(DISTINCT pv.session_id)::int AS sessions,
        COUNT(DISTINCT CASE WHEN s.captured_email IS NOT NULL THEN s.captured_email END)::int AS emails
      FROM page_views pv
      JOIN visitor_sessions s ON s.id = pv.session_id
      WHERE pv.occurred_at >= ${start} AND pv.occurred_at < ${end}
        AND (s.is_bot = FALSE OR s.is_bot IS NULL)
        AND (pv.is_bot = FALSE OR pv.is_bot IS NULL)
        ${staffFilter}
    `),
    db.execute(sql`
      SELECT page, COUNT(*)::int AS views
      FROM page_views pv
      JOIN visitor_sessions s ON s.id = pv.session_id
      WHERE pv.occurred_at >= ${start} AND pv.occurred_at < ${end}
        AND (s.is_bot = FALSE OR s.is_bot IS NULL)
        AND (pv.is_bot = FALSE OR pv.is_bot IS NULL)
        ${staffFilter}
      GROUP BY page ORDER BY views DESC LIMIT 5
    `),
    db.execute(sql`
      SELECT s.country, COUNT(DISTINCT s.id)::int AS sessions
      FROM page_views pv
      JOIN visitor_sessions s ON s.id = pv.session_id
      WHERE pv.occurred_at >= ${start} AND pv.occurred_at < ${end}
        AND s.country IS NOT NULL
        AND (s.is_bot = FALSE OR s.is_bot IS NULL)
        AND (pv.is_bot = FALSE OR pv.is_bot IS NULL)
        ${staffFilter}
      GROUP BY s.country ORDER BY sessions DESC LIMIT 5
    `),
    db.execute(sql`
      SELECT s.captured_name, s.captured_email, s.capture_page, s.captured_at, s.country, s.city
      FROM visitor_sessions s
      WHERE s.captured_email IS NOT NULL
        AND (s.country IS NOT NULL AND s.country != '')
        AND EXISTS (
          SELECT 1 FROM page_views pv
          WHERE pv.session_id = s.id AND pv.occurred_at >= ${start} AND pv.occurred_at < ${end}
            AND (pv.is_bot = FALSE OR pv.is_bot IS NULL)
        )
        AND (s.is_bot = FALSE OR s.is_bot IS NULL)
      ORDER BY s.captured_at DESC LIMIT 10
    `),
    // What we filtered out — so the headline numbers are explainable, not "broken".
    db.execute(sql`
      SELECT
        COUNT(DISTINCT s.id) FILTER (WHERE s.is_bot = TRUE)::int AS bot_sessions,
        COUNT(pv.id) FILTER (WHERE s.is_bot = TRUE OR pv.is_bot = TRUE)::int AS bot_views,
        COUNT(DISTINCT s.id) FILTER (
          WHERE (s.is_bot = FALSE OR s.is_bot IS NULL) AND s.is_staff = TRUE
        )::int AS staff_sessions,
        COUNT(DISTINCT s.id) FILTER (
          WHERE (s.is_bot = FALSE OR s.is_bot IS NULL)
            AND (s.is_staff = FALSE OR s.is_staff IS NULL)
            AND (s.country IS NULL OR s.country = '')
        )::int AS untracked_sessions
      FROM page_views pv
      JOIN visitor_sessions s ON s.id = pv.session_id
      WHERE pv.occurred_at >= ${start} AND pv.occurred_at < ${end}
    `),
  ]);
  return {
    summary: (s.rows?.[0] || {}) as any,
    pages: (pages.rows || []) as any[],
    countries: (countries.rows || []) as any[],
    captures: (captures.rows || []) as any[],
    excluded: (excluded.rows?.[0] || {}) as any,
  };
}

async function getStats(days: number) {
  const since = new Date(Date.now() - days * 86400000);
  return getStatsForPeriod(since, new Date());
}

function statsTable(rows: any[], col1: string, col2: string) {
  if (!rows.length) return `<p style="color:#888;font-size:13px;">No data yet.</p>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:#f5f0ed;"><th style="text-align:left;padding:6px 10px;">${col1}</th><th style="text-align:right;padding:6px 10px;">${col2}</th></tr>
    ${rows.map((r, i) => `<tr style="background:${i % 2 ? '#fff' : '#faf8f6'};"><td style="padding:6px 10px;">${r[Object.keys(r)[0]]}</td><td style="text-align:right;padding:6px 10px;">${r[Object.keys(r)[1]]}</td></tr>`).join('')}
  </table>`;
}

function capturesList(rows: any[]) {
  if (!rows.length) return `<p style="color:#888;font-size:13px;">No email captures in this period.</p>`;
  return rows.map(r => `
    <div style="border-left:3px solid #C9A961;padding:8px 12px;margin-bottom:8px;background:#faf8f6;">
      <strong>${r.captured_name || 'Anonymous'}</strong> — <a href="mailto:${r.captured_email}" style="color:#330311;">${r.captured_email}</a><br/>
      <span style="font-size:12px;color:#888;">${r.capture_page || ''} · ${r.city || ''}${r.city && r.country ? ', ' : ''}${r.country || ''} · ${r.captured_at ? new Date(r.captured_at).toLocaleDateString('en-GB') : ''}</span>
    </div>`).join('');
}

function buildEmail(title: string, periodLabel: string, data: Awaited<ReturnType<typeof getStats>>) {
  const { summary, pages, countries, captures, excluded } = data;
  const botSessions = Number(excluded?.bot_sessions) || 0;
  const botViews = Number(excluded?.bot_views) || 0;
  const staffSessions = Number(excluded?.staff_sessions) || 0;
  const untracked = Number(excluded?.untracked_sessions) || 0;
  const exclusionNote =
    botSessions || botViews || staffSessions || untracked
      ? `Verified external visitors only. Excluded this period: ${botSessions} bot session${botSessions === 1 ? "" : "s"} (${botViews} bot page view${botViews === 1 ? "" : "s"}), ${staffSessions} staff/owner session${staffSessions === 1 ? "" : "s"} (admin pages), and ${untracked} untracked/local session${untracked === 1 ? "" : "s"} (previews and traffic with no location).`
      : `Verified external visitors only. No bot, staff or untracked traffic to exclude this period.`;
  return `
    <div style="font-family:Georgia,serif;max-width:620px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
      <div style="background:#330311;padding:28px 32px;text-align:center;">
        <p style="margin:0;color:#C9A961;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;font-family:Arial,sans-serif;">Event Perfekt · Site Intelligence</p>
        <h1 style="margin:10px 0 0;color:#fff;font-size:22px;font-weight:normal;">${title}</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;font-family:Arial,sans-serif;">${periodLabel}</p>
      </div>
      <div style="padding:32px;">
        <div style="display:flex;gap:16px;margin-bottom:32px;">
          ${[
            ['Real Visitors', summary.sessions || 0],
            ['Page Views', summary.views || 0],
            ['Emails Captured', summary.emails || 0],
          ].map(([label, val]) => `
            <div style="flex:1;background:#f5f0ed;padding:18px 16px;text-align:center;border-radius:4px;">
              <div style="font-size:28px;font-weight:bold;color:#330311;">${val}</div>
              <div style="font-size:11px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">${label}</div>
            </div>`).join('')}
        </div>

        <p style="font-size:11px;color:#999;font-family:Arial,sans-serif;margin:-16px 0 28px;line-height:1.5;">${exclusionNote}</p>

        <h3 style="font-size:14px;color:#330311;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 12px;font-family:Arial,sans-serif;">Top Pages</h3>
        ${statsTable(pages, 'Page', 'Views')}

        <h3 style="font-size:14px;color:#330311;letter-spacing:0.08em;text-transform:uppercase;margin:24px 0 12px;font-family:Arial,sans-serif;">Visitor Countries</h3>
        ${statsTable(countries, 'Country', 'Sessions')}

        <h3 style="font-size:14px;color:#330311;letter-spacing:0.08em;text-transform:uppercase;margin:24px 0 12px;font-family:Arial,sans-serif;">Email Captures</h3>
        ${capturesList(captures)}

        <div style="margin-top:36px;padding-top:20px;border-top:1px solid #eee;">
          <a href="https://eventperfekt.net/admin/visitor-analytics" style="background:#330311;color:#fff;text-decoration:none;padding:12px 28px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.08em;display:inline-block;">VIEW FULL DASHBOARD</a>
        </div>
      </div>
      <p style="text-align:center;font-size:11px;color:#bbb;font-family:Arial,sans-serif;padding-bottom:24px;">Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG · …making yours perfekt</p>
    </div>`;
}

async function sendDailyDigest() {
  try {
    const { start, end } = getYesterdayBounds();
    const [data, funnelData] = await Promise.all([
      getStatsForPeriod(start, end),
      getIAmHerFunnelStats(true),
    ]);
    const { summary } = data;
    const { funnel: dailyFunnel, storyCount } = funnelData;
    const funnelVisitors = Number(dailyFunnel.visitors) || 0;
    const funnelSuccess = Number(dailyFunnel.submit_success) || 0;

    // Skip only if BOTH site and funnel have zero activity
    if ((summary.sessions || 0) === 0 && funnelVisitors === 0) return;

    const dateStr = start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timeRange = `${start.toISOString().slice(0, 10)} 00:00 UTC — ${end.toISOString().slice(0, 10)} 00:00 UTC`;

    // Build site stats HTML
    let html = buildEmail("Daily Visitor Summary", `Yesterday · ${dateStr} · ${timeRange}`, data);

    // Inject funnel section before the closing </div></body></html>
    const funnelSection = funnelVisitors > 0 ? `
      <div style="padding:24px 32px;background:#fafafa;border-top:1px solid #eee;">
        <h2 style="color:#330311;font-size:16px;margin:0 0 12px;">I Am Her Funnel (yesterday)</h2>
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
          ${[['Visitors', funnelVisitors], ['CTA Clicks', Number(dailyFunnel.cta_clicks) || 0], ['Form Starts', Number(dailyFunnel.form_starts) || 0], ['Submissions', funnelSuccess], ['Stories', storyCount || 0]].map(([label, val]) => `
            <div style="flex:1;min-width:100px;background:#f5f0ed;padding:14px 10px;text-align:center;border-radius:4px;">
              <div style="font-size:24px;font-weight:bold;color:#330311;">${val}</div>
              <div style="font-size:11px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">${label}</div>
            </div>`).join('')}
        </div>
        <p style="margin:0;font-size:13px;color:#555;">CTA rate: ${funnelVisitors ? ((Number(dailyFunnel.cta_clicks || 0) / funnelVisitors) * 100).toFixed(1) : 0}% · Conversion: ${funnelVisitors ? ((funnelSuccess / funnelVisitors) * 100).toFixed(1) : 0}%</p>
      </div>` : '';

    if (funnelSection) {
      // buildEmail() returns a bare <div>…</div> (no </body></html>), so anchor the
      // injection on the footer paragraph, which always exists. Fallback: append.
      const footerAnchor = '<p style="text-align:center;font-size:11px;color:#bbb;';
      html = html.includes(footerAnchor)
        ? html.replace(footerAnchor, `${funnelSection}${footerAnchor}`)
        : html + funnelSection;
    }

    const subject = `📊 Daily: ${summary.sessions || 0} visitors · I Am Her: ${funnelVisitors} visitors, ${funnelSuccess} submissions`;
    await sendDigest(subject, html);
    console.log(`[VisitorNotify] Daily digest sent — site: ${summary.sessions || 0} sessions, funnel: ${funnelVisitors} visitors`);
  } catch (err: any) {
    console.warn("[VisitorNotify] Daily digest error:", err.message);
  }
}

async function sendWeeklyDigest() {
  try {
    const data = await getStats(7);
    const { summary } = data;
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const html = buildEmail("Weekly Site Report", `Last 7 days · w/e ${dateStr}`, data);
    await sendDigest(`📈 Weekly report: ${summary.sessions} visitors, ${summary.emails} email captures`, html);
    console.log(`[VisitorNotify] Weekly digest sent — ${summary.sessions} sessions`);
  } catch (err: any) {
    console.warn("[VisitorNotify] Weekly digest error:", err.message);
  }
}

// ─── Helper: get calendar-day boundaries for yesterday (UTC) ─────────────────
function getYesterdayBounds() {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  return { start: startOfYesterday, end: startOfToday };
}

// ─── I Am Her Funnel daily digest ─────────────────────────────────────────────
async function getIAmHerFunnelStats(yesterdayOnly: boolean, excludeStaff: boolean = true) {
  const { start, end } = yesterdayOnly ? getYesterdayBounds() : { start: new Date(Date.now() - 30 * 86400000), end: new Date() };
  // Exclude staff traffic: sessions with no geo data (local dev) or known admin IPs
  const staffFilter = excludeStaff
    ? sql` AND (s.country IS NOT NULL AND s.country != '') AND (s.is_staff = FALSE OR s.is_staff IS NULL)`
    : sql` AND (s.is_staff = FALSE OR s.is_staff IS NULL)`;
  const [funnel, topSource, storyCount] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT COUNT(DISTINCT e.session_id) FROM iamher_funnel_events e JOIN visitor_sessions s ON s.id = e.session_id WHERE e.event_type = 'page_visit' AND e.occurred_at >= ${start} AND e.occurred_at < ${end} AND (e.is_bot = FALSE OR e.is_bot IS NULL) AND (s.is_bot = FALSE OR s.is_bot IS NULL) ${staffFilter}) AS visitors,
        (SELECT COUNT(DISTINCT e.session_id) FROM iamher_funnel_events e JOIN visitor_sessions s ON s.id = e.session_id WHERE e.event_type = 'cta_click' AND e.occurred_at >= ${start} AND e.occurred_at < ${end} AND (e.is_bot = FALSE OR e.is_bot IS NULL) AND (s.is_bot = FALSE OR s.is_bot IS NULL) ${staffFilter}) AS cta_clicks,
        (SELECT COUNT(DISTINCT e.session_id) FROM iamher_funnel_events e JOIN visitor_sessions s ON s.id = e.session_id WHERE e.event_type = 'form_start' AND e.occurred_at >= ${start} AND e.occurred_at < ${end} AND (e.is_bot = FALSE OR e.is_bot IS NULL) AND (s.is_bot = FALSE OR s.is_bot IS NULL) ${staffFilter}) AS form_starts,
        (SELECT COUNT(DISTINCT e.session_id) FROM iamher_funnel_events e JOIN visitor_sessions s ON s.id = e.session_id WHERE e.event_type = 'submit_success' AND e.occurred_at >= ${start} AND e.occurred_at < ${end} AND (e.is_bot = FALSE OR e.is_bot IS NULL) AND (s.is_bot = FALSE OR s.is_bot IS NULL) ${staffFilter}) AS submit_success
    `),
    db.execute(sql`
      SELECT COALESCE(NULLIF(s.utm_source, ''), 'direct') AS source, COUNT(DISTINCT e.session_id) AS visitors
      FROM iamher_funnel_events e
      JOIN visitor_sessions s ON s.id = e.session_id
      WHERE e.event_type = 'page_visit' AND e.occurred_at >= ${start} AND e.occurred_at < ${end}
        AND (e.is_bot = FALSE OR e.is_bot IS NULL)
        AND (s.is_bot = FALSE OR s.is_bot IS NULL)
        ${staffFilter}
      GROUP BY source
      ORDER BY visitors DESC
      LIMIT 1
    `),
    db.execute(sql`
      SELECT COUNT(*)::int AS count FROM iamher_stories WHERE created_at >= ${start} AND created_at < ${end}
    `),
  ]);
  return { funnel: (funnel.rows?.[0] || {}) as any, topSource: (topSource.rows?.[0] || null) as any, storyCount: (storyCount.rows?.[0]?.count || 0) as number };
}

async function sendIAmHerFunnelDigest() {
  try {
    const { start, end } = getYesterdayBounds();
    const { funnel: daily, topSource: dailySource, storyCount } = await getIAmHerFunnelStats(true);
    const { funnel: rolling } = await getIAmHerFunnelStats(false);
    const visitors = Number(daily.visitors) || 0;
    const cta = Number(daily.cta_clicks) || 0;
    const starts = Number(daily.form_starts) || 0;
    const success = Number(daily.submit_success) || 0;
    if (visitors === 0 && cta === 0 && starts === 0 && storyCount === 0) return; // nothing to report

    const ctaRate = visitors ? ((cta / visitors) * 100).toFixed(1) : "0";
    const submitRate = visitors ? ((success / visitors) * 100).toFixed(1) : "0";
    const topSourceName = dailySource?.source || "unknown";
    const dateStr = start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timeRange = `${start.toISOString().slice(0, 10)} 00:00 UTC — ${end.toISOString().slice(0, 10)} 00:00 UTC`;

    // 30-day rolling numbers
    const rVisitors = Number(rolling.visitors) || 0;
    const rCta = Number(rolling.cta_clicks) || 0;
    const rStarts = Number(rolling.form_starts) || 0;
    const rSuccess = Number(rolling.submit_success) || 0;
    const rCtaRate = rVisitors ? ((rCta / rVisitors) * 100).toFixed(1) : "0";
    const rSubmitRate = rVisitors ? ((rSuccess / rVisitors) * 100).toFixed(1) : "0";

    const html = `
    <div style="font-family:Georgia,serif;max-width:620px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
      <div style="background:#330311;padding:28px 32px;text-align:center;">
        <p style="margin:0;color:#C9A961;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;font-family:Arial,sans-serif;">Event Perfekt · I Am Her Funnel</p>
        <h1 style="margin:10px 0 0;color:#fff;font-size:22px;font-weight:normal;">Daily Funnel Summary</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;font-family:Arial,sans-serif;">Yesterday · ${dateStr}</p>
      </div>
      <div style="padding:32px;">
        <p style="font-size:12px;color:#666;font-family:Arial,sans-serif;margin:0 0 16px;">✅ Verified: ${timeRange}</p>
        <div style="display:flex;gap:12px;margin-bottom:32px;flex-wrap:wrap;">
          ${[
            ['Visitors', visitors],
            ['CTA Clicks', cta],
            ['Form Starts', starts],
            ['Submissions', success],
            ['Stories Submitted', storyCount],
          ].map(([label, val]) => `
            <div style="flex:1;min-width:120px;background:#f5f0ed;padding:18px 12px;text-align:center;border-radius:4px;">
              <div style="font-size:28px;font-weight:bold;color:#330311;">${val}</div>
              <div style="font-size:11px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">${label}</div>
            </div>`).join('')}
        </div>

        <div style="background:#faf8f6;padding:16px;border-radius:4px;margin-bottom:24px;">
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div style="text-align:center;flex:1;">
              <div style="font-size:24px;font-weight:bold;color:#330311;">${ctaRate}%</div>
              <div style="font-size:11px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;">CTA Click Rate</div>
            </div>
            <div style="text-align:center;flex:1;">
              <div style="font-size:24px;font-weight:bold;color:#330311;">${submitRate}%</div>
              <div style="font-size:11px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;">Conversion Rate</div>
            </div>
            <div style="text-align:center;flex:1;">
              <div style="font-size:24px;font-weight:bold;color:#330311;">${topSourceName}</div>
              <div style="font-size:11px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;">Top Traffic Source</div>
            </div>
          </div>
        </div>

        <h3 style="font-size:13px;color:#330311;letter-spacing:0.08em;text-transform:uppercase;margin:24px 0 12px;font-family:Arial,sans-serif;">Rolling 30-day trend</h3>
        <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
          ${[
            ['Visitors', rVisitors, 'total'],
            ['CTA Clicks', rCta, 'total'],
            ['Form Starts', rStarts, 'total'],
            ['Submissions', rSuccess, 'total'],
          ].map(([label, val, sub]) => `
            <div style="flex:1;min-width:120px;background:#fff;border:1px solid #e8e4de;padding:14px 10px;text-align:center;border-radius:4px;">
              <div style="font-size:22px;font-weight:bold;color:#330311;">${val}</div>
              <div style="font-size:10px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">${label} <span style="color:#bbb;">(${sub})</span></div>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:24px;">
          <div style="text-align:center;flex:1;">
            <div style="font-size:20px;font-weight:bold;color:#330311;">${rCtaRate}%</div>
            <div style="font-size:10px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;">30-day CTA Rate</div>
          </div>
          <div style="text-align:center;flex:1;">
            <div style="font-size:20px;font-weight:bold;color:#330311;">${rSubmitRate}%</div>
            <div style="font-size:10px;color:#888;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;">30-day Conversion</div>
          </div>
        </div>

        <div style="margin-top:36px;padding-top:20px;border-top:1px solid #eee;">
          <a href="https://eventperfekt.net/admin/visitor-analytics" style="background:#330311;color:#fff;text-decoration:none;padding:12px 28px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.08em;display:inline-block;">VIEW FULL FUNNEL</a>
        </div>
      </div>
      <p style="text-align:center;font-size:11px;color:#bbb;font-family:Arial,sans-serif;padding-bottom:24px;">Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG · …making yours perfekt</p>
    </div>`;

    await sendDigest(`💎 I Am Her Funnel: ${visitors} visitors, ${success} submissions yesterday`, html);
    console.log(`[VisitorNotify] I Am Her funnel digest sent — ${visitors} visitors, ${success} submissions`);
  } catch (err: any) {
    console.warn("[VisitorNotify] I Am Her funnel digest error:", err.message);
  }
}

function msUntilNextUK(hour: number, minute = 0, dayOfWeek?: number): number {
  // Returns ms until the next occurrence of HH:MM UK local time (BST = UTC+1 in summer)
  const now = new Date();
  const ukOffset = 60; // BST (+1h). Simple approach — good enough for London summer.
  const nowUKMin = now.getUTCHours() * 60 + now.getUTCMinutes() + ukOffset;
  const targetMin = hour * 60 + minute;

  let diffMin = targetMin - (nowUKMin % (24 * 60));
  if (diffMin <= 0) diffMin += 24 * 60;

  let extraDays = 0;
  if (dayOfWeek !== undefined) {
    // dayOfWeek 0=Sun, 1=Mon … 6=Sat
    const todayUK = new Date(now.getTime() + ukOffset * 60000);
    let currentDay = todayUK.getUTCDay();
    // If target is today but diffMin already rolled to tomorrow, add 1 to currentDay
    if (diffMin > 24 * 60 - targetMin) currentDay = (currentDay + 1) % 7;
    let daysUntil = (dayOfWeek - currentDay + 7) % 7;
    if (daysUntil === 0 && diffMin < 1) daysUntil = 7;
    extraDays = daysUntil;
  }

  return (diffMin + extraDays * 24 * 60) * 60 * 1000;
}

// ─── Robust digest runner with catch-up on startup ─────────────────────
// Production servers restart often (healthcheck failures). setTimeout timers are lost
// on restart. We track what was sent in digest_sent_log so we can send a missed digest
// immediately on startup, then schedule the next one.

async function logDigestSent(type: string, label: string) {
  try {
    await db.execute(sql`
      INSERT INTO digest_sent_log (digest_type, sent_at, period_label)
      VALUES (${type}, NOW(), ${label})
    `);
  } catch (e: any) {
    console.warn("[VisitorNotify] logDigestSent error:", e.message);
  }
}

async function wasDigestSentToday(type: string): Promise<boolean> {
  try {
    const r = await db.execute(sql`
      SELECT 1 FROM digest_sent_log
      WHERE digest_type = ${type}
        AND sent_at >= CURRENT_DATE
        AND sent_at < CURRENT_DATE + INTERVAL '1 day'
      LIMIT 1
    `);
    return r.rows.length > 0;
  } catch (e: any) {
    console.warn("[VisitorNotify] wasDigestSentToday error:", e.message);
    return false;
  }
}

function isPastUKTime(hour: number, minute: number): boolean {
  const now = new Date();
  const ukOffset = 60; // BST
  const ukHour = (now.getUTCHours() + Math.floor(ukOffset / 60)) % 24;
  const ukMin = now.getUTCMinutes() + (ukOffset % 60);
  const currentMin = ukHour * 60 + ukMin;
  const targetMin = hour * 60 + minute;
  return currentMin >= targetMin;
}

async function runDailyDigestWithLog() {
  if (await wasDigestSentToday("daily")) {
    console.log("[VisitorNotify] Daily digest already sent today — skipping");
    return;
  }
  await sendDailyDigest();
  await logDigestSent("daily", "site");
}

async function runFunnelDigestWithLog() {
  if (await wasDigestSentToday("funnel")) {
    console.log("[VisitorNotify] Funnel digest already sent today — skipping");
    return;
  }
  await sendIAmHerFunnelDigest();
  await logDigestSent("funnel", "iamher");
}

async function runWeeklyDigestWithLog() {
  if (await wasDigestSentToday("weekly")) {
    console.log("[VisitorNotify] Weekly digest already sent today — skipping");
    return;
  }
  await sendWeeklyDigest();
  await logDigestSent("weekly", "7-day");
}

export function startVisitorNotificationScheduler() {
  // ── Single daily digest at 08:00 UK time ────────────────────────────────
  const scheduleDailySite = () => {
    const ms = msUntilNextUK(8, 0);
    const fireAt = new Date(Date.now() + ms).toISOString();
    console.log(`[VisitorNotify] Daily digest next at ${fireAt} (in ${Math.round(ms / 60000)} min)`);
    setTimeout(() => {
      runDailyDigestWithLog();
      setInterval(() => { runDailyDigestWithLog(); }, 24 * 60 * 60 * 1000);
    }, ms);
  };
  scheduleDailySite();

  // ── Catch-up: if server started after 8am UK and today's digest wasn't sent, send now
  (async () => {
    if (isPastUKTime(8, 0)) {
      const alreadySent = await wasDigestSentToday("daily");
      if (!alreadySent) {
        console.log("[VisitorNotify] Catching up — missed daily digest, sending now");
        await runDailyDigestWithLog();
      } else {
        console.log("[VisitorNotify] Daily digest already sent today — no catch-up needed");
      }
    }
  })();
}
