import { Router, type IRouter } from "express";
import { eq, desc, inArray, gte } from "drizzle-orm";
import {
  db,
  transactionsTable,
  fundingTable,
  fixedAssetsTable,
  employeesTable,
  payrollsTable,
  inventoryItemsTable,
  inventoryMovementsTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetMonthlyPnlResponse,
  GetRecentActivityResponse,
  GetTvaSummaryResponse,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { computeStockState } from "../lib/stock";

const router: IRouter = Router();

function emptySummary() {
  return {
    totalRevenueHt: 0,
    totalPurchasesHt: 0,
    totalExpensesHt: 0,
    tvaCollectee: 0,
    tvaDeductible: 0,
    tvaNet: 0,
    grossProfit: 0,
    netProfit: 0,
    totalAssetsValue: 0,
    totalEmployees: 0,
    totalPayrollMonth: 0,
    cashPosition: 0,
    totalStockValue: 0,
    totalStockItems: 0,
    recentMovementsCount: 0,
  };
}

function currentMonthYear(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json(GetDashboardSummaryResponse.parse(emptySummary()));
    return;
  }

  const [transactions, funding, assets, employees] = await Promise.all([
    db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.companyId, companyId)),
    db
      .select()
      .from(fundingTable)
      .where(eq(fundingTable.companyId, companyId)),
    db
      .select()
      .from(fixedAssetsTable)
      .where(eq(fixedAssetsTable.companyId, companyId)),
    db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.companyId, companyId)),
  ]);

  const summary = emptySummary();

  // Cost of the goods actually sold, and the purchases that did *not* feed
  // stock. Both feed the gross-profit line below.
  let costOfGoodsSold = 0;
  let unlinkedPurchasesHt = 0;

  for (const t of transactions) {
    const ht = Number(t.amountHt);
    const tva = Number(t.tvaAmount);
    const ttc = Number(t.amountTtc);
    if (t.type === "SALE") {
      summary.totalRevenueHt += ht;
      summary.tvaCollectee += tva;
      costOfGoodsSold += t.costOfGoodsSold != null ? Number(t.costOfGoodsSold) : 0;
      if (t.status === "PAID") summary.cashPosition += ttc;
    } else if (t.type === "PURCHASE") {
      summary.totalPurchasesHt += ht;
      // A purchase naming an article bought an asset (Class 3), not a charge:
      // its cost reaches the P&L later, as the goods are sold, via
      // costOfGoodsSold. Charging it here as well would charge the same 47 000
      // twice.
      if (!t.itemId) unlinkedPurchasesHt += ht;
      summary.tvaDeductible += tva;
      if (t.status === "PAID") summary.cashPosition -= ttc;
    } else if (t.type === "EXPENSE") {
      summary.totalExpensesHt += ht;
      summary.tvaDeductible += tva;
      if (t.status === "PAID") summary.cashPosition -= ttc;
    }
  }

  for (const f of funding) {
    summary.cashPosition += Number(f.amount);
  }

  // Asset book values + amortization expense
  const now = new Date();
  let amortizationExpense = 0;
  for (const a of assets) {
    const cost = Number(a.costHt);
    const residual = Number(a.residualValue);
    const totalMonths = a.lifeYears * 12;
    const depreciable = Math.max(0, cost - residual);
    const monthly = totalMonths > 0 ? depreciable / totalMonths : 0;
    const purchase = new Date(a.purchaseDate + "T00:00:00Z");
    const monthsElapsed = Math.max(
      0,
      Math.min(
        totalMonths,
        (now.getUTCFullYear() - purchase.getUTCFullYear()) * 12 +
          (now.getUTCMonth() - purchase.getUTCMonth()),
      ),
    );
    const accumulated = monthsElapsed * monthly;
    summary.totalAssetsValue += Math.max(residual, cost - accumulated);
    amortizationExpense += accumulated;
  }

  summary.tvaNet = summary.tvaCollectee - summary.tvaDeductible;
  summary.totalEmployees = employees.length;

  // Current month payroll
  const monthYear = currentMonthYear();
  if (employees.length > 0) {
    const empIds = employees.map((e) => e.id);
    const monthPayrolls = await db
      .select()
      .from(payrollsTable)
      .where(inArray(payrollsTable.employeeId, empIds));
    let monthTotal = 0;
    let allPayrollNet = 0;
    for (const p of monthPayrolls) {
      const n = Number(p.netToPay);
      allPayrollNet += n;
      if (p.monthYear === monthYear) monthTotal += n;
    }
    summary.totalPayrollMonth = monthTotal;
    summary.cashPosition -= allPayrollNet;
  }

  // Revenue less the cost of what was sold, plus any purchase that never touched
  // stock. With no stock link at all this collapses to the old
  // `revenue − purchases`, so a company that does not use the Stocks page sees
  // exactly the figure it saw before.
  summary.grossProfit =
    summary.totalRevenueHt - costOfGoodsSold - unlinkedPurchasesHt;
  summary.netProfit =
    summary.grossProfit -
    summary.totalExpensesHt -
    amortizationExpense -
    summary.totalPayrollMonth;

  // Stock totals
  const stockItems = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.companyId, companyId));

  summary.totalStockItems = stockItems.length;

  if (stockItems.length > 0) {
    const itemIds = stockItems.map((i) => i.id);
    const movements = await db
      .select()
      .from(inventoryMovementsTable)
      .where(inArray(inventoryMovementsTable.itemId, itemIds));

    // Valued through the shared moving-average helper so this total agrees with
    // the Stocks page and the P&L to the cent.
    const movementsByItem = new Map<string, typeof movements>();
    for (const m of movements) {
      const rows = movementsByItem.get(m.itemId) ?? [];
      rows.push(m);
      movementsByItem.set(m.itemId, rows);
    }
    for (const rows of movementsByItem.values()) {
      summary.totalStockValue += computeStockState(
        rows.map((m) => ({
          date: m.date,
          direction: m.direction,
          quantity: Number(m.quantity),
          unitCostHt: Number(m.unitCostHt),
        })),
      ).value;
    }

    // Recent movements: last 30 days
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    summary.recentMovementsCount = movements.filter(
      (m) => m.date >= cutoffStr,
    ).length;
  }

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/monthly-pnl", async (req, res): Promise<void> => {
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }
  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.companyId, companyId));

  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    months.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }

  const map = new Map<string, { revenue: number; expenses: number }>();
  for (const m of months) map.set(m, { revenue: 0, expenses: 0 });

  for (const t of transactions) {
    const my = t.date.slice(0, 7);
    const bucket = map.get(my);
    if (!bucket) continue;
    const ht = Number(t.amountHt);
    if (t.type === "SALE") bucket.revenue += ht;
    else bucket.expenses += ht;
  }

  const result = months.map((m) => {
    const b = map.get(m)!;
    return {
      monthYear: m,
      revenue: b.revenue,
      expenses: b.expenses,
      profit: b.revenue - b.expenses,
    };
  });
  res.json(GetMonthlyPnlResponse.parse(result));
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.companyId, companyId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(10);
  res.json(
    GetRecentActivityResponse.parse(
      rows.map((t) => ({
        id: t.id,
        date: t.date,
        type: t.type,
        label: t.label,
        amountHt: Number(t.amountHt),
        tvaRate: Number(t.tvaRate),
        tvaAmount: Number(t.tvaAmount),
        amountTtc: Number(t.amountTtc),
        paymentMethod: t.paymentMethod,
        status: t.status,
        thirdParty: t.thirdParty,
        category: t.category,
      })),
    ),
  );
});

router.get("/dashboard/tva", async (req, res): Promise<void> => {
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json(
      GetTvaSummaryResponse.parse({
        period: currentMonthYear(),
        tvaCollectee: 0,
        tvaDeductible: 0,
        net: 0,
      }),
    );
    return;
  }
  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.companyId, companyId));
  let tvaCollectee = 0;
  let tvaDeductible = 0;
  for (const t of transactions) {
    const tva = Number(t.tvaAmount);
    if (t.type === "SALE") tvaCollectee += tva;
    else tvaDeductible += tva;
  }
  res.json(
    GetTvaSummaryResponse.parse({
      period: currentMonthYear(),
      tvaCollectee,
      tvaDeductible,
      net: tvaCollectee - tvaDeductible,
    }),
  );
});

export default router;
