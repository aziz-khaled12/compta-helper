import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, debtsTable, debtPaymentsTable } from "@workspace/db";
import {
  ListDebtsResponse,
  CreateDebtBody,
  DeleteDebtParams,
  ListDebtPaymentsParams,
  ListDebtPaymentsResponse,
  CreateDebtPaymentParams,
  CreateDebtPaymentBody,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { toIsoDate } from "../lib/dates";

const router: IRouter = Router();

/** Tolerance for numeric(18,2) round-tripping through JS floats. */
const EPSILON = 0.005;

function debtView(
  row: typeof debtsTable.$inferSelect,
  paid: number,
) {
  const amount = Number(row.amount);
  return {
    id: row.id,
    personName: row.personName,
    direction: row.direction,
    amount,
    date: row.date,
    note: row.note,
    origin: row.origin,
    paid,
    rest: Math.max(0, amount - paid),
  };
}

router.get("/debts", async (req, res): Promise<void> => {
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }
  const rows = await db
    .select()
    .from(debtsTable)
    .where(eq(debtsTable.companyId, companyId))
    .orderBy(desc(debtsTable.date), desc(debtsTable.createdAt));

  // One aggregate read rather than a query per row: the page needs paid/rest
  // for every debt, and the list is small by nature (one row per person).
  const paidByDebt = new Map<string, number>();
  if (rows.length > 0) {
    const payments = await db
      .select({
        debtId: debtPaymentsTable.debtId,
        amount: debtPaymentsTable.amount,
      })
      .from(debtPaymentsTable)
      .where(
        inArray(
          debtPaymentsTable.debtId,
          rows.map((row) => row.id),
        ),
      );
    for (const payment of payments) {
      paidByDebt.set(
        payment.debtId,
        (paidByDebt.get(payment.debtId) ?? 0) + Number(payment.amount),
      );
    }
  }

  res.json(
    ListDebtsResponse.parse(
      rows.map((row) => debtView(row, paidByDebt.get(row.id) ?? 0)),
    ),
  );
});

router.post("/debts", async (req, res): Promise<void> => {
  const parsed = CreateDebtBody.safeParse(req.body);
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
  // Provenance only: rows the wizard writes arrive with origin ONBOARDING so the
  // dashboard can badge them as old debts; everything else defaults to MANUAL.
  const [row] = await db
    .insert(debtsTable)
    .values({
      companyId,
      personName: parsed.data.personName,
      direction: parsed.data.direction,
      amount: String(parsed.data.amount),
      date: toIsoDate(parsed.data.date),
      note: parsed.data.note ?? null,
      origin: parsed.data.origin ?? "MANUAL",
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Insert failed" });
    return;
  }
  res.status(201).json(ListDebtsResponse.element.parse(debtView(row, 0)));
});

router.delete("/debts/:id", async (req, res): Promise<void> => {
  const params = DeleteDebtParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // Scoped by company, not by id alone. A foreign id is a silent no-op so the
  // route stays idempotent and never reveals whether the row exists. Payments
  // follow the debt through the foreign key's ON DELETE CASCADE.
  const companyId = await getActiveCompanyId(req.user?.id);
  if (companyId) {
    await db
      .delete(debtsTable)
      .where(
        and(eq(debtsTable.id, params.data.id), eq(debtsTable.companyId, companyId)),
      );
  }
  res.sendStatus(204);
});

router.get("/debts/:id/payments", async (req, res): Promise<void> => {
  const params = ListDebtPaymentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }
  const [debt] = await db
    .select({ id: debtsTable.id })
    .from(debtsTable)
    .where(
      and(eq(debtsTable.id, params.data.id), eq(debtsTable.companyId, companyId)),
    );
  if (!debt) {
    res.status(404).json({ error: "Dette introuvable." });
    return;
  }
  const rows = await db
    .select()
    .from(debtPaymentsTable)
    .where(eq(debtPaymentsTable.debtId, debt.id))
    .orderBy(desc(debtPaymentsTable.date));
  res.json(
    ListDebtPaymentsResponse.parse(
      rows.map((row) => ({
        id: row.id,
        debtId: row.debtId,
        date: row.date,
        amount: Number(row.amount),
        note: row.note,
      })),
    ),
  );
});

router.post("/debts/:id/payments", async (req, res): Promise<void> => {
  const params = CreateDebtPaymentParams.safeParse(req.params);
  const parsed = CreateDebtPaymentBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success
        ? params.error.message
        : !parsed.success
          ? parsed.error.message
          : "Invalid request",
    });
    return;
  }
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res
      .status(400)
      .json({ error: "Configurez d'abord le profil de l'entreprise" });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [debt] = await tx
      .select()
      .from(debtsTable)
      .where(
        and(eq(debtsTable.id, params.data.id), eq(debtsTable.companyId, companyId)),
      );
    if (!debt) return { error: "Dette introuvable.", status: 404 as const };

    const existing = await tx
      .select({ amount: debtPaymentsTable.amount })
      .from(debtPaymentsTable)
      .where(eq(debtPaymentsTable.debtId, debt.id));
    const paid = existing.reduce((sum, row) => sum + Number(row.amount), 0);
    const rest = Math.max(0, Number(debt.amount) - paid);
    // Re-checked inside the transaction: two concurrent payments must not both
    // pass a cap that was read before either was written.
    if (parsed.data.amount > rest + EPSILON) {
      return { error: "Le montant dépasse le reste à payer.", status: 400 as const };
    }

    const [payment] = await tx
      .insert(debtPaymentsTable)
      .values({
        debtId: debt.id,
        date: toIsoDate(parsed.data.date),
        amount: String(parsed.data.amount),
        note: parsed.data.note ?? null,
      })
      .returning();
    if (!payment) return { error: "Insert failed", status: 500 as const };

    return { payment, status: 201 as const };
  });

  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  const payment = result.payment;
  res.status(201).json({
    id: payment.id,
    debtId: payment.debtId,
    date: payment.date,
    amount: Number(payment.amount),
    note: payment.note,
  });
});

export default router;
