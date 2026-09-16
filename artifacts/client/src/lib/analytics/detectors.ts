import { fmt, fmtDate } from "@/lib/ledger";
import { IFU_CEILING } from "@/lib/taxRegime";
import { knowledgeFor, type RuleId } from "./knowledge-base";
import {
  IFU_NEAR_THRESHOLD,
  monthKeyOf,
  type KpiSnapshot,
} from "./metrics";
import type { AnalyticsInput, Finding, Severity } from "./types";

/**
 * The rules.
 *
 * A detector decides *whether* something is worth saying and *what figures*
 * justify it. It does not decide how to say it — the headline comes from the
 * knowledge base, looked up by `ruleId`, so there is exactly one place where a
 * user-facing sentence about a rule exists.
 *
 * The bar for adding a rule is that it must be **actionable by the person who
 * owns the business**. "Your current ratio is 0.8" is a fact about the company
 * that only a banker can use; "a product has negative stock, so your margin is
 * wrong" is something the owner can go and fix tonight. Rules that only restate
 * a number are not here.
 *
 * Every rule is also required to be *quiet when it is not sure*. Silence is a
 * feature: a panel that fires on four rows teaches the user to ignore it, and
 * then the one real finding goes unread.
 */

/**
 * What a detector is given.
 *
 * An object rather than two positional arguments so that each rule takes only
 * what it needs — a rule about the company profile has no business receiving a
 * snapshot of the books, and a registry that forced every rule to accept both
 * would be coupling them for the registry's convenience.
 */
interface DetectorContext {
  k: KpiSnapshot;
  input: AnalyticsInput;
}

/**
 * Money, as the reports page writes it.
 *
 * `fmt` already supplies both the narrow-space grouping *and* the "DA" suffix —
 * appending one here yields "111 000,00 DA DA", which is exactly the kind of
 * thing only a human reading the rendered panel notices, because every check
 * asserts on `ruleId` and none of them reads the prose. Rounding first keeps
 * the centimes column from implying precision these aggregates do not have.
 */
const da = (n: number): string => fmt(Math.round(n));

/** `83 %`, rounded — a percentage shown to one decimal invites false precision. */
const pct = (fraction: number): string => `${Math.round(fraction * 100)} %`;

/**
 * Builds a finding, taking its headline from the knowledge base.
 *
 * Going through here rather than constructing `Finding` literals is what makes
 * the `RuleId` type meaningful: a detector cannot name a rule the KB does not
 * describe, because the compilation stops first.
 */
function finding(
  ruleId: RuleId,
  severity: Severity,
  periodRef: string,
  evidence: string[],
  metrics: Record<string, number>,
  subject?: string,
): Finding {
  return {
    ruleId,
    severity,
    title: knowledgeFor(ruleId).title,
    evidence,
    metrics,
    periodRef,
    ...(subject ? { subject } : {}),
  };
}

/** Lists at most `max` names, then counts the rest. Never a wall of text. */
function nameList(names: string[], max = 3): string {
  const shown = names.slice(0, max).join(", ");
  const rest = names.length - max;
  return rest > 0 ? `${shown} et ${rest} autre${rest > 1 ? "s" : ""}` : shown;
}

// --- régime fiscal ----------------------------------------------------------

/**
 * Turnover against the IFU ceiling.
 *
 * Only for a company that has *declared* the forfaitaire régime. For a company
 * on the réel the ceiling means nothing, and telling its owner they are "near a
 * ceiling" they are not subject to would be noise at best.
 */
function detectIfuCeiling({ k, input }: DetectorContext): Finding[] {
  if (input.company?.taxRegime !== "FORFAITAIRE") return [];

  if (k.revenueHt > IFU_CEILING) {
    return [
      finding(
        "CA_DEPASSE_PLAFOND_IFU",
        "CRITICAL",
        k.periodRef,
        [
          `Chiffre d'affaires de la période : ${da(k.revenueHt)}`,
          `Plafond du régime forfaitaire : ${da(IFU_CEILING)}`,
          `Dépassement : ${da(k.revenueHt - IFU_CEILING)}`,
        ],
        { revenueHt: k.revenueHt, ceiling: IFU_CEILING },
      ),
    ];
  }

  if (k.revenueHt >= IFU_NEAR_THRESHOLD) {
    return [
      finding(
        "CA_PROCHE_PLAFOND_IFU",
        "WARNING",
        k.periodRef,
        [
          `Chiffre d'affaires de la période : ${da(k.revenueHt)}`,
          `Plafond du régime forfaitaire : ${da(IFU_CEILING)}`,
          `Il vous reste ${da(IFU_CEILING - k.revenueHt)} avant le plafond`,
        ],
        { revenueHt: k.revenueHt, ceiling: IFU_CEILING },
      ),
    ];
  }

  return [];
}

/**
 * A missing legal form or régime.
 *
 * Worth surfacing even though it is not a figure: the reports page silently
 * disables the fiscal return without them, so the user sees a greyed-out entry
 * and no explanation of what to do about it. This is that explanation.
 */
function detectIncompleteIdentity({ input }: DetectorContext): Finding[] {
  const missing: string[] = [];
  if (!input.company?.legalForm) missing.push("forme juridique");
  if (!input.company?.taxRegime) missing.push("système fiscal");
  if (missing.length === 0) return [];

  return [
    finding(
      "IDENTITE_INCOMPLETE",
      "WARNING",
      input.periodRef,
      [`Non renseigné : ${missing.join(" et ")}`],
      { missingFields: missing.length },
    ),
  ];
}

// --- activité ---------------------------------------------------------------

/** Consecutive months of falling gross margin before it is called a trend. */
const MARGIN_EROSION_MONTHS = 3;

/**
 * Gross margin falling for several months running.
 *
 * Only months with revenue are considered. A month with no sales has an
 * undefined margin rather than a zero one, and treating it as zero would make
 * every holiday shutdown look like a collapse in profitability.
 *
 * The decline must be *consecutive*, which is what separates a trend from
 * month-to-month noise.
 */
function detectMarginErosion({ k }: DetectorContext): Finding[] {
  const priced = k.months.filter(
    (m) => m.revenueHt > 0 && m.grossMarginPct !== null,
  );
  if (priced.length < MARGIN_EROSION_MONTHS) return [];

  let runLength = 1;
  let runEnd = priced.length - 1;
  for (let i = priced.length - 1; i > 0; i -= 1) {
    if (priced[i]!.grossMarginPct! < priced[i - 1]!.grossMarginPct!) {
      runLength += 1;
      runEnd = i - 1;
    } else break;
  }
  if (runLength < MARGIN_EROSION_MONTHS) return [];

  const run = priced.slice(runEnd);
  const first = run[0]!;
  const last = run[run.length - 1]!;
  const drop = first.grossMarginPct! - last.grossMarginPct!;

  return [
    finding(
      "MARGE_BRUTE_EN_BAISSE",
      "WARNING",
      k.periodRef,
      [
        `Marge sur ${run.length} mois consécutifs : de ${pct(first.grossMarginPct!)} à ${pct(last.grossMarginPct!)}`,
        `Baisse : ${Math.round(drop * 100)} points`,
        `Marge sur la période : ${k.grossMarginPct === null ? "non calculable" : pct(k.grossMarginPct)}`,
      ],
      {
        startPct: first.grossMarginPct!,
        endPct: last.grossMarginPct!,
        dropPoints: drop * 100,
        months: run.length,
      },
    ),
  ];
}

/** A category is "jumped" at twice its usual level, not 20 % above it. */
const CHARGE_SPIKE_MULTIPLE = 2;

/** …and only when the increase is big enough to matter against total spending. */
const CHARGE_SPIKE_MATERIALITY = 0.05;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/**
 * A spending category that jumped in the most recent month.
 *
 * Compared against the category's own median month, not against other
 * categories: a business whose rent is its largest cost is not thereby
 * mis-managing rent. The median rather than the mean so that one previous spike
 * does not raise the bar for every month after it.
 *
 * "Most recent" means the latest month with spending in it, **not** the last
 * month of the selected period. The two differ whenever the period runs past the
 * last entry — which is the normal case, since the picker defaults to the end of
 * the current month and books are entered with a lag. Anchoring on the period's
 * last month would silently compare every category against a month that has not
 * happened yet, and the rule would simply never fire.
 */
function detectChargeSpike({ k, input }: DetectorContext): Finding[] {
  const rows = input.txns.filter(
    (t) => (t.type === "PURCHASE" || t.type === "EXPENSE") && t.amountHt > 0,
  );
  if (rows.length === 0) return [];

  const byCategory = new Map<string, Map<string, number>>();
  for (const t of rows) {
    const category = (t.category ?? "").trim() || "Sans catégorie";
    const month = monthKeyOf(t.date);
    const bucket = byCategory.get(category) ?? new Map<string, number>();
    bucket.set(month, (bucket.get(month) ?? 0) + t.amountHt);
    byCategory.set(category, bucket);
  }

  // Derived from the entries, so a month nobody spent anything in cannot become
  // the yardstick.
  const latest = [...byCategory.values()]
    .flatMap((byMonth) => [...byMonth.keys()])
    .sort()
    .pop();
  if (!latest) return [];

  const totalSpend = k.purchasesHt + k.expensesHt;
  const findings: Finding[] = [];

  for (const [category, byMonth] of byCategory) {
    const current = byMonth.get(latest) ?? 0;
    const history = [...byMonth.entries()]
      .filter(([month]) => month !== latest)
      .map(([, amount]) => amount);
    // Two quiet months are not a baseline. Without this the first month a new
    // expense appears would read as a spike from zero.
    if (history.length < 2) continue;

    const baseline = median(history);
    if (baseline <= 0) continue;

    const increase = current - baseline;
    if (current < baseline * CHARGE_SPIKE_MULTIPLE) continue;
    if (totalSpend > 0 && increase / totalSpend < CHARGE_SPIKE_MATERIALITY) continue;

    findings.push(
      finding(
        "CHARGE_EN_HAUSSE",
        "WARNING",
        k.periodRef,
        [
          `${category} : ${da(current)} sur le dernier mois`,
          `Niveau habituel : ${da(baseline)}`,
          `Augmentation : ${da(increase)}`,
        ],
        { current, baseline, increase },
        category,
      ),
    );
  }

  return findings;
}

/** Days an unpaid invoice may sit before it is worth mentioning. */
const RECEIVABLE_WARN_DAYS = 60;
const RECEIVABLE_CRITICAL_DAYS = 90;

function detectOldReceivables({ k }: DetectorContext): Finding[] {
  const { receivables } = k;
  if (receivables.oldestDays === null) return [];
  if (receivables.oldestDays <= RECEIVABLE_WARN_DAYS) return [];

  const oldest = receivables.oldest[0]!;
  const critical = receivables.oldestDays > RECEIVABLE_CRITICAL_DAYS;

  return [
    finding(
      "IMPAYES_ANCIENS",
      critical ? "CRITICAL" : "WARNING",
      k.periodRef,
      [
        `${receivables.count} facture${receivables.count > 1 ? "s" : ""} non soldée${receivables.count > 1 ? "s" : ""} pour ${da(receivables.amountTtc)}`,
        `La plus ancienne : ${oldest.thirdParty || oldest.label}, ${oldest.days} jours`,
        `Date : ${fmtDate(oldest.date)}`,
      ],
      {
        openCount: receivables.count,
        outstanding: receivables.amountTtc,
        oldestDays: receivables.oldestDays,
      },
    ),
  ];
}

// --- anomalies de saisie ----------------------------------------------------

function detectDuplicates({ k }: DetectorContext): Finding[] {
  return k.duplicates.slice(0, 3).map((d) =>
    finding(
      "DOUBLON_SUSPECT",
      "WARNING",
      k.periodRef,
      [
        `${d.thirdParty} — ${da(d.amountTtc)}`,
        `Dates : ${d.entries.map((e) => fmtDate(e.date)).join(" et ")}`,
        d.entries[0] ? `Libellé : ${d.entries[0].label}` : "",
      ].filter(Boolean),
      { amountTtc: d.amountTtc, entryCount: d.entries.length },
      d.thirdParty,
    ),
  );
}

function detectOutliers({ k }: DetectorContext): Finding[] {
  return k.outliers.slice(0, 3).map((o) =>
    finding(
      "MONTANT_ABERRANT",
      "INFO",
      k.periodRef,
      [
        `${da(o.amount)} — ${o.label}`,
        `Catégorie : ${o.category}`,
        `Date : ${fmtDate(o.date)}`,
      ],
      { amount: o.amount, distance: o.distance },
      o.label,
    ),
  );
}

/**
 * An unusual distribution of leading digits.
 *
 * Reported as `INFO` on purpose. A Benford deviation is weak evidence — it says
 * the shape of the numbers is odd, never that anything is wrong — and dressing
 * it up as a warning would be the kind of confident-but-unfounded claim that
 * teaches users to distrust everything else in the panel.
 */
function detectBenford({ k }: DetectorContext): Finding[] {
  const result = k.benford;
  if (!result) return [];
  if (result.chiSquare <= result.criticalValue) return [];

  return [
    finding(
      "BENFORD_ANOMALIE",
      "INFO",
      k.periodRef,
      [
        `${result.sampleSize} montants analysés`,
        "La répartition du premier chiffre s'écarte de l'habitude",
      ],
      { sampleSize: result.sampleSize, chiSquare: result.chiSquare },
    ),
  ];
}

function detectUnusualVat({ k }: DetectorContext): Finding[] {
  const rows = k.unusualVatRate;
  if (rows.length === 0) return [];

  const rates = [...new Set(rows.map((t) => t.tvaRate))].sort((a, b) => a - b);
  return [
    finding(
      "TAUX_TVA_INHABITUEL",
      "WARNING",
      k.periodRef,
      [
        `${rows.length} écriture${rows.length > 1 ? "s" : ""} concernée${rows.length > 1 ? "s" : ""}`,
        `Taux relevé${rates.length > 1 ? "s" : ""} : ${rates.map((r) => `${r} %`).join(", ")}`,
        `Taux courants : 19 % et 9 %`,
      ],
      { entryCount: rows.length, rates: rates.length },
      rates.length === 1 ? `${rates[0]} %` : undefined,
    ),
  ];
}

// --- complétude -------------------------------------------------------------

function detectMissingThirdParty({ k }: DetectorContext): Finding[] {
  const sales = k.salesWithoutThirdParty.length;
  const purchases = k.purchasesWithoutThirdParty.length;
  if (sales + purchases === 0) return [];

  const evidence: string[] = [];
  if (sales > 0) {
    evidence.push(
      `${sales} vente${sales > 1 ? "s" : ""} sans client — ${da(
        k.salesWithoutThirdParty.reduce((s, t) => s + t.amountHt, 0),
      )}`,
    );
  }
  if (purchases > 0) {
    evidence.push(
      `${purchases} achat${purchases > 1 ? "s" : ""} sans fournisseur — ${da(
        k.purchasesWithoutThirdParty.reduce((s, t) => s + t.amountHt, 0),
      )}`,
    );
  }

  return [
    finding(
      "TIERS_MANQUANT",
      "INFO",
      k.periodRef,
      evidence,
      { sales, purchases },
    ),
  ];
}

/**
 * Sales with no cost attached, in a business that does hold stock.
 *
 * The "does hold stock" half matters: for a service business every sale has no
 * cost of goods by definition, and reporting that as a gap would be a rule that
 * fires permanently and is permanently wrong.
 */
function detectSalesWithoutCost({ k }: DetectorContext): Finding[] {
  if (k.stockValue <= 0) return [];
  const rows = k.salesWithoutCost;
  if (rows.length === 0) return [];

  const amount = rows.reduce((s, t) => s + t.amountHt, 0);
  return [
    finding(
      "VENTE_SANS_COUT",
      "WARNING",
      k.periodRef,
      [
        `${rows.length} vente${rows.length > 1 ? "s" : ""} sans coût de marchandise`,
        `Montant concerné : ${da(amount)}`,
        "Votre marge est donc surévaluée d'autant",
      ],
      { entryCount: rows.length, amountHt: amount },
    ),
  ];
}

function detectNegativeStock({ k }: DetectorContext): Finding[] {
  const items = k.negativeStock;
  if (items.length === 0) return [];

  return [
    finding(
      "STOCK_NEGATIF",
      "CRITICAL",
      k.periodRef,
      [
        `${items.length} produit${items.length > 1 ? "s" : ""} en quantité négative`,
        `Concerné${items.length > 1 ? "s" : ""} : ${nameList(items.map((i) => i.name))}`,
        `Valeur totale du stock : ${da(k.stockValue)}`,
      ],
      { itemCount: items.length, stockValue: k.stockValue },
    ),
  ];
}

function detectDormantStock({ k }: DetectorContext): Finding[] {
  const items = k.dormantStock;
  if (items.length === 0) return [];

  const tied = items.reduce((s, i) => s + i.totalValue, 0);
  return [
    finding(
      "STOCK_MORT",
      "INFO",
      k.periodRef,
      [
        `${items.length} produit${items.length > 1 ? "s" : ""} sans mouvement récent`,
        `Concerné${items.length > 1 ? "s" : ""} : ${nameList(items.map((i) => i.name))}`,
        `Argent immobilisé : ${da(tied)}`,
      ],
      { itemCount: items.length, tiedValue: tied },
    ),
  ];
}

function detectFullyDepreciated({ k }: DetectorContext): Finding[] {
  const assets = k.fullyDepreciated;
  if (assets.length === 0) return [];

  return [
    finding(
      "IMMO_AMORTIE",
      "INFO",
      k.periodRef,
      [
        `${assets.length} équipement${assets.length > 1 ? "s" : ""} totalement amorti${assets.length > 1 ? "s" : ""}`,
        `Concerné${assets.length > 1 ? "s" : ""} : ${nameList(assets.map((a) => a.label))}`,
      ],
      { assetCount: assets.length },
    ),
  ];
}

// --- cohérence --------------------------------------------------------------

/**
 * A negative till or bank balance.
 *
 * Always a data problem and never a real one — a bank will not let an account go
 * negative silently, and a cash box cannot hold minus 40 000 DA.
 */
function detectNegativeTreasury({ k }: DetectorContext): Finding[] {
  if (k.cash >= 0 && k.bank >= 0) return [];

  const evidence: string[] = [];
  if (k.cash < 0) evidence.push(`Solde de caisse : ${da(k.cash)}`);
  if (k.bank < 0) evidence.push(`Solde de banque : ${da(k.bank)}`);

  return [
    finding(
      "TRESORERIE_NEGATIVE",
      "CRITICAL",
      k.periodRef,
      evidence,
      { cash: k.cash, bank: k.bank },
    ),
  ];
}

// --- the registry -----------------------------------------------------------

/**
 * Every rule, in one array.
 *
 * Splitting this into two lists would be a way to hide a bug: a rule registered
 * but never run, or run but never shown. One list, one loop, no way for a
 * detector to be written and then forgotten.
 *
 * Order here is irrelevant — the panel sorts by severity, then by the order the
 * findings arrive within a severity.
 */
const DETECTORS: ((ctx: DetectorContext) => Finding[])[] = [
  // Data integrity first: a wrong stock balance makes the margin wrong, and a
  // margin rule that fires because of it would be reporting a symptom.
  detectNegativeStock,
  detectNegativeTreasury,
  detectIncompleteIdentity,
  detectIfuCeiling,
  detectSalesWithoutCost,
  detectOldReceivables,
  detectChargeSpike,
  detectMarginErosion,
  detectUnusualVat,
  detectDuplicates,
  detectMissingThirdParty,
  detectOutliers,
  detectFullyDepreciated,
  detectDormantStock,
  detectBenford,
];

/**
 * Runs every rule and returns what fired, most urgent first.
 *
 * The sort is severity first and then *nothing else* — deliberately. Ordering
 * within a severity by, say, amount would make the list reshuffle every time a
 * figure moved, and a list that reorders itself under the user is one they stop
 * trusting. A stable order means the second thing on the list is still the
 * second thing on the list tomorrow.
 */
export function detectFindings(
  snapshot: KpiSnapshot,
  input: AnalyticsInput,
): Finding[] {
  const severityRank: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  const findings: Finding[] = [];

  for (const detector of DETECTORS) {
    try {
      findings.push(...detector({ k: snapshot, input }));
    } catch {
      // One malformed row must not blank the whole panel: the other rules still
      // have something true to say. Failing loudly here would be worse for the
      // user than a missing rule, and there is no server log to write to from
      // the browser.
    }
  }

  return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
