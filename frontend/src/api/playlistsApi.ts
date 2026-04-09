/**
 * Playlists API — Faz 8.
 *
 * YouTube (and future platform) playlist sync, CRUD, and item management.
 */

import { api } from "./client";

const BASE = "/api/v1/playlists";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncedPlaylist {
  id: string;
  platform: string;
  platform_connection_id: string | null;
  channel_profile_id: string | null;
  external_playlist_id: string;
  title: string;
  description: string | null;
  privacy_status: string;
  item_count: number;
  thumbnail_url: string | null;
  sync_status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncedPlaylistItem {
  id: string;
  playlist_id: string;
  external_video_id: string;
  external_playlist_item_id: string | null;
  content_project_id: string | null;
  publish_record_id: string | null;
  title: string | null;
  thumbnail_url: string | null;
  position: number;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaylistSyncResult {
  total_fetched: number;
  new_playlists: number;
  updated_playlists: number;
  errors: string[];
}

export interface PlaylistItemSyncResult {
  playlist_id: string;
  total_fetched: number;
  new_items: number;
  updated_items: number;
  errors: string[];
}

export interface PlaylistCreateResult {
  success: boolean;
  playlist_id: string | null;
  external_playlist_id: string | null;
  error: string | null;
}

export interface AddVideoToPlaylistResult {
  success: boolean;
  engagement_task_id: string | null;
  external_playlist_item_id: string | null;
  error: string | null;
}

export interface PlaylistListParams {
  channel_profile_id?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchPlaylists(
  params?: PlaylistListParams,
): Promise<SyncedPlaylist[]> {
  return api.get<SyncedPlaylist[]>(BASE, params);
}

export function fetchPlaylist(
  playlistId: string,
): Promise<SyncedPlaylist> {
  return api.get<SyncedPlaylist>(`${BASE}/${playlistId}`);
}

export function fetchPlaylistItems(
  playlistId: string,
  params?: { limit?: number; offset?: number },
): Promise<SyncedPlaylistItem[]> {
  return api.get<SyncedPlaylistItem[]>(`${BASE}/${playlistId}/items`, params);
}

export function syncPlaylists(
  platformConnectionId?: string,
  channelProfileId?: string,
): Promise<PlaylistSyncResult> {
  return api.post<PlaylistSyncResult>(`${BASE}/sync`, {
    platform_connection_id: platformConnectionId,
    channel_profile_id: channelProfileId,
  });
}

export function syncPlaylistItems(
  playlistId: string,
): Promise<PlaylistItemSyncResult> {
  return api.post<PlaylistItemSyncResult>(`${BASE}/${playlistId}/sync-items`);
}

export function createPlaylist(
  title: string,
  description: string = "",
  privacyStatus: string = "private",
  channelProfileId?: string,
  platformConnectionId?: string,
): Promise<PlaylistCreateResult> {
  return api.post<PlaylistCreateResult>(`${BASE}/create`, {
    title,
    description,
    privacy_status: privacyStatus,
    channel_profile_id: channelProfileId,
    platform_connection_id: platformConnectionId,
  });
}

export function addVideoToPlaylist(
  playlistId: string,
  videoId: string,
  userId: string,
  contentProjectId?: string,
  publishRecordId?: string,
): Promise<AddVideoToPlaylistResult> {
  return api.post<AddVideoToPlaylistResult>(
    `${BASE}/${playlistId}/add-video?user_id=${encodeURIComponent(userId)}`,
    {
      playlist_id: playlistId,
      video_id: videoId,
      content_project_id: contentProjectId,
      publish_record_id: publishRecordId,
    },
  );
}

export function removeVideoFromPlaylist(
  playlistId: string,
  externalPlaylistItemId: string,
): Promise<{ success: boolean; error: string | null }> {
  return api.post<{ success: boolean; error: string | null }>(
    `${BASE}/${playlistId}/remove-video`,
    {
      playlist_id: playlistId,
      external_playlist_item_id: externalPlaylistItemId,
    },
  );
}

export function fetchPlaylistSyncStatus(): Promise<
  Array<{
    id: string;
    title: string;
    external_playlist_id: string;
    item_count: number;
    sync_status: string;
    last_synced_at: string | null;
  }>
> {
  return api.get(`${BASE}/sync-status`);
}
