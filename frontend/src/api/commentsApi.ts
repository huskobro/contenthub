/**
 * Comments API — Faz 7.
 *
 * YouTube (and future platform) comment sync, listing, and reply.
 */

import { api } from "./client";

const BASE = "/api/v1/comments";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncedComment {
  id: string;
  platform: string;
  platform_connection_id: string | null;
  channel_profile_id: string | null;
  content_project_id: string | null;
  external_comment_id: string;
  external_video_id: string;
  external_parent_id: string | null;
  author_name: string | null;
  author_channel_id: string | null;
  author_avatar_url: string | null;
  text: string;
  published_at: string | null;
  like_count: number;
  reply_count: number;
  is_reply: boolean;
  reply_status: "none" | "pending" | "replied" | "failed";
  our_reply_text: string | null;
  our_reply_at: string | null;
  sync_status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentSyncResult {
  video_id: string;
  total_fetched: number;
  new_comments: number;
  updated_comments: number;
  errors: string[];
}

export interface CommentReplyResult {
  success: boolean;
  engagement_task_id: string | null;
  external_reply_id: string | null;
  error: string | null;
}

export interface SyncStatusItem {
  external_video_id: string;
  comment_count: number;
  last_synced_at: string | null;
}

export interface CommentListParams {
  video_id?: string;
  channel_profile_id?: string;
  platform?: string;
  reply_status?: string;
  is_reply?: boolean;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchComments(
  params?: CommentListParams,
): Promise<SyncedComment[]> {
  return api.get<SyncedComment[]>(BASE, params);
}

export function fetchComment(
  commentId: string,
): Promise<SyncedComment> {
  return api.get<SyncedComment>(`${BASE}/${commentId}`);
}

export function syncVideoComments(
  videoId: string,
  platformConnectionId?: string,
): Promise<CommentSyncResult> {
  return api.post<CommentSyncResult>(`${BASE}/sync`, {
    video_id: videoId,
    platform_connection_id: platformConnectionId,
  });
}

export function replyToComment(
  commentId: string,
  replyText: string,
  userId: string,
): Promise<CommentReplyResult> {
  return api.post<CommentReplyResult>(
    `${BASE}/${commentId}/reply?user_id=${encodeURIComponent(userId)}`,
    { comment_id: commentId, reply_text: replyText },
  );
}

export function fetchSyncStatus(): Promise<SyncStatusItem[]> {
  return api.get<SyncStatusItem[]>(`${BASE}/sync-status`);
}
