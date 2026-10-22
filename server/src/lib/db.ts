import pg from "pg";
import { env } from "../config/env";

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

// Without this listener, Node crashes the whole process when PostgreSQL drops an idle
// connection (restart, network blip). Log it instead; the pool opens a fresh connection next time.
pool.on("error", err => console.error("Unexpected PostgreSQL pool error:", err.message));

export const query = <T extends pg.QueryResultRow = any>(text: string, params?: unknown[]) =>
  pool.query<T>(text, params);

/** Runs `fn` inside one transaction: commits if it resolves, rolls back if it throws. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
