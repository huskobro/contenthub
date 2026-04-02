import { useQuery } from "@tanstack/react-query";
import { fetchNewsBulletins } from "../api/newsBulletinApi";

export function useNewsBulletinsList() {
  return useQuery({
    queryKey: ["news-bulletins"],
    queryFn: fetchNewsBulletins,
  });
}
