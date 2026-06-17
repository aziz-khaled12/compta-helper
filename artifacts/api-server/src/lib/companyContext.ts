import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Returns the company id for a specific user, or the first company (legacy single-tenant fallback).
 */
export async function getActiveCompanyId(userId?: string): Promise<string | null> {
  if (userId) {
    const [userCompany] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.userId, userId))
      .limit(1);
    if (userCompany) return userCompany.id;
  }
  const [first] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .limit(1);
  return first?.id ?? null;
}

export async function requireActiveCompanyId(userId?: string): Promise<string> {
  const id = await getActiveCompanyId(userId);
  if (!id) {
    throw new Error("No company configured");
  }
  return id;
}
