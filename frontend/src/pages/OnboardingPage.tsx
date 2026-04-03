import { useState } from "react";
import { OnboardingWelcomeScreen } from "../components/onboarding/OnboardingWelcomeScreen";
import { OnboardingRequirementsScreen } from "../components/onboarding/OnboardingRequirementsScreen";

type OnboardingStep = "welcome" | "requirements";

export function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("welcome");

  if (step === "requirements") {
    return <OnboardingRequirementsScreen onBack={() => setStep("welcome")} />;
  }

  return <OnboardingWelcomeScreen onNext={() => setStep("requirements")} />;
}
