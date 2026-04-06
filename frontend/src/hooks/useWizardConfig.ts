import { useQuery } from "@tanstack/react-query";
import {
  fetchWizardConfigs,
  fetchWizardConfigByType,
  type WizardConfigResponse,
  type WizardStepConfig,
  type WizardStepFieldConfig,
} from "../api/wizardConfigApi";

/**
 * Fetch a wizard config by wizard_type for frontend consumption.
 * Graceful degradation: returns null config if API fails.
 */
export function useWizardConfig(wizardType: string) {
  const query = useQuery({
    queryKey: ["wizard-config", wizardType],
    queryFn: () => fetchWizardConfigByType(wizardType),
    staleTime: 60_000,
    retry: 1,
  });

  const config: WizardConfigResponse | null = query.data ?? null;
  const steps: WizardStepConfig[] = config?.steps_config ?? [];

  function getFieldConfig(
    stepKey: string,
    fieldKey: string,
  ): WizardStepFieldConfig | null {
    const step = steps.find((s) => s.step_key === stepKey);
    if (!step) return null;
    return step.fields.find((f) => f.field_key === fieldKey) ?? null;
  }

  return {
    config,
    steps,
    getFieldConfig,
    isLoading: query.isLoading,
  };
}

/**
 * Fetch all wizard configs (admin listing).
 */
export function useWizardConfigsList() {
  return useQuery({
    queryKey: ["wizard-configs"],
    queryFn: fetchWizardConfigs,
  });
}
