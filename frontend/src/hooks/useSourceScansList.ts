import { useQuery } from "@tanstack/react-query";
import { fetchSourceScans } from "../api/sourceScansApi";

export function useSourceScansList(params?: {
  source_id?: string;
  status?: string;
  scan_mode?: string;
}) {
  return useQuery({
    queryKey: ["source-scans", params ?? {}],
    queryFn: () => fetchSourceScans(params),
  });
}
