import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Loader2, Lock } from "lucide-react";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

/** Stand-in for the payment provider round trip, in milliseconds. */
const DEMO_CHARGE_DELAY_MS = 1_500;

/** What a successful (simulated) charge hands back to the caller. */
export type CardDetails = {
  /** Name printed on the card, trimmed. */
  name: string;
  /** Last four digits, for the receipt. */
  last4: string;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

function formatCardNumber(value: string): string {
  return onlyDigits(value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** A card is valid through the end of its expiry month. */
function isExpired(value: string, now: Date = new Date()): boolean {
  const [month, year] = value.split("/").map(Number);
  if (!month || !year) return true;
  return new Date(2000 + year, month, 1).getTime() <= now.getTime();
}

const cardSchema = (t: TFunction) =>
  z.object({
    cardName: z.string().trim().min(3, t("checkout.errCardName")),
    cardNumber: z
      .string()
      .refine(
        (value) => /^\d{16}$/.test(onlyDigits(value)),
        t("checkout.errCardNumber"),
      ),
    expiry: z
      .string()
      .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, t("checkout.errExpiry"))
      .refine((value) => !isExpired(value), t("checkout.errExpiryPast")),
    cvv: z.string().regex(/^\d{3,4}$/, t("checkout.errCvv")),
  });

type CardValues = z.infer<ReturnType<typeof cardSchema>>;

/**
 * The demo card form shared by the public checkout, the add-on dialog and the
 * renewal screen. It formats and validates a card, waits, then hands the last
 * four digits to `onPay` — nothing is charged and no request leaves the browser.
 */
export function CardForm({
  amount,
  onPay,
}: {
  /** Amount shown on the pay button, in DA. */
  amount: number;
  onPay: (card: CardDetails) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<CardValues>({
    resolver: zodResolver(cardSchema(t)),
    defaultValues: { cardName: "", cardNumber: "", expiry: "", cvv: "" },
  });

  const onPaySubmit = async (values: CardValues) => {
    setIsProcessing(true);
    try {
      // Stand-in for the payment provider round trip.
      await new Promise((resolve) =>
        window.setTimeout(resolve, DEMO_CHARGE_DELAY_MS),
      );
      await onPay({
        name: values.cardName.trim(),
        last4: onlyDigits(values.cardNumber).slice(-4),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onPaySubmit)}
        className="space-y-4"
        aria-busy={isProcessing}
        noValidate>
        <FormField
          control={form.control}
          name="cardName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("checkout.cardName")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="cc-name"
                  placeholder={t("checkout.cardNamePlaceholder")}
                  disabled={isProcessing}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cardNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("checkout.cardNumber")}</FormLabel>
              <FormControl>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  className="rtl:text-right"
                  disabled={isProcessing}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(event) =>
                    field.onChange(formatCardNumber(event.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="expiry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("checkout.expiry")}</FormLabel>
                <FormControl>
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/AA"
                    className="rtl:text-right"
                    disabled={isProcessing}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(formatExpiry(event.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cvv"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("checkout.cvv")}</FormLabel>
                <FormControl>
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    maxLength={4}
                    className="rtl:text-right"
                    disabled={isProcessing}
                    {...field}
                    onChange={(event) =>
                      field.onChange(
                        onlyDigits(event.target.value).slice(0, 4),
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={isProcessing}
          className="h-11 w-full bg-[#087fbb] text-sm text-white shadow-none hover:bg-[#066c9f]">
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("checkout.paying")}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              {t("checkout.pay")} <Price amount={amount} />
            </>
          )}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#8a9caf]">
          <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
          {t("checkout.secure")}
        </p>
      </form>
    </Form>
  );
}
