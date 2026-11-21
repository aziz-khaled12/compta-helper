import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Check, CheckCircle2, Lock, LockKeyhole, LogOut, Receipt, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@workspace/auth-web";
import { Price } from "@/components/price";
import { PurchaseDialog } from "@/components/pricing/purchase-dialog";
import type { CardDetails } from "@/components/pricing/card-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ADDON_PRICE,
  ADDON_SERVICES,
  CORE_SERVICES,
  isServiceId,
  planPrice,
  serviceMeta,
  type BillingCycle,
  type PlanId,
  type ServiceId,
} from "@/lib/plans";
import {
  addServices,
  createPass,
  formatPassDate,
  saveAccessPass,
} from "@/lib/access-pass";
import { useSubscription } from "@/lib/subscription";

type Purchase =
  | { kind: "renew"; plan: PlanId }
  | { kind: "full" }
  | { kind: "addon"; service: ServiceId };

/**
 * In-app subscription management: the current pack, the add-ons still on sale,
 * renewal and the upgrade to the full pack.
 *
 * Rendered inside the shell when the pass is active, and â€” passed `standalone`
 * by `App` â€” as the full-screen renewal screen when it has expired. The
 * "add service" dialog opens straight from `?add=<service>`, which is how the
 * locked-service page sends users here.
 */
export default function Subscription({
  standalone = false,
}: {
  standalone?: boolean;
}) {
  const { t } = useTranslation();
  const { pass, isActive, isTrial, daysLeft, canUse } = useSubscription();
  const { logout } = useAuth();
  const search = useSearch();

  const [purchase, setPurchase] = useState<Purchase | null>(() => {
    const add = new URLSearchParams(search).get("add");
    if (add && isServiceId(add) && !canUse(add)) {
      return { kind: "addon", service: add };
    }
    return null;
  });

  const billing: BillingCycle = pass?.billing ?? "monthly";
  const partialServices = pass?.plan === "partial" ? pass.services : [];

  const amountFor = (choice: Purchase): number => {
    if (choice.kind === "addon") return ADDON_PRICE;
    if (choice.kind === "full") return planPrice("full", [], billing);
    return planPrice(
      choice.plan,
      choice.plan === "partial" ? partialServices : [],
      billing,
    );
  };

  const amount = purchase ? amountFor(purchase) : 0;

  const title = !purchase
    ? ""
    : purchase.kind === "addon"
      ? t("subscription.buyTitle", {
          service: t(serviceMeta(purchase.service).nameKey),
        })
      : purchase.kind === "full"
        ? t("subscription.upgradeBuyTitle")
        : t("subscription.renewTitle", {
            plan: t(`plan.${purchase.plan}.name`),
          });

  const description = !purchase
    ? undefined
    : purchase.kind === "addon"
      ? t("subscription.buyDesc")
      : purchase.kind === "full"
        ? t("subscription.upgradeBuyDesc")
        : t("subscription.renewBuyDesc");

  const onPaid = (card: CardDetails) => {
    if (!purchase) return;

    if (purchase.kind === "addon") {
      if (pass) saveAccessPass(addServices(pass, [purchase.service], ADDON_PRICE));
    } else {
      const targetPlan: PlanId =
        purchase.kind === "full" ? "full" : purchase.plan;
      const services = targetPlan === "full" ? [] : partialServices;
      saveAccessPass(
        createPass({
          plan: targetPlan,
          services,
          billing,
          amount: planPrice(targetPlan, services, billing),
          cardLast4: card.last4,
        }),
      );
    }

    toast.success(t("subscription.paidToast"));
  };

  const dialog = (
    <PurchaseDialog
      open={purchase !== null}
      onOpenChange={(open) => {
        if (!open) setPurchase(null);
      }}
      title={title}
      description={description}
      amount={amount}
      onPaid={onPaid}
    />
  );

  if (standalone || !isActive) {
    const renewPartialAmount = planPrice("partial", partialServices, billing);
    const fullAmount = planPrice("full", [], billing);

    return (
      <main className="min-h-screen bg-[#f7fbff] px-5 py-12 text-[#14284f] sm:px-8">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/logo-mark.jpg"
                alt={t("landing.brand")}
                className="h-9 w-auto rounded-md object-contain"
              />
              <span className="text-sm font-semibold">{t("landing.brand")}</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              {t("layout.logout")}
            </Button>
          </div>

          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fdf3dd] text-[#a97812]">
              <LockKeyhole className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-[-0.03em]">
              {pass?.trial
                ? t("trial.endedTitle")
                : t("subscription.expiredTitle")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#687a91]">
              {pass?.trial
                ? t("trial.endedDesc")
                : t("subscription.expiredDesc")}
            </p>
          </div>

          <Card className="border-[#dfeaf5] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("subscription.choose")}
              </CardTitle>
              {pass && (
                <CardDescription>
                  {t("subscription.expiresOn", {
                    date: formatPassDate(pass.expiresAt),
                  })}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfeaf5] bg-[#f7fbff] p-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-[#14284f]">
                    {t("plan.full.name")}
                    <Badge
                      variant="outline"
                      className="border-[#f1b93e] bg-[#fdf3dd] text-[10px] text-[#a97812]">
                      {t("pricing.featured")}
                    </Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-[#687a91]">
                    {t("plan.full.tagline")}
                  </p>
                </div>
                <Button
                  onClick={() => setPurchase({ kind: "full" })}
                  className="bg-[#087fbb] text-white hover:bg-[#066c9f]">
                  {t("checkout.pay")} <Price amount={fullAmount} />
                </Button>
              </div>

              {pass?.plan !== "full" && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfeaf5] p-4">
                  <div>
                    <p className="text-sm font-bold text-[#14284f]">
                      {t("plan.partial.name")}
                    </p>
                    <p className="mt-0.5 text-xs text-[#687a91]">
                      {t("plan.partial.tagline")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPurchase({ kind: "renew", plan: "partial" })}>
                    {t("subscription.renew")}{" "}
                    <Price amount={renewPartialAmount} />
                  </Button>
                </div>
              )}

              {pass?.trial && (
                <p className="flex items-start gap-2 text-xs leading-5 text-[#a97812]">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t("trial.endedDesc")}
                </p>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-[#8a9caf]">
            {t("subscription.demoNote")}
          </p>
        </div>

        {dialog}
      </main>
    );
  }

  // Reaching this branch means `isActive`, which implies a pass.
  if (!pass) return null;

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("subscription.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("subscription.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-primary" />
              {t("subscription.current")}
            </CardTitle>
            <CardDescription>
              {t("subscription.expiresOn", {
                date: formatPassDate(pass.expiresAt),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-bold tracking-[-0.02em]">
                {t(`plan.${pass.plan}.name`)}
              </span>
              {isTrial && (
                <Badge
                  variant="outline"
                  className="border-[#f1b93e] bg-[#fdf3dd] text-[10px] text-[#a97812]">
                  {t("trial.badge")}
                </Badge>
              )}
            </div>

            <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-muted-foreground">
              <Price
                amount={planPrice(pass.plan, partialServices, billing)}
                className="text-base font-semibold text-foreground"
              />
              {billing === "monthly"
                ? t("pricing.perMonth")
                : t("pricing.perYear")}
            </p>

            {isTrial && (
              <p className="flex items-center gap-2 text-sm font-medium text-[#a97812]">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {daysLeft === 1
                  ? t("trial.dayLeft")
                  : t("trial.daysLeft", { count: daysLeft })}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setPurchase({ kind: "renew", plan: pass.plan })}>
                {isTrial
                  ? t("subscription.subscribe")
                  : t("subscription.renew")}
              </Button>
              {pass.plan === "partial" && (
                <Button
                  variant="outline"
                  onClick={() => setPurchase({ kind: "full" })}>
                  {t("subscription.upgradeCta")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {t("subscription.amountPaid")}
            </CardTitle>
            <CardDescription>
              {billing === "monthly"
                ? t("checkout.billingMonthly")
                : t("checkout.billingYearly")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {t("checkout.total")}
              </span>
              <Price
                amount={pass.amount}
                className="text-lg font-bold text-foreground"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {t("checkout.reference")}
              </span>
              <span className="font-semibold" dir="ltr">
                {pass.reference}
              </span>
            </div>
            <p className="pt-1 text-xs leading-5 text-muted-foreground">
              {t("subscription.demoNote")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" />
            {t("subscription.services")}
          </CardTitle>
          <CardDescription>
            {pass.plan === "partial"
              ? t("subscription.partialNote")
              : t("subscription.fullNote")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {CORE_SERVICES.map((service) => {
            const meta = serviceMeta(service);
            return (
              <div
                key={service}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  {t(meta.nameKey)}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {t("subscription.core")}
                </Badge>
              </div>
            );
          })}

          {ADDON_SERVICES.map((service) => {
            const meta = serviceMeta(service);
            const included = canUse(service);
            return (
              <div
                key={service}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  {included ? (
                    <Check
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Lock
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  {t(meta.nameKey)}
                </span>

                {included ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {t("subscription.included")}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={t("subscription.addAria", {
                      service: t(meta.nameKey),
                    })}
                    onClick={() => setPurchase({ kind: "addon", service })}>
                    {t("subscription.add")} <Price amount={ADDON_PRICE} />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {t("subscription.demoNote")}
      </p>

      {dialog}
    </div>
  );
}
