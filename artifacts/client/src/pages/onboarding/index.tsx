import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { StepIndicator } from "./components/StepIndicator";
import { Company } from "./components/Company";
import { Inventory } from "./components/Inventory";
import { Personnel } from "./components/Personnel";
import { useOnboardingState } from "./hooks/useOnboardingState";
import { Assets } from "./components/Resources";

const STEP_TITLES = [
  "onboarding.step1Title",
  "onboarding.step2Title",
  "onboarding.step3Title",
  "onboarding.step4Title",
];
const STEP_DESCS = [
  "onboarding.step1Desc",
  "onboarding.step2Desc",
  "onboarding.step3Desc",
  "onboarding.step4Desc",
];

export default function Onboarding() {
  const { t } = useTranslation();
  const state = useOnboardingState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--sidebar-background))] to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground text-lg font-bold mb-3">
            D
          </div>
          <h1 className="text-2xl font-bold">{t("onboarding.heading")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("onboarding.subheading")}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <StepIndicator current={state.step} />
            <CardTitle className="text-xl">{t(STEP_TITLES[state.step - 1])}</CardTitle>
            <CardDescription>{t(STEP_DESCS[state.step - 1])}</CardDescription>
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
