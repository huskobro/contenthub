import { useQuery } from "@tanstack/react-query";
import { fetchStandardVideos } from "../api/standardVideoApi";

export function useStandardVideosList() {
  return useQuery({
    queryKey: ["standard-videos"],
    queryFn: fetchStandardVideos,
  });
}
