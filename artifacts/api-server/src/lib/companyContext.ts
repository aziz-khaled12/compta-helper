import { db, companiesTable } from "@workspace/db";

/**
 * Single-tenant helper: returns the active company id, or null if none yet.
 */
export async function getActiveCompanyId(): Promise<string | null> {
  const rows = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function requireActiveCompanyId(): Promise<string> {
  const id = await getActiveCompanyId();
  if (!id) {
    throw new Error("No company configured");
  }
  return id;
}
