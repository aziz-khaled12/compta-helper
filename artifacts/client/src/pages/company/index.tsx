import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, PiggyBank, Landmark } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useCompanyState } from "./hooks/useCompanyState";
import { CompanyForm } from "./components/CompanyForm";
import { FundingTable } from "./components/FundingTable";
import { FundingForm } from "./components/FundingForm";

export default function Company() {
  const state = useCompanyState();
  const { ownFunds, loans } = state;

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Identité & Capital</h1>
        <p className="text-muted-foreground mt-1">Gérez les informations légales et les fonds propres</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="bg-card h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Profil de l'entreprise</CardTitle>
            </div>
            <CardDescription>Informations légales et fiscales</CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyForm state={state} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <PiggyBank className="h-4 w-4" />
                  <span className="text-sm font-medium">Fonds Propres</span>
                </div>
                <div className="text-2xl font-bold">{formatMoney(ownFunds)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Landmark className="h-4 w-4" />
                  <span className="text-sm font-medium">Emprunts</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{formatMoney(loans)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Structure du Capital</CardTitle>
                <CardDescription>Apports et financements</CardDescription>
              </div>
              <FundingForm state={state} />
            </CardHeader>
            <CardContent>
              <FundingTable state={state} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
