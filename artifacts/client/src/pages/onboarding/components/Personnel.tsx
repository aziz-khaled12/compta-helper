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
  ArrowRight,
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { OnboardingState } from "../hooks/useOnboardingState";
import {
  FAMILY_SITUATION_LABELS,
  employeeSchema,
  type EmployeeData,
} from "../types";

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

  const finish = () => {
    // Committing here rather than on "Suivant": this is the last screen, so a
    // filled-in row that was never clicked "Ajouter" would be lost for good.
    const pending = form.getValues();
    const parsed = employeeSchema.safeParse(pending);
    const started =
      pending.fullName.trim() !== "" ||
      pending.position.trim() !== "" ||
      pending.baseSalary > 0;

    // Half-filled rather than empty: say so instead of finishing without it.
    if (started && !parsed.success) {
      toast.error("Employé incomplet", {
        description:
          "Complétez le nom, le poste et le salaire, ou videz les champs pour l'ignorer.",
      });
      return;
    }

    const employees = parsed.success
      ? [...state.employees, parsed.data]
      : state.employees;
    void state.handleFinish({ employees });
  };

  return (
    <div className="space-y-6">
      {state.employees.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {state.employees.length} employé(s) ajouté(s)
          </p>
          {state.employees.map((employee, index) => (
            <div
              key={index}
              className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30"
            >
              <div>
                <p className="text-sm font-medium">{employee.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {employee.position} — {employee.baseSalary.toLocaleString("fr-DZ")} DA
                  base — {FAMILY_SITUATION_LABELS[employee.familySituation]}
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
          <p className="text-sm font-semibold">Ajouter un employé</p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom & Prénom *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex. Ahmed Benali" {...field} />
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
                  <FormLabel>Poste / Fonction *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex. Comptable" {...field} />
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
                  <FormLabel>Situation familiale</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(FAMILY_SITUATION_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
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
                  <FormLabel>Salaire de base (DA) *</FormLabel>
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
                  <FormLabel>Années d'ancienneté</FormLabel>
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
                  <FormLabel>Date d'embauche *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter
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
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        <Button
          type="button"
          onClick={finish}
          disabled={state.submitting}
          className="gap-2"
        >
          {state.submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
            </>
          ) : (
            <>
              Terminer la configuration <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
