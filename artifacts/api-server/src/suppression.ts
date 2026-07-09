/**
 * Prospect Suppression List
 * -------------------------
 * Belt-and-braces guard: every send path checks here before touching SMTP.
 * If an email or its domain is suppressed, we return early and never call nodemailer.
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

export type SuppressionReason = "unsubscribe" | "bounce" | "complaint" | "manual" | "do_not_contact" | "auto_reply";

export interface Suppression {
  id: number;
  email: string;
  domain: string | null;
  reason: SuppressionReason;
  source: string;
  added_at: string;
  notes: string | null;
}

/** Returns true if the given email address or its domain is suppressed. */
export async function isSuppressed(email: string): Promise<boolean> {
  if (!email) return false;
  const addr = email.toLowerCase().trim();
  const domain = addr.split("@")[1] || null;

  const rows = await db.execute(sql`
    SELECT id FROM prospect_suppressions
    WHERE email = ${addr}
      OR (domain IS NOT NULL AND domain = ${domain})
    LIMIT 1
  `);
  return (rows.rows as any[]).length > 0;
}

/** Add an email to the suppression list.  Idempotent — won't duplicate. */
export async function addSuppression({
  email,
  reason,
  source,
  notes,
}: {
  email: string;
  reason: SuppressionReason;
  source: string;
  notes?: string;
}): Promise<void> {
  const addr = email.toLowerCase().trim();
  const domain = addr.split("@")[1] || null;
  await db.execute(sql`
    INSERT INTO prospect_suppressions (email, domain, reason, source, notes, added_at)
    VALUES (${addr}, ${domain}, ${reason}, ${source}, ${notes ?? null}, NOW())
    ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason, source = EXCLUDED.source, added_at = NOW()
  `);
}

/** Remove a suppression (admin-only — call only from authenticated route). */
export async function removeSuppression(email: string): Promise<void> {
  const addr = email.toLowerCase().trim();
  await db.execute(sql`DELETE FROM prospect_suppressions WHERE email = ${addr}`);
}

/** List all suppressions, optionally filtered by search term. */
export async function listSuppressions(search?: string): Promise<Suppression[]> {
  if (search) {
    const like = `%${search.toLowerCase()}%`;
    const rows = await db.execute(sql`
      SELECT * FROM prospect_suppressions
      WHERE email ILIKE ${like} OR domain ILIKE ${like} OR source ILIKE ${like}
      ORDER BY added_at DESC LIMIT 200
    `);
    return rows.rows as unknown as Suppression[];
  }
  const rows = await db.execute(sql`
    SELECT * FROM prospect_suppressions ORDER BY added_at DESC LIMIT 200
  `);
  return rows.rows as unknown as Suppression[];
}
