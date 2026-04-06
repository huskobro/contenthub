import { useQuery } from "@tanstack/react-query";
import { fetchTemplateImpactMetrics, type AnalyticsWindow } from "../api/analyticsApi";

export function useTemplateImpact(window: AnalyticsWindow) {
  return useQuery({
    queryKey: ["analytics", "template-impact", window],
    queryFn: () => fetchTemplateImpactMetrics(window),
    staleTime: 30_000,
  });
}
