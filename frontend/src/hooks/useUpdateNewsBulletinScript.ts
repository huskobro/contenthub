import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNewsBulletinScript } from "../api/newsBulletinApi";
import type { NewsBulletinScriptUpdatePayload } from "../api/newsBulletinApi";

export function useUpdateNewsBulletinScript(bulletinId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewsBulletinScriptUpdatePayload) =>
      updateNewsBulletinScript(bulletinId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletin-script", bulletinId] });
    },
  });
}
