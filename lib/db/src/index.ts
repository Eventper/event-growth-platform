import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable";

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL not set. Falling back to local Postgres at 127.0.0.1:5432/postgres.");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
