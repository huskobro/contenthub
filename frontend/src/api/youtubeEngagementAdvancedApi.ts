import { api } from "./client";

/**
 * YouTube Engagement Advanced API client — Sprint 3.
 *
 * Wraps /api/v1/publish/youtube endpoints exposed by
 * engagement_advanced_router.py. Covers:
 *   - comments.setModerationStatus + comments.markAsSpam
 *   - playlists.update + playlists.delete + playlistItems.update (reorder)
 *   - channels.update brandingSettings
 *
 * All endpoints require a YouTube `connection_id` query parameter
 * (PlatformConnection.id).
 */

const BASE = "/api/v1/publish/youtube";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withConn(path: string, connectionId: string): string {
  return `${path}?connection_id=${encodeURIComponent(connectionId)}`;
}

// ---------------------------------------------------------------------------
// 1) Comment moderation
// ---------------------------------------------------------------------------

export type CommentModerationStatus = "heldForReview" | "published" | "rejected";

export interface CommentModerationRequest {
  external_comment_ids: string[];
  moderation_status: CommentModerationStatus;
  ban_author?: boolean;
}

export interface CommentModerationResponse {
  status: string;
  moderated_count: number;
  moderation_status: string;
  message: string;
}

export function setYoutubeCommentModeration(
  connectionId: string,
  body: CommentModerationRequest,
): Promise<CommentModerationResponse> {
  return api.post<CommentModerationResponse>(
    withConn(`${BASE}/comments/moderation`, connectionId),
    body,
  );
}

export interface CommentSpamRequest {
  external_comment_ids: string[];
}

export interface CommentSpamResponse {
  status: string;
  marked_count: number;
  message: string;
}

export function markYoutubeCommentsAsSpam(
  connectionId: string,
  body: CommentSpamRequest,
): Promise<CommentSpamResponse> {
  return api.post<CommentSpamResponse>(
    withConn(`${BASE}/comments/spam`, connectionId),
    body,
  );
}

// ---------------------------------------------------------------------------
// 2) Playlist advanced
// ---------------------------------------------------------------------------

export interface PlaylistUpdateRequest {
  title?: string;
  description?: string;
  privacy_status?: "public" | "unlisted" | "private";
}

export interface PlaylistUpdateResponse {
  status: string;
  external_playlist_id: string;
  updated_fields: string[];
  message: string;
}

export function updateYoutubePlaylist(
  connectionId: string,
  externalPlaylistId: string,
  patch: PlaylistUpdateRequest,
): Promise<PlaylistUpdateResponse> {
  return api.put<PlaylistUpdateResponse>(
    withConn(
      `${BASE}/playlists/${encodeURIComponent(externalPlaylistId)}`,
      connectionId,
    ),
    patch,
  );
}

export interface PlaylistDeleteResponse {
  status: string;
  external_playlist_id: string;
  message: string;
}

export function deleteYoutubePlaylist(
  connectionId: string,
  externalPlaylistId: string,
): Promise<PlaylistDeleteResponse> {
  return api.delete<PlaylistDeleteResponse>(
    withConn(
      `${BASE}/playlists/${encodeURIComponent(externalPlaylistId)}`,
      connectionId,
    ),
  );
}

export interface PlaylistItemReorderRequest {
  external_playlist_id: string;
  external_video_id: string;
  position: number;
}

export interface PlaylistItemReorderResponse {
  status: string;
  external_item_id: string;
  position: number;
  message: string;
}

export function reorderYoutubePlaylistItem(
  connectionId: string,
  body: PlaylistItemReorderRequest,
): Promise<PlaylistItemReorderResponse> {
  return api.post<PlaylistItemReorderResponse>(
    withConn(`${BASE}/playlist-items/position`, connectionId),
    body,
  );
}

// ---------------------------------------------------------------------------
// 3) Channel branding
// ---------------------------------------------------------------------------

export interface ChannelBrandingRequest {
  title?: string;
  description?: string;
  keywords?: string;
  featured_channels?: string[];
  unsubscribed_trailer_video_id?: string;
}

export interface ChannelBrandingResponse {
  status: string;
  channel_id: string;
  updated_fields: string[];
  message: string;
}

export function updateYoutubeChannelBranding(
  connectionId: string,
  body: ChannelBrandingRequest,
): Promise<ChannelBrandingResponse> {
  return api.put<ChannelBrandingResponse>(
    withConn(`${BASE}/channel/branding`, connectionId),
    body,
  );
}
