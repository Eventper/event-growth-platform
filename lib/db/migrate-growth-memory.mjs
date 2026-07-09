import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ddl = `
CREATE TABLE IF NOT EXISTS growth_memory (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  scope text NOT NULL,
  scope_id text NOT NULL,
  kind text NOT NULL DEFAULT 'fact',
  key text,
  content text NOT NULL,
  weight integer NOT NULL DEFAULT 1,
  source text DEFAULT 'system',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_growth_memory_owner_scope ON growth_memory(owner_id, scope, scope_id);
`;

try {
  await pool.query(ddl);
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='growth_memory' ORDER BY ordinal_position`
  );
  console.log("growth_memory columns:", cols.rows.map((r) => r.column_name).join(", "));
  console.log("OK");
} catch (e) {
  console.error("MIGRATION ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
