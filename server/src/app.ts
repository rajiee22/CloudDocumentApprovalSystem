import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { env } from "./config/env";
import { pool } from "./lib/db";

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

  // Feature routers get mounted here as they are built, e.g.
  //   app.use("/api/auth", authRouter);
  //   app.use("/api/requests", requestsRouter);

  app.use("/api", (_req, res) => { res.status(404).json({ error: "Not found" }); });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);

  return app;
}
