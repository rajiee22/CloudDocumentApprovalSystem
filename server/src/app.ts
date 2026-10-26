import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { pool } from "./lib/db";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json({ limit: "2mb" }));

  // Health check: confirms the API is up AND can reach PostgreSQL.
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "up" });
    } catch {
      res.status(503).json({ status: "error", db: "down" });
    }
  });

  app.use("/api/auth", authRouter);
  // More routers get mounted here as they are built, e.g.
  //   app.use("/api/requests", requestsRouter);

  app.use("/api", (_req, res) => { res.status(404).json({ error: "Not found" }); });

  app.use(errorHandler);

  return app;
}
