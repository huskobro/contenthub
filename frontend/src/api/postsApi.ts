/**
 * Posts API — Faz 9.
 *
 * Platform post (community post, share post, etc.) management.
 */

import { api } from "./client";

const BASE = "/api/v1/posts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformPost {
  id: string;
  platform: string;
  platform_connection_id: string | null;
  channel_profile_id: string | null;
  content_project_id: string | null;
  publish_record_id: string | null;
  external_post_id: string | null;
  post_type: string;
  title: string | null;
  body: string;
  status: "draft" | "queued" | "posted" | "failed";
  scheduled_for: string | null;
  posted_at: string | null;
  delivery_status: string;
  delivery_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostSubmitResult {
  success: boolean;
  delivery_status: string;
  engagement_task_id: string | null;
  error: string | null;
}

export interface PostStats {
  total: number;
  draft: number;
  queued: number;
  posted: number;
  failed: number;
}

export interface PostCapability {
  capabilities: Record<string, Record<string, boolean>>;
  note: string;
}

export interface PostListParams {
  channel_profile_id?: string;
  platform?: string;
  status?: string;
  post_type?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchPosts(params?: PostListParams): Promise<PlatformPost[]> {
  return api.get<PlatformPost[]>(BASE, params);
}

export function fetchPost(postId: string): Promise<PlatformPost> {
  return api.get<PlatformPost>(`${BASE}/${postId}`);
}

export function createPost(data: {
  platform?: string;
  channel_profile_id?: string;
  platform_connection_id?: string;
  content_project_id?: string;
  publish_record_id?: string;
  post_type?: string;
  title?: string;
  body: string;
}): Promise<PlatformPost> {
  return api.post<PlatformPost>(BASE, data);
}

export function updatePost(
  postId: string,
  data: { title?: string; body?: string },
): Promise<PlatformPost> {
  return api.patch<PlatformPost>(`${BASE}/${postId}`, data);
}

export function submitPost(
  postId: string,
  userId: string,
): Promise<PostSubmitResult> {
  return api.post<PostSubmitResult>(
    `${BASE}/${postId}/submit?user_id=${encodeURIComponent(userId)}`,
  );
}

export function deletePost(postId: string): Promise<void> {
  return api.delete<void>(`${BASE}/${postId}`);
}

export function fetchPostStats(): Promise<PostStats> {
  return api.get<PostStats>(`${BASE}/stats`);
}

export function fetchPostCapability(): Promise<PostCapability> {
  return api.get<PostCapability>(`${BASE}/capability`);
}
