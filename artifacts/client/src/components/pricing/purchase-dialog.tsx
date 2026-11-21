import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardForm, type CardDetails } from "@/components/pricing/card-form";

/** Demo card dialog for an in-app purchase (add-on, renewal, upgrade). */
export function PurchaseDialog({
  open,
  onOpenChange,
  title,
  description,
  amount,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Amount charged for this purchase, in DA. */
  amount: number;
  onPaid: (card: CardDetails) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="leading-6">
              {description}
            </DialogDescription>
          ) : (
            // Radix warns when a dialog has no description at all.
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        <CardForm
          amount={amount}
          onPay={(card) => {
            onPaid(card);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
