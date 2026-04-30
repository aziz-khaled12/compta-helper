import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import {
  ListEmployeesResponse,
  CreateEmployeeBody,
  DeleteEmployeeParams,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { toIsoDate } from "../lib/dates";

const router: IRouter = Router();

function rowToView(row: typeof employeesTable.$inferSelect) {
  return {
    id: row.id,
    fullName: row.fullName,
    position: row.position,
    familySituation: row.familySituation,
    baseSalary: Number(row.baseSalary),
    experienceYears: row.experienceYears,
    hireDate: row.hireDate,
  };
}

router.get("/employees", async (_req, res): Promise<void> => {
  const companyId = await getActiveCompanyId();
  if (!companyId) {
    res.json([]);
    return;
  }
  const rows = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.companyId, companyId))
    .orderBy(asc(employeesTable.fullName));
  res.json(ListEmployeesResponse.parse(rows.map(rowToView)));
});

router.post("/employees", async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const companyId = await getActiveCompanyId();
  if (!companyId) {
    res
      .status(400)
      .json({ error: "Configurez d'abord le profil de l'entreprise" });
    return;
  }
  const [row] = await db
    .insert(employeesTable)
    .values({
      companyId,
      fullName: parsed.data.fullName,
      position: parsed.data.position ?? null,
      familySituation: parsed.data.familySituation,
      baseSalary: String(parsed.data.baseSalary),
      experienceYears: parsed.data.experienceYears ?? 0,
      hireDate: toIsoDate(parsed.data.hireDate),
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Insert failed" });
    return;
  }
  res.status(201).json(rowToView(row));
});

router.delete("/employees/:id", async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(employeesTable).where(eq(employeesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
