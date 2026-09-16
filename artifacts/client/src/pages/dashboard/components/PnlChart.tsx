import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart } from "recharts";
import { formatMoney } from "@/lib/format";
import { useDashboardState } from "../hooks/useDashboardState";

export function PnlChart({ state }: { state: ReturnType<typeof useDashboardState> }) {
  const { pnl } = state;
  return (
    <Card className="col-span-4">
      <CardHeader><CardTitle>Résultat Mensuel</CardTitle><CardDescription>Recettes vs Dépenses</CardDescription></CardHeader>
      <CardContent>
        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pnl} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="monthYear" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} dx={-10} />
              <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="revenue" name="Recettes" stroke="hsl(var(--primary))" fillOpacity={1} fill="hsl(var(--primary)/.1)" />
              <Line type="monotone" dataKey="expenses" name="Dépenses" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
