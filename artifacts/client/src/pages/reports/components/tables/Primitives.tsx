import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/money";
import { useTranslation } from "react-i18next";

export function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-12 text-muted-foreground text-sm">
      {t("reports.empty")}
    </div>
  );
}

/**
 * Report head row.
 *
 * `numeric` lists the indexes of the money columns: their header sits on the
 * same side as the figures below it (right, in both directions) instead of
 * following the text columns to the inline start.
 */
export function THead({
  cols,
  numeric = [],
}: {
  cols: string[];
  numeric?: number[];
}) {
  return (
    <thead>
      <tr className="border-b bg-[hsl(var(--primary))/0.08]">
        {cols.map((c, i) => (
          <th
            key={i}
            className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap ${
              numeric.includes(i) ? "text-right" : "text-left rtl:text-right"
            }`}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TFoot({ cols }: { cols: (string | number)[] }) {
  return (
    <tfoot>
      <tr className="border-t-2 bg-muted/40">
        {cols.map((c, i) => (
          <td key={i} className={`px-3 py-2.5 text-xs font-bold ${typeof c === "number" ? "text-right tabular-nums" : ""}`}>
            {typeof c === "number" ? <Money value={c} /> : c}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}

export function MoneyCell({ v }: { v: number }) {
  return (
    <td className={`px-3 py-2 text-xs text-right tabular-nums ${v < 0 ? "text-destructive" : v > 0 ? "" : "text-muted-foreground"}`}>
      {v === 0 ? "–" : <Money value={v} />}
    </td>
  );
}

export function ReportCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Card>
      {title && <div className="p-6 pb-2 font-semibold text-base">{title}</div>}
      <CardContent className={title ? "" : "pt-4"}>
        <div className="overflow-x-auto rounded-md border">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
