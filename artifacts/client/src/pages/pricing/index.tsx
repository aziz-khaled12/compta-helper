import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { BundleCards } from "@/components/pricing/bundle-cards";

/**
 * Public bundle showcase. Every card hands off to `/checkout`, which is the
 * only way to reach the login and registration forms.
 */
export default function Pricing() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-[#f7fbff] text-[#14284f]">
      <PublicHeader />

      <section className="relative px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:pb-24 lg:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(119,204,246,.22),transparent_66%)]" />

        <div className="relative z-10 mx-auto max-w-[1080px]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f1b93e]">
              {t("pricing.eyebrow")}
            </p>
            <h1 className="mt-4 text-balance text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-[1.05] tracking-[-0.045em] text-[#14284f]">
              {t("pricing.title")}
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-[#687a91] sm:text-base">
              {t("pricing.subtitle")}
            </p>
          </div>

          <div className="mt-12 sm:mt-16">
            <BundleCards />
          </div>

          <p className="mt-10 text-center text-xs text-[#8a9caf]">
            {t("pricing.note")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-[#53627a] sm:flex-row">
            <span>
              {t("pricing.haveAccount")}{" "}
              <Link
                href="/login"
                className="font-semibold text-[#087fbb] transition-colors hover:text-[#066c9f]">
                {t("pricing.login")}
              </Link>
            </span>
            <span className="hidden text-[#c8d6e4] sm:inline">·</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-[#087fbb]">
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              {t("pricing.backHome")}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
