import { useTranslation } from "react-i18next";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaymentDialog } from "@/components/payment-dialog";
import { formatMoney } from "@/lib/format";
import { useDebtsState } from "./hooks/useDebtsState";
import { DebtsTable } from "./components/DebtsTable";
import { UnpaidInvoices } from "./components/UnpaidInvoices";
import { DebtFormDialog } from "./components/DebtFormDialog";
import { DebtPaymentDialog } from "./components/DebtPaymentDialog";

export default function Debts() {
  const { t } = useTranslation();
  const state = useDebtsState();
  const { totals } = state;
  const invoice = state.invoiceTarget;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("debts.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("debts.subtitle")}</p>
        </div>
        <Button onClick={() => state.setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("debts.newDebt")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {t("debts.summary.toReceive")}
              </p>
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-emerald-600">
              {formatMoney(totals.toReceive)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("debts.summary.oldDebts")} : {formatMoney(totals.oldToReceive)}
              {" · "}
              {t("debts.summary.unpaidInvoices")} :{" "}
              {formatMoney(totals.invoiceToReceive)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {t("debts.summary.toPay")}
              </p>
              <ArrowUpRight className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-rose-600">
              {formatMoney(totals.toPay)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("debts.summary.oldDebts")} : {formatMoney(totals.oldToPay)}
              {" · "}
              {t("debts.summary.unpaidInvoices")} :{" "}
              {formatMoney(totals.invoiceToPay)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t("debts.oldTitle")}</CardTitle>
          <CardDescription>{t("debts.oldSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DebtsTable state={state} debts={state.oldDebts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t("debts.manualTitle")}</CardTitle>
          <CardDescription>{t("debts.manualSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DebtsTable state={state} debts={state.manualDebts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t("debts.invoicesTitle")}</CardTitle>
          <CardDescription>{t("debts.invoicesSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <UnpaidInvoices state={state} />
        </CardContent>
      </Card>

      <DebtFormDialog state={state} />
      <DebtPaymentDialog state={state} />
      <PaymentDialog
        open={invoice !== null}
        onOpenChange={(open) => !open && state.closeInvoicePayment()}
        title={
          invoice?.mode === "FULL"
            ? t("journal.payment.fullTitle")
            : t("journal.payment.partialTitle")
        }
        description={invoice?.transaction.label}
        remaining={invoice?.transaction.rest ?? 0}
        initialAmount={
          invoice
            ? invoice.mode === "FULL"
              ? invoice.transaction.rest
              : Math.min(invoice.transaction.rest, invoice.transaction.amountTtc)
            : 0
        }
        initialPayer={invoice?.transaction.thirdParty ?? ""}
        initialType={
          invoice?.transaction.paymentMethod === "CASH" ? "CASH" : "BANK"
        }
        labelRequired={invoice?.mode === "PARTIAL"}
        submitting={state.createInvoicePayment.isPending}
        onSubmit={state.payInvoice}
      />
    </div>
  );
}
