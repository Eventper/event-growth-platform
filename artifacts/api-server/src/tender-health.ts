// Tender sweep health monitoring & alerting (Phase 2, Task 2 + Task 3).
//
// After every sweep the sweeper hands a SweepHealth snapshot to recordSweepHealth(),
// which: (1) keeps an in-memory copy for the dependency-free /api/health probe,
// (2) writes an org-scoped row to saas_health_status, and (3) fires a "⚠️ Tender
// sweep" alert email to OPS_RECIPIENT when anything looks wrong (whole sweep
// failed, any source errored or degraded, zero raw notices fetched, or a missed
// run detected on boot).
//
// The in-memory snapshot is stored on globalThis so index.ts can expose it from
// the liveness probe WITHOUT importing this module (and its db/email deps) — that
// keeps /api/health fast and dependency-free even if the DB is down.

import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendMail } from "./emailService";
import { OPS_RECIPIENT } from "./tender-discovery-config";

const LOG = "[TenderHealth]";

export type SourceStatus = "ok" | "degraded" | "failed";
export interface SourceHealth { name: string; status: SourceStatus; count: number; error?: string; }
export interface SweepHealth {
  at: string;                               // ISO timestamp of the sweep
  overall: "success" | "partial" | "failed";
  sources: SourceHealth[];
  totalQualifying: number;                  // tenders that passed the gate
  rawTotal: number;                         // raw notices fetched across all sources
  durationMs: number;
  trigger?: string;                         // "schedule" | "boot-catchup" | "manual"
  reason?: string;                          // why it alerted (if it did)
}

// ── In-memory snapshot (read by the /api/health liveness probe) ──────────────
const GLOBAL_KEY = "__epTenderSweepHealth";
export function getLastSweepHealth(): SweepHealth | null {
  return (globalThis as any)[GLOBAL_KEY] || null;
}
function setSnapshot(h: SweepHealth) { (globalThis as any)[GLOBAL_KEY] = h; }

// ── Schema (safe, additive, org-scoped) ──────────────────────────────────────
let tableEnsured = false;
export async function ensureHealthTable(): Promise<void> {
  if (tableEnsured) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS saas_health_status (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL,
    overall VARCHAR(16) NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    total_qualifying INTEGER DEFAULT 0,
    raw_total INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    trigger VARCHAR(32),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`).catch(() => {});
  tableEnsured = true;
}

// ── Overall status from per-source results + raw volume ──────────────────────
export function computeOverall(sources: SourceHealth[], rawTotal: number): SweepHealth["overall"] {
  const allFailed = sources.length > 0 && sources.every(s => s.status === "failed");
  if (allFailed || rawTotal === 0) return "failed";          // nothing came back at all
  if (sources.some(s => s.status === "failed" || s.status === "degraded")) return "partial";
  return "success";
}

// ── Record health (org-scoped) + alert when warranted ────────────────────────
export async function recordSweepHealth(h: SweepHealth): Promise<void> {
  const reasons: string[] = [];
  if (h.overall === "failed") reasons.push("sweep failed");
  const failed = h.sources.filter(s => s.status === "failed");
  if (failed.length) reasons.push(`source(s) failed: ${failed.map(s => s.name).join(", ")}`);
  const degraded = h.sources.filter(s => s.status === "degraded");
  if (degraded.length) reasons.push(`source(s) degraded: ${degraded.map(s => s.name).join(", ")}`);
  if (h.rawTotal === 0) reasons.push("0 raw notices fetched (likely a broken source/endpoint)");
  if (reasons.length) h.reason = reasons.join("; ");

  setSnapshot(h);

  // Persist one row per org (never cross-org).
  await ensureHealthTable();
  const orgs = await db.execute(sql`SELECT DISTINCT org_id FROM saas_search_config`).catch(() => ({ rows: [] as any[] }));
  for (const org of (orgs.rows as any[])) {
    await db.execute(sql`
      INSERT INTO saas_health_status (org_id, overall, sources, total_qualifying, raw_total, duration_ms, trigger, reason)
      VALUES (${org.org_id}, ${h.overall}, ${JSON.stringify(h.sources)}::jsonb, ${h.totalQualifying}, ${h.rawTotal}, ${h.durationMs}, ${h.trigger || "schedule"}, ${h.reason || null})
    `).catch(() => {});
  }

  if (reasons.length) {
    console.warn(`${LOG} ALERT — ${h.reason}`);
    await sendSweepAlert(h, reasons).catch(e => console.error(`${LOG} alert email failed:`, e?.message));
  }
}

// ── Boot-time alert: no successful sweep in >24h ─────────────────────────────
// Muted: the catch-up sweep still runs automatically on boot, but the alert
// email is disabled. In serverless/recycling environments this fires almost
// every restart and creates noise without actionable value. Status is still
// logged to console and the health endpoint.
export async function alertMissedSweep(hoursSince: number): Promise<void> {
  const ago = isFinite(hoursSince) ? `${Math.round(hoursSince)}h ago` : "never";
  console.warn(`${LOG} missed sweep (last: ${ago}) — catch-up running, alert muted`);
}

// ── Alert email builder ──────────────────────────────────────────────────────
async function sendSweepAlert(h: SweepHealth, reasons: string[]): Promise<void> {
  const colour = (s: SourceStatus) => s === "ok" ? "#1a7f37" : s === "degraded" ? "#b06000" : "#cc0000";
  const rows = h.sources.map(s => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;">${s.name}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:${colour(s.status)};font-weight:700;text-transform:uppercase;">${s.status}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${s.count}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#888;font-size:12px;">${s.error ? s.error.slice(0, 120) : ""}</td>
    </tr>`).join("");
  const subject = `⚠️ Tender sweep — ${h.overall.toUpperCase()}: ${reasons[0]}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;">
      <div style="background:#7a1020;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">⚠️ Tender sweep alert — ${h.overall.toUpperCase()}</h2>
        <p style="margin:6px 0 0;color:#f0c0c8;font-size:13px;">${new Date(h.at).toLocaleString("en-GB")} · ${h.trigger || "schedule"}</p>
      </div>
      <div style="padding:20px 24px;background:#fff8f5;border:1px solid #f0e0e0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="margin:0 0 12px;color:#333;"><strong>Why:</strong> ${reasons.join("; ")}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="text-align:left;color:#666;">
            <th style="padding:6px 10px;">Source</th><th style="padding:6px 10px;">Status</th>
            <th style="padding:6px 10px;text-align:right;">Count</th><th style="padding:6px 10px;">Error</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:14px 0 0;color:#666;font-size:13px;">Raw notices fetched: <strong>${h.rawTotal}</strong> · Passed gate: <strong>${h.totalQualifying}</strong> · Duration: ${Math.round(h.durationMs / 1000)}s</p>
      </div>
    </div>`;
  await sendMail(OPS_RECIPIENT, subject, html);
}
