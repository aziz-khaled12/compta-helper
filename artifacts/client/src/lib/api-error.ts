/**
 * The message the API sent with a failed request, when it sent one.
 *
 * The server writes its refusals for the user — "Stock insuffisant pour PC :
 * 20 disponible(s), 25 demandé(s)." — and that is the only place the reason is
 * spelled out. A mutation that replaces it with a generic failure throws away
 * the one sentence that told the user what to do.
 *
 * `ApiError` is not re-exported by `@workspace/api-client-react`, so the shape
 * is matched structurally instead of with `instanceof`: an error carrying a
 * parsed body whose `error` field is a non-empty string.
 */
export function apiErrorMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const message = (data as { error?: unknown }).error;
  return typeof message === "string" && message.length > 0 ? message : null;
}
