import { Link } from "wouter";
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
          <p className="font-medium">Impossible de charger les textes juridiques</p>
          <p className="text-sm text-muted-foreground">
            Vérifiez votre connexion, puis réessayez.
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
                ? "Aucun texte pour le moment"
                : "Aucun texte à examiner"}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Nous surveillons le Journal Officiel algérien et nous vous
              signalerons ici les textes qui concernent votre entreprise.
            </p>
          </div>

          {/* The honest failure mode: matching leans on the declared sector, so
              without one the feed is structurally near-empty. Better to say so
              than to let the user conclude the feature is broken. */}
          {!hasSector && (
            <div className="max-w-md mx-auto rounded-lg border bg-muted/40 p-4 text-left space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Précisez votre secteur d'activité</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Sans secteur renseigné, nous ne pouvons pas filtrer les textes
                qui visent votre métier — vous ne verrez que ceux qui concernent
                toutes les entreprises.
              </p>
              <Link href="/company">
                <Button variant="outline" size="sm" className="mt-1">
                  Renseigner mon activité
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
