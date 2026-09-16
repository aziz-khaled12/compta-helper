/**
 * The double-entry behind a Journal line.
 *
 * The app stores one row per transaction (`transactions`), not a ledger of
 * débit/crédit lines — there is no `journal_entries` table and this module does
 * not ask for one. It *derives* the écriture from the row, the same way
 * `pages/reports/lib/calculations.ts` derives the statements from transactions
 * and movements. Deriving has a property storing does not: the displayed books
 * cannot disagree with the underlying data, because they are a function of it.
 *
 * Under the SCF perpetual system a sale is **two** writings, and this module
 * emits both:
 *
 *   Journal des Ventes        411 Clients            D  TTC
 *                             700 Ventes             C  HT
 *                             4457 TVA collectée     C  TVA
 *
 *   Bon de sortie             600/601/602 Coût       D  COGS
 *                             30/31/32/35 Stocks     C  COGS
 *
 * The second is the one that makes the system perpetual: it is what turns stock
 * into a charge at the moment of sale, instead of expensing the whole purchase
 * when it was bought.
 *
 * The règlement is deliberately absent. The journal des ventes records
 * *factures*; whether the client paid is a trésorerie question, and
 * `computeCaisseOrBanque` in the reports answers it. So the tiers account (411)
 * is used whatever the payment method — except on a charge, which the app
 * records as a cash event and which is written to 53/512 (see `cashAccount`).
 */

/** One débit or crédit line. Exactly one of `debit`/`credit` is non-zero. */
export interface EntryLine {
  account: string;
  accountLabel: string;
  debit: number;
  credit: number;
  /** Free-text precision shown under the label, e.g. "2 × 47 000,00 DA". */
  detail?: string;
  /**
   * Which of the two writings a line belongs to. A sale carries both; a charge
   * only ever carries `JOURNAL`. The UI uses this to label the stock block
   * "Bon de sortie" rather than repeating the facture's heading.
   */
  source: "JOURNAL" | "STOCK";
}

export interface JournalEntry {
  lines: EntryLine[];
  totalDebit: number;
  totalCredit: number;
  /**
   * False when débit ≠ crédit. Surfaced rather than hidden: an unbalanced
   * écriture is a bug in this module or bad data in the row, and quietly
   * rounding it away would hide exactly the thing worth seeing.
   */
  balanced: boolean;
}

/**
 * SCF account numbers. Fixed by the plan comptable, so they are constants rather
 * than configuration.
 */
export const ACCOUNTS = {
  clients: { account: "411", label: "Clients" },
  fournisseurs: { account: "401", label: "Fournisseurs" },
  tvaCollectee: { account: "4457", label: "TVA collectée" },
  tvaDeductible: { account: "4451", label: "TVA déductible" },
  ventes: { account: "700", label: "Ventes de marchandises" },
  caisse: { account: "53", label: "Caisse" },
  banque: { account: "512", label: "Banque" },
} as const;

export interface StockAccounts {
  /** Class 3 account the stock sits in. */
  stock: { account: string; label: string };
  /** Class 6 account the cost is relieved to. */
  cost: { account: string; label: string };
}

/**
 * Which pair of accounts an article's stock movements use, keyed off the
 * `category` on the article.
 *
 * ⚠ Indicative. Verify these against the SCF nomenclature before relying on
 * them in a déclaration — in particular whether a purchased-and-resold good
 * belongs in 30/601 (marchandises) or 35/600 (produits finis), which depends on
 * how it was acquired rather than on which of the three categories the app
 * happens to offer.
 */
const STOCK_ACCOUNTS: Record<string, StockAccounts> = {
  FINISHED_GOOD: {
    stock: { account: "35", label: "Stocks de produits finis" },
    cost: {
      account: "600",
      label: "Achats consommés de matières et fournitures",
    },
  },
  RAW_MATERIAL: {
    stock: { account: "31", label: "Matières premières et fournitures" },
    cost: {
      account: "602",
      label: "Achats de matières premières et fournitures liées",
    },
  },
  SUPPLY: {
    stock: { account: "32", label: "Autres approvisionnements" },
    cost: { account: "603", label: "Achats d'autres approvisionnements" },
  },
};

/** An article the user has not categorised, or one from an older row. */
const DEFAULT_STOCK_ACCOUNTS: StockAccounts = {
  stock: { account: "30", label: "Stocks de marchandises" },
  cost: { account: "601", label: "Achats de marchandises" },
};

export function stockAccountsFor(
  category: string | null | undefined,
): StockAccounts {
  return (category && STOCK_ACCOUNTS[category]) || DEFAULT_STOCK_ACCOUNTS;
}

/**
 * A charge's counterpart account.
 *
 * The app records a charge with a payment method rather than a supplier ledger,
 * so cash and bank are named directly; anything bought on credit is a dette
 * envers fournisseur. This mirrors `computeBilan`, which reads `CREDIT` as a
 * dette d'exploitation.
 */
function cashAccount(paymentMethod: string): {
  account: string;
  label: string;
} {
  if (paymentMethod === "CASH") return ACCOUNTS.caisse;
  if (paymentMethod === "CREDIT") return ACCOUNTS.fournisseurs;
  return ACCOUNTS.banque;
}

/** What `entriesForTransaction` needs off a transaction row. */
export interface EntryTransaction {
  type: string;
  amountHt: number;
  tvaAmount: number;
  amountTtc: number;
  paymentMethod: string;
  /** Only meaningful alongside `item`. */
  quantity?: number | null;
  unitCostHt?: number | null;
  costOfGoodsSold?: number | null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function line(
  spec: { account: string; label: string },
  side: "debit" | "credit",
  amount: number,
  source: EntryLine["source"],
  detail?: string,
): EntryLine {
  return {
    account: spec.account,
    accountLabel: spec.label,
    debit: side === "debit" ? round2(amount) : 0,
    credit: side === "credit" ? round2(amount) : 0,
    source,
    detail,
  };
}

function assemble(lines: EntryLine[]): JournalEntry {
  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
  return {
    lines,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}

/**
 * The écriture a transaction represents.
 *
 * `item` is the article the entry moved, when it moved one. It is what turns a
 * sale into a perpetual one — without it there is no stock side to write, and
 * the entry is the plain revenue or charge writing it always was.
 */
export function entriesForTransaction(
  tx: EntryTransaction,
  item?: { name: string; category: string } | null,
): JournalEntry {
  if (tx.type === "SALE") {
    const lines = [
      line(ACCOUNTS.clients, "debit", tx.amountTtc, "JOURNAL"),
      line(ACCOUNTS.ventes, "credit", tx.amountHt, "JOURNAL"),
      line(ACCOUNTS.tvaCollectee, "credit", tx.tvaAmount, "JOURNAL"),
    ];

    // The cost was frozen on the row when the sale was posted, so this reads a
    // recorded figure rather than re-deriving one at today's CUMP.
    if (item && tx.costOfGoodsSold != null) {
      const accounts = stockAccountsFor(item.category);
      const qty = tx.quantity;
      const cost = tx.costOfGoodsSold;
      const detail =
        qty != null && tx.unitCostHt != null
          ? `${qty} × ${round2(tx.unitCostHt).toFixed(2)} DA`
          : undefined;
      lines.push(line(accounts.cost, "debit", cost, "STOCK", detail));
      lines.push(line(accounts.stock, "credit", cost, "STOCK", detail));
    }

    return assemble(lines);
  }

  if (tx.type === "PURCHASE") {
    // A purchase naming an article bought stock (class 3), so it debits the
    // stock account. Without one it is an ordinary purchase and falls to the
    // class 6 account — the same treatment the reports give it.
    const debitSide = item
      ? stockAccountsFor(item.category).stock
      : DEFAULT_STOCK_ACCOUNTS.cost;

    return assemble([
      line(debitSide, "debit", tx.amountHt, "JOURNAL", item?.name),
      line(ACCOUNTS.tvaDeductible, "debit", tx.tvaAmount, "JOURNAL"),
      line(ACCOUNTS.fournisseurs, "credit", tx.amountTtc, "JOURNAL"),
    ]);
  }

  // A charge. The class 6 account is not ventilated — `transactions.category` is
  // free text, so the app has nothing to pick a real account from. Debiting the
  // class and saying so beats inventing a number; the label carries the
  // category the user typed.
  return assemble([
    line(
      { account: "6", label: "Charges — compte à ventiler" },
      "debit",
      tx.amountHt,
      "JOURNAL",
    ),
    line(ACCOUNTS.tvaDeductible, "debit", tx.tvaAmount, "JOURNAL"),
    line(cashAccount(tx.paymentMethod), "credit", tx.amountTtc, "JOURNAL"),
  ]);
}
