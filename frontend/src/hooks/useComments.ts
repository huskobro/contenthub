/**
 * useComments — React Query hooks for comment management — Faz 7.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchComments,
  fetchComment,
  syncVideoComments,
  replyToComment,
  fetchSyncStatus,
  type CommentListParams,
} from "../api/commentsApi";
import { useApiError } from "./useApiError";

const COMMENTS_KEY = "comments";
const SYNC_STATUS_KEY = "comments-sync-status";

export function useComments(params?: CommentListParams) {
  return useQuery({
    queryKey: [COMMENTS_KEY, params],
    queryFn: () => fetchComments(params),
    staleTime: 30_000,
  });
}

export function useComment(commentId: string | null) {
  return useQuery({
    queryKey: [COMMENTS_KEY, "detail", commentId],
    queryFn: () => fetchComment(commentId!),
    enabled: !!commentId,
    staleTime: 30_000,
  });
}

export function useSyncComments() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ videoId, platformConnectionId }: { videoId: string; platformConnectionId?: string }) =>
      syncVideoComments(videoId, platformConnectionId),
    onError,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMMENTS_KEY] });
      qc.invalidateQueries({ queryKey: [SYNC_STATUS_KEY] });
    },
  });
}

export function useReplyToComment() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ commentId, replyText, userId }: { commentId: string; replyText: string; userId: string }) =>
      replyToComment(commentId, replyText, userId),
    onError,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMMENTS_KEY] });
    },
  });
}

export function useSyncStatus() {
  return useQuery({
    queryKey: [SYNC_STATUS_KEY],
    queryFn: fetchSyncStatus,
    staleTime: 60_000,
  });
}
