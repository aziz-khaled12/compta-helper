import { toast } from "@/hooks/use-toast";
import type { PdfReportInput } from "./pdf";

/**
 * Report exports. Both formats are loaded lazily: `jsPDF` and `xlsx` are
 * several hundred kilobytes each and most visits to /reports never export.
 * The PDF layout itself lives in `./pdf`; this file only owns the download and
 * the toast.
 */
export async function exportPDF(report: PdfReportInput) {
  try {
    const { buildReportPdf, pdfFileName } = await import("./pdf");
    const doc = buildReportPdf(report);
    doc.save(pdfFileName(report.reportLabel, report.period));
    toast({ title: "Succès", description: "Le fichier PDF a été généré." });
  } catch (error) {
    console.error("PDF Export Error:", error);
    toast({
      title: "Erreur",
      description: "Impossible de générer le PDF. Vérifiez la console.",
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
    XLSX.writeFile(wb, `${reportLabel.replace(/\s+/g, "_")}_${period}.xlsx`);
    toast({ title: "Succès", description: "Le fichier Excel a été généré." });
  } catch (error) {
    console.error("Excel Export Error:", error);
    toast({
      title: "Erreur",
      description: "Impossible de générer le fichier Excel.",
      variant: "destructive",
    });
  }
}
