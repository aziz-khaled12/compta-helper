import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Receipt, Package } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { Link } from "wouter";
import { useDashboardState } from "../hooks/useDashboardState";

export function SummaryCards({ state }: { state: ReturnType<typeof useDashboardState> }) {
  const { summary } = state;
  const cards = [
    { title: "Immobilisations Net", icon: Activity, value: formatMoney(summary?.totalAssetsValue), link: "/assets", label: "Gérer le parc" },
    { title: "Effectif Actif", icon: Users, value: `${summary?.totalEmployees || 0} employés`, link: "/employees", label: "Gérer le personnel" },
    { title: "Masse Salariale (Mois)", icon: Receipt, value: formatMoney(summary?.totalPayrollMonth), link: "/payroll", label: "Aller à la paie" },
    { title: "Valeur du Stock", icon: Package, value: formatMoney(summary?.totalStockValue), link: "/inventory", label: "Gérer les stocks" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <Card key={i}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><c.icon className="h-4 w-4" />{c.title}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{c.value}</div><Link href={c.link} className="text-xs text-primary hover:underline mt-2 inline-block">{c.label}</Link></CardContent>
        </Card>
      ))}
    </div>
  );
}
