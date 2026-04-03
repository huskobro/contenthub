import { useQuery } from "@tanstack/react-query";
import { fetchOnboardingStatus } from "../api/onboardingApi";

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ["onboarding", "status"],
    queryFn: fetchOnboardingStatus,
  });
}
