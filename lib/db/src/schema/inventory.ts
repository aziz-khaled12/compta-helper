import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  text,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const inventoryItemsTable = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 30 }).notNull(),
  unit: varchar("unit", { length: 30 }),
});

export const inventoryMovementsTable = pgTable("inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => inventoryItemsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  quantity: numeric("quantity", { precision: 18, scale: 3 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  unitCostHt: numeric("unit_cost_ht", { precision: 18, scale: 2 }).notNull(),
  note: text("note"),
});

export type InventoryItemRow = typeof inventoryItemsTable.$inferSelect;
export type InventoryMovementRow =
  typeof inventoryMovementsTable.$inferSelect;
