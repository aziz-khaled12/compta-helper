import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const companiesTable = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id"),
  name: varchar("name", { length: 255 }).notNull(),
  nif: varchar("nif", { length: 50 }).notNull(),
  ai: varchar("ai", { length: 50 }).notNull(),
  address: text("address"),
  legalForm: varchar("legal_form", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Company = typeof companiesTable.$inferSelect;
