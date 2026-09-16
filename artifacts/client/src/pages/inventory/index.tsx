import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { useInventoryState } from "./hooks/useInventoryState";
import { InventoryTable } from "./components/InventoryTable";
import { MovementHistory } from "./components/MovementHistory";

export default function Inventory() {
  const state = useInventoryState();
  const { totalValue } = state;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stocks</h1>
          <p className="text-muted-foreground mt-1">Valorisation et mouvements (Matières & Produits finis)</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <InventoryTable state={state} />
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-primary-foreground/80 mb-2">Valeur Totale du Stock</p>
              <h2 className="text-3xl font-bold">{formatMoney(totalValue)}</h2>
            </CardContent>
          </Card>
          <MovementHistory state={state} />
        </div>
      </div>
    </div>
  );
}
