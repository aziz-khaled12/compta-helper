import { toast } from "@/hooks/use-toast";
import i18n from "@/i18n";
import { exportFileBase } from "./file-name";
import type { InvoicePdfInput, PdfReportInput } from "./pdf";

/**
 * Table exports, shared by the reports and the journal.
 *
 * Both formats are loaded lazily: `jsPDF` and `xlsx` are several hundred
 * kilobytes each and most visits never export. The PDF layout itself lives in
 * `./pdf`; this file only owns the download and the toast.
 *
 * The toasts are translated rather than fixed French strings: unlike the
 * exported document itself — which is written for an accountant and is French
 * by design — they are UI, and an Arabic session has to read them in Arabic.
 */
export async function exportPDF(report: PdfReportInput) {
  try {
    const { buildReportPdf, pdfFileName } = await import("./pdf");
    const doc = buildReportPdf(report);
    doc.save(pdfFileName(report.reportLabel, report.period));
    toast({
      title: i18n.t("export.toast.success"),
      description: i18n.t("export.toast.pdfDone"),
    });
  } catch (error) {
    console.error("PDF Export Error:", error);
    toast({
      title: i18n.t("export.toast.error"),
      description: i18n.t("export.toast.pdfFailed"),
      variant: "destructive",
    });
  }
}

export async function exportInvoicePdf(invoice: InvoicePdfInput) {
  try {
    const { buildInvoicePdf } = await import("./pdf");
    const doc = buildInvoicePdf(invoice);
    doc.save(`${exportFileBase("Facture-" + invoice.invoiceNumber, invoice.date)}.pdf`);
    toast({
      title: i18n.t("export.toast.success"),
      description: i18n.t("export.toast.invoiceDone"),
    });
  } catch (error) {
    console.error("Invoice PDF Export Error:", error);
    toast({
      title: i18n.t("export.toast.error"),
      description: i18n.t("export.toast.invoiceFailed"),
      variant: "destructive",
    });
  }
}

export async function exportExcel(
  reportLabel: string,
  columns: string[],
  rows: (string | number)[][],
  summaryRow: (string | number)[] | null,
  period: string,
) {
  try {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [columns, ...rows];
    if (summaryRow) wsData.push(summaryRow);
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    XLSX.utils.book_append_sheet(wb, ws, reportLabel.slice(0, 31));
    XLSX.writeFile(wb, `${exportFileBase(reportLabel, period)}.xlsx`);
    toast({
      title: i18n.t("export.toast.success"),
      description: i18n.t("export.toast.excelDone"),
    });
  } catch (error) {
    console.error("Excel Export Error:", error);
    toast({
      title: i18n.t("export.toast.error"),
      description: i18n.t("export.toast.excelFailed"),
      variant: "destructive",
    });
  }
}
