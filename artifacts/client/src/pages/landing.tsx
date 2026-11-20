import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  FileChartColumn,
  Languages,
  Package,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { toggleLanguage } from "@/i18n";
import { PublicHeader } from "@/components/public-header";
import { BundleCards } from "@/components/pricing/bundle-cards";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";

const FEATURE_INDEXES = [0, 1, 2, 3, 4, 5, 6];
const FEATURE_ICONS = [
  ReceiptText,
  BarChart3,
  FileChartColumn,
  Package,
  CalendarDays,
  BarChart3,
  ShieldCheck,
];

type CopyState = "idle" | "copied" | "failed";

function ContactEmailCard() {
  const { t } = useTranslation();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const scheduleReset = () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState("idle"), 2200);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    scheduleReset();
  };

  return (
    <div className="rounded-xl border border-[#d9ecf7] bg-[#f4fbff] p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9caf]">
        {t("landing.contactSection.emailLabel")}
      </p>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        dir="ltr"
        className="mt-2 block text-start text-lg font-bold tracking-[-0.01em] text-[#14284f] transition-colors hover:text-[#087fbb] rtl:text-right sm:text-xl">
        {CONTACT_EMAIL}
      </a>
      <p className="mt-1 text-xs text-[#687a91]">
        {t("landing.contactSection.replyTime")}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          asChild
          size="lg"
          className="h-10 w-full gap-2 bg-[#087fbb] px-4 text-sm text-white shadow-none transition-transform duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:bg-[#066c9f] active:scale-[0.97] motion-reduce:transition-none sm:w-auto">
          <a href={`mailto:${CONTACT_EMAIL}`}>
            {t("landing.contactSection.write")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={copyEmail}
          className="h-10 w-full justify-center gap-2 px-3 text-sm font-medium text-[#34506b] transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:bg-[#e6f4fb] hover:text-[#087fbb] active:scale-[0.97] motion-reduce:transition-none sm:w-auto sm:justify-start">
          <span className="relative inline-flex h-4 w-4 items-center justify-center">
            <Copy
              className={`absolute h-4 w-4 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
                copyState === "copied"
                  ? "scale-95 opacity-0"
                  : "scale-100 opacity-100"
              }`}
            />
            <Check
              className={`absolute h-4 w-4 text-[#0f8a5f] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
                copyState === "copied"
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-0"
              }`}
            />
          </span>
          {copyState === "copied"
            ? t("landing.contactSection.copied")
            : copyState === "failed"
              ? t("landing.contactSection.copyFailed")
              : t("landing.contactSection.copy")}
        </Button>
      </div>
      <span className="sr-only" aria-live="polite">
        {copyState === "copied"
          ? t("landing.contactSection.copied")
          : copyState === "failed"
            ? t("landing.contactSection.copyFailed")
            : ""}
      </span>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f7fd] text-[#14284f]">
      <PublicHeader />

      <section className="relative px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:pb-24 lg:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[650px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(119,204,246,.2),transparent_64%)]" />
        <div className="relative z-10 mx-auto flex max-w-[780px] flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cbeaf8] bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#3c6a85] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f1b93e]" />
            {t("landing.eyebrow")}
          </div>
          <h1 className="max-w-[820px] text-[clamp(2.4rem,5.4vw,4.2rem)] font-bold leading-[1.04] tracking-[-0.04em] text-[#14284f]">
            {t("landing.titleStart")}
            <br />
            <span className="text-[#087fbb]">{t("landing.titleAccent")}</span>
          </h1>
          <p className="mt-6 text-base font-semibold text-[#34506b] sm:text-lg">
            {t("landing.heroSubtitle")}
          </p>
          <p className="mt-3 max-w-[570px] text-[15px] leading-7 text-[#687a91] sm:text-base">
            {t("landing.description")}
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/pricing">
              <Button
                size="lg"
                className="h-11 rounded-md bg-[#087fbb] px-6 text-sm text-white shadow-[0_10px_22px_-12px_#087fbb] hover:bg-[#066c9f]">
                {t("landing.primaryCta")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="ghost"
                className="h-11 px-4 text-sm text-[#34506b]">
                {t("landing.secondaryCta")}
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-[10px] text-[#8a9caf]">
            {t("landing.heroMeta")}
          </p>
        </div>

        <div className="relative z-10 mx-auto mt-14 max-w-[1080px] sm:mt-20">
          <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-[#83d2f2]/20 blur-3xl" />
          <div className="overflow-hidden rounded-xl border border-[#dce8f2] bg-white p-2 shadow-[0_28px_70px_-28px_rgba(20,70,110,.42)] sm:rounded-2xl sm:p-3">
            <img
              src="/demo-dashboard.png"
              alt={t("landing.dashboardAlt")}
              className="block w-full rounded-lg border border-[#e4edf4]"
            />
          </div>
        </div>
      </section>

      <section
        id="features"
        className="px-4 py-10 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1080px] rounded-[2rem] border border-[#dbe6f0] bg-white px-5 py-12 sm:px-10 sm:py-16 lg:px-11 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.06] tracking-[-0.045em] text-[#14284f]">
              {t("landing.featuresTitle")}
            </h2>
            <span className="mx-auto mt-5 block h-1 w-14 rounded-full bg-[#d9aa45]" />
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-[#687a91] sm:text-base">
              {t("landing.featuresSubtitle")}
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
            {FEATURE_INDEXES.map((index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <article
                  key={index}
                  className="min-h-[224px] rounded-[1.35rem] bg-[#f1f5fb] px-5 py-6 text-center transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#dff3fb] text-[#14284f]">
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-6 text-lg font-bold tracking-[-0.02em] text-[#14284f]">
                    {t(`landing.feature.${index}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[#687a91]">
                    {t(`landing.feature.${index}.description`)}
                  </p>
                </article>
              );
            })}
          </div>
          <div className="mt-12 flex items-center justify-center gap-5 text-center text-lg font-semibold text-[#14284f] sm:mt-16">
            <span className="h-1 w-14 rounded-full bg-[#d9aa45]" />
            <span>{t("landing.featuresClosing")}</span>
            <span className="h-1 w-14 rounded-full bg-[#d9aa45]" />
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="px-4 py-4 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-[1080px] rounded-[2rem] border border-[#dbe6f0] bg-white px-5 py-12 sm:px-10 sm:py-16 lg:px-11 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-[clamp(2rem,4.4vw,3.2rem)] font-bold leading-[1.06] tracking-[-0.045em] text-[#14284f]">
              {t("landing.pricingTitle")}
            </h2>
            <span className="mx-auto mt-5 block h-1 w-14 rounded-full bg-[#d9aa45]" />
            <p className="mt-5 text-[15px] leading-7 text-[#687a91] sm:text-base">
              {t("landing.pricingSubtitle")}
            </p>
          </div>

          <div className="mt-12">
            <BundleCards />
          </div>

          <p className="mt-10 text-center text-xs text-[#8a9caf]">
            {t("pricing.note")}
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#087fbb] transition-colors hover:text-[#066c9f]">
              {t("landing.pricingCta")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1080px] rounded-[2rem] bg-[#102d68] px-6 py-14 text-center sm:px-10 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <p className="text-xs font-bold tracking-[0.14em] text-[#36b9e8]">
              • {t("landing.brand")} •
            </p>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.04em] text-white sm:text-5xl">
              {t("landing.ctaTitle")}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#c5d8f0]">
              {t("landing.ctaDescription")}
            </p>
            <Link href="/pricing" className="mt-7 inline-flex">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-[#dff3fb] px-7 text-sm font-bold text-[#14284f] shadow-none transition-transform duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:bg-white active:scale-[0.97] motion-reduce:transition-none">
                {t("landing.primaryCta")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </Link>
          </div>
          <div className="mx-auto mt-12 h-1 max-w-[850px] bg-[#2cafe0]" />
          <p className="mt-5 text-sm text-white">{t("landing.featuresClosing")}</p>
        </div>
      </section>

      <section
        id="contact"
        className="px-4 py-4 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto grid max-w-[1080px] gap-10 rounded-[2rem] border border-[#dbe6f0] bg-white px-5 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16 lg:px-11">
          <div className="text-center lg:text-start">
            <h2 className="text-balance text-[clamp(2rem,4.4vw,3.2rem)] font-bold leading-[1.06] tracking-[-0.045em] text-[#14284f]">
              {t("landing.contactSection.title")}
            </h2>
            <span className="mx-auto mt-5 block h-1 w-14 rounded-full bg-[#d9aa45] lg:mx-0" />
            <p className="mt-5 max-w-md text-[15px] leading-7 text-[#687a91] sm:text-base">
              {t("landing.contactSection.description")}
            </p>
          </div>
          <ContactEmailCard />
        </div>
      </section>

      <footer className="px-5 pb-8 pt-12 text-[13px] text-[#14284f] sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-5 border-t border-[#d9aa45] pt-6 md:flex-row md:items-center md:justify-between">
          <span>{t("landing.copyright")}</span>
          <nav className="flex flex-wrap items-center gap-4 font-medium">
            <Link href="/login" className="transition-colors hover:text-[#087fbb]">
              {t("landing.login")}
            </Link>
            <span className="h-5 w-0.5 bg-[#d9aa45]" />
            <Link href="/pricing" className="transition-colors hover:text-[#087fbb]">
              {t("landing.register")}
            </Link>
            <span className="h-5 w-0.5 bg-[#d9aa45]" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-[#087fbb]">
              {t("landing.contact")}
            </a>
          </nav>
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 self-start font-medium text-[#53627a] transition-colors hover:text-[#087fbb] md:self-auto">
            <Languages className="h-3.5 w-3.5" />
            {t("landing.language")}
          </button>
        </div>
      </footer>
    </main>
  );
}
