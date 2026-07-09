import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Manual Task Area — the human steps that are NOT automated emails (web-form
// submissions, phone calls, contact verification, follow-up reminders).
// Idempotent: guarded by IF NOT EXISTS, safe to re-run.
const ddl = `
CREATE TABLE IF NOT EXISTS growth_tasks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar REFERENCES growth_events(id) ON DELETE CASCADE,
  prospect_id varchar REFERENCES growth_prospects(id) ON DELETE SET NULL,
  owner_id text,
  type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  due_at timestamp,
  completed_at timestamp,
  created_by text,
  metadata json,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_growth_tasks_event ON growth_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_growth_tasks_prospect ON growth_tasks(prospect_id);
CREATE INDEX IF NOT EXISTS idx_growth_tasks_status ON growth_tasks(status);
`;

try {
  await pool.query(ddl);
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='growth_tasks' ORDER BY ordinal_position`
  );
  console.log("growth_tasks columns:", cols.rows.map((r) => r.column_name).join(", "));
  console.log("OK");
} catch (e) {
  console.error("MIGRATION ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
