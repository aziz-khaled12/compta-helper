import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/format";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  ScrollText,
} from "lucide-react";
import type { LegalAlert, LegalAlertRelevance } from "@workspace/api-client-react";
import {
  documentHeading,
  explainMatch,
  journalReference,
  relevanceLabel,
} from "../lib/reason";

/**
 * Severity is carried by an icon and a word, not by colour alone — a red border
 * means nothing to a user who cannot distinguish it, and this is a list they are
 * meant to triage.
 */
const RELEVANCE_STYLES: Record<
  LegalAlertRelevance,
  { chip: string; icon: typeof AlertTriangle }
> = {
  HIGH: { chip: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  MEDIUM: { chip: "bg-amber-100 text-amber-700 border-amber-200", icon: Info },
  LOW: { chip: "bg-slate-100 text-slate-600 border-slate-200", icon: Info },
};

interface Props {
  alert: LegalAlert;
  onAcknowledge: (alert: LegalAlert) => void;
  isAcknowledging?: boolean;
}

export function LegalAlertCard({ alert, onAcknowledge, isAcknowledging }: Props) {
  const { t } = useTranslation();
  const { chip, icon: Icon } = RELEVANCE_STYLES[alert.relevance];
  const explanation = explainMatch(alert.matchedOn);
  const isAcknowledged = Boolean(alert.acknowledgedAt);

  return (
    <Card className={isAcknowledged ? "bg-muted/40 opacity-75" : "bg-card"}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-full bg-primary/10 shrink-0 mt-0.5">
              <ScrollText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {documentHeading(alert)}
              </p>
              {/* The full official title, not truncated to a code: this is the
                  line that tells the user what the text actually is. */}
              <h3 className="font-semibold leading-snug">
                {alert.titleFr || alert.titleAr || t("legal.untitled")}
              </h3>
              {alert.titleAr && (
                <p className="text-sm text-muted-foreground" dir="rtl" lang="ar">
                  {alert.titleAr}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="outline" className={`gap-1 ${chip}`}>
              <Icon className="h-3 w-3" />
              {relevanceLabel(alert.relevance)}
            </Badge>
            {isAcknowledged && (
              <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                {t("legal.acknowledged")}
              </Badge>
            )}
          </div>
        </div>

        {/* The plain-language summary is the reason this feature is usable at
            all — the official title is frequently unreadable to a non-lawyer. */}
        {alert.summaryFr && (
          <div className="rounded-lg border bg-background/60 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t("legal.summaryTitle")}
            </p>
            <p className="text-sm leading-relaxed">{alert.summaryFr}</p>
          </div>
        )}

        {/* Why it is here. Never the stored signals themselves — see lib/reason.ts. */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{explanation.headline}</p>
          {explanation.details.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {explanation.details.map((detail) => (
                <li key={detail}>• {detail}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 border-t">
          <p className="text-xs text-muted-foreground">
            {journalReference(alert)}
            {alert.publishedOn ? t("legal.publishedOn", { date: formatDate(alert.publishedOn) }) : ""}
          </p>

          {!isAcknowledged && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              disabled={isAcknowledging}
              onClick={() => onAcknowledge(alert)}
            >
              {isAcknowledging ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {t("legal.acknowledge")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
