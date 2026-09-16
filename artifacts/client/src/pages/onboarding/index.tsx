import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StepIndicator } from "./components/StepIndicator";
import { Company } from "./components/Company";
import { Assets } from "./components/Assets";
import { Inventory } from "./components/Inventory";
import { Personnel } from "./components/Personnel";
import { useOnboardingState } from "./hooks/useOnboardingState";

const stepTitles = [
  "Identité & Capital de l'entreprise",
  "Immobilisations (Actifs Fixes)",
  "Stock initial",
  "Personnel",
];
const stepDescs = [
  "Saisissez les informations légales de votre entreprise, puis déclarez le capital et les emprunts.",
  "Enregistrez vos équipements et matériels. Vous pourrez en ajouter d'autres plus tard.",
  "Définissez votre inventaire de départ. Vous pourrez en ajouter d'autres plus tard.",
  "Ajoutez vos collaborateurs. Vous pourrez compléter la liste plus tard.",
];

export default function Onboarding() {
  const state = useOnboardingState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--sidebar-background))] to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground text-lg font-bold mb-3">
            D
          </div>
          <h1 className="text-2xl font-bold">Configuration initiale</h1>
          <p className="text-muted-foreground text-sm">
            Configurez votre espace comptable en quelques minutes.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <StepIndicator current={state.step} />
            <CardTitle className="text-xl">{stepTitles[state.step - 1]}</CardTitle>
            <CardDescription>{stepDescs[state.step - 1]}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {state.step === 1 && <Company state={state} />}
            {state.step === 2 && <Assets state={state} />}
            {state.step === 3 && <Inventory state={state} />}
            {state.step === 4 && <Personnel state={state} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
