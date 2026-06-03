import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "./components/layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Company from "@/pages/company";
import Assets from "@/pages/assets";
import Journal from "@/pages/journal";
import Inventory from "@/pages/inventory";
import Employees from "@/pages/employees";
import Payroll from "@/pages/payroll";
import Reports from "@/pages/reports";

const queryClient = new QueryClient();

function Router() {
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
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;