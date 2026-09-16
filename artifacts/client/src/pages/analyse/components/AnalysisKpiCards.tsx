import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Percent, Wallet, Package, Receipt, Clock } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { KpiSnapshot } from "@/lib/analytics/metrics";

/**
 * The headline figures, in the order the owner thinks about them: what came in,
 * what is left of it, what is in hand, what is on the shelf, what is owed to the
 * state, and what is owed to them.
 *
 * Each card carries a sub-line that says what the number *means* — "Au décaisser"
 * rather than a bare amount, "la plus ancienne : 74 jours" rather than a total
 * with no age on it. A reader who is not an accountant cannot infer which
 * direction is good from a signed number, so the card says it.
 */
export function AnalysisKpiCards({ kpi }: { kpi: KpiSnapshot }) {
  const treasury = kpi.cash + kpi.bank;
  const receivables = kpi.receivables;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Chiffre d'affaires HT
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMoney(kpi.revenueHt)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Ventes de la période, hors taxes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Marge brute
          </CardTitle>
          <Percent className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          {/* "—" and not "0 %": a company with no sales has no margin to speak
              of, and printing zero would read as a collapse in margin. */}
          <div className="text-2xl font-bold">
            {kpi.grossMarginPct === null
              ? "—"
              : `${(kpi.grossMarginPct * 100).toLocaleString("fr-DZ", {
                  maximumFractionDigits: 1,
                })} %`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {kpi.grossMarginPct === null
              ? "Aucune vente sur la période"
              : `${formatMoney(kpi.grossMarginHt)} après coût des marchandises`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Trésorerie
          </CardTitle>
          <Wallet className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${treasury < 0 ? "text-destructive" : ""}`}
          >
            {formatMoney(treasury)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatMoney(kpi.cash)} en caisse · {formatMoney(kpi.bank)} en banque
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Valeur du stock
          </CardTitle>
          <Package className="h-4 w-4 text-violet-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMoney(kpi.stockValue)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Au coût moyen pondéré
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            TVA
          </CardTitle>
          <Receipt className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              kpi.tvaNet > 0 ? "text-destructive" : "text-emerald-600"
            }`}
          >
            {formatMoney(kpi.tvaNet)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {kpi.tvaNet > 0 ? "À décaisser" : "Crédit de TVA"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Impayés clients
          </CardTitle>
          <Clock className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatMoney(receivables.amountTtc)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {receivables.count === 0
              ? "Aucune facture en attente"
              : `${receivables.count} facture${receivables.count > 1 ? "s" : ""}${
                  receivables.oldestDays !== null
                    ? ` · la plus ancienne : ${receivables.oldestDays} jours`
                    : ""
                }`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
