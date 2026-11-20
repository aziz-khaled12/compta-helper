import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  transactionsTable,
  transactionPaymentsTable,
  inventoryItemsTable,
  inventoryMovementsTable,
} from "@workspace/db";
import {
  ListTransactionsResponse,
  ListTransactionsQueryParams,
  CreateTransactionBody,
  DeleteTransactionParams,
  ListTransactionPaymentsParams,
  ListTransactionPaymentsResponse,
  CreateTransactionPaymentParams,
  CreateTransactionPaymentBody,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { toIsoDate } from "../lib/dates";
import { computeStockState, cumpFor } from "../lib/stock";
import { factureState, paidByTransactionId } from "../lib/factureState";

const router: IRouter = Router();

function rowToView(
  row: typeof transactionsTable.$inferSelect,
  paid = 0,
) {
  const total = Number(row.amountTtc);
  const state = factureState(total, row.status, paid);
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
    status: state.status,
    thirdParty: row.thirdParty,
    category: row.category,
    itemId: row.itemId,
    quantity: row.quantity != null ? Number(row.quantity) : null,
    unitCostHt: row.unitCostHt != null ? Number(row.unitCostHt) : null,
    costOfGoodsSold:
      row.costOfGoodsSold != null ? Number(row.costOfGoodsSold) : null,
    paid: state.paid,
    rest: state.rest,
  };
}

router.get("/transactions", async (req, res): Promise<void> => {
  const q = ListTransactionsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const companyId = await getActiveCompanyId(req.user?.id);
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
  // The list is capped at 500, so the settled totals for every row come back in
  // one grouped query rather than one per entry.
  const paidByTransaction = await paidByTransactionId(rows.map((row) => row.id));
  res.json(
    ListTransactionsResponse.parse(
      rows.map((row) => rowToView(row, paidByTransaction.get(row.id))),
    ),
  );
});

router.post("/transactions", async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
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
  const tvaAmount = parsed.data.amountHt * (parsed.data.tvaRate / 100);
  const amountTtc = parsed.data.amountHt + tvaAmount;
  const { itemId, quantity } = parsed.data;
  const paidAmount = parsed.data.paidAmount ?? 0;

  // A partial entry is only meaningful when some of the facture was actually
  // settled: the list derives its status from the payment rows, so a PARTIAL
  // row without a payment would come back as "impayé". The settled amount must
  // also leave something due, otherwise the entry is simply PAID.
  if (parsed.data.status === "PARTIAL") {
    if (!(paidAmount > 0) || paidAmount >= amountTtc - 0.005) {
      res.status(400).json({
        error:
          "Le montant déjà payé doit être supérieur à 0 et inférieur au montant TTC.",
      });
      return;
    }
  } else if (paidAmount > 0) {
    res.status(400).json({
      error:
        "Un montant déjà payé n'est possible qu'avec le statut « partiel ».",
    });
    return;
  }

  // An itemId without a quantity (or a quantity of zero) names an article but
  // moves none of it, which would post a journal entry that silently disagrees
  // with the stock ledger. Reject it rather than guess a quantity.
  if (itemId && !(quantity != null && quantity > 0)) {
    res.status(400).json({
      error: "Une quantité positive est requise pour un article.",
    });
    return;
  }

  // Everything below is one unit of work: the entry and the stock movement it
  // causes must both land or neither. A half-written pair is exactly the drift
  // the perpetual system exists to prevent.
  type WriteOutcome =
    | { ok: false; status: number; error: string }
    | { ok: true; row: typeof transactionsTable.$inferSelect };

  const outcome: WriteOutcome = await db.transaction(
    async (tx): Promise<WriteOutcome> => {
      let unitCostHt: number | null = null;
      let costOfGoodsSold: number | null = null;
      let movementDirection: "IN" | "OUT" | null = null;

      if (itemId && quantity != null) {
        // Scoped to the company, like every other :id lookup here. Without the
        // companyId filter a caller could name another tenant's article and draw
        // its stock down, or feed it, through their own books.
        const [item] = await tx
          .select()
          .from(inventoryItemsTable)
          .where(
            and(
              eq(inventoryItemsTable.id, itemId),
              eq(inventoryItemsTable.companyId, companyId),
            ),
          );
        if (!item) {
          return { ok: false, status: 400, error: "Article introuvable." };
        }

        const movements = await tx
          .select()
          .from(inventoryMovementsTable)
          .where(eq(inventoryMovementsTable.itemId, itemId));

        const dated = movements.map((m) => ({
          date: m.date,
          direction: m.direction,
          quantity: Number(m.quantity),
          unitCostHt: Number(m.unitCostHt),
        }));

        if (parsed.data.type === "SALE") {
          const stock = computeStockState(dated);
          if (quantity > stock.quantity) {
            return {
              ok: false,
              status: 400,
              error: `Stock insuffisant pour ${item.name} : ${stock.quantity} disponible(s), ${quantity} demandé(s).`,
            };
          }
          // Relieve at the CUMP as it stands now, then freeze it on the entry.
          unitCostHt = cumpFor(dated);
          costOfGoodsSold = unitCostHt * quantity;
          movementDirection = "OUT";
        } else if (parsed.data.type === "PURCHASE") {
          // A purchase feeding stock buys at the price it was invoiced at.
          unitCostHt = quantity > 0 ? parsed.data.amountHt / quantity : 0;
          movementDirection = "IN";
        }
      }

      const [row] = await tx
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
          // Any open facture is deferred even when a payment channel was
          // selected in the form. The channel belongs to payment records.
          paymentMethod:
            parsed.data.status === "PAID" ? parsed.data.paymentMethod : "CREDIT",
          status: parsed.data.status,
          thirdParty: parsed.data.thirdParty ?? null,
          category: parsed.data.category ?? null,
          itemId: itemId ?? null,
          quantity: quantity != null ? String(quantity) : null,
          unitCostHt: unitCostHt != null ? String(unitCostHt) : null,
          costOfGoodsSold:
            costOfGoodsSold != null ? String(costOfGoodsSold) : null,
        })
        .returning();

      if (!row) {
        return { ok: false, status: 500, error: "Insert failed" };
      }

      // The advance is part of the same unit of work as the entry: a facture
      // marked partial without its payment would read back as unpaid.
      if (paidAmount > 0) {
        await tx.insert(transactionPaymentsTable).values({
          transactionId: row.id,
          date: toIsoDate(parsed.data.date),
          payer: parsed.data.thirdParty?.trim() || parsed.data.label,
          amount: String(paidAmount),
          type: parsed.data.paidMethod ?? "BANK",
          reference: null,
          label: null,
        });
      }

      if (movementDirection && itemId && quantity != null) {
        await tx.insert(inventoryMovementsTable).values({
          itemId,
          date: toIsoDate(parsed.data.date),
          quantity: String(quantity),
          direction: movementDirection,
          unitCostHt: String(unitCostHt ?? 0),
          note: row.label,
          transactionId: row.id,
        });
      }

      return { ok: true, row };
    },
  );

  if (!outcome.ok) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }
  res.status(201).json(rowToView(outcome.row, paidAmount));
});

router.get("/transactions/:id/payments", async (req, res): Promise<void> => {
  const params = ListTransactionPaymentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }
  const [transaction] = await db
    .select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.id, params.data.id),
        eq(transactionsTable.companyId, companyId),
      ),
    );
  if (!transaction) {
    res.status(404).json({ error: "Facture introuvable." });
    return;
  }
  const rows = await db
    .select()
    .from(transactionPaymentsTable)
    .where(eq(transactionPaymentsTable.transactionId, transaction.id));
  const responseRows = rows.length
    ? rows
    : [];
  if (responseRows.length === 0) {
    const [facture] = await db
      .select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, transaction.id),
          eq(transactionsTable.companyId, companyId),
        ),
      );
    if (facture?.status === "PAID") {
      res.json(
        ListTransactionPaymentsResponse.parse([
          {
            id: `legacy-${facture.id}`,
            transactionId: facture.id,
            date: facture.date,
            payer: facture.thirdParty ?? "",
            amount: Number(facture.amountTtc),
            type: facture.paymentMethod === "CASH" ? "CASH" : "BANK",
            reference: null,
            label: facture.label,
            synthetic: true,
          },
        ]),
      );
      return;
    }
  }
  res.json(
    ListTransactionPaymentsResponse.parse(
      responseRows.map((row) => ({
        id: row.id,
        transactionId: row.transactionId,
        date: row.date,
        payer: row.payer,
        amount: Number(row.amount),
        type: row.type,
        reference: row.reference,
        label: row.label,
        synthetic: false,
      })),
    ),
  );
});

router.post("/transactions/:id/payments", async (req, res): Promise<void> => {
  const params = CreateTransactionPaymentParams.safeParse(req.params);
  const parsed = CreateTransactionPaymentBody.safeParse(req.body);
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
    res.status(400).json({ error: "Configurez d'abord le profil de l'entreprise" });
    return;
  }

  const result = await db.transaction(async (tx) => {
    // Locked for the rest of the transaction: two payments arriving together
    // would otherwise both read the pre-payment total, both pass the cap, and
    // between them settle more than the facture is worth. The sum below is only
    // as trustworthy as the row it is read behind.
    const [facture] = await tx
      .select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, params.data.id),
          eq(transactionsTable.companyId, companyId),
        ),
      )
      .for("update");
    if (!facture) return { error: "Facture introuvable.", status: 404 as const };

    const existing = await tx
      .select()
      .from(transactionPaymentsTable)
      .where(eq(transactionPaymentsTable.transactionId, facture.id));
    const paid = existing.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const rest = Math.max(0, Number(facture.amountTtc) - paid);
    if (parsed.data.amount > rest + 0.005) {
      return { error: "Le montant dépasse le reste à payer.", status: 400 as const };
    }

    const [payment] = await tx
      .insert(transactionPaymentsTable)
      .values({
        transactionId: facture.id,
        date: toIsoDate(parsed.data.date),
        payer: parsed.data.payer,
        amount: String(parsed.data.amount),
        type: parsed.data.type,
        reference: parsed.data.reference ?? null,
        label: parsed.data.label ?? null,
      })
      .returning();
    if (!payment) return { error: "Insert failed", status: 500 as const };

    const newPaid = paid + parsed.data.amount;
    await tx
      .update(transactionsTable)
      .set({
        status: newPaid >= Number(facture.amountTtc) - 0.005 ? "PAID" : "PARTIAL",
        paymentMethod:
          newPaid >= Number(facture.amountTtc) - 0.005
            ? parsed.data.type
            : "CREDIT",
      })
      .where(eq(transactionsTable.id, facture.id));

    return { payment, status: 201 as const };
  });
  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  const payment = result.payment;
  res.status(201).json({
    id: payment.id,
    transactionId: payment.transactionId,
    date: payment.date,
    payer: payment.payer,
    amount: Number(payment.amount),
    type: payment.type,
    reference: payment.reference,
    label: payment.label,
    synthetic: false,
  });
});

router.delete("/transactions/:id", async (req, res): Promise<void> => {
  const params = DeleteTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // Scoped by company, not by id alone — an id-only delete lets any
  // authenticated user remove another tenant's entry from their books. A
  // foreign id is a silent no-op so the route stays idempotent and does not
  // reveal whether the row exists.
  //
  // Any stock movement this entry caused goes with it: `inventory_movements`
  // references the transaction `ON DELETE CASCADE`, so undoing a sale restores
  // the quantity it relieved without a second statement here.
  const companyId = await getActiveCompanyId(req.user?.id);
  if (companyId) {
    await db
      .delete(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, params.data.id),
          eq(transactionsTable.companyId, companyId),
        ),
      );
  }
  res.sendStatus(204);
});

export default router;
