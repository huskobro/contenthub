import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStyleBlueprint } from "../api/styleBlueprintsApi";
import type { StyleBlueprintCreatePayload } from "../api/styleBlueprintsApi";

export function useCreateStyleBlueprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StyleBlueprintCreatePayload) => createStyleBlueprint(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-blueprints"] });
    },
  });
}
