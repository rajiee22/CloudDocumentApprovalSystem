import type { RequestHandler } from "express";
import { HttpError } from "../lib/errors";
import { verifyToken } from "../lib/jwt";
import { findUserById } from "../modules/auth/auth.service";

/** Requires `Authorization: Bearer <token>`. Loads the user fresh from the DB into req.user. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const userId = token ? verifyToken(token) : null;
  if (!userId) throw new HttpError(401, "Not signed in");

  // Looking the user up each time means a deleted account stops working immediately.
  const user = await findUserById(userId);
  if (!user) throw new HttpError(401, "Not signed in");
  req.user = user;
  next();
};

/** Use after requireAuth: restricts a route to certain roles, e.g. requireRole("approver"). */
export const requireRole =
  (...roles: Array<"student" | "approver">): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw new HttpError(403, "You don't have access to this");
    next();
  };
