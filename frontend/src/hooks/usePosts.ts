/**
 * usePosts — React Query hooks for post management — Faz 9.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPosts,
  fetchPost,
  createPost,
  updatePost,
  submitPost,
  deletePost,
  fetchPostStats,
  fetchPostCapability,
  type PostListParams,
} from "../api/postsApi";
import { useApiError } from "./useApiError";

const POSTS_KEY = "posts";
const POST_STATS_KEY = "post-stats";
const POST_CAPABILITY_KEY = "post-capability";

export function usePosts(params?: PostListParams) {
  return useQuery({
    queryKey: [POSTS_KEY, params],
    queryFn: () => fetchPosts(params),
    staleTime: 30_000,
  });
}

export function usePost(postId: string | null) {
  return useQuery({
    queryKey: [POSTS_KEY, "detail", postId],
    queryFn: () => fetchPost(postId!),
    enabled: !!postId,
    staleTime: 30_000,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: createPost,
    onError,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [POSTS_KEY] });
      qc.invalidateQueries({ queryKey: [POST_STATS_KEY] });
    },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: { title?: string; body?: string } }) =>
      updatePost(postId, data),
    onError,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [POSTS_KEY] });
    },
  });
}

export function useSubmitPost() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ postId, userId }: { postId: string; userId: string }) =>
      submitPost(postId, userId),
    onError,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [POSTS_KEY] });
      qc.invalidateQueries({ queryKey: [POST_STATS_KEY] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onError,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [POSTS_KEY] });
      qc.invalidateQueries({ queryKey: [POST_STATS_KEY] });
    },
  });
}

export function usePostStats() {
  return useQuery({
    queryKey: [POST_STATS_KEY],
    queryFn: fetchPostStats,
    staleTime: 30_000,
  });
}

export function usePostCapability() {
  return useQuery({
    queryKey: [POST_CAPABILITY_KEY],
    queryFn: fetchPostCapability,
    staleTime: 300_000, // 5 min — rarely changes
  });
}
