import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { SectorCombobox } from "@/components/sector-combobox";
import { LEGAL_FORMS, TAX_REGIMES, TAX_REGIME_HINTS, TAX_REGIME_LABELS, type TaxRegimeValue } from "@/lib/company";
import { useCompanyState } from "../hooks/useCompanyState";
import { useEffect } from "react";

export function CompanyForm({ state }: { state: ReturnType<typeof useCompanyState> }) {
  const { companyForm, onSubmitCompany, upsertCompany } = state;
  const watchedValues = companyForm.watch();

  useEffect(() => {
    console.log("form values", watchedValues);
  }, [watchedValues]);
  return (
    <Form {...companyForm}>
      <form onSubmit={companyForm.handleSubmit(onSubmitCompany)} className="space-y-4">
        <FormField
          control={companyForm.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Raison Sociale</FormLabel>
              <FormControl><Input placeholder="EURL DJERDJERA" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={companyForm.control}
            name="legalForm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forme Juridique</FormLabel>
                {/* Controlled: passing field.value as children to SelectValue ensures
                    Radix displays the loaded selection immediately without needing an open/close cycle. */}
                <Select
                  value={field.value ?? ""}
                  onValueChange={(val) => {
                    if (val) field.onChange(val);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner...">
                        {field.value}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LEGAL_FORMS.map((form) => (
                      <SelectItem key={form} value={form}>{form}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={companyForm.control}
            name="nif"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIF</FormLabel>
                <FormControl><Input placeholder="000..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={companyForm.control}
          name="taxRegime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Système fiscal</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(val) => {
                  if (val) field.onChange(val);
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner...">
                      {field.value ? TAX_REGIME_LABELS[field.value as TaxRegimeValue] : undefined}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TAX_REGIMES.map((regime) => (
                    <SelectItem key={regime} value={regime}>
                      {TAX_REGIME_LABELS[regime]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Says what the choice implies, since it is what decides which
                  fiscal return the Reports page will offer. */}
              <p className="text-xs text-muted-foreground">
                {field.value
                  ? TAX_REGIME_HINTS[field.value as TaxRegimeValue]
                  : "Détermine la déclaration fiscale proposée dans les rapports."}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={companyForm.control}
          name="sectorCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activité principale</FormLabel>
              <FormControl>
                <SectorCombobox
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={companyForm.control}
          name="ai"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Article d'Imposition (AI)</FormLabel>
              <FormControl><Input placeholder="16..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={companyForm.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Siège Social</FormLabel>
              <FormControl><Input placeholder="Adresse complète" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-6" disabled={upsertCompany.isPending}>
          {upsertCompany.isPending ? "Enregistrement..." : <><Save className="h-4 w-4 mr-2" /> Enregistrer</>}
        </Button>
      </form>
    </Form>
  );
}
