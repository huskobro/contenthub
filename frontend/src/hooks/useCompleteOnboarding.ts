import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding } from "../api/onboardingApi";
import { useApiError } from "./useApiError";

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: completeOnboarding,
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "status"] });
    },
  });
}
