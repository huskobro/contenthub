import { useQuery } from "@tanstack/react-query";
import { fetchNewsBulletins, NewsBulletinListParams } from "../api/newsBulletinApi";

export function useNewsBulletinsList(params?: NewsBulletinListParams) {
  return useQuery({
    queryKey: ["news-bulletins", params?.status ?? "", params?.search ?? "", params?.limit ?? 100, params?.offset ?? 0],
    queryFn: () => fetchNewsBulletins(params),
  });
}
