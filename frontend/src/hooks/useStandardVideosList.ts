import { useQuery } from "@tanstack/react-query";
import { fetchStandardVideos, StandardVideoListParams } from "../api/standardVideoApi";

export function useStandardVideosList(params?: StandardVideoListParams) {
  return useQuery({
    queryKey: ["standard-videos", params?.status ?? ""],
    queryFn: () => fetchStandardVideos(params),
  });
}
