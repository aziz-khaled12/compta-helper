import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/money";
import { useTranslation } from "react-i18next";
import { computeAchatsOrVentes } from "../../lib/calculations";
import { THead, TFoot, MoneyCell, ReportCard, EmptyState } from "./Primitives";

export function AchatsVentesTable({
  data, type,
}: {
  data: ReturnType<typeof computeAchatsOrVentes>;
  type: "achats" | "ventes";
}) {
  const { t } = useTranslation();
  const isAchats = type === "achats";
  const title = isAchats ? t("reports.title.achats") : t("reports.title.ventes");
  const tvaLabel = isAchats ? t("reports.col.tvaDeductible") : t("reports.col.tvaCollected");

  if (data.data.length === 0) return <Card><CardContent className="pt-6"><EmptyState /></CardContent></Card>;
  return (
    <ReportCard title={title}>
      <table className="w-full text-sm">
        <THead
          cols={[
            t("reports.col.date"), t("reports.col.label"), t("reports.col.tiers"),
            t("reports.col.ref"), t("reports.col.amountHt"), tvaLabel,
            t("reports.col.amountTtc"), t("reports.col.payments"), t("reports.col.remaining"),
          ]}
          numeric={[4, 5, 6, 7, 8]}
        />
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
                {r.reste > 0 ? <Money value={r.reste} /> : "–"}
              </td>
            </tr>
          ))}
        </tbody>
        <TFoot cols={["", t("reports.totals"), "", "", data.totals.ht, data.totals.tva, data.totals.ttc, data.totals.versements, data.totals.reste]} />
      </table>
    </ReportCard>
  );
}
