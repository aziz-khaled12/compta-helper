import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";
import { useInventoryState } from "../hooks/useInventoryState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export function MovementHistory({ state }: { state: ReturnType<typeof useInventoryState> }) {
  const { t } = useTranslation();
  const { movements, isMovementOpen, setIsMovementOpen, movementType, openMovementDialog, movementForm, onSubmitMovement, createMovement, items } = state;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => openMovementDialog("OUT")} className="border-orange-200 text-orange-700 hover:bg-orange-50 flex-1">
          <ArrowDownCircle className="h-4 w-4 mr-2" /> {t("consts.inventory.direction.OUT")}
        </Button>
        <Button variant="outline" onClick={() => openMovementDialog("IN")} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex-1">
          <ArrowUpCircle className="h-4 w-4 mr-2" /> {t("consts.inventory.direction.IN")}
        </Button>
      </div>

      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{movementType === "IN" ? t("inventory.movement.purchaseIn") : t("inventory.movement.dispatchOut")}</DialogTitle></DialogHeader>
          <Form {...movementForm}>
            <form onSubmit={movementForm.handleSubmit(onSubmitMovement)} className="space-y-4 pt-4">
              <FormField control={movementForm.control} name="itemId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inventory.movement.article")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("company.selectPlaceholder")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {items?.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.balance} {i.unit})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={movementForm.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.movement.quantity")}</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={movementForm.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.movement.date")}</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={movementForm.control} name="unitCostHt" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inventory.movement.unitCost")}</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {movementType === "IN"
                      ? t("inventory.movement.unitCostIn")
                      : t("inventory.movement.unitCostOut")}
                  </p>
                </FormItem>
              )} />
              <FormField control={movementForm.control} name="note" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inventory.movement.note")}</FormLabel>
                  <FormControl><Input placeholder={t("inventory.movement.notePlaceholder")} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full mt-4" disabled={createMovement.isPending}>{t("inventory.movement.submit")}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card className="bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{t("inventory.history.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="max-h-[500px] overflow-y-auto">
            {movements.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">{t("inventory.history.empty")}</div>
            ) : (
              <div className="divide-y">
                {movements.map((m) => (
                  <div key={m.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm flex items-center gap-2">
                        {m.itemName}
                        {/* Generated by a journal entry rather than typed here: the
                            movement cannot be edited or deleted on its own, only by
                            removing the écriture that caused it. */}
                        {m.transactionId && (
                          <Badge variant="outline" className="text-[10px] h-4 bg-primary/5 border-primary/20 font-normal">
                            {t("inventory.history.journal")}
                          </Badge>
                        )}
                      </span>
                      <span className={`text-sm font-bold ${m.direction === 'IN' ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {m.direction === 'IN' ? '+' : '-'}{m.quantity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(m.date)}</span>
                      <span>{formatMoney(m.unitCostHt)} / u</span>
                    </div>
                    {m.note && <div className="text-xs text-muted-foreground mt-1 truncate">{t("inventory.movement.note")}: {m.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
