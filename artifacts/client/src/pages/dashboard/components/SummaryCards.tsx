import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Receipt, Package, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/format";
import { Link } from "wouter";
import { useSubscription } from "@/lib/subscription";
import type { AnyServiceId } from "@/lib/plans";
import { useDashboardState } from "../hooks/useDashboardState";

export function SummaryCards({ state }: { state: ReturnType<typeof useDashboardState> }) {
  const { t } = useTranslation();
  const { canUse } = useSubscription();
  const { summary } = state;
  const cards: {
    title: string;
    icon: typeof Activity;
    value: string;
    link: string;
    label: string;
    service: AnyServiceId;
  }[] = [
    { title: t("dashboard.summary.assets"), icon: Activity, value: formatMoney(summary?.totalAssetsValue), link: "/resources", label: t("dashboard.summary.assetsCta"), service: "assets" },
    { title: t("dashboard.summary.employees"), icon: Users, value: t("dashboard.summary.employeesCount", { count: summary?.totalEmployees || 0 }), link: "/employees", label: t("dashboard.summary.employeesCta"), service: "employees" },
    { title: t("dashboard.summary.payroll"), icon: Receipt, value: formatMoney(summary?.totalPayrollMonth), link: "/payroll", label: t("dashboard.summary.payrollCta"), service: "payroll" },
    { title: t("dashboard.summary.stock"), icon: Package, value: formatMoney(summary?.totalStockValue), link: "/inventory", label: t("dashboard.summary.stockCta"), service: "inventory" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const locked = !canUse(c.service);
        return (
          <Card key={c.link}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <c.icon className="h-4 w-4" />
                {c.title}
                {locked && (
                  <>
                    <Lock
                      className="ms-auto h-3.5 w-3.5 opacity-70"
                      aria-hidden="true"
                    />
                    <span className="sr-only">{t("nav.locked")}</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={
                  locked
                    ? "text-2xl font-bold text-muted-foreground"
                    : "text-2xl font-bold"
                }>
                {locked ? "—" : c.value}
              </div>
              <Link
                href={locked ? `/subscription?add=${c.service}` : c.link}
                className="text-xs text-primary hover:underline mt-2 inline-block">
                {locked ? t("subscription.addService") : c.label}
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
