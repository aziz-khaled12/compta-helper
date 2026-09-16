import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  transactionsTable,
  inventoryItemsTable,
  inventoryMovementsTable,
} from "@workspace/db";
import {
  ListTransactionsResponse,
  ListTransactionsQueryParams,
  CreateTransactionBody,
  DeleteTransactionParams,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { toIsoDate } from "../lib/dates";
import { computeStockState, cumpFor } from "../lib/stock";

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
    itemId: row.itemId,
    quantity: row.quantity != null ? Number(row.quantity) : null,
    unitCostHt: row.unitCostHt != null ? Number(row.unitCostHt) : null,
    costOfGoodsSold:
      row.costOfGoodsSold != null ? Number(row.costOfGoodsSold) : null,
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
  res.json(ListTransactionsResponse.parse(rows.map(rowToView)));
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
          paymentMethod: parsed.data.paymentMethod,
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
  res.status(201).json(rowToView(outcome.row));
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
