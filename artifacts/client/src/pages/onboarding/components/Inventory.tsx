import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OnboardingState } from "../hooks/useOnboardingState";
import {
  INVENTORY_CATEGORY_LABELS,
  inventorySchema,
  type InventoryData,
} from "../types";

function emptyItem(): InventoryData {
  return {
    name: "",
    category: "RAW_MATERIAL",
    unit: "pièce",
    initialQty: 0,
    unitCostHt: 0,
  };
}

export function Inventory({ state }: { state: OnboardingState }) {
  const form = useForm<InventoryData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: emptyItem(),
  });

  const addItem = (values: InventoryData) => {
    state.setInventory([...state.inventory, values]);
    form.reset(emptyItem());
  };

  const removeItem = (index: number) =>
    state.setInventory(state.inventory.filter((_, i) => i !== index));

  /** Same reasoning as the immobilisations step — see Assets.tsx. */
  const next = () => {
    const pending = form.getValues();
    const parsed = inventorySchema.safeParse(pending);
    const started =
      pending.name.trim() !== "" ||
      pending.initialQty > 0 ||
      pending.unitCostHt > 0;

    if (started && !parsed.success) {
      toast.error("Article incomplet", {
        description:
          "Complétez la désignation, la quantité et le coût unitaire, ou videz les champs pour l'ignorer.",
      });
      return;
    }

    if (parsed.success) state.setInventory([...state.inventory, parsed.data]);
    state.nextStep();
  };

  return (
    <div className="space-y-6">
      {state.inventory.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {state.inventory.length} article(s) ajouté(s)
          </p>
          {state.inventory.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30"
            >
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {INVENTORY_CATEGORY_LABELS[item.category]} — {item.initialQty}{" "}
                  {item.unit} @ {item.unitCostHt.toLocaleString("fr-DZ")} DA/u
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(addItem)}
          className="space-y-4 border rounded-xl p-4 bg-muted/10"
        >
          <p className="text-sm font-semibold">Ajouter un article de stock</p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Désignation *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex. Farine T45" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(INVENTORY_CATEGORY_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unité *</FormLabel>
                  <FormControl>
                    <Input placeholder="pièce / kg / L..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="initialQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantité initiale *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="50"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitCostHt"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Coût unitaire HT (DA) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="500"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </form>
      </Form>

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={state.backStep}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        <Button type="button" onClick={next} className="gap-2">
          Suivant <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
