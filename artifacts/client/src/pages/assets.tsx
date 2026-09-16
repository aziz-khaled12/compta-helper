import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  useListAssets,
  getListAssetsQueryKey,
  useCreateAsset,
  useDeleteAsset,
  useGetAssetAmortization,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Briefcase, Calculator } from "lucide-react";

const assetSchema = z.object({
  label: z.string().min(1, "Le libellé est requis"),
  category: z.string().optional(),
  costHt: z.coerce.number().min(0, "Le coût doit être positif"),
  purchaseDate: z.string(),
  lifeYears: z.coerce.number().min(1, "Au moins 1 an").max(50),
  residualValue: z.coerce.number().default(0),
});

function AmortizationSchedule({ assetId }: { assetId: string }) {
  const { data: schedule, isLoading } = useGetAssetAmortization(assetId);

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground text-center">Chargement du tableau d'amortissement...</div>;
  if (!schedule?.length) return <div className="p-4 text-sm text-muted-foreground text-center">Aucune donnée</div>;

  return (
    <div className="p-4 bg-muted/30 rounded-b-md border-x border-b">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Calculator className="h-4 w-4" />
        Tableau d'amortissement
      </h4>
      <div className="max-h-64 overflow-y-auto rounded-md border bg-background">
        <Table>
          <TableHeader className="bg-muted sticky top-0">
            <TableRow>
              <TableHead className="py-2 text-xs">Mois</TableHead>
              <TableHead className="py-2 text-xs text-right">Amortissement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="py-2 text-xs">{formatDate(entry.date, "MMMM yyyy")}</TableCell>
                <TableCell className="py-2 text-xs text-right">{formatMoney(entry.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function Assets() {
  const queryClient = useQueryClient();
  const { data: assets, isLoading } = useListAssets();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof assetSchema>>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      label: "",
      category: "",
      costHt: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      lifeYears: 5,
      residualValue: 0,
    },
  });

  const onSubmit = (values: z.infer<typeof assetSchema>) => {
    createAsset.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Immobilisation ajoutée");
          setIsOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: () => {
          toast.error("Erreur lors de l'ajout");
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer cette immobilisation et son tableau d'amortissement ?")) {
      deleteAsset.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Immobilisation supprimée");
            queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          }
        }
      );
    }
  };

  const totalBookValue = assets?.reduce((acc, curr) => acc + curr.bookValue, 0) || 0;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Immobilisations</h1>
          <p className="text-muted-foreground mt-1">Gestion du parc et amortissements automatiques</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle immobilisation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un équipement / matériel</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Désignation</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Machine outil CX-200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégorie</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Matériel Industriel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'acquisition</FormLabel>
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
                    name="costHt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coût d'acquisition HT (DA)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lifeYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durée de vie (Années)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full mt-6" disabled={createAsset.isPending}>
                  Enregistrer et générer l'amortissement
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-none shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valeur Nette Comptable Globale</p>
              <h2 className="text-3xl font-bold">{formatMoney(totalBookValue)}</h2>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Liste des immobilisations</CardTitle>
          <CardDescription>Cliquez sur une ligne pour voir le détail des amortissements</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {assets?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune immobilisation enregistrée.
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              <div className="px-6 py-3 border-b bg-muted/30 grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Désignation</div>
                <div className="col-span-2">Acquisition</div>
                <div className="col-span-2 text-right">Coût HT</div>
                <div className="col-span-2 text-right">Amorti</div>
                <div className="col-span-2 text-right">VNC</div>
                <div className="col-span-1"></div>
              </div>
              
              {assets?.map((asset) => (
                <AccordionItem key={asset.id} value={asset.id} className="border-b-0 px-2">
                  <AccordionTrigger className="hover:no-underline py-3 px-4 rounded-md hover:bg-muted/50 data-[state=open]:bg-muted/50 transition-colors">
                    <div className="grid grid-cols-12 gap-4 w-full items-center text-left">
                      <div className="col-span-3 font-medium">
                        {asset.label}
                        {asset.category && <div className="text-xs font-normal text-muted-foreground">{asset.category}</div>}
                      </div>
                      <div className="col-span-2 text-sm">
                        {formatDate(asset.purchaseDate)}
                        <div className="text-xs text-muted-foreground">{asset.lifeYears} ans</div>
                      </div>
                      <div className="col-span-2 text-right text-sm">{formatMoney(asset.costHt)}</div>
                      <div className="col-span-2 text-right text-sm text-destructive">{formatMoney(asset.accumulatedDepreciation)}</div>
                      <div className="col-span-2 text-right text-sm font-semibold text-primary">{formatMoney(asset.bookValue)}</div>
                      <div className="col-span-1 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(asset.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-4 px-4">
                    <AmortizationSchedule assetId={asset.id} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}