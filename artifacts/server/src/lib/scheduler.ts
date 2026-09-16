import { eq } from "drizzle-orm";
import { db, pool, legalSourcesTable } from "@workspace/db";
import { logger } from "./logger";
import { runCrawl, type CrawlOutcome } from "./legal/crawl";
import { EDITIONS, discoverIssues } from "./legal/joradp";

/**
 * The crawl scheduler: a guarded interval that keeps the legal corpus current.
 *
 * There is no job infrastructure in this repo, so the job lives in the API
 * process. That makes one thing load-bearing: **two processes must never crawl
 * at once.** A rolling deploy, a `tsx` script left running, or a second replica
 * would otherwise double-fetch every issue and pay for every PDF twice. The
 * guard is a Postgres advisory lock, which is why this file is about locking
 * first and crawling second.
 */

/**
 * Advisory-lock coordinates.
 *
 * Postgres advisory locks are scoped to the *database*, not to this application,
 * so the first key exists purely to avoid colliding with anything else using the
 * same database. These values must be identical in every deployment of this
 * app — if they ever diverge, two servers would each believe they hold the lock.
 */
const CRAWL_LOCK_NAMESPACE = 0x4a5244; // "JRD" — DJERDJERA
const CRAWL_LOCK_ID = 1;

/** Issues per run. Six issues ≈ 12 fetches ≈ 220k tokens, taking ~15-20 minutes. */
const DEFAULT_ISSUES_PER_RUN = 6;

/** Six hours: four chances a day to pick up a new issue, cheap when there is none. */
const DEFAULT_INTERVAL_MINUTES = 360;

/**
 * Delay before the first run.
 *
 * Not zero, deliberately: a server that crawls the moment it boots turns every
 * restart, every crash loop, and every dev reload into a JORADP fetch and a
 * Gemini bill. A minute is long enough to survive a restart and short enough
 * that a fresh deployment is current within the hour.
 */
const DEFAULT_INITIAL_DELAY_SECONDS = 90;

export type TickOutcome =
  | { kind: "skipped"; reason: "disabled" | "locked" | "already-running" | "nothing-to-do" }
  | { kind: "ran"; outcome: CrawlOutcome }
  | { kind: "failed"; error: string };

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function isEnabled(): boolean {
  // Opt-out rather than opt-in: the corpus is the feature, and a scheduler that
  // is off by default is one nobody notices is off.
  return process.env["CRAWL_ENABLED"] !== "false";
}

/**
 * Picks the issues worth spending this run's budget on.
 *
 * The obvious implementation — "crawl the newest N issues" — never gets past the
 * newest N. Every run would re-examine the same already-parsed issues, which
 * costs nothing but also makes no progress, and a year of backfill would never
 * happen. So the window is derived from what is *unfinished* rather than from a
 * cursor: newest-first over the issues that have no resolved source row.
 *
 * An issue counts as resolved when every edition has been either PARSED or
 * SKIPPED. SKIPPED matters as much as PARSED here — older issues have no Arabic
 * edition at all, and treating those as unfinished would retry a 404 forever and
 * crowd out the issues that do have work left.
 *
 * Returns newest-first, so a partial run always advances from the present
 * backwards and the most relevant texts land first.
 */
export async function selectIssueNumbers(year: number, budget: number): Promise<number[]> {
  const discovered = await discoverIssues(year);
  if (discovered.length === 0) return [];

  const newestFirst = [...new Set(discovered.map((d) => d.issueNumber))].sort((a, b) => b - a);

  const sources = await db
    .select({
      issueNumber: legalSourcesTable.issueNumber,
      edition: legalSourcesTable.edition,
      status: legalSourcesTable.status,
    })
    .from(legalSourcesTable)
    .where(eq(legalSourcesTable.year, year));

  const editionsResolved = new Map<number, number>();
  for (const source of sources) {
    if (source.status !== "PARSED" && source.status !== "SKIPPED") continue;
    editionsResolved.set(source.issueNumber, (editionsResolved.get(source.issueNumber) ?? 0) + 1);
  }

  const targets: number[] = [];
  for (const issueNumber of newestFirst) {
    if (targets.length >= budget) break;
    if ((editionsResolved.get(issueNumber) ?? 0) >= EDITIONS.length) continue;
    targets.push(issueNumber);
  }

  return targets;
}

/**
 * Runs `fn` only if this process holds the crawl lock.
 *
 * The lock is taken on a pooled client and the connection is **destroyed** on
 * the way out rather than returned to the pool. That is not tidiness: Postgres
 * advisory locks are held by the *session*, and this one outlives a single
 * query — it is held across the whole crawl. Handing that connection back to the
 * pool would leave a session holding the crawl lock sitting in the pool, where
 * the next `pool.connect()` could hand it to an unrelated request, and where
 * every later run in this process would find the lock already held by itself.
 *
 * `pg_advisory_unlock` is still issued explicitly so the normal path releases
 * immediately; ending the session is the backstop that covers the abnormal one.
 * `release(err)` with a truthy error destroys the client instead of pooling it.
 */
async function withCrawlLock<T>(fn: () => Promise<T>): Promise<T | "locked"> {
  const client = await pool.connect();
  let acquired = false;

  try {
    const { rows } = await client.query<{ locked: boolean }>(
      "select pg_try_advisory_lock($1, $2) as locked",
      [CRAWL_LOCK_NAMESPACE, CRAWL_LOCK_ID],
    );

    if (!rows[0]?.locked) return "locked";
    acquired = true;

    return await fn();
  } finally {
    if (acquired) {
      try {
        await client.query("select pg_advisory_unlock($1, $2)", [
          CRAWL_LOCK_NAMESPACE,
          CRAWL_LOCK_ID,
        ]);
        // Destroyed regardless: releasing to the pool would risk a session whose
        // unlock silently failed being reused still holding the lock.
        client.release(true);
      } catch (err) {
        logger.warn({ err }, "crawl lock release failed; destroying the connection");
        client.release(true);
      }
    } else {
      client.release();
    }
  }
}

/**
 * One scheduler tick, exposed so it can be driven by hand or from a script.
 *
 * Errors are contained here rather than propagating: this runs on a timer with
 * no caller to catch them, and an unhandled rejection would take the API process
 * down with it. A failed crawl is a logged event, not an outage.
 */
export async function runScheduledCrawl(): Promise<TickOutcome> {
  if (!isEnabled()) return { kind: "skipped", reason: "disabled" };

  const year = positiveInt(process.env["CRAWL_YEAR"], new Date().getFullYear());
  const budget = positiveInt(process.env["CRAWL_ISSUES_PER_RUN"], DEFAULT_ISSUES_PER_RUN);

  try {
    const result = await withCrawlLock(async () => {
      const targets = await selectIssueNumbers(year, budget);
      if (targets.length === 0) {
        // No run row is opened for a no-op. `crawl_runs` is an observability
        // table, and filling it with ticks that did nothing would bury the runs
        // that actually fetched something.
        logger.info({ year }, "crawl scheduler: nothing to do");
        return { kind: "skipped", reason: "nothing-to-do" } as const;
      }

      logger.info({ year, targets }, "crawl scheduler: starting run");
      const outcome = await runCrawl({ year, only: targets });
      return { kind: "ran", outcome } as const;
    });

    if (result === "locked") {
      logger.info("crawl scheduler: another instance holds the lock, skipping");
      return { kind: "skipped", reason: "locked" };
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message, year }, "crawl scheduler: tick failed");
    return { kind: "failed", error: message };
  }
}

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Starts the interval. Safe to call once from `index.ts` after `listen`.
 *
 * The in-process `running` flag is not redundant with the advisory lock: the
 * lock is per *session*, and a tick that overruns its interval would otherwise
 * start a second run in the same process that takes a *different* pooled
 * connection and correctly finds the lock free.
 */
export function startCrawlScheduler(): void {
  if (timer) return;

  if (!isEnabled()) {
    logger.info("crawl scheduler: disabled by CRAWL_ENABLED=false");
    return;
  }

  const intervalMs =
    positiveInt(process.env["CRAWL_INTERVAL_MINUTES"], DEFAULT_INTERVAL_MINUTES) * 60_000;
  const initialDelayMs =
    positiveInt(process.env["CRAWL_INITIAL_DELAY_SECONDS"], DEFAULT_INITIAL_DELAY_SECONDS) * 1000;

  const tick = async () => {
    if (running) {
      logger.warn("crawl scheduler: previous run still in progress, skipping this tick");
      return;
    }
    running = true;
    try {
      await runScheduledCrawl();
    } finally {
      running = false;
    }
  };

  const firstRun = setTimeout(() => {
    void tick();
    const recurring = setInterval(() => void tick(), intervalMs);
    // The first-run handle is replaced by the interval, so the interval has to
    // carry the unref too — otherwise the process is pinned after the first tick
    // even though it was not before it.
    recurring.unref();
    timer = recurring;
  }, initialDelayMs);

  // `unref` so a process that imports this module for a script is not held open
  // by the timer. The HTTP listener keeps the real server alive regardless.
  firstRun.unref();
  timer = firstRun;

  logger.info(
    { initialDelaySeconds: initialDelayMs / 1000, intervalMinutes: intervalMs / 60_000 },
    "crawl scheduler: started",
  );
}

export function stopCrawlScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    clearInterval(timer);
    timer = null;
  }
}
