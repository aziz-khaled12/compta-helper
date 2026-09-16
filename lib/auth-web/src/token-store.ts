import { setAuthTokenGetter } from "@workspace/api-client-react";

/**
 * The access token is deliberately kept in memory only. It lives for 15 minutes
 * and is renewed from the httpOnly refresh cookie, so persisting it to
 * localStorage would add an XSS target without buying a longer session.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/**
 * Registered once here rather than in each caller: every generated request asks
 * this getter for a token, so a refresh anywhere in the app immediately flows to
 * all subsequent API calls.
 */
setAuthTokenGetter(() => accessToken);
