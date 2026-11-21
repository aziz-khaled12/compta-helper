import { useTranslation } from "react-i18next";
import { Price } from "@/components/price";
import { ADDON_PRICE, ADDON_SERVICES, serviceMeta } from "@/lib/plans";

/**
 * The à-la-carte services of the partial pack, shown under the plan cards so
 * the "+1 000 DA per service" model is visible without opening the checkout.
 */
export function ServiceGrid() {
  const { t } = useTranslation();

  return (
    <div className="mt-10">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9caf]">
        {t("pricing.addonsTitle")}
      </p>
      <ul className="mx-auto mt-4 grid max-w-[880px] grid-cols-2 gap-2 sm:grid-cols-4">
        {ADDON_SERVICES.map((service) => (
          <li
            key={service}
            className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg border border-[#e3edf6] bg-[#f7fbff] px-3 py-2 text-xs font-medium text-[#34506b]">
            <span className="min-w-0 text-[11px] leading-4">
              {t(serviceMeta(service).nameKey)}
            </span>
            <span
              dir="ltr"
              className="shrink-0 text-[11px] font-semibold text-[#087fbb]">
              + <Price amount={ADDON_PRICE} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-[11px] text-[#8a9caf]">
        {t("pricing.addonsNote")}
      </p>
    </div>
  );
}
