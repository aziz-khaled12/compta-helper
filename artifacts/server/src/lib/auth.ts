import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { type Request, type Response } from "express";
import { db } from "@workspace/db";
import { refreshTokensTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";

// No fallback. A shipped default is a published signing key: anyone who can
// read this repo could mint tokens for any user the moment the real secret is
// missing. Failing at boot is the same trade the PORT and GEMINI_API_KEY reads
// make — a server that refuses to start beats one that authenticates anyone.
const rawJwtSecret = process.env.JWT_SECRET;

if (!rawJwtSecret) {
  throw new Error(
    "JWT_SECRET environment variable is required but was not provided.",
  );
}

export const JWT_SECRET = rawJwtSecret;
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ACCESS_TOKEN_TTL = "15m"; // 15 minutes

/**
 * The defaults suit the Vercel-proxied setup: the browser only ever talks to
 * the Vercel domain, so this cookie is first-party and `Lax` is both sufficient
 * and the safer setting. `SameSite=None` is needed only if the SPA is ever
 * pointed straight at this API cross-origin — which browsers treat as a
 * third-party cookie and increasingly block — so it is an opt-in override
 * rather than the default.
 *
 * Both live here, next to the cookie name and the clear below, because a
 * deletion is only honoured when it carries the same attributes as the set.
 */
export const REFRESH_COOKIE_SAMESITE = (() => {
  const raw = process.env.COOKIE_SAMESITE?.trim().toLowerCase();
  return raw === "lax" || raw === "strict" || raw === "none" ? raw : "lax";
})();

export const REFRESH_COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE.trim().toLowerCase() === "true"
  : process.env.NODE_ENV !== "development";

export interface TokenPayload {
  user: AuthUser;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign({ user }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL);
  
  await db.insert(refreshTokensTable).values({
    id: token,
    userId,
    expiresAt,
  });
  
  return token;
}

export async function getRefreshTokenRecord(token: string) {
  const [row] = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.id, token));
    
  if (!row) return null;
  if (row.revokedAt || row.expiresAt < new Date()) {
    if (row && !row.revokedAt) {
      await revokeRefreshToken(token);
    }
    return null;
  }
  return row;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.id, token));
}

export async function clearRefreshTokenCookie(res: Response): Promise<void> {
  // Same attributes as the set, or the browser declines to overwrite: a
  // deletion sent as `Lax` will not clear a cookie that was stored as `None`.
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    path: "/",
    secure: REFRESH_COOKIE_SECURE,
    sameSite: REFRESH_COOKIE_SAMESITE,
  });
}

export function getBearerToken(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return undefined;
}
