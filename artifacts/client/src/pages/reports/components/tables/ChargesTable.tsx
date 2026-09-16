import { Card, CardContent } from "@/components/ui/card";
import { computeCharges } from "../../lib/calculations";
import { THead, TFoot, MoneyCell, ReportCard, EmptyState } from "./Primitives";

export function ChargesTable({
  data,
}: {
  data: ReturnType<typeof computeCharges>;
}) {
  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title="Livre des Charges d'Exploitation">
      <table className="w-full text-sm">
        <THead cols={["Date", "Libellé", "Référence", "Montant", "Payé", "Reste à Payer", "Observation"]} />
        <tbody>
          {data.data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.montant} />
              <MoneyCell v={r.paye} />
              <td className={`px-3 py-2 text-xs text-right tabular-nums ${r.reste > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {r.reste > 0 ? r.reste.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA" : "–"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">{r.obs}</td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", "TOTAUX", "", data.totals.montant, data.totals.paye, data.totals.reste, ""]} />
      </table>
    </ReportCard>
  );
}
