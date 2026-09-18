import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatDate } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { usePayrollState } from "../hooks/usePayrollState";

export function PayslipDialog({ state }: { state: ReturnType<typeof usePayrollState> }) {
  const { t } = useTranslation();
  const { selectedPayslip, setSelectedPayslip, company } = state;
  return (
    <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
      <DialogContent className="max-w-3xl border-none shadow-2xl p-0 overflow-hidden bg-background">
        {selectedPayslip && (
          <div className="font-mono text-sm">
            <div className="bg-primary text-primary-foreground p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold tracking-tight mb-1">{company?.name || t("payroll.payslip.companyFallback")}</h2>
                <p className="opacity-80">{t("payroll.payslip.heading")}</p>
              </div>
              <div className="text-right opacity-90">
                <p>{t("payroll.payslip.month", { month: selectedPayslip.monthYear })}</p>
                <p>{t("payroll.payslip.editedOn", { date: formatDate(selectedPayslip.generatedAt) })}</p>
              </div>
            </div>
            <div className="p-6 border-b grid grid-cols-2 gap-4 bg-muted/20">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("payroll.payslip.employee")}</p>
                <p className="font-bold text-base">{selectedPayslip.employeeName}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("payroll.payslip.matricule")}</p>
                <p className="font-bold">#{selectedPayslip.employeeId.substring(0, 6).toUpperCase()}</p>
              </div>
            </div>
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold uppercase tracking-wider text-xs">{t("payroll.payslip.designation")}</TableHead>
                    <TableHead className="text-right font-bold uppercase tracking-wider text-xs">{t("payroll.payslip.gains")}</TableHead>
                    <TableHead className="text-right font-bold uppercase tracking-wider text-xs">{t("payroll.payslip.deductions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-none hover:bg-transparent"><TableCell>{t("payroll.payslip.baseSalary")}</TableCell><TableCell className="text-right">{formatMoney(selectedPayslip.baseSalary)}</TableCell><TableCell /></TableRow>
                  {selectedPayslip.experienceBonus > 0 && <TableRow className="border-none hover:bg-transparent"><TableCell>{t("payroll.payslip.experienceBonus")}</TableCell><TableCell className="text-right">{formatMoney(selectedPayslip.experienceBonus)}</TableCell><TableCell /></TableRow>}
                  <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30"><TableCell>{t("payroll.payslip.gross")}</TableCell><TableCell className="text-right">{formatMoney(selectedPayslip.grossSalary)}</TableCell><TableCell /></TableRow>
                  <TableRow className="border-none hover:bg-transparent"><TableCell>{t("payroll.payslip.cnas")}</TableCell><TableCell /><TableCell className="text-right text-destructive">{formatMoney(selectedPayslip.cnasDeduction)}</TableCell></TableRow>
                  <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30"><TableCell>{t("payroll.payslip.taxableBase")}</TableCell><TableCell className="text-right">{formatMoney(selectedPayslip.taxableBase)}</TableCell><TableCell /></TableRow>
                  <TableRow className="border-none hover:bg-transparent"><TableCell>{t("payroll.payslip.irg")}</TableCell><TableCell /><TableCell className="text-right text-destructive">{formatMoney(selectedPayslip.irgDeduction)}</TableCell></TableRow>
                </TableBody>
              </Table>
              <div className="mt-8 flex justify-end">
                <div className="w-72 bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-primary font-bold text-sm uppercase tracking-wider mb-2">{t("payroll.payslip.net")}</p>
                  <p className="text-3xl font-bold text-primary">{formatMoney(selectedPayslip.netToPay)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
