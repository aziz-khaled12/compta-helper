import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  useListInventoryItems,
  getListInventoryItemsQueryKey,
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useListInventoryMovements,
  getListInventoryMovementsQueryKey,
  useCreateInventoryMovement,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { apiErrorMessage } from "@/lib/api-error";
import i18n from "@/i18n";

export const itemSchema = z.object({
  name: z.string().min(1, i18n.t("zod.required", { field: i18n.t("inventory.name") })),
  category: z.enum(["RAW_MATERIAL", "FINISHED_GOOD", "SUPPLY"]),
  unit: z.string().optional(),
});

export const movementSchema = z.object({
  itemId: z.string().min(1, i18n.t("zod.required", { field: i18n.t("inventory.movement.article") })),
  date: z.string(),
  quantity: z.coerce.number().min(0.01, i18n.t("zod.positive")),
  direction: z.enum(["IN", "OUT"]),
  unitCostHt: z.coerce.number().min(0, i18n.t("zod.positive")),
  note: z.string().optional(),
});

export type ItemFormValues = z.infer<typeof itemSchema>;
export type MovementFormValues = z.infer<typeof movementSchema>;

export function useInventoryState() {
  const queryClient = useQueryClient();
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");

  const { data: items = [], isLoading: loadingItems } = useListInventoryItems();
  const { data: movements = [], isLoading: loadingMovements } = useListInventoryMovements();
  
  const createItem = useCreateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const createMovement = useCreateInventoryMovement();

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", category: "RAW_MATERIAL", unit: "kg" },
  });

  const movementForm = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      itemId: "",
      date: new Date().toISOString().split('T')[0],
      quantity: 0,
      direction: "IN",
      unitCostHt: 0,
      note: "",
    },
  });

  const openMovementDialog = (type: "IN" | "OUT") => {
    setMovementType(type);
    movementForm.setValue("direction", type);
    setIsMovementOpen(true);
  };

  const onSubmitItem = (values: ItemFormValues) => {
    createItem.mutate({ data: values }, {
      onSuccess: () => {
        toast.success(i18n.t("inventory.toast.itemCreated"));
        setIsItemOpen(false);
        itemForm.reset();
        queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
      },
      onError: () => toast.error(i18n.t("inventory.toast.itemCreateError")),
    });
  };

  // Stock value feeds the dashboard, so a movement typed here leaves that stale
  // as well as the two inventory queries. Sales recorded in the journal are
  // unaffected — a hand-entered movement has no écriture behind it.
  const invalidateStock = () => {
    for (const queryKey of [
      getListInventoryItemsQueryKey(),
      getListInventoryMovementsQueryKey(),
      getGetDashboardSummaryQueryKey(),
      getGetRecentActivityQueryKey(),
    ]) {
      queryClient.invalidateQueries({ queryKey });
    }
  };

  const onSubmitMovement = (values: MovementFormValues) => {
    createMovement.mutate({ data: values }, {
      onSuccess: () => {
        toast.success(i18n.t("inventory.toast.movementSaved"));
        setIsMovementOpen(false);
        movementForm.reset();
        invalidateStock();
      },
      onError: (error) =>
        toast.error(apiErrorMessage(error) ?? i18n.t("inventory.toast.movementError")),
    });
  };

  const handleDeleteItem = (id: string) => {
    if (confirm(i18n.t("inventory.confirmDeleteItem"))) {
      deleteItem.mutate({ id }, {
        onSuccess: () => {
          toast.success(i18n.t("inventory.toast.itemDeleted"));
          invalidateStock();
        }
      });
    }
  };

  const totalValue = items.reduce((acc, i) => acc + i.totalValue, 0);

  return {
    items,
    movements,
    loadingItems,
    loadingMovements,
    isItemOpen,
    setIsItemOpen,
    isMovementOpen,
    setIsMovementOpen,
    movementType,
    openMovementDialog,
    itemForm,
    movementForm,
    onSubmitItem,
    onSubmitMovement,
    handleDeleteItem,
    totalValue,
    createItem,
    createMovement,
  };
}
