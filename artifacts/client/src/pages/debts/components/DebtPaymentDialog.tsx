import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/date-input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { useTranslation } from "react-i18next";
import {
  debtPaymentSchema,
  type DebtPaymentValues,
  type DebtsState,
} from "../hooks/useDebtsState";

function emptyPayment(amount: number): DebtPaymentValues {
  return {
    date: new Date().toISOString().slice(0, 10),
    amount,
    note: "",
  };
}

export function DebtPaymentDialog({ state }: { state: DebtsState }) {
  const { t } = useTranslation();
  const debt = state.paymentDebt;
  const form = useForm<DebtPaymentValues>({
    resolver: zodResolver(debtPaymentSchema),
    defaultValues: emptyPayment(0),
  });

  useEffect(() => {
    if (debt) form.reset(emptyPayment(debt.rest));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debt?.id]);

  return (
    <Dialog
      open={debt !== null}
      onOpenChange={(open) => !open && state.closeDebtPayment()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("debts.payment.title")}</DialogTitle>
          <DialogDescription>{debt?.personName}</DialogDescription>
        </DialogHeader>
        {debt && (
          <form
            onSubmit={form.handleSubmit(state.payDebt)}
            className="space-y-4"
          >
            <div className="rounded-md bg-muted p-3 text-sm">
              {t("debts.payment.remaining", {
                amount: formatMoney(debt.rest),
              })}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="debt-payment-date">
                  {t("debts.payment.date")}
                </Label>
                <Controller
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <DateInput id="debt-payment-date" {...field} />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-payment-amount">
                  {t("debts.payment.amount")}
                </Label>
                <Input
                  id="debt-payment-amount"
                  required
                  type="number"
                  min="0.01"
                  max={debt.rest}
                  step="0.01"
                  {...form.register("amount")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-payment-note">{t("debts.payment.note")}</Label>
              <Input id="debt-payment-note" {...form.register("note")} />
            </div>
            <Button
              className="w-full"
              type="submit"
              disabled={state.createDebtPayment.isPending}
            >
              {t("debts.payment.submit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
