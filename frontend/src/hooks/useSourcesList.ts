import { useQuery } from "@tanstack/react-query";
import { fetchSources } from "../api/sourcesApi";

export function useSourcesList(params?: {
  source_type?: string;
  status?: string;
  scan_mode?: string;
}) {
  return useQuery({
    queryKey: ["sources", params ?? {}],
    queryFn: () => fetchSources(params),
  });
}
