import { pgTable, uuid, varchar, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { transactionsTable } from "./transactions";

/** A settlement made against one facture. Payment channel is deliberately
 * separate from the facture's CREDIT classification. */
export const transactionPaymentsTable = pgTable("transaction_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactionsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  payer: varchar("payer", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  reference: varchar("reference", { length: 255 }),
  label: varchar("label", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TransactionPaymentRow = typeof transactionPaymentsTable.$inferSelect;
