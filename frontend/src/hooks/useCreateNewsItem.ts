import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNewsItem } from "../api/newsItemsApi";
import type { NewsItemCreatePayload } from "../api/newsItemsApi";
import { useApiError } from "./useApiError";

export function useCreateNewsItem() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: NewsItemCreatePayload) => createNewsItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
    },
    onError,
  });
}
