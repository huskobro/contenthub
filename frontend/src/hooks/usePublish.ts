import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bulkApprovePublishRecords,
  bulkCancelPublishRecords,
  bulkRejectPublishRecords,
  bulkRetryPublishRecords,
  cancelPublish,
  createPublishRecordFromJob,
  fetchConnectionTokenStatus,
  fetchPublishLogs,
  fetchPublishRecord,
  fetchPublishRecords,
  fetchPublishRecordsByProject,
  fetchSchedulerHealth,
  patchPublishPayload,
  resetToDraft,
  retryPublish,
  reviewAction,
  schedulePublish,
  submitForReview,
  triggerPublish,
  type BulkActionBody,
  type BulkRejectBody,
  type PublishFromJobBody,
  type PublishListParams,
} from "../api/publishApi";
import { useApiError } from "./useApiError";
import { useActiveScope } from "./useActiveScope";

const KEY = "publish-records";
const SCHEDULER_KEY = "publish-scheduler-status";
const TOKEN_STATUS_KEY = "publish-connection-token-status";

/**
 * Redesign REV-2 / P0.3a:
 *   `usePublishRecords` artik `useActiveScope()` tuketir.
 *   Query key `[KEY, params, { ownerUserId, isAllUsers }]` formuna alindi.
 *   Admin'in odaklandigi kullanici degisince cache temiz ayrilir.
 *
 *   Fetch param'i:
 *     - user rolu       -> owner_id gecirilmez (backend zorlar)
 *     - admin all       -> owner_id gecirilmez
 *     - admin user focus-> owner_id = scope.ownerUserId
 *   Caller'dan gelen explicit `params.owner_id` degeri overwrite edilmez —
 *   by-project / by-job ozel kullanimlar aynen calisir.
 */
export function usePublishRecords(params: PublishListParams = {}) {
  const scope = useActiveScope();

  const scopedOwnerId =
    params.owner_id ??
    (scope.ownerUserId && scope.role === "admin" ? scope.ownerUserId : undefined);

  const effectiveParams: PublishListParams = {
    ...params,
    ...(scopedOwnerId ? { owner_id: scopedOwnerId } : {}),
  };

  return useQuery({
    queryKey: [
      KEY,
      effectiveParams,
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () => fetchPublishRecords(effectiveParams),
    enabled: scope.isReady,
  });
}

export function usePublishRecord(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => fetchPublishRecord(id!),
    enabled: !!id,
  });
}

export function usePublishLogs(recordId: string | undefined) {
  return useQuery({
    queryKey: [KEY, recordId, "logs"],
    queryFn: () => fetchPublishLogs(recordId!),
    enabled: !!recordId,
  });
}

export function useSubmitForReview() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (recordId: string) => submitForReview(recordId),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useReviewAction() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ recordId, decision, note, rejectionReason }: { recordId: string; decision: "approve" | "reject"; note?: string; rejectionReason?: string }) =>
      reviewAction(recordId, decision, note, rejectionReason),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useTriggerPublish() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ recordId, note }: { recordId: string; note?: string }) =>
      triggerPublish(recordId, note),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useCancelPublish() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ recordId, note }: { recordId: string; note?: string }) =>
      cancelPublish(recordId, note),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useRetryPublish() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ recordId, note }: { recordId: string; note?: string }) =>
      retryPublish(recordId, note),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useResetToDraft() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (recordId: string) => resetToDraft(recordId),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useSchedulePublish() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ recordId, scheduledAt, note }: { recordId: string; scheduledAt: string; note?: string }) =>
      schedulePublish(recordId, scheduledAt, note),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function usePatchPublishPayload() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ recordId, payloadJson }: { recordId: string; payloadJson: string }) =>
      patchPublishPayload(recordId, payloadJson),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useCreatePublishRecordFromJob() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ jobId, body }: { jobId: string; body: PublishFromJobBody }) =>
      createPublishRecordFromJob(jobId, body),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function usePublishRecordForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "by-job", jobId],
    queryFn: () => fetchPublishRecords({ job_id: jobId! }),
    enabled: !!jobId,
  });
}

/**
 * PHASE AD: Returns all publish records linked to a ContentProject.
 * Used by ProjectDetailPage to surface the publish status of the project's
 * jobs without forcing the user to visit /user/publish.
 */
export function usePublishRecordsByProject(
  contentProjectId: string | undefined,
) {
  return useQuery({
    queryKey: [KEY, "by-project", contentProjectId],
    queryFn: () => fetchPublishRecordsByProject(contentProjectId!),
    enabled: !!contentProjectId,
  });
}


// ---------------------------------------------------------------------------
// Gate 4 (Publish Closure) — Bulk actions (Z-1)
// ---------------------------------------------------------------------------
//
// All bulk hooks invalidate the publish-records cache once the request
// resolves. Per-record results are returned as part of the response
// (see BulkActionResponse) so the caller can render partial-fail UX.

export function useBulkApprovePublishRecords() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (body: BulkActionBody) => bulkApprovePublishRecords(body),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useBulkRejectPublishRecords() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (body: BulkRejectBody) => bulkRejectPublishRecords(body),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useBulkCancelPublishRecords() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (body: BulkActionBody) => bulkCancelPublishRecords(body),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useBulkRetryPublishRecords() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (body: BulkActionBody) => bulkRetryPublishRecords(body),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}


// ---------------------------------------------------------------------------
// Gate 4 (Publish Closure) — Scheduler health (Z-3)
// ---------------------------------------------------------------------------

/**
 * Polls scheduler health every 30s. The badge shows whether the scheduler
 * loop is alive (healthy) or stuck (stale). 'unknown' = no tick yet.
 */
export function useSchedulerHealth() {
  return useQuery({
    queryKey: [SCHEDULER_KEY],
    queryFn: fetchSchedulerHealth,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}


// ---------------------------------------------------------------------------
// Gate 4 (Publish Closure) — Token expiry pre-flight (Z-4)
// ---------------------------------------------------------------------------

/**
 * Returns the connection's token expiry status. Cached for 60s — the
 * value rarely changes between page loads, but stale data is harmless
 * (severity is non-blocking unless requires_reauth=true).
 */
export function useConnectionTokenStatus(connectionId: string | undefined) {
  return useQuery({
    queryKey: [TOKEN_STATUS_KEY, connectionId],
    queryFn: () => fetchConnectionTokenStatus(connectionId!),
    enabled: !!connectionId,
    staleTime: 60_000,
  });
}
