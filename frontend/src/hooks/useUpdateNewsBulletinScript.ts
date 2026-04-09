import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNewsBulletinScript } from "../api/newsBulletinApi";
import type { NewsBulletinScriptUpdatePayload } from "../api/newsBulletinApi";
import { useApiError } from "./useApiError";

export function useUpdateNewsBulletinScript(bulletinId: string) {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: NewsBulletinScriptUpdatePayload) =>
      updateNewsBulletinScript(bulletinId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletin-script", bulletinId] });
    },
    onError,
  });
}
