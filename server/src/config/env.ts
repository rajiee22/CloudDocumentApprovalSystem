import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:8443"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (see .env.example)"),
  // Signs login tokens. Anyone who knows it can forge a login, so keep it secret and long.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters (see .env.example)"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  // Max login attempts per IP per 15 minutes
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().default(10),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
