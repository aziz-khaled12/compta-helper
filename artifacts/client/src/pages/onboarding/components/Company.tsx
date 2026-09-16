import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ChevronRight, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { SectorCombobox } from "@/components/sector-combobox";
import {
  FUNDING_SOURCE_LABELS,
  LEGAL_FORMS,
  TAX_REGIMES,
  TAX_REGIME_HINTS,
  TAX_REGIME_LABELS,
  fundingSchema,
  type TaxRegimeValue,
} from "@/lib/company";
import type { OnboardingState } from "../hooks/useOnboardingState";
import { step1Schema, type FundingData, type Step1Data } from "../types";

/** Lets the footer's "Suivant" submit the identity form from outside it. */
const IDENTITY_FORM_ID = "onboarding-identity";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDa(value: number): string {
  return `${value.toLocaleString("fr-DZ")} DA`;
}

export function Company({ state }: { state: OnboardingState }) {
  const identityForm = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: state.company ?? {
      name: "",
      nif: "",
      ai: "",
      address: "",
      legalForm: undefined,
      taxRegime: undefined,
      sectorCode: null,
    },
  });

  const fundingForm = useForm<FundingData>({
    resolver: zodResolver(fundingSchema),
    defaultValues: { source: "OWN_FUNDS", label: "", amount: 0, date: today() },
  });
  const source = fundingForm.watch("source");

  const addFunding = (values: FundingData) => {
    state.setFunding([...state.funding, values]);
    fundingForm.reset({ source: "OWN_FUNDS", label: "", amount: 0, date: today() });
  };

  const removeFunding = (index: number) =>
    state.setFunding(state.funding.filter((_, i) => i !== index));

  const loans = state.funding
    .filter((f) => f.source === "BANK_LOAN")
    .reduce((sum, f) => sum + f.amount, 0);
  const ownFunds = state.funding
    .filter((f) => f.source === "OWN_FUNDS")
    .reduce((sum, f) => sum + f.amount, 0);

  const submitIdentity = (values: Step1Data) => {
    // The capital block is a sibling form, so "Ajouter au capital" is the only
    // thing that commits a row. Someone who fills in the opening capital and
    // then clicks "Suivant" means to keep it — and this step unmounts on
    // advance, so an uncommitted row would be lost along with the whole capital.
    const pending = fundingForm.getValues();
    const parsed = fundingSchema.safeParse(pending);
    const started = pending.amount > 0 || (pending.label ?? "").trim() !== "";

    if (started && !parsed.success) {
      toast.error("Capital incomplet", {
        description:
          "Complétez le montant et la date, ou videz les champs pour l'ignorer.",
      });
      return;
    }

    if (parsed.success) state.setFunding([...state.funding, parsed.data]);
    state.setCompany(values);
    state.nextStep();
  };

  return (
    <div className="space-y-6">
      {/*
        Only the identity block is a real <form>; the capital block below is a
        sibling. Nesting it would be invalid HTML, and letting it share the outer
        form would make Enter in a capital field submit the identity step.
      */}
      <form
        id={IDENTITY_FORM_ID}
        onSubmit={identityForm.handleSubmit(submitIdentity)}
        className="space-y-4 border rounded-xl p-4 bg-muted/10"
      >
        <p className="text-sm font-semibold">Identité de l'entreprise</p>
        <Form {...identityForm}>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={identityForm.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Raison Sociale *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex. EURL DJERDJERA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={identityForm.control}
              name="nif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIF (Identification Fiscale) *</FormLabel>
                  <FormControl>
                    <Input placeholder="000000000000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={identityForm.control}
              name="ai"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI (Article d'Imposition) *</FormLabel>
                  <FormControl>
                    <Input placeholder="00000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={identityForm.control}
              name="legalForm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forme Juridique</FormLabel>
                  {/* Controlled, so the choice survives a step-2 → step-1 round trip. */}
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) => {
                      if (val) field.onChange(val);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir...">
                          {field.value}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEGAL_FORMS.map((form) => (
                        <SelectItem key={form} value={form}>
                          {form}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={identityForm.control}
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
                        <SelectValue placeholder="Choisir...">
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
                  {/* It is the system, not the legal form, that decides which
                      fiscal return the reports page will offer. */}
                  <p className="text-xs text-muted-foreground">
                    {field.value
                      ? TAX_REGIME_HINTS[field.value]
                      : "Détermine la déclaration fiscale proposée dans les rapports."}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={identityForm.control}
              name="sectorCode"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
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
              control={identityForm.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="Wilaya, commune..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </form>

      <section className="space-y-4 border rounded-xl p-4 bg-muted/10">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Capital & Financement</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Déclarez le capital social et les emprunts obtenus. Vous pourrez en
          ajouter d'autres plus tard depuis la page Entreprise.
        </p>

        {state.funding.length > 0 && (
          <div className="space-y-2">
            {state.funding.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30"
              >
                <div>
                  <p className="text-sm font-medium">
                    {FUNDING_SOURCE_LABELS[entry.source]}
                    {entry.label ? ` — ${entry.label}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDa(entry.amount)} — {entry.date}
                    {entry.source === "BANK_LOAN" && entry.interestRate
                      ? ` — ${entry.interestRate}% / ${entry.durationMonths ?? 0} mois`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFunding(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">Total capital</span>
              <span className="text-sm font-semibold">{formatDa(ownFunds + loans)}</span>
            </div>
            <p className="text-xs text-muted-foreground px-3">
              Dont apports : {formatDa(ownFunds)} — emprunts : {formatDa(loans)}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Form {...fundingForm}>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={fundingForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de financement</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OWN_FUNDS">
                          {FUNDING_SOURCE_LABELS.OWN_FUNDS}
                        </SelectItem>
                        <SelectItem value="BANK_LOAN">
                          {FUNDING_SOURCE_LABELS.BANK_LOAN}
                        </SelectItem>
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
              <FormField
                control={fundingForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (DA) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="1000000"
                        {...field}
                        value={field.value ?? ""}
                      />
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
                    <FormLabel>Libellé (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex. Capital initial" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Only a loan carries a rate and a term. */}
              {source === "BANK_LOAN" && (
                <div className="md:col-span-2 grid gap-3 md:grid-cols-2 rounded-lg bg-muted/50 p-3">
                  <FormField
                    control={fundingForm.control}
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taux d'intérêt (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ""}
                          />
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
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          </Form>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={fundingForm.handleSubmit(addFunding)}
          >
            <Plus className="h-4 w-4" /> Ajouter au capital
          </Button>
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <Button type="submit" form={IDENTITY_FORM_ID} className="gap-2">
          Suivant <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
