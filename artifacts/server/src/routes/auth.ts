import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  RegisterUserBody,
  RegisterUserResponse,
  LoginUserBody,
  LoginUserResponse,
  RefreshSessionResponse,
  LogoutUserResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  createRefreshToken,
  getRefreshTokenRecord,
  revokeRefreshToken,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL,
  REFRESH_COOKIE_SAMESITE,
  REFRESH_COOKIE_SECURE,
} from "../lib/auth";

const router: IRouter = Router();

function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: REFRESH_COOKIE_SECURE,
    sameSite: REFRESH_COOKIE_SAMESITE,
    path: "/",
    maxAge: REFRESH_TOKEN_TTL,
  });
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const parsed = RegisterUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid registration data" });
      return;
    }

    const { email, password, firstName, lastName } = parsed.data;

    // Check if user exists
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
      
    if (existing) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }

    const hashed = await hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({
        email,
        passwordHash: hashed,
        firstName,
        lastName,
      })
      .returning();

    res.json(
      RegisterUserResponse.parse({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        },
      }),
    );
  } catch (error) {
    req.log.error({ error }, "Registration failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const parsed = LoginUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid login data" });
      return;
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const authUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = await createRefreshToken(user.id);

    setRefreshTokenCookie(res, refreshToken);

    res.json(LoginUserResponse.parse({ accessToken }));
  } catch (error) {
    req.log.error({ error }, "Login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/refresh", async (req: Request, res: Response) => {
  try {
    const oldToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!oldToken) {
      res.status(401).json({ error: "No refresh token provided" });
      return;
    }

    const record = await getRefreshTokenRecord(oldToken);
    if (!record) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, record.userId));

    if (!user) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Revoke old refresh token (optional, implemented for rotation)
    await revokeRefreshToken(oldToken);

    const authUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    };

    const newAccessToken = generateAccessToken(authUser);
    const newRefreshToken = await createRefreshToken(user.id);

    setRefreshTokenCookie(res, newRefreshToken);

    res.json(RefreshSessionResponse.parse({ accessToken: newAccessToken }));
  } catch (error) {
    req.log.error({ error }, "Refresh failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (token) {
      await revokeRefreshToken(token);
    }
    clearRefreshTokenCookie(res);
    res.json(LogoutUserResponse.parse({ success: true }));
  } catch (error) {
    req.log.error({ error }, "Logout failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
