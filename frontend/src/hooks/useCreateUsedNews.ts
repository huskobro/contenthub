import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUsedNews } from "../api/usedNewsApi";
import type { UsedNewsCreatePayload } from "../api/usedNewsApi";

export function useCreateUsedNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UsedNewsCreatePayload) => createUsedNews(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["used-news"] });
    },
  });
}
