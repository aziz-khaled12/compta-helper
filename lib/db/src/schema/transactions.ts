import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { inventoryItemsTable } from "./inventory";

export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  amountHt: numeric("amount_ht", { precision: 18, scale: 2 }).notNull(),
  tvaRate: numeric("tva_rate", { precision: 6, scale: 3 }).notNull(),
  tvaAmount: numeric("tva_amount", { precision: 18, scale: 2 }).notNull(),
  amountTtc: numeric("amount_ttc", { precision: 18, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  thirdParty: varchar("third_party", { length: 255 }),
  category: varchar("category", { length: 100 }),
  /**
   * The stock side of this entry, when it has one.
   *
   * A sale that names an article relieves inventory at the CUMP prevailing when
   * it was posted; a purchase that names one adds to it. The three cost columns
   * are written once, at posting, and never recomputed:
   *
   *   - `unitCostHt` and `costOfGoodsSold` are the cost *as applied*, not a
   *     value derived on read. CUMP moves as stock moves, so recomputing an old
   *     sale at today's CUMP would silently restate history.
   *   - `itemId` is `SET NULL` rather than cascading, because the money has to
   *     outlive the master record. Deleting an article from the catalogue must
   *     not erase its cost from a P&L that has already been posted.
   */
  itemId: uuid("item_id").references(() => inventoryItemsTable.id, {
    onDelete: "set null",
  }),
  quantity: numeric("quantity", { precision: 18, scale: 3 }),
  unitCostHt: numeric("unit_cost_ht", { precision: 18, scale: 2 }),
  costOfGoodsSold: numeric("cost_of_goods_sold", {
    precision: 18,
    scale: 2,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TransactionRow = typeof transactionsTable.$inferSelect;
