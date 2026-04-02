import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStyleBlueprint } from "../api/styleBlueprintsApi";
import type { StyleBlueprintUpdatePayload } from "../api/styleBlueprintsApi";

export function useUpdateStyleBlueprint(blueprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StyleBlueprintUpdatePayload) => updateStyleBlueprint(blueprintId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-blueprints"] });
      queryClient.invalidateQueries({ queryKey: ["style-blueprint", blueprintId] });
    },
  });
}
