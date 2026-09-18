import { useTranslation } from "react-i18next";
import { ReportId } from "../hooks/useReportFilters";
import { CaisseTable } from "./tables/CaisseTable";
import { StocksTable } from "./tables/StocksTable";
import { AchatsVentesTable } from "./tables/AchatsVentesTable";
import { ChargesTable } from "./tables/ChargesTable";
import { EquipementsTable } from "./tables/EquipementsTable";
import { BilanView } from "./tables/BilanView";
import { G50View } from "./tables/G50View";
import { G12View } from "./tables/G12View";

/** The identity fields a fiscal declaration has to print on its own header. */
export type ReportCompany = {
  nif?: string | null;
  ai?: string | null;
  address?: string | null;
} | null;

export function ReportView({
  reportId,
  data,
  period,
  companyName,
  company,
}: {
  reportId: ReportId;
  data: any;
  period: string;
  companyName: string;
  company?: ReportCompany;
}) {
  const { t } = useTranslation();
  switch (reportId) {
    case "caisse":
      return <CaisseTable data={data} title={t("reports.title.caisse")} />;
    case "banque":
      return <CaisseTable data={data} title={t("reports.title.banque")} />;
    case "stocks":
      return <StocksTable data={data} />;
    case "achats":
      return <AchatsVentesTable data={data} type="achats" />;
    case "ventes":
      return <AchatsVentesTable data={data} type="ventes" />;
    case "charges":
      return <ChargesTable data={data} />;
    case "equipements":
      return <EquipementsTable data={data} />;
    case "bilan":
      return <BilanView data={data} period={period} companyName={companyName} />;
    case "g50":
      return (
        <G50View
          data={data}
          period={period}
          companyName={companyName}
          nif={company?.nif ?? undefined}
          ai={company?.ai ?? undefined}
          address={company?.address}
        />
      );
    case "g12":
      return (
        <G12View
          data={data}
          period={period}
          companyName={companyName}
          nif={company?.nif ?? undefined}
          ai={company?.ai ?? undefined}
          address={company?.address}
        />
      );
    default:
      return null;
  }
}
