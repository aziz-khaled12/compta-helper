import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  integer,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const employeesTable = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }),
  familySituation: varchar("family_situation", { length: 40 }).notNull(),
  baseSalary: numeric("base_salary", { precision: 18, scale: 2 }).notNull(),
  experienceYears: integer("experience_years").notNull().default(0),
  hireDate: date("hire_date").notNull(),
});

export type EmployeeRow = typeof employeesTable.$inferSelect;
