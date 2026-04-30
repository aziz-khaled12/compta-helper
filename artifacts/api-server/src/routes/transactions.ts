import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import {
  ListTransactionsResponse,
  ListTransactionsQueryParams,
  CreateTransactionBody,
  DeleteTransactionParams,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { toIsoDate } from "../lib/dates";

const router: IRouter = Router();

function rowToView(row: typeof transactionsTable.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    label: row.label,
    amountHt: Number(row.amountHt),
    tvaRate: Number(row.tvaRate),
    tvaAmount: Number(row.tvaAmount),
    amountTtc: Number(row.amountTtc),
    paymentMethod: row.paymentMethod,
    status: row.status,
    thirdParty: row.thirdParty,
    category: row.category,
  };
}

router.get("/transactions", async (req, res): Promise<void> => {
  const q = ListTransactionsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const companyId = await getActiveCompanyId();
  if (!companyId) {
    res.json([]);
    return;
  }
  const conditions = [eq(transactionsTable.companyId, companyId)];
  if (q.data.type) {
    conditions.push(eq(transactionsTable.type, q.data.type));
  }
  const limit = q.data.limit ?? 200;
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt))
    .limit(limit);
  res.json(ListTransactionsResponse.parse(rows.map(rowToView)));
});

router.post("/transactions", async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
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
  const tvaAmount = parsed.data.amountHt * (parsed.data.tvaRate / 100);
  const amountTtc = parsed.data.amountHt + tvaAmount;
  const [row] = await db
    .insert(transactionsTable)
    .values({
      companyId,
      date: toIsoDate(parsed.data.date),
      type: parsed.data.type,
      label: parsed.data.label,
      amountHt: String(parsed.data.amountHt),
      tvaRate: String(parsed.data.tvaRate),
      tvaAmount: String(tvaAmount),
      amountTtc: String(amountTtc),
      paymentMethod: parsed.data.paymentMethod,
      status: parsed.data.status,
      thirdParty: parsed.data.thirdParty ?? null,
      category: parsed.data.category ?? null,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Insert failed" });
    return;
  }
  res.status(201).json(rowToView(row));
});

router.delete("/transactions/:id", async (req, res): Promise<void> => {
  const params = DeleteTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(transactionsTable)
    .where(eq(transactionsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
