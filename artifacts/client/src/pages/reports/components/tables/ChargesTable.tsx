import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { computeCharges } from "../../lib/calculations";
import { THead, TFoot, MoneyCell, ReportCard, EmptyState } from "./Primitives";

export function ChargesTable({
  data,
}: {
  data: ReturnType<typeof computeCharges>;
}) {
  const { t } = useTranslation();
  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title={t("reports.title.charges")}>
      <table className="w-full text-sm">
        <THead cols={[
          t("reports.col.date"), t("reports.col.label"), t("reports.col.ref"),
          t("reports.col.amount"), t("reports.col.paid"), t("reports.col.remaining"),
          t("reports.col.observation"),
        ]} />
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
        <TFoot cols={["", t("reports.totals"), "", data.totals.montant, data.totals.paye, data.totals.reste, ""]} />
      </table>
    </ReportCard>
  );
}
