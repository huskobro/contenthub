import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUsedNews } from "../api/usedNewsApi";
import type { UsedNewsCreatePayload } from "../api/usedNewsApi";
import { useApiError } from "./useApiError";

export function useCreateUsedNews() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: UsedNewsCreatePayload) => createUsedNews(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["used-news"] });
    },
    onError,
  });
}
