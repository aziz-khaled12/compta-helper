import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  integer,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const fixedAssetsTable = pgTable("fixed_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  costHt: numeric("cost_ht", { precision: 18, scale: 2 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  lifeYears: integer("life_years").notNull(),
  residualValue: numeric("residual_value", { precision: 18, scale: 2 })
    .notNull()
    .default("0"),
  // How the acquisition was paid: CASH or BANK. Defaulted so rows registered
  // before the field existed keep a sensible (and non-null) value.
  paymentAccount: varchar("payment_account", { length: 10 })
    .notNull()
    .default("CASH"),
});

export const amortizationLogsTable = pgTable("amortization_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => fixedAssetsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
});

export type FixedAssetRow = typeof fixedAssetsTable.$inferSelect;
export type AmortizationLogRow = typeof amortizationLogsTable.$inferSelect;
