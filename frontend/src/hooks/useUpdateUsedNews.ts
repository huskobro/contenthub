import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUsedNews } from "../api/usedNewsApi";
import type { UsedNewsUpdatePayload } from "../api/usedNewsApi";
import { useApiError } from "./useApiError";

export function useUpdateUsedNews(id: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: UsedNewsUpdatePayload) => updateUsedNews(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["used-news"] });
      queryClient.invalidateQueries({ queryKey: ["used-news", id] });
    },
    onError,
  });
}
