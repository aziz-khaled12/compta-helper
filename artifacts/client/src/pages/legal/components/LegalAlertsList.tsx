import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Building2, Scale } from "lucide-react";
import type { LegalState } from "../hooks/useLegalState";
import { LegalAlertCard } from "./LegalAlertCard";

interface Props {
  state: LegalState;
  /**
   * Whether the company has declared a sector.
   *
   * Passed in rather than fetched here so this component stays presentational —
   * and because the empty state's advice depends on it: with no sector declared
   * the feed can only ever contain texts that apply to every business, and
   * saying that is far more useful than a bare "nothing found".
   */
  hasSector: boolean;
}

export function LegalAlertsList({ state, hasSector }: Props) {
  const { t } = useTranslation();
  const { alerts, isLoading, isError, includeAcknowledged } = state;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="font-medium">{t("legal.list.errorTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("legal.list.errorDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Scale className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">
              {includeAcknowledged
                ? t("legal.list.emptyNone")
                : t("dashboard.legal.empty")}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t("legal.list.emptyNoneDesc")}
            </p>
          </div>

          {/* The honest failure mode: matching leans on the declared sector, so
              without one the feed is structurally near-empty. Better to say so
              than to let the user conclude the feature is broken. */}
          {!hasSector && (
            <div className="max-w-md mx-auto rounded-lg border bg-muted/40 p-4 text-left space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{t("legal.list.sectorTitle")}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("legal.list.sectorDesc")}
              </p>
              <Link href="/company">
                <Button variant="outline" size="sm" className="mt-1">
                  {t("legal.list.sectorCta")}
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <LegalAlertCard
          key={alert.id}
          alert={alert}
          onAcknowledge={state.acknowledgeAlert}
          isAcknowledging={state.acknowledgingId === alert.id}
        />
      ))}
    </div>
  );
}
