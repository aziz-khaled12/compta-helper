import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REPORT_TYPES, useReportFilters } from "../hooks/useReportFilters";
import { MONTHS } from "@/lib/months";
import type { ReportEligibility } from "@/lib/taxRegime";
import { fmt } from "@/lib/ledger";
import { FileDown, FileSpreadsheet, Info, AlertTriangle } from "lucide-react";

export function ReportControls({
    filters,
    handleExcel,
    handlePDF,
    period,
    eligibility,
}: {
    filters: ReturnType<typeof useReportFilters>;
    handleExcel: () => void;
    handlePDF: () => void;
    period: string;
    eligibility: ReportEligibility;
}) {
  const years = Array.from({ length: 8 }, (_, i) => filters.DEFAULT_YEAR - 3 + i);

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[220px]">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Type de rapport</p>
        <Select value={filters.reportId} onValueChange={(v) => filters.setReportId(v as any)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map((r) => {
              // A fiscal form that does not apply to this company stays visible
              // but unselectable, so the user learns *why* it is missing rather
              // than wondering whether the app has it at all.
              const reason = eligibility.disabled[r.id];
              return (
                <SelectItem key={r.id} value={r.id} disabled={!!reason}>
                  <span className="flex flex-col gap-0.5 py-0.5">
                    <span>{r.label}</span>
                    {reason && (
                      <span className="max-w-[380px] text-xs font-normal leading-snug text-muted-foreground">
                        {reason}
                      </span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">De</p>
        <div className="flex gap-2">
          <Select value={String(filters.fromMonth)} onValueChange={(v) => filters.setFromMonth(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(filters.fromYear)} onValueChange={(v) => filters.setFromYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">À</p>
        <div className="flex gap-2">
          <Select value={String(filters.toMonth)} onValueChange={(v) => filters.setToMonth(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(filters.toYear)} onValueChange={(v) => filters.setToYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 ml-auto">
        <Button variant="outline" onClick={handleExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Excel
        </Button>
        <Button variant="outline" onClick={handlePDF} className="gap-2">
          <FileDown className="h-4 w-4 text-rose-600" />
          PDF
        </Button>
      </div>

      {/* Why this company files the return it does, and what the turnover behind
          the decision was read from — see `basisLabel`, which is not always the
          selected period. */}
      <div className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-xs">
        <p className="font-medium text-foreground">
          {eligibility.regime === "FORFAITAIRE"
            ? "Régime forfaitaire (IFU)"
            : "Régime réel"}{" "}
          — CA {eligibility.basisLabel} :{" "}
          <span className="tabular-nums">{fmt(eligibility.turnover)}</span>
          {!eligibility.declared && (
            <span className="ml-1 font-normal text-muted-foreground">
              (système fiscal non déclaré — déduit de la forme juridique)
            </span>
          )}
        </p>
        <p className="mt-1 text-muted-foreground">{eligibility.reason}.</p>
        {eligibility.warning && (
          <p className="mt-1 flex gap-1.5 font-medium text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{eligibility.warning}</span>
          </p>
        )}
        <p className="mt-1 flex gap-1.5 text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{eligibility.note}</span>
        </p>
      </div>
    </div>
  );
}
