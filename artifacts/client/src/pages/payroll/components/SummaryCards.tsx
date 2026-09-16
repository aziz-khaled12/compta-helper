import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

export function SummaryCards({ totalPayroll, totalCnas, totalIrg }: { totalPayroll: number, totalCnas: number, totalIrg: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-primary text-primary-foreground border-none">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-primary-foreground/80 mb-2">Total Net à Payer</p>
          <h2 className="text-3xl font-bold">{formatMoney(totalPayroll)}</h2>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">Total CNAS Retenue</p>
          <h2 className="text-2xl font-bold text-foreground">{formatMoney(totalCnas)}</h2>
          <p className="text-xs text-muted-foreground mt-1">Part ouvrière (9%)</p>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">Total IRG Retenu</p>
          <h2 className="text-2xl font-bold text-foreground">{formatMoney(totalIrg)}</h2>
          <p className="text-xs text-muted-foreground mt-1">Impôt sur le Revenu</p>
        </CardContent>
      </Card>
    </div>
  );
}
