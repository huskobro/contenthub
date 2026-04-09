import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPublishRecords,
  fetchPublishRecord,
  fetchPublishLogs,
  submitForReview,
  reviewAction,
  triggerPublish,
  cancelPublish,
  retryPublish,
  resetToDraft,
  schedulePublish,
  patchPublishPayload,
  createPublishRecordFromJob,
  type PublishListParams,
  type PublishFromJobBody,
} from "../api/publishApi";
import { useApiError } from "./useApiError";

const KEY = "publish-records";

export function usePublishRecords(params: PublishListParams = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => fetchPublishRecords(params),
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
