import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSource } from "../api/sourcesApi";
import type { SourceCreatePayload } from "../api/sourcesApi";
import { useApiError } from "./useApiError";

export function useCreateSource() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: SourceCreatePayload) => createSource(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError,
  });
}
