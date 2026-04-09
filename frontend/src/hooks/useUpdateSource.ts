import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSource } from "../api/sourcesApi";
import type { SourceUpdatePayload } from "../api/sourcesApi";
import { useApiError } from "./useApiError";

export function useUpdateSource(sourceId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: SourceUpdatePayload) => updateSource(sourceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", sourceId] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError,
  });
}
