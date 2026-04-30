import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  useListTransactions,
  getListTransactionsQueryKey,
  useCreateTransaction,
  useDeleteTransaction,
  getGetDashboardSummaryQueryKey,
  getGetMonthlyPnlQueryKey,
  getGetRecentActivityQueryKey,
  getGetTvaSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";

const transactionSchema = z.object({
  type: z.enum(["SALE", "PURCHASE", "EXPENSE"]),
  date: z.string(),
  label: z.string().min(1, "Libellé requis"),
  thirdParty: z.string().optional(),
  category: z.string().optional(),
  amountHt: z.coerce.number().min(0, "Montant positif"),
  tvaRate: z.coerce.number().min(0).max(100),
  paymentMethod: z.enum(["CASH", "BANK", "CREDIT"]),
  status: z.enum(["PAID", "UNPAID", "PARTIAL"]),
});

export default function Journal() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | "SALE" | "PURCHASE" | "EXPENSE">("ALL");
  const [isOpen, setIsOpen] = useState(false);

  // We fetch all transactions. In a real app we'd paginate or filter on backend
  const { data: transactions, isLoading } = useListTransactions();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  // Helper state for auto-computing sales HT based on qty * price
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "EXPENSE",
      date: new Date().toISOString().split('T')[0],
      label: "",
      thirdParty: "",
      category: "",
      amountHt: 0,
      tvaRate: 19,
      paymentMethod: "BANK",
      status: "PAID",
    },
  });

  const watchType = form.watch("type");
  const watchHt = form.watch("amountHt");
  const watchTvaRate = form.watch("tvaRate");

  const tvaAmount = (watchHt * watchTvaRate) / 100;
  const amountTtc = watchHt + tvaAmount;

  // Auto-compute HT for sales if qty/price change
  useEffect(() => {
    if (watchType === "SALE" && qty && price) {
      const q = parseFloat(qty);
      const p = parseFloat(price);
      if (!isNaN(q) && !isNaN(p)) {
        form.setValue("amountHt", q * p);
      }
    }
  }, [qty, price, watchType, form]);

  // Set default category based on type
  useEffect(() => {
    if (watchType === "SALE") form.setValue("category", "Marchandises");
    if (watchType === "PURCHASE") form.setValue("category", "Matières Premières");
    if (watchType === "EXPENSE") form.setValue("category", "Charges Générales");
  }, [watchType, form]);

  const onSubmit = (values: z.infer<typeof transactionSchema>) => {
    createTransaction.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Écriture enregistrée");
          setIsOpen(false);
          form.reset();
          setQty("");
          setPrice("");
          // Invalidate everything affected by a transaction
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMonthlyPnlQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTvaSummaryQueryKey() });
        },
        onError: () => {
          toast.error("Erreur lors de l'enregistrement");
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer cette écriture comptable ?")) {
      deleteTransaction.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Écriture supprimée");
            queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetMonthlyPnlQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetTvaSummaryQueryKey() });
          }
        }
      );
    }
  };

  const filteredTransactions = transactions?.filter(t => filter === "ALL" || t.type === filter) || [];

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal</h1>
          <p className="text-muted-foreground mt-1">Livre journal des recettes et dépenses</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle écriture
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enregistrer une opération</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type d'opération</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Libellé de l'opération</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Facture N°..." {...field} />
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
                        <FormLabel>Tiers (Client / Fournisseur)</FormLabel>
                        <FormControl>
                          <Input placeholder="Optionnel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchType === "SALE" && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="space-y-2">
                      <Label>Quantité</Label>
                      <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Prix Unitaire HT (DA)</Label>
                      <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <p className="col-span-2 text-xs text-muted-foreground">Le montant HT sera calculé automatiquement.</p>
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
                          <Input type="number" step="0.01" {...field} />
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
                          <Input type="number" step="1" {...field} />
                        </FormControl>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paiement</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BANK">Virement Bancaire</SelectItem>
                            <SelectItem value="CASH">Espèces</SelectItem>
                            <SelectItem value="CREDIT">À crédit</SelectItem>
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
                        <FormLabel>Statut</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PAID">Payé</SelectItem>
                            <SelectItem value="PARTIAL">Partiel</SelectItem>
                            <SelectItem value="UNPAID">Non payé</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full mt-6" disabled={createTransaction.isPending}>
                  Enregistrer l'opération
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card">
        <Tabs defaultValue="ALL" onValueChange={(v) => setFilter(v as any)} className="w-full">
          <div className="px-6 pt-6 pb-2 border-b">
            <TabsList>
              <TabsTrigger value="ALL">Toutes</TabsTrigger>
              <TabsTrigger value="SALE">Ventes</TabsTrigger>
              <TabsTrigger value="PURCHASE">Achats</TabsTrigger>
              <TabsTrigger value="EXPENSE">Charges</TabsTrigger>
            </TabsList>
          </div>
          <CardContent className="p-0">
            <div className="rounded-b-md">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Libellé / Tiers</TableHead>
                    <TableHead className="text-right">HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">TTC</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        Aucune écriture trouvée pour ce filtre.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                        <TableCell>
                          {t.type === 'SALE' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Vente</Badge>}
                          {t.type === 'PURCHASE' && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Achat</Badge>}
                          {t.type === 'EXPENSE' && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Charge</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{t.label}</div>
                          {t.thirdParty && <div className="text-xs text-muted-foreground">{t.thirdParty}</div>}
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatMoney(t.amountHt)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          <div>{formatMoney(t.tvaAmount)}</div>
                          <div className="text-[10px]">{t.tvaRate}%</div>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${t.type === 'SALE' ? 'text-emerald-600' : 'text-foreground'}`}>
                          {t.type === 'SALE' ? '+' : '-'}{formatMoney(t.amountTtc)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs">{t.paymentMethod === 'BANK' ? 'Banque' : t.paymentMethod === 'CASH' ? 'Espèces' : 'Crédit'}</span>
                            <Badge variant={t.status === 'PAID' ? 'default' : t.status === 'UNPAID' ? 'destructive' : 'secondary'} className="w-fit text-[10px] h-4">
                              {t.status === 'PAID' ? 'Payé' : t.status === 'UNPAID' ? 'Impayé' : 'Partiel'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}