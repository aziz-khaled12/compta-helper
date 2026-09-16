import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import {
  getBearerToken,
  verifyAccessToken,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

/**
 * Everything else requires a verified access token. Auth has to stay open so a
 * visitor can sign in, refresh their session, or sign out with a stale token;
 * the health probe is public by convention.
 */
const PUBLIC_PATH_PATTERNS = [/^\/api\/auth(\/|$)/, /^\/api\/healthz$/];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const token = getBearerToken(req);
  const publicPath = isPublicPath(req.path);

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = payload.user;
      next();
      return;
    }

    // The client attaches whatever token it is holding to *every* request, so a
    // stale one arrives on /auth/refresh too. Rejecting it here would 401 the
    // endpoint whose whole job is to recover from it.
    if (!publicPath) {
      res.status(401).json({ error: "TOKEN_EXPIRED" });
      return;
    }

    next();
    return;
  }

  if (publicPath) {
    next();
    return;
  }

  // Without this the routes still resolve — they read `req.user?.id`, fall back
  // to the first company row, and serve another tenant's data to anonymous
  // callers. Authentication has to be enforced here or not at all.
  res.status(401).json({ error: "UNAUTHENTICATED" });
}
