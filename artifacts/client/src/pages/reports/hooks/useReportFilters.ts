import { useState } from "react";

const now = new Date();
const DEFAULT_YEAR = now.getFullYear();

export const REPORT_TYPES = [
  { id: "caisse", label: "1 - Caisse (Livre de Caisse)", labelKey: "reports.types.caisse" },
  { id: "banque", label: "2 - Banque (Livre de Banque)", labelKey: "reports.types.banque" },
  { id: "stocks", label: "3 - Stocks (Livre des Stocks)", labelKey: "reports.types.stocks" },
  { id: "achats", label: "4 - Achats & Fournisseurs", labelKey: "reports.types.achats" },
  { id: "ventes", label: "5 - Ventes & Clients", labelKey: "reports.types.ventes" },
  { id: "charges", label: "6 - Charges d'Exploitation", labelKey: "reports.types.charges" },
  { id: "equipements", label: "7 - Equipements & Amortissements", labelKey: "reports.types.equipements" },
  { id: "bilan", label: "8 - Bilan & Compte de Résultat", labelKey: "reports.types.bilan" },
  // Fiscal declarations. Which of these two a company may file follows its
  // régime d'imposition, not its legal form — see lib/taxRegime.ts. They are
  // listed here unconditionally and disabled per company in ReportControls.
  { id: "g50", label: "9 - G50 (Avis de versement)", labelKey: "reports.types.g50" },
  { id: "g12", label: "10 - G12 (Déclaration IFU)", labelKey: "reports.types.g12" },
] as const;

export type ReportId = (typeof REPORT_TYPES)[number]["id"];

export function useReportFilters() {
  const [reportId, setReportId] = useState<ReportId>("caisse");
  const [fromYear, setFromYear] = useState(DEFAULT_YEAR);
  const [fromMonth, setFromMonth] = useState(1);
  const [toYear, setToYear] = useState(DEFAULT_YEAR);
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);

  return {
    reportId,
    setReportId,
    fromYear,
    setFromYear,
    fromMonth,
    setFromMonth,
    toYear,
    setToYear,
    toMonth,
    setToMonth,
    DEFAULT_YEAR,
  };
}
