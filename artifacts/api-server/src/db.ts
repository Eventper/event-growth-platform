import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db";

const { Pool } = pg;

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  const pgHost = process.env.PGHOST;
  const pgUser = process.env.PGUSER || "postgres";
  const pgPassword = process.env.PGPASSWORD || "postgres";
  const pgDatabase = process.env.PGDATABASE || "postgres";
  const pgPort = process.env.PGPORT || "5432";
  if (pgHost) {
    const sslMode = process.env.PGSSLMODE || (/(localhost|127\.0\.0\.1)/i.test(pgHost) ? "disable" : "require");
    connectionString = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}?sslmode=${sslMode}`;
  }
}

if (!connectionString) {
  connectionString = "postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable";
  console.warn("[db] DATABASE_URL not set. Falling back to local Postgres at 127.0.0.1:5432/postgres.");
}

export function getConnectionString(): string {
  return connectionString!;
}

const connectTimeoutMs = Number(process.env.PG_CONNECT_TIMEOUT_MS || "2000");
export const pool = new Pool({ connectionString, connectionTimeoutMillis: Number.isFinite(connectTimeoutMs) ? connectTimeoutMs : 2000 });
export const db = drizzle(pool, { schema });

export async function checkDatabaseConnection(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}
