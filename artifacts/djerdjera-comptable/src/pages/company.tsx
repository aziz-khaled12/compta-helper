import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  useGetCompany,
  getGetCompanyQueryKey,
  useUpsertCompany,
  useListFunding,
  getListFundingQueryKey,
  useCreateFunding,
  useDeleteFunding,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Save, Plus, Trash2, PiggyBank, Landmark } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  nif: z.string().min(1, "Le NIF est requis"),
  ai: z.string().min(1, "L'AI est requis"),
  address: z.string().optional(),
  legalForm: z.string().optional(),
});

const fundingSchema = z.object({
  source: z.enum(["OWN_FUNDS", "BANK_LOAN"]),
  label: z.string().optional(),
  amount: z.coerce.number().min(1, "Le montant doit être positif"),
  date: z.string(),
  interestRate: z.coerce.number().optional(),
  durationMonths: z.coerce.number().optional(),
});

export default function Company() {
  const queryClient = useQueryClient();
  const { data: company, isLoading: loadingCompany } = useGetCompany();
  const { data: funding, isLoading: loadingFunding } = useListFunding();
  
  const upsertCompany = useUpsertCompany();
  const createFunding = useCreateFunding();
  const deleteFunding = useDeleteFunding();

  const [isFundingOpen, setIsFundingOpen] = useState(false);

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      nif: "",
      ai: "",
      address: "",
      legalForm: "EURL",
    },
  });

  const fundingForm = useForm<z.infer<typeof fundingSchema>>({
    resolver: zodResolver(fundingSchema),
    defaultValues: {
      source: "OWN_FUNDS",
      label: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        nif: company.nif,
        ai: company.ai,
        address: company.address || "",
        legalForm: company.legalForm || "EURL",
      });
    }
  }, [company, form]);

  const onSubmitCompany = (values: z.infer<typeof companySchema>) => {
    upsertCompany.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Profil entreprise mis à jour");
          queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
        },
        onError: () => {
          toast.error("Erreur lors de la mise à jour");
        }
      }
    );
  };

  const onSubmitFunding = (values: z.infer<typeof fundingSchema>) => {
    createFunding.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Fonds ajoutés avec succès");
          setIsFundingOpen(false);
          fundingForm.reset();
          queryClient.invalidateQueries({ queryKey: getListFundingQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: () => {
          toast.error("Erreur lors de l'ajout des fonds");
        }
      }
    );
  };

  const handleDeleteFunding = (id: string) => {
    if (confirm("Supprimer cette entrée de capital ?")) {
      deleteFunding.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Entrée supprimée");
            queryClient.invalidateQueries({ queryKey: getListFundingQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          }
        }
      );
    }
  };

  const sourceFunding = fundingForm.watch("source");
  const totalCapital = funding?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const ownFunds = funding?.filter(f => f.source === "OWN_FUNDS").reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const loans = funding?.filter(f => f.source === "BANK_LOAN").reduce((acc, curr) => acc + curr.amount, 0) || 0;

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Identité & Capital</h1>
        <p className="text-muted-foreground mt-1">Gérez les informations légales et les fonds propres</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Identité */}
        <Card className="bg-card h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Profil de l'entreprise</CardTitle>
            </div>
            <CardDescription>Informations légales et fiscales</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitCompany)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raison Sociale</FormLabel>
                      <FormControl>
                        <Input placeholder="EURL DJERDJERA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="legalForm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forme Juridique</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EURL">EURL</SelectItem>
                            <SelectItem value="SARL">SARL</SelectItem>
                            <SelectItem value="SNC">SNC</SelectItem>
                            <SelectItem value="SPA">SPA</SelectItem>
                            <SelectItem value="Personne Physique">Personne Physique</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nif"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIF (Numéro d'Identification Fiscale)</FormLabel>
                        <FormControl>
                          <Input placeholder="000..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ai"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article d'Imposition (AI)</FormLabel>
                      <FormControl>
                        <Input placeholder="16..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Siège Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Adresse complète" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full mt-6" disabled={upsertCompany.isPending}>
                  {upsertCompany.isPending ? "Enregistrement..." : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Capital */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <PiggyBank className="h-4 w-4" />
                  <span className="text-sm font-medium">Fonds Propres</span>
                </div>
                <div className="text-2xl font-bold">{formatMoney(ownFunds)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Landmark className="h-4 w-4" />
                  <span className="text-sm font-medium">Emprunts</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{formatMoney(loans)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Structure du Capital</CardTitle>
                <CardDescription>Apports et financements</CardDescription>
              </div>
              <Dialog open={isFundingOpen} onOpenChange={setIsFundingOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un apport ou emprunt</DialogTitle>
                  </DialogHeader>
                  <Form {...fundingForm}>
                    <form onSubmit={fundingForm.handleSubmit(onSubmitFunding)} className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={fundingForm.control}
                          name="source"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type de financement</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="OWN_FUNDS">Apport / Capital</SelectItem>
                                  <SelectItem value="BANK_LOAN">Emprunt Bancaire</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={fundingForm.control}
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
                        control={fundingForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Montant (DA)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={fundingForm.control}
                        name="label"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Libellé (Optionnel)</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Capital initial" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {sourceFunding === "BANK_LOAN" && (
                        <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                          <FormField
                            control={fundingForm.control}
                            name="interestRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Taux d'intérêt (%)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.1" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={fundingForm.control}
                            name="durationMonths"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Durée (mois)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <Button type="submit" className="w-full mt-4" disabled={createFunding.isPending}>
                        Ajouter
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {funding?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                  Aucun apport ou emprunt enregistré
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funding?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{formatDate(item.date)}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium text-sm">
                                {item.source === "OWN_FUNDS" ? "Apport" : "Emprunt"}
                              </span>
                              {item.label && <div className="text-xs text-muted-foreground">{item.label}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatMoney(item.amount)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteFunding(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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
      </div>
    </div>
  );
}