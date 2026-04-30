import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  fixedAssetsTable,
  amortizationLogsTable,
} from "@workspace/db";
import {
  ListAssetsResponse,
  CreateAssetBody,
  DeleteAssetParams,
  GetAssetAmortizationParams,
  GetAssetAmortizationResponse,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { toIsoDate } from "../lib/dates";

const router: IRouter = Router();

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeAssetView(row: {
  id: string;
  label: string;
  category: string | null;
  costHt: string;
  purchaseDate: string;
  lifeYears: number;
  residualValue: string;
}) {
  const cost = Number(row.costHt);
  const residual = Number(row.residualValue);
  const depreciable = Math.max(0, cost - residual);
  const totalMonths = row.lifeYears * 12;
  const monthlyDepreciation = totalMonths > 0 ? depreciable / totalMonths : 0;
  const purchase = new Date(row.purchaseDate + "T00:00:00Z");
  const now = new Date();
  const monthsElapsed = Math.max(
    0,
    Math.min(
      totalMonths,
      (now.getUTCFullYear() - purchase.getUTCFullYear()) * 12 +
        (now.getUTCMonth() - purchase.getUTCMonth()),
    ),
  );
  const accumulated = monthsElapsed * monthlyDepreciation;
  const bookValue = Math.max(residual, cost - accumulated);
  return {
    id: row.id,
    label: row.label,
    category: row.category,
    costHt: cost,
    purchaseDate: row.purchaseDate,
    lifeYears: row.lifeYears,
    residualValue: residual,
    monthlyDepreciation,
    accumulatedDepreciation: accumulated,
    bookValue,
  };
}

router.get("/assets", async (_req, res): Promise<void> => {
  const companyId = await getActiveCompanyId();
  if (!companyId) {
    res.json([]);
    return;
  }
  const rows = await db
    .select()
    .from(fixedAssetsTable)
    .where(eq(fixedAssetsTable.companyId, companyId))
    .orderBy(asc(fixedAssetsTable.purchaseDate));
  res.json(ListAssetsResponse.parse(rows.map(computeAssetView)));
});

router.post("/assets", async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse(req.body);
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
  const residualValue = parsed.data.residualValue ?? 0;
  const [row] = await db
    .insert(fixedAssetsTable)
    .values({
      companyId,
      label: parsed.data.label,
      category: parsed.data.category ?? null,
      costHt: String(parsed.data.costHt),
      purchaseDate: toIsoDate(parsed.data.purchaseDate),
      lifeYears: parsed.data.lifeYears,
      residualValue: String(residualValue),
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Insert failed" });
    return;
  }

  // Auto-generate monthly amortization log entries
  const cost = Number(row.costHt);
  const depreciable = Math.max(0, cost - residualValue);
  const totalMonths = row.lifeYears * 12;
  const monthly = totalMonths > 0 ? depreciable / totalMonths : 0;
  if (monthly > 0) {
    const purchase = new Date(row.purchaseDate + "T00:00:00Z");
    const entries: Array<{
      assetId: string;
      date: string;
      amount: string;
    }> = [];
    for (let i = 1; i <= totalMonths; i++) {
      entries.push({
        assetId: row.id,
        date: isoDate(addMonths(purchase, i)),
        amount: String(monthly),
      });
    }
    await db.insert(amortizationLogsTable).values(entries);
  }
  res.status(201).json(computeAssetView(row));
});

router.delete("/assets/:id", async (req, res): Promise<void> => {
  const params = DeleteAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(fixedAssetsTable)
    .where(eq(fixedAssetsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get(
  "/assets/:id/amortization",
  async (req, res): Promise<void> => {
    const params = GetAssetAmortizationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(amortizationLogsTable)
      .where(eq(amortizationLogsTable.assetId, params.data.id))
      .orderBy(asc(amortizationLogsTable.date));
    res.json(
      GetAssetAmortizationResponse.parse(
        rows.map((r) => ({
          id: r.id,
          assetId: r.assetId,
          date: r.date,
          amount: Number(r.amount),
        })),
      ),
    );
  },
);

export default router;
