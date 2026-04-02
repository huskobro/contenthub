import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNewsBulletinMetadata } from "../api/newsBulletinApi";
import type { NewsBulletinMetadataCreatePayload } from "../api/newsBulletinApi";

export function useCreateNewsBulletinMetadata(bulletinId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewsBulletinMetadataCreatePayload) =>
      createNewsBulletinMetadata(bulletinId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-bulletin-metadata", bulletinId] });
    },
  });
}
