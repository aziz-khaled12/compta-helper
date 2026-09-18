import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api-error";
import i18n from "@/i18n";
import {
  useListTransactions,
  getListTransactionsQueryKey,
  useCreateTransaction,
  useDeleteTransaction,
  useListInventoryItems,
  getListInventoryItemsQueryKey,
  getListInventoryMovementsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMonthlyPnlQueryKey,
  getGetRecentActivityQueryKey,
  getGetTvaSummaryQueryKey,
} from "@workspace/api-client-react";

export const transactionSchema = z.object({
  type: z.enum(["SALE", "PURCHASE", "EXPENSE"]),
  date: z.string(),
  label: z.string().min(1, i18n.t("zod.required", { field: i18n.t("journal.form.label") })),
  thirdParty: z.string().optional(),
  category: z.string().optional(),
  amountHt: z.coerce.number().min(0, i18n.t("zod.positive")),
  tvaRate: z.coerce.number().min(0).max(100),
  paymentMethod: z.enum(["CASH", "BANK", "CREDIT"]),
  status: z.enum(["PAID", "UNPAID", "PARTIAL"]),
  /**
   * The article this entry moves. Optional: an entry that names none behaves
   * exactly as it did before the perpetual system existed, and is written to the
   * books without a stock side.
   */
  itemId: z.string().optional(),
  /** Required by the API whenever `itemId` is set. */
  quantity: z.coerce.number().min(0).optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export function useJournalState() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | "SALE" | "PURCHASE" | "EXPENSE">("ALL");
  const [isOpen, setIsOpen] = useState(false);
  // Which rows have their écriture showing. A set rather than a single id so two
  // entries can be compared side by side.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: transactions = [], isLoading } = useListTransactions();
  // The article list backs the form's article picker and the CUMP/balance hints,
  // and lets the table name the article an entry moved.
  const { data: items = [] } = useListInventoryItems();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "EXPENSE",
      date: new Date().toISOString().split("T")[0],
      label: "",
      thirdParty: "",
      category: "",
      amountHt: 0,
      tvaRate: 19,
      paymentMethod: "BANK",
      status: "PAID",
      itemId: "",
      quantity: 0,
    },
  });

  const watchType = form.watch("type");
  const watchHt = form.watch("amountHt");
  const watchTvaRate = form.watch("tvaRate");

  const htNum = Number(watchHt) || 0;
  const tvaRateNum = Number(watchTvaRate) || 0;
  const tvaAmount = (htNum * tvaRateNum) / 100;
  const amountTtc = htNum + tvaAmount;

  useEffect(() => {
    if (watchType === "SALE") form.setValue("category", "Marchandises");
    else if (watchType === "PURCHASE") form.setValue("category", "Matières Premières");
    else if (watchType === "EXPENSE") form.setValue("category", "Charges Générales");
  }, [watchType, form]);

  // Writing or removing an entry can move stock, so the two inventory queries
  // are stale as well as the books. Cheap to over-invalidate here; a missed one
  // shows the user a balance that disagrees with what they just recorded.
  const invalidateBooks = () => {
    for (const queryKey of [
      getListTransactionsQueryKey(),
      getListInventoryItemsQueryKey(),
      getListInventoryMovementsQueryKey(),
      getGetDashboardSummaryQueryKey(),
      getGetMonthlyPnlQueryKey(),
      getGetRecentActivityQueryKey(),
      getGetTvaSummaryQueryKey(),
    ]) {
      queryClient.invalidateQueries({ queryKey });
    }
  };

  const onSubmit = (values: TransactionFormValues) => {
    // The form's article picker starts empty, and an empty string is not a
    // uuid. Clearing both fields together keeps the pair consistent — the API
    // rejects an itemId without a positive quantity.
    const itemId = values.itemId || null;
    const quantity = itemId ? (values.quantity ?? 0) : null;

    createTransaction.mutate(
      { data: { ...values, itemId, quantity } },
      {
        onSuccess: () => {
          toast.success(i18n.t("journal.toast.created"));
          setIsOpen(false);
          form.reset({
            type: "EXPENSE",
            date: new Date().toISOString().split("T")[0],
            label: "",
            thirdParty: "",
            category: "Charges Générales",
            amountHt: 0,
            tvaRate: 19,
            paymentMethod: "BANK",
            status: "PAID",
            itemId: "",
            quantity: 0,
          });
          invalidateBooks();
        },
        onError: (error) => {
          // The API's stock-sufficiency message is written for the user and is
          // the only place that says *why* a sale was refused, so it is shown
          // rather than replaced with a generic failure.
          toast.error(
            apiErrorMessage(error) ?? i18n.t("journal.toast.saveError"),
          );
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    if (confirm(i18n.t("journal.confirmDelete"))) {
      deleteTransaction.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success(i18n.t("journal.toast.deleted"));
            invalidateBooks();
          },
        },
      );
    }
  };

  const filteredTransactions = transactions.filter((t) => filter === "ALL" || t.type === filter);

  // The table names articles and derives their stock side, so it needs the
  // catalogue by id rather than as a list.
  const itemById = new Map(items.map((i) => [i.id, i]));

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return {
    filter,
    setFilter,
    isOpen,
    setIsOpen,
    expandedIds,
    toggleExpanded,
    transactions,
    isLoading,
    items,
    itemById,
    createTransaction,
    form,
    tvaAmount,
    amountTtc,
    onSubmit,
    handleDelete,
    filteredTransactions,
  };
}
