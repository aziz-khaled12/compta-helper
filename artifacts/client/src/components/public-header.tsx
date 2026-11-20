import { ArrowRight, Languages } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { toggleLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";

const linkClass = "transition-colors hover:text-[#087fbb]";
const activeLinkClass = "font-semibold text-[#087fbb]";

/**
 * Marketing header shared by the landing page, the pricing page and the
 * checkout. The nav anchors only exist on the landing page — on sub-pages the
 * same labels navigate back to it, and "Contact" falls back to email.
 */
export function PublicHeader() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const onLanding = location === "/";
  const onPricing = location === "/pricing" || location === "/checkout";

  return (
    <header className="relative z-20 mx-auto flex max-w-[1180px] items-center justify-between border-b border-[#dfeaf5] px-5 py-4 sm:px-8 lg:px-10">
      <Link
        href="/"
        className="flex items-center gap-2.5"
        aria-label={t("landing.brand")}>
        {/* Mark only: the stacked lockup's wordmark is ~4px at this height. */}
        <img
          src="/logo-mark.jpg"
          alt=""
          className="h-8 w-auto mix-blend-multiply sm:h-9"
        />
      </Link>

      <nav className="hidden items-center gap-7 text-[12px] font-medium text-[#53627a] md:flex">
        {onLanding ? (
          <a href="#features" className={linkClass}>
            {t("landing.nav.features")}
          </a>
        ) : (
          <Link href="/" className={linkClass}>
            {t("landing.nav.features")}
          </Link>
        )}
        <Link
          href="/pricing"
          className={onPricing ? activeLinkClass : linkClass}
          aria-current={onPricing ? "page" : undefined}>
          {t("landing.nav.pricing")}
        </Link>
        {onLanding ? (
          <a href="#contact" className={linkClass}>
            {t("landing.nav.contact")}
          </a>
        ) : (
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            {t("landing.nav.contact")}
          </a>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 sm:inline-flex"
          title={t("landing.language")}
          onClick={toggleLanguage}>
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t("landing.language")}</span>
        </Button>
        <Link href="/login" className="hidden sm:block">
          <Button variant="ghost" className="h-8 px-3 text-xs">
            {t("landing.login")}
          </Button>
        </Link>
        <Button
          asChild
          className="h-8 rounded-md bg-[#087fbb] px-3 text-xs text-white shadow-none hover:bg-[#066c9f]">
          <Link href="/pricing">
            <span className="hidden sm:inline">{t("landing.start")}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180 sm:hidden" />
            <span className="sr-only sm:hidden">{t("landing.start")}</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}

/** Compact footer for the pricing and checkout pages. */
export function PublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-[#dfeaf5] bg-[#f7fbff] px-5 py-6 text-xs text-[#8a9caf] sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span>{t("landing.copyright")}</span>
        <button
          type="button"
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 self-start font-medium text-[#53627a] transition-colors hover:text-[#087fbb] md:self-auto">
          <Languages className="h-3.5 w-3.5" />
          {t("landing.language")}
        </button>
      </div>
    </footer>
  );
}
