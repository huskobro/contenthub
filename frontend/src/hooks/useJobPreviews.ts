/**
 * PHASE AA — Job preview artifact hook'lari.
 *
 * Ownership + visibility backend'de kontrol edilir. Frontend'de sahte
 * filtreleme yapilmaz; 403/404 dogal olarak hata / empty olarak gelir.
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchJobPreviews,
  fetchLatestJobPreview,
  PreviewListing,
  PreviewEntry,
  PreviewScope,
} from "../api/previewsApi";

/**
 * Job icin preview + final artifact listesi.
 *
 * @param jobId  Job id. null/undefined ise query disabled.
 * @param scope  'preview' | 'final' — bos birakilirsa ikisi birden.
 */
export function useJobPreviews(
  jobId: string | null | undefined,
  scope?: PreviewScope,
) {
  return useQuery<PreviewListing>({
    queryKey: ["job-previews", jobId, scope ?? "all"],
    queryFn: () => fetchJobPreviews(jobId!, scope),
    enabled: !!jobId,
    // Job tamamlandikca preview'lar artabilir; sik refetch gerekmez ama
    // stale de kabul edilebilir — SSE tarafindan invalidate edilir.
    staleTime: 10_000,
  });
}

/**
 * Job icin en son PREVIEW kaydi. Yoksa data === null.
 */
export function useLatestJobPreview(jobId: string | null | undefined) {
  return useQuery<PreviewEntry | null>({
    queryKey: ["job-previews", jobId, "latest"],
    queryFn: () => fetchLatestJobPreview(jobId!),
    enabled: !!jobId,
    staleTime: 10_000,
  });
}
