import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeBilan } from "../../lib/calculations";
import { fmt } from "@/lib/ledger";

export function BilanView({
  data, period, companyName,
}: {
  data: ReturnType<typeof computeBilan>;
  period: string;
  companyName: string;
}) {
  const { compteResultat: cr, bilan } = data;
  const { balanced } = bilan;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compte de Résultat — {period}</CardTitle>
          <p className="text-xs text-muted-foreground">{companyName}</p>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm max-w-xl">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Désignation</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Montant (DA)</th>
              </tr>
            </thead>
            <tbody>
              <CrRow label="1. Recettes sur Ventes" value={cr.recettesVentes} />
              <CrRow label="2. Autres Recettes et Prestations" value={cr.autresRecettes} />
              <CrRow label="3. Variation de Stocks (+/-)" value={cr.variationStocks} />
              <CrRow label="Total Produits (1)" value={cr.totalRecettes} bold />
              <tr><td colSpan={2} className="py-2" /></tr>
              <CrRow label="4. Dépenses sur Achats" value={cr.depensesAchats} />
              <CrRow label="5. Autres Charges (Charges, Paie, Amort.)" value={cr.autresDepenses} />
              <CrRow label="Total Charges (2)" value={cr.totalDepenses} bold />
              <tr><td colSpan={2} className="py-2" /></tr>
              <tr className="border-t-2 bg-primary/5">
                <td className="px-3 py-3 text-sm font-bold">Résultat de l'Exercice (1) - (2)</td>
                <td className={`px-3 py-3 text-sm font-bold text-right tabular-nums ${cr.resultat >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {fmt(cr.resultat)}
                  <span className="ml-2 text-xs font-normal">{cr.resultat >= 0 ? "(Bénéfice)" : "(Perte)"}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* A memo, not a line of the SCF statement: the cost of what was sold
              is already carried above by the achats net of the variation de
              stocks. Shown because it is the figure the perpetual system is
              judged on, and because a sale recorded without an article has no
              cost to put in it. */}
          <div className="mt-6 pt-4 border-t max-w-xl">
            <p className="text-xs text-muted-foreground mb-2">
              Mémo — inventaire permanent. Le coût des ventes est déjà porté
              ci-dessus : les achats, nets de la variation de stocks, lui sont
              égaux dès lors que chaque vente est valorisée au CUMP. Une vente
              sans article ne porte aucun coût.
            </p>
            <table className="w-full text-sm">
              <tbody>
                <MemoRow label="Coût des ventes (CUMP appliqué)" value={cr.coutDesVentes} />
                <MemoRow label="Marge brute (Ventes HT − coût des ventes)" value={cr.margeBrute} strong />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Bilan Simplifié (Situation Financière)</CardTitle>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${balanced ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
              {balanced ? "Bilan équilibré" : "Bilan à vérifier"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-3 py-1 bg-blue-50 rounded">ACTIF</h4>
              <table className="w-full text-sm">
                <tbody>
                  <BilanRow label="Immobilisations (Valeur Nette)" value={bilan.actif.immobilisations} />
                  <BilanRow label="Stocks" value={bilan.actif.stocks} />
                  <BilanRow label="Créances de l'Exploitation (Clients)" value={bilan.actif.creances} />
                  <BilanRow label="Caisse" value={bilan.actif.caisse} />
                  <BilanRow label="Banque" value={bilan.actif.banque} />
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-blue-50/50">
                    <td className="px-3 py-2.5 text-sm font-bold">TOTAL ACTIF</td>
                    <td className="px-3 py-2.5 text-sm font-bold text-right tabular-nums text-blue-700">{fmt(bilan.actif.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-3 py-1 bg-orange-50 rounded">PASSIF</h4>
              <table className="w-full text-sm">
                <tbody>
                  <BilanRow label="Capital" value={bilan.passif.capital} />
                  <BilanRow label="Résultat de l'Exercice" value={bilan.passif.resultat} highlight={bilan.passif.resultat >= 0 ? "positive" : "negative"} />
                  <BilanRow label="Emprunts" value={bilan.passif.emprunts} />
                  <BilanRow label="Dettes de l'Exploitation (Fournisseurs)" value={bilan.passif.dettes} />
                  <BilanRow label="TVA à Décaisser" value={bilan.passif.tvaNette} />
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-orange-50/50">
                    <td className="px-3 py-2.5 text-sm font-bold">TOTAL PASSIF</td>
                    <td className="px-3 py-2.5 text-sm font-bold text-right tabular-nums text-orange-700">{fmt(bilan.passif.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CrRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <tr className={`border-b ${bold ? "bg-muted/20" : ""}`}>
      <td className={`px-3 py-2 text-sm ${bold ? "font-semibold" : ""}`}>{label}</td>
      <td className={`px-3 py-2 text-sm text-right tabular-nums ${bold ? "font-semibold" : ""} ${value < 0 ? "text-destructive" : ""}`}>
        {fmt(value)}
      </td>
    </tr>
  );
}

/** A memo figure: plain, and never coloured as a loss just for being a cost. */
function MemoRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <tr className="border-b">
      <td className={`px-3 py-2 text-sm ${strong ? "font-semibold" : "text-muted-foreground"}`}>{label}</td>
      <td className={`px-3 py-2 text-sm text-right tabular-nums ${strong ? "font-semibold text-emerald-600" : ""}`}>
        {fmt(value)}
      </td>
    </tr>
  );
}

function BilanRow({ label, value, highlight }: { label: string; value: number; highlight?: "positive" | "negative" }) {
  return (
    <tr className="border-b hover:bg-muted/20">
      <td className="px-3 py-2 text-sm">{label}</td>
      <td className={`px-3 py-2 text-sm text-right tabular-nums ${
        highlight === "positive" ? "text-emerald-600 font-semibold" :
        highlight === "negative" ? "text-destructive font-semibold" : ""
      }`}>
        {fmt(value)}
      </td>
    </tr>
  );
}
