import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNewsBulletin } from "../api/newsBulletinApi";
import type { NewsBulletinCreatePayload } from "../api/newsBulletinApi";
import { useApiError } from "./useApiError";

export function useCreateNewsBulletin() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: NewsBulletinCreatePayload) => createNewsBulletin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletins"] });
    },
    onError,
  });
}
