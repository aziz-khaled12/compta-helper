import { toast } from "@/hooks/use-toast";
import { fmt } from "@/lib/ledger";

export async function exportPDF(
  reportLabel: string,
  columns: string[],
  rows: (string | number)[][],
  summaryRow: (string | number)[] | null,
  companyName: string,
  period: string,
  isLandscape = false,
) {
  try {
    const { jsPDF } = await import("jspdf");
    const { autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString("fr-DZ");

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(companyName.toUpperCase(), pageW / 2, 18, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(reportLabel, pageW / 2, 26, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Période : ${period}     |     Généré le : ${today}`, pageW / 2, 33, { align: "center" });
    doc.setTextColor(0);
    doc.line(14, 36, pageW - 14, 36);

    const bodyRows = rows.map((r) =>
      r.map((v) => (typeof v === "number" ? fmt(v) : (v || ""))),
    );
    const footRows = summaryRow
      ? [summaryRow.map((v) => (typeof v === "number" ? fmt(v) : (v || "")))]
      : [];

    autoTable(doc, {
      startY: 40,
      head: [columns],
      body: bodyRows,
      foot: footRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 75, 71], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    doc.save(`${reportLabel.replace(/\s+/g, "_")}_${period}.pdf`);
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
