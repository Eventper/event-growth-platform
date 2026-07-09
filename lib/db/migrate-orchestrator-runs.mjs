import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ddl = `
CREATE TABLE IF NOT EXISTS growth_orchestrator_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  event_id varchar,
  title text,
  status text NOT NULL DEFAULT 'running',
  messages json NOT NULL DEFAULT '[]'::json,
  steps json NOT NULL DEFAULT '[]'::json,
  pending_question text,
  credits_used integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_growth_orchestrator_runs_owner ON growth_orchestrator_runs(owner_id);
`;

try {
  await pool.query(ddl);
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='growth_orchestrator_runs' ORDER BY ordinal_position`
  );
  console.log("growth_orchestrator_runs columns:", cols.rows.map((r) => r.column_name).join(", "));
  console.log("OK");
} catch (e) {
  console.error("MIGRATION ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
