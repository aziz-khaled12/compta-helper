import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info, Scale, ShieldCheck } from "lucide-react";
import { useListLegalAlerts } from "@workspace/api-client-react";
import {
  documentHeading,
  relevanceLabel,
} from "@/pages/legal/lib/reason";

/**
 * Dashboard preview of the legal feed.
 *
 * Three alerts, not all of them: this card's job is to make the user aware there
 * is something to look at, and the `/legal` page is where they actually read it.
 * A dashboard that lists everything stops being a dashboard.
 */
export function LegalAlertsCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useListLegalAlerts({});
  const alerts = data ?? [];
  const preview = alerts.slice(0, 3);

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {t("dashboard.legal.title")}
          </CardTitle>
          {alerts.length > 0 && (
            <Link href="/legal">
              <Button variant="outline" size="sm">
                {t("dashboard.legal.viewAll")}
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.legal.loading")}</p>
        ) : preview.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-medium">{t("dashboard.legal.empty")}</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {t("dashboard.legal.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {preview.map((alert) => {
              const isHigh = alert.relevance === "HIGH";
              const Icon = isHigh ? AlertTriangle : Info;
              return (
                <Link key={alert.id} href="/legal">
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-background/50 hover:bg-accent/40 transition-colors cursor-pointer">
                    <div
                      className={`p-2 rounded-full shrink-0 ${
                        isHigh
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {documentHeading(alert)}
                      </p>
                      <p className="text-sm font-medium line-clamp-2 leading-snug">
                        {alert.titleFr || alert.titleAr || t("dashboard.legal.untitled")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ml-auto ${
                        isHigh
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                      }`}
                    >
                      {relevanceLabel(alert.relevance)}
                    </Badge>
                  </div>
                </Link>
              );
            })}

            {alerts.length > preview.length && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                {t("dashboard.legal.more", { count: alerts.length - preview.length })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
