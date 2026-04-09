import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSourceScan } from "../api/sourceScansApi";
import type { SourceScanCreatePayload } from "../api/sourceScansApi";
import { useApiError } from "./useApiError";

export function useCreateSourceScan() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (payload: SourceScanCreatePayload) => createSourceScan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source-scans"] });
    },
    onError,
  });
}
