import { useQuery } from "@tanstack/react-query";
import { fetchSourceScanById } from "../api/sourceScansApi";

export function useSourceScanDetail(scanId: string | null) {
  return useQuery({
    queryKey: ["source-scans", scanId],
    queryFn: () => fetchSourceScanById(scanId!),
    enabled: !!scanId,
  });
}
