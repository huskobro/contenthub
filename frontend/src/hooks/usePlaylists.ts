/**
 * usePlaylists — React Query hooks for playlist management — Faz 8.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPlaylists,
  fetchPlaylist,
  fetchPlaylistItems,
  syncPlaylists,
  syncPlaylistItems,
  createPlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  fetchPlaylistSyncStatus,
  type PlaylistListParams,
} from "../api/playlistsApi";

const PLAYLISTS_KEY = "playlists";
const PLAYLIST_ITEMS_KEY = "playlist-items";
const PLAYLIST_SYNC_STATUS_KEY = "playlist-sync-status";

export function usePlaylists(params?: PlaylistListParams) {
  return useQuery({
    queryKey: [PLAYLISTS_KEY, params],
    queryFn: () => fetchPlaylists(params),
    staleTime: 30_000,
  });
}

export function usePlaylist(playlistId: string | null) {
  return useQuery({
    queryKey: [PLAYLISTS_KEY, "detail", playlistId],
    queryFn: () => fetchPlaylist(playlistId!),
    enabled: !!playlistId,
    staleTime: 30_000,
  });
}

export function usePlaylistItems(playlistId: string | null) {
  return useQuery({
    queryKey: [PLAYLIST_ITEMS_KEY, playlistId],
    queryFn: () => fetchPlaylistItems(playlistId!),
    enabled: !!playlistId,
    staleTime: 30_000,
  });
}

export function useSyncPlaylists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ platformConnectionId, channelProfileId }: { platformConnectionId?: string; channelProfileId?: string }) =>
      syncPlaylists(platformConnectionId, channelProfileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PLAYLISTS_KEY] });
      qc.invalidateQueries({ queryKey: [PLAYLIST_SYNC_STATUS_KEY] });
    },
  });
}

export function useSyncPlaylistItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playlistId: string) => syncPlaylistItems(playlistId),
    onSuccess: (_data, playlistId) => {
      qc.invalidateQueries({ queryKey: [PLAYLIST_ITEMS_KEY, playlistId] });
      qc.invalidateQueries({ queryKey: [PLAYLISTS_KEY] });
    },
  });
}

export function useCreatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      title,
      description,
      privacyStatus,
      channelProfileId,
      platformConnectionId,
    }: {
      title: string;
      description?: string;
      privacyStatus?: string;
      channelProfileId?: string;
      platformConnectionId?: string;
    }) => createPlaylist(title, description, privacyStatus, channelProfileId, platformConnectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PLAYLISTS_KEY] });
    },
  });
}

export function useAddVideoToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      playlistId,
      videoId,
      userId,
      contentProjectId,
      publishRecordId,
    }: {
      playlistId: string;
      videoId: string;
      userId: string;
      contentProjectId?: string;
      publishRecordId?: string;
    }) => addVideoToPlaylist(playlistId, videoId, userId, contentProjectId, publishRecordId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PLAYLISTS_KEY] });
      qc.invalidateQueries({ queryKey: [PLAYLIST_ITEMS_KEY] });
    },
  });
}

export function useRemoveVideoFromPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playlistId, externalPlaylistItemId }: { playlistId: string; externalPlaylistItemId: string }) =>
      removeVideoFromPlaylist(playlistId, externalPlaylistItemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PLAYLISTS_KEY] });
      qc.invalidateQueries({ queryKey: [PLAYLIST_ITEMS_KEY] });
    },
  });
}

export function usePlaylistSyncStatus() {
  return useQuery({
    queryKey: [PLAYLIST_SYNC_STATUS_KEY],
    queryFn: fetchPlaylistSyncStatus,
    staleTime: 60_000,
  });
}
