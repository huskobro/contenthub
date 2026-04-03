import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { OnboardingWelcomeScreen } from "../components/onboarding/OnboardingWelcomeScreen";
import { OnboardingRequirementsScreen } from "../components/onboarding/OnboardingRequirementsScreen";
import { OnboardingSourceSetupScreen } from "../components/onboarding/OnboardingSourceSetupScreen";
import { OnboardingTemplateSetupScreen } from "../components/onboarding/OnboardingTemplateSetupScreen";
import { OnboardingSettingsSetupScreen } from "../components/onboarding/OnboardingSettingsSetupScreen";
import { OnboardingProviderSetupScreen } from "../components/onboarding/OnboardingProviderSetupScreen";
import { OnboardingWorkspaceSetupScreen } from "../components/onboarding/OnboardingWorkspaceSetupScreen";
import { OnboardingReviewSummaryScreen } from "../components/onboarding/OnboardingReviewSummaryScreen";
import { OnboardingCompletionScreen } from "../components/onboarding/OnboardingCompletionScreen";

type OnboardingStep =
  | "welcome"
  | "requirements"
  | "source-setup"
  | "template-setup"
  | "settings-setup"
  | "provider-setup"
  | "workspace-setup"
  | "review"
  | "completion";

export function OnboardingPage() {
  const { data: onboardingStatus, isLoading: statusLoading } = useOnboardingStatus();
  const [step, setStep] = useState<OnboardingStep>("welcome");

  // Bypass: if onboarding already completed, redirect to normal app.
  // While loading or on error, proceed with onboarding (safe default — no wrong redirect).
  if (!statusLoading && onboardingStatus && onboardingStatus.onboarding_required === false) {
    return <Navigate to="/user" replace />;
  }

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

  if (step === "settings-setup") {
    return (
      <OnboardingSettingsSetupScreen
        onBack={() => setStep("requirements")}
        onComplete={() => setStep("requirements")}
      />
    );
  }

  if (step === "provider-setup") {
    return (
      <OnboardingProviderSetupScreen
        onBack={() => setStep("requirements")}
        onComplete={() => setStep("workspace-setup")}
      />
    );
  }

  if (step === "workspace-setup") {
    return (
      <OnboardingWorkspaceSetupScreen
        onBack={() => setStep("provider-setup")}
        onComplete={() => setStep("review")}
      />
    );
  }

  if (step === "review") {
    return (
      <OnboardingReviewSummaryScreen
        onBack={() => setStep("workspace-setup")}
        onComplete={() => setStep("completion")}
      />
    );
  }

  if (step === "completion") {
    return (
      <OnboardingCompletionScreen
        onBack={() => setStep("requirements")}
      />
    );
  }

  if (step === "requirements") {
    return (
      <OnboardingRequirementsScreen
        onBack={() => setStep("welcome")}
        onSourceSetup={() => setStep("source-setup")}
        onTemplateSetup={() => setStep("template-setup")}
        onSettingsSetup={() => setStep("settings-setup")}
        onComplete={() => setStep("provider-setup")}
      />
    );
  }

  return <OnboardingWelcomeScreen onNext={() => setStep("requirements")} />;
}
