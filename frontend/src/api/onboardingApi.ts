import { api } from "./client";

const BASE_URL = "/api/v1/onboarding";

export interface OnboardingStatusResponse {
  onboarding_required: boolean;
  completed_at: string | null;
}

export function fetchOnboardingStatus(): Promise<OnboardingStatusResponse> {
  return api.get<OnboardingStatusResponse>(`${BASE_URL}/status`);
}

export function completeOnboarding(): Promise<OnboardingStatusResponse> {
  return api.post<OnboardingStatusResponse>(`${BASE_URL}/complete`);
}

export interface SetupRequirementItem {
  key: string;
  title: string;
  description: string;
  status: "completed" | "missing";
  detail: string | null;
}

export interface SetupRequirementsResponse {
  all_completed: boolean;
  requirements: SetupRequirementItem[];
}

export function fetchSetupRequirements(): Promise<SetupRequirementsResponse> {
  return api.get<SetupRequirementsResponse>(`${BASE_URL}/requirements`);
}
