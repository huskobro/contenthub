import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNewsBulletinScript } from "../api/newsBulletinApi";
import type { NewsBulletinScriptCreatePayload } from "../api/newsBulletinApi";

export function useCreateNewsBulletinScript(bulletinId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewsBulletinScriptCreatePayload) =>
      createNewsBulletinScript(bulletinId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletin-script", bulletinId] });
    },
  });
}
