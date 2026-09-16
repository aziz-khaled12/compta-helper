import {
  GoogleGenAI,
  type ContentListUnion,
  type Schema,
} from "@google/genai";
import { logger } from "../logger";

/**
 * The one place a Gemini model id is written down.
 *
 * Pinned to a Flash tier because the workload is extraction and narration, not
 * reasoning: a full 24-page Journal Officiel issue parses for ~17k tokens, and
 * the narration payload is a few hundred. Pro-tier would multiply the cost of a
 * full-year backfill without changing the output.
 *
 * Chosen on measurement, not on version number. Against this key, the newest
 * Flash models (`gemini-3.8-flash`, `3.7-flash`) returned sustained 503
 * "experiencing high demand" — three consecutive failures with backoff — while
 * `3.5-flash` answered first try and parsed both the French and the Arabic
 * edition of issue 53/2025. If 3.5-flash ever needs replacing, re-run
 * `src/lib/gemini/smoke.ts`, which prints the live model list.
 */
export const GEMINI_MODEL = "gemini-3.5-flash";

/**
 * Used only when the primary keeps returning 503 after its retries. A crawl is
 * background work with no user waiting on it, so degrading to a smaller model
 * beats losing the whole run — but it is never used for a *different* reason,
 * so a genuine error is still surfaced rather than silently downgraded.
 */
export const GEMINI_FALLBACK_MODEL = "gemini-3.1-flash-lite";

/** Per-attempt ceiling. Extraction of a 24-page PDF measured ~75-90s. */
const REQUEST_TIMEOUT_MS = 180_000;

const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 1_500;

/**
 * Validated at module load, and it throws rather than defaulting — the same
 * contract `DATABASE_URL` and `PORT` already have. A server that boots without a
 * key would fail later, per request, with the failure buried in whichever
 * background task happened to run first.
 */
function requireApiKey(): string {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY environment variable is required but was not provided.",
    );
  }
  return key;
}

let client: GoogleGenAI | null = null;

/**
 * Lazily constructed so that importing this module never throws at import time.
 * The error still surfaces on first use, which is what the startup check in
 * `index.ts` exists to front-run.
 */
function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: requireApiKey() });
  }
  return client;
}

export function assertGeminiConfigured(): void {
  requireApiKey();
}

/** HTTP status of a failed SDK call, or null when the failure was not an HTTP error. */
function statusOf(err: unknown): number | null {
  const message = err instanceof Error ? err.message : String(err);
  // The SDK surfaces the API's error body as the message string.
  try {
    const parsed = JSON.parse(message) as { error?: { code?: number } };
    if (typeof parsed.error?.code === "number") return parsed.error.code;
  } catch {
    // Not a JSON error body — fall through to the looser match below.
  }
  const match = /\b(429|500|502|503|504)\b/.exec(message);
  return match ? Number(match[1]) : null;
}

/** 429 and 5xx are worth retrying; a 400 or 403 will fail identically forever. */
function isRetryable(status: number | null): boolean {
  return status === 429 || (status !== null && status >= 500);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Full jitter, so retries from concurrent crawls do not resynchronise. */
function backoffMs(attempt: number): number {
  return Math.round(Math.random() * BASE_BACKOFF_MS * 2 ** (attempt - 1));
}

export interface GenerateJsonOptions {
  /** A prompt string, or parts (text + `inlineData` for a PDF). */
  contents: ContentListUnion;
  /** Shape the model must return. Required — see the note on `generateJson`. */
  responseSchema: Schema;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Calls Gemini and returns the parsed JSON body.
 *
 * Retry policy is not defensive padding — it was measured. Concurrent calls to
 * the Flash tier returned `503 This model is currently experiencing high
 * demand`, and the same request succeeded on a later attempt without any change.
 * Backoff is therefore the difference between a crawler that completes and one
 * that intermittently drops issues it cannot easily re-discover.
 *
 * `responseSchema` is required rather than optional: every caller in this module
 * expects a specific shape, and an unconstrained response would be parsed
 * optimistically and fail somewhere further from the cause.
 */
export async function generateJson<T>({
  contents,
  responseSchema,
  systemInstruction,
  temperature = 0.2,
  maxOutputTokens,
}: GenerateJsonOptions): Promise<T> {
  const ai = getClient();
  const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL];
  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    const isFallback = modelIndex > 0;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const startedAt = Date.now();
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema,
            temperature,
            ...(systemInstruction ? { systemInstruction } : {}),
            ...(maxOutputTokens ? { maxOutputTokens } : {}),
            httpOptions: { timeout: REQUEST_TIMEOUT_MS },
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error("Gemini returned an empty response body.");
        }

        logger.debug(
          { model, attempt, ms: Date.now() - startedAt },
          "gemini call succeeded",
        );

        // Parsed here rather than at each call site so a malformed body is
        // retried by the same logic that handles a 503, instead of throwing
        // past the backoff and failing the whole run on one bad response.
        try {
          return JSON.parse(text) as T;
        } catch {
          lastError = new Error(
            `Gemini returned a body that is not JSON: ${text.slice(0, 200)}`,
          );
          if (attempt === MAX_ATTEMPTS) break;
          continue;
        }
      } catch (err) {
        lastError = err;
        const status = statusOf(err);
        const message = err instanceof Error ? err.message : String(err);

        if (!isRetryable(status)) {
          logger.error({ model, status, err: message }, "gemini call failed (not retryable)");
          throw err;
        }

        logger.warn(
          { model, status, attempt, maxAttempts: MAX_ATTEMPTS },
          "gemini call failed (retryable)",
        );

        if (attempt < MAX_ATTEMPTS) await sleep(backoffMs(attempt));
      }
    }

    if (isFallback) break;
    logger.warn(
      { from: GEMINI_MODEL, to: GEMINI_FALLBACK_MODEL },
      "gemini primary exhausted retries, falling back",
    );
  }

  throw lastError ?? new Error("Gemini call failed with no recorded error.");
}
