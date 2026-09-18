import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCompanyState } from "../hooks/useCompanyState";

export function FundingForm({ state }: { state: ReturnType<typeof useCompanyState> }) {
  const { t } = useTranslation();
  const { isFundingOpen, setIsFundingOpen, fundingForm, onSubmitFunding, createFunding } = state;
  const sourceFunding = fundingForm.watch("source");

  return (
    <Dialog open={isFundingOpen} onOpenChange={setIsFundingOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" /> {t("companyPage.newFunding")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("companyPage.fundingDialog")}</DialogTitle></DialogHeader>
        <Form {...fundingForm}>
          <form onSubmit={fundingForm.handleSubmit(onSubmitFunding)} className="space-y-4 pt-4">
            <FormField control={fundingForm.control} name="source" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("companyPage.fundingSourceType")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder={t("companyPage.fundingColType")} /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OWN_FUNDS">{t("consts.funding.source.OWN_FUNDS")}</SelectItem>
                    <SelectItem value="BANK_LOAN">{t("consts.funding.source.BANK_LOAN")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={fundingForm.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("companyPage.fundingDate")}</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={fundingForm.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("companyPage.fundingAmount")}</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={fundingForm.control} name="label" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("companyPage.fundingLabel")}</FormLabel>
                <FormControl><Input placeholder={t("companyPage.fundingLabelPlaceholder")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {sourceFunding === "BANK_LOAN" && (
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                <FormField control={fundingForm.control} name="interestRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("companyPage.fundingRate")}</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} value={field.value || ''} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={fundingForm.control} name="durationMonths" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("companyPage.fundingDuration")}</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}
            <Button type="submit" className="w-full mt-4" disabled={createFunding.isPending}>{t("companyPage.fundingAdd")}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
