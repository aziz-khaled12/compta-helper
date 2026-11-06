import { PaymentDialog } from "@/components/payment-dialog";
import { apiErrorMessage } from "@/lib/api-error";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { useJournalState } from "../hooks/useJournalState";

export function PaymentModal({ state }: { state: ReturnType<typeof useJournalState> }) {
  const { t } = useTranslation();
  const { paymentMode, selectedTransaction, createPayment, closePayment, invalidatePayment } = state;

  return (
    <PaymentDialog
      open={paymentMode !== null && selectedTransaction !== null}
      onOpenChange={(open) => !open && closePayment()}
      title={
        paymentMode === "FULL"
          ? t("journal.payment.fullTitle")
          : t("journal.payment.partialTitle")
      }
      description={selectedTransaction?.label}
      remaining={selectedTransaction?.rest ?? 0}
      initialAmount={
        selectedTransaction
          ? paymentMode === "FULL"
            ? selectedTransaction.rest
            : Math.min(selectedTransaction.rest, selectedTransaction.amountTtc)
          : 0
      }
      initialPayer={selectedTransaction?.thirdParty ?? ""}
      initialType={selectedTransaction?.paymentMethod === "CASH" ? "CASH" : "BANK"}
      labelRequired={paymentMode === "PARTIAL"}
      submitting={createPayment.isPending}
      onSubmit={(values) => {
        if (!selectedTransaction) return;
        createPayment.mutate(
          {
            id: selectedTransaction.id,
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
              toast.success(t("journal.payment.saved"));
              invalidatePayment(selectedTransaction.id);
              closePayment();
            },
            onError: (error) =>
              toast.error(apiErrorMessage(error) ?? t("journal.payment.error")),
          },
        );
      }}
    />
  );
}
