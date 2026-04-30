import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const payrollsTable = pgTable("payrolls", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  monthYear: varchar("month_year", { length: 7 }).notNull(),
  baseSalary: numeric("base_salary", { precision: 18, scale: 2 }).notNull(),
  experienceBonus: numeric("experience_bonus", {
    precision: 18,
    scale: 2,
  }).notNull(),
  bonus: numeric("bonus", { precision: 18, scale: 2 })
    .notNull()
    .default("0"),
  grossSalary: numeric("gross_salary", { precision: 18, scale: 2 }).notNull(),
  cnasDeduction: numeric("cnas_deduction", {
    precision: 18,
    scale: 2,
  }).notNull(),
  taxableBase: numeric("taxable_base", { precision: 18, scale: 2 }).notNull(),
  irgDeduction: numeric("irg_deduction", {
    precision: 18,
    scale: 2,
  }).notNull(),
  netToPay: numeric("net_to_pay", { precision: 18, scale: 2 }).notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PayrollRow = typeof payrollsTable.$inferSelect;
