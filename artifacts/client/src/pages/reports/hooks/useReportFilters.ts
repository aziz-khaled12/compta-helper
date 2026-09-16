import { useState } from "react";

const now = new Date();
const DEFAULT_YEAR = now.getFullYear();

export const REPORT_TYPES = [
  { id: "caisse", label: "1 - Caisse (Livre de Caisse)" },
  { id: "banque", label: "2 - Banque (Livre de Banque)" },
  { id: "stocks", label: "3 - Stocks (Livre des Stocks)" },
  { id: "achats", label: "4 - Achats & Fournisseurs" },
  { id: "ventes", label: "5 - Ventes & Clients" },
  { id: "charges", label: "6 - Charges d'Exploitation" },
  { id: "equipements", label: "7 - Equipements & Amortissements" },
  { id: "bilan", label: "8 - Bilan & Compte de Résultat" },
  // Fiscal declarations. Which of these two a company may file follows its
  // régime d'imposition, not its legal form — see lib/taxRegime.ts. They are
  // listed here unconditionally and disabled per company in ReportControls.
  { id: "g50", label: "9 - G50 (Avis de versement)" },
  { id: "g12", label: "10 - G12 (Déclaration IFU)" },
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
