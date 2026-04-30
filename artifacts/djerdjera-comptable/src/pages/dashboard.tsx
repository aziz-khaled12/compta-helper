import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatMoney } from "@/lib/format";
import {
  useGetCompany,
  useGetDashboardSummary,
  useGetMonthlyPnl,
  useGetRecentActivity,
  useGetTvaSummary,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  ComposedChart
} from "recharts";
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";

export default function Dashboard() {
  const { data: company, isLoading: loadingCompany } = useGetCompany();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: pnl, isLoading: loadingPnl } = useGetMonthlyPnl();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: tva, isLoading: loadingTva } = useGetTvaSummary();

  if (loadingCompany || loadingSummary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-6">
        <div className="bg-card border rounded-lg p-12 shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Bienvenue sur DJERDJERA Comptable</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Votre espace de gestion comptable et financière. Pour commencer, veuillez configurer le profil de votre entreprise.
          </p>
          <Link href="/company">
            <Button size="lg" className="w-full sm:w-auto">
              Configurer l'entreprise
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de la situation financière de {company.name}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chiffre d'Affaires HT</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(summary?.totalRevenueHt)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dépenses & Achats HT</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney((summary?.totalExpensesHt || 0) + (summary?.totalPurchasesHt || 0))}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trésorerie Nette</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(summary?.cashPosition)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde TVA</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary?.tvaNet && summary.tvaNet > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {formatMoney(summary?.tvaNet)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.tvaNet && summary.tvaNet > 0 ? "TVA à décaisser" : "Crédit de TVA"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart */}
        <Card className="col-span-4 bg-card">
          <CardHeader>
            <CardTitle>Résultat Mensuel (12 mois)</CardTitle>
            <CardDescription>Évolution des recettes et dépenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loadingPnl ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={pnl} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="monthYear" 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      dx={-10}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatMoney(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Area type="monotone" dataKey="revenue" name="Recettes" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" />
                    <Line type="monotone" dataKey="expenses" name="Dépenses" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3 bg-card">
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>Dernières opérations enregistrées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingActivity ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : activity?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Aucune activité récente</div>
              ) : (
                activity?.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        item.type === 'SALE' ? 'bg-emerald-100 text-emerald-600' :
                        item.type === 'PURCHASE' ? 'bg-orange-100 text-orange-600' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        {item.type === 'SALE' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.thirdParty || 'Divers'}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${
                      item.type === 'SALE' ? 'text-emerald-600' : 'text-foreground'
                    }`}>
                      {item.type === 'SALE' ? '+' : '-'}{formatMoney(item.amountTtc)}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/journal">
                <Button variant="outline" className="w-full">Voir tout le journal</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Immobilisations Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(summary?.totalAssetsValue)}</div>
            <Link href="/assets" className="text-xs text-primary hover:underline mt-2 inline-block">Gérer le parc</Link>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Effectif Actif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalEmployees || 0} employés</div>
            <Link href="/employees" className="text-xs text-primary hover:underline mt-2 inline-block">Gérer le personnel</Link>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Masse Salariale (Mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(summary?.totalPayrollMonth)}</div>
            <Link href="/payroll" className="text-xs text-primary hover:underline mt-2 inline-block">Aller à la paie</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}