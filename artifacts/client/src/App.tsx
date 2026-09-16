import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

import Dashboard from "@/pages/dashboard";
import Company from "@/pages/company";
import Assets from "@/pages/assets";
import Journal from "@/pages/journal";
import Inventory from "@/pages/inventory";
import Employees from "@/pages/employees";
import Payroll from "@/pages/payroll";
import Reports from "@/pages/reports";
import Analyse from "@/pages/analyse";
import Legal from "@/pages/legal";
import Login from "@/pages/login";
import Onboarding from "@/pages/onboarding";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    },
  },
});

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: company, isLoading: companyLoading } = useGetCompany({
    // The generated hook's `query` type requires the key even though it defaults
    // it internally; passing the same key it would default to is a no-op.
    query: { queryKey: getGetCompanyQueryKey(), enabled: isAuthenticated, retry: false },
  });

  if (isLoading || (isAuthenticated && companyLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!company) {
    return <Onboarding />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/company" component={Company} />
        <Route path="/assets" component={Assets} />
        <Route path="/journal" component={Journal} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/employees" component={Employees} />
        <Route path="/payroll" component={Payroll} />
        <Route path="/reports" component={Reports} />
        <Route path="/analyse" component={Analyse} />
        <Route path="/legal" component={Legal} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
          <SonnerToaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
