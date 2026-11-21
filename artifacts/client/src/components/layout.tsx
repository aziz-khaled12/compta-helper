import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import i18n, { LANGUAGES, type AppLanguage } from "@/i18n";
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
  HandCoins,
  Menu,
  LogOut,
  UserCircle,
  Languages,
  CreditCard,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSubscription } from "@/lib/subscription";
import type { AnyServiceId } from "@/lib/plans";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const { data: company } = useGetCompany();
  const { user, logout } = useAuth();
  const { canUse, isTrial, daysLeft } = useSubscription();

  const navigation: {
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
    service?: AnyServiceId;
  }[] = [
    { name: t("nav.dashboard"), href: "/", icon: LayoutDashboard, service: "dashboard" },
    { name: t("nav.company"), href: "/company", icon: Building2 },
    { name: t("nav.resources"), href: "/resources", icon: Briefcase, service: "assets" },
    { name: t("nav.journal"), href: "/journal", icon: BookOpen, service: "journal" },
    { name: t("nav.debts"), href: "/debts", icon: HandCoins, service: "debts" },
    { name: t("nav.inventory"), href: "/inventory", icon: PackageSearch, service: "inventory" },
    { name: t("nav.employees"), href: "/employees", icon: Users, service: "employees" },
    { name: t("nav.payroll"), href: "/payroll", icon: Receipt, service: "payroll" },
    { name: t("nav.reports"), href: "/reports", icon: FileBarChart2, service: "reports" },
    { name: t("nav.analyse"), href: "/analyse", icon: Sparkles, service: "analyse" },
    { name: t("nav.legal"), href: "/legal", icon: Scale, service: "legal" },
  ];

  const displayName =
    user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || t("layout.userDefault")
      : t("layout.userDefault");

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const companyName = company?.name || t("landing.brand");

  const Brand = () => (
    <div className="flex items-center gap-2.5 min-w-0">
      <img
        src="/logo-mark.jpg"
        alt={t("landing.brand")}
        className="h-9 w-auto rounded-md object-contain shrink-0"
      />
      <span
        className="min-w-0 truncate text-sm font-semibold text-sidebar-foreground"
        title={companyName}
      >
        {companyName}
      </span>
    </div>
  );

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div>
      <div className="space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const locked = item.service ? !canUse(item.service) : false;
          return (
            <Link key={item.name} href={item.href} onClick={onClick}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : locked
                      ? "text-sidebar-foreground/55 hover:bg-sidebar-accent/40"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {locked && (
                  <>
                    <Lock
                      className="h-3.5 w-3.5 shrink-0 opacity-70"
                      aria-hidden="true"
                    />
                    <span className="sr-only">{t("nav.locked")}</span>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-2 border-t border-sidebar-border pt-2">
        <Link href="/subscription" onClick={onClick}>
          <div
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              location === "/subscription"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span className="min-w-0 flex-1 truncate">
              {t("nav.subscription")}
            </span>
            {isTrial && (
              <span className="shrink-0 rounded-full bg-[#fdf3dd] px-2 py-0.5 text-[10px] font-bold text-[#a97812]">
                {t("trial.badge")}
              </span>
            )}
          </div>
        </Link>
      </div>
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
        <DropdownMenuItem
          onClick={() => navigate("/subscription")}
          className="gap-2">
          <CreditCard className="h-4 w-4" />
          {t("nav.subscription")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void logout()} className="text-destructive gap-2">
          <LogOut className="h-4 w-4" />
          {t("layout.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const LanguageSwitch = () => {
    const active = i18n.resolvedLanguage ?? i18n.language;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" title={t("layout.language")}>
            <Languages className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LANGUAGES.map((l: (typeof LANGUAGES)[number]) => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => void i18n.changeLanguage(l.code as AppLanguage)}
              className={active.startsWith(l.code) ? "text-primary font-medium" : undefined}
            >
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0">
          <Brand />
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
                  title={t("layout.logout")}
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
                  <span className="sr-only">{t("layout.menu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                aria-describedby={undefined}
                className="w-64 p-0 bg-sidebar border-sidebar-border"
              >
                <SheetTitle className="sr-only">{t("layout.menu")}</SheetTitle>
                <div className="h-16 flex items-center ps-6 pe-10 border-b border-sidebar-border">
                  <Brand />
                </div>
                <div className="p-3">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            <div className="font-semibold text-foreground text-sm">
              {company?.name || t("landing.brand")}
            </div>
          </div>

          {/* Desktop: left spacer */}
          <div className="hidden md:block" />

          {/* Language toggle + user menu (both mobile + desktop) */}
          <div className="flex items-center gap-1">
            <LanguageSwitch />
            <UserMenu />
          </div>
        </header>

        {isTrial && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f3d79a] bg-[#fdf7ea] px-4 py-2 text-xs font-medium text-[#7a5a12] md:px-6">
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t("trial.bannerLabel")} ·{" "}
              {daysLeft === 1
                ? t("trial.dayLeft")
                : t("trial.daysLeft", { count: daysLeft })}
            </span>
            <Link
              href="/subscription"
              className="font-semibold underline-offset-2 hover:underline">
              {t("trial.manage")}
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
