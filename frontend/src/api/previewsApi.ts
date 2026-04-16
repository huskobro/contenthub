/**
 * PHASE AA — Preview artifact API client.
 *
 * Backend surface: GET /api/v1/jobs/{id}/previews
 *                  GET /api/v1/jobs/{id}/previews/latest
 *
 * Download icin ayri bir path YOKTUR — preview dosyalari da mevcut
 * /api/v1/jobs/{id}/artifacts/{path} endpoint'inden servis edilir.
 * Ayni ownership + path-traversal guard uygulanir.
 */
import { api } from "./client";

export type PreviewScope = "preview" | "final";

/** Tek preview / final artifact kaydi — backend PreviewEntry dataclass ile birebir. */
export interface PreviewEntry {
  name: string;
  /** Relative path, ornek: 'artifacts/preview_mini.mp4' */
  path: string;
  /** Dosya uzantisi (UI kolayligi icin), ornek: 'mp4' */
  type: string;
  /** 'preview' | 'final' */
  scope: PreviewScope;
  /** ArtifactKind string degeri (VIDEO_RENDER, THUMBNAIL, AUDIO, ...). */
  kind: string;
  /** Dosya adindan turetilen mantiksal adim, ornek: 'preview_mini'. */
  source_step: string | null;
  /** UI icin okunabilir etiket, ornek: 'Mini preview'. */
  label: string | null;
  size_bytes: number | null;
  /** Unix epoch seconds (float). */
  modified_at_epoch: number | null;
}

export interface PreviewListing {
  job_id: string;
  total: number;
  preview_count: number;
  final_count: number;
  entries: PreviewEntry[];
}

const BASE_URL = "/api/v1/jobs";

/**
 * Job icin preview + final artifact listesi.
 * scope parametresi verilirse yalnizca o scope'taki kayitlar donulur.
 */
export function fetchJobPreviews(
  jobId: string,
  scope?: PreviewScope,
): Promise<PreviewListing> {
  const params = scope ? { scope } : undefined;
  return api.get<PreviewListing>(`${BASE_URL}/${jobId}/previews`, params);
}

/**
 * Job icin en son PREVIEW kaydi (mtime'a gore). Yoksa null doner.
 */
export function fetchLatestJobPreview(
  jobId: string,
): Promise<PreviewEntry | null> {
  return api.getOrNull<PreviewEntry>(`${BASE_URL}/${jobId}/previews/latest`);
}

/**
 * Dosya indirme yolu (preview veya final). PHASE AA parallel bir serve yolu
 * kurmaz — mevcut /jobs/{id}/artifacts/{path} endpoint'i kullanilir.
 */
export function buildArtifactDownloadUrl(jobId: string, entry: PreviewEntry): string {
  // entry.path ornek: 'artifacts/preview_mini.mp4'
  // Sunucu kontrati: /api/v1/jobs/{id}/artifacts/{path}
  return `${BASE_URL}/${jobId}/${entry.path}`;
}
