import { useQuery } from "@tanstack/react-query";
import { fetchSourceById } from "../api/sourcesApi";

export function useSourceDetail(sourceId: string | null) {
  return useQuery({
    queryKey: ["sources", sourceId],
    queryFn: () => fetchSourceById(sourceId!),
    enabled: !!sourceId,
  });
}
