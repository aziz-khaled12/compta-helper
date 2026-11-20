import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput, isoMonthToDisplay } from "@/components/date-input";
import { useTranslation } from "react-i18next";
import { Calculator } from "lucide-react";
import { usePayrollState } from "./hooks/usePayrollState";
import { SummaryCards } from "./components/SummaryCards";
import { PayrollTable } from "./components/PayrollTable";
import { PayslipDialog } from "./components/PayslipDialog";

export default function Payroll() {
  const { t } = useTranslation();
  const state = usePayrollState();
  const { selectedMonth, setSelectedMonth, totalPayroll, totalCnas, totalIrg, handleGenerateAll, employees, isGenerating } = state;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("payroll.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("payroll.subtitle")}</p>
        </div>

        <div className="flex items-center gap-2 bg-card border rounded-md p-1 shadow-sm">
          <DateInput
            mode="month"
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="border-none shadow-none focus-visible:ring-0 h-8 w-36"
          />
        </div>
      </div>

      <SummaryCards totalPayroll={totalPayroll} totalCnas={totalCnas} totalIrg={totalIrg} />

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div>
            <CardTitle>{t("payroll.monthPayrolls", { month: isoMonthToDisplay(selectedMonth) })}</CardTitle>
            <CardDescription>{t("payroll.clickRow")}</CardDescription>
          </div>
          <Button onClick={handleGenerateAll} variant="secondary" size="sm" disabled={!employees.length || isGenerating}>
            <Calculator className="h-4 w-4 mr-2" /> {t("payroll.generateAll")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <PayrollTable state={state} />
        </CardContent>
      </Card>

      <PayslipDialog state={state} />
    </div>
  );
}
