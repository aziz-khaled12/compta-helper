import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { usePayrollState } from "../hooks/usePayrollState";

export function PayrollTable({ state }: { state: ReturnType<typeof usePayrollState> }) {
  const { employees, payrolls, setSelectedPayslip, handleDelete, handleGenerate, isGenerating } = state;
  return (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow>
          <TableHead>Employé</TableHead>
          <TableHead className="text-right">Salaire Brut</TableHead>
          <TableHead className="text-right">Retenues (CNAS+IRG)</TableHead>
          <TableHead className="text-right font-bold text-primary">Net à Payer</TableHead>
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
                {!payslip && <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Non généré</span>}
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
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleGenerate(emp.id); }} disabled={isGenerating}>Générer</Button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
        {employees.length === 0 && (
          <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Aucun employé enregistré.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}
