import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { useTranslation } from "react-i18next";

export interface PaymentValues {
  date: string;
  payer: string;
  amount: number;
  type: "CASH" | "BANK";
  reference: string | null;
  label: string | null;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Cap for this payment, and the amount shown in the hint line. */
  remaining: number;
  initialAmount: number;
  initialPayer?: string;
  initialType?: "CASH" | "BANK";
  initialLabel?: string;
  /** The journal requires a libellé for partial payments; the debtor page does not. */
  labelRequired?: boolean;
  submitting?: boolean;
  onSubmit: (values: PaymentValues) => void;
}

/**
 * The one payment form behind both the journal's factures and the debts page.
 * Keeping it here rather than duplicating the fields means a change to how a
 * settlement is captured lands in both places.
 */
export function PaymentDialog({
  open,
  onOpenChange,
  title,
  description,
  remaining,
  initialAmount,
  initialPayer = "",
  initialType = "BANK",
  initialLabel = "",
  labelRequired = false,
  submitting = false,
  onSubmit,
}: PaymentDialogProps) {
  const { t } = useTranslation();
  const [payer, setPayer] = useState(initialPayer);
  const [amount, setAmount] = useState(String(initialAmount));
  const [type, setType] = useState<"CASH" | "BANK">(initialType);
  const [reference, setReference] = useState("");
  const [label, setLabel] = useState(initialLabel);

  // Reset on every open rather than on mount: the dialog stays mounted between
  // payments, and yesterday's payer/amount must not leak into the next one.
  useEffect(() => {
    if (!open) return;
    setPayer(initialPayer);
    setAmount(String(initialAmount));
    setType(initialType);
    setReference("");
    setLabel(initialLabel);
    // initial* are deliberately not dependencies: they are read at the moment
    // the dialog opens, not on every background refetch of the row behind it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!payer.trim() || !numericAmount || numericAmount > remaining + 0.005) {
      return;
    }
    onSubmit({
      date: new Date().toISOString().slice(0, 10),
      payer: payer.trim(),
      amount: numericAmount,
      type,
      reference: reference.trim() || null,
      label: label.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm">
            {t("journal.payment.remaining", { amount: formatMoney(remaining) })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("journal.payment.payer")}</Label>
              <Input required value={payer} onChange={(e) => setPayer(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("journal.payment.amount")}</Label>
              <Input
                required
                type="number"
                min="0.01"
                max={remaining}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("journal.payment.type")}</Label>
              <Select
                value={type}
                onValueChange={(value: "CASH" | "BANK") => setType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t("journal.form.methodCash")}</SelectItem>
                  <SelectItem value="BANK">{t("journal.form.methodBank")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("journal.payment.reference")}</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("journal.payment.label")}</Label>
            <Input
              required={labelRequired}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button className="w-full" type="submit" disabled={submitting}>
            {t("journal.payment.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
