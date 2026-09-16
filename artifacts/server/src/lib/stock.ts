/**
 * Stock valuation under the Algerian SCF perpetual system (inventaire permanent).
 *
 * Every movement is valued as it is recorded, so at any instant an article has a
 * quantity and a value, and the two give the **CUMP** (coût unitaire moyen
 * pondéré) that the next outgoing movement is relieved at:
 *
 *   - **IN** (a purchase, or stock added by hand) — adds `quantity × unitCostHt`
 *     to the value and the quantity to the balance. The CUMP moves as a result.
 *   - **OUT** (a sale) — relieves `quantity × CUMP`, where CUMP is the weighted
 *     average *at that moment*, not the cost stored on the movement row.
 *
 * That last point is the whole difference between this and a running total of
 * `Σ(in) − Σ(out × own cost)`. Both agree when every OUT is recorded at the CUMP
 * prevailing when it was posted — which is the normal path — but only the moving
 * average stays correct when a movement was recorded some other way.
 *
 * Worked example: 20 units at 47 000, then sales of 2, 2, 4 and 10.
 *
 *   | after    | quantity | value    | CUMP   |
 *   |----------|----------|----------|--------|
 *   | the IN   |       20 |  940 000 | 47 000 |
 *   | sale of 2|       18 |  846 000 | 47 000 |
 *   | sale of 2|       16 |  752 000 | 47 000 |
 *   | sale of 4|       12 |  564 000 | 47 000 |
 *   | sale of 10|       2 |   94 000 | 47 000 |
 *
 * 846 000 of cost relieved against 1 026 000 of revenue is the 180 000 marge
 * brute the perpetual system is supposed to produce.
 *
 * Note: movements carry a `date` but no sequence number, so a back-dated entry
 * is applied in date order and cannot be interleaved into the exact position it
 * would have occupied on the day it was typed. The resulting CUMP is therefore
 * the one implied by the recorded dates, which is what a paper ledger would show.
 */

/** The minimum a movement must expose to be valued. */
export interface StockMovement {
  /** `YYYY-MM-DD`. Optional so callers that already ordered their rows can omit it. */
  date?: string | Date | null;
  direction: string;
  quantity: number;
  unitCostHt: number;
}

export interface StockState {
  quantity: number;
  /** Book value in DA. Never negative — see `computeStockState`. */
  value: number;
  /** CUMP: `value / quantity`, or 0 when nothing is left. */
  unitCost: number;
}

export const EMPTY_STOCK: StockState = { quantity: 0, value: 0, unitCost: 0 };

function byDate(a: StockMovement, b: StockMovement): number {
  const da = a.date == null ? "" : String(a.date).slice(0, 10);
  const db = b.date == null ? "" : String(b.date).slice(0, 10);
  return da.localeCompare(db);
}

/**
 * The quantity and value an article holds after applying `movements` in date
 * order.
 *
 * An OUT larger than the balance relieves what is there and stops, rather than
 * driving the book value negative. The routes refuse to over-sell in the first
 * place; this is the backstop for movements that predate that check, or that
 * were entered by hand on the Stocks page.
 */
export function computeStockState(movements: StockMovement[]): StockState {
  let quantity = 0;
  let value = 0;

  for (const m of [...movements].sort(byDate)) {
    const q = Number(m.quantity) || 0;
    const cost = Number(m.unitCostHt) || 0;

    if (m.direction === "IN") {
      quantity += q;
      value += q * cost;
      continue;
    }

    // Relieve at the average as it stands *now*, which is what makes this a
    // moving average rather than a replay of whatever cost the row recorded.
    const cump = quantity > 0 ? value / quantity : 0;
    const relieved = Math.min(q, quantity);
    quantity -= relieved;
    value -= relieved * cump;
  }

  // Floating-point drift on a long ledger can leave a hair below zero.
  if (value < 0.005) value = 0;
  if (quantity <= 0) return { quantity: 0, value: 0, unitCost: 0 };

  return { quantity, value, unitCost: value / quantity };
}

/**
 * The unit cost a new OUT of `item` should be relieved at, given everything
 * recorded against it so far.
 *
 * Callers freeze the result onto the transaction (`unitCostHt`,
 * `costOfGoodsSold`) rather than recomputing it later: the CUMP moves as stock
 * moves, so re-deriving an old sale's cost at today's average would restate
 * books that have already been posted.
 */
export function cumpFor(movements: StockMovement[]): number {
  return computeStockState(movements).unitCost;
}

/** What an OUT of `quantity` costs at the current CUMP. */
export function costOfOutgoing(
  movements: StockMovement[],
  quantity: number,
): number {
  return cumpFor(movements) * quantity;
}
