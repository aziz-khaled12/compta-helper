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
  useCreateTransactionPayment,
  useDeleteTransaction,
  useListInventoryItems,
  getListInventoryItemsQueryKey,
  getListInventoryMovementsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMonthlyPnlQueryKey,
  getGetRecentActivityQueryKey,
  getGetTvaSummaryQueryKey,
  getListTransactionPaymentsQueryKey,
  getListSettlementsQueryKey,
} from "@workspace/api-client-react";
import type { Transaction } from "@workspace/api-client-react";

export const transactionSchema = z
  .object({
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
     * Amount already settled on a partial entry. It is stored as a real payment
     * row, since the API derives the displayed status from those rows.
     */
    paidAmount: z.coerce.number().min(0).optional(),
    paidMethod: z.enum(["CASH", "BANK"]).optional(),
    /**
     * The article this entry moves. Optional: an entry that names none behaves
     * exactly as it did before the perpetual system existed, and is written to the
     * books without a stock side.
     */
    itemId: z.string().optional(),
    /** Required by the API whenever `itemId` is set. */
    quantity: z.coerce.number().min(0).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.status !== "PARTIAL") return;
    // The advance has to leave something due; an amount that reaches the TTC is
    // simply a paid entry, and zero would read back as "impayé".
    const ttc = values.amountHt * (1 + values.tvaRate / 100);
    const paid = values.paidAmount ?? 0;
    if (!(paid > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidAmount"],
        message: i18n.t("zod.partialPaidRequired"),
      });
      return;
    }
    if (paid >= ttc - 0.005) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidAmount"],
        message: i18n.t("zod.partialPaidTooHigh"),
      });
    }
  });


export type TransactionFormValues = z.infer<typeof transactionSchema>;

export function useJournalState() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | "SALE" | "PURCHASE" | "EXPENSE">("ALL");
  const [isOpen, setIsOpen] = useState(false);
  // Which rows have their écriture showing. A set rather than a single id so two
  // entries can be compared side by side.
  const [paymentMode, setPaymentMode] = useState<"FULL" | "PARTIAL" | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useListTransactions();
  // The article list backs the form's article picker and the CUMP/balance hints,
  // and lets the table name the article an entry moved.
  const { data: items = [] } = useListInventoryItems();
  const createTransaction = useCreateTransaction();
  const createPayment = useCreateTransactionPayment();
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
      paidAmount: 0,
      paidMethod: "BANK",
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
      // A payment (or an entry that carries an advance) is a movement through
      // the caisse or the banque, so the settlement ledger is stale as well.
      getListSettlementsQueryKey(),
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

    // The advance is only sent for a partial entry; the API refuses it for any
    // other status, and a fully paid entry needs no payment row.
    const { paidAmount, paidMethod, ...entry } = values;
    const data =
      values.status === "PARTIAL"
        ? {
            ...entry,
            itemId,
            quantity,
            paidAmount: paidAmount ?? 0,
            paidMethod: paidMethod ?? "BANK",
          }
        : { ...entry, itemId, quantity };

    createTransaction.mutate(
      { data },
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
            paidAmount: 0,
            paidMethod: "BANK",
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

  const openPayment = (transaction: Transaction, mode: "FULL" | "PARTIAL") => {
    setSelectedTransaction(transaction);
    setPaymentMode(mode);
  };

  const closePayment = () => {
    setSelectedTransaction(null);
    setPaymentMode(null);
  };

  const invalidatePayment = (id: string) => {
    invalidateBooks();
    queryClient.invalidateQueries({ queryKey: getListTransactionPaymentsQueryKey(id) });
  };

  const filteredTransactions = transactions.filter((t) => filter === "ALL" || t.type === filter);

  // The table names articles and derives their stock side, so it needs the
  // catalogue by id rather than as a list.
  const itemById = new Map(items.map((i) => [i.id, i]));

  return {
    filter,
    setFilter,
    isOpen,
    setIsOpen,
    paymentMode,
    selectedTransaction,
    detailsTransaction,
    setDetailsTransaction,
    transactions,
    isLoading,
    items,
    itemById,
    createTransaction,
    createPayment,
    form,
    tvaAmount,
    amountTtc,
    onSubmit,
    handleDelete,
    openPayment,
    closePayment,
    invalidatePayment,
    filteredTransactions,
  };
}
