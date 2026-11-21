import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, CheckCircle2, CreditCard, Sparkles } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { Price } from "@/components/price";
import { CardForm, type CardDetails } from "@/components/pricing/card-form";
import { TrialCta } from "@/components/pricing/trial-cta";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADDON_PRICE,
  ADDON_SERVICES,
  DEFAULT_PLAN_ID,
  FULL_PRICE,
  PARTIAL_PRICE,
  isBillingCycle,
  isPlanId,
  isServiceId,
  planPrice,
  serviceMeta,
  type BillingCycle,
  type PlanId,
  type ServiceId,
} from "@/lib/plans";
import {
  createPass,
  formatPassDate,
  isAccessPassActive,
  readAccessPass,
  saveAccessPass,
  type AccessPass,
} from "@/lib/access-pass";

function OrderSummary({
  plan,
  billing,
  selected,
  price,
}: {
  plan: PlanId;
  billing: BillingCycle;
  selected: ServiceId[];
  price: number;
}) {
  const { t } = useTranslation();
  const isPartial = plan === "partial";

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
            {t(`plan.${plan}.name`)}
          </p>
          <p className="mt-0.5 text-sm text-[#687a91]">
            {t(`plan.${plan}.tagline`)}
          </p>
        </div>
        {plan === "full" && (
          <span className="mt-1 shrink-0 rounded-full bg-[#fdf3dd] px-2.5 py-0.5 text-[10px] font-bold text-[#a97812]">
            {t("pricing.featured")}
          </span>
        )}
      </div>

      <dl className="mt-5 space-y-2 border-t border-[#eef4f9] pt-5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[#687a91]">{t("checkout.basePlan")}</dt>
          <dd className="font-medium text-[#14284f]">
            <Price amount={isPartial ? PARTIAL_PRICE : FULL_PRICE} />
          </dd>
        </div>
        {selected.map((service) => (
          <div
            key={service}
            className="flex items-center justify-between gap-3">
            <dt className="min-w-0 truncate text-xs text-[#687a91]">
              {t("checkout.addonLine", {
                service: t(serviceMeta(service).nameKey),
              })}
            </dt>
            <dd className="shrink-0 text-xs font-medium text-[#14284f]" dir="ltr">
              + <Price amount={ADDON_PRICE} />
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3">
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
        <CreditCard
          className="h-3.5 w-3.5 shrink-0 text-[#087fbb]"
          aria-hidden="true"
        />
        {t("checkout.accepted")}
      </div>
    </aside>
  );
}

/** Toggleable add-on list — only rendered for the partial pack. */
function AddonPicker({
  selected,
  onToggle,
}: {
  selected: ServiceId[];
  onToggle: (service: ServiceId) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-bold tracking-[-0.01em] text-[#14284f]">
          {t("checkout.addons")}
        </h3>
        <span className="text-[11px] font-medium text-[#8a9caf]">
          {t("pricing.addonHintPrefix")} <Price amount={ADDON_PRICE} />{" "}
          {t("pricing.perMonth")}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ADDON_SERVICES.map((service) => {
          const isOn = selected.includes(service);
          return (
            <button
              key={service}
              type="button"
              aria-pressed={isOn}
              onClick={() => onToggle(service)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                isOn
                  ? "border-[#087fbb] bg-[#f2fbff] text-[#14284f]"
                  : "border-[#dfeaf5] bg-white text-[#53627a] hover:border-[#bcd9ea]",
              )}>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
                    isOn
                      ? "border-[#087fbb] bg-[#087fbb] text-white"
                      : "border-[#c9d8e5] bg-white",
                  )}>
                  {isOn && <Check className="h-3 w-3" aria-hidden="true" />}
                </span>
                <span className="truncate">
                  {t(serviceMeta(service).nameKey)}
                </span>
              </span>
              <span
                dir="ltr"
                className="shrink-0 text-[11px] text-[#087fbb]">
                + <Price amount={ADDON_PRICE} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
        className={cn("font-semibold text-[#14284f]", ltr && "tracking-wide")}>
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
        <ReceiptRow
          label={t("checkout.plan")}
          value={t(`plan.${pass.plan}.name`)}
        />
        {pass.plan === "partial" && pass.services.length > 0 && (
          <ReceiptRow
            label={t("checkout.services")}
            value={pass.services
              .map((service) => t(serviceMeta(service).nameKey))
              .join(" · ")}
          />
        )}
        <ReceiptRow
          label={t("checkout.total")}
          value={<Price amount={pass.amount} />}
        />
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
 * browser — the pass is what unlocks `/login` and, service by service, the app.
 */
export default function Checkout() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const search = useSearch();

  const params = new URLSearchParams(search);
  const planParam = params.get("plan");
  const plan: PlanId = isPlanId(planParam) ? planParam : DEFAULT_PLAN_ID;
  const billingParam = params.get("billing");
  const billing: BillingCycle = isBillingCycle(billingParam)
    ? billingParam
    : "monthly";

  const [selected, setSelected] = useState<ServiceId[]>(() => {
    const raw = (params.get("services") ?? "").split(",").filter(isServiceId);
    return [...new Set(raw)];
  });

  const addons = plan === "partial" ? selected : [];
  const price = planPrice(plan, addons, billing);

  const [paidPass, setPaidPass] = useState<AccessPass | null>(null);
  const [existingPass] = useState<AccessPass | null>(() => {
    const stored = readAccessPass();
    return isAccessPassActive(stored) ? stored : null;
  });

  const toggleAddon = (service: ServiceId) => {
    setSelected((current) =>
      current.includes(service)
        ? current.filter((id) => id !== service)
        : [...current, service],
    );
  };

  const onPay = (card: CardDetails) => {
    const pass = createPass({
      plan,
      services: addons,
      billing,
      amount: price,
      cardLast4: card.last4,
    });

    saveAccessPass(pass);
    setPaidPass(pass);
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
            <OrderSummary
              plan={plan}
              billing={billing}
              selected={addons}
              price={price}
            />

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

                  {plan === "partial" && (
                    <AddonPicker selected={selected} onToggle={toggleAddon} />
                  )}

                  <h2 className="flex items-center gap-2 text-base font-bold tracking-[-0.01em] text-[#14284f]">
                    <CreditCard
                      className="h-4 w-4 text-[#087fbb]"
                      aria-hidden="true"
                    />
                    {t("checkout.payment")}
                  </h2>
                  <p className="mt-1 mb-5 text-[11px] font-medium text-[#8a9caf]">
                    {t("checkout.accepted")}
                  </p>

                  <CardForm amount={price} onPay={onPay} />

                  <div className="mt-6 border-t border-[#eef4f9] pt-5">
                    <TrialCta appearance="link" />
                  </div>
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
