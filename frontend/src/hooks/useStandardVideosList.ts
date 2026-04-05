import { useQuery } from "@tanstack/react-query";
import { fetchStandardVideos, StandardVideoListParams } from "../api/standardVideoApi";

export function useStandardVideosList(params?: StandardVideoListParams) {
  return useQuery({
    queryKey: [
      "standard-videos",
      params?.status ?? "",
      params?.search ?? "",
      params?.limit ?? 100,
      params?.offset ?? 0,
    ],
    queryFn: () => fetchStandardVideos(params),
  });
}
