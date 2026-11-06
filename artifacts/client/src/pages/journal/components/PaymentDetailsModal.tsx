import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/money";
import { useTranslation } from "react-i18next";
import { useListTransactionPayments } from "@workspace/api-client-react";
import type { useJournalState } from "../hooks/useJournalState";

export function PaymentDetailsModal({ state }: { state: ReturnType<typeof useJournalState> }) {
  const { t } = useTranslation();
  const { detailsTransaction, setDetailsTransaction } = state;
  const { data: payments = [], isLoading } = useListTransactionPayments(detailsTransaction?.id ?? "");
  return (
    <Dialog open={detailsTransaction !== null} onOpenChange={(open) => !open && setDetailsTransaction(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{t("journal.payment.detailsTitle")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{detailsTransaction?.label}</p>
        {isLoading ? <p>{t("journal.payment.loading")}</p> : payments.length === 0 ? <p className="py-6 text-center text-muted-foreground">{t("journal.payment.noPayments")}</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>{t("journal.payment.date")}</TableHead><TableHead>{t("journal.payment.payer")}</TableHead><TableHead>{t("journal.payment.type")}</TableHead><TableHead>{t("journal.payment.reference")}</TableHead><TableHead className="text-right">{t("journal.payment.amount")}</TableHead></TableRow></TableHeader>
            <TableBody>{payments.map((payment) => <TableRow key={payment.id}><TableCell>{formatDate(payment.date)}</TableCell><TableCell>{payment.payer}</TableCell><TableCell>{payment.type === "CASH" ? t("journal.form.methodCash") : t("journal.form.methodBank")}</TableCell><TableCell>{payment.reference || payment.label || "-"}</TableCell><TableCell className="text-right">{<Money value={payment.amount} />}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
