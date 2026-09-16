import { Card, CardContent } from "@/components/ui/card";
import { computeStocks } from "../../lib/calculations";
import { THead, TFoot, MoneyCell, ReportCard, EmptyState } from "./Primitives";

export function StocksTable({
  data,
}: {
  data: ReturnType<typeof computeStocks>;
}) {
  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title="Livre des Stocks">
      <table className="w-full text-sm">
        <THead cols={["Date", "Article", "Référence", "Entrée (+)", "Sortie (-)", "Solde Valeur", "Note"]} />
        <tbody>
          {data.data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs font-medium">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.entree} />
              <MoneyCell v={r.sortie} />
              <td className="px-3 py-2 text-xs text-right tabular-nums font-medium text-primary">
                {r.solde.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.obs}</td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", "TOTAUX", "", data.totalEntree, data.totalSortie, data.finalSolde, ""]} />
      </table>
    </ReportCard>
  );
}
