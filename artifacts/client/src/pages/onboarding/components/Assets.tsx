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
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OnboardingState } from "../hooks/useOnboardingState";
import { assetSchema, type AssetData } from "../types";

function emptyAsset(): AssetData {
  return {
    label: "",
    category: "",
    costHt: 0,
    purchaseDate: new Date().toISOString().slice(0, 10),
    lifeYears: 5,
    residualValue: 0,
  };
}

export function Assets({ state }: { state: OnboardingState }) {
  const form = useForm<AssetData>({
    resolver: zodResolver(assetSchema),
    defaultValues: emptyAsset(),
  });

  const addAsset = (values: AssetData) => {
    state.setAssets([...state.assets, values]);
    form.reset(emptyAsset());
  };

  const removeAsset = (index: number) =>
    state.setAssets(state.assets.filter((_, i) => i !== index));

  /**
   * "Ajouter" is not the only way to finish a row — someone who types an
   * immobilisation and then clicks "Suivant" means to keep it. This screen
   * unmounts on advance, so an uncommitted row is gone for good.
   */
  const next = () => {
    const pending = form.getValues();
    const parsed = assetSchema.safeParse(pending);
    const started =
      pending.label.trim() !== "" ||
      pending.category.trim() !== "" ||
      pending.costHt > 0;

    // Refusing to advance beats dropping the row: the toast says which fields
    // to complete, and clearing them is how the user says "never mind".
    if (started && !parsed.success) {
      toast.error("Immobilisation incomplète", {
        description:
          "Complétez la désignation, la catégorie et la valeur d'acquisition, ou videz les champs pour l'ignorer.",
      });
      return;
    }

    if (parsed.success) state.setAssets([...state.assets, parsed.data]);
    state.nextStep();
  };

  return (
    <div className="space-y-6">
      {state.assets.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {state.assets.length} immobilisation(s) ajoutée(s)
          </p>
          {state.assets.map((asset, index) => (
            <div
              key={index}
              className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30"
            >
              <div>
                <p className="text-sm font-medium">{asset.label}</p>
                <p className="text-xs text-muted-foreground">
                  {asset.category} — {asset.costHt.toLocaleString("fr-DZ")} DA HT
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAsset(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(addAsset)}
          className="space-y-4 border rounded-xl p-4 bg-muted/10"
        >
          <p className="text-sm font-semibold">Ajouter une immobilisation</p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Désignation *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex. Véhicule utilitaire" {...field} />
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
                  <FormControl>
                    <Input placeholder="ex. Matériel roulant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costHt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valeur d'acquisition HT (DA) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="1000000"
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
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'acquisition *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lifeYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durée de vie (années) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
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
              name="residualValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valeur résiduelle (DA)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
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
