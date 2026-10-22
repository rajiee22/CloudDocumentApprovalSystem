import { createApp } from "./app";
import { env } from "./config/env";
import { pool } from "./lib/db";

const server = createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}  (health: /api/health)`);
});

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
