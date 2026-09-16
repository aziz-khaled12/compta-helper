import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useCompanyState } from "../hooks/useCompanyState";

export function FundingForm({ state }: { state: ReturnType<typeof useCompanyState> }) {
  const { isFundingOpen, setIsFundingOpen, fundingForm, onSubmitFunding, createFunding } = state;
  const sourceFunding = fundingForm.watch("source");

  return (
    <Dialog open={isFundingOpen} onOpenChange={setIsFundingOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nouveau</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter un apport ou emprunt</DialogTitle></DialogHeader>
        <Form {...fundingForm}>
          <form onSubmit={fundingForm.handleSubmit(onSubmitFunding)} className="space-y-4 pt-4">
            <FormField control={fundingForm.control} name="source" render={({ field }) => (
              <FormItem>
                <FormLabel>Type de financement</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OWN_FUNDS">Apport / Capital</SelectItem>
                    <SelectItem value="BANK_LOAN">Emprunt Bancaire</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={fundingForm.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={fundingForm.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Montant (DA)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={fundingForm.control} name="label" render={({ field }) => (
              <FormItem>
                <FormLabel>Libellé (Optionnel)</FormLabel>
                <FormControl><Input placeholder="Ex: Capital initial" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {sourceFunding === "BANK_LOAN" && (
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                <FormField control={fundingForm.control} name="interestRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taux d'intérêt (%)</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} value={field.value || ''} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={fundingForm.control} name="durationMonths" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée (mois)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}
            <Button type="submit" className="w-full mt-4" disabled={createFunding.isPending}>Ajouter</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
