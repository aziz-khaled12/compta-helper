import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";
import { useJournalState } from "../hooks/useJournalState";
import { entriesForTransaction } from "../lib/entries";
import { EntryDetail } from "./EntryDetail";

export function JournalTable({ state }: { state: ReturnType<typeof useJournalState> }) {
  const { filter, setFilter, filteredTransactions, handleDelete, itemById, expandedIds, toggleExpanded } = state;

  return (
    <Tabs defaultValue={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
      <div className="px-6 pt-6 pb-2 border-b">
        <TabsList>
          <TabsTrigger value="ALL">Toutes</TabsTrigger>
          <TabsTrigger value="SALE">Ventes</TabsTrigger>
          <TabsTrigger value="PURCHASE">Achats</TabsTrigger>
          <TabsTrigger value="EXPENSE">Charges</TabsTrigger>
        </TabsList>
      </div>
      <div className="p-0">
        <div className="rounded-b-md">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Libellé / Tiers</TableHead>
                <TableHead className="text-right">HT</TableHead>
                <TableHead className="text-right">TVA</TableHead>
                <TableHead className="text-right">TTC</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    Aucune écriture trouvée pour ce filtre.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => {
                  const item = t.itemId ? itemById.get(t.itemId) : undefined;
                  const entry = entriesForTransaction(t, item);
                  const isExpanded = expandedIds.has(t.id);

                  return (
                    <Fragment key={t.id}>
                      <TableRow>
                        <TableCell className="pr-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleExpanded(t.id)}
                            aria-label={isExpanded ? "Masquer l'écriture" : "Afficher l'écriture"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTypeBadgeClass(t.type)}>
                            {t.type === "SALE" ? "Vente" : t.type === "PURCHASE" ? "Achat" : "Charge"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{t.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.thirdParty}
                            {/* Naming the article is what explains the Coût column. */}
                            {item && (
                              <span className={t.thirdParty ? " · " : ""}>
                                {item.name}
                                {t.quantity != null && ` × ${t.quantity}`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatMoney(t.amountHt)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          <div>{formatMoney(t.tvaAmount)}</div>
                          <div className="text-[10px]">{t.tvaRate}%</div>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${t.type === "SALE" ? "text-emerald-600" : "text-foreground"}`}>
                          {t.type === "SALE" ? "+" : "-"}
                          {formatMoney(t.amountTtc)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {t.costOfGoodsSold != null ? (
                            <div>
                              <div className="text-muted-foreground">
                                {formatMoney(t.costOfGoodsSold)}
                              </div>
                              {t.unitCostHt != null && (
                                <div className="text-[10px] text-muted-foreground">
                                  CUMP {formatMoney(t.unitCostHt)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs">{t.paymentMethod === "BANK" ? "Banque" : t.paymentMethod === "CASH" ? "Espèces" : "Crédit"}</span>
                            <Badge variant={t.status === "PAID" ? "default" : t.status === "UNPAID" ? "destructive" : "secondary"} className="w-fit text-[10px] h-4">
                              {t.status === "PAID" ? "Payé" : t.status === "UNPAID" ? "Impayé" : "Partiel"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
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
