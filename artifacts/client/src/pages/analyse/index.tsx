import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MONTHS } from "@/lib/months";
import { useAnalyseState } from "./hooks/useAnalyseState";
import { AnalysisKpiCards } from "./components/AnalysisKpiCards";
import { TrendChart, hasTrendData } from "./components/TrendChart";
import { InsightsPanel } from "./components/InsightsPanel";

/**
 * The assistant's own surface.
 *
 * The reports page answers "give me my books and my fiscal return" — documents.
 * This page answers a different question, "what looks wrong and where is it
 * going", and until now that answer lived in a panel at the bottom of a 19 KB
 * report viewer. Same rows, different question; they earn different pages.
 *
 * Everything here is computed in the browser from rows the page already has, so
 * no figure on this page can differ from the one in the reports for the same
 * period. The only thing sent to a model is the wording of the findings, never
 * the ledger.
 */
export default function Analyse() {
  const state = useAnalyseState();
  const { insights, isLoading } = state;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-primary" />
            Analyse
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Vos chiffres clés, leur évolution mois par mois, et les points qui
            méritent votre attention — expliqués en français courant. Tous les
            montants sont calculés à partir de vos écritures ; seul le
            commentaire est rédigé automatiquement.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">De</p>
          <div className="flex gap-2">
            <Select
              value={String(state.fromMonth)}
              onValueChange={(v) => state.setFromMonth(Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(state.fromYear)}
              onValueChange={(v) => state.setFromYear(Number(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">À</p>
          <div className="flex gap-2">
            <Select
              value={String(state.toMonth)}
              onValueChange={(v) => state.setToMonth(Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(state.toYear)}
              onValueChange={(v) => state.setToYear(Number(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-sm text-muted-foreground ml-auto">
          Période analysée :{" "}
          <span className="font-medium text-foreground">{state.period}</span>
        </p>
      </div>

      {isLoading ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="mt-2 h-3 w-48" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-[380px] w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </>
      ) : (
        <>
          <AnalysisKpiCards kpi={insights.kpi} />

          {/* An absent chart with a sentence explaining why reads as a fact; an
              empty axis frame reads as a broken page. */}
          {hasTrendData(insights.kpi.months) ? (
            <TrendChart months={insights.kpi.months} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Pas encore de données sur cette période — élargissez la plage de
                dates ou enregistrez vos premières opérations.
              </CardContent>
            </Card>
          )}

          {/* The panel brings its own heading and count, so nothing is wrapped
              around it here. */}
          <InsightsPanel
            findings={insights.findings}
            narrative={insights.narrative}
            isNarrating={insights.isNarrating}
            narrationUnavailable={insights.narrationUnavailable}
            periodRef={state.period}
          />
        </>
      )}
    </div>
  );
}
