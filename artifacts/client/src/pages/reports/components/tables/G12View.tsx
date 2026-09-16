import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeG12 } from "../../lib/calculations";
import { fmt } from "@/lib/ledger";
import { IFU_CEILING, IFU_MINIMUM, IFU_RATES, computeIfuDue } from "@/lib/taxRegime";

export function G12View({
  data,
  period,
  companyName,
  nif,
  ai,
  address,
}: {
  data: ReturnType<typeof computeG12>;
  period: string;
  companyName: string;
  nif?: string;
  ai?: string;
  address?: string | null;
}) {
  const [rateId, setRateId] = useState<(typeof IFU_RATES)[number]["id"]>("marchandises");
  const line = IFU_RATES.find((r) => r.id === rateId) ?? IFU_RATES[0];
  const ifuDue = computeIfuDue(data.caTotal, line.rate);
  const atMinimum = data.caTotal * line.rate < IFU_MINIMUM;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            G12 — Déclaration prévisionnelle du chiffre d'affaires (IFU)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {companyName} — NIF {nif || "—"} — AI {ai || "—"}
            {address ? ` — ${address}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">Période : {period}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h5 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cadre I — Identification
            </h5>
            <table className="w-full max-w-xl text-sm">
              <tbody>
                <IdentityRow label="Raison sociale" value={companyName} />
                <IdentityRow label="NIF" value={nif || "—"} />
                <IdentityRow label="Article d'imposition" value={ai || "—"} />
                <IdentityRow label="Adresse" value={address || "—"} />
                <IdentityRow label="Activité" value="à compléter" muted />
              </tbody>
            </table>
          </div>

          <div>
            <h5 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cadre II — Chiffre d'affaires
            </h5>
            <table className="w-full max-w-xl text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm">
                    Chiffre d'affaires de la période
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({data.salesCount} vente{data.salesCount === 1 ? "" : "s"} HT)
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">
                    {fmt(data.caTotal)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm">TVA facturée</td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums">
                    {fmt(data.tvaCollectee)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm">Plafond du régime IFU</td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums text-muted-foreground">
                    {fmt(IFU_CEILING)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h5 className="mb-1 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cadre III — Taux applicable
            </h5>
            {/* The books record no activity, so the rate line cannot be chosen for
                the filer — it is the one input the declaration needs and the app
                cannot supply. Selecting a line only previews the IFU it implies. */}
            <p className="mb-3 px-3 text-xs text-muted-foreground">
              L'activité n'étant pas enregistrée, la ligne applicable doit être
              indiquée manuellement.
            </p>
            <div className="mb-3 flex flex-wrap gap-2 px-3">
              {IFU_RATES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRateId(r.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    r.id === rateId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {r.label} — {(r.rate * 100).toLocaleString("fr-DZ")} %
                </button>
              ))}
            </div>

            <table className="w-full max-w-xl text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm">
                    IFU calculé
                    <span className="ml-2 text-xs text-muted-foreground">
                      {fmt(data.caTotal)} × {(line.rate * 100).toLocaleString("fr-DZ")} %
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums">
                    {fmt(data.caTotal * line.rate)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 text-sm">Minimum d'imposition</td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums text-muted-foreground">
                    {fmt(IFU_MINIMUM)}
                  </td>
                </tr>
                <tr className="border-t-2 bg-primary/5">
                  <td className="px-3 py-3 text-sm font-bold">
                    IFU dû
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {atMinimum ? "(minimum d'imposition appliqué)" : "(le plus élevé des deux)"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-bold tabular-nums">
                    {fmt(ifuDue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Déclaration prévisionnelle : le chiffre d'affaires ci-dessus provient du
            livre des ventes. Le régime IFU étant exclusif, aucun bordereau G50 n'est
            déposé ; un contribuable IFU employant du personnel reste tenu de déposer
            la <span className="font-medium">G50 ter</span> annuelle avant le 20 janvier.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function IdentityRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <tr className="border-b">
      <td className="w-1/2 px-3 py-2 text-sm text-muted-foreground">{label}</td>
      <td
        className={`px-3 py-2 text-sm ${muted ? "italic text-muted-foreground" : "font-medium"}`}
      >
        {value}
      </td>
    </tr>
  );
}
