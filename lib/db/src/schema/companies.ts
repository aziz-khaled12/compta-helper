import {
  index,
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

/**
 * `userId` is the only link between a user and any domain data — `funding`,
 * `fixed_assets`, `transactions`, `inventory_*`, `employees` and `payrolls` all
 * hang off `companies.id`. Everything downstream is scoped by who owns the
 * company, so this column is the whole tenancy model.
 *
 * It stays nullable on purpose. Rows predating user ownership have `NULL` there,
 * and they are intentionally left in place but unreachable: `getActiveCompanyId`
 * matches on an exact user id and never falls back, so an unowned row is served
 * to nobody. Making it `NOT NULL` would require deleting or reassigning those
 * rows first.
 */
export const companiesTable = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id").references(() => usersTable.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    nif: varchar("nif", { length: 50 }).notNull(),
    ai: varchar("ai", { length: 50 }).notNull(),
    address: text("address"),
    legalForm: varchar("legal_form", { length: 50 }),
    /**
     * The tax system the company is placed under — النظام الجزافي (forfaitaire,
     * IFU) or النظام الحقيقي (réel). It is what decides which fiscal return the
     * reports page offers: the G12 under the forfaitaire régime, the G50 under
     * the réel. Nullable because rows predating the field exist, and because it
     * is a declaration rather than a derivation — see `lib/taxRegime.ts`.
     */
    taxRegime: varchar("tax_regime", { length: 20 }),
    /**
     * The company's sector of activity, as a code from `@workspace/sectors`.
     *
     * This exists to give the legal crawler something to match decrees against.
     * It is a declared value rather than a derived one for the same reason
     * `taxRegime` is: the books of a young company say very little about what it
     * does, and inferring a sector from a handful of transactions produces a
     * confident wrong answer that silently mis-filters every legal alert.
     *
     * Nullable, and left null for companies that predate the field. A null
     * sector simply matches no sector-specific decree — it does not fall back to
     * a guess, because a wrong alert is worse than a missing one.
     */
    sectorCode: varchar("sector_code", { length: 50 }),
    /**
     * The sector's human-readable name, denormalised from the catalogue.
     *
     * Stored rather than looked up so that list and detail surfaces never need
     * the catalogue to render, and so a company keeps the label it was given
     * even if a later catalogue revision renames or drops the code.
     */
    sectorLabel: varchar("sector_label", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("IDX_company_user_id").on(table.userId)],
);

export type Company = typeof companiesTable.$inferSelect;
