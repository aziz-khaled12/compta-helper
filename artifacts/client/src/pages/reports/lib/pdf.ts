import { jsPDF } from "jspdf";
import { autoTable, type RowInput, type Styles, type UserOptions } from "jspdf-autotable";

/**
 * PDF rendering for the report exports.
 *
 * jsPDF's built-in Helvetica is a single-byte (WinAnsi) font: it has no glyph
 * for the narrow no-break space `fr-DZ` uses to group thousands, so a raw
 * `exactMoney()` string reaches the PDF as `1/250/000/00 DA` — jsPDF truncates
 * the unsupported code point to its low byte (`U+202F & 0xFF = "/"`). Every
 * string therefore goes through `pdfText()` first, which maps the Unicode
 * spaces to the *non-breaking* space the font does have (so an amount never
 * wraps across two lines) and drops zero-width characters.
 *
 * The layout is shared by all ten reports: identity block, period band, table
 * with a right-aligned numeric side, a head repeated on every page and a page
 * footer. Amounts are printed exactly (never the compacted `12,35 M` form)
 * because the PDF is handed to an accountant; the currency is stated once,
 * above the table, instead of being repeated in every cell.
 */

const MARGIN = 14;
const INK: [number, number, number] = [23, 43, 42];
const ACCENT: [number, number, number] = [26, 75, 71];
const MUTED: [number, number, number] = [100, 116, 115];
const RULE: [number, number, number] = [214, 223, 222];
const BAND: [number, number, number] = [244, 247, 246];
const ZEBRA: [number, number, number] = [248, 250, 250];
const GROUP_BG: [number, number, number] = [232, 240, 238];
const FOOT_BG: [number, number, number] = [229, 238, 236];

/** Unicode spaces jsPDF cannot encode; `U+00A0` is the one it can. */
const SPACE_CHARS = /[\u2000-\u200A\u202F\u205F\u3000]/g;
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Make a string drawable by the built-in Helvetica: no-break spaces keep their
 * grouping but become `U+00A0` (present in WinAnsi, no line break), and
 * zero-width/control characters are dropped.
 */
export function pdfText(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(SPACE_CHARS, "\u00A0")
    .replace(ZERO_WIDTH, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/** Exact, two decimals, no currency — `1 250 000,00` with a non-breaking space. */
export function pdfAmount(value: number): string {
  return pdfText(
    value.toLocaleString("fr-DZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
}

/** `2026-01-12` -> `12/01/2026`; anything else is returned untouched. */
export function pdfDate(value: string): string {
  const match = ISO_DATE.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

const CELL_PADDING = { top: 1.7, right: 2.2, bottom: 1.7, left: 2.2 };
const INDENT = 3.6;

function cellText(value: string | number | null | undefined): string {
  if (typeof value === "number") return pdfAmount(value);
  // The G50 indents its rubriques with two leading spaces; the table turns
  // that into cell padding, so the indentation survives wrapping.
  return pdfDate(pdfText(value).trimStart());
}

function isBlank(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

export type PdfReportInput = {
  /** Title printed under the company name, e.g. `1 - Caisse (Livre de Caisse)`. */
  reportLabel: string;
  columns: string[];
  rows: (string | number)[][];
  summaryRow?: (string | number)[] | null;
  companyName: string;
  /** Already formatted for display, e.g. `Janvier 2026 – Décembre 2026`. */
  period: string;
  isLandscape?: boolean;
  /** Body row indices that introduce a group (the G50's month headings). */
  groupRows?: number[];
};

/** Build (but do not save) the PDF for one report. */
export function buildReportPdf({
  reportLabel,
  columns,
  rows,
  summaryRow,
  companyName,
  period,
  isLandscape = false,
  groupRows = [],
}: PdfReportInput): jsPDF {
  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const generatedOn = new Date().toLocaleDateString("fr-DZ");

  doc.setProperties({
    title: `${reportLabel} — ${period}`,
    subject: `${companyName} — ${reportLabel}`,
    author: companyName,
    creator: "Djerdjera",
  });

  drawIdentity(doc, pageW, companyName, reportLabel, period, generatedOn);

  // A literal spacer column (the bilan carries two, one between ACTIF and
  // PASSIF) collapses to zero width and squeezes both halves of the page.
  // Drop fully-empty columns and turn the gap into a divider on the column
  // that follows it.
  const kept = columns
    .map((_, index) => index)
    .filter(
      (index) =>
        !(
          isBlank(columns[index]) &&
          rows.every((row) => isBlank(row[index])) &&
          (summaryRow ? isBlank(summaryRow[index]) : true)
        ),
    );

  const pick = (row: (string | number)[]) => kept.map((index) => row[index] ?? "");

  const head = kept.map((index) => pdfText(columns[index]));
  const body = rows.map(pick);
  const foot = summaryRow ? [pick(summaryRow)] : [];
  const indented = body.map((row) =>
    row.map((value) => typeof value === "string" && /^\s{2,}/.test(value)),
  );
  const renderedRows = body.map((row) => row.map(cellText));
  const renderedBody: RowInput[] = renderedRows.length
    ? renderedRows
    : [
        [
          {
            content: "Aucune donnée pour la période sélectionnée.",
            colSpan: kept.length,
            styles: { halign: "center", fontStyle: "italic", textColor: MUTED, minCellHeight: 12 },
          },
        ],
      ];
  const renderedFoot = foot.map((row) => row.map(cellText));

  // Every numeric cell in these reports is money, so a column is numeric when
  // it holds numbers and nothing else. Numeric columns are right-aligned and
  // their header follows, so the eye reads digits against digits.
  const numeric = kept.map((index) => {
    const values = [...rows.map((row) => row[index]), ...(summaryRow ? [summaryRow[index]] : [])];
    return values.some((value) => typeof value === "number") &&
      values.every((value) => typeof value === "number" || isBlank(value));
  });

  const columnStyles: NonNullable<UserOptions["columnStyles"]> = {};
  kept.forEach((_, position) => {
    const droppedBefore = position > 0 && kept[position] - kept[position - 1] > 1;
    columnStyles[position] = {
      halign: numeric[position] ? "right" : "left",
      ...(droppedBefore
        ? { lineWidth: { left: 0.6, top: 0.1, right: 0.1, bottom: 0.1 }, lineColor: ACCENT }
        : {}),
    } satisfies Partial<Styles>;
  });

  // Two-column reports (G50/G12) are a list of rubriques: autoTable's default
  // split gives the amount half the page. Size it to its widest figure and let
  // the label column take the rest.
  if (kept.length === 2 && numeric[1]) {
    columnStyles[1] = {
      ...columnStyles[1],
      cellWidth: amountColumnWidth(doc, head[1], renderedRows, renderedFoot),
    };
  }

  const tableTop = 47;
  const continuationTop = 26;
  const groups = new Set(groupRows);

  autoTable(doc, {
    startY: tableTop,
    head: [head],
    body: renderedBody,
    // Nothing to total on an empty report; the "Aucune donnée" row stands
    // alone instead of being followed by a row of zeros.
    foot: renderedRows.length ? renderedFoot : [],
    margin: { left: MARGIN, right: MARGIN, top: continuationTop, bottom: 20 },
    didDrawPage: (data) => {
      // Page one carries the full identity block; later pages get a compact
      // running header so a printed stack stays identifiable without repeating
      // the whole banner.
      if (data.pageNumber > 1) drawContinuation(doc, pageW, companyName, reportLabel, period);
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (groups.has(data.row.index)) {
        data.cell.styles.fillColor = GROUP_BG;
        data.cell.styles.textColor = ACCENT;
        data.cell.styles.fontStyle = "bold";
      }
      if (indented[data.row.index]?.[data.column.index]) {
        data.cell.styles.cellPadding = {
          ...CELL_PADDING,
          left: CELL_PADDING.left + INDENT,
        };
      }
    },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: CELL_PADDING,
      overflow: "linebreak",
      valign: "middle",
      minCellHeight: 6.8,
      textColor: INK,
      lineColor: RULE,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: ACCENT,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      valign: "middle",
      minCellHeight: 8.5,
    },
    footStyles: {
      fillColor: FOOT_BG,
      textColor: ACCENT,
      fontStyle: "bold",
      lineWidth: { top: 0.5, right: 0.1, bottom: 0.1, left: 0.1 },
      lineColor: ACCENT,
    },
    alternateRowStyles: { fillColor: ZEBRA },
    tableLineColor: RULE,
    tableLineWidth: 0.1,
    columnStyles,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    // The foot row is the report's grand total, so it belongs once at the end;
    // repeating it on page one would total rows that are not on that page.
    showFoot: "lastPage",
  });

  drawFooters(doc, pageW, pageH, companyName, reportLabel);
  return doc;
}

function drawIdentity(
  doc: jsPDF,
  pageW: number,
  companyName: string,
  reportLabel: string,
  period: string,
  generatedOn: string,
) {
  const contentW = pageW - MARGIN * 2;

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(pdfText(companyName).toUpperCase(), pageW / 2, 17, {
    align: "center",
    maxWidth: contentW,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.text(pdfText(reportLabel), pageW / 2, 23.5, {
    align: "center",
    maxWidth: contentW,
  });

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 27.5, pageW - MARGIN, 27.5);

  // Period / generation date band: the two facts that qualify every figure
  // below it, kept together instead of floating in a centred run-on line.
  doc.setFillColor(...BAND);
  doc.rect(MARGIN, 29, contentW, 9, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(pdfText(`Période : ${period}`), MARGIN + 2.5, 34.8);
  doc.text(pdfText(`Généré le : ${generatedOn}`), pageW - MARGIN - 2.5, 34.8, {
    align: "right",
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text("Montants exprimés en dinars algériens (DA)", MARGIN, 43);
  doc.setFont("helvetica", "normal");
}

function drawContinuation(
  doc: jsPDF,
  pageW: number,
  companyName: string,
  reportLabel: string,
  period: string,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(pdfText(companyName).toUpperCase(), MARGIN, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...ACCENT);
  doc.text(pdfText(reportLabel), pageW / 2, 14, {
    align: "center",
    maxWidth: pageW - MARGIN * 2,
  });

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(pdfText(period), pageW - MARGIN, 14, { align: "right" });

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 17.5, pageW - MARGIN, 17.5);
}

function amountColumnWidth(
  doc: jsPDF,
  header: string,
  body: string[][],
  foot: string[][],
): number {
  const previousFont = doc.getFont();
  const previousSize = doc.getFontSize();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  const cells = [header, ...body.map((row) => row[1] ?? ""), ...foot.map((row) => row[1] ?? "")];
  const widest = cells.reduce((max, cell) => Math.max(max, doc.getTextWidth(cell)), 0);

  doc.setFont(previousFont.fontName, previousFont.fontStyle);
  doc.setFontSize(previousSize);
  // 4.4mm of cell padding plus a little breathing room before the rule.
  return Math.min(60, Math.max(28, widest + 6));
}

function drawFooters(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  companyName: string,
  reportLabel: string,
) {
  const pages = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, pageH - 14, pageW - MARGIN, pageH - 14);
    doc.setTextColor(...MUTED);
    doc.text(pdfText(`${companyName} · ${reportLabel}`), MARGIN, pageH - 9);
    doc.text(`Page ${page} / ${pages}`, pageW - MARGIN, pageH - 9, { align: "right" });
  }
}

/** Filesystem-safe name: `1 - Caisse (Livre de Caisse)_Janvier 2026 – ….pdf`. */
export function pdfFileName(reportLabel: string, period: string): string {
  const clean = (value: string) =>
    value
      .replace(/[–—]/g, "-")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[-_]+|[-_]+$/g, "");
  return `${clean(pdfText(reportLabel))}_${clean(pdfText(period))}.pdf`;
}
