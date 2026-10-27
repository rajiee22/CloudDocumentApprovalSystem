import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import * as auth from "./auth.service";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254),
  password: z.string().min(1, "Password is required").max(200),
});

// Slows down password guessing: N attempts per IP per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true, // only failed attempts count, so normal sign-ins never get blocked
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in a few minutes." },
});

export const authRouter = Router();

authRouter.post("/login", loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  res.json(await auth.login(email, password));
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
