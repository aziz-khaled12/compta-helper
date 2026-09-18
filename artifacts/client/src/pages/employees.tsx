import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  useListEmployees,
  getListEmployeesQueryKey,
  useCreateEmployee,
  useDeleteEmployee,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Briefcase, Calendar, Trash2, Heart } from "lucide-react";

const FAMILY_SITUATIONS = [
  "SINGLE",
  "MARRIED",
  "MARRIED_1_CHILD",
  "MARRIED_2_CHILDREN",
  "MARRIED_3_CHILDREN",
  "MARRIED_4_PLUS_CHILDREN",
] as const;

const familySituationLabel = (t: TFunction, value: string): string =>
  t(`consts.employee.familySituation.${value}`);

const employeeSchema = (t: TFunction) =>
  z.object({
    fullName: z.string().min(1, t("employees.nameRequired")),
    position: z.string().optional(),
    familySituation: z.enum(FAMILY_SITUATIONS),
    baseSalary: z.coerce.number().min(0, t("employees.salaryPositive")),
    experienceYears: z.coerce.number().min(0).default(0),
    hireDate: z.string(),
  });

type EmployeeFormValues = z.infer<ReturnType<typeof employeeSchema>>;

export default function Employees() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: employees, isLoading } = useListEmployees();
  const createEmployee = useCreateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema(t)),
    defaultValues: {
      fullName: "",
      position: "",
      familySituation: "SINGLE",
      baseSalary: 0,
      experienceYears: 0,
      hireDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = (values: EmployeeFormValues) => {
    createEmployee.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success(t("employees.added"));
          setIsOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: () => {
          toast.error(t("employees.addError"));
        }
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(t("employees.removeConfirm", { name }))) {
      deleteEmployee.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success(t("employees.removed"));
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          }
        }
      );
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("employees.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("employees.subtitle")}</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("employees.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("employees.formTitle")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fullName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("employees.fullNamePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.position")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("employees.positionPlaceholder")} {...field} />
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
                        <FormLabel>{t("employees.hireDate")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="familySituation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.familySituation")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FAMILY_SITUATIONS.map((val) => (
                            <SelectItem key={val} value={val}>{familySituationLabel(t, val)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="baseSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.baseSalary")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
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
                        <FormLabel>{t("employees.experienceYears")}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full mt-6" disabled={createEmployee.isPending}>
                  {t("employees.saveEmployee")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {employees?.length === 0 ? (
        <Card className="bg-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t("employees.emptyTitle")}</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              {t("employees.emptyDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {employees?.map((emp) => (
            <Card key={emp.id} className="bg-card flex flex-col relative group">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(emp.id, emp.fullName)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg mb-3">
                  {emp.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <CardTitle>{emp.fullName}</CardTitle>
                <CardDescription className="text-primary">{emp.position || t("common.none")}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span>{familySituationLabel(t, emp.familySituation)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{t("employees.hiredOn", { date: formatDate(emp.hireDate) })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{t("employees.seniority", { years: emp.experienceYears || 0 })}</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t bg-muted/30 mt-auto flex justify-between items-center rounded-b-lg">
                <span className="text-xs font-medium text-muted-foreground">{t("employees.baseSalaryLabel")}</span>
                <span className="font-bold text-foreground">{formatMoney(emp.baseSalary)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}