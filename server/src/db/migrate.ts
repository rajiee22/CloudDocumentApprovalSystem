import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, withTransaction } from "../lib/db";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");

export async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await pool.query("SELECT name FROM schema_migrations")).rows.map(r => r.name));
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await withTransaction(async client => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    });
    console.log(`applied ${file}`);
    applied++;
  }
  console.log(applied ? `Done: ${applied} migration(s) applied.` : "Database is up to date.");
}

// Run directly: `npm run db:migrate`
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrate()
    .catch(err => { console.error(err); process.exitCode = 1; })
    .finally(() => pool.end());
}
