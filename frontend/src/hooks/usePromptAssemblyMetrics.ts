import { useQuery } from "@tanstack/react-query";
import { fetchPromptAssemblyMetrics, PromptAssemblyMetrics, AnalyticsWindow } from "../api/analyticsApi";

export function usePromptAssemblyMetrics(window: AnalyticsWindow = "all_time") {
  return useQuery<PromptAssemblyMetrics>({
    queryKey: ["analytics", "prompt-assembly", window],
    queryFn: () => fetchPromptAssemblyMetrics(window),
    staleTime: 30_000,
  });
}
