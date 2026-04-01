import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSource } from "../api/sourcesApi";
import type { SourceCreatePayload } from "../api/sourcesApi";

export function useCreateSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SourceCreatePayload) => createSource(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });
}
