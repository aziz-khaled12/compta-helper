import { Router, type IRouter } from "express";
import { eq, asc, desc, inArray } from "drizzle-orm";
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

const router: IRouter = Router();

router.get("/inventory/items", async (_req, res): Promise<void> => {
  const companyId = await getActiveCompanyId();
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

  const balanceByItem = new Map<
    string,
    { qty: number; totalValue: number }
  >();
  for (const m of movements) {
    const cur = balanceByItem.get(m.itemId) ?? { qty: 0, totalValue: 0 };
    const q = Number(m.quantity);
    const cost = Number(m.unitCostHt);
    if (m.direction === "IN") {
      cur.qty += q;
      cur.totalValue += q * cost;
    } else {
      cur.qty -= q;
      cur.totalValue -= q * cost;
    }
    balanceByItem.set(m.itemId, cur);
  }

  const view = items.map((it) => {
    const b = balanceByItem.get(it.id) ?? { qty: 0, totalValue: 0 };
    const balance = b.qty;
    const totalValue = Math.max(0, b.totalValue);
    const averageCost = balance > 0 ? totalValue / balance : 0;
    return {
      id: it.id,
      name: it.name,
      category: it.category,
      unit: it.unit,
      balance,
      averageCost,
      totalValue,
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
  const companyId = await getActiveCompanyId();
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
  await db
    .delete(inventoryItemsTable)
    .where(eq(inventoryItemsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/inventory/movements", async (req, res): Promise<void> => {
  const q = ListInventoryMovementsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const companyId = await getActiveCompanyId();
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
  const [row] = await db
    .insert(inventoryMovementsTable)
    .values({
      itemId: parsed.data.itemId,
      date: toIsoDate(parsed.data.date),
      quantity: String(parsed.data.quantity),
      direction: parsed.data.direction,
      unitCostHt: String(parsed.data.unitCostHt),
      note: parsed.data.note ?? null,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Insert failed" });
    return;
  }
  const [item] = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.id, row.itemId));
  res.status(201).json({
    id: row.id,
    itemId: row.itemId,
    itemName: item?.name ?? "",
    date: row.date,
    quantity: Number(row.quantity),
    direction: row.direction,
    unitCostHt: Number(row.unitCostHt),
    note: row.note,
  });
});

export default router;
