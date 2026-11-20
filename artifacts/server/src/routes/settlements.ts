import { Router, type IRouter } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db, transactionsTable, transactionPaymentsTable } from "@workspace/db";
import { ListSettlementsResponse } from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";

const router: IRouter = Router();

/**
 * Every settlement the company has, dated the day it was paid.
 *
 * The trésorerie cannot be derived from `transactions` alone: a facture carries
 * one channel and one date, while what actually moved through the caisse or the
 * banque is the payment rows — each with its own date and its own amount. This
 * endpoint is that ledger, in one request instead of one call per facture.
 *
 * A facture settled before payments were recorded has no row, so it gets the
 * same synthetic stand-in `GET /transactions/:id/payments` already emits. The
 * rule is `factureState`'s — paid only when the stored status says so *and* no
 * row exists — which is what keeps the two readings from drifting.
 */
router.get("/settlements", async (req, res): Promise<void> => {
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }

  const recorded = await db
    .select({
      id: transactionPaymentsTable.id,
      transactionId: transactionPaymentsTable.transactionId,
      date: transactionPaymentsTable.date,
      payer: transactionPaymentsTable.payer,
      amount: transactionPaymentsTable.amount,
      type: transactionPaymentsTable.type,
      reference: transactionPaymentsTable.reference,
      label: transactionPaymentsTable.label,
      transactionType: transactionsTable.type,
      transactionLabel: transactionsTable.label,
    })
    .from(transactionPaymentsTable)
    .innerJoin(
      transactionsTable,
      eq(transactionPaymentsTable.transactionId, transactionsTable.id),
    )
    .where(eq(transactionsTable.companyId, companyId));

  const legacy = await db
    .select({
      id: transactionsTable.id,
      date: transactionsTable.date,
      payer: transactionsTable.thirdParty,
      amount: transactionsTable.amountTtc,
      paymentMethod: transactionsTable.paymentMethod,
      label: transactionsTable.label,
      transactionType: transactionsTable.type,
    })
    .from(transactionsTable)
    .leftJoin(
      transactionPaymentsTable,
      eq(transactionPaymentsTable.transactionId, transactionsTable.id),
    )
    .where(
      and(
        eq(transactionsTable.companyId, companyId),
        eq(transactionsTable.status, "PAID"),
        isNull(transactionPaymentsTable.id),
      ),
    );

  // One chronological ledger, whichever side a row came from. The client sorts
  // again before drawing, but a list endpoint that returns a shuffled mix of two
  // queries is a trap for the next consumer.
  const rows = [
    ...recorded.map((row) => ({
      id: row.id,
      transactionId: row.transactionId,
      date: row.date,
      payer: row.payer,
      amount: Number(row.amount),
      type: row.type,
      reference: row.reference,
      label: row.label,
      transactionType: row.transactionType,
      transactionLabel: row.transactionLabel,
      synthetic: false,
    })),
    ...legacy.map((row) => ({
      id: `legacy-${row.id}`,
      transactionId: row.id,
      date: row.date,
      payer: row.payer ?? "",
      amount: Number(row.amount),
      type: row.paymentMethod === "CASH" ? "CASH" : "BANK",
      reference: null,
      label: row.label,
      transactionType: row.transactionType,
      transactionLabel: row.label,
      synthetic: true,
    })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  res.json(ListSettlementsResponse.parse(rows));
});

export default router;
