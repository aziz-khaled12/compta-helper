import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, companiesTable, insightRunsTable } from "@workspace/db";
import {
  NarrateInsightsBody,
  NarrateInsightsResponse,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { hashFindings, narrateFindings } from "../lib/insights/narrateFindings";
import { toIsoDate } from "../lib/dates";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * Narration for the Rapports insights panel.
 *
 * The detectors run in the browser, so all this receives is the findings they
 * produced — never the ledger. That is deliberate on both counts: the API key
 * stays server-side, and the company's rows never leave the client. It is also
 * why the request body is the entire input to the model, and why nothing here
 * re-derives a figure.
 */
router.post("/insights/narrate", async (req, res): Promise<void> => {
  const body = NarrateInsightsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.status(404).json({ error: "No company found for this user" });
    return;
  }

  const { findings, periodFrom, periodTo } = body.data;
  const periodRef = describePeriod(periodFrom ?? null, periodTo ?? null);

  // Nothing to narrate. Answering with an empty summary is more honest than
  // paying a model to observe that there is nothing to observe.
  if (findings.length === 0) {
    res.json(
      NarrateInsightsResponse.parse({
        summary: "",
        priorities: [],
        model: "none",
        cached: false,
      }),
    );
    return;
  }

  const hash = hashFindings(findings, periodRef);

  // The cache is per company as well as per hash: the narration addresses the
  // business, so another company with identical figures is not a cache hit.
  const [cached] = await db
    .select()
    .from(insightRunsTable)
    .where(
      and(
        eq(insightRunsTable.companyId, companyId),
        eq(insightRunsTable.findingsHash, hash),
      ),
    )
    .limit(1);

  if (cached) {
    // `narrative` is jsonb, so it arrives as `unknown` — it is re-validated
    // rather than trusted and cast. A row written before the contract changed
    // is treated as a miss, because regenerating costs one model call while a
    // blind cast would ship a shape the panel cannot render.
    const replay = NarrateInsightsResponse.safeParse({
      ...(cached.narrative as Record<string, unknown>),
      model: cached.model,
      cached: true,
    });
    if (replay.success) {
      res.json(replay.data);
      return;
    }
    logger.warn(
      { companyId, hash },
      "cached insight narrative no longer matches the contract; regenerating",
    );
  }

  const [company] = await db
    .select({ name: companiesTable.name })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);

  try {
    const { narrative, model } = await narrateFindings({
      findings,
      periodRef,
      companyName: company?.name ?? null,
    });

    await db.insert(insightRunsTable).values({
      companyId,
      periodFrom: periodFrom ? toIsoDate(periodFrom) : null,
      periodTo: periodTo ? toIsoDate(periodTo) : null,
      findingsHash: hash,
      findings,
      narrative,
      model,
    });

    res.json(NarrateInsightsResponse.parse({ ...narrative, model, cached: false }));
  } catch (err) {
    // Narration is the optional half of this feature. The client already holds
    // the deterministic explanation for every finding it sent, so the honest
    // response is "no prose this time" rather than an error the panel would
    // have to render as a failure.
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), companyId, findings: findings.length },
      "insight narration failed; client will fall back to knowledge-base text",
    );
    res.status(503).json({
      error: "Narration indisponible pour le moment.",
    });
  }
});

/**
 * A human-readable period, built here rather than sent by the client.
 *
 * The period string is part of the cache key, so deriving it from the dates
 * keeps a browser that words the period differently from missing the cache.
 */
function describePeriod(from: Date | null, to: Date | null): string {
  const format = (d: Date) =>
    d.toLocaleDateString("fr-DZ", { month: "long", year: "numeric" });
  if (from && to) return `${format(from)} – ${format(to)}`;
  if (from) return `depuis ${format(from)}`;
  if (to) return `jusqu'à ${format(to)}`;
  return "période non précisée";
}

export default router;
