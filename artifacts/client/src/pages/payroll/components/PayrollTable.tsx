import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { usePayrollState } from "../hooks/usePayrollState";

export function PayrollTable({ state }: { state: ReturnType<typeof usePayrollState> }) {
  const { t } = useTranslation();
  const { employees, payrolls, setSelectedPayslip, handleDelete, handleGenerate, isGenerating } = state;
  return (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow>
          <TableHead>{t("payroll.colEmployee")}</TableHead>
          <TableHead className="text-right">{t("payroll.colGross")}</TableHead>
          <TableHead className="text-right">{t("payroll.colDeductions")}</TableHead>
          <TableHead className="text-right font-bold text-primary">{t("payroll.colNet")}</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((emp) => {
          const payslip = payrolls.find((p) => p.employeeId === emp.id);
          return (
            <TableRow key={emp.id} className={payslip ? "cursor-pointer hover:bg-muted/50" : ""} onClick={() => payslip && setSelectedPayslip(payslip)}>
              <TableCell className="font-medium">
                {emp.fullName}
                {!payslip && <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">{t("payroll.notGenerated")}</span>}
              </TableCell>
              {payslip ? (
                <>
                  <TableCell className="text-right">{formatMoney(payslip.grossSalary)}</TableCell>
                  <TableCell className="text-right text-destructive text-sm">-{formatMoney(payslip.cnasDeduction + payslip.irgDeduction)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{formatMoney(payslip.netToPay)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={(e) => handleDelete(payslip.id, e)}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></Button>
                  </TableCell>
                </>
              ) : (
                <TableCell colSpan={4} className="text-right">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleGenerate(emp.id); }} disabled={isGenerating}>{t("payroll.generate")}</Button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
        {employees.length === 0 && (
          <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t("payroll.empty")}</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}
