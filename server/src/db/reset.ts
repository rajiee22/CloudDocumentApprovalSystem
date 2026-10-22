// DEV ONLY: drops everything and re-runs migrations. Refuses to run in production.
import { env } from "../config/env";
import { pool } from "../lib/db";
import { migrate } from "./migrate";

async function reset() {
  if (env.NODE_ENV === "production") throw new Error("Refusing to reset a production database.");
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  console.log("Schema dropped.");
  await migrate();
}

reset()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
