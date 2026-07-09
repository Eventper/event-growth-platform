// Tender Daily Digest — ONE email per day at 07:30 UK (after the 07:00 sweep).
// Collapses the old per-trigger discovery alerts and per-day deadline blasts into
// a single digest sent to one configurable recipient (DIGEST_RECIPIENT, a group
// alias). Contents: (1) the latest sweep verification summary, (2) new qualifying
// tenders found today, (3) deadlines this week (7/3/1 days).
// Delivery uses emailService.sendMail (Namecheap → Gmail → log fallback chain).

import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendMail } from "./emailService";
import { DIGEST_RECIPIENT } from "./tender-discovery-config";

const MAILER_LOG = "[TenderDigest]";

function safeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface NewTender { title: string; buyer: string; value_text: string; deadline: string; lane: string; score: number; }
interface DeadlineTender { title: string; buyer: string; deadline: string; daysLeft: number; source_url: string; value_text: string; }

// ─── Data fetchers ─────────────────────────────────────────────────────────
// Latest per-sweep verification summary (written by the sweeper to saas_automation_log).
async function fetchLatestSweepSummary(): Promise<string> {
  const r = await db.execute(sql`
    SELECT result FROM saas_automation_log
    WHERE action = 'sweep'
    ORDER BY id DESC
    LIMIT 1
  `).catch(() => ({ rows: [] as any[] }));
  return (r.rows[0] as any)?.result || "No sweep summary available yet.";
}

// New qualifying tenders discovered in the last 24h (already passed the gate at ingest).
// Fix 1 (single source of truth): the qualifying SET here must match the dashboard's
// "EP Agent — Tender Discovery Report" (saas-tender-routes.ts) — same status set
// (qualifying + auto-discovered), same 24h window, same live-deadline filter — so the
// digest and the dashboard never disagree on which tenders qualify. Dedup by OCID
// (same opportunity recurs across Contracts Finder / Find a Tender), falling back to title.
async function fetchNewTenders(): Promise<NewTender[]> {
  const r = await db.execute(sql`
    SELECT DISTINCT ON (COALESCE(NULLIF(ocid, ''), title)) title, buyer, value_text, deadline, lane,
           GREATEST(
             COALESCE((lane_scores->>'events')::int, 0),
             COALESCE((lane_scores->>'design')::int, 0),
             COALESCE((lane_scores->>'merch')::int, 0),
             COALESCE((lane_scores->>'pmo')::int, 0),
             COALESCE((lane_scores->>'development')::int, 0),
             COALESCE((lane_scores->>'charity')::int, 0),
             COALESCE((lane_scores->>'education')::int, 0)
           ) AS score
    FROM saas_tenders
    WHERE updated_at >= NOW() - INTERVAL '24 hours'
      AND LOWER(status) IN ('qualifying', 'auto-discovered')
      AND (deadline IS NULL OR deadline >= CURRENT_DATE::text)
    ORDER BY COALESCE(NULLIF(ocid, ''), title), score DESC
  `).catch(() => ({ rows: [] as any[] }));
  return (r.rows as any[])
    .map(row => ({
      title: row.title,
      buyer: row.buyer || "Not specified",
      value_text: row.value_text || "",
      deadline: row.deadline ? new Date(row.deadline).toLocaleDateString("en-GB") : "—",
      lane: row.lane || "—",
      score: Number(row.score) || 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

// Active tenders whose deadline falls within the next 7 days (7/3/1 horizon).
// Fix 3: Scoped to EP's LIVE BIDS ONLY — committed / drafting / submitting. Raw
// discovery statuses (auto-discovered, qualifying, researching, reviewing) are
// deliberately excluded: the deadlines panel is a "what am I on the hook to submit"
// list, not the market. Empty is the correct state when nothing is committed.
async function fetchDeadlinesThisWeek(): Promise<DeadlineTender[]> {
  const r = await db.execute(sql`
    SELECT DISTINCT ON (COALESCE(NULLIF(ocid, ''), title)) title, buyer, deadline, source_url, value_text,
           (deadline::date - CURRENT_DATE) AS days_left
    FROM saas_tenders
    WHERE deadline IS NOT NULL AND deadline != ''
      AND deadline::date >= CURRENT_DATE
      AND deadline::date <= CURRENT_DATE + INTERVAL '7 days'
      AND LOWER(status) IN ('committed','drafting','submitting')
    ORDER BY COALESCE(NULLIF(ocid, ''), title), deadline::date ASC
  `).catch(() => ({ rows: [] as any[] }));
  return (r.rows as any[]).map(row => ({
    title: row.title,
    buyer: row.buyer || "Not specified",
    deadline: new Date(row.deadline).toLocaleDateString("en-GB"),
    daysLeft: Number(row.days_left),
    source_url: row.source_url || "https://eventperfekt.com/saas-tender-dashboard",
    value_text: row.value_text || "",
  }));
}

// Discovery activity in the last 24h — runs and candidates found.
async function fetchDiscoverySummary(): Promise<{ runs: number; candidatesFound: number }> {
  const r = await db.execute(sql`
    SELECT COUNT(*) AS runs, SUM(NULLIF(REGEXP_REPLACE(result, '[^0-9]', '', 'g'), '')::int) AS total
    FROM saas_automation_log
    WHERE action IN ('discovery_run', 'scheduled_discovery')
      AND timestamp >= NOW() - INTERVAL '24 hours'
  `).catch(() => ({ rows: [] as any[] }));
  const row = r.rows[0] as any;
  return { runs: Number(row?.runs) || 0, candidatesFound: Number(row?.total) || 0 };
}

// Pipeline counts by status (all live tenders).
async function fetchPipelineSummary(): Promise<Record<string, number>> {
  const r = await db.execute(sql`
    SELECT status, COUNT(*) AS c
    FROM saas_tenders
    WHERE LOWER(status) NOT IN ('won','lost','closed','no bid','declined','awarded to other','awarded','cancelled','withdrawn','unsuccessful','expired','submitted')
       OR status IS NULL
    GROUP BY status
  `).catch(() => ({ rows: [] as any[] }));
  const counts: Record<string, number> = {};
  for (const row of r.rows as any[]) {
    const s = row.status || "Uncategorised";
    counts[s] = (counts[s] || 0) + Number(row.c);
  }
  return counts;
}

// ─── HTML ──────────────────────────────────────────────────────────────────
function buildDigestHtml(
  summary: string,
  newTenders: NewTender[],
  deadlines: DeadlineTender[],
  discovery: { runs: number; candidatesFound: number },
  pipeline: Record<string, number>,
): string {
  const todayStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const newRows = newTenders.length
    ? newTenders.map(t => `
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:12px;"><strong style="color:#1a1a1a;">${t.title}</strong><br>
            <span style="color:#555;font-size:13px;">${t.buyer}${t.value_text ? ` — ${t.value_text}` : ""}</span></td>
          <td style="padding:12px;text-align:center;"><span style="background:#330311;color:#fff;font-size:11px;padding:3px 8px;border-radius:4px;">${t.lane}</span><br>
            <span style="font-size:12px;color:#888;">score ${t.score}</span></td>
          <td style="padding:12px;text-align:right;white-space:nowrap;color:#555;font-size:13px;">${t.deadline}</td>
        </tr>`).join("")
    : `<tr><td colspan="3" style="padding:14px;color:#888;font-size:13px;">No new qualifying tenders found today.</td></tr>`;

  const dlRows = deadlines.length
    ? deadlines.map(t => {
        const urgency = t.daysLeft <= 1 ? "#cc0000" : t.daysLeft <= 3 ? "#e65c00" : "#7a4100";
        const badge = t.daysLeft <= 1 ? "⛔ ≤1 DAY" : t.daysLeft <= 3 ? "🔴 ≤3 DAYS" : "🟡 ≤7 DAYS";
        return `
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:12px;">
            <span style="background:${urgency};color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;margin-right:8px;">${badge}</span>
            <strong style="color:#1a1a1a;">${t.title}</strong><br>
            <span style="color:#555;font-size:13px;">${t.buyer}${t.value_text ? ` — ${t.value_text}` : ""}</span></td>
          <td style="padding:12px;text-align:right;white-space:nowrap;"><span style="color:${urgency};font-weight:700;">${t.deadline}</span><br>
            <span style="font-size:12px;color:#888;">${t.daysLeft} day${t.daysLeft !== 1 ? "s" : ""} left</span></td>
          <td style="padding:12px;text-align:center;"><a href="${t.source_url}" style="background:#330311;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">View</a></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="3" style="padding:14px;color:#888;font-size:13px;">No deadlines in the next 7 days.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f7f7f7;margin:0;padding:20px;">
  <div style="max-width:720px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#330311;padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Daily Tender Digest</h1>
      <p style="color:#e0b0b8;margin:6px 0 0;font-size:14px;">Event Perfekt Tender Centre — ${todayStr}</p>
    </div>
    <div style="padding:18px 32px;background:#fbf7f8;border-bottom:1px solid #f0e6e8;">
      <p style="margin:0;font-size:12px;color:#7a4100;font-family:monospace;">${summary}</p>
    </div>
    <div style="padding:24px 32px;">
      <h2 style="color:#330311;font-size:16px;margin:0 0 12px;">New qualifying tenders today (${newTenders.length})</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;"><tbody>${newRows}</tbody></table>

      <h2 style="color:#330311;font-size:16px;margin:28px 0 12px;">Deadlines this week (${deadlines.length})</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;"><tbody>${dlRows}</tbody></table>

      <div style="margin-top:28px;padding:16px;background:#fff8f5;border-left:3px solid #330311;border-radius:4px;">
        <p style="margin:0;font-size:13px;color:#555;"><strong>Next steps:</strong> Log in to
          <a href="https://eventperfekt.com/saas-tender-dashboard" style="color:#330311;">the Tender Centre</a>
          to qualify, draft, and submit before each deadline.</p>
      </div>

      <div style="margin-top:28px;padding:18px 32px;background:#fafafa;border-top:1px solid #eee;">
        <h3 style="color:#330311;font-size:14px;margin:0 0 10px;">Discovery activity (last 24h)</h3>
        <p style="margin:0;font-size:13px;color:#555;">${discovery.runs} discovery run${discovery.runs !== 1 ? 's' : ''} — ${discovery.candidatesFound} candidate${discovery.candidatesFound !== 1 ? 's' : ''} reviewed. Details included above.</p>
      </div>

      <div style="padding:18px 32px;background:#fafafa;border-top:1px solid #eee;">
        <h3 style="color:#330311;font-size:14px;margin:0 0 10px;">Live pipeline</h3>
        <p style="margin:0;font-size:13px;color:#555;">${Object.entries(pipeline).map(([s, c]) => `${safeText(s)}: ${c}`).join(' · ')}</p>
      </div>
    </div>
    <div style="background:#f5f0f1;padding:18px 32px;text-align:center;">
      <p style="color:#888;font-size:12px;margin:0;">Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG · <em>...making yours perfekt</em></p>
    </div>
  </div>
</body></html>`;
}

// ─── Main digest function (name kept for existing callers) ─────────────────
export async function runDeadlineMailer(): Promise<{ ok: boolean; emailsSent: number; error?: string }> {
  console.log(`${MAILER_LOG} Building daily digest — ${new Date().toISOString()}`);
  try {
    const [summary, newTenders, deadlines, discovery, pipeline] = await Promise.all([
      fetchLatestSweepSummary(),
      fetchNewTenders(),
      fetchDeadlinesThisWeek(),
      fetchDiscoverySummary(),
      fetchPipelineSummary(),
    ]);

    const html = buildDigestHtml(summary, newTenders, deadlines, discovery, pipeline);
    const subject = `Daily Tender Digest — ${newTenders.length} new, ${deadlines.length} closing this week`;

    // One email, to one alias, via the shared fallback chain (Namecheap → Gmail → log).
    await sendMail(DIGEST_RECIPIENT, subject, html);
    console.log(`${MAILER_LOG} Digest sent to ${DIGEST_RECIPIENT} — ${newTenders.length} new, ${deadlines.length} deadlines`);
    return { ok: true, emailsSent: 1 };
  } catch (err: any) {
    console.error(`${MAILER_LOG} Run failed:`, err.message);
    // Silent failure is worse than noise (spec §11): alert the internal ops alias
    // so a broken digest is visible. Wrapped so a failed alert never re-throws.
    try {
      const opsRecipient = process.env.OPS_RECIPIENT || DIGEST_RECIPIENT;
      await sendMail(
        opsRecipient,
        "⚠️ Tender daily digest FAILED",
        `<p>The daily tender digest failed to build/send at ${new Date().toISOString()}.</p>
         <p><strong>Error:</strong> ${err.message}</p>
         <p>Check the API server logs and the email transport configuration.</p>`,
      );
    } catch (alertErr: any) {
      console.error(`${MAILER_LOG} Failure alert also failed:`, alertErr.message);
    }
    return { ok: false, emailsSent: 0, error: err.message };
  }
}

// ─── Scheduler — runs at 07:30 UK time daily (after the 07:00 sweep) ────────
let mailerStarted = false;

export function startDeadlineMailer() {
  if (mailerStarted) return;
  mailerStarted = true;

  const scheduleNext = () => {
    const now = new Date();
    const ukOffset = isDaylightSaving(now) ? 1 : 0;
    const target = new Date(now);
    target.setUTCHours(7 - ukOffset, 30, 0, 0); // 07:30 UK
    if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
    const delay = target.getTime() - now.getTime();
    console.log(`${MAILER_LOG} Next digest scheduled at ${target.toISOString()} (in ${Math.round(delay / 60000)} min)`);
    setTimeout(() => {
      runDeadlineMailer().catch(e => console.error(`${MAILER_LOG} Scheduled run error:`, e.message));
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

function isDaylightSaving(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) !== date.getTimezoneOffset();
}
