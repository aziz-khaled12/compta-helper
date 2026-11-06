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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { compactAmount } from "@/lib/money";
import { useTranslation } from "react-i18next";
import type { OnboardingState } from "../hooks/useOnboardingState";
import { employeeSchema, type EmployeeData } from "../types";

const FAMILY_SITUATIONS = [
  "SINGLE",
  "MARRIED",
  "MARRIED_1_CHILD",
  "MARRIED_2_CHILDREN",
  "MARRIED_3_CHILDREN",
  "MARRIED_4_PLUS_CHILDREN",
] as const;

function emptyEmployee(): EmployeeData {
  return {
    fullName: "",
    position: "",
    familySituation: "SINGLE",
    baseSalary: 0,
    experienceYears: 0,
    hireDate: new Date().toISOString().slice(0, 10),
  };
}

export function Personnel({ state }: { state: OnboardingState }) {
  const { t } = useTranslation();
  const form = useForm<EmployeeData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: emptyEmployee(),
  });

  const addEmployee = (values: EmployeeData) => {
    state.setEmployees([...state.employees, values]);
    form.reset(emptyEmployee());
  };

  const removeEmployee = (index: number) =>
    state.setEmployees(state.employees.filter((_, i) => i !== index));

  /**
   * The wizard no longer ends here — debts are step 5 — so a row that was typed
   * but never committed must ride along with "Suivant" or it would vanish when
   * this screen unmounts.
   */
  const next = () => {
    const pending = form.getValues();
    const parsed = employeeSchema.safeParse(pending);
    const started =
      pending.fullName.trim() !== "" ||
      pending.position.trim() !== "" ||
      pending.baseSalary > 0;

    // Half-filled rather than empty: say so instead of advancing without it.
    if (started && !parsed.success) {
      toast.error(t("onboarding.employee.incomplete"), {
        description: t("onboarding.employee.incompleteDesc"),
      });
      return;
    }

    if (parsed.success) {
      state.setEmployees([...state.employees, parsed.data]);
    }
    state.nextStep();
  };

  return (
    <div className="space-y-6">
      {state.employees.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("onboarding.employeesAdded", { count: state.employees.length })}
          </p>
          {state.employees.map((employee, index) => (
            <div
              key={index}
              className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30"
            >
              <div>
                <p className="text-sm font-medium">{employee.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.employee.rowSummary", {
                    position: employee.position,
                    salary: compactAmount(employee.baseSalary),
                    situation: t(`consts.employee.familySituation.${employee.familySituation}`),
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeEmployee(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(addEmployee)}
          className="space-y-4 border rounded-xl p-4 bg-muted/10"
        >
          <p className="text-sm font-semibold">{t("onboarding.addEmployee")}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.employee.fullName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("onboarding.employee.fullNamePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.employee.position")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("onboarding.employee.positionPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="familySituation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.employee.familySituation")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FAMILY_SITUATIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`consts.employee.familySituation.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.employee.baseSalary")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
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
              name="experienceYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.employee.experience")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
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
              name="hireDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("onboarding.employee.hireDate")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> {t("onboarding.employee.add")}
          </Button>
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
          onClick={next}
          disabled={state.submitting}
          className="gap-2"
        >
          {t("onboarding.next")} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
