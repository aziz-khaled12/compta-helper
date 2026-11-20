import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/date-input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { Money } from "@/components/money";
import { useTranslation } from "react-i18next";
import { useJournalState } from "../hooks/useJournalState";
import { Loader2 } from "lucide-react";

export function TransactionForm({ state }: { state: ReturnType<typeof useJournalState> }) {
  const { t } = useTranslation();
  const { isOpen, setIsOpen, form, tvaAmount, amountTtc, onSubmit, createTransaction, items } = state;
  const [price, setPrice] = useState("");

  const watchType = form.watch("type");
  const watchStatus = form.watch("status");
  const watchPaymentMethod = form.watch("paymentMethod");
  const watchPaidAmount = form.watch("paidAmount");
  const watchItemId = form.watch("itemId");
  const watchQty = form.watch("quantity");

  const qty = watchQty ? String(watchQty) : "";
  const item = items.find((i) => i.id === watchItemId);

  // The article drives stock on both sides: a sale relieves it, a purchase
  // feeds it. A charge never moves stock, so the picker is hidden there.
  const movesStock = watchType === "SALE" || watchType === "PURCHASE";

  useEffect(() => {
    if (!isOpen) {
      setPrice("");
      form.setValue("quantity", 0);
    }
  }, [isOpen, form]);

  // Clear the article when the form switches to a type that cannot move stock,
  // so a stale id cannot be submitted against a charge.
  useEffect(() => {
    if (!movesStock) form.setValue("itemId", "");
  }, [movesStock, form]);

  // An open facture is always deferred. Payment channels belong to the
  // payment modal, so the journal row cannot accidentally become a cash/bank
  // row while it still has an outstanding balance.
  useEffect(() => {
    if (watchStatus !== "PAID") form.setValue("paymentMethod", "CREDIT");
  }, [watchStatus, form]);

  // "À terme" means nothing has been settled up front, so PAID is not offered
  // while the credit channel is selected. An entry that was already marked
  // paid falls back to unpaid when the channel switches to credit.
  useEffect(() => {
    if (watchPaymentMethod === "CREDIT" && watchStatus === "PAID") {
      form.setValue("status", "UNPAID", { shouldValidate: true });
    }
  }, [watchPaymentMethod, watchStatus, form]);

  // The advance belongs to a partial entry only; leaving that status clears it
  // so a stale amount cannot ride along with the next submission.
  useEffect(() => {
    if (watchStatus !== "PARTIAL") {
      form.setValue("paidAmount", 0);
      form.setValue("paidMethod", "BANK");
    }
  }, [watchStatus, form]);

  useEffect(() => {
    if (movesStock && qty && price) {
      const q = parseFloat(qty);
      const p = parseFloat(price);
      if (!isNaN(q) && !isNaN(p)) {
        form.setValue("amountHt", q * p, { shouldValidate: true });
      }
    }
  }, [qty, price, movesStock, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("journal.form.title")}</DialogTitle>
          <DialogDescription>
            {t("journal.form.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.warn("Transaction form validation errors:", errors);
            })}
            className="space-y-4 pt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("journal.form.type")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("company.selectPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SALE">{t("journal.form.typeSale")}</SelectItem>
                        <SelectItem value="PURCHASE">{t("journal.form.typePurchase")}</SelectItem>
                        <SelectItem value="EXPENSE">{t("journal.form.typeExpense")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("journal.form.date")}</FormLabel>
                    <FormControl>
                      <DateInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("journal.form.label")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("journal.form.labelPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thirdParty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("journal.form.thirdParty")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("journal.form.thirdPartyPlaceholder")} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {movesStock && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <FormField
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("journal.form.article")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("journal.form.articlePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {items.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {t("journal.form.articleStock", { name: i.name, balance: i.balance })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {item
                          ? watchType === "SALE"
                            ? t("journal.form.articleHintSale", {
                                cost: formatMoney(item.averageCost),
                                total: formatMoney(item.averageCost * (Number(watchQty) || 0)),
                              })
                            : t("journal.form.articleHintPurchase", {
                                cost: formatMoney(item.averageCost),
                              })
                          : t("journal.form.articleHintNone")}
                      </p>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("journal.form.quantity")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label>{t("journal.form.unitPriceHt")}</Label>
                    <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                  </div>
                </div>

                {item && watchType === "SALE" && Number(watchQty) > item.balance && (
                  <p className="text-xs text-destructive">
                    {t("journal.form.insufficientStock", { balance: item.balance, requested: Number(watchQty) })}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="amountHt"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("journal.form.amountHt")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tvaRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("journal.form.tvaRate")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("journal.form.paymentMethod")}</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Batch the fallback with the channel change so the
                        // status trigger never points at a removed PAID item.
                        if (value === "CREDIT" && form.getValues("status") === "PAID") {
                          form.setValue("status", "UNPAID", { shouldValidate: true });
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("company.selectPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BANK">{t("journal.form.methodBank")}</SelectItem>
                        <SelectItem value="CASH">{t("journal.form.methodCash")}</SelectItem>
                        <SelectItem value="CREDIT">{t("journal.form.methodCredit")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("journal.form.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("company.selectPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {watchPaymentMethod !== "CREDIT" && (
                          <SelectItem value="PAID">{t("consts.transaction.status.PAID")}</SelectItem>
                        )}
                        <SelectItem value="UNPAID">{t("consts.transaction.status.UNPAID")}</SelectItem>
                        <SelectItem value="PARTIAL">{t("consts.transaction.status.PARTIAL")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {watchStatus === "PARTIAL" && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("journal.form.paidAmount")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.01"
                            max={amountTtc}
                            step="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paidMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("journal.form.paidMethod")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? "BANK"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CASH">{t("journal.form.methodCash")}</SelectItem>
                            <SelectItem value="BANK">{t("journal.form.methodBank")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("journal.form.paidRemaining", {
                    amount: formatMoney(
                      Math.max(0, amountTtc - (Number(watchPaidAmount) || 0)),
                    ),
                  })}
                </p>
              </div>
            )}

            <div className="bg-muted p-4 rounded-md grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("journal.form.tvaAmount")}</p>
                <p className="text-lg font-semibold">{<Money value={tvaAmount} />}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">{t("journal.form.amountTtc")}</p>
                <p className="text-2xl font-bold text-primary">{<Money value={amountTtc} />}</p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("journal.form.submitting")}
                </>
              ) : (
                t("journal.form.submit")
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
