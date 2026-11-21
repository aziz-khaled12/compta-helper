import type { ReactNode } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Price } from "@/components/price";
import { ADDON_PRICE, serviceMeta, type ServiceId } from "@/lib/plans";
import { useSubscription } from "@/lib/subscription";

/** Route guard: renders the paywall instead of a service the pass excludes. */
export function RequireService({
  service,
  children,
}: {
  service: ServiceId;
  children: ReactNode;
}) {
  const { canUse } = useSubscription();
  return canUse(service) ? <>{children}</> : <LockedService service={service} />;
}

/**
 * The page shown in place of a service the current pack does not include.
 * It names the service, prices its add-on and hands off to `/subscription`,
 * which opens the purchase dialog straight on that service (`?add=`).
 */
export function LockedService({ service }: { service: ServiceId }) {
  const { t } = useTranslation();
  const meta = serviceMeta(service);

  return (
    <Card className="mx-auto mt-6 max-w-xl">
      <CardHeader className="items-center text-center">
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf3dd] text-[#a97812]">
          <LockKeyhole className="h-6 w-6" aria-hidden="true" />
        </span>
        <CardTitle className="text-xl">{t("locked.title")}</CardTitle>
        <CardDescription className="leading-6">
          {t("locked.description", { service: t(meta.nameKey) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">{t("locked.addon")}</span>
          <span className="flex items-baseline gap-1.5">
            <Price amount={ADDON_PRICE} className="text-lg font-bold" />
            <span className="text-xs text-muted-foreground">
              {t("pricing.perMonth")}
            </span>
          </span>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          {t("locked.fullPack")}
        </p>

        <Button asChild className="w-full">
          <Link href={`/subscription?add=${service}`}>{t("locked.cta")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
