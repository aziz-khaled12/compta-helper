import { ArrowDown, ArrowRight, Languages, Menu } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import i18n, { LANGUAGES, type AppLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const { t } = useTranslation();
  const isArabic = (i18n.resolvedLanguage ?? i18n.language).startsWith("ar");
  const DirectionArrow = isArabic ? ArrowRight : ArrowRight;

  const toggleLanguage = () => {
    const current = i18n.resolvedLanguage ?? i18n.language;
    const next = LANGUAGES.find((language) => !current.startsWith(language.code));
    if (next) void i18n.changeLanguage(next.code as AppLanguage);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-[#14284f]">
      <header className="relative z-20 mx-auto flex max-w-[1180px] items-center justify-between border-b border-[#dfeaf5] px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label={t("landing.brand")}>
          <img src="/logo.jpg" alt="" className="h-8 w-auto mix-blend-multiply sm:h-9" />
          <span className="hidden text-[13px] font-bold tracking-[-0.02em] text-[#14284f] sm:block">
            {t("landing.brand")}
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-[12px] font-medium text-[#53627a] md:flex">
          <a href="#features" className="transition-colors hover:text-[#087fbb]">{t("landing.nav.features")}</a>
          <a href="#workflow" className="transition-colors hover:text-[#087fbb]">{t("landing.nav.workflow")}</a>
          <a href="#security" className="transition-colors hover:text-[#087fbb]">{t("landing.nav.security")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden h-8 w-8 sm:inline-flex" title={t("landing.language")} onClick={toggleLanguage}>
            <Languages className="h-4 w-4" />
            <span className="sr-only">{t("landing.language")}</span>
          </Button>
          <Link href="/login" className="hidden sm:block"><Button variant="ghost" className="h-8 px-3 text-xs">{t("landing.login")}</Button></Link>
          <Link href="/login?register=true"><Button className="h-8 rounded-md bg-[#087fbb] px-3 text-xs text-white shadow-none hover:bg-[#066c9f]"><span className="hidden sm:inline">{t("landing.start")}</span><Menu className="h-4 w-4 sm:hidden" /><span className="sr-only sm:hidden">{t("landing.start")}</span></Button></Link>
        </div>
      </header>

      <section className="relative px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:pb-24 lg:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[650px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(119,204,246,.2),transparent_64%)]" />
        <div className="relative z-10 mx-auto flex max-w-[780px] flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cbeaf8] bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#3c6a85] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f1b93e]" />
            {t("landing.eyebrow")}
          </div>
          <h1 className="max-w-[760px] text-[clamp(2.5rem,6vw,4.7rem)] font-bold leading-[.98] tracking-[-0.065em] text-[#14284f]">
            {t("landing.titleStart")}<br /><span className="text-[#087fbb]">{t("landing.titleAccent")}</span>
          </h1>
          <p className="mt-6 max-w-[570px] text-[15px] leading-7 text-[#687a91] sm:text-base">{t("landing.description")}</p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/login?register=true"><Button size="lg" className="h-11 rounded-md bg-[#087fbb] px-6 text-sm text-white shadow-[0_10px_22px_-12px_#087fbb] hover:bg-[#066c9f]">{t("landing.primaryCta")}<DirectionArrow className="h-4 w-4" /></Button></Link>
            <a href="#features"><Button size="lg" variant="ghost" className="h-11 px-4 text-sm text-[#34506b]">{t("landing.secondaryCta")}<ArrowDown className="h-4 w-4" /></Button></a>
          </div>
          <p className="mt-4 text-[10px] text-[#8a9caf]">{t("landing.heroMeta")}</p>
        </div>

        <div className="relative z-10 mx-auto mt-14 max-w-[1080px] sm:mt-20">
          <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-[#83d2f2]/20 blur-3xl" />
          <div className="overflow-hidden rounded-xl border border-[#dce8f2] bg-white p-2 shadow-[0_28px_70px_-28px_rgba(20,70,110,.42)] sm:rounded-2xl sm:p-3">
            <img src="/demo-dashboard.png" alt={t("landing.dashboardAlt")} className="block w-full rounded-lg border border-[#e4edf4]" />
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#dfeaf5] bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-[1080px] gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-24">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#087fbb]">{t("landing.featuresEyebrow")}</p>
            <h2 className="mt-4 max-w-sm text-4xl font-bold leading-[1.02] tracking-[-0.055em] text-[#14284f] sm:text-5xl">{t("landing.featuresTitle")}</h2>
            <p className="mt-5 max-w-sm text-[15px] leading-7 text-[#687a91]">{t("landing.workflowDescription")}</p>
          </div>
          <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <article key={index} className="border-t border-[#dfeaf5] pt-5">
                <span className="text-xs font-bold text-[#f1b93e]">0{index + 1}</span>
                <h3 className="mt-4 text-lg font-bold tracking-[-0.02em] text-[#14284f]">{t(`landing.feature.${index}.title`)}</h3>
                <p className="mt-2 text-sm leading-6 text-[#687a91]">{t(`landing.feature.${index}.description`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#14284f] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-[1080px] gap-14 lg:grid-cols-[.85fr_1.15fr] lg:gap-24">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#f1b93e]">{t("landing.workflowEyebrow")}</p>
            <h2 className="mt-4 max-w-md text-4xl font-bold leading-[1.02] tracking-[-0.055em] sm:text-5xl">{t("landing.workflowTitle")}</h2>
          </div>
          <div>
            <p className="max-w-lg text-base leading-8 text-white/65">{t("landing.workflowDescription")}</p>
            <div className="mt-10 divide-y divide-white/15 border-y border-white/15">
              {[0, 1, 2].map((index) => <div key={index} className="grid gap-3 py-6 sm:grid-cols-[56px_1fr]"><span className="text-sm font-bold text-[#f1b93e]">0{index + 1}</span><div><h3 className="text-lg font-semibold">{t(`landing.workflow.${index}.title`)}</h3><p className="mt-2 max-w-md text-sm leading-6 text-white/60">{t(`landing.workflow.${index}.description`)}</p></div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="bg-[#10a9d1] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-[1080px] items-end gap-10 lg:grid-cols-[1.3fr_.7fr]">
          <h2 className="max-w-2xl text-4xl font-bold leading-[.98] tracking-[-0.06em] text-[#14284f] sm:text-6xl">{t("landing.ctaTitle")}</h2>
          <div><p className="max-w-sm text-base leading-7 text-[#14284f]/75">{t("landing.ctaDescription")}</p><Link href="/login?register=true" className="mt-7 inline-flex"><Button size="lg" className="h-11 bg-[#14284f] text-sm text-white hover:bg-[#203c70]">{t("landing.primaryCta")}<ArrowRight className="h-4 w-4" /></Button></Link></div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-[1080px] flex-col gap-2 px-5 py-7 text-xs text-[#687a91] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span className="font-bold text-[#14284f]">{t("landing.brand")}</span><span>{t("landing.footer")}</span></footer>
    </main>
  );
}
