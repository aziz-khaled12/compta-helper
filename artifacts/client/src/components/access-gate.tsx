import { CheckCircle2, LockKeyhole } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPassDate, type AccessPass } from "@/lib/access-pass";

const STEPS = ["gate.step1", "gate.step2", "gate.step3"] as const;

/**
 * Shown instead of the login/register tabs while no active subscription pass
 * exists. Paying is the only way in — that is the whole point of the gate.
 */
export function AccessGate() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_15%_10%,hsl(var(--landing-cyan)/.16),transparent_34%),hsl(var(--background))] p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-3 text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt={t("landing.brand")}
              className="h-20 w-auto rounded-xl object-contain mix-blend-multiply"
            />
          </Link>
          <p className="text-sm text-muted-foreground">{t("auth.tagline")}</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="items-center pb-4 text-center">
            <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f4fb] text-[#087fbb]">
              <LockKeyhole className="h-6 w-6" aria-hidden="true" />
            </span>
            <CardTitle className="text-xl">{t("gate.title")}</CardTitle>
            <CardDescription className="leading-6">
              {t("gate.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ol className="space-y-3 text-sm text-[#34506b]">
              {STEPS.map((key, index) => (
                <li key={key} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fdf3dd] text-[11px] font-bold text-[#a97812]">
                    {index + 1}
                  </span>
                  <span className="leading-5">{t(key)}</span>
                </li>
              ))}
            </ol>

            <Button
              asChild
              className="h-11 w-full bg-[#087fbb] text-sm text-white shadow-none hover:bg-[#066c9f]">
              <Link href="/pricing">{t("gate.cta")}</Link>
            </Button>

            <Link
              href="/"
              className="block text-center text-xs font-medium text-[#53627a] transition-colors hover:text-[#087fbb]">
              {t("gate.backHome")}
            </Link>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {t("auth.secureNote")}
        </p>
      </div>
    </div>
  );
}

/** Receipt strip shown above the login card once a pass is active. */
export function PassBanner({ pass }: { pass: AccessPass }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-[#cbe9d8] bg-[#edf9f2] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#0f7a52]">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t("gate.activeTitle")}
      </p>
      <p className="mt-1.5 text-xs leading-5 text-[#2f6f57]">
        {t("gate.activeDesc", { bundle: t(`bundle.${pass.bundleId}.name`) })}
      </p>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[#2f6f57]">
        <div>
          <dt className="opacity-70">{t("gate.reference")}</dt>
          <dd className="font-semibold" dir="ltr">
            {pass.reference}
          </dd>
        </div>
        <div>
          <dt className="opacity-70">{t("gate.validUntil")}</dt>
          <dd className="font-semibold">{formatPassDate(pass.expiresAt)}</dd>
        </div>
      </dl>
    </div>
  );
}
