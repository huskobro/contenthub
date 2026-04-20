import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { useVisibility } from "../hooks/useVisibility";
import { useSurfacePageOverride } from "../surfaces/SurfaceContext";
import { OnboardingWelcomeScreen } from "../components/onboarding/OnboardingWelcomeScreen";
import { OnboardingRequirementsScreen } from "../components/onboarding/OnboardingRequirementsScreen";
import { OnboardingSourceSetupScreen } from "../components/onboarding/OnboardingSourceSetupScreen";
import { OnboardingTemplateSetupScreen } from "../components/onboarding/OnboardingTemplateSetupScreen";
import { OnboardingSettingsSetupScreen } from "../components/onboarding/OnboardingSettingsSetupScreen";
import { OnboardingProviderSetupScreen } from "../components/onboarding/OnboardingProviderSetupScreen";
import { OnboardingWorkspaceSetupScreen } from "../components/onboarding/OnboardingWorkspaceSetupScreen";
import { OnboardingUserSetupScreen } from "../components/onboarding/OnboardingUserSetupScreen";
import { OnboardingReviewSummaryScreen } from "../components/onboarding/OnboardingReviewSummaryScreen";
import { OnboardingCompletionScreen } from "../components/onboarding/OnboardingCompletionScreen";

type OnboardingStep =
  | "welcome"
  | "requirements"
  | "source-setup"
  | "template-setup"
  | "settings-setup"
  | "provider-setup"
  | "user-setup"
  | "workspace-setup"
  | "review"
  | "completion";

/**
 * Public entry point. Delegates to a surface override when the active
 * surface declares one for `auth.onboarding` (Aurora). Otherwise falls
 * back to the legacy 10-step implementation below.
 */
export function OnboardingPage() {
  const Override = useSurfacePageOverride("auth.onboarding");
  if (Override) return <Override />;
  return <LegacyOnboardingPage />;
}

function LegacyOnboardingPage() {
  const [searchParams] = useSearchParams();
  const forceMode = searchParams.get("force") === "true";
  const { data: onboardingStatus, isLoading: statusLoading } = useOnboardingStatus();
  const [step, setStep] = useState<OnboardingStep>("welcome");

  // Wizard-visible checks: if a wizard step is explicitly hidden by a backend rule,
  // its sub-screen is skipped. Default (no rule / API error) shows the step.
  const sourceSetupVis = useVisibility("wizard:source-setup");
  const templateSetupVis = useVisibility("wizard:template-setup");
  const settingsSetupVis = useVisibility("wizard:settings-setup");

  // Helper: a wizard step is considered hidden only when the hook has loaded
  // successfully AND the resolution explicitly says wizard_visible=false.
  // The useVisibility hook defaults wizard_visible to false when data is absent,
  // so we must also check isLoading to avoid hiding steps before data arrives.
  function isWizardStepHidden(vis: typeof sourceSetupVis): boolean {
    return !vis.isLoading && !vis.wizardVisible;
  }

  // Bypass: if onboarding already completed, redirect to normal app.
  // Exception: ?force=true allows admin to re-run the wizard (e.g., from command palette).
  // While loading or on error, proceed with onboarding (safe default — no wrong redirect).
  if (!forceMode && !statusLoading && onboardingStatus && onboardingStatus.onboarding_required === false) {
    return <Navigate to="/user" replace />;
  }

  if (step === "source-setup") {
    // If wizard step is hidden by backend, skip back to requirements
    if (isWizardStepHidden(sourceSetupVis)) {
      setStep("requirements");
      return null;
    }
    return (
      <OnboardingSourceSetupScreen
        onBack={() => setStep("requirements")}
        onComplete={() => setStep("requirements")}
      />
    );
  }

  if (step === "template-setup") {
    if (isWizardStepHidden(templateSetupVis)) {
      setStep("requirements");
      return null;
    }
    return (
      <OnboardingTemplateSetupScreen
        onBack={() => setStep("requirements")}
        onComplete={() => setStep("requirements")}
      />
    );
  }

  if (step === "settings-setup") {
    if (isWizardStepHidden(settingsSetupVis)) {
      setStep("requirements");
      return null;
    }
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
        onComplete={() => setStep("user-setup")}
      />
    );
  }

  if (step === "user-setup") {
    return (
      <OnboardingUserSetupScreen
        onBack={() => setStep("provider-setup")}
        onComplete={() => setStep("workspace-setup")}
      />
    );
  }

  if (step === "workspace-setup") {
    return (
      <OnboardingWorkspaceSetupScreen
        onBack={() => setStep("user-setup")}
        onComplete={() => setStep("review")}
      />
    );
  }

  if (step === "review") {
    return (
      <OnboardingReviewSummaryScreen
        onBack={() => setStep("requirements")}
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
        onSourceSetup={!isWizardStepHidden(sourceSetupVis) ? () => setStep("source-setup") : undefined}
        onTemplateSetup={!isWizardStepHidden(templateSetupVis) ? () => setStep("template-setup") : undefined}
        onSettingsSetup={!isWizardStepHidden(settingsSetupVis) ? () => setStep("settings-setup") : undefined}
        onComplete={() => setStep("provider-setup")}
      />
    );
  }

  return <OnboardingWelcomeScreen onNext={() => setStep("requirements")} />;
}
