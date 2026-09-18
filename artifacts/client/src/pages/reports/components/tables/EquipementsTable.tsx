import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { computeEquipements } from "../../lib/calculations";
import { THead, MoneyCell, ReportCard, EmptyState } from "./Primitives";

export function EquipementsTable({
  data,
}: {
  data: ReturnType<typeof computeEquipements>;
}) {
  const { t } = useTranslation();
  if (data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  const totalMontant = data.reduce((s, r) => s + r.montant, 0);
  const totalAmo = data.reduce((s, r) => s + r.amortissement, 0);
  const totalNet = data.reduce((s, r) => s + r.valeurNette, 0);

  return (
    <ReportCard title={t("reports.title.equipements")}>
      <table className="w-full text-sm">
        <THead cols={[
          t("reports.col.purchaseDate"), t("reports.col.label"), t("reports.col.ref"),
          t("reports.col.originalValue"), t("reports.col.cumulatedDep"),
          t("reports.col.netValue"), t("reports.col.category"),
        ]} />
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
            <td className="px-3 py-2.5" colSpan={3}>{t("reports.totals")}</td>
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
