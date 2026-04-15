import { useQuery } from "@tanstack/react-query";
import { fetchSourceScans, type SourceScanResponse } from "../api/sourceScansApi";

/**
 * useSourceScansList — Gate Sources Closure sonrasi backend
 * ``/source-scans`` artik ``{items,total,offset,limit}`` envelope'u doner.
 * Bu hook sadece ``items`` dizisini cikarir; mevcut consumer'lar degismez.
 */
export function useSourceScansList(params?: {
  source_id?: string;
  status?: string;
  scan_mode?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<SourceScanResponse[]>({
    queryKey: ["source-scans", params ?? {}],
    queryFn: async () => {
      const resp = await fetchSourceScans(params);
      return resp.items;
    },
  });
}

export function useSourceScansListPaginated(params?: {
  source_id?: string;
  status?: string;
  scan_mode?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["source-scans", "paginated", params ?? {}],
    queryFn: () => fetchSourceScans(params),
  });
}
