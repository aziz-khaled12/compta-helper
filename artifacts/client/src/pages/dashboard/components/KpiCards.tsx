import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/format";
import { useDashboardState } from "../hooks/useDashboardState";

export function KpiCards({ state }: { state: ReturnType<typeof useDashboardState> }) {
  const { t } = useTranslation();
  const { summary } = state;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.kpi.revenue")}</CardTitle><TrendingUp className="h-4 w-4 text-emerald-600" /></CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatMoney(summary?.totalRevenueHt)}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.kpi.expenses")}</CardTitle><TrendingDown className="h-4 w-4 text-destructive" /></CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatMoney((summary?.totalExpensesHt || 0) + (summary?.totalPurchasesHt || 0))}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.kpi.treasury")}</CardTitle><Wallet className="h-4 w-4 text-blue-600" /></CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatMoney(summary?.cashPosition)}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.kpi.tvaBalance")}</CardTitle><Receipt className="h-4 w-4 text-orange-600" /></CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary?.tvaNet && summary.tvaNet > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{formatMoney(summary?.tvaNet)}</div>
          <p className="text-xs text-muted-foreground mt-1">{summary?.tvaNet && summary.tvaNet > 0 ? t("dashboard.kpi.tvaDue") : t("dashboard.kpi.tvaCredit")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
