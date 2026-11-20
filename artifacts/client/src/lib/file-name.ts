/**
 * The file-name stem shared by the PDF and Excel exports.
 *
 * A report label carries an em dash (`Journal — Factures de vente`) and the
 * period a date range (`12/01/2026 – 05/03/2026`); neither the dash nor the
 * slashes are legal in a Windows file name, and a browser would silently
 * rewrite them. Both writers start from this stem so one export's PDF and
 * spreadsheet travel under the same name.
 */
export function exportFileBase(label: string, period: string): string {
  const clean = (value: string) =>
    value
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[-_]+|[-_]+$/g, "");
  return `${clean(label)}_${clean(period)}`;
}
