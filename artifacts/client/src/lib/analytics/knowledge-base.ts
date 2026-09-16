/**
 * What each finding means, in the words the user gets.
 *
 * This file is the feature's floor. The narration on top of it is optional — a
 * missing API key, a rate limit, no network — and the panel still has to be
 * worth reading, which it is because everything below is already here. The
 * model's job is to order and connect these, never to supply them.
 *
 * Two rules govern every entry:
 *
 *   1. **No jargon and no codes.** The reader owns a business, not a ledger.
 *      "Régime forfaitaire" is the one term worth keeping — it is on their tax
 *      return and they have already chosen it — and even that is glossed the
 *      first time it appears.
 *   2. **No invented legal citations.** Where a rule rests on something the repo
 *      already encodes (the IFU ceiling in `taxRegime.ts`, the declared régime)
 *      the reference says so. Where it does not, there is no `reference` — a
 *      fabricated article number is worse than silence, because the user cannot
 *      tell it apart from a real one.
 */

export interface KbEntry {
  /** The headline the user sees on the card. Plain French, no figures. */
  title: string;
  /** Why this matters. Two sentences at most. */
  explanation: string;
  /** Concrete steps, in the order to do them. */
  remediation: string[];
  /** Only when the basis is something this repo already encodes. */
  reference?: string;
}

/**
 * The catalogue.
 *
 * `RuleId` is derived from these keys, and the detectors type their `ruleId` as
 * `RuleId` — so a detector that invents a rule with no entry here fails to
 * compile. That is the point: there is no code path that can show a user a
 * finding whose explanation does not exist.
 */
export const KNOWLEDGE_BASE = {
  // --- Régime fiscal --------------------------------------------------------
  CA_DEPASSE_PLAFOND_IFU: {
    title: "Votre chiffre d'affaires dépasse le plafond du régime forfaitaire",
    explanation:
      "Vous avez déclaré le régime forfaitaire (l'impôt unique, ou IFU), mais votre chiffre d'affaires de la période atteint un niveau qui ne relève plus de ce régime. Au-delà du plafond, l'entreprise doit passer au régime réel.",
    remediation: [
      "Vérifiez que le montant du chiffre d'affaires repris ici correspond bien à vos ventes réelles.",
      "Si le dépassement est confirmé, parlez-en à votre comptable ou à votre centre des impôts avant la prochaine déclaration : le passage au régime réel ne se fait pas de la même façon selon le moment de l'année.",
      "Mettez ensuite à jour le système fiscal sur la page « Identité & Capital » pour que l'application vous prépare la bonne déclaration.",
    ],
    reference:
      "Plafond du régime forfaitaire tel qu'enregistré dans l'application (lib/taxRegime.ts).",
  },

  CA_PROCHE_PLAFOND_IFU: {
    title: "Votre chiffre d'affaires approche du plafond du régime forfaitaire",
    explanation:
      "Vous restez sous le plafond du régime forfaitaire, mais vous en êtes proche. Il est utile de le savoir maintenant plutôt qu'au moment de la déclaration.",
    remediation: [
      "Surveillez vos ventes des prochains mois pour anticiper le franchissement.",
      "Si vous pensez dépasser le plafond avant la fin de l'année, parlez-en à votre comptable dès maintenant.",
    ],
    reference:
      "Plafond du régime forfaitaire tel qu'enregistré dans l'application (lib/taxRegime.ts).",
  },

  IDENTITE_INCOMPLETE: {
    title: "Votre profil d'entreprise est incomplet",
    explanation:
      "La forme juridique ou le système fiscal n'est pas renseigné. Ces deux informations déterminent quelle déclaration fiscale vous devez remplir : sans elles, l'application ne peut pas vous préparer la bonne.",
    remediation: [
      "Ouvrez la page « Identité & Capital ».",
      "Renseignez la forme juridique et le système fiscal, puis enregistrez.",
      "Revenez sur cette page : la déclaration fiscale correspondante sera alors disponible dans la liste des rapports.",
    ],
  },

  // --- Activité -------------------------------------------------------------
  MARGE_BRUTE_EN_BAISSE: {
    title: "Votre marge se réduit depuis plusieurs mois",
    explanation:
      "La part de ce qui vous reste après avoir payé la marchandise vendue diminue régulièrement. Une baisse lente est facile à ne pas voir, et difficile à rattraper une fois installée.",
    remediation: [
      "Comparez les prix d'achat de vos principaux produits : une hausse passée inaperçue chez un fournisseur suffit souvent à expliquer ce mouvement.",
      "Vérifiez que vos prix de vente ont été révisés depuis la dernière hausse de vos coûts.",
      "Regardez si vos remises ou vos frais de livraison ont augmenté sur la même période.",
    ],
  },

  CHARGE_EN_HAUSSE: {
    title: "Un poste de dépense a fortement augmenté",
    explanation:
      "Une catégorie de dépense a dépassé nettement son niveau habituel sur la période. Repérer ce mouvement tôt évite qu'il s'installe dans vos charges.",
    remediation: [
      "Ouvrez le journal et filtrez sur cette catégorie pour identifier les écritures concernées.",
      "Vérifiez qu'il ne s'agit pas d'une erreur de saisie ou d'une dépense comptée deux fois.",
      "Si la dépense est réelle et durable, réintégrez-la dans le calcul de vos prix.",
    ],
  },

  IMPAYES_ANCIENS: {
    title: "Des factures clients restent impayées depuis longtemps",
    explanation:
      "Vous avez des montants clients qui ne sont pas encaissés, et dont certains datent de plusieurs mois. Plus une facture vieillit, plus la chance de la récupérer baisse.",
    remediation: [
      "Ouvrez le rapport « Ventes & Clients » et repérez les lignes non soldées les plus anciennes.",
      "Relancez en priorité les plus anciennes : c'est là que le risque de perte est le plus élevé.",
      "Si un client ne paiera pas, parlez-en à votre comptable : une facture irrécouvrable se constate comptablement, elle ne disparaît pas.",
    ],
  },

  // --- Anomalies de saisie --------------------------------------------------
  DOUBLON_SUSPECT: {
    title: "Deux écritures se ressemblent beaucoup",
    explanation:
      "Deux ventes ou deux achats portent le même tiers, le même montant et des dates très proches. C'est souvent une saisie faite deux fois, ce qui gonfle votre chiffre d'affaires et votre TVA.",
    remediation: [
      "Ouvrez le journal et recherchez ces deux écritures.",
      "Si l'une a été saisie deux fois, supprimez le doublon.",
      "Si les deux sont réelles — deux commandes identiques le même jour — ignorez cette alerte.",
    ],
  },

  MONTANT_ABERRANT: {
    title: "Un montant sort de l'ordinaire",
    explanation:
      "Une écriture porte un montant très éloigné de tous les autres montants de sa catégorie. Cela peut être une vraie grosse opération, ou un zéro de trop.",
    remediation: [
      "Comparez ce montant avec le document d'origine — facture ou bon de commande.",
      "S'il s'agit d'une erreur de saisie, corrigez l'écriture.",
      "S'il est exact, aucune action n'est nécessaire : l'alerte disparaîtra d'elle-même.",
    ],
  },

  BENFORD_ANOMALIE: {
    title: "La répartition de vos montants est inhabituelle",
    explanation:
      "Sur l'ensemble des montants saisis, le premier chiffre ne se répartit pas comme il le fait d'ordinaire dans une comptabilité. C'est presque toujours le signe d'erreurs de saisie répétées, rarement autre chose.",
    remediation: [
      "Parcourez votre journal à la recherche de montants ronds saisis par habitude (10 000, 50 000) là où le document portait un montant précis.",
      "Vérifiez les écritures saisies en fin de mois, souvent plus rapidement que les autres.",
      "Si vos montants sont exacts, ignorez cette alerte : elle compare des formes, pas des faits.",
    ],
  },

  TAUX_TVA_INHABITUEL: {
    title: "Un taux de TVA inhabituel a été utilisé",
    explanation:
      "Une écriture utilise un taux de TVA qui ne correspond pas aux taux courants. En Algérie, les taux les plus utilisés sont 19 % et 9 %.",
    remediation: [
      "Ouvrez le journal et contrôlez le taux appliqué sur cette écriture.",
      "Corrigez-le si la facture d'origine porte un autre taux.",
      "Un taux réduit ou une exonération sont possibles : vérifiez le document avant de corriger.",
    ],
  },

  // --- Complétude des données ----------------------------------------------
  TIERS_MANQUANT: {
    title: "Des écritures n'indiquent pas le client ou le fournisseur",
    explanation:
      "Certaines écritures ne portent pas de nom de tiers. Sans lui, il est impossible de suivre qui vous doit de l'argent, ni à qui vous en devez.",
    remediation: [
      "Ouvrez le journal et complétez le tiers sur les écritures concernées.",
      "Prenez l'habitude de le renseigner à la saisie : c'est ce qui alimente les rapports « Ventes & Clients » et « Achats & Fournisseurs ».",
    ],
  },

  VENTE_SANS_COUT: {
    title: "Des ventes ne précisent pas le coût de la marchandise vendue",
    explanation:
      "Vous gérez du stock, mais certaines ventes n'indiquent pas ce que la marchandise vendue vous avait coûté. Sans ce chiffre, votre marge est surévaluée : l'application compte la vente sans compter l'achat.",
    remediation: [
      "Ouvrez le journal et vérifiez que chaque vente de marchandise est bien liée à un article du stock.",
      "Pour les ventes saisies sans article, rattachez-les à un produit du stock ou saisissez le coût manuellement.",
    ],
  },

  STOCK_NEGATIF: {
    title: "Un produit a un stock négatif",
    explanation:
      "Une quantité négative veut dire que vous avez enregistré plus de sorties que d'entrées. La valeur de votre stock est donc fausse, et avec elle votre marge et votre bilan.",
    remediation: [
      "Ouvrez la page « Stocks » et retrouvez le produit concerné.",
      "Vérifiez s'il manque une entrée — une livraison reçue mais non saisie est la cause la plus fréquente.",
      "Saisissez l'entrée manquante, ou corrigez la sortie en trop.",
    ],
  },

  STOCK_MORT: {
    title: "Des produits dorment en stock",
    explanation:
      "Ces produits n'ont pas bougé depuis longtemps et immobilisent de l'argent qui ne travaille pas.",
    remediation: [
      "Vérifiez si ces produits se vendent encore.",
      "Envisagez de les déstocker, de les solder, ou de ne plus les recommander.",
    ],
  },

  IMMO_AMORTIE: {
    title: "Un équipement est amorti mais toujours inscrit à l'actif",
    explanation:
      "Cet équipement a fini d'être amorti, mais il apparaît encore dans vos immobilisations. Cela ne change pas votre résultat, mais cela alourdit votre bilan sans raison.",
    remediation: [
      "Si l'équipement est encore utilisé, aucune correction n'est nécessaire : un bien totalement amorti peut rester en service, il vaut simplement zéro au bilan.",
      "S'il est hors service, sortez-le de vos immobilisations.",
    ],
  },

  // --- Cohérence ------------------------------------------------------------
  TRESORERIE_NEGATIVE: {
    title: "Votre solde de caisse ou de banque est négatif",
    explanation:
      "Un solde négatif signale presque toujours une saisie manquante : un apport oublié, un encaissement non enregistré, ou un double décaissement.",
    remediation: [
      "Ouvrez les rapports « Caisse » et « Banque » et parcourez les dernières écritures.",
      "Comparez le solde affiché avec votre relevé bancaire ou votre caisse réelle.",
      "Saisissez l'opération manquante pour retrouver un solde exact.",
    ],
  },
} as const satisfies Record<string, KbEntry>;

/**
 * Every rule the panel can explain.
 *
 * Detectors type their `ruleId` as this union, so a new detector cannot ship
 * without its user-facing text — the compile fails first.
 */
export type RuleId = keyof typeof KNOWLEDGE_BASE;

/**
 * Looks up a rule's text.
 *
 * The cast is the one place the `as const` literal type is widened back to
 * `KbEntry`, and it is safe: `satisfies` above already proved every entry has
 * the right shape.
 */
export function knowledgeFor(ruleId: RuleId): KbEntry {
  return KNOWLEDGE_BASE[ruleId] as KbEntry;
}
