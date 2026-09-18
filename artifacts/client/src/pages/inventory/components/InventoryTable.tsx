import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, PackageSearch } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryState } from "../hooks/useInventoryState";
import { useTranslation } from "react-i18next";

export function InventoryTable({ state }: { state: ReturnType<typeof useInventoryState> }) {
  const { t } = useTranslation();
  const { items, isItemOpen, setIsItemOpen, itemForm, onSubmitItem, handleDeleteItem, createItem } = state;
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageSearch className="h-5 w-5 text-primary" />
          <CardTitle>{t("inventory.stateTitle")}</CardTitle>
        </div>
        <Dialog open={isItemOpen} onOpenChange={setIsItemOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> {t("inventory.newItem")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("inventory.createTitle")}</DialogTitle></DialogHeader>
            <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className="space-y-4 pt-4">
                <FormField control={itemForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.name")}</FormLabel>
                    <FormControl><Input placeholder={t("inventory.namePlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={itemForm.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.category")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="RAW_MATERIAL">{t("consts.inventory.category.RAW_MATERIAL")}</SelectItem>
                          <SelectItem value="FINISHED_GOOD">{t("consts.inventory.category.FINISHED_GOOD")}</SelectItem>
                          <SelectItem value="SUPPLY">{t("consts.inventory.category.SUPPLY")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="unit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory.unit")}</FormLabel>
                      <FormControl><Input placeholder={t("inventory.unitPlaceholder")} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full mt-4" disabled={createItem.isPending}>{t("inventory.create")}</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">{t("inventory.empty")}</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("inventory.colArticle")}</TableHead>
                  <TableHead className="text-right">{t("inventory.colQty")}</TableHead>
                  <TableHead className="text-right">{t("inventory.colCump")}</TableHead>
                  <TableHead className="text-right">{t("inventory.colValue")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                          {item.category === "RAW_MATERIAL" ? t("inventory.categoryShort.RAW_MATERIAL") : item.category === "FINISHED_GOOD" ? t("inventory.categoryShort.FINISHED_GOOD") : t("inventory.categoryShort.SUPPLY")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.balance} <span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatMoney(item.averageCost)}</TableCell>
                    <TableCell className="text-right font-medium text-primary">{formatMoney(item.totalValue)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
