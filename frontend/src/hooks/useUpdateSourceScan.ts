import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSourceScan } from "../api/sourceScansApi";
import type { SourceScanUpdatePayload } from "../api/sourceScansApi";

export function useUpdateSourceScan(scanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SourceScanUpdatePayload) => updateSourceScan(scanId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source-scans"] });
      queryClient.invalidateQueries({ queryKey: ["source-scan", scanId] });
    },
  });
}
