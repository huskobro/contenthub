import { useQuery } from "@tanstack/react-query";
import { fetchSetupRequirements } from "../api/onboardingApi";

export function useSetupRequirements() {
  return useQuery({
    queryKey: ["onboarding", "requirements"],
    queryFn: fetchSetupRequirements,
  });
}
