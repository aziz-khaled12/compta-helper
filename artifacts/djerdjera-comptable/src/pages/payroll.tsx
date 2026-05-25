import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  useListPayrolls,
  getListPayrollsQueryKey,
  useGeneratePayroll,
  useDeletePayroll,
  useListEmployees,
  useGetCompany,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { FileText, Calculator, Trash2, Calendar } from "lucide-react";

export default function Payroll() {
  const queryClient = useQueryClient();
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  const { data: company } = useGetCompany();
  const { data: employees } = useListEmployees();
  const { data: payrolls, isLoading } = useListPayrolls({
    monthYear: selectedMonth,
  });

  const generatePayroll = useGeneratePayroll();
  const deletePayroll = useDeletePayroll();

  const handleGenerate = (employeeId: string) => {
    generatePayroll.mutate(
      { data: { employeeId, monthYear: selectedMonth } },
      {
        onSuccess: () => {
          toast.success("Bulletin généré avec succès");
          queryClient.invalidateQueries({
            queryKey: getListPayrollsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetDashboardSummaryQueryKey(),
          });
        },
        onError: () => {
          toast.error("Erreur de génération");
        },
      },
    );
  };

  const handleGenerateAll = async () => {
    if (!employees?.length) return;

    // Simplistic batch approach for the demo
    toast.info("Génération en cours...");
    for (const emp of employees) {
      const exists = payrolls?.find((p) => p.employeeId === emp.id);
      if (!exists) {
        await generatePayroll.mutateAsync({
          data: { employeeId: emp.id, monthYear: selectedMonth },
        });
      }
    }
    toast.success("Bulletins générés");
    queryClient.invalidateQueries({ queryKey: getListPayrollsQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetDashboardSummaryQueryKey(),
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Supprimer ce bulletin de paie ?")) {
      deletePayroll.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Bulletin supprimé");
            queryClient.invalidateQueries({
              queryKey: getListPayrollsQueryKey(),
            });
            queryClient.invalidateQueries({
              queryKey: getGetDashboardSummaryQueryKey(),
            });
          },
        },
      );
    }
  };

  const totalPayroll = payrolls?.reduce((acc, p) => acc + p.netToPay, 0) || 0;
  const totalCnas = payrolls?.reduce((acc, p) => acc + p.cnasDeduction, 0) || 0;
  const totalIrg = payrolls?.reduce((acc, p) => acc + p.irgDeduction, 0) || 0;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paie</h1>
          <p className="text-muted-foreground mt-1">
            Génération des bulletins et calculs légaux (CNAS 9%, IRG)
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card border rounded-md p-1 shadow-sm">
          <div className="text-muted-foreground pl-3">
            <Calendar className="h-4 w-4" />
          </div>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 h-8"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-primary-foreground/80 mb-2">
              Total Net à Payer
            </p>
            <h2 className="text-3xl font-bold">{formatMoney(totalPayroll)}</h2>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Total CNAS Retenue
            </p>
            <h2 className="text-2xl font-bold text-foreground">
              {formatMoney(totalCnas)}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Part ouvrière (9%)
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Total IRG Retenu
            </p>
            <h2 className="text-2xl font-bold text-foreground">
              {formatMoney(totalIrg)}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Impôt sur le Revenu
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div>
            <CardTitle>Bulletins du mois ({selectedMonth})</CardTitle>
            <CardDescription>
              Cliquez sur une ligne pour voir le détail
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateAll}
            variant="secondary"
            size="sm"
            disabled={!employees?.length || generatePayroll.isPending}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Tout générer
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead className="text-right">Salaire Brut</TableHead>
                <TableHead className="text-right">
                  Retenues (CNAS+IRG)
                </TableHead>
                <TableHead className="text-right font-bold text-primary">
                  Net à Payer
                </TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((emp) => {
                const payslip = payrolls?.find((p) => p.employeeId === emp.id);

                return (
                  <TableRow
                    key={emp.id}
                    className={
                      payslip ? "cursor-pointer hover:bg-muted/50" : ""
                    }
                    onClick={() => payslip && setSelectedPayslip(payslip)}
                  >
                    <TableCell className="font-medium">
                      {emp.fullName}
                      {!payslip && (
                        <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                          Non généré
                        </span>
                      )}
                    </TableCell>

                    {payslip ? (
                      <>
                        <TableCell className="text-right">
                          {formatMoney(payslip.grossSalary)}
                        </TableCell>
                        <TableCell className="text-right text-destructive text-sm">
                          -
                          {formatMoney(
                            payslip.cnasDeduction + payslip.irgDeduction,
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatMoney(payslip.netToPay)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(payslip.id, e)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <TableCell colSpan={4} className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerate(emp.id);
                          }}
                          disabled={generatePayroll.isPending}
                        >
                          Générer
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {employees?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Aucun employé enregistré. Allez dans Personnel pour en
                    ajouter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Full Payslip Dialog */}
      <Dialog
        open={!!selectedPayslip}
        onOpenChange={() => setSelectedPayslip(null)}
      >
        <DialogContent className="max-w-3xl border-none shadow-2xl p-0 overflow-hidden bg-background">
          {selectedPayslip && (
            <div className="font-mono text-sm">
              {/* Payslip Header */}
              <div className="bg-primary text-primary-foreground p-6 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold tracking-tight mb-1">
                    {company?.name || "ENTREPRISE"}
                  </h2>
                  <p className="opacity-80">BULLETIN DE PAIE</p>
                </div>
                <div className="text-right opacity-90">
                  <p>Mois: {selectedPayslip.monthYear}</p>
                  <p>Édité le {formatDate(selectedPayslip.generatedAt)}</p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="p-6 border-b grid grid-cols-2 gap-4 bg-muted/20">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                    Employé
                  </p>
                  <p className="font-bold text-base">
                    {selectedPayslip.employeeName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                    Matricule
                  </p>
                  <p className="font-bold">
                    #{selectedPayslip.employeeId.substring(0, 6).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Earnings & Deductions */}
              <div className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold uppercase tracking-wider text-xs">
                        Désignation
                      </TableHead>
                      <TableHead className="text-right font-bold uppercase tracking-wider text-xs">
                        Gains
                      </TableHead>
                      <TableHead className="text-right font-bold uppercase tracking-wider text-xs">
                        Retenues
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-none hover:bg-transparent">
                      <TableCell>Salaire de Base</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(selectedPayslip.baseSalary)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    {selectedPayslip.experienceBonus > 0 && (
                      <TableRow className="border-none hover:bg-transparent">
                        <TableCell>Prime d'ancienneté</TableCell>
                        <TableCell className="text-right">
                          {formatMoney(selectedPayslip.experienceBonus)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30">
                      <TableCell>SALAIRE BRUT</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(selectedPayslip.grossSalary)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>

                    <TableRow className="border-none hover:bg-transparent">
                      <TableCell>Retenue CNAS (9%)</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatMoney(selectedPayslip.cnasDeduction)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30">
                      <TableCell>BASE IMPOSABLE (IRG)</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(selectedPayslip.taxableBase)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>

                    <TableRow className="border-none hover:bg-transparent">
                      <TableCell>Retenue IRG (Barème)</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatMoney(selectedPayslip.irgDeduction)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="mt-8 flex justify-end">
                  <div className="w-72 bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-primary font-bold text-sm uppercase tracking-wider mb-2">
                      Net à payer
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {formatMoney(selectedPayslip.netToPay)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
