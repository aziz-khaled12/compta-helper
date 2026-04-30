import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetCompany } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Building2, 
  Briefcase, 
  BookOpen, 
  PackageSearch, 
  Users, 
  Receipt,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: company } = useGetCompany();

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
    { name: "Identité & Capital", href: "/company", icon: Building2 },
    { name: "Immobilisations", href: "/assets", icon: Briefcase },
    { name: "Journal", href: "/journal", icon: BookOpen },
    { name: "Stocks", href: "/inventory", icon: PackageSearch },
    { name: "Personnel", href: "/employees", icon: Users },
    { name: "Paie", href: "/payroll", icon: Receipt },
  ];

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="space-y-1">
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href} onClick={onClick}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0">
          <div className="flex flex-col">
            <span className="font-bold text-sidebar-foreground tracking-tight leading-none text-lg">
              {company?.name || "DJERDJERA"}
            </span>
            <span className="text-[10px] text-sidebar-foreground/70 uppercase tracking-wider mt-1">
              Comptabilité
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <NavLinks />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
                <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
                  <div className="flex flex-col">
                    <span className="font-bold text-sidebar-foreground tracking-tight leading-none text-lg">
                      {company?.name || "DJERDJERA"}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            <div className="font-semibold text-foreground">
              {company?.name || "DJERDJERA Comptable"}
            </div>
          </div>
          
          <div className="hidden md:block">
            {/* Desktop header content if needed */}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
