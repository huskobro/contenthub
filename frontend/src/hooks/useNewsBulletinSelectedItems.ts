import { useQuery } from "@tanstack/react-query";
import { fetchNewsBulletinSelectedItems } from "../api/newsBulletinApi";

export function useNewsBulletinSelectedItems(bulletinId: string) {
  return useQuery({
    queryKey: ["news-bulletin-selected-items", bulletinId],
    queryFn: () => fetchNewsBulletinSelectedItems(bulletinId),
    enabled: !!bulletinId,
  });
}
