import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Guest Intelligence locked fields on growth_prospects. Populated by Guest
// Research AI, approved & locked by Lynda before any guest email may generate or
// send. Idempotent — guarded by IF NOT EXISTS, safe to re-run.
const ddl = `
ALTER TABLE growth_prospects ADD COLUMN IF NOT EXISTS guest_reason text;
ALTER TABLE growth_prospects ADD COLUMN IF NOT EXISTS company_context text;
ALTER TABLE growth_prospects ADD COLUMN IF NOT EXISTS role_context text;
ALTER TABLE growth_prospects ADD COLUMN IF NOT EXISTS why_this_room_matters_to_her text;
ALTER TABLE growth_prospects ADD COLUMN IF NOT EXISTS approved_proof_points text;
ALTER TABLE growth_prospects ADD COLUMN IF NOT EXISTS contact_route text;
`;

try {
  await pool.query(ddl);
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='growth_prospects'
       AND column_name IN ('guest_reason','company_context','role_context','why_this_room_matters_to_her','approved_proof_points','contact_route')
     ORDER BY column_name`
  );
  console.log("guest intelligence columns present:", cols.rows.map((r) => r.column_name).join(", "));
  console.log("OK");
} catch (e) {
  console.error("MIGRATION ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
