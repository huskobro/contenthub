import { useQuery } from "@tanstack/react-query";
import { fetchNewsBulletinScript } from "../api/newsBulletinApi";

export function useNewsBulletinScript(bulletinId: string | null) {
  return useQuery({
    queryKey: ["news-bulletin-script", bulletinId],
    queryFn: () => fetchNewsBulletinScript(bulletinId!),
    enabled: !!bulletinId,
  });
}
