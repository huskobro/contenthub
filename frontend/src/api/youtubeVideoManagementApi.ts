import { api } from "./client";

/**
 * YouTube Video Management API client — Sprint 2 / Faz YT-VM1.
 *
 * Wraps /api/v1/publish/youtube/video/* endpoints exposed by
 * video_management_router.py. Covers videos.update (whitelisted),
 * thumbnails.set, captions.list / insert / delete.
 *
 * All endpoints require a YouTube `connection_id` query parameter
 * (PlatformConnection.id).
 */

const BASE = "/api/v1/publish/youtube/video";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoUpdateRequest {
  title?: string;
  description?: string;
  tags?: string[];
  category_id?: string;
  privacy_status?: "public" | "unlisted" | "private";
  made_for_kids?: boolean;
  embeddable?: boolean;
  public_stats_viewable?: boolean;
}

export interface VideoUpdateResponse {
  status: "ok" | "noop";
  video_id: string;
  updated_fields: string[];
  message: string;
}

export interface ThumbnailSetResponse {
  status: "ok";
  video_id: string;
  thumbnail_urls: Record<string, unknown>;
  message: string;
}

export interface CaptionRow {
  id: string;
  language: string;
  name: string;
  is_draft: boolean;
  is_auto: boolean;
  last_updated?: string | null;
}

export interface CaptionListResponse {
  video_id: string;
  captions: CaptionRow[];
}

export interface CaptionUploadResponse {
  status: "ok";
  caption_id: string;
  language: string;
  name: string;
  message: string;
}

export interface CaptionDeleteResponse {
  status: "ok";
  caption_id: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withConn(path: string, connectionId: string): string {
  return `${path}?connection_id=${encodeURIComponent(connectionId)}`;
}

// ---------------------------------------------------------------------------
// videos.update (PUT /video/{video_id})
// ---------------------------------------------------------------------------

export function updateYoutubeVideo(
  connectionId: string,
  videoId: string,
  patch: VideoUpdateRequest,
): Promise<VideoUpdateResponse> {
  return api.put<VideoUpdateResponse>(
    withConn(`${BASE}/${encodeURIComponent(videoId)}`, connectionId),
    patch,
  );
}

// ---------------------------------------------------------------------------
// thumbnails.set (POST /video/{video_id}/thumbnail, multipart)
// ---------------------------------------------------------------------------

export function setYoutubeVideoThumbnail(
  connectionId: string,
  videoId: string,
  file: File,
): Promise<ThumbnailSetResponse> {
  const fd = new FormData();
  fd.append("file", file);
  return api.upload<ThumbnailSetResponse>(
    withConn(`${BASE}/${encodeURIComponent(videoId)}/thumbnail`, connectionId),
    fd,
  );
}

// ---------------------------------------------------------------------------
// captions.list / insert / delete
// ---------------------------------------------------------------------------

export function listYoutubeVideoCaptions(
  connectionId: string,
  videoId: string,
): Promise<CaptionListResponse> {
  return api.get<CaptionListResponse>(
    withConn(`${BASE}/${encodeURIComponent(videoId)}/captions`, connectionId),
  );
}

export function uploadYoutubeVideoCaption(
  connectionId: string,
  videoId: string,
  opts: {
    file: File;
    language: string;
    name?: string;
    isDraft?: boolean;
  },
): Promise<CaptionUploadResponse> {
  const fd = new FormData();
  fd.append("file", opts.file);
  fd.append("language", opts.language);
  fd.append("name", opts.name ?? "");
  fd.append("is_draft", opts.isDraft ? "true" : "false");
  return api.upload<CaptionUploadResponse>(
    withConn(`${BASE}/${encodeURIComponent(videoId)}/captions`, connectionId),
    fd,
  );
}

export function deleteYoutubeVideoCaption(
  connectionId: string,
  videoId: string,
  captionId: string,
): Promise<CaptionDeleteResponse> {
  return api.delete<CaptionDeleteResponse>(
    withConn(
      `${BASE}/${encodeURIComponent(videoId)}/captions/${encodeURIComponent(captionId)}`,
      connectionId,
    ),
  );
}
