import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, MoveHorizontal } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { useListInventoryItems, useListInventoryMovements } from "@workspace/api-client-react";

export function StockPreview() {
  const { data: items } = useListInventoryItems();
  const { data: movements } = useListInventoryMovements();
  const nameById = new Map<string, string>((items ?? []).map((i) => [i.id, i.name]));
  const recent = (movements ?? []).slice(0, 8);

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><MoveHorizontal className="h-5 w-5 text-primary" />Mouvements de Stock Récents</CardTitle>
          <Link href="/inventory"><Button variant="outline" size="sm">Voir les stocks</Button></Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recent.map((m) => {
            const isIn = m.direction === "IN";
            return (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isIn ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"}`}>
                    {isIn ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{nameById.get(m.itemId) ?? "Article"}</p>
                    <p className="text-xs text-muted-foreground">{isIn ? "Entrée" : "Sortie"} · {m.quantity} · {String(m.date).slice(0, 10)}</p>
                  </div>
                </div>
                <div className="text-right text-sm font-semibold">{isIn ? "+" : "-"}{formatMoney(m.quantity * m.unitCostHt)}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
