import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, companiesTable, fundingTable } from "@workspace/db";
import {
  GetCompanyResponse,
  UpsertCompanyBody,
  UpsertCompanyResponse,
  ListFundingResponse,
  CreateFundingBody,
  DeleteFundingParams,
} from "@workspace/api-zod";
import { findSector } from "@workspace/sectors";
import { getActiveCompanyId } from "../lib/companyContext";
import { toIsoDate } from "../lib/dates";
import { logger } from "../lib/logger";
import { refreshAlertsForCompany } from "../lib/legal/crawl";

const router: IRouter = Router();

/**
 * Resolves a submitted sector code to the pair we store, or rejects it.
 *
 * The catalogue in `@workspace/sectors` is the only valid source of codes, and
 * the spec deliberately leaves `sectorCode` a free string so that it does not
 * have to be duplicated there. That makes this check the single gate — without
 * it the column would accept any string and the crawler would silently match
 * nothing for that company.
 *
 * Returns `null` for "no sector", which is a legitimate state: a company that
 * has not declared one matches no sector-specific decree, which is safer than
 * guessing.
 */
function resolveSector(
  code: string | null | undefined,
): { ok: true; code: string | null; label: string | null } | { ok: false } {
  if (code == null || code === "") return { ok: true, code: null, label: null };
  const sector = findSector(code);
  if (!sector) return { ok: false };
  return { ok: true, code: sector.code, label: sector.label };
}

router.get("/company", async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const companyId = await getActiveCompanyId(userId);
  if (!companyId) {
    res.status(404).json({ error: "No company configured" });
    return;
  }
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId));
  if (!company) {
    res.status(404).json({ error: "No company configured" });
    return;
  }
  res.json(
    GetCompanyResponse.parse({
      id: company.id,
      name: company.name,
      nif: company.nif,
      ai: company.ai,
      address: company.address,
      legalForm: company.legalForm,
      taxRegime: company.taxRegime,
      sectorCode: company.sectorCode,
      sectorLabel: company.sectorLabel,
      createdAt: company.createdAt.toISOString(),
    }),
  );
});

router.put("/company", async (req, res): Promise<void> => {
  const parsed = UpsertCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Never write a company without an owner: an unowned row is invisible to every
  // lookup, so the user would finish the wizard and land on a workspace that
  // does not exist. authMiddleware already rejects this, so this is a backstop.
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "UNAUTHENTICATED" });
    return;
  }

  const sector = resolveSector(parsed.data.sectorCode);
  if (!sector.ok) {
    res.status(400).json({ error: "Secteur d'activité inconnu." });
    return;
  }

  const existingId = await getActiveCompanyId(userId);

  // Read before writing, so the `refreshAlertsForCompany` call below can tell
  // whether anything the matcher reads actually changed.
  const [previous] = existingId
    ? await db
        .select({
          sectorCode: companiesTable.sectorCode,
          legalForm: companiesTable.legalForm,
          taxRegime: companiesTable.taxRegime,
        })
        .from(companiesTable)
        .where(eq(companiesTable.id, existingId))
    : [];

  let saved;
  if (existingId) {
    // `userId` is intentionally not reassigned here: the row was found *by*
    // matching this user's id, so it already owns it. Writing it would only
    // matter if that lookup ever widened, which is exactly what we don't want.
    [saved] = await db
      .update(companiesTable)
      .set({
        name: parsed.data.name,
        nif: parsed.data.nif,
        ai: parsed.data.ai,
        address: parsed.data.address ?? null,
        legalForm: parsed.data.legalForm ?? null,
        taxRegime: parsed.data.taxRegime ?? null,
        sectorCode: sector.code,
        sectorLabel: sector.label,
      })
      .where(eq(companiesTable.id, existingId))
      .returning();
  } else {
    [saved] = await db
      .insert(companiesTable)
      .values({
        name: parsed.data.name,
        nif: parsed.data.nif,
        ai: parsed.data.ai,
        address: parsed.data.address ?? null,
        legalForm: parsed.data.legalForm ?? null,
        taxRegime: parsed.data.taxRegime ?? null,
        sectorCode: sector.code,
        sectorLabel: sector.label,
        userId,
      })
      .returning();
  }
  if (!saved) {
    res.status(500).json({ error: "Failed to save company" });
    return;
  }

  /**
   * Re-match the stored corpus against the company's new identity.
   *
   * Without this the feature has a hole a user walks straight into: the empty
   * state tells them to declare their sector, and declaring it would change
   * nothing, because alerts are only ever written as new documents arrive. An
   * established company would see an empty feed until the next Journal Officiel
   * issue was published and crawled.
   *
   * Only fields the matcher actually reads trigger it — editing an address is
   * not a reason to re-score the corpus.
   *
   * Awaited rather than fired and forgotten, so the alerts exist by the time the
   * client refetches after this response. That makes it bounded work on the
   * request path, which is acceptable only because it is one indexed read plus
   * an upsert per matching document; if the corpus ever grows enough for that to
   * be felt, this belongs in the scheduler instead.
   *
   * A failure here must not fail the save: the company is already written, and
   * the worst case is a stale feed that the next crawl or a manual refresh
   * repairs.
   */
  const matchFieldsChanged =
    !previous ||
    previous.sectorCode !== saved.sectorCode ||
    previous.legalForm !== saved.legalForm ||
    previous.taxRegime !== saved.taxRegime;

  if (matchFieldsChanged) {
    try {
      await refreshAlertsForCompany(saved.id);
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err), companyId: saved.id },
        "legal alert refresh after company update failed",
      );
    }
  }

  res.json(
    UpsertCompanyResponse.parse({
      id: saved.id,
      name: saved.name,
      nif: saved.nif,
      ai: saved.ai,
      address: saved.address,
      legalForm: saved.legalForm,
      taxRegime: saved.taxRegime,
      sectorCode: saved.sectorCode,
      sectorLabel: saved.sectorLabel,
      createdAt: saved.createdAt.toISOString(),
    }),
  );
});

router.get("/company/funding", async (req, res): Promise<void> => {
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }
  const rows = await db
    .select()
    .from(fundingTable)
    .where(eq(fundingTable.companyId, companyId))
    .orderBy(fundingTable.date);
  res.json(
    ListFundingResponse.parse(
      rows.map((r) => ({
        id: r.id,
        source: r.source,
        label: r.label,
        amount: Number(r.amount),
        date: r.date,
        interestRate: r.interestRate != null ? Number(r.interestRate) : null,
        durationMonths: r.durationMonths,
      })),
    ),
  );
});

router.post("/company/funding", async (req, res): Promise<void> => {
  const parsed = CreateFundingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res
      .status(400)
      .json({ error: "Configurez d'abord le profil de l'entreprise" });
    return;
  }
  const [row] = await db
    .insert(fundingTable)
    .values({
      companyId,
      source: parsed.data.source,
      label: parsed.data.label ?? null,
      amount: String(parsed.data.amount),
      date: toIsoDate(parsed.data.date),
      interestRate:
        parsed.data.interestRate != null
          ? String(parsed.data.interestRate)
          : null,
      durationMonths: parsed.data.durationMonths ?? null,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Insert failed" });
    return;
  }
  res.status(201).json({
    id: row.id,
    source: row.source,
    label: row.label,
    amount: Number(row.amount),
    date: row.date,
    interestRate: row.interestRate != null ? Number(row.interestRate) : null,
    durationMonths: row.durationMonths,
  });
});

router.delete("/company/funding/:id", async (req, res): Promise<void> => {
  const params = DeleteFundingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // Scoped by company, not by id alone — an id-only delete lets any
  // authenticated user strip another tenant's declared capital. A foreign id is
  // a silent no-op so the route stays idempotent and never reveals existence.
  const companyId = await getActiveCompanyId(req.user?.id);
  if (companyId) {
    await db
      .delete(fundingTable)
      .where(
        and(
          eq(fundingTable.id, params.data.id),
          eq(fundingTable.companyId, companyId),
        ),
      );
  }
  res.sendStatus(204);
});

export default router;
