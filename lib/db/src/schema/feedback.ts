import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { companiesTable } from "./companies";

/**
 * Product feedback submitted from the dashboard.
 *
 * The row is the record of truth: it is written *before* any delivery is
 * attempted, so a message the team never received by email is still here and
 * can be replayed. `deliveredAt` / `deliveryError` describe only the mail hop,
 * never whether the feedback was kept.
 *
 * `userId` and `companyId` are nullable and `SET NULL` on delete: the feedback
 * itself is worth keeping when the account or company it came from disappears,
 * and the identity fields copied into the email/row text still say who it was.
 */
export const feedbackTable = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    companyId: uuid("company_id").references(() => companiesTable.id, {
      onDelete: "set null",
    }),
    /** IDEA | BUG | OTHER — matches `FeedbackInput.category`. */
    category: varchar("category", { length: 16 }).notNull(),
    message: text("message").notNull(),
    /** Optional reply-to; the account email is used when this is null. */
    contactEmail: varchar("contact_email", { length: 320 }),
    /** UI language the feedback was written in (fr | ar). */
    locale: varchar("locale", { length: 5 }).notNull().default("fr"),
    /** Set once the mail provider accepted the notification. */
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    /** Why delivery did not happen; NULL means it did (or was never tried). */
    deliveryError: text("delivery_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("IDX_feedback_created_at").on(table.createdAt)],
);

export type FeedbackRow = typeof feedbackTable.$inferSelect;
