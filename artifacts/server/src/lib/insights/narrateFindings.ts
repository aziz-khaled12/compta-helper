import { Type } from "@google/genai";
import { createHash } from "node:crypto";
import { GEMINI_MODEL, generateJson } from "../gemini/client";

/**
 * Turning findings into prose.
 *
 * The whole design of this feature rests on one boundary, and this file is where
 * it is enforced: **the model narrates, it never computes.**
 *
 * By the time anything reaches Gemini, the detectors have already run in the
 * browser, the numbers have already been calculated in TypeScript, and the
 * explanation of each rule already exists in the client's knowledge base. So the
 * model is not asked to find anything, count anything, or diagnose anything. It
 * is handed a list of findings that are already true and asked to do the one
 * thing code cannot: decide which of them matters most to this business, and say
 * why in a sentence a shop owner will read.
 *
 * That is what bounds the failure modes:
 *
 *   - Every figure in the output also appears in the input. A number the model
 *     invented cannot survive review, because there is nothing to invent from.
 *   - `priorities[].ruleId` is filtered against the rules actually sent, the same
 *     way `knownSectors` filters extraction output — a schema is a request, not a
 *     guarantee, and a hallucinated rule id would render as a card pointing at
 *     nothing.
 *   - If the call fails, the caller still has the knowledge-base text. The panel
 *     degrades; it does not empty.
 */

/** What the model is allowed to see about one finding. */
interface NarratableFinding {
  ruleId: string;
  severity: string;
  title: string;
  /** Optional in the contract, so optional here — the browser may send neither. */
  evidence?: string[];
  metrics?: Record<string, number>;
  subject?: string | null;
}

/**
 * The standing rules.
 *
 * Written as constraints rather than as a personality, because the failure this
 * guards against is not rudeness or vagueness — it is a confident sentence that
 * is wrong, which is worse than no sentence at all for a reader who cannot check
 * it against a ledger.
 */
const NARRATION_RULES = `Tu écris pour le propriétaire d'une petite entreprise en Algérie. Il n'est PAS comptable.

Règles absolues :
1. N'invente AUCUN chiffre. Tous les montants et pourcentages que tu écris doivent apparaître tels quels dans les données fournies. Si tu n'as pas le chiffre, n'en mets pas.
2. N'invente AUCUNE référence juridique. Ne cite jamais un article, un décret, un numéro de loi ou un texte officiel : tu n'en as pas la source. Si une règle de gestion impose une limite, dis simplement « le plafond appliqué par l'application ».
3. N'utilise que les identifiants de règle (ruleId) fournis. Tu ne connais pas d'autres règles.
4. Pas de jargon comptable. Dis « ce qu'il vous reste après avoir payé la marchandise » plutôt que « marge brute ». La seule exception est « régime forfaitaire », que ton lecteur connaît déjà puisqu'il l'a choisi, et qui doit rester entre guillemets.
5. Écris en français simple, à la deuxième personne (« vous »).
6. Ne félicite pas, ne t'excuse pas, ne commente pas ta propre réponse. Va droit au fait.

Tu rends deux choses :
- « summary » : 2 à 3 phrases qui disent l'état général de l'entreprise sur la période et ce qui, dans ce qui suit, mérite d'être regardé en premier.
- « priorities » : les constats les plus importants, du plus urgent au moins urgent, chacun avec pourquoi cela compte pour cette entreprise et l'action concrète à faire. Ne reprends pas tous les constats : garde les plus importants, classés par ce qui coûte le plus cher ou bloque le plus de choses. Si un seul constat mérite l'attention, ne mets qu'un seul élément.`;

/**
 * A stable identity for a set of findings.
 *
 * Hashes only the fields that affect the prose — notably not `evidence`, which
 * is formatted text derived from `metrics`, so re-wording a label in the
 * knowledge base would otherwise miss the cache and pay for the same paragraph
 * again.
 */
export function hashFindings(findings: NarratableFinding[], periodRef: string): string {
  const canonical = findings
    .map((f) => ({
      ruleId: f.ruleId,
      severity: f.severity,
      subject: f.subject ?? null,
      // Sorted so two builds that enumerate the same metrics in a different
      // order still produce the same hash.
      metrics: Object.fromEntries(
        Object.entries(f.metrics ?? {}).sort(([a], [b]) => a.localeCompare(b)),
      ),
      periodRef,
    }))
    .sort((a, b) => `${a.ruleId}|${a.subject ?? ""}`.localeCompare(`${b.ruleId}|${b.subject ?? ""}`));

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/**
 * Narrates a set of findings.
 *
 * Returns the model id alongside the prose so the row it is cached under stays
 * self-describing: when the pinned model changes, old narratives remain
 * identifiable as the output of a model no longer in use.
 */
export async function narrateFindings(params: {
  findings: NarratableFinding[];
  periodRef: string;
  companyName?: string | null;
}): Promise<{ narrative: { summary: string; priorities: { ruleId: string; whyItMatters: string; action: string }[] }; model: string }> {
  const { findings, periodRef, companyName } = params;

  const knownRuleIds = new Set(findings.map((f) => f.ruleId));

  const raw = await generateJson<{
    summary?: string;
    priorities?: { ruleId?: string; whyItMatters?: string; action?: string }[];
  }>({
    contents: [
      `Période analysée : ${periodRef}.`,
      companyName ? `Entreprise : ${companyName}.` : "",
      `Constats détectés automatiquement (${findings.length}) :`,
      JSON.stringify(
        findings.map((f) => ({
          ruleId: f.ruleId,
          gravite: f.severity,
          constat: f.title,
          chiffres: f.evidence ?? [],
          valeurs: f.metrics ?? {},
          ...(f.subject ? { concerne: f.subject } : {}),
        })),
        null,
        2,
      ),
      "Rédige la synthèse et les priorités selon les règles fournies.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    systemInstruction: NARRATION_RULES,
    // Low, and lower than extraction's 0.1 is not the goal — the task has some
    // judgement in it (which finding matters most), so a little variation is
    // wanted. What is not wanted is a different set of numbers each reload,
    // which is why the figures are supplied rather than derived.
    temperature: 0.3,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        priorities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              // Constrained to the rules actually sent, so the model chooses
              // among real findings rather than inventing a category.
              ruleId: { type: Type.STRING, enum: [...knownRuleIds] },
              whyItMatters: { type: Type.STRING },
              action: { type: Type.STRING },
            },
            required: ["ruleId", "whyItMatters", "action"],
          },
        },
      },
      required: ["summary", "priorities"],
    },
  });

  return {
    narrative: {
      summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
      // Filtered even though the schema constrains ruleId: the schema is a
      // request, not a guarantee, and a priority pointing at a rule that was
      // never sent would render as a card with no finding behind it.
      priorities: (Array.isArray(raw.priorities) ? raw.priorities : [])
        .filter(
          (p): p is { ruleId: string; whyItMatters: string; action: string } =>
            typeof p?.ruleId === "string" &&
            knownRuleIds.has(p.ruleId) &&
            typeof p.whyItMatters === "string" &&
            p.whyItMatters.trim() !== "" &&
            typeof p.action === "string" &&
            p.action.trim() !== "",
        )
        .map((p) => ({
          ruleId: p.ruleId,
          whyItMatters: p.whyItMatters.trim(),
          action: p.action.trim(),
        })),
    },
    model: GEMINI_MODEL,
  };
}
