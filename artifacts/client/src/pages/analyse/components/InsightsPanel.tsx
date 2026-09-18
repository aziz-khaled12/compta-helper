import { useMemo } from "react";
import type { InsightsNarrative } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Lightbulb, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { knowledgeFor } from "@/lib/analytics/knowledge-base";
import type { Finding, Severity } from "@/lib/analytics/types";

/**
 * What the owner reads.
 *
 * Every card carries its own explanation, and that is not decoration — it is the
 * product constraint this whole feature was built around. The reader runs a
 * business; they are not an accountant and they cannot look up what a finding
 * means. So a card never shows a code, never shows a bare figure, and never
 * shows a title without saying what to do about it. The explanation comes from
 * the knowledge base, which is in the repo, which is why this panel is still
 * worth reading when Gemini is unreachable.
 */

/** Ordered most urgent first, matching the sort the detectors already applied. */
const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  WARNING: "bg-amber-100 text-amber-900 border-amber-200",
  INFO: "bg-sky-100 text-sky-900 border-sky-200",
};

interface InsightsPanelProps {
  findings: Finding[];
  narrative: InsightsNarrative | undefined;
  isNarrating: boolean;
  narrationUnavailable: boolean;
  periodRef: string;
}

export function InsightsPanel({
  findings,
  narrative,
  isNarrating,
  narrationUnavailable,
  periodRef,
}: InsightsPanelProps) {
  const { t } = useTranslation();
  // Grouped by severity so the page can be read top-down and abandoned at any
  // point without missing the urgent part.
  const grouped = useMemo(() => {
    const order: Severity[] = ["CRITICAL", "WARNING", "INFO"];
    return order
      .map((severity) => ({
        severity,
        items: findings.filter((f) => f.severity === severity),
      }))
      .filter((group) => group.items.length > 0);
  }, [findings]);

  const priorityByRule = useMemo(
    () => new Map((narrative?.priorities ?? []).map((p) => [p.ruleId, p])),
    [narrative],
  );

  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{t("analyse.panel.noAnomalies")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("analyse.panel.noAnomaliesDesc", { period: periodRef })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">
          {t("analyse.panel.title")}
        </h2>
        <Badge variant="secondary">{findings.length}</Badge>
      </div>

      {/*
        The summary is the model's only contribution to this panel. When it is
        missing — no key, rate limit, offline — the panel simply starts one line
        lower, and nothing below it is any less complete.
      */}
      {narrative?.summary ? (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm leading-relaxed">
          {narrative.summary}
        </div>
      ) : isNarrating ? (
        <p className="text-xs text-muted-foreground">
          {t("analyse.panel.writingSummary")}
        </p>
      ) : narrationUnavailable ? (
        <p className="text-xs text-muted-foreground">
          {t("analyse.panel.summaryUnavailable")}
        </p>
      ) : null}

      {grouped.map((group) => (
        <div key={group.severity} className="space-y-2">
          <div className="flex items-center gap-2 pt-1">
            <Badge className={SEVERITY_STYLES[group.severity]}>
              {/** {@code t()} with the enum value as the leaf — never the
                  stored value itself, which does not change with the locale. */}
              {t(`consts.insight.severity.${group.severity}`)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t("analyse.panel.findingsCount", { count: group.items.length })}
            </span>
          </div>
          {group.items.map((f, i) => (
            <FindingCard
              key={`${f.ruleId}-${f.subject ?? i}`}
              finding={f}
              priority={priorityByRule.get(f.ruleId)}
              defaultOpen={group.severity === "CRITICAL" && i === 0}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function FindingCard({
  finding,
  priority,
  defaultOpen,
}: {
  finding: Finding;
  priority: InsightsNarrative["priorities"][number] | undefined;
  defaultOpen: boolean;
}) {
  // A rule with no knowledge-base entry cannot exist — `RuleId` makes it a
  // compile error — but the lookup is still guarded, because a missing
  // explanation is exactly the case where showing nothing is the right answer.
  const { t } = useTranslation();
  const kb = knowledgeFor(finding.ruleId as Parameters<typeof knowledgeFor>[0]);

  return (
    <Card>
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div className="space-y-1 min-w-0">
              <p className="font-medium leading-snug">{finding.title}</p>
              {finding.subject && (
                <p className="text-sm text-muted-foreground truncate">
                  {finding.subject}
                </p>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 mt-1 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {finding.evidence.length > 0 && (
              <ul className="text-sm space-y-1">
                {finding.evidence.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-md bg-muted/50 px-3 py-2.5 text-sm leading-relaxed">
              {kb.explanation}
            </div>

            {/*
              The model's per-finding contribution: why this one matters for
              *this* business. It sits above the standard remedy because it is
              the part that is specific, and it is absent whenever narration is.
            */}
            {priority && (
              <div className="text-sm space-y-1 rounded-md border-l-2 border-primary/40 pl-3">
                <p className="leading-relaxed">{priority.whyItMatters}</p>
                <p className="font-medium">{priority.action}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("analyse.panel.whatToDo")}
              </p>
              <ol className="text-sm space-y-1.5 list-decimal list-inside">
                {kb.remediation.map((step, i) => (
                  <li key={i} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {kb.reference && (
              <p className="text-xs text-muted-foreground border-t pt-2">
                {kb.reference}
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
