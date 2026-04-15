import { useQuery } from "@tanstack/react-query";
import { fetchSources, type SourceResponse } from "../api/sourcesApi";

/**
 * useSourcesList — Gate Sources Closure sonrasi backend ``/sources`` artik
 * pagination envelope (``{items, total, offset, limit}``) doner.
 *
 * Bu hook envelope'dan sadece ``items`` dizisini cikarir, boylece mevcut
 * tum consumer'lar (SourcesTable, NewsBulletinWizardPage, vb.) bozulmadan
 * calismaya devam eder. Total/offset/limit ihtiyaci olan sayfalar
 * ``useSourcesListPaginated`` kullanabilir.
 */
export function useSourcesList(params?: {
  source_type?: string;
  status?: string;
  scan_mode?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<SourceResponse[]>({
    queryKey: ["sources", params ?? {}],
    queryFn: async () => {
      const resp = await fetchSources(params);
      return resp.items;
    },
  });
}

/**
 * Pagination envelope'unu oldugu gibi geri dondurur — total+limit+offset
 * ile sayfalayan yeni ekranlar icin.
 */
export function useSourcesListPaginated(params?: {
  source_type?: string;
  status?: string;
  scan_mode?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["sources", "paginated", params ?? {}],
    queryFn: () => fetchSources(params),
  });
}
