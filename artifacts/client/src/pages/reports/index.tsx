import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useGetCompany,
  useListTransactions,
  useListInventoryItems,
  useListInventoryMovements,
  useListAssets,
  useListPayrolls,
  useListFunding,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportFilters, REPORT_TYPES } from "./hooks/useReportFilters";
import { getMonths, monthLabel } from "@/lib/months";
import { rangeStart, rangeEnd } from "@/lib/ledger";
import {
  computeCaisseOrBanque, computeStocks, computeAchatsOrVentes, computeCharges,
  computeEquipements, computeBilan, computeG50, computeG12
} from "./lib/calculations";
import {
  getReportEligibility,
  IFU_CEILING,
  IFU_RATES,
} from "@/lib/taxRegime";
import { exportPDF, exportExcel } from "./lib/export";
import { ReportControls } from "./components/ReportControls";
import { ReportView } from "./components/ReportView";
import { InsightsSummaryCard } from "./components/InsightsSummaryCard";
import { useAnalysis } from "@/lib/analytics/useAnalysis";

export default function Reports() {
  const { t } = useTranslation();
  const filters = useReportFilters();
  const { data: company } = useGetCompany();
  const { data: txns = [], isLoading: loadingTxns } = useListTransactions();
  const { data: mvs = [], isLoading: loadingMvs } = useListInventoryMovements();
  const { data: items = [] } = useListInventoryItems();
  const { data: assets = [], isLoading: loadingAssets } = useListAssets();
  const { data: payrolls = [], isLoading: loadingPayrolls } = useListPayrolls();
  const { data: funding = [] } = useListFunding();

  const isLoading = loadingTxns || loadingMvs || loadingAssets || loadingPayrolls;

  const nameById = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);
  const mvsWithNames = useMemo(() => mvs.map((m) => ({ ...m, itemName: nameById.get(m.itemId) || m.itemId })), [mvs, nameById]);

  // Memoised so the eligibility and computation memos below actually hold: these
  // were rebuilt on every render, which invalidated all of them on every keystroke.
  const from = useMemo(() => rangeStart(filters.fromYear, filters.fromMonth), [filters.fromYear, filters.fromMonth]);
  const to = useMemo(() => rangeEnd(filters.toYear, filters.toMonth), [filters.toYear, filters.toMonth]);
  const months = useMemo(() => getMonths(), []);
  const period = `${months[filters.fromMonth - 1]} ${filters.fromYear} – ${months[filters.toMonth - 1]} ${filters.toYear}`;
  const companyName = company?.name || "DJERDJERA";

  // Which fiscal return this company may file — G12 under the forfaitaire
  // system, G50 under the réel, never both. The system the company declares on
  // its own record decides; see lib/taxRegime.ts.
  const eligibility = useMemo(
    () =>
      getReportEligibility(
        company?.legalForm,
        company?.taxRegime,
        txns,
        filters.toYear,
        from,
        to,
      ),
    [company?.legalForm, company?.taxRegime, txns, filters.toYear, from, to],
  );

  // A company can change régime between renders — crossing the IFU ceiling, or
  // having its legal form corrected on /company. Without this the picker would
  // sit on a now-disabled entry with no way back to an applicable one.
  const { reportId, setReportId } = filters;
  useEffect(() => {
    if (eligibility.disabled[reportId]) setReportId(eligibility.fiscalReportId);
  }, [eligibility, reportId, setReportId]);

  // Computations
  const computedData = useMemo(() => {
    switch (filters.reportId) {
      case "caisse": return computeCaisseOrBanque(txns as any, from, to, "CASH");
      case "banque": return computeCaisseOrBanque(txns as any, from, to, "BANK");
      case "stocks": return computeStocks(mvsWithNames as any, from, to);
      case "achats": return computeAchatsOrVentes(txns as any, from, to, "PURCHASE");
      case "ventes": return computeAchatsOrVentes(txns as any, from, to, "SALE");
      case "charges": return computeCharges(txns as any, payrolls as any, assets as any, from, to);
      case "equipements": return computeEquipements(assets as any);
      case "bilan": return computeBilan(txns as any, mvsWithNames as any, assets as any, payrolls as any, funding as any, from, to);
      case "g50": return computeG50(txns as any, payrolls as any, from, to);
      case "g12": return computeG12(txns as any, from, to);
      default: return null;
    }
  }, [filters.reportId, txns, mvsWithNames, assets, payrolls, funding, from, to]);

  // The summary card reads the same rows the reports are built from — it is a
  // second reading of one dataset, not a second dataset. It sits outside the
  // report switch deliberately: which report is selected changes what the table
  // shows, not what is wrong with the books.
  //
  // Detection only, never narration: this card shows a count and a link, and
  // spending a model call to decorate a badge would be absurd. The findings
  // themselves are on `/analyse`.
  const { findings } = useAnalysis(
    {
      txns: txns as any,
      mvs: mvsWithNames as any,
      items: items as any,
      assets: assets as any,
      payrolls: payrolls as any,
      company,
      from,
      to,
      periodRef: period,
    },
    !isLoading,
  );

  // Export helpers
  function getTableData() {
    const reportLabel = REPORT_TYPES.find((r) => r.id === filters.reportId)?.label || "";

    switch (filters.reportId) {
      case "caisse":
      case "banque": {
        const d = computedData as ReturnType<typeof computeCaisseOrBanque>;
        return {
          cols: ["Date", "Libellé", "Référence", "Encaissement (+)", "Décaissement (-)", "Solde", "Observation"],
          rows: d.data.map((r: any) => [r.date, r.label, r.ref, r.enc || "", r.dec || "", r.solde, r.obs]),
          summary: ["", "TOTAUX", "", d.totalEnc, d.totalDec, d.finalSolde, ""],
        };
      }
      case "stocks": {
        const d = computedData as ReturnType<typeof computeStocks>;
        return {
          cols: ["Date", "Libellé", "Référence", "Entrée (+)", "Sortie (-)", "Solde", "Observation"],
          rows: d.data.map((r: any) => [r.date, r.label, r.ref, r.entree || "", r.sortie || "", r.solde, r.obs]),
          summary: ["", "TOTAUX", "", d.totalEntree, d.totalSortie, d.finalSolde, ""],
        };
      }
      case "achats":
      case "ventes": {
        const d = computedData as ReturnType<typeof computeAchatsOrVentes>;
        const tva = filters.reportId === "achats" ? "TVA Déductible (19%)" : "TVA Collectée (19%)";
        return {
          cols: ["Date", "Libellé", "Tiers", "Référence", "Montant HT", tva, "Montant TTC", "Versements", "Reste à Payer"],
          rows: d.data.map((r: any) => [r.date, r.label, r.thirdParty || "", r.ref, r.ht, r.tva, r.ttc, r.versements, r.reste]),
          summary: ["", "TOTAUX", "", "", d.totals.ht, d.totals.tva, d.totals.ttc, d.totals.versements, d.totals.reste],
        };
      }
      case "charges": {
        const d = computedData as ReturnType<typeof computeCharges>;
        return {
          cols: ["Date", "Libellé", "Référence", "Montant", "Payé", "Reste à Payer", "Observation"],
          rows: d.data.map((r: any) => [r.date, r.label, r.ref, r.montant, r.paye, r.reste, r.obs]),
          summary: ["", "TOTAUX", "", d.totals.montant, d.totals.paye, d.totals.reste, ""],
        };
      }
      case "equipements": {
        const d = computedData as ReturnType<typeof computeEquipements>;
        return {
          cols: ["Date Achat", "Libellé", "Référence", "Valeur d'Origine", "Amortissement Cumulé", "Valeur Nette", "Catégorie"],
          rows: d.map((r: any) => [r.date, r.label, r.ref, r.montant, r.amortissement, r.valeurNette, r.obs]),
          summary: [
            "", "TOTAUX", "",
            d.reduce((s: number, r: any) => s + r.montant, 0),
            d.reduce((s: number, r: any) => s + r.amortissement, 0),
            d.reduce((s: number, r: any) => s + r.valeurNette, 0),
            "",
          ],
        };
      }
      case "bilan": {
        const d = computedData as ReturnType<typeof computeBilan>;
        const { actif, passif } = d.bilan;
        return {
          cols: ["Désignation (ACTIF)", "Montant (ACTIF)", "", "Désignation (PASSIF)", "Montant (PASSIF)", ""],
          rows: [
            ["Immobilisations (Net)", actif.immobilisations, "", "Capital", passif.capital, ""],
            ["Stocks", actif.stocks, "", "Résultat de l'Exercice", passif.resultat, ""],
            ["Créances Clients", actif.creances, "", "Emprunts", passif.emprunts, ""],
            ["Caisse", actif.caisse, "", "Dettes Fournisseurs", passif.dettes, ""],
            ["Banque", actif.banque, "", "TVA à Décaisser", passif.tvaNette, ""],
          ],
          summary: ["TOTAL ACTIF", actif.total, "", "TOTAL PASSIF", passif.total, ""],
        };
      }
      // The G50 is a box-structured bordereau, not a ledger — flattened to
      // Rubrique/Montant pairs, one group per month, the way BilanView does it.
      case "g50": {
        const d = computedData as ReturnType<typeof computeG50>;
        const rows: (string | number)[][] = [];
        for (const m of d.months) {
          rows.push([monthLabel(m.monthYear), ""]);
          rows.push(["  TVA collectée", m.tvaCollectee]);
          rows.push(["  TVA déductible", m.tvaDeductible]);
          rows.push([
            m.tvaNette >= 0 ? "  TVA nette à payer" : "  Crédit de TVA à reporter",
            Math.abs(m.tvaNette),
          ]);
          rows.push(["  Masse salariale brute", m.grossSalary]);
          rows.push(["  CNAS (part salariale)", m.cnas]);
          rows.push(["  IRG retenu à la source", m.irg]);
          rows.push([`  Total à verser — ${monthLabel(m.monthYear)}`, m.total]);
        }
        return {
          cols: ["Rubrique", "Montant (DA)"],
          rows,
          summary: ["TOTAL À VERSER", d.totals.total],
        };
      }
      case "g12": {
        const d = computedData as ReturnType<typeof computeG12>;
        return {
          cols: ["Rubrique", "Montant (DA)"],
          rows: [
            ["Chiffre d'affaires de la période", d.caTotal],
            ["TVA facturée", d.tvaCollectee],
            ["Plafond du régime IFU", IFU_CEILING],
            // The activity split is not derivable from the books — left blank
            // rather than apportioned arbitrarily.
            ...IFU_RATES.map((r) => [
              `IFU — ${r.label} (${(r.rate * 100).toLocaleString("fr-DZ")} %)`,
              "",
            ]),
          ],
          summary: ["Chiffre d'affaires à déclarer", d.caTotal],
        };
      }
      default: return { cols: null, rows: [], summary: null };
    }
  }

  async function handlePDF() {
    const wide = ["achats", "ventes", "bilan"].includes(filters.reportId);
    const { cols, rows, summary } = getTableData();
    const reportLabel = REPORT_TYPES.find((r) => r.id === filters.reportId)?.label || "";
    if (!cols) return;
    await exportPDF(reportLabel, cols, rows, summary, companyName, period, wide);
  }

  async function handleExcel() {
    const { cols, rows, summary } = getTableData();
    const reportLabel = REPORT_TYPES.find((r) => r.id === filters.reportId)?.label || "";
    if (!cols) return;
    await exportExcel(reportLabel, cols, rows, summary, period);
  }

  const isFiscal = filters.reportId === "g12" || filters.reportId === "g50";

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("reports.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("reports.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <ReportControls
              filters={filters}
              period={period}
              handleExcel={handleExcel}
              handlePDF={handlePDF}
              eligibility={eligibility}
          />
          <p className="text-xs text-muted-foreground mt-3">
            {t("reports.selectedPeriod")} : <span className="font-semibold text-foreground">{period}</span>
            {isFiscal && (
              <>
                {" · "}
                {t(`consts.taxRegime.${eligibility.regime}`)}{" "}
                — {t("reports.eligibilityHint")}
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <>
          <ReportView
            reportId={filters.reportId}
            data={computedData}
            period={period}
            companyName={companyName}
            company={company}
          />
          <InsightsSummaryCard findings={findings} />
        </>
      )}
    </div>
  );
}
