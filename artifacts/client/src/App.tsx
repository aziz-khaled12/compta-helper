import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "./components/layout";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@workspace/auth-web";
import {
  getGetCompanyQueryKey,
  useGetCompany,
} from "@workspace/api-client-react";
import { RequireService } from "@/components/locked-service";
import { SubscriptionProvider, useSubscription } from "@/lib/subscription";

import Dashboard from "@/pages/dashboard";
import Company from "@/pages/company";
import Journal from "@/pages/journal";
import Debts from "@/pages/debts";
import Inventory from "@/pages/inventory";
import Employees from "@/pages/employees";
import Payroll from "@/pages/payroll";
import Reports from "@/pages/reports";
import Analyse from "@/pages/analyse";
import Legal from "@/pages/legal";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import Pricing from "@/pages/pricing";
import Checkout from "@/pages/checkout";
import Onboarding from "@/pages/onboarding";
import Subscription from "@/pages/subscription";
import Assets from "./pages/resources";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    },
  },
});

function AppRouter() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { isActive } = useSubscription();
  const { data: company, isLoading: companyLoading } = useGetCompany({
    // The generated hook's `query` type requires the key even though it defaults
    // it internally; passing the same key it would default to is a no-op.
    query: { queryKey: getGetCompanyQueryKey(), enabled: isAuthenticated, retry: false },
  });

  if (isLoading || (isAuthenticated && companyLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">{t("common.loading")}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Public acquisition flow: plans -> demo checkout or free trial -> account.
    // `/login` itself renders the subscription gate until a pass is paid for.
    if (location === "/pricing") return <Pricing />;
    if (location === "/checkout") return <Checkout />;
    return location === "/login" ? <Login /> : <Landing />;
  }

  // An expired pass (or a finished trial) blocks every service, core ones
  // included: the renewal screen is the only reachable page.
  if (!isActive) {
    return <Subscription standalone />;
  }

  if (!company) {
    return <Onboarding />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/company" component={Company} />
        <Route path="/resources">
          <RequireService service="assets">
            <Assets />
          </RequireService>
        </Route>
        <Route path="/journal" component={Journal} />
        <Route path="/debts">
          <RequireService service="debts">
            <Debts />
          </RequireService>
        </Route>
        <Route path="/inventory" component={Inventory} />
        <Route path="/employees">
          <RequireService service="employees">
            <Employees />
          </RequireService>
        </Route>
        <Route path="/payroll">
          <RequireService service="payroll">
            <Payroll />
          </RequireService>
        </Route>
        <Route path="/reports">
          <RequireService service="reports">
            <Reports />
          </RequireService>
        </Route>
        <Route path="/analyse">
          <RequireService service="analyse">
            <Analyse />
          </RequireService>
        </Route>
        <Route path="/legal">
          <RequireService service="legal">
            <Legal />
          </RequireService>
        </Route>
        <Route path="/subscription">
          <Subscription />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRouter />
            </WouterRouter>
            <Toaster />
            <SonnerToaster />
          </TooltipProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
