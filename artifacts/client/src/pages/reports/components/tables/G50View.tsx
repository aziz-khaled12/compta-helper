import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeG50, type G50Month } from "../../lib/calculations";
import { fmt } from "@/lib/ledger";
import { monthLabel } from "@/lib/months";

export function G50View({
  data,
  period,
  companyName,
  nif,
  ai,
  address,
}: {
  data: ReturnType<typeof computeG50>;
  period: string;
  companyName: string;
  nif?: string;
  ai?: string;
  address?: string | null;
}) {
  const { months, totals } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Série G n°50 — Bordereau avis de versement
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {companyName} — NIF {nif || "—"} — AI {ai || "—"}
            {address ? ` — ${address}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Période : {period} · Dépôt mensuel, du 1<sup>er</sup> au 20 du mois
            suivant · Obligatoire même en l'absence d'activité
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {months.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun mois dans la période sélectionnée.
            </p>
          ) : (
            months.map((month) => <G50Block key={month.monthYear} month={month} />)
          )}
        </CardContent>
      </Card>

      {months.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cumul de la période</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full max-w-xl text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Rubrique
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    Montant (DA)
                  </th>
                </tr>
              </thead>
              <tbody>
                <G50Row label="TVA collectée" value={totals.tvaCollectee} />
                <G50Row label="TVA déductible" value={totals.tvaDeductible} />
                <G50Row label="TVA nette" value={totals.tvaNette} />
                <G50Row label="IRG retenu à la source (salaires)" value={totals.irg} />
                <G50Row label="Total à verser" value={totals.total} bold />
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function G50Block({ month }: { month: G50Month }) {
  return (
    <div>
      <h4 className="mb-3 rounded bg-primary/5 px-3 py-1.5 text-sm font-bold">
        {monthLabel(month.monthYear)}
      </h4>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h5 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Cadre A — TVA
          </h5>
          <table className="w-full text-sm">
            <tbody>
              <G50Row label="TVA collectée (ventes)" value={month.tvaCollectee} />
              <G50Row label="TVA déductible (achats & charges)" value={month.tvaDeductible} />
              <G50Row
                label={month.tvaNette >= 0 ? "TVA nette à payer" : "Crédit de TVA à reporter"}
                value={Math.abs(month.tvaNette)}
                bold
              />
            </tbody>
          </table>
        </div>

        <div>
          <h5 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Cadre B — IRG / Salaires
          </h5>
          <table className="w-full text-sm">
            <tbody>
              <G50Row label="Masse salariale brute" value={month.grossSalary} />
              <G50Row label="CNAS (part salariale)" value={month.cnas} />
              <G50Row label="IRG retenu à la source" value={month.irg} bold />
            </tbody>
          </table>
        </div>
      </div>

      <table className="mt-4 w-full max-w-xl text-sm">
        <tbody>
          {/* No data source for acomptes provisionnels exists in the app, so this
              is left blank for the filer rather than reported as a confident zero. */}
          <tr className="border-b">
            <td className="px-3 py-2 text-sm">
              Cadre C — Acomptes provisionnels (IBS)
            </td>
            <td className="px-3 py-2 text-right text-xs italic text-muted-foreground">
              à compléter
            </td>
          </tr>
          <tr className="border-t-2 bg-primary/5">
            <td className="px-3 py-3 text-sm font-bold">Total à verser</td>
            <td className="px-3 py-3 text-right text-sm font-bold tabular-nums">
              {fmt(month.total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function G50Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <tr className={`border-b ${bold ? "bg-muted/20" : ""}`}>
      <td className={`px-3 py-2 text-sm ${bold ? "font-semibold" : ""}`}>{label}</td>
      <td
        className={`px-3 py-2 text-right text-sm tabular-nums ${bold ? "font-semibold" : ""}`}
      >
        {fmt(value)}
      </td>
    </tr>
  );
}
