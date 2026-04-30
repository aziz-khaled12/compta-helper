import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  useListInventoryItems,
  getListInventoryItemsQueryKey,
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useListInventoryMovements,
  getListInventoryMovementsQueryKey,
  useCreateInventoryMovement
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PackageSearch, Plus, Trash2, ArrowRightLeft, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const itemSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  category: z.enum(["RAW_MATERIAL", "FINISHED_GOOD", "SUPPLY"]),
  unit: z.string().optional(),
});

const movementSchema = z.object({
  itemId: z.string().min(1, "Article requis"),
  date: z.string(),
  quantity: z.coerce.number().min(0.01, "Quantité positive"),
  direction: z.enum(["IN", "OUT"]),
  unitCostHt: z.coerce.number().min(0, "Coût positif"),
  note: z.string().optional(),
});

export default function Inventory() {
  const queryClient = useQueryClient();
  const { data: items, isLoading: loadingItems } = useListInventoryItems();
  const { data: movements, isLoading: loadingMovements } = useListInventoryMovements();
  
  const createItem = useCreateItem();
  const deleteItem = useDeleteInventoryItem();
  const createMovement = useCreateInventoryMovement();

  const [isItemOpen, setIsItemOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");

  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      category: "RAW_MATERIAL",
      unit: "kg",
    },
  });

  const movementForm = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      itemId: "",
      date: new Date().toISOString().split('T')[0],
      quantity: 0,
      direction: "IN",
      unitCostHt: 0,
      note: "",
    },
  });

  // Automatically update form when opening
  const openMovementDialog = (type: "IN" | "OUT") => {
    setMovementType(type);
    movementForm.setValue("direction", type);
    setIsMovementOpen(true);
  };

  const onSubmitItem = (values: z.infer<typeof itemSchema>) => {
    createItem.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Article créé");
          setIsItemOpen(false);
          itemForm.reset();
          queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
        },
        onError: () => {
          toast.error("Erreur de création");
        }
      }
    );
  };

  const onSubmitMovement = (values: z.infer<typeof movementSchema>) => {
    createMovement.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Mouvement enregistré");
          setIsMovementOpen(false);
          movementForm.reset();
          queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() });
        },
        onError: () => {
          toast.error("Erreur d'enregistrement");
        }
      }
    );
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Supprimer cet article ? Ses mouvements seront perdus.")) {
      deleteItem.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Article supprimé");
            queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() });
          }
        }
      );
    }
  };

  const totalValue = items?.reduce((acc, i) => acc + i.totalValue, 0) || 0;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stocks</h1>
          <p className="text-muted-foreground mt-1">Valorisation et mouvements (Matières & Produits finis)</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openMovementDialog("OUT")} className="border-orange-200 text-orange-700 hover:bg-orange-50">
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Consommation (Sortie)
          </Button>
          <Button variant="outline" onClick={() => openMovementDialog("IN")} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Production / Achat (Entrée)
          </Button>
        </div>
      </div>

      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === "IN" ? "Enregistrer une Entrée (Achat / Production)" : "Enregistrer une Sortie (Consommation / Vente)"}
            </DialogTitle>
          </DialogHeader>
          <Form {...movementForm}>
            <form onSubmit={movementForm.handleSubmit(onSubmitMovement)} className="space-y-4 pt-4">
              <FormField
                control={movementForm.control}
                name="itemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article concerné</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {items?.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.name} ({i.balance} {i.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={movementForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={movementForm.control}
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

              <FormField
                control={movementForm.control}
                name="unitCostHt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coût Unitaire Moyen (DA)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={movementForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note / Référence (Optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Ordre de fabrication N°..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full mt-4" disabled={createMovement.isPending}>
                Valider le mouvement
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageSearch className="h-5 w-5 text-primary" />
                <CardTitle>État des Stocks</CardTitle>
              </div>
              <Dialog open={isItemOpen} onOpenChange={setIsItemOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvel Article
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une fiche article</DialogTitle>
                  </DialogHeader>
                  <Form {...itemForm}>
                    <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className="space-y-4 pt-4">
                      <FormField
                        control={itemForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Désignation</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Acier Inox..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Catégorie</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="RAW_MATERIAL">Matière Première</SelectItem>
                                  <SelectItem value="FINISHED_GOOD">Produit Fini</SelectItem>
                                  <SelectItem value="SUPPLY">Fourniture / Consommable</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
                          name="unit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unité de mesure</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: kg, L, unité" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="submit" className="w-full mt-4" disabled={createItem.isPending}>
                        Créer
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {items?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  Aucun article en stock
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead className="text-right">Qte</TableHead>
                        <TableHead className="text-right">CUMP</TableHead>
                        <TableHead className="text-right">Valeur Totale</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                {item.category === "RAW_MATERIAL" ? "Matière Prem." : item.category === "FINISHED_GOOD" ? "Produit Fini" : "Fourniture"}
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
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-primary-foreground/80 mb-2">Valeur Totale du Stock</p>
              <h2 className="text-3xl font-bold">{formatMoney(totalValue)}</h2>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Historique des Mouvements</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <div className="max-h-[500px] overflow-y-auto">
                {movements?.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">Aucun mouvement</div>
                ) : (
                  <div className="divide-y">
                    {movements?.map((m) => (
                      <div key={m.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{m.itemName}</span>
                          <span className={`text-sm font-bold ${m.direction === 'IN' ? 'text-emerald-600' : 'text-orange-600'}`}>
                            {m.direction === 'IN' ? '+' : '-'}{m.quantity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDate(m.date)}</span>
                          <span>{formatMoney(m.unitCostHt)} / u</span>
                        </div>
                        {m.note && <div className="text-xs text-muted-foreground mt-1 truncate">Note: {m.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Custom hook wrapper since API client might name it differently based on OpenAPI
function useCreateItem() {
  return useCreateInventoryItem();
}