import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSourceScan } from "../api/sourceScansApi";
import type { SourceScanCreatePayload } from "../api/sourceScansApi";

export function useCreateSourceScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SourceScanCreatePayload) => createSourceScan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source-scans"] });
    },
  });
}
