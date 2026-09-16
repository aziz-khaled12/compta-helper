import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useJournalState } from "./hooks/useJournalState";
import { TransactionForm } from "./components/TransactionForm";
import { JournalTable } from "./components/JournalTable";

export default function Journal() {
  const state = useJournalState();
  const { setIsOpen } = state;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal</h1>
          <p className="text-muted-foreground mt-1">Livre journal des recettes et dépenses</p>
        </div>

        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle écriture
        </Button>
      </div>

      <TransactionForm state={state} />

      <Card className="bg-card">
        <CardContent className="p-0">
          <JournalTable state={state} />
        </CardContent>
      </Card>
    </div>
  );
}
