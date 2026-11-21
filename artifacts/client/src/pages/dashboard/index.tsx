import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";
import { useDashboardState } from "./hooks/useDashboardState";
import { KpiCards } from "./components/KpiCards";
import { PnlChart } from "./components/PnlChart";
import { RecentActivity } from "./components/RecentActivity";
import { SummaryCards } from "./components/SummaryCards";
import { StockPreview } from "./components/StockPreview";
import { LegalAlertsCard } from "./components/LegalAlertsCard";

export default function Dashboard() {
  const { t } = useTranslation();
  const state = useDashboardState();
  const { company, isLoading, loadingCompany, loadingSummary } = state;

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-12 w-64" /><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div></div>;
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-6">
        <div className="bg-card border rounded-lg p-12 shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"><Building2 className="h-8 w-8 text-primary" /></div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("dashboard.welcome")}</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t("dashboard.configurePrompt")}</p>
          <Link href="/company"><Button size="lg">{t("dashboard.configureCta")}</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.overview", { name: company.name })}</p>
      </div>
      <KpiCards state={state} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <PnlChart state={state} />
        <RecentActivity state={state} />
      </div>
      <SummaryCards state={state} />
      <LegalAlertsCard />
      <StockPreview />
    </div>
  );
}
