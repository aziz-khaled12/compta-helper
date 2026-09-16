import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetCompany } from "@workspace/api-client-react";
import { useAuth } from "@workspace/auth-web";
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  BookOpen,
  PackageSearch,
  Users,
  Receipt,
  FileBarChart2,
  Sparkles,
  Scale,
  Menu,
  LogOut,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: company } = useGetCompany();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
    { name: "Identité & Capital", href: "/company", icon: Building2 },
    { name: "Immobilisations", href: "/assets", icon: Briefcase },
    { name: "Journal", href: "/journal", icon: BookOpen },
    { name: "Stocks", href: "/inventory", icon: PackageSearch },
    { name: "Personnel", href: "/employees", icon: Users },
    { name: "Paie", href: "/payroll", icon: Receipt },
    { name: "Rapports", href: "/reports", icon: FileBarChart2 },
    { name: "Analyse", href: "/analyse", icon: Sparkles },
    { name: "Veille juridique", href: "/legal", icon: Scale },
  ];

  const displayName =
    user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Utilisateur"
      : "Utilisateur";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <Avatar className="h-7 w-7">
            {user?.profileImageUrl && (
              <AvatarImage src={user.profileImageUrl} alt={displayName} />
            )}
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-medium max-w-[140px] truncate">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium">{displayName}</span>
          {user?.email && (
            <span className="text-xs font-normal text-muted-foreground truncate">
              {user.email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()} className="text-destructive gap-2">
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
        {/* Sidebar user footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors">
            <Avatar className="h-7 w-7 shrink-0">
              {user?.profileImageUrl && (
                <AvatarImage src={user.profileImageUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</p>
              {user?.email && (
                <p className="text-[10px] text-sidebar-foreground/60 truncate">{user.email}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-sidebar-foreground/60 hover:text-destructive shrink-0"
              onClick={() => void logout()}
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
          {/* Mobile: hamburger + title */}
          <div className="flex items-center gap-3 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 p-0 bg-sidebar border-sidebar-border"
              >
                <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
                  <span className="font-bold text-sidebar-foreground tracking-tight text-lg">
                    {company?.name || "DJERDJERA"}
                  </span>
                </div>
                <div className="p-3">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            <div className="font-semibold text-foreground text-sm">
              {company?.name || "DJERDJERA Comptable"}
            </div>
          </div>

          {/* Desktop: left spacer */}
          <div className="hidden md:block" />

          {/* User menu (both mobile + desktop) */}
          <UserMenu />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
