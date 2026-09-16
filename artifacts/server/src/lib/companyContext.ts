import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Resolves the active company for a user.
 *
 * Ownership is exact and exclusive: a company is visible only to the user whose
 * id is on the row. There is deliberately no fallback — not to the first row,
 * and not to an unowned (`user_id IS NULL`) one. Either fallback hands a
 * brand-new signup a company that is already configured, and because App.tsx
 * gates the onboarding wizard on whether a company exists, that both skips
 * their setup and shows them someone else's books.
 *
 * `userId` is a required parameter, so a bare `getActiveCompanyId()` is a type
 * error rather than a cross-tenant read. An undefined user resolves to null —
 * never to a row.
 */
export async function getActiveCompanyId(
  userId: string | undefined,
): Promise<string | null> {
  if (!userId) return null;

  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);
  return company?.id ?? null;
}

export async function requireActiveCompanyId(
  userId: string | undefined,
): Promise<string> {
  const id = await getActiveCompanyId(userId);
  if (!id) {
    throw new Error("No company configured");
  }
  return id;
}
