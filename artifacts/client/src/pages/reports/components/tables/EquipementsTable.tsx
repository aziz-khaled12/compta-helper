import { Card, CardContent } from "@/components/ui/card";
import { computeEquipements } from "../../lib/calculations";
import { THead, MoneyCell, ReportCard, EmptyState } from "./Primitives";

export function EquipementsTable({
  data,
}: {
  data: ReturnType<typeof computeEquipements>;
}) {
  if (data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  const totalMontant = data.reduce((s, r) => s + r.montant, 0);
  const totalAmo = data.reduce((s, r) => s + r.amortissement, 0);
  const totalNet = data.reduce((s, r) => s + r.valeurNette, 0);

  return (
    <ReportCard title="Tableau des Equipements & Amortissements">
      <table className="w-full text-sm">
        <THead cols={["Date Achat", "Libellé", "Référence", "Valeur d'Origine", "Amortissement Cumulé", "Valeur Nette", "Catégorie"]} />
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 text-xs font-medium">{r.label}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.ref}</td>
              <MoneyCell v={r.montant} />
              <td className="px-3 py-2 text-xs text-right tabular-nums text-orange-600">
                {r.amortissement.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA"}
              </td>
              <td className="px-3 py-2 text-xs text-right tabular-nums font-semibold text-primary">
                {r.valeurNette.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.obs}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 bg-muted/40 font-bold text-xs">
            <td className="px-3 py-2.5" colSpan={3}>TOTAUX</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{totalMontant.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA"}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{totalAmo.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA"}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{totalNet.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA"}</td>
            <td className="px-3 py-2.5"></td>
          </tr>
        </tfoot>
      </table>
    </ReportCard>
  );
}
