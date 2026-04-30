import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable, fundingTable } from "@workspace/db";
import {
  GetCompanyResponse,
  UpsertCompanyBody,
  UpsertCompanyResponse,
  ListFundingResponse,
  CreateFundingBody,
  DeleteFundingParams,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { toIsoDate } from "../lib/dates";

const router: IRouter = Router();

router.get("/company", async (_req, res): Promise<void> => {
  const [company] = await db.select().from(companiesTable).limit(1);
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
  const existingId = await getActiveCompanyId();
  let saved;
  if (existingId) {
    [saved] = await db
      .update(companiesTable)
      .set({
        name: parsed.data.name,
        nif: parsed.data.nif,
        ai: parsed.data.ai,
        address: parsed.data.address ?? null,
        legalForm: parsed.data.legalForm ?? null,
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
      })
      .returning();
  }
  if (!saved) {
    res.status(500).json({ error: "Failed to save company" });
    return;
  }
  res.json(
    UpsertCompanyResponse.parse({
      id: saved.id,
      name: saved.name,
      nif: saved.nif,
      ai: saved.ai,
      address: saved.address,
      legalForm: saved.legalForm,
      createdAt: saved.createdAt.toISOString(),
    }),
  );
});

router.get("/company/funding", async (_req, res): Promise<void> => {
  const companyId = await getActiveCompanyId();
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
  const companyId = await getActiveCompanyId();
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
  await db.delete(fundingTable).where(eq(fundingTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
