import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCurrentAuthUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  type AuthUser,
  type RegisterRequest,
} from "@workspace/api-client-react";
import { setAccessToken } from "./token-store";
import { AuthContext, type AuthContextValue } from "./auth-context";

/**
 * The refresh token rides in an httpOnly cookie, which the browser only sends
 * when asked: `credentials` defaults to `same-origin`, and in production the SPA
 * and the API are different origins. Every auth call opts in explicitly.
 */
const WITH_COOKIES = { credentials: "include" } as const;

/** Comfortably inside the API's 15-minute ACCESS_TOKEN_TTL. */
const REFRESH_INTERVAL_MS = 12 * 60 * 1000;

/**
 * This module must export components *only*. `AuthContext` and its value type
 * live in `auth-context.ts` — see the note there for why mixing the two breaks
 * every consumer on a hot update.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const envelope = await getCurrentAuthUser();
    setUser(envelope.user ?? null);
  }, []);

  /**
   * Drop everything tied to whoever was signed in. Cached domain data is keyed
   * by resource, not by identity, so a `["getCompany"]` entry left behind by a
   * previous session is served as the next user's — which both shows them
   * another account's books and, because App.tsx gates the wizard on whether a
   * company exists, skips their onboarding entirely.
   */
  const resetSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // The access token does not survive a reload, so an existing session is
  // restored from the refresh cookie before we decide anyone is signed out.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const { accessToken } = await refreshSession(WITH_COOKIES);
        setAccessToken(accessToken);
        const envelope = await getCurrentAuthUser();
        if (!cancelled) setUser(envelope.user ?? null);
      } catch {
        if (!cancelled) resetSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [resetSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await loginUser({ email, password }, WITH_COOKIES);
      // Clear before the new identity lands, not after: a session that expired
      // without a logout still has the previous user's company cached, and
      // reading it here would skip the new user's onboarding.
      queryClient.clear();
      setAccessToken(accessToken);
      // The login response carries only the token — fetch the profile separately.
      await loadUser();
    },
    [loadUser, queryClient],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      // /auth/register creates the account but issues no tokens and sets no
      // cookie, so sign in straight away or the user lands back on the form.
      await registerUser(data, WITH_COOKIES);
      await login(data.email, data.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser(WITH_COOKIES);
    } catch {
      // A failed revoke should not trap the user in a signed-in shell; the
      // refresh token expires on its own.
    } finally {
      resetSession();
    }
  }, [resetSession]);

  // Keep a long-lived session from 401ing on a stale access token.
  useEffect(() => {
    if (!user) return;

    const id = window.setInterval(() => {
      void (async () => {
        try {
          const { accessToken } = await refreshSession(WITH_COOKIES);
          setAccessToken(accessToken);
        } catch {
          // The session lapsed. Drop the cached data with it so whoever signs in
          // next does not inherit this user's workspace.
          resetSession();
        }
      })();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [user, resetSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
