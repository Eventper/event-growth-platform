import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ddl = `
CREATE TABLE IF NOT EXISTS growth_workspaces (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_growth_workspaces_owner ON growth_workspaces(owner_id);
ALTER TABLE growth_clients ADD COLUMN IF NOT EXISTS workspace_id varchar;
`;

// Backfill: give every owner that has brands a default workspace, then attach
// any unassigned brand to it. Idempotent — guarded by NOT EXISTS / IS NULL.
const backfill = `
INSERT INTO growth_workspaces (owner_id, name, description, is_default)
SELECT DISTINCT c.owner_id, 'Default Workspace', 'Your default workspace', true
FROM growth_clients c
WHERE c.owner_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM growth_workspaces w WHERE w.owner_id = c.owner_id);

UPDATE growth_clients c
SET workspace_id = w.id
FROM growth_workspaces w
WHERE c.workspace_id IS NULL
  AND w.owner_id = c.owner_id
  AND w.is_default = true;
`;

try {
  await pool.query(ddl);
  await pool.query(backfill);
  const ws = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='growth_workspaces' ORDER BY ordinal_position`
  );
  const cl = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='growth_clients' AND column_name='workspace_id'`
  );
  console.log("growth_workspaces columns:", ws.rows.map((r) => r.column_name).join(", "));
  console.log("growth_clients.workspace_id present:", cl.rows.length === 1);
  console.log("OK");
} catch (e) {
  console.error("MIGRATION ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
