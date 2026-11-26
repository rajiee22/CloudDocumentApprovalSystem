import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

import { pool } from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import requestRoutes from "./routes/request.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import signatureRoutes from "./routes/signature.routes.js";

const app = express();

const port = Number(process.env.PORT || 5000);
const sessionSecret = process.env.SESSION_SECRET;
const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:8443";

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET must be configured with at least 32 characters."
  );
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const PgSessionStore = connectPgSimple(session);

app.use(helmet());

app.use(
  cors({
    origin: frontendUrl,
    credentials: true
  })
);

app.use(express.json({ limit: "8mb" }));

app.use(
  session({
    name: "cloud.sid",
    store: new PgSessionStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: false
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/"
    }
  })
);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      success: true,
      message: "Backend and PostgreSQL are connected."
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed."
    });
  }
});

app.use("/api/auth", authRoutes);

app.use("/api/requests", requestRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/signatures", signatureRoutes);

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});