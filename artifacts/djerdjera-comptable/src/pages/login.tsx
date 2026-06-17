import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { BookOpen, BarChart2, Users, Package } from "lucide-react";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--sidebar-background))] to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-lg">
            D
          </div>
          <h1 className="text-3xl font-bold tracking-tight">DJERDJERA</h1>
          <p className="text-muted-foreground text-sm">
            Système de comptabilité — SCF Algérie
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: BarChart2, label: "Tableau de bord", desc: "KPIs en temps réel" },
            { icon: BookOpen, label: "Journal", desc: "Ventes & Achats" },
            { icon: Users, label: "Personnel & Paie", desc: "IRG + CNAS auto" },
            { icon: Package, label: "Stocks", desc: "Valeur pondérée" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl border bg-card p-4 space-y-1">
              <Icon className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium leading-none">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Login button */}
        <div className="space-y-3">
          <Button className="w-full h-12 text-base" onClick={login}>
            Se connecter
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Connexion sécurisée — vos données restent privées.
          </p>
        </div>
      </div>
    </div>
  );
}
