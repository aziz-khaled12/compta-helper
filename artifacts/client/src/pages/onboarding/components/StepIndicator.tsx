import { CheckCircle2, Building2, Briefcase, Package, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { id: 1, label: "Identité & Capital", icon: Building2 },
  { id: 2, label: "Immobilisations", icon: Briefcase },
  { id: 3, label: "Stocks", icon: Package },
  { id: 4, label: "Personnel", icon: Users },
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = current > step.id;
          const active = current === step.id;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    done
                      ? "bg-primary border-primary text-primary-foreground"
                      : active
                      ? "border-primary text-primary bg-primary/10"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 ${done ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
      <Progress value={(current / STEPS.length) * 100} className="h-1.5" />
      <p className="text-xs text-muted-foreground mt-1 text-right">
        Étape {current} sur {STEPS.length}
      </p>
    </div>
  );
}
