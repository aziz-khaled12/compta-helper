import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { SEVERITY_LABELS, type Finding, type Severity } from "@/lib/analytics/types";

/**
 * The reports page's pointer to the analysis.
 *
 * Rapports is a document viewer: the user comes here to print a return. The
 * findings are a different question, so they live on `/analyse` — but the
 * reports page is where the user already is when they think to ask, so it
 * carries a one-line summary and a way through.
 *
 * Deliberately built on the detection half alone. Rendering a badge with a count
 * in it is not worth a Gemini call per reports-page visit, and the count is
 * identical either way because both surfaces read the same memo over the same
 * cached queries.
 */

/** Most urgent first — the same order the panel and detectors use. */
const ORDER: Severity[] = ["CRITICAL", "WARNING", "INFO"];

const DOT_STYLES: Record<Severity, string> = {
  CRITICAL: "bg-red-500",
  WARNING: "bg-amber-500",
  INFO: "bg-sky-500",
};

export function InsightsSummaryCard({ findings }: { findings: Finding[] }) {
  const counts = ORDER.map((severity) => ({
    severity,
    count: findings.filter((f) => f.severity === severity).length,
  })).filter((c) => c.count > 0);

  // `findings` already arrives sorted most urgent first.
  const leading = findings[0];

  if (!leading) {
    return (
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">
                Analyse automatique : rien à signaler
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Aucune anomalie détectée dans vos écritures sur cette période.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-semibold">Analyse automatique</p>
                {counts.map(({ severity, count }) => (
                  <span
                    key={severity}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${DOT_STYLES[severity]}`}
                    />
                    {count} {SEVERITY_LABELS[severity].toLowerCase()}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Le point le plus urgent —{" "}
                <Badge variant="secondary" className="align-middle font-normal">
                  {leading.title}
                </Badge>
              </p>
            </div>
          </div>

          <Link href="/analyse">
            <Button variant="outline" className="gap-2">
              Voir l'analyse
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
