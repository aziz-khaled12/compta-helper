import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import i18n from "@/i18n";
import { apiErrorMessage } from "@/lib/api-error";
import type { PaymentValues } from "@/components/payment-dialog";
import {
  useListDebts,
  useListTransactions,
  useCreateDebt,
  useDeleteDebt,
  useCreateDebtPayment,
  useCreateTransactionPayment,
  getListDebtsQueryKey,
  getListTransactionsQueryKey,
  getListTransactionPaymentsQueryKey,
  getListInventoryItemsQueryKey,
  getListInventoryMovementsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMonthlyPnlQueryKey,
  getGetRecentActivityQueryKey,
  getGetTvaSummaryQueryKey,
  type Debt,
  type Transaction,
} from "@workspace/api-client-react";

export const debtFormSchema = z.object({
  personName: z
    .string()
    .min(2, i18n.t("zod.required", { field: i18n.t("debts.colPerson") })),
  direction: z.enum(["I_OWE", "OWED_TO_ME"]),
  amount: z.coerce.number().positive(i18n.t("zod.positive")),
  date: z.string().min(10),
  note: z.string().optional(),
});

export type DebtFormValues = z.infer<typeof debtFormSchema>;

export const debtPaymentSchema = z.object({
  date: z.string().min(10),
  amount: z.coerce.number().positive(i18n.t("zod.positive")),
  note: z.string().optional(),
});

export type DebtPaymentValues = z.infer<typeof debtPaymentSchema>;

/** A facture selected on the page, with the payment flow the user chose. */
export interface InvoiceTarget {
  transaction: Transaction;
  mode: "FULL" | "PARTIAL";
}

export function useDebtsState() {
  const queryClient = useQueryClient();
  const { data: debts = [], isLoading } = useListDebts();  const { data: transactions = [] } = useListTransactions();

  const createDebt = useCreateDebt();
  const deleteDebt = useDeleteDebt();
  const createDebtPayment = useCreateDebtPayment();
  const createInvoicePayment = useCreateTransactionPayment();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<InvoiceTarget | null>(null);

  const invalidateDebts = () => {
    queryClient.invalidateQueries({ queryKey: getListDebtsQueryKey() });
  };

  /**
   * Settling a facture moves `paid`/`rest` on the entry itself and feeds the
   * dashboard, the P&L and the TVA summary — the same fan-out the journal does.
   */
  const invalidateBooks = () => {
    for (const queryKey of [
      getListTransactionsQueryKey(),
      getListInventoryItemsQueryKey(),
      getListInventoryMovementsQueryKey(),
      getGetDashboardSummaryQueryKey(),
      getGetMonthlyPnlQueryKey(),
      getGetRecentActivityQueryKey(),
      getGetTvaSummaryQueryKey(),
    ]) {
      queryClient.invalidateQueries({ queryKey });
    }
  };

  // Only factures carry a remainder the user can act on here; a fully paid
  // entry or one with no payments has nothing to collect.
  const unpaidInvoices = transactions.filter((tx) => tx.rest > 0);

  const sumRest = (rows: { rest: number }[]) =>
    rows.reduce((total, row) => total + row.rest, 0);

  const oldToReceive = sumRest(debts.filter((d) => d.direction === "OWED_TO_ME"));
  const oldToPay = sumRest(debts.filter((d) => d.direction === "I_OWE"));
  const invoiceToReceive = sumRest(
    unpaidInvoices.filter((tx) => tx.type === "SALE"),
  );
  const invoiceToPay = sumRest(
    unpaidInvoices.filter((tx) => tx.type !== "SALE"),
  );

  const addDebt = (values: DebtFormValues) => {
    createDebt.mutate(
      {
        data: {
          personName: values.personName,
          direction: values.direction,
          amount: values.amount,
          date: values.date,
          note: values.note?.trim() ? values.note : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(i18n.t("debts.toast.created"));
          setIsCreateOpen(false);
          invalidateDebts();
        },
        onError: (error) =>
          toast.error(
            apiErrorMessage(error) ?? i18n.t("debts.toast.createError"),
          ),
      },
    );
  };

  const removeDebt = (id: string) => {
    if (!confirm(i18n.t("debts.confirmDelete"))) return;
    deleteDebt.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success(i18n.t("debts.toast.deleted"));
          invalidateDebts();
        },
      },
    );
  };

  const openDebtPayment = (debt: Debt) => setPaymentDebt(debt);
  const closeDebtPayment = () => setPaymentDebt(null);

  const payDebt = (values: DebtPaymentValues) => {
    if (!paymentDebt) return;
    createDebtPayment.mutate(
      {
        id: paymentDebt.id,
        data: {
          date: values.date,
          amount: values.amount,
          note: values.note?.trim() ? values.note : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(i18n.t("debts.payment.saved"));
          closeDebtPayment();
          invalidateDebts();
        },
        onError: (error) =>
          toast.error(apiErrorMessage(error) ?? i18n.t("debts.payment.error")),
      },
    );
  };

  const openInvoicePayment = (transaction: Transaction, mode: "FULL" | "PARTIAL") =>
    setInvoiceTarget({ transaction, mode });
  const closeInvoicePayment = () => setInvoiceTarget(null);

  const payInvoice = (values: PaymentValues) => {
    if (!invoiceTarget) return;
    const id = invoiceTarget.transaction.id;
    createInvoicePayment.mutate(
      {
        id,
        data: {
          date: values.date,
          payer: values.payer,
          amount: values.amount,
          type: values.type,
          reference: values.reference,
          label: values.label,
        },
      },
      {
        onSuccess: () => {
          toast.success(i18n.t("journal.payment.saved"));
          closeInvoicePayment();
          invalidateBooks();
          queryClient.invalidateQueries({
            queryKey: getListTransactionPaymentsQueryKey(id),
          });
        },
        onError: (error) =>
          toast.error(apiErrorMessage(error) ?? i18n.t("journal.payment.error")),
      },
    );
  };

  return {
    debts,
    oldDebts: debts.filter((debt) => debt.origin === "ONBOARDING"),
    manualDebts: debts.filter((debt) => debt.origin !== "ONBOARDING"),
    unpaidInvoices,
    isLoading,
    isCreateOpen,
    setIsCreateOpen,
    paymentDebt,
    openDebtPayment,
    closeDebtPayment,
    invoiceTarget,
    openInvoicePayment,
    closeInvoicePayment,
    totals: {
      toReceive: oldToReceive + invoiceToReceive,
      toPay: oldToPay + invoiceToPay,
      oldToReceive,
      oldToPay,
      invoiceToReceive,
      invoiceToPay,
    },
    addDebt,
    removeDebt,
    payDebt,
    payInvoice,
    createDebt,
    deleteDebt,
    createDebtPayment,
    createInvoicePayment,
  };
}

export type DebtsState = ReturnType<typeof useDebtsState>;
