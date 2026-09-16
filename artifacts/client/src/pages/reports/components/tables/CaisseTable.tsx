import { Card, CardContent } from "@/components/ui/card";
import { computeCaisseOrBanque } from "../../lib/calculations";
import { THead, TFoot, MoneyCell, ReportCard, EmptyState } from "./Primitives";

export function CaisseTable({
  data, title,
}: {
  data: ReturnType<typeof computeCaisseOrBanque>;
  title: string;
}) {
  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title={title}>
      <table className="w-full text-sm">
        <THead cols={["Date", "Libellé", "Référence", "Encaissement (+)", "Décaissement (-)", "Solde", "Observation"]} />
        <tbody>
          {data.data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.enc} />
              <MoneyCell v={r.dec} />
              <td className={`px-3 py-2 text-xs text-right tabular-nums font-medium ${r.solde < 0 ? "text-destructive" : "text-primary"}`}>
                {r.solde.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.obs}</td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", "TOTAUX", "", data.totalEnc, data.totalDec, data.finalSolde, ""]} />
      </table>
    </ReportCard>
  );
}
