import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStyleBlueprint } from "../api/styleBlueprintsApi";
import type { StyleBlueprintCreatePayload } from "../api/styleBlueprintsApi";
import { useApiError } from "./useApiError";

export function useCreateStyleBlueprint() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: StyleBlueprintCreatePayload) => createStyleBlueprint(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-blueprints"] });
    },
    onError,
  });
}
