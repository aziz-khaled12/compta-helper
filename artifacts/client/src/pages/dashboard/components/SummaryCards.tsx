import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Receipt, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/format";
import { Link } from "wouter";
import { useDashboardState } from "../hooks/useDashboardState";

export function SummaryCards({ state }: { state: ReturnType<typeof useDashboardState> }) {
  const { t } = useTranslation();
  const { summary } = state;
  const cards = [
    { title: t("dashboard.summary.assets"), icon: Activity, value: formatMoney(summary?.totalAssetsValue), link: "/resources", label: t("dashboard.summary.assetsCta") },
    { title: t("dashboard.summary.employees"), icon: Users, value: t("dashboard.summary.employeesCount", { count: summary?.totalEmployees || 0 }), link: "/employees", label: t("dashboard.summary.employeesCta") },
    { title: t("dashboard.summary.payroll"), icon: Receipt, value: formatMoney(summary?.totalPayrollMonth), link: "/payroll", label: t("dashboard.summary.payrollCta") },
    { title: t("dashboard.summary.stock"), icon: Package, value: formatMoney(summary?.totalStockValue), link: "/inventory", label: t("dashboard.summary.stockCta") },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <Card key={i}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><c.icon className="h-4 w-4" />{c.title}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{c.value}</div><Link href={c.link} className="text-xs text-primary hover:underline mt-2 inline-block">{c.label}</Link></CardContent>
        </Card>
      ))}
    </div>
  );
}
