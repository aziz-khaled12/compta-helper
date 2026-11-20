import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTranslation } from "react-i18next";
import {
  debtFormSchema,
  type DebtFormValues,
  type DebtsState,
} from "../hooks/useDebtsState";

function emptyDebt(): DebtFormValues {
  return {
    personName: "",
    direction: "I_OWE",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    note: "",
  };
}

export function DebtFormDialog({ state }: { state: DebtsState }) {
  const { t } = useTranslation();
  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: emptyDebt(),
  });

  // A submitted or abandoned draft must not reappear on the next open.
  useEffect(() => {
    if (state.isCreateOpen) form.reset(emptyDebt());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isCreateOpen]);

  return (
    <Dialog
      open={state.isCreateOpen}
      onOpenChange={(open) => !open && state.setIsCreateOpen(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("debts.dialog.title")}</DialogTitle>
          <DialogDescription>{t("debts.dialog.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(state.addDebt)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="personName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t("debts.form.personName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("debts.form.personNamePlaceholder")}
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
                    <FormLabel>{t("debts.form.direction")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="I_OWE">
                          {t("debts.direction.iOwe")}
                        </SelectItem>
                        <SelectItem value="OWED_TO_ME">
                          {t("debts.direction.owedToMe")}
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
                    <FormLabel>{t("debts.form.amount")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
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
                    <FormLabel>{t("debts.form.date")}</FormLabel>
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
                  <FormItem>
                    <FormLabel>{t("debts.form.note")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={state.createDebt.isPending}
            >
              {t("debts.dialog.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
