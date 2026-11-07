import { db, transactionPaymentsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

/**
 * Total settled against each of the given factures.
 *
 * One grouped query rather than one per row. The journal lists up to 500
 * entries, and a lookup per row turns a page load into 500 round-trips — on a
 * suspended Neon branch that is seconds of latency, and on a cold pool it is
 * how a slow page becomes a failed one.
 */
export async function paidByTransactionId(
  transactionIds: string[],
): Promise<Map<string, number>> {
  const paid = new Map<string, number>();
  if (transactionIds.length === 0) return paid;

  const rows = await db
    .select({
      transactionId: transactionPaymentsTable.transactionId,
      amount: transactionPaymentsTable.amount,
    })
    .from(transactionPaymentsTable)
    .where(inArray(transactionPaymentsTable.transactionId, transactionIds));

  for (const row of rows) {
    paid.set(
      row.transactionId,
      (paid.get(row.transactionId) ?? 0) + Number(row.amount),
    );
  }
  return paid;
}

export interface FactureState {
  paid: number;
  rest: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
}

/**
 * The settlement state of one facture, derived from its payment rows.
 *
 * `storedStatus` is only consulted for legacy entries: a facture marked PAID
 * before payments were recorded has no payment rows, and reading it as unpaid
 * would reopen an invoice that is already settled. PARTIAL is deliberately
 * *not* reconstructed that way — the old form let a user pick it without naming
 * an amount, so there is nothing to infer, and the whole total stays due until
 * a payment is actually recorded.
 */
export function factureState(
  amountTtc: number,
  storedStatus: string,
  paid: number,
): FactureState {
  const settled = paid === 0 && storedStatus === "PAID" ? amountTtc : paid;
  return {
    paid: settled,
    rest: Math.max(0, amountTtc - settled),
    status: settled >= amountTtc ? "PAID" : settled > 0 ? "PARTIAL" : "UNPAID",
  };
}
