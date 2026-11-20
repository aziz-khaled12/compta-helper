import { useState } from "react";
import { Check } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/price";
import { cn } from "@/lib/utils";
import {
  BUNDLES,
  bundlePrice,
  type BillingCycle,
  type Bundle,
} from "@/lib/bundles";

function BillingToggle({
  billing,
  onChange,
}: {
  billing: BillingCycle;
  onChange: (next: BillingCycle) => void;
}) {
  const { t } = useTranslation();

  const option = (cycle: BillingCycle, label: string, extra?: string) => {
    const active = billing === cycle;
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onChange(cycle)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-150 motion-reduce:transition-none",
          active
            ? "bg-[#14284f] text-white"
            : "text-[#53627a] hover:text-[#14284f]",
        )}>
        {label}
        {extra && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              active
                ? "bg-[#f1b93e] text-[#14284f]"
                : "bg-[#fdf3dd] text-[#a97812]",
            )}>
            {extra}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex justify-center">
      <div
        role="group"
        aria-label={t("pricing.billingToggle")}
        className="inline-flex items-center rounded-full border border-[#d9e6f2] bg-white p-1 shadow-sm">
        {option("monthly", t("pricing.monthly"))}
        {option("yearly", t("pricing.yearly"), t("pricing.saveBadge"))}
      </div>
    </div>
  );
}

function BundleCard({ bundle, billing }: { bundle: Bundle; billing: BillingCycle }) {
  const { t } = useTranslation();
  const price = bundlePrice(bundle, billing);
  const features = Array.from({ length: bundle.featureCount }, (_, index) =>
    t(`bundle.${bundle.id}.feature.${index}`),
  );

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border bg-white p-6 sm:p-7",
        bundle.highlighted
          ? "border-[#087fbb] shadow-[0_26px_60px_-32px_rgba(8,127,187,.55)] lg:-mt-4 lg:mb-4"
          : "border-[#dfeaf5]",
      )}>
      {bundle.highlighted && (
        <span className="absolute -top-3 start-6 rounded-full bg-[#f1b93e] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#14284f]">
          {t("pricing.featured")}
        </span>
      )}

      <h3 className="text-lg font-bold tracking-[-0.02em] text-[#14284f]">
        {t(`bundle.${bundle.id}.name`)}
      </h3>
      <p className="mt-1 text-sm text-[#687a91]">
        {t(`bundle.${bundle.id}.tagline`)}
      </p>

      <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5">
        <Price
          amount={price}
          className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-[#14284f]"
        />
        <span className="text-xs font-medium text-[#8a9caf]">
          {billing === "monthly" ? t("pricing.perMonth") : t("pricing.perYear")}
        </span>
      </p>
      <p className="mt-2 text-[11px] font-medium text-[#8a9caf]">
        {billing === "monthly"
          ? t("pricing.billedMonthly")
          : t("pricing.billedYearly")}
      </p>

      <ul className="mt-6 flex-1 space-y-2.5 border-t border-[#eef4f9] pt-6 text-sm text-[#34506b]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#087fbb]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        className={cn(
          "mt-7 h-11 w-full rounded-md text-sm",
          bundle.highlighted
            ? "bg-[#087fbb] text-white shadow-none hover:bg-[#066c9f]"
            : "border border-[#cfe0ee] bg-[#f4fbff] text-[#14284f] shadow-none hover:bg-[#e6f4fb]",
        )}>
        <Link href={`/checkout?bundle=${bundle.id}&billing=${billing}`}>
          {t("pricing.cta")}
        </Link>
      </Button>
    </article>
  );
}

/**
 * The bundle showcase, shared by the landing page's `#pricing` section and the
 * `/pricing` page. Selecting a bundle hands off to the checkout gate.
 */
export function BundleCards() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  return (
    <div>
      <BillingToggle billing={billing} onChange={setBilling} />

      <div className="mt-10 grid items-stretch gap-5 sm:mt-12 lg:grid-cols-3">
        {BUNDLES.map((bundle) => (
          <BundleCard key={bundle.id} bundle={bundle} billing={billing} />
        ))}
      </div>
    </div>
  );
}
