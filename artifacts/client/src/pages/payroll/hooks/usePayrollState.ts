import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";
import {
  useListPayrolls,
  getListPayrollsQueryKey,
  useGeneratePayroll,
  useDeletePayroll,
  useListEmployees,
  useGetCompany,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";

export function usePayrollState() {
  const queryClient = useQueryClient();
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  const { data: company } = useGetCompany();
  const { data: employees = [] } = useListEmployees();
  const { data: payrolls = [], isLoading } = useListPayrolls({
    monthYear: selectedMonth,
  });

  const generatePayroll = useGeneratePayroll();
  const deletePayroll = useDeletePayroll();

  const handleGenerate = (employeeId: string) => {
    generatePayroll.mutate(
      { data: { employeeId, monthYear: selectedMonth } },
      {
        onSuccess: () => {
          toast.success(i18n.t("payroll.toast.generated"));
          queryClient.invalidateQueries({ queryKey: getListPayrollsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: () => toast.error(i18n.t("payroll.toast.generateError")),
      },
    );
  };

  const handleGenerateAll = async () => {
    if (!employees.length) return;
    toast.info(i18n.t("payroll.toast.generating"));
    for (const emp of employees) {
      const exists = payrolls.find((p) => p.employeeId === emp.id);
      if (!exists) {
        await generatePayroll.mutateAsync({
          data: { employeeId: emp.id, monthYear: selectedMonth },
        });
      }
    }
    toast.success(i18n.t("payroll.toast.generatedAll"));
    queryClient.invalidateQueries({ queryKey: getListPayrollsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(i18n.t("payroll.confirmDelete"))) {
      deletePayroll.mutate({ id }, {
        onSuccess: () => {
          toast.success(i18n.t("payroll.toast.deleted"));
          queryClient.invalidateQueries({ queryKey: getListPayrollsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
      });
    }
  };

  const totalPayroll = payrolls.reduce((acc, p) => acc + p.netToPay, 0);
  const totalCnas = payrolls.reduce((acc, p) => acc + p.cnasDeduction, 0);
  const totalIrg = payrolls.reduce((acc, p) => acc + p.irgDeduction, 0);

  return {
    selectedMonth,
    setSelectedMonth,
    selectedPayslip,
    setSelectedPayslip,
    company,
    employees,
    payrolls,
    isLoading,
    totalPayroll,
    totalCnas,
    totalIrg,
    handleGenerate,
    handleGenerateAll,
    handleDelete,
    isGenerating: generatePayroll.isPending,
  };
}
