import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/date-input";
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
import { ArrowRight, ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { compactAmount } from "@/lib/money";
import { useTranslation } from "react-i18next";
import type { OnboardingState } from "../hooks/useOnboardingState";
import { debtSchema, type DebtData } from "../types";

function emptyDebt(): DebtData {
  return {
    personName: "",
    direction: "I_OWE",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    note: "",
  };
}

export function Debts({ state }: { state: OnboardingState }) {
  const { t } = useTranslation();
  const form = useForm<DebtData>({
    resolver: zodResolver(debtSchema),
    defaultValues: emptyDebt(),
  });

  const addDebt = (values: DebtData) => {
    state.setDebts([...state.debts, { ...values, note: values.note?.trim() ?? "" }]);
    form.reset(emptyDebt());
  };

  const removeDebt = (index: number) =>
    state.setDebts(state.debts.filter((_, i) => i !== index));

  const finish = () => {
    // Last screen of the wizard: a row that was typed but never clicked
    // "Ajouter" has nowhere else to be saved, so it is committed here.
    const pending = form.getValues();
    const parsed = debtSchema.safeParse(pending);
    const started =
      pending.personName.trim() !== "" || Number(pending.amount) > 0;

    if (started && !parsed.success) {
      toast.error(t("onboarding.debt.incomplete"), {
        description: t("onboarding.debt.incompleteDesc"),
      });
      return;
    }

    const debts = parsed.success
      ? [...state.debts, parsed.data]
      : state.debts;
    void state.handleFinish({ debts });
  };

  return (
    <div className="space-y-6">
      {state.debts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("onboarding.debtsAdded", { count: state.debts.length })}
          </p>
          {state.debts.map((debt, index) => (
            <div
              key={index}
              className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30"
            >
              <div>
                <p className="text-sm font-medium">{debt.personName}</p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.debt.rowSummary", {
                    direction:
                      debt.direction === "I_OWE"
                        ? t("onboarding.debt.iOwe")
                        : t("onboarding.debt.owedToMe"),
                    amount: compactAmount(debt.amount),
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeDebt(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(addDebt)}
          className="space-y-4 border rounded-xl p-4 bg-muted/10"
        >
          <p className="text-sm font-semibold">{t("onboarding.addDebt")}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="personName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.debt.personName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("onboarding.debt.personNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.debt.direction")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="I_OWE">
                        {t("onboarding.debt.iOwe")}
                      </SelectItem>
                      <SelectItem value="OWED_TO_ME">
                        {t("onboarding.debt.owedToMe")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.debt.amount")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="50000"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.debt.date")}</FormLabel>
                  <FormControl>
                    <DateInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{t("onboarding.debt.note")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> {t("onboarding.debt.add")}
          </Button>
          {/* A plain <p>: shadcn's FormDescription calls useFormField and must
              sit inside a <FormField>, which this hint does not belong to. */}
          <p className="text-xs text-muted-foreground">
            {t("onboarding.debtsHint")}
          </p>
        </form>
      </Form>

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={state.backStep}
          className="gap-2"
          disabled={state.submitting}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("onboarding.back")}
        </Button>
        <Button
          type="button"
          onClick={finish}
          disabled={state.submitting}
          className="gap-2"
        >
          {state.submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("onboarding.saving")}
            </>
          ) : (
            <>
              {t("onboarding.finish")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
