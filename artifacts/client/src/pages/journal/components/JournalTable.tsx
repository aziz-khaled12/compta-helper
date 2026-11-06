import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/money";
import { useJournalState } from "../hooks/useJournalState";

export function JournalTable({ state }: { state: ReturnType<typeof useJournalState> }) {
  const { t } = useTranslation();
  const { filter, setFilter, filteredTransactions, handleDelete, itemById, openPayment, setDetailsTransaction } = state;

  return (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full">
      <div className="px-6 pt-6 pb-2 border-b"><TabsList><TabsTrigger value="ALL">{t("journal.table.tabAll")}</TabsTrigger><TabsTrigger value="SALE">{t("journal.table.tabSales")}</TabsTrigger><TabsTrigger value="PURCHASE">{t("journal.table.tabPurchases")}</TabsTrigger><TabsTrigger value="EXPENSE">{t("journal.table.tabExpenses")}</TabsTrigger></TabsList></div>
      <div className="p-0"><div className="rounded-b-md"><Table>
        <TableHeader className="bg-muted/30"><TableRow>
          <TableHead>{t("journal.table.colDate")}</TableHead><TableHead>{t("journal.table.colType")}</TableHead><TableHead>{t("journal.table.colLabel")}</TableHead><TableHead className="text-right">{t("journal.table.colHt")}</TableHead><TableHead className="text-right">{t("journal.table.colTva")}</TableHead><TableHead className="text-right">{t("journal.table.colTtc")}</TableHead><TableHead>{t("journal.table.colPayment")}</TableHead><TableHead className="text-right">{t("journal.table.colRest")}</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>{filteredTransactions.length === 0 ? <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />{t("journal.table.empty")}</TableCell></TableRow> : filteredTransactions.map((tx) => {
          const item = tx.itemId ? itemById.get(tx.itemId) : undefined;
          const isFacture = tx.type === "SALE" || tx.type === "PURCHASE";
          return <TableRow key={tx.id}>
            <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
            <TableCell><Badge variant="outline" className={getTypeBadgeClass(tx.type)}>{t(`consts.transaction.type.${tx.type}`)}</Badge></TableCell>
            <TableCell><div className="font-medium">{tx.label}</div><div className="text-xs text-muted-foreground">{tx.thirdParty}{item && <span>{tx.thirdParty ? " · " : ""}{item.name}{tx.quantity != null && ` × ${tx.quantity}`}</span>}</div></TableCell>
            <TableCell className="text-right text-sm"><Money value={tx.amountHt} /></TableCell>
            <TableCell className="text-right text-sm text-muted-foreground"><div><Money value={tx.tvaAmount} /></div><div className="text-[10px]">{tx.tvaRate}%</div></TableCell>
            <TableCell className={`text-right font-semibold ${tx.type === "SALE" ? "text-emerald-600" : "text-foreground"}`}>{tx.type === "SALE" ? "+" : "-"}<Money value={tx.amountTtc} /></TableCell>
            <TableCell><div className="flex flex-col gap-1"><span className="text-xs">{t(`consts.transaction.paymentMethod.${tx.paymentMethod}`)}</span><Badge variant={tx.status === "PAID" ? "default" : tx.status === "UNPAID" ? "destructive" : "secondary"} className="w-fit text-[10px] h-4">{t(`consts.transaction.status.${tx.status}`)}</Badge></div></TableCell>
            <TableCell className="text-right text-sm">{tx.rest > 0 ? <Money value={tx.rest} /> : <span className="text-muted-foreground">-</span>}</TableCell>
            <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={t("journal.table.actions")}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!isFacture || tx.rest <= 0} onClick={() => openPayment(tx, "FULL")}>{t("journal.actions.fullPay")}</DropdownMenuItem>
              <DropdownMenuItem disabled={!isFacture || tx.rest <= 0} onClick={() => openPayment(tx, "PARTIAL")}>{t("journal.actions.partialPay")}</DropdownMenuItem>
              <DropdownMenuItem disabled={!isFacture} onClick={() => setDetailsTransaction(tx)}>{t("journal.actions.details")}</DropdownMenuItem>
              <DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tx.id)}><Trash2 className="h-4 w-4" />{t("journal.actions.delete")}</DropdownMenuItem>
            </DropdownMenuContent></DropdownMenu></TableCell>
          </TableRow>;
        })}</TableBody>
      </Table></div></div>
    </Tabs>
  );
}

function getTypeBadgeClass(type: string) {
  if (type === "SALE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (type === "PURCHASE") return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}
