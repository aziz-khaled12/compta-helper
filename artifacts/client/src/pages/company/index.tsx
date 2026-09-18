import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, PiggyBank, Landmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/format";
import { useCompanyState } from "./hooks/useCompanyState";
import { CompanyForm } from "./components/CompanyForm";
import { FundingTable } from "./components/FundingTable";
import { FundingForm } from "./components/FundingForm";

export default function Company() {
  const { t } = useTranslation();
  const state = useCompanyState();
  const { ownFunds, loans } = state;

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("company.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("companyPage.subtitle")}</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="bg-card h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>{t("companyPage.profileTitle")}</CardTitle>
            </div>
            <CardDescription>{t("companyPage.legalSubtitle")}</CardDescription>
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
                  <span className="text-sm font-medium">{t("companyPage.ownFunds")}</span>
                </div>
                <div className="text-2xl font-bold">{formatMoney(ownFunds)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Landmark className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("companyPage.loans")}</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{formatMoney(loans)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("companyPage.capitalTitle")}</CardTitle>
                <CardDescription>{t("companyPage.capitalSubtitle")}</CardDescription>
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
