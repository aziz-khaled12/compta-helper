import { Card, CardContent } from "@/components/ui/card";
import { computeAchatsOrVentes } from "../../lib/calculations";
import { THead, TFoot, MoneyCell, ReportCard, EmptyState } from "./Primitives";

export function AchatsVentesTable({
  data, type,
}: {
  data: ReturnType<typeof computeAchatsOrVentes>;
  type: "achats" | "ventes";
}) {
  const isAchats = type === "achats";
  const title = isAchats ? "Livre des Achats & Fournisseurs" : "Livre des Ventes & Clients";
  const tvaLabel = isAchats ? "TVA Déductible (19%)" : "TVA Collectée (19%)";

  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title={title}>
      <table className="w-full text-sm">
        <THead cols={["Date", "Libellé", "Tiers", "Référence", "Montant HT", tvaLabel, "Montant TTC", "Versements", "Reste à Payer"]} />
        <tbody>
          {data.data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.thirdParty}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.ht} />
              <MoneyCell v={r.tva} />
              <MoneyCell v={r.ttc} />
              <MoneyCell v={r.versements} />
              <td className={`px-3 py-2 text-xs text-right tabular-nums ${r.reste > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {r.reste > 0 ? r.reste.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA" : "–"}
              </td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", "TOTAUX", "", "", data.totals.ht, data.totals.tva, data.totals.ttc, data.totals.versements, data.totals.reste]} />
      </table>
    </ReportCard>
  );
}
