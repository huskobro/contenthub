import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteYoutubePlaylist,
  markYoutubeCommentsAsSpam,
  reorderYoutubePlaylistItem,
  setYoutubeCommentModeration,
  updateYoutubeChannelBranding,
  updateYoutubePlaylist,
  type ChannelBrandingRequest,
  type CommentModerationRequest,
  type CommentSpamRequest,
  type PlaylistItemReorderRequest,
  type PlaylistUpdateRequest,
} from "../api/youtubeEngagementAdvancedApi";

/**
 * React Query hooks for YouTube Engagement Advanced — Sprint 3.
 *
 * All hooks accept a `connectionId` (YouTube PlatformConnection.id).
 * Pass `undefined` and they will throw at mutation time — callers must
 * ensure a connection is picked before calling.
 *
 * Mutations invalidate the adjacent query keys that may be affected:
 *   - comments: ["comments"], ["youtube-comments"]
 *   - playlists: ["playlists"], ["youtube-playlists"]
 *   - branding: ["youtube-channel-info"]
 */

// ---------------------------------------------------------------------------
// Comment moderation
// ---------------------------------------------------------------------------

export function useModerateYtComments(connectionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CommentModerationRequest) =>
      setYoutubeCommentModeration(connectionId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments"] });
      qc.invalidateQueries({ queryKey: ["youtube-comments"] });
    },
  });
}

export function useMarkYtCommentsAsSpam(connectionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CommentSpamRequest) =>
      markYoutubeCommentsAsSpam(connectionId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments"] });
      qc.invalidateQueries({ queryKey: ["youtube-comments"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Playlist advanced
// ---------------------------------------------------------------------------

export function useUpdateYtPlaylist(connectionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { externalPlaylistId: string; patch: PlaylistUpdateRequest }) =>
      updateYoutubePlaylist(connectionId!, opts.externalPlaylistId, opts.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.invalidateQueries({ queryKey: ["youtube-playlists"] });
    },
  });
}

export function useDeleteYtPlaylist(connectionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (externalPlaylistId: string) =>
      deleteYoutubePlaylist(connectionId!, externalPlaylistId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.invalidateQueries({ queryKey: ["youtube-playlists"] });
    },
  });
}

export function useReorderYtPlaylistItem(connectionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlaylistItemReorderRequest) =>
      reorderYoutubePlaylistItem(connectionId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.invalidateQueries({ queryKey: ["youtube-playlists"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Channel branding
// ---------------------------------------------------------------------------

export function useUpdateYtChannelBranding(connectionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChannelBrandingRequest) =>
      updateYoutubeChannelBranding(connectionId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-channel-info"] });
    },
  });
}
