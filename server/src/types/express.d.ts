import type { PublicUser } from "../modules/auth/auth.service";

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. */
      user?: PublicUser;
    }
  }
}
export {};
