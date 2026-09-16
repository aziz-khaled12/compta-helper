/**
 * The ten report aggregations.
 *
 * The ledger primitives they build on — `fmt`, `fmtDate`, `inRange`, the range
 * helpers, and the row shapes below — live in `@/lib/ledger`, because the
 * analysis page reads the same rows. Nothing here is shared with it.
 */
import { fmt, fmtDate, inRange, monthsInRange, rangeEnd } from "@/lib/ledger";
import type {
  AssetRow,
  FundingEntry,
  MvRow,
  PayrollRow,
  TxRow,
} from "@/lib/ledger";

export function computeCaisseOrBanque(
  txns: TxRow[],
  from: Date,
  to: Date,
  method: "CASH" | "BANK",
) {
  const rows = txns
    .filter((t) => {
      if (method === "CASH") return t.paymentMethod === "CASH";
      return t.paymentMethod === "BANK" || t.paymentMethod === "CREDIT";
    })
    .filter((t) => inRange(t.date, from, to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  let balance = 0;
  const data = rows.map((t, i) => {
    const enc = t.type === "SALE" ? t.amountTtc : 0;
    const dec = t.type !== "SALE" ? t.amountTtc : 0;
    balance += enc - dec;
    return {
      date: fmtDate(t.date),
      label: t.label,
      ref: `REF-${String(i + 1).padStart(3, "0")}`,
      enc,
      dec,
      solde: balance,
      obs: t.thirdParty || t.category || "",
    };
  });

  const totalEnc = data.reduce((s, r) => s + r.enc, 0);
  const totalDec = data.reduce((s, r) => s + r.dec, 0);
  return { data, totalEnc, totalDec, finalSolde: balance };
}

export function computeStocks(mvs: MvRow[], from: Date, to: Date) {
  const filtered = mvs
    .filter((m) => inRange(m.date, from, to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  let balance = 0;
  const data = filtered.map((m, i) => {
    const val = m.quantity * m.unitCostHt;
    const entree = m.direction === "IN" ? val : 0;
    const sortie = m.direction === "OUT" ? val : 0;
    balance += entree - sortie;
    return {
      date: fmtDate(m.date),
      label: m.itemName || m.itemId,
      ref: `STK-${String(i + 1).padStart(3, "0")}`,
      entree,
      sortie,
      solde: Math.max(0, balance),
      obs: m.note || "",
    };
  });

  const totalEntree = data.reduce((s, r) => s + r.entree, 0);
  const totalSortie = data.reduce((s, r) => s + r.sortie, 0);
  return { data, totalEntree, totalSortie, finalSolde: Math.max(0, balance) };
}

export function computeAchatsOrVentes(
  txns: TxRow[],
  from: Date,
  to: Date,
  txType: "PURCHASE" | "SALE",
) {
  const rows = txns
    .filter((t) => t.type === txType)
    .filter((t) => inRange(t.date, from, to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const data = rows.map((t, i) => {
    const versements =
      t.status === "PAID" ? t.amountTtc : t.status === "PARTIAL" ? t.amountTtc * 0.5 : 0;
    return {
      date: fmtDate(t.date),
      label: t.label,
      ref: `${txType === "PURCHASE" ? "ACH" : "VNT"}-${String(i + 1).padStart(3, "0")}`,
      ht: t.amountHt,
      tva: t.tvaAmount,
      ttc: t.amountTtc,
      versements,
      reste: Math.max(0, t.amountTtc - versements),
      thirdParty: t.thirdParty || "",
    };
  });

  const totals = {
    ht: data.reduce((s, r) => s + r.ht, 0),
    tva: data.reduce((s, r) => s + r.tva, 0),
    ttc: data.reduce((s, r) => s + r.ttc, 0),
    versements: data.reduce((s, r) => s + r.versements, 0),
    reste: data.reduce((s, r) => s + r.reste, 0),
  };
  return { data, totals };
}

export function computeCharges(
  txns: TxRow[],
  payrolls: PayrollRow[],
  assets: AssetRow[],
  from: Date,
  to: Date,
) {
  const expenses = txns
    .filter((t) => t.type === "EXPENSE")
    .filter((t) => inRange(t.date, from, to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const payrollRows = payrolls.filter((p) => {
    const [y, m] = p.monthYear.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d >= from && d <= rangeEnd(to.getUTCFullYear(), to.getUTCMonth() + 1);
  });

  const monthsInRangeList = monthsInRange(from, to);

  let idx = 1;
  const data: {
    date: string; label: string; ref: string;
    montant: number; paye: number; reste: number; obs: string;
  }[] = [];

  for (const t of expenses) {
    const paye = t.status === "PAID" ? t.amountTtc : t.status === "PARTIAL" ? t.amountTtc * 0.5 : 0;
    data.push({
      date: fmtDate(t.date),
      label: t.label,
      ref: `CHG-${String(idx++).padStart(3, "0")}`,
      montant: t.amountTtc,
      paye,
      reste: Math.max(0, t.amountTtc - paye),
      obs: t.category || t.thirdParty || "",
    });
  }

  // The cost of what was sold, as its own line.
  //
  // Under the perpetual system the purchase was not a charge — it bought an
  // asset — so the cost reaches the result here instead, at the moment of sale
  // and at the CUMP that applied then. It reads `costOfGoodsSold` off the entry
  // rather than valuing the movement again: the figure was frozen when the sale
  // was posted, and re-deriving it at today's average would restate it.
  //
  // `paye` equals `montant`: there is no supplier left to pay for a good already
  // bought and already paid for. The counterpart is the stock account, not cash.
  const salesWithCost = txns
    .filter((t) => t.type === "SALE" && (t.costOfGoodsSold ?? 0) > 0)
    .filter((t) => inRange(t.date, from, to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  for (const t of salesWithCost) {
    const cost = t.costOfGoodsSold ?? 0;
    data.push({
      date: fmtDate(t.date),
      label: `Coût des ventes — ${t.label}`,
      ref: `CDV-${String(idx++).padStart(3, "0")}`,
      montant: cost,
      paye: cost,
      reste: 0,
      obs:
        t.quantity != null && t.unitCostHt != null
          ? `${t.quantity} × ${fmt(t.unitCostHt)} (CUMP)`
          : "",
    });
  }

  for (const p of payrollRows) {
    data.push({
      date: p.monthYear + "-01",
      label: `Salaire - ${p.employeeName || p.employeeId} (${p.monthYear})`,
      ref: `PAY-${String(idx++).padStart(3, "0")}`,
      montant: p.netToPay,
      paye: p.netToPay,
      reste: 0,
      obs: `Brut: ${fmt(p.grossSalary)} | CNAS: ${fmt(p.cnasDeduction)} | IRG: ${fmt(p.irgDeduction)}`,
    });
  }

  for (const a of assets) {
    for (const my of monthsInRangeList) {
      const purchase = new Date(String(a.purchaseDate).slice(0, 10) + "T00:00:00Z");
      const assetMY = `${purchase.getUTCFullYear()}-${String(purchase.getUTCMonth() + 1).padStart(2, "0")}`;
      if (my < assetMY) continue;
      if (a.monthlyDepreciation <= 0) continue;
      data.push({
        date: my + "-01",
        label: `Amortissement - ${a.label}`,
        ref: `AMO-${String(idx++).padStart(3, "0")}`,
        montant: a.monthlyDepreciation,
        paye: a.monthlyDepreciation,
        reste: 0,
        obs: a.category || "",
      });
    }
  }

  data.sort((a, b) => a.date.localeCompare(b.date));

  const totals = {
    montant: data.reduce((s, r) => s + r.montant, 0),
    paye: data.reduce((s, r) => s + r.paye, 0),
    reste: data.reduce((s, r) => s + r.reste, 0),
  };
  return { data, totals };
}

export function computeEquipements(assets: AssetRow[]) {
  return assets.map((a, i) => ({
    date: fmtDate(a.purchaseDate),
    label: a.label,
    ref: `IMM-${String(i + 1).padStart(3, "0")}`,
    montant: a.costHt,
    amortissement: a.accumulatedDepreciation,
    valeurNette: a.bookValue,
    obs: a.category || "",
  }));
}

export function computeBilan(
  txns: TxRow[],
  mvs: MvRow[],
  assets: AssetRow[],
  payrolls: PayrollRow[],
  funding: FundingEntry[],
  from: Date,
  to: Date,
) {
  const allTxns = txns.filter((t) => inRange(t.date, from, to));
  const sales = allTxns.filter((t) => t.type === "SALE");
  const purchases = allTxns.filter((t) => t.type === "PURCHASE");
  const expenses = allTxns.filter((t) => t.type === "EXPENSE");

  const totalSalesHt = sales.reduce((s, t) => s + t.amountHt, 0);
  const totalPurchasesHt = purchases.reduce((s, t) => s + t.amountHt, 0);
  const totalExpensesHt = expenses.reduce((s, t) => s + t.amountTtc, 0);
  const coutDesVentes = sales.reduce(
    (s, t) => s + (t.costOfGoodsSold ?? 0),
    0,
  );

  const tvaCollectee = sales.reduce((s, t) => s + t.tvaAmount, 0);
  const tvaDeductible = [...purchases, ...expenses].reduce((s, t) => s + t.tvaAmount, 0);
  const tvaNette = tvaCollectee - tvaDeductible;

  const periodPayrolls = payrolls.filter((p) => {
    const [y, m] = p.monthYear.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d >= from && d <= rangeEnd(to.getUTCFullYear(), to.getUTCMonth() + 1);
  });
  const totalPayroll = periodPayrolls.reduce((s, p) => s + p.netToPay, 0);

  // Variation des stocks, presented the way the SCF asks for it: the purchases
  // of the period are a dépense, and the stock left over at the end is a
  // recette. The two nets to the cost of what was actually sold, which is why
  // the résultat below does not subtract `coutDesVentes` a second time —
  // `depensesAchats − variationStocks` already equals it whenever every OUT
  // movement is valued at the CUMP the sale recorded, as the server posts them.
  //
  // `coutDesVentes` is therefore informational: it is the same money, named the
  // way the perpetual system names it, and it is what `margeBrute` is built on.
  // A hand-entered movement with no purchase behind it breaks the equivalence —
  // it raises the variation without raising the achats — so the two figures can
  // legitimately differ on a ledger that was written by hand.
  const allMvs = mvs.filter((m) => inRange(m.date, from, to));
  const stockVariation =
    allMvs.filter((m) => m.direction === "IN").reduce((s, m) => s + m.quantity * m.unitCostHt, 0) -
    allMvs.filter((m) => m.direction === "OUT").reduce((s, m) => s + m.quantity * m.unitCostHt, 0);

  const allTimeStockValue = Math.max(
    0,
    mvs.reduce((s, m) => {
      const v = m.quantity * m.unitCostHt;
      return m.direction === "IN" ? s + v : s - v;
    }, 0),
  );

  const totalAssetsValue = assets.reduce((s, a) => s + a.bookValue, 0);
  const totalDepreciation = assets.reduce((s, a) => s + a.accumulatedDepreciation, 0);

  const cashTxns = txns.filter((t) => t.paymentMethod === "CASH" && t.status === "PAID");
  const caisse =
    cashTxns.filter((t) => t.type === "SALE").reduce((s, t) => s + t.amountTtc, 0) -
    cashTxns.filter((t) => t.type !== "SALE").reduce((s, t) => s + t.amountTtc, 0);

  const bankTxns = txns.filter(
    (t) => (t.paymentMethod === "BANK" || t.paymentMethod === "CREDIT") && t.status === "PAID",
  );
  const banque =
    bankTxns.filter((t) => t.type === "SALE").reduce((s, t) => s + t.amountTtc, 0) -
    bankTxns.filter((t) => t.type !== "SALE").reduce((s, t) => s + t.amountTtc, 0);

  const creancesClient = sales
    .filter((t) => t.status !== "PAID")
    .reduce((s, t) => s + (t.status === "PARTIAL" ? t.amountTtc * 0.5 : t.amountTtc), 0);

  const dettesExploitation = [...purchases, ...expenses]
    .filter((t) => t.status !== "PAID")
    .reduce((s, t) => s + (t.status === "PARTIAL" ? t.amountTtc * 0.5 : t.amountTtc), 0);

  const capitalSocial = funding
    .filter((f) => f.source.toLowerCase().includes("capital") || f.source === "EQUITY")
    .reduce((s, f) => s + f.amount, 0);
  const emprunts = funding
    .filter((f) => !f.source.toLowerCase().includes("capital") && f.source !== "EQUITY")
    .reduce((s, f) => s + f.amount, 0);

  const totalFunding = funding.reduce((s, f) => s + f.amount, 0);

  const autresRecettes = 0;

  const totalRecettes = totalSalesHt + autresRecettes + stockVariation;
  const totalDepenses = totalPurchasesHt + totalExpensesHt + totalPayroll + totalDepreciation;
  const resultat = totalRecettes - totalDepenses;

  const totalActif = totalAssetsValue + allTimeStockValue + creancesClient + Math.max(0, caisse) + Math.max(0, banque);
  const totalPassif = totalFunding + resultat + (tvaNette > 0 ? tvaNette : 0) + dettesExploitation;

  return {
    compteResultat: {
      recettesVentes: totalSalesHt,
      autresRecettes,
      variationStocks: stockVariation,
      totalRecettes,
      depensesAchats: totalPurchasesHt,
      autresDepenses: totalExpensesHt + totalPayroll + totalDepreciation,
      totalDepenses,
      resultat,
      /** Cost of the goods sold, frozen on each sale at posting. */
      coutDesVentes,
      /** Ventes HT less that cost — the trading margin, before other charges. */
      margeBrute: totalSalesHt - coutDesVentes,
    },
    bilan: {
      actif: {
        immobilisations: totalAssetsValue,
        stocks: allTimeStockValue,
        creances: creancesClient,
        caisse: Math.max(0, caisse),
        banque: Math.max(0, banque),
        total: totalActif,
      },
      passif: {
        capital: capitalSocial || totalFunding,
        resultat,
        emprunts,
        dettes: dettesExploitation,
        tvaNette: Math.max(0, tvaNette),
        total: totalPassif,
      },
      balanced: Math.abs(totalActif - totalPassif) < 1,
    },
  };
}

export type G50Month = {
  /** `YYYY-MM`, matching `PayrollRow.monthYear`. */
  monthYear: string;
  tvaCollectee: number;
  tvaDeductible: number;
  /** Positive = à payer, negative = crédit de TVA à reporter. */
  tvaNette: number;
  grossSalary: number;
  cnas: number;
  irg: number;
  /** What the bordereau asks for: TVA actually due plus IRG withheld. */
  total: number;
};

/**
 * The G50 is a *monthly* bordereau, so it is computed one block per month even
 * when the selected range spans a year — a full-year selection produces twelve
 * declarations, which is exactly what a year of G50s is.
 *
 * The figures are the same ones `computeBilan` derives (TVA collectée on sales,
 * déductible on purchases *and* charges) and are recomputed here deliberately:
 * the bilan returns a different, aggregated shape, and it carries the balance
 * sheet. Acomptes provisionnels are absent because the app has no data source
 * for them — the view leaves them to be completed, not reported as zero.
 */
export function computeG50(
  txns: TxRow[],
  payrolls: PayrollRow[],
  from: Date,
  to: Date,
): { months: G50Month[]; totals: Omit<G50Month, "monthYear"> } {
  const inPeriod = txns.filter((t) => inRange(t.date, from, to));

  const payrollByMonth = new Map<string, PayrollRow[]>();
  for (const p of payrolls) {
    const rows = payrollByMonth.get(p.monthYear) ?? [];
    rows.push(p);
    payrollByMonth.set(p.monthYear, rows);
  }

  const months = monthsInRange(from, to).map((monthYear): G50Month => {
    const monthTxns = inPeriod.filter(
      (t) => String(t.date).slice(0, 7) === monthYear,
    );
    const tvaCollectee = monthTxns
      .filter((t) => t.type === "SALE")
      .reduce((s, t) => s + t.tvaAmount, 0);
    const tvaDeductible = monthTxns
      .filter((t) => t.type === "PURCHASE" || t.type === "EXPENSE")
      .reduce((s, t) => s + t.tvaAmount, 0);

    const monthPayrolls = payrollByMonth.get(monthYear) ?? [];
    const irg = monthPayrolls.reduce((s, p) => s + p.irgDeduction, 0);

    // A negative solde is a TVA credit carried forward, never a negative payment.
    const tvaNette = tvaCollectee - tvaDeductible;

    return {
      monthYear,
      tvaCollectee,
      tvaDeductible,
      tvaNette,
      grossSalary: monthPayrolls.reduce((s, p) => s + p.grossSalary, 0),
      cnas: monthPayrolls.reduce((s, p) => s + p.cnasDeduction, 0),
      irg,
      total: Math.max(0, tvaNette) + irg,
    };
  });

  const totals = months.reduce(
    (acc, m) => ({
      tvaCollectee: acc.tvaCollectee + m.tvaCollectee,
      tvaDeductible: acc.tvaDeductible + m.tvaDeductible,
      tvaNette: acc.tvaNette + m.tvaNette,
      grossSalary: acc.grossSalary + m.grossSalary,
      cnas: acc.cnas + m.cnas,
      irg: acc.irg + m.irg,
      total: acc.total + m.total,
    }),
    {
      tvaCollectee: 0,
      tvaDeductible: 0,
      tvaNette: 0,
      grossSalary: 0,
      cnas: 0,
      irg: 0,
      total: 0,
    },
  );

  return { months, totals };
}

/**
 * The G12's Cadre II. Only the turnover total is real: the books carry no
 * activity, so the split across the 5 % / 12 % / 0,5 % lines cannot be derived
 * and is returned as the declaration's own blank lines.
 */
export function computeG12(txns: TxRow[], from: Date, to: Date) {
  const sales = txns.filter((t) => t.type === "SALE" && inRange(t.date, from, to));
  return {
    caTotal: sales.reduce((s, t) => s + t.amountHt, 0),
    tvaCollectee: sales.reduce((s, t) => s + t.tvaAmount, 0),
    salesCount: sales.length,
  };
}
