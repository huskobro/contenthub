import { useState } from "react";
import { OnboardingWelcomeScreen } from "../components/onboarding/OnboardingWelcomeScreen";
import { OnboardingRequirementsScreen } from "../components/onboarding/OnboardingRequirementsScreen";
import { OnboardingSourceSetupScreen } from "../components/onboarding/OnboardingSourceSetupScreen";
import { OnboardingTemplateSetupScreen } from "../components/onboarding/OnboardingTemplateSetupScreen";

type OnboardingStep = "welcome" | "requirements" | "source-setup" | "template-setup";

export function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("welcome");

  if (step === "source-setup") {
    return (
      <OnboardingSourceSetupScreen
        onBack={() => setStep("requirements")}
        onComplete={() => setStep("requirements")}
      />
    );
  }

  if (step === "template-setup") {
    return (
      <OnboardingTemplateSetupScreen
        onBack={() => setStep("requirements")}
        onComplete={() => setStep("requirements")}
      />
    );
  }

  if (step === "requirements") {
    return (
      <OnboardingRequirementsScreen
        onBack={() => setStep("welcome")}
        onSourceSetup={() => setStep("source-setup")}
        onTemplateSetup={() => setStep("template-setup")}
      />
    );
  }

  return <OnboardingWelcomeScreen onNext={() => setStep("requirements")} />;
}
