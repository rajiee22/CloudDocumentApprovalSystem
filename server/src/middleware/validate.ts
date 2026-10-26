import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { HttpError } from "../lib/errors";

/** Validates req.body against a zod schema; replaces it with the parsed (trimmed/typed) value. */
export const validateBody =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) throw new HttpError(400, "Validation failed", result.error.flatten().fieldErrors);
    req.body = result.data;
    next();
  };
