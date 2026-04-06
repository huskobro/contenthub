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
  type PublishListParams,
} from "../api/publishApi";

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
  return useMutation({
    mutationFn: (recordId: string) => submitForReview(recordId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useReviewAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, decision, note }: { recordId: string; decision: "approve" | "reject"; note?: string }) =>
      reviewAction(recordId, decision, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useTriggerPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, note }: { recordId: string; note?: string }) =>
      triggerPublish(recordId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useCancelPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, note }: { recordId: string; note?: string }) =>
      cancelPublish(recordId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useRetryPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, note }: { recordId: string; note?: string }) =>
      retryPublish(recordId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useResetToDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => resetToDraft(recordId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useSchedulePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, scheduledAt, note }: { recordId: string; scheduledAt: string; note?: string }) =>
      schedulePublish(recordId, scheduledAt, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
