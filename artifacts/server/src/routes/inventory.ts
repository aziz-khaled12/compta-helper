import { Router, type IRouter } from "express";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import {
  db,
  inventoryItemsTable,
  inventoryMovementsTable,
} from "@workspace/db";
import {
  ListInventoryItemsResponse,
  CreateInventoryItemBody,
  DeleteInventoryItemParams,
  ListInventoryMovementsResponse,
  ListInventoryMovementsQueryParams,
  CreateInventoryMovementBody,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { toIsoDate } from "../lib/dates";
import { computeStockState, cumpFor } from "../lib/stock";

const router: IRouter = Router();

router.get("/inventory/items", async (req, res): Promise<void> => {
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }
  const items = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.companyId, companyId))
    .orderBy(asc(inventoryItemsTable.name));

  if (items.length === 0) {
    res.json([]);
    return;
  }

  const itemIds = items.map((i) => i.id);
  const movements = await db
    .select()
    .from(inventoryMovementsTable)
    .where(inArray(inventoryMovementsTable.itemId, itemIds));

  const movementsByItem = new Map<string, typeof movements>();
  for (const m of movements) {
    const rows = movementsByItem.get(m.itemId) ?? [];
    rows.push(m);
    movementsByItem.set(m.itemId, rows);
  }

  const view = items.map((it) => {
    const stock = computeStockState(
      (movementsByItem.get(it.id) ?? []).map((m) => ({
        date: m.date,
        direction: m.direction,
        quantity: Number(m.quantity),
        unitCostHt: Number(m.unitCostHt),
      })),
    );
    return {
      id: it.id,
      name: it.name,
      category: it.category,
      unit: it.unit,
      balance: stock.quantity,
      averageCost: stock.unitCost,
      totalValue: stock.value,
    };
  });
  res.json(ListInventoryItemsResponse.parse(view));
});

router.post("/inventory/items", async (req, res): Promise<void> => {
  const parsed = CreateInventoryItemBody.safeParse(req.body);
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
    .insert(inventoryItemsTable)
    .values({
      companyId,
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit ?? null,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Insert failed" });
    return;
  }
  res.status(201).json({
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    balance: 0,
    averageCost: 0,
    totalValue: 0,
  });
});

router.delete("/inventory/items/:id", async (req, res): Promise<void> => {
  const params = DeleteInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // Scoped by company, not by id alone — an id-only delete lets any
  // authenticated user remove another tenant's item (and, by cascade, every
  // movement recorded against it). A foreign id is a silent no-op.
  const companyId = await getActiveCompanyId(req.user?.id);
  if (companyId) {
    await db
      .delete(inventoryItemsTable)
      .where(
        and(
          eq(inventoryItemsTable.id, params.data.id),
          eq(inventoryItemsTable.companyId, companyId),
        ),
      );
  }
  res.sendStatus(204);
});

router.get("/inventory/movements", async (req, res): Promise<void> => {
  const q = ListInventoryMovementsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }
  const items = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.companyId, companyId));
  const itemIds = items.map((i) => i.id);
  if (itemIds.length === 0) {
    res.json([]);
    return;
  }
  const filterIds =
    q.data.itemId && itemIds.includes(q.data.itemId)
      ? [q.data.itemId]
      : itemIds;
  const movements = await db
    .select()
    .from(inventoryMovementsTable)
    .where(inArray(inventoryMovementsTable.itemId, filterIds))
    .orderBy(desc(inventoryMovementsTable.date));
  const nameById = new Map(items.map((i) => [i.id, i.name]));
  res.json(
    ListInventoryMovementsResponse.parse(
      movements.map((m) => ({
        id: m.id,
        itemId: m.itemId,
        itemName: nameById.get(m.itemId) ?? "",
        date: m.date,
        quantity: Number(m.quantity),
        direction: m.direction,
        unitCostHt: Number(m.unitCostHt),
        note: m.note,
        transactionId: m.transactionId,
      })),
    ),
  );
});

router.post("/inventory/movements", async (req, res): Promise<void> => {
  const parsed = CreateInventoryMovementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Scoped to the company, like every other :id lookup — without this a caller
  // could post a movement against another tenant's article.
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res
      .status(400)
      .json({ error: "Configurez d'abord le profil de l'entreprise" });
    return;
  }
  const [item] = await db
    .select()
    .from(inventoryItemsTable)
    .where(
      and(
        eq(inventoryItemsTable.id, parsed.data.itemId),
        eq(inventoryItemsTable.companyId, companyId),
      ),
    );
  if (!item) {
    res.status(400).json({ error: "Article introuvable." });
    return;
  }

  // A hand-entered OUT that does not name a cost is relieved at the article's
  // CUMP, so it agrees with the sales the journal posts automatically. An IN
  // has no such fallback: a receipt into stock with no cost would value the
  // article at zero and corrupt every CUMP computed after it.
  let unitCostHt = parsed.data.unitCostHt ?? 0;
  if (parsed.data.direction === "OUT" && !unitCostHt) {
    const existing = await db
      .select()
      .from(inventoryMovementsTable)
      .where(eq(inventoryMovementsTable.itemId, item.id));
    unitCostHt = cumpFor(
      existing.map((m) => ({
        date: m.date,
        direction: m.direction,
        quantity: Number(m.quantity),
        unitCostHt: Number(m.unitCostHt),
      })),
    );
  }

  const [row] = await db
    .insert(inventoryMovementsTable)
    .values({
      itemId: parsed.data.itemId,
      date: toIsoDate(parsed.data.date),
      quantity: String(parsed.data.quantity),
      direction: parsed.data.direction,
      unitCostHt: String(unitCostHt),
      note: parsed.data.note ?? null,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Insert failed" });
    return;
  }
  res.status(201).json({
    id: row.id,
    itemId: row.itemId,
    itemName: item.name,
    date: row.date,
    quantity: Number(row.quantity),
    direction: row.direction,
    unitCostHt: Number(row.unitCostHt),
    note: row.note,
    transactionId: row.transactionId,
  });
});

export default router;
