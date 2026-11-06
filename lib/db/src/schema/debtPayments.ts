import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { debtsTable } from "./debts";

/**
 * A settlement made against one debt. The remaining balance is `debt.amount`
 * minus the sum of these rows, computed on read — the same convention as
 * `transaction_payments`, so a partial payment can never leave a stale balance
 * behind on the debt itself.
 */
export const debtPaymentsTable = pgTable(
  "debt_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debtsTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("IDX_debt_payment_debt_id").on(table.debtId)],
);

export type DebtPaymentRow = typeof debtPaymentsTable.$inferSelect;
