const BASE_URL = "/api/v1/onboarding";

export interface OnboardingStatusResponse {
  onboarding_required: boolean;
  completed_at: string | null;
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatusResponse> {
  const res = await fetch(`${BASE_URL}/status`);
  if (!res.ok) {
    throw new Error(`Failed to fetch onboarding status: ${res.status}`);
  }
  return res.json();
}

export async function completeOnboarding(): Promise<OnboardingStatusResponse> {
  const res = await fetch(`${BASE_URL}/complete`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to complete onboarding: ${res.status}`);
  }
  return res.json();
}
