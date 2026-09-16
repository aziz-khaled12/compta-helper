import { Card, CardContent } from "@/components/ui/card";
import { fmt } from "@/lib/ledger";

export function EmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground text-sm">
      Aucune donnée pour la période sélectionnée.
    </div>
  );
}

export function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b bg-[hsl(var(--primary))/0.08]">
        {cols.map((c, i) => (
          <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
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
            {typeof c === "number" ? fmt(c) : c}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}

export function MoneyCell({ v }: { v: number }) {
  return (
    <td className={`px-3 py-2 text-xs text-right tabular-nums ${v < 0 ? "text-destructive" : v > 0 ? "" : "text-muted-foreground"}`}>
      {v === 0 ? "–" : fmt(v)}
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
