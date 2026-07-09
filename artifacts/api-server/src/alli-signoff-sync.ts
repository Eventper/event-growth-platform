// ─────────────────────────────────────────────────────────────────────────────
// ALLI Sign-off Sync — Planning App → Group Portal canonical push
//
// Architecture:
//   1. Trustee sign-off is recorded LOCALLY first (never blocked by sync).
//   2. This module fires the existing Group Portal milestone sign-off endpoint
//      with resilient retry logic.
//   3. Failures queue to `planning_app_pending_syncs` and retry automatically.
//
// Group Portal receiving endpoint (existing — endpoint 7c):
//   POST [TWIN_TRADE_SYNC_URL]/api/alli-sync/milestones/:milestone_id/signoff
//   Auth: x-alli-sync-key: "EP-ALLI-SYNC-2026"
//   Body: { decision, signed_by_email, signed_by_name, client_ip,
//           client_user_agent, rejection_comment }
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "./db";
import { sql } from "drizzle-orm";

const ALLI_SYNC_KEY = "EP-ALLI-SYNC-2026";
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000];

export interface SignoffPayload {
  milestone_id: string;
  phase: string;
  decision: string;
  signed_by_email: string;
  signed_by_name: string;
  client_ip: string;
  client_user_agent: string;
  rejection_comment?: string | null;
  planning_app_signoff_id: string;
}

export async function ensurePendingSyncsTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS planning_app_pending_syncs (
        id SERIAL PRIMARY KEY,
        sync_type TEXT NOT NULL DEFAULT 'alli_signoff',
        payload JSONB NOT NULL,
        signoff_id TEXT UNIQUE,
        attempt_count INT DEFAULT 0,
        next_retry_at TIMESTAMPTZ DEFAULT NOW(),
        last_error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);
    await db.execute(sql`
      ALTER TABLE alli_milestone_signoffs ADD COLUMN IF NOT EXISTS sync_id TEXT
    `).catch(() => {});
    console.log("[SignoffSync] Tables ready ✓");
  } catch (e: any) {
    console.error("[SignoffSync] ensurePendingSyncsTable error:", e.message);
  }
}

function getBaseUrl(): string {
  return (process.env.TWIN_TRADE_SYNC_URL || "").trim().replace(/\/$/, "");
}

async function attemptPush(payload: SignoffPayload): Promise<void> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error("TWIN_TRADE_SYNC_URL not configured");
  }

  const endpoint = `${baseUrl}/api/alli-sync/milestones/${encodeURIComponent(payload.milestone_id)}/signoff`;
  const body = {
    decision: payload.decision,
    signed_by_email: payload.signed_by_email,
    signed_by_name: payload.signed_by_name,
    client_ip: payload.client_ip,
    client_user_agent: payload.client_user_agent,
    rejection_comment: payload.rejection_comment ?? null,
    planning_app_signoff_id: payload.planning_app_signoff_id,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-alli-sync-key": ALLI_SYNC_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function queueForRetry(payload: SignoffPayload, error: string, currentAttempts: number): Promise<void> {
  const nextDelay = currentAttempts === 0 ? "1 minute"
    : currentAttempts === 1 ? "5 minutes"
    : currentAttempts === 2 ? "30 minutes"
    : "24 hours";

  await db.execute(sql`
    INSERT INTO planning_app_pending_syncs (sync_type, payload, signoff_id, attempt_count, next_retry_at, last_error)
    VALUES ('alli_signoff', ${JSON.stringify(payload)}, ${payload.planning_app_signoff_id}, ${currentAttempts + 1},
            NOW() + ${`INTERVAL '${nextDelay}'`}::interval, ${error})
    ON CONFLICT (signoff_id) DO UPDATE
      SET attempt_count = ${currentAttempts + 1},
          last_error    = ${error},
          next_retry_at = NOW() + ${`INTERVAL '${nextDelay}'`}::interval
  `).catch(e => console.error("[SignoffSync] Failed to queue retry:", e.message));
}

async function markResolved(signoffId: string): Promise<void> {
  await db.execute(sql`
    UPDATE planning_app_pending_syncs SET resolved_at = NOW()
    WHERE signoff_id = ${signoffId} AND resolved_at IS NULL
  `).catch(() => {});
}

function scheduleRetry(payload: SignoffPayload, attemptIndex: number): void {
  const delay = RETRY_DELAYS_MS[attemptIndex];
  if (delay === undefined) {
    console.warn(`[SignoffSync] Max in-process retries reached for ${payload.planning_app_signoff_id} — daily cron will handle it`);
    return;
  }

  setTimeout(async () => {
    console.log(`[SignoffSync] Retry ${attemptIndex + 1} for signoff ${payload.planning_app_signoff_id}`);
    try {
      await attemptPush(payload);
      await markResolved(payload.planning_app_signoff_id);
      console.log(`[SignoffSync] ✓ Retry ${attemptIndex + 1} succeeded — signoff synced to Group Portal`);
    } catch (e: any) {
      console.warn(`[SignoffSync] Retry ${attemptIndex + 1} failed: ${e.message}`);
      await queueForRetry(payload, e.message, attemptIndex + 1);
      scheduleRetry(payload, attemptIndex + 1);
    }
  }, delay);
}

/**
 * Push sign-off event to Group Portal ALLI Tracker (existing endpoint 7c).
 * NEVER throws — Trustee sign-off is always confirmed locally first.
 * Sync failures are queued for automatic retry.
 */
export async function pushSignoffToGroupPortal(payload: SignoffPayload): Promise<void> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    console.warn("[SignoffSync] Skipped — TWIN_TRADE_SYNC_URL not set");
    return;
  }

  try {
    await attemptPush(payload);
    console.log(`[SignoffSync] ✓ Phase ${payload.phase} sign-off pushed → Group Portal (${payload.signed_by_email})`);
  } catch (e: any) {
    console.warn(`[SignoffSync] Initial push failed (${e.message}) — queueing for retry`);
    await queueForRetry(payload, e.message, 0);
    scheduleRetry(payload, 0);
  }
}

/**
 * Retry all pending syncs whose next_retry_at has passed.
 * Called by daily cron and once at startup.
 */
export async function retryPendingSyncs(): Promise<void> {
  try {
    const rows = await db.execute(sql`
      SELECT id, payload, signoff_id, attempt_count
      FROM planning_app_pending_syncs
      WHERE resolved_at IS NULL
        AND next_retry_at <= NOW()
        AND attempt_count < 20
      ORDER BY next_retry_at
      LIMIT 50
    `);

    if (!rows.rows.length) return;
    console.log(`[SignoffSync] Cron retrying ${rows.rows.length} pending sync(s)`);

    for (const row of rows.rows as any[]) {
      const payload: SignoffPayload = typeof row.payload === "string"
        ? JSON.parse(row.payload)
        : row.payload;
      try {
        await attemptPush(payload);
        await markResolved(row.signoff_id);
        console.log(`[SignoffSync] ✓ Cron retry succeeded: ${row.signoff_id}`);
      } catch (e: any) {
        await queueForRetry(payload, e.message, row.attempt_count);
        console.warn(`[SignoffSync] Cron retry failed: ${row.signoff_id} — ${e.message}`);
      }
    }
  } catch (e: any) {
    console.error("[SignoffSync] retryPendingSyncs error:", e.message);
  }
}

/**
 * Start the retry scheduler.
 * - Runs once immediately on startup (clears any backlog from previous sessions).
 * - Then runs daily at 06:00 UTC.
 */
export function scheduleSignoffSyncRetries(): void {
  retryPendingSyncs().catch(() => {});

  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const msUntil = next.getTime() - now.getTime();

  setTimeout(() => {
    retryPendingSyncs().catch(() => {});
    setInterval(() => retryPendingSyncs().catch(() => {}), 24 * 60 * 60 * 1000);
  }, msUntil);

  console.log(`[SignoffSync] Retry scheduler started — next cron at ${next.toISOString()}`);
}
