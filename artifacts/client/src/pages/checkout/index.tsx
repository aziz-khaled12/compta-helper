import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { Link, useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  bundlePrice,
  getBundle,
  isBillingCycle,
  type BillingCycle,
  type Bundle,
} from "@/lib/bundles";
import {
  billingExpiry,
  createPassReference,
  formatPassDate,
  isAccessPassActive,
  readAccessPass,
  saveAccessPass,
  type AccessPass,
} from "@/lib/access-pass";

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

const checkoutSchema = (t: TFunction) =>
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

type CheckoutValues = z.infer<ReturnType<typeof checkoutSchema>>;

function OrderSummary({
  bundle,
  billing,
  price,
}: {
  bundle: Bundle;
  billing: BillingCycle;
  price: number;
}) {
  const { t } = useTranslation();

  return (
    <aside
      aria-labelledby="checkout-order-title"
      className="rounded-2xl border border-[#dfeaf5] bg-white p-6 sm:p-7">
      <h2
        id="checkout-order-title"
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9caf]">
        {t("checkout.order")}
      </h2>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-[-0.02em] text-[#14284f]">
            {t(`bundle.${bundle.id}.name`)}
          </p>
          <p className="mt-0.5 text-sm text-[#687a91]">
            {t(`bundle.${bundle.id}.tagline`)}
          </p>
        </div>
        {bundle.highlighted && (
          <span className="mt-1 shrink-0 rounded-full bg-[#fdf3dd] px-2.5 py-0.5 text-[10px] font-bold text-[#a97812]">
            {t("pricing.featured")}
          </span>
        )}
      </div>

      <dl className="mt-5 border-t border-[#eef4f9] pt-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <dt className="text-[#687a91]">{t("checkout.billing")}</dt>
          <dd className="font-medium text-[#14284f]">
            {billing === "yearly"
              ? t("checkout.billingYearly")
              : t("checkout.billingMonthly")}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-[#eef4f9] pt-5">
        <span className="text-sm font-semibold text-[#14284f]">
          {t("checkout.total")}
        </span>
        <span className="text-xl font-bold tracking-[-0.02em] text-[#14284f]">
          <Price amount={price} />
        </span>
      </div>

      <Link
        href="/pricing"
        className="mt-4 inline-block text-xs font-medium text-[#087fbb] transition-colors hover:text-[#066c9f]">
        {t("checkout.changePlan")}
      </Link>

      <div className="mt-6 flex items-center gap-2 rounded-lg bg-[#f7fbff] px-3 py-2 text-[11px] font-medium text-[#53627a]">
        <CreditCard className="h-3.5 w-3.5 shrink-0 text-[#087fbb]" aria-hidden="true" />
        {t("checkout.accepted")}
      </div>
    </aside>
  );
}

function ReceiptRow({
  label,
  value,
  ltr,
}: {
  label: string;
  value: ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#687a91]">{label}</dt>
      <dd
        dir={ltr ? "ltr" : undefined}
        className={cn(
          "font-semibold text-[#14284f]",
          ltr && "tracking-wide",
        )}>
        {value}
      </dd>
    </div>
  );
}

function PaymentSuccess({
  pass,
  onRegister,
  onLogin,
}: {
  pass: AccessPass;
  onRegister: () => void;
  onLogin: () => void;
}) {
  const { t } = useTranslation();
  const bundle = getBundle(pass.bundleId);

  return (
    <div className="text-center" role="status" aria-live="polite">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f6ef] text-[#0f8a5f]">
        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-[-0.02em] text-[#14284f]">
        {t("checkout.successTitle")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#687a91]">
        {t("checkout.successDesc")}
      </p>

      <dl className="mt-6 space-y-2.5 rounded-xl border border-[#dfeaf5] bg-[#f7fbff] p-4 text-start text-sm">
        <ReceiptRow label={t("checkout.plan")} value={t(`bundle.${bundle.id}.name`)} />
        <ReceiptRow label={t("checkout.total")} value={<Price amount={pass.amount} />} />
        <ReceiptRow label={t("checkout.reference")} value={pass.reference} ltr />
        <ReceiptRow
          label={t("checkout.validUntil")}
          value={formatPassDate(pass.expiresAt)}
        />
      </dl>

      <Button
        type="button"
        onClick={onRegister}
        className="mt-6 h-11 w-full bg-[#087fbb] text-sm text-white shadow-none hover:bg-[#066c9f]">
        {t("checkout.createAccount")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onLogin}
        className="mt-2 h-10 w-full text-[#53627a] hover:bg-[#eef6fc] hover:text-[#14284f]">
        {t("checkout.goToLogin")}
      </Button>
    </div>
  );
}

/**
 * Demo payment gate: it validates and formats a card, waits, then writes a
 * local subscription pass. Nothing is charged and no request leaves the
 * browser — the pass is what unlocks `/login`.
 */
export default function Checkout() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const search = useSearch();

  const params = new URLSearchParams(search);
  const bundle = getBundle(params.get("bundle"));
  const billingParam = params.get("billing");
  const billing: BillingCycle = isBillingCycle(billingParam)
    ? billingParam
    : "monthly";
  const price = bundlePrice(bundle, billing);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paidPass, setPaidPass] = useState<AccessPass | null>(null);
  const [existingPass] = useState<AccessPass | null>(() => {
    const stored = readAccessPass();
    return isAccessPassActive(stored) ? stored : null;
  });

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema(t)),
    defaultValues: { cardName: "", cardNumber: "", expiry: "", cvv: "" },
  });

  const onPay = async (values: CheckoutValues) => {
    setIsProcessing(true);

    // Stand-in for the payment provider round trip.
    await new Promise((resolve) => window.setTimeout(resolve, 1500));

    const paidAt = new Date();
    const pass: AccessPass = {
      reference: createPassReference(),
      bundleId: bundle.id,
      billing,
      amount: price,
      cardLast4: onlyDigits(values.cardNumber).slice(-4),
      paidAt: paidAt.toISOString(),
      expiresAt: billingExpiry(paidAt, billing).toISOString(),
    };

    saveAccessPass(pass);
    setPaidPass(pass);
    setIsProcessing(false);
  };

  return (
    <main className="min-h-screen bg-[#f7fbff] text-[#14284f]">
      <PublicHeader />

      <section className="px-5 py-10 sm:px-8 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-[980px]">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#53627a] transition-colors hover:text-[#087fbb]">
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {t("checkout.back")}
          </Link>

          <div className="mt-6">
            <h1 className="text-[clamp(1.8rem,3.2vw,2.4rem)] font-bold leading-tight tracking-[-0.04em] text-[#14284f]">
              {t("checkout.title")}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#687a91]">
              {t("checkout.subtitle")}
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
            <OrderSummary bundle={bundle} billing={billing} price={price} />

            <div className="rounded-2xl border border-[#dfeaf5] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(20,70,110,.5)] sm:p-8">
              {paidPass ? (
                <PaymentSuccess
                  pass={paidPass}
                  onRegister={() => navigate("/login?register=true")}
                  onLogin={() => navigate("/login")}
                />
              ) : (
                <>
                  <div className="mb-6 flex items-start gap-2 rounded-lg border border-[#f3d79a] bg-[#fdf7ea] px-3 py-2.5 text-xs leading-5 text-[#7a5a12]">
                    <Sparkles
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#c08a1e]"
                      aria-hidden="true"
                    />
                    <span>{t("checkout.testNotice")}</span>
                  </div>

                  {existingPass && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#cbe9d8] bg-[#edf9f2] px-3 py-2.5 text-xs text-[#2f6f57]">
                      <span>{t("checkout.alreadyActive")}</span>
                      <Link
                        href="/login"
                        className="font-semibold underline-offset-2 hover:underline">
                        {t("checkout.useIt")}
                      </Link>
                    </div>
                  )}

                  <h2 className="flex items-center gap-2 text-base font-bold tracking-[-0.01em] text-[#14284f]">
                    <CreditCard
                      className="h-4 w-4 text-[#087fbb]"
                      aria-hidden="true"
                    />
                    {t("checkout.payment")}
                  </h2>
                  <p className="mt-1 text-[11px] font-medium text-[#8a9caf]">
                    {t("checkout.accepted")}
                  </p>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onPay)}
                      className="mt-5 space-y-4"
                      aria-busy={isProcessing}>
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
                                  field.onChange(
                                    formatCardNumber(event.target.value),
                                  )
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
                                    field.onChange(
                                      formatExpiry(event.target.value),
                                    )
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
                            {t("checkout.pay")} <Price amount={price} />
                          </>
                        )}
                      </Button>

                      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#8a9caf]">
                        <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {t("checkout.secure")}
                      </p>
                    </form>
                  </Form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
