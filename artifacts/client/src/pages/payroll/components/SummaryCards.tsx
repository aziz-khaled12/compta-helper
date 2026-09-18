import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { useTranslation } from "react-i18next";

export function SummaryCards({ totalPayroll, totalCnas, totalIrg }: { totalPayroll: number, totalCnas: number, totalIrg: number }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-primary text-primary-foreground border-none">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-primary-foreground/80 mb-2">{t("payroll.totalNet")}</p>
          <h2 className="text-3xl font-bold">{formatMoney(totalPayroll)}</h2>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">{t("payroll.totalCnas")}</p>
          <h2 className="text-2xl font-bold text-foreground">{formatMoney(totalCnas)}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("payroll.cnasWorkerShare")}</p>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">{t("payroll.totalIrg")}</p>
          <h2 className="text-2xl font-bold text-foreground">{formatMoney(totalIrg)}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("payroll.irgFull")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
