import { useQuery } from "@tanstack/react-query";
import { fetchNewsBulletinMetadata } from "../api/newsBulletinApi";

export function useNewsBulletinMetadata(bulletinId: string) {
  return useQuery({
    queryKey: ["news-bulletin-metadata", bulletinId],
    queryFn: () => fetchNewsBulletinMetadata(bulletinId),
    enabled: !!bulletinId,
  });
}
