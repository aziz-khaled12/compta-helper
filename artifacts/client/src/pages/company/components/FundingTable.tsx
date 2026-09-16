import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";
import { useCompanyState } from "../hooks/useCompanyState";

export function FundingTable({ state }: { state: ReturnType<typeof useCompanyState> }) {
  const { funding, handleDeleteFunding } = state;
  if (funding.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
        Aucun apport ou emprunt enregistré
      </div>
    );
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {funding.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-sm">{formatDate(item.date)}</TableCell>
              <TableCell>
                <div>
                  <span className="font-medium text-sm">{item.source === "OWN_FUNDS" ? "Apport" : "Emprunt"}</span>
                  {item.label && <div className="text-xs text-muted-foreground">{item.label}</div>}
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">{formatMoney(item.amount)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteFunding(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
