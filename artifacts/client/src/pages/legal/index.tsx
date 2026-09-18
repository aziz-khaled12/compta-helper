import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Scale } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetCompany } from "@workspace/api-client-react";
import { useLegalState } from "./hooks/useLegalState";
import { LegalAlertsList } from "./components/LegalAlertsList";

export default function Legal() {
  const { t } = useTranslation();
  const state = useLegalState();
  const { data: company } = useGetCompany();
  const { counts } = state;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Scale className="h-7 w-7 text-primary" />
            {t("legal.title")}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {t("legal.subtitle")}
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2"
          disabled={state.isRefreshing}
          onClick={state.refresh}
        >
          {state.isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("legal.refresh")}
        </Button>
      </div>

      {/* Counts are shown even at zero so the page reads as a live feed rather
          than an empty list that might be broken. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{counts.total}</span>{" "}
          {t("legal.count", { count: counts.total })}
        </span>
        {counts.high > 0 && (
          <span className="text-red-600 font-medium">{t("legal.highCount", { count: counts.high })}</span>
        )}
        {state.refreshedCount !== null && !state.isRefreshing && (
          <span>{t("legal.refreshed", { count: state.refreshedCount })}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="include-acknowledged"
          checked={state.includeAcknowledged}
          onCheckedChange={state.setIncludeAcknowledged}
        />
        <Label htmlFor="include-acknowledged" className="text-sm text-muted-foreground cursor-pointer">
          {t("legal.showAcknowledged")}
        </Label>
      </div>

      <LegalAlertsList state={state} hasSector={Boolean(company?.sectorCode)} />
    </div>
  );
}
