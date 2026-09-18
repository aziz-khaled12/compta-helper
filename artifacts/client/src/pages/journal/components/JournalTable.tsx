import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Trash2, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";
import { useJournalState } from "../hooks/useJournalState";
import { entriesForTransaction } from "../lib/entries";
import { EntryDetail } from "./EntryDetail";

export function JournalTable({ state }: { state: ReturnType<typeof useJournalState> }) {
  const { t } = useTranslation();
  const { filter, setFilter, filteredTransactions, handleDelete, itemById, expandedIds, toggleExpanded } = state;

  return (
    <Tabs defaultValue={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
      <div className="px-6 pt-6 pb-2 border-b">
        <TabsList>
          <TabsTrigger value="ALL">{t("journal.table.tabAll")}</TabsTrigger>
          <TabsTrigger value="SALE">{t("journal.table.tabSales")}</TabsTrigger>
          <TabsTrigger value="PURCHASE">{t("journal.table.tabPurchases")}</TabsTrigger>
          <TabsTrigger value="EXPENSE">{t("journal.table.tabExpenses")}</TabsTrigger>
        </TabsList>
      </div>
      <div className="p-0">
        <div className="rounded-b-md">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>{t("journal.table.colDate")}</TableHead>
                <TableHead>{t("journal.table.colType")}</TableHead>
                <TableHead>{t("journal.table.colLabel")}</TableHead>
                <TableHead className="text-right">{t("journal.table.colHt")}</TableHead>
                <TableHead className="text-right">{t("journal.table.colTva")}</TableHead>
                <TableHead className="text-right">{t("journal.table.colTtc")}</TableHead>
                <TableHead className="text-right">{t("journal.table.colCost")}</TableHead>
                <TableHead>{t("journal.table.colPayment")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    {t("journal.table.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => {
                  const item = tx.itemId ? itemById.get(tx.itemId) : undefined;
                  const entry = entriesForTransaction(tx, item);
                  const isExpanded = expandedIds.has(tx.id);

                  return (
                    <Fragment key={tx.id}>
                      <TableRow>
                        <TableCell className="pr-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleExpanded(tx.id)}
                            aria-label={isExpanded ? t("journal.table.hide") : t("journal.table.show")}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTypeBadgeClass(tx.type)}>
                            {t(`consts.transaction.type.${tx.type}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{tx.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {tx.thirdParty}
                            {/* Naming the article is what explains the Coût column. */}
                            {item && (
                              <span className={tx.thirdParty ? " · " : ""}>
                                {item.name}
                                {tx.quantity != null && ` × ${tx.quantity}`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatMoney(tx.amountHt)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          <div>{formatMoney(tx.tvaAmount)}</div>
                          <div className="text-[10px]">{tx.tvaRate}%</div>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${tx.type === "SALE" ? "text-emerald-600" : "text-foreground"}`}>
                          {tx.type === "SALE" ? "+" : "-"}
                          {formatMoney(tx.amountTtc)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {tx.costOfGoodsSold != null ? (
                            <div>
                              <div className="text-muted-foreground">
                                {formatMoney(tx.costOfGoodsSold)}
                              </div>
                              {tx.unitCostHt != null && (
                                <div className="text-[10px] text-muted-foreground">
                                  {t("journal.table.colCump")} {formatMoney(tx.unitCostHt)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs">{t(`consts.transaction.paymentMethod.${tx.paymentMethod}`)}</span>
                            <Badge variant={tx.status === "PAID" ? "default" : tx.status === "UNPAID" ? "destructive" : "secondary"} className="w-fit text-[10px] h-4">
                              {t(`consts.transaction.status.${tx.status}`)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={10} className="bg-muted/20 px-6">
                            <EntryDetail entry={entry} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Tabs>
  );
}

function getTypeBadgeClass(type: string) {
  if (type === "SALE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (type === "PURCHASE") return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}
