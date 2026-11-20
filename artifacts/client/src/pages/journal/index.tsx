import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDown, FileSpreadsheet, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetCompany } from "@workspace/api-client-react";
import { exportExcel, exportPDF } from "@/lib/export";
import { useJournalState } from "./hooks/useJournalState";
import { buildJournalExport } from "./lib/export";
import { TransactionForm } from "./components/TransactionForm";
import { JournalTable } from "./components/JournalTable";
import { PaymentModal } from "./components/PaymentModal";
import { PaymentDetailsModal } from "./components/PaymentDetailsModal";

export default function Journal() {
  const { t } = useTranslation();
  const state = useJournalState();
  const { setIsOpen } = state;
  const { data: company } = useGetCompany();

  // The export is printed under the company's name, like the report exports;
  // the product name only stands in before the company has loaded.
  const companyName = company?.name || t("landing.brand");

  // Both buttons export the tab in force, not the whole book: the user narrows
  // to what they are handing over — the sales invoices, say — and exports that.
  function currentExport() {
    return buildJournalExport(state.transactions, state.filter);
  }

  async function handlePDF() {
    const { reportLabel, columns, rows, summaryRow, period } = currentExport();
    await exportPDF({
      reportLabel,
      columns,
      rows,
      summaryRow,
      companyName,
      period,
      // Eleven columns, five of them money: portrait wraps the tiers column
      // onto three lines and pushes the totals over the page break.
      isLandscape: true,
    });
  }

  async function handleExcel() {
    const { reportLabel, columns, rows, summaryRow, period } = currentExport();
    await exportExcel(reportLabel, columns, rows, summaryRow, period);
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("journal.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("journal.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Excel
          </Button>
          <Button variant="outline" onClick={handlePDF} className="gap-2">
            <FileDown className="h-4 w-4 text-rose-600" />
            PDF
          </Button>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("journal.newEntry")}
          </Button>
        </div>
      </div>

      <TransactionForm state={state} />
      <PaymentModal state={state} />
      <PaymentDetailsModal state={state} company={company} />

      <Card className="bg-card">
        <CardContent className="p-0">
          <JournalTable state={state} />
        </CardContent>
      </Card>
    </div>
  );
}
