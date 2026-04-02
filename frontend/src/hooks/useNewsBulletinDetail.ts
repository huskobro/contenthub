import { useQuery } from "@tanstack/react-query";
import { fetchNewsBulletinById } from "../api/newsBulletinApi";

export function useNewsBulletinDetail(id: string | null) {
  return useQuery({
    queryKey: ["news-bulletins", id],
    queryFn: () => fetchNewsBulletinById(id!),
    enabled: !!id,
  });
}
