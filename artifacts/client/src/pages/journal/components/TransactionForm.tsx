import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { useJournalState } from "../hooks/useJournalState";
import { Loader2 } from "lucide-react";

export function TransactionForm({ state }: { state: ReturnType<typeof useJournalState> }) {
  const { isOpen, setIsOpen, form, tvaAmount, amountTtc, onSubmit, createTransaction, items } = state;
  const [price, setPrice] = useState("");

  const watchType = form.watch("type");
  const watchItemId = form.watch("itemId");
  const watchQty = form.watch("quantity");

  const qty = watchQty ? String(watchQty) : "";
  const item = items.find((i) => i.id === watchItemId);

  // The article drives stock on both sides: a sale relieves it, a purchase
  // feeds it. A charge never moves stock, so the picker is hidden there.
  const movesStock = watchType === "SALE" || watchType === "PURCHASE";

  useEffect(() => {
    if (!isOpen) {
      setPrice("");
      form.setValue("quantity", 0);
    }
  }, [isOpen, form]);

  // Clear the article when the form switches to a type that cannot move stock,
  // so a stale id cannot be submitted against a charge.
  useEffect(() => {
    if (!movesStock) form.setValue("itemId", "");
  }, [movesStock, form]);

  useEffect(() => {
    if (movesStock && qty && price) {
      const q = parseFloat(qty);
      const p = parseFloat(price);
      if (!isNaN(q) && !isNaN(p)) {
        form.setValue("amountHt", q * p, { shouldValidate: true });
      }
    }
  }, [qty, price, movesStock, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer une opération</DialogTitle>
          <DialogDescription>
            Renseignez les détails pour ajouter une écriture au livre journal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.warn("Transaction form validation errors:", errors);
            })}
            className="space-y-4 pt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'opération</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SALE">Vente (Recette)</SelectItem>
                        <SelectItem value="PURCHASE">Achat (Stock)</SelectItem>
                        <SelectItem value="EXPENSE">Charge (Dépense)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Facture Vente #001, Loyer..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thirdParty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiers / Partenaire</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Client SARL, Fournisseur..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {movesStock && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <FormField
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article (optionnel)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Aucun — écriture sans mouvement de stock" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {items.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name} — {i.balance} en stock
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {item
                          ? watchType === "SALE"
                            ? `Sortie valorisée au CUMP de ${formatMoney(item.averageCost)} — coût total ${formatMoney(item.averageCost * (Number(watchQty) || 0))}.`
                            : `Entrée valorisée au prix unitaire saisi (montant HT ÷ quantité). CUMP actuel : ${formatMoney(item.averageCost)}.`
                          : "Sans article, l'écriture ne touche pas le stock."}
                      </p>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantité</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label>Prix Unitaire HT (DA)</Label>
                    <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                  </div>
                </div>

                {item && watchType === "SALE" && Number(watchQty) > item.balance && (
                  <p className="text-xs text-destructive">
                    Stock insuffisant : {item.balance} disponible(s) pour {Number(watchQty)} demandé(s).
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="amountHt"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Montant HT (DA)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tvaRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taux TVA (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode de paiement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BANK">Banque / Virement</SelectItem>
                        <SelectItem value="CASH">Espèces</SelectItem>
                        <SelectItem value="CREDIT">Crédit / À terme</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut du paiement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PAID">Payé</SelectItem>
                        <SelectItem value="UNPAID">Impayé</SelectItem>
                        <SelectItem value="PARTIAL">Partiel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted p-4 rounded-md grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Montant TVA</p>
                <p className="text-lg font-semibold">{formatMoney(tvaAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Montant TTC</p>
                <p className="text-2xl font-bold text-primary">{formatMoney(amountTtc)}</p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement en cours...
                </>
              ) : (
                "Enregistrer l'opération"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
