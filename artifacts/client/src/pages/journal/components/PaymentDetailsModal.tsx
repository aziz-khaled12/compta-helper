import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/money";
import { useTranslation } from "react-i18next";
import { useListTransactionPayments } from "@workspace/api-client-react";
import type { Company } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import type { useJournalState } from "../hooks/useJournalState";

export function PaymentDetailsModal({
  state,
  company,
}: {
  state: ReturnType<typeof useJournalState>;
  company?: Company;
}) {
  const { t } = useTranslation();
  const { detailsTransaction, setDetailsTransaction } = state;
  const { data: payments = [], isLoading } = useListTransactionPayments(detailsTransaction?.id ?? "");
  const item = detailsTransaction?.itemId ? state.itemById.get(detailsTransaction.itemId) : undefined;
  const transaction = detailsTransaction;

  return (
    <Dialog open={detailsTransaction !== null} onOpenChange={(open) => !open && setDetailsTransaction(null)}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{t("journal.invoice.detailsTitle")}</DialogTitle>
        </DialogHeader>
        {transaction && (
          <div className="space-y-6">
            <section className="border bg-background p-4 sm:p-8 shadow-sm" aria-label={t("journal.invoice.paperLabel")}>
              <header className="flex flex-col gap-5 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-bold uppercase tracking-wide">{company?.name || t("landing.brand")}</p>
                  {company?.address && <p className="text-sm text-muted-foreground">{company.address}</p>}
                  <p className="text-xs text-muted-foreground">{t("journal.invoice.nif")}: {company?.nif || "—"}</p>
                  <p className="text-xs text-muted-foreground">{t("journal.invoice.ai")}: {company?.ai || "—"}</p>
                </div>
                <div className="text-start sm:text-end">
                  <h2 className="text-2xl font-semibold">{t("journal.invoice.title")}</h2>
                  <p className="mt-2 text-sm"><span className="font-medium">{t("journal.invoice.number")}:</span> {transaction.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm"><span className="font-medium">{t("journal.invoice.date")}:</span> {formatDate(transaction.date, "dd/MM/yyyy")}</p>
                </div>
              </header>

              <div className="my-5 grid gap-4 border-b pb-5 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t("journal.invoice.customer")}</p>
                  <p className="font-medium">{transaction.thirdParty || t("journal.invoice.walkInCustomer")}</p>
                  <p className="text-muted-foreground">{transaction.type === "SALE" ? t("journal.invoice.client") : t("journal.invoice.supplier")}</p>
                </div>
                <div className="sm:text-end">
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t("journal.invoice.operation")}</p>
                  <p>{t(`consts.transaction.type.${transaction.type}`)}</p>
                  <p className="text-muted-foreground">{transaction.category || "—"}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("journal.invoice.designation")}</TableHead>
                    <TableHead>{t("journal.invoice.unit")}</TableHead>
                    <TableHead className="text-right">{t("journal.invoice.quantity")}</TableHead>
                    <TableHead className="text-right">{t("journal.invoice.unitPrice")}</TableHead>
                    <TableHead className="text-right">{t("journal.invoice.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{item?.name || transaction.label}</TableCell>
                    <TableCell>{item?.unit || "—"}</TableCell>
                    <TableCell className="text-right">{transaction.quantity ?? 1}</TableCell>
                    <TableCell className="text-right"><Money value={transaction.quantity ? transaction.amountHt / transaction.quantity : transaction.amountHt} /></TableCell>
                    <TableCell className="text-right"><Money value={transaction.amountHt} /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="mt-5 flex flex-col gap-5 border-t pt-5 sm:flex-row sm:justify-between">
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">{t("journal.invoice.paymentMethod")}:</span> {t(`consts.transaction.paymentMethod.${transaction.paymentMethod}`)}</p>
                  <p><span className="font-medium">{t("journal.invoice.status")}:</span> <Badge variant={transaction.status === "PAID" ? "default" : transaction.status === "UNPAID" ? "destructive" : "secondary"}>{t(`consts.transaction.status.${transaction.status}`)}</Badge></p>
                </div>
                <dl className="grid min-w-64 grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <dt>{t("journal.invoice.totalHt")}</dt><dd className="text-right"><Money value={transaction.amountHt} /></dd>
                  <dt>{t("journal.invoice.totalTva")} ({transaction.tvaRate}%)</dt><dd className="text-right"><Money value={transaction.tvaAmount} /></dd>
                  <dt className="border-t pt-2 font-bold">{t("journal.invoice.totalTtc")}</dt><dd className="border-t pt-2 text-right font-bold"><Money value={transaction.amountTtc} /></dd>
                </dl>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold">{t("journal.payment.detailsTitle")}</h3>
              {isLoading ? <p>{t("journal.payment.loading")}</p> : payments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{t("journal.payment.noPayments")}</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>{t("journal.payment.date")}</TableHead><TableHead>{t("journal.payment.payer")}</TableHead><TableHead>{t("journal.payment.type")}</TableHead><TableHead>{t("journal.payment.reference")}</TableHead><TableHead className="text-right">{t("journal.payment.amount")}</TableHead></TableRow></TableHeader>
                  <TableBody>{payments.map((payment) => <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell><div>{payment.payer}</div>{payment.synthetic && <div className="text-[10px] text-muted-foreground">{t("journal.payment.synthetic")}</div>}</TableCell>
                    <TableCell>{payment.type === "CASH" ? t("journal.form.methodCash") : t("journal.form.methodBank")}</TableCell>
                    <TableCell>{payment.reference || payment.label || "-"}</TableCell>
                    <TableCell className="text-right"><Money value={payment.amount} /></TableCell>
                  </TableRow>)}</TableBody>
                </Table>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
