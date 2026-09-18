import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { useTranslation } from "react-i18next";
import type { JournalEntry } from "../lib/entries";

/**
 * The écriture behind one journal line, as débit/crédit.
 *
 * A sale shows two writings under one row: the facture (411/700/4457) and the
 * stock relief (600/30) that makes the system perpetual. They are separated
 * because they belong to different documents — the journal des ventes and the
 * bon de sortie — even though one action produced both.
 */
export function EntryDetail({ entry }: { entry: JournalEntry }) {
  const { t } = useTranslation();
  const facture = entry.lines.filter((l) => l.source === "JOURNAL");
  const stock = entry.lines.filter((l) => l.source === "STOCK");

  return (
    <div className="py-2 space-y-3">
      <EntryBlock title={t("journal.entry.title")} lines={facture} />
      {stock.length > 0 && (
        <EntryBlock title={t("journal.entry.stockTitle")} lines={stock} />
      )}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          {t("journal.entry.total", {
            debit: formatMoney(entry.totalDebit),
            credit: formatMoney(entry.totalCredit),
          })}
        </span>
        {!entry.balanced && (
          <span className="text-destructive font-medium">
            {t("journal.entry.unbalanced")}
          </span>
        )}
      </div>
    </div>
  );
}

function EntryBlock({
  title,
  lines,
}: {
  title: string;
  lines: JournalEntry["lines"];
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <Table>
        <TableBody>
          {lines.map((l, i) => (
            <TableRow key={i} className="border-0">
              <TableCell className="py-1 text-xs w-16 font-mono">
                {l.account}
              </TableCell>
              <TableCell className="py-1 text-xs">
                <div>{l.accountLabel}</div>
                {l.detail && (
                  <div className="text-[10px] text-muted-foreground">
                    {l.detail}
                  </div>
                )}
              </TableCell>
              <TableCell className="py-1 text-xs text-right w-32">
                {l.debit ? formatMoney(l.debit) : ""}
              </TableCell>
              <TableCell className="py-1 text-xs text-right w-32">
                {l.credit ? formatMoney(l.credit) : ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
