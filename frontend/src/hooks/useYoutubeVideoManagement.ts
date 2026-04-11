import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteYoutubeVideoCaption,
  listYoutubeVideoCaptions,
  setYoutubeVideoThumbnail,
  updateYoutubeVideo,
  uploadYoutubeVideoCaption,
  type CaptionListResponse,
  type VideoUpdateRequest,
} from "../api/youtubeVideoManagementApi";

/**
 * React Query hooks for YouTube Video Management — Sprint 2 / Faz YT-VM1.
 *
 * All hooks accept a `connectionId` (YouTube PlatformConnection.id) and a
 * `videoId` (YouTube platform_video_id). Pass `undefined` to the read hook
 * to disable fetching.
 */

const STALE = 30_000;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function useYtVideoCaptions(
  connectionId: string | undefined,
  videoId: string | undefined,
) {
  return useQuery<CaptionListResponse>({
    queryKey: ["yt-video-mgmt", "captions", connectionId, videoId],
    queryFn: () => listYoutubeVideoCaptions(connectionId!, videoId!),
    enabled: Boolean(connectionId && videoId),
    staleTime: STALE,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useUpdateYtVideo(
  connectionId: string | undefined,
  videoId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: VideoUpdateRequest) =>
      updateYoutubeVideo(connectionId!, videoId!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yt-video-mgmt", "captions", connectionId, videoId] });
      // Published video stats / channel video listing may also be stale
      qc.invalidateQueries({ queryKey: ["yt-analytics"] });
      qc.invalidateQueries({ queryKey: ["youtube-channel-videos"] });
    },
  });
}

export function useSetYtVideoThumbnail(
  connectionId: string | undefined,
  videoId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      setYoutubeVideoThumbnail(connectionId!, videoId!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-channel-videos"] });
    },
  });
}

export function useUploadYtVideoCaption(
  connectionId: string | undefined,
  videoId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: {
      file: File;
      language: string;
      name?: string;
      isDraft?: boolean;
    }) => uploadYoutubeVideoCaption(connectionId!, videoId!, opts),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["yt-video-mgmt", "captions", connectionId, videoId],
      });
    },
  });
}

export function useDeleteYtVideoCaption(
  connectionId: string | undefined,
  videoId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (captionId: string) =>
      deleteYoutubeVideoCaption(connectionId!, videoId!, captionId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["yt-video-mgmt", "captions", connectionId, videoId],
      });
    },
  });
}
