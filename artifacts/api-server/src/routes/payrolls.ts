import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, employeesTable, payrollsTable } from "@workspace/db";
import {
  ListPayrollsResponse,
  ListPayrollsQueryParams,
  GeneratePayrollBody,
  DeletePayrollParams,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { computePayroll, type FamilySituation } from "../lib/payroll";

const router: IRouter = Router();

router.get("/payrolls", async (req, res): Promise<void> => {
  const q = ListPayrollsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const companyId = await getActiveCompanyId();
  if (!companyId) {
    res.json([]);
    return;
  }
  const employees = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.companyId, companyId));
  if (employees.length === 0) {
    res.json([]);
    return;
  }
  const empIds = employees.map((e) => e.id);
  const conditions = [inArray(payrollsTable.employeeId, empIds)];
  if (q.data.monthYear) {
    conditions.push(eq(payrollsTable.monthYear, q.data.monthYear));
  }
  const rows = await db
    .select()
    .from(payrollsTable)
    .where(and(...conditions))
    .orderBy(desc(payrollsTable.monthYear), desc(payrollsTable.generatedAt));
  const nameById = new Map(employees.map((e) => [e.id, e.fullName]));
  res.json(
    ListPayrollsResponse.parse(
      rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: nameById.get(r.employeeId) ?? "",
        monthYear: r.monthYear,
        baseSalary: Number(r.baseSalary),
        experienceBonus: Number(r.experienceBonus),
        grossSalary: Number(r.grossSalary),
        cnasDeduction: Number(r.cnasDeduction),
        taxableBase: Number(r.taxableBase),
        irgDeduction: Number(r.irgDeduction),
        netToPay: Number(r.netToPay),
        generatedAt: r.generatedAt.toISOString(),
      })),
    ),
  );
});

router.post("/payrolls", async (req, res): Promise<void> => {
  const parsed = GeneratePayrollBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, parsed.data.employeeId));
  if (!employee) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }

  // Idempotency: replace existing for this employee/month
  await db
    .delete(payrollsTable)
    .where(
      and(
        eq(payrollsTable.employeeId, parsed.data.employeeId),
        eq(payrollsTable.monthYear, parsed.data.monthYear),
      ),
    );

  const calc = computePayroll({
    baseSalary: Number(employee.baseSalary),
    experienceYears: employee.experienceYears,
    familySituation: employee.familySituation as FamilySituation,
    bonus: parsed.data.bonus ?? 0,
  });
  const [row] = await db
    .insert(payrollsTable)
    .values({
      employeeId: employee.id,
      monthYear: parsed.data.monthYear,
      baseSalary: String(calc.baseSalary),
      experienceBonus: String(calc.experienceBonus),
      bonus: String(calc.bonus),
      grossSalary: String(calc.grossSalary),
      cnasDeduction: String(calc.cnasDeduction),
      taxableBase: String(calc.taxableBase),
      irgDeduction: String(calc.irgDeduction),
      netToPay: String(calc.netToPay),
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Insert failed" });
    return;
  }
  res.status(201).json({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: employee.fullName,
    monthYear: row.monthYear,
    baseSalary: Number(row.baseSalary),
    experienceBonus: Number(row.experienceBonus),
    grossSalary: Number(row.grossSalary),
    cnasDeduction: Number(row.cnasDeduction),
    taxableBase: Number(row.taxableBase),
    irgDeduction: Number(row.irgDeduction),
    netToPay: Number(row.netToPay),
    generatedAt: row.generatedAt.toISOString(),
  });
});

router.delete("/payrolls/:id", async (req, res): Promise<void> => {
  const params = DeletePayrollParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(payrollsTable).where(eq(payrollsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
