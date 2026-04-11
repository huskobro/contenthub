/**
 * YouTubeVideoManagementSheet — Sprint 2 / Faz YT-VM1.
 *
 * Right-side Sheet that lets the user edit a previously-published YouTube
 * video's metadata, replace the thumbnail, and manage caption tracks.
 *
 * Powered by:
 *   - useUpdateYtVideo         (PUT    /publish/youtube/video/{id})
 *   - useSetYtVideoThumbnail   (POST   /publish/youtube/video/{id}/thumbnail)
 *   - useYtVideoCaptions       (GET    /publish/youtube/video/{id}/captions)
 *   - useUploadYtVideoCaption  (POST   /publish/youtube/video/{id}/captions)
 *   - useDeleteYtVideoCaption  (DELETE /publish/youtube/video/{id}/captions/{cid})
 */

import React, { useEffect, useRef, useState } from "react";
import { Sheet } from "../design-system/Sheet";
import {
  ActionButton,
  FeedbackBanner,
  SectionShell,
} from "../design-system/primitives";
import {
  useDeleteYtVideoCaption,
  useSetYtVideoThumbnail,
  useUpdateYtVideo,
  useUploadYtVideoCaption,
  useYtVideoCaptions,
} from "../../hooks/useYoutubeVideoManagement";
import type { VideoUpdateRequest } from "../../api/youtubeVideoManagementApi";

interface Props {
  open: boolean;
  onClose: () => void;
  connectionId: string | undefined;
  video: {
    video_id: string;
    title: string;
    thumbnail_url?: string | null;
    description?: string | null;
    tags?: string[] | null;
  } | null;
}

const PRIVACY_OPTIONS: Array<{ value: "public" | "unlisted" | "private"; label: string }> = [
  { value: "public", label: "Herkese acik" },
  { value: "unlisted", label: "Liste disi" },
  { value: "private", label: "Ozel" },
];

export function YouTubeVideoManagementSheet({ open, onClose, connectionId, video }: Props) {
  const videoId = video?.video_id;

  // ------ metadata form state ------
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "unlisted" | "private" | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Reset form when sheet opens with a new video
  useEffect(() => {
    if (open && video) {
      setTitle(video.title ?? "");
      setDescription(video.description ?? "");
      setTagsText((video.tags ?? []).join(", "));
      setPrivacy("");
      setCategoryId("");
      setFeedback(null);
    }
  }, [open, video]);

  // ------ hooks ------
  const updateMut = useUpdateYtVideo(connectionId, videoId);
  const thumbMut = useSetYtVideoThumbnail(connectionId, videoId);
  const captionUploadMut = useUploadYtVideoCaption(connectionId, videoId);
  const captionDeleteMut = useDeleteYtVideoCaption(connectionId, videoId);
  const captionsQ = useYtVideoCaptions(connectionId, videoId);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);
  const [captionLang, setCaptionLang] = useState("tr");
  const [captionName, setCaptionName] = useState("");
  const [captionDraft, setCaptionDraft] = useState(false);

  // ------ handlers ------
  async function handleSaveMetadata() {
    if (!connectionId || !videoId) return;
    const patch: VideoUpdateRequest = {};
    if (title.trim() !== (video?.title ?? "")) patch.title = title.trim();
    if (description !== (video?.description ?? "")) patch.description = description;
    const newTags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const oldTags = video?.tags ?? [];
    if (JSON.stringify(newTags) !== JSON.stringify(oldTags)) patch.tags = newTags;
    if (privacy) patch.privacy_status = privacy;
    if (categoryId.trim()) patch.category_id = categoryId.trim();

    if (Object.keys(patch).length === 0) {
      setFeedback({ type: "success", msg: "Degisiklik yok." });
      return;
    }
    try {
      const res = await updateMut.mutateAsync(patch);
      setFeedback({
        type: "success",
        msg: `Guncellendi: ${res.updated_fields.join(", ") || "(yok)"}`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        msg: `Guncelleme hatasi: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function handleThumbnailPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await thumbMut.mutateAsync(file);
      setFeedback({ type: "success", msg: "Thumbnail guncellendi." });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        msg: `Thumbnail yukleme hatasi: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  }

  async function handleCaptionPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!captionLang.trim()) {
      setFeedback({ type: "error", msg: "Dil kodu gerekli (ornek: tr, en, en-US)." });
      if (captionInputRef.current) captionInputRef.current.value = "";
      return;
    }
    try {
      await captionUploadMut.mutateAsync({
        file,
        language: captionLang.trim(),
        name: captionName.trim() || undefined,
        isDraft: captionDraft,
      });
      setFeedback({ type: "success", msg: "Altyazi yuklendi." });
      setCaptionName("");
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        msg: `Altyazi yukleme hatasi: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      if (captionInputRef.current) captionInputRef.current.value = "";
    }
  }

  async function handleCaptionDelete(captionId: string) {
    if (!window.confirm("Bu altyazi silinsin mi?")) return;
    try {
      await captionDeleteMut.mutateAsync(captionId);
      setFeedback({ type: "success", msg: "Altyazi silindi." });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        msg: `Altyazi silme hatasi: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // ------ render ------
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Video Yonetimi"
      width="560px"
      testId="yt-video-mgmt-sheet"
    >
      {!video || !connectionId ? (
        <FeedbackBanner type="error" message="Video veya YouTube baglantisi secilmedi." />
      ) : (
        <div className="flex flex-col gap-4">
          {feedback && (
            <FeedbackBanner type={feedback.type} message={feedback.msg} />
          )}

          {/* Metadata */}
          <SectionShell
            title="Metadata"
            description="Baslik, aciklama, etiketler ve gizlilik durumu."
          >
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-700">Baslik</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="px-3 py-2 rounded-md border border-neutral-300 bg-surface-base"
                  data-testid="yt-vm-title"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-700">Aciklama</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  className="px-3 py-2 rounded-md border border-neutral-300 bg-surface-base font-mono text-xs"
                  data-testid="yt-vm-description"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-700">
                  Etiketler (virgulle ayrilmis)
                </span>
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className="px-3 py-2 rounded-md border border-neutral-300 bg-surface-base"
                  data-testid="yt-vm-tags"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-neutral-700">Gizlilik</span>
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as typeof privacy)}
                    className="px-3 py-2 rounded-md border border-neutral-300 bg-surface-base"
                    data-testid="yt-vm-privacy"
                  >
                    <option value="">(Degistirme)</option>
                    {PRIVACY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-neutral-700">Kategori ID</span>
                  <input
                    type="text"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    placeholder="orn. 22"
                    className="px-3 py-2 rounded-md border border-neutral-300 bg-surface-base"
                    data-testid="yt-vm-category"
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <ActionButton
                  variant="primary"
                  loading={updateMut.isPending}
                  onClick={handleSaveMetadata}
                  data-testid="yt-vm-save-metadata"
                >
                  Metadata Kaydet
                </ActionButton>
              </div>
            </div>
          </SectionShell>

          {/* Thumbnail */}
          <SectionShell
            title="Thumbnail"
            description="JPEG/PNG, max 2 MB, 16:9 onerilir."
          >
            <div className="flex items-center gap-4">
              {video.thumbnail_url && (
                <img
                  src={video.thumbnail_url}
                  alt="Mevcut thumbnail"
                  className="w-32 h-20 object-cover rounded-md border border-neutral-200"
                />
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleThumbnailPick}
                  data-testid="yt-vm-thumbnail-input"
                />
                {thumbMut.isPending && (
                  <span className="text-xs text-neutral-500">Yukleniyor...</span>
                )}
              </div>
            </div>
          </SectionShell>

          {/* Captions */}
          <SectionShell
            title="Altyazilar"
            description="SRT, VTT veya SBV. Max 5 MB."
          >
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-neutral-700">Dil kodu</span>
                  <input
                    type="text"
                    value={captionLang}
                    onChange={(e) => setCaptionLang(e.target.value)}
                    placeholder="tr"
                    className="px-2 py-1.5 rounded-md border border-neutral-300 bg-surface-base"
                    data-testid="yt-vm-caption-lang"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-neutral-700">Ad (opsiyonel)</span>
                  <input
                    type="text"
                    value={captionName}
                    onChange={(e) => setCaptionName(e.target.value)}
                    placeholder="Default"
                    className="px-2 py-1.5 rounded-md border border-neutral-300 bg-surface-base"
                    data-testid="yt-vm-caption-name"
                  />
                </label>
                <label className="flex items-end gap-2 text-xs pb-1.5">
                  <input
                    type="checkbox"
                    checked={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.checked)}
                    data-testid="yt-vm-caption-draft"
                  />
                  <span>Taslak</span>
                </label>
              </div>
              <input
                ref={captionInputRef}
                type="file"
                accept=".srt,.vtt,.sbv"
                onChange={handleCaptionPick}
                data-testid="yt-vm-caption-input"
              />
              {captionUploadMut.isPending && (
                <span className="text-xs text-neutral-500">Yukleniyor...</span>
              )}

              <div className="border-t border-neutral-200 pt-3">
                <div className="text-xs font-medium text-neutral-700 mb-2">
                  Mevcut altyazilar
                </div>
                {captionsQ.isLoading ? (
                  <span className="text-xs text-neutral-500">Yukleniyor...</span>
                ) : captionsQ.isError ? (
                  <span className="text-xs text-danger-600">
                    Hata: {String((captionsQ.error as Error)?.message ?? "")}
                  </span>
                ) : !captionsQ.data || captionsQ.data.captions.length === 0 ? (
                  <span className="text-xs text-neutral-500">Altyazi yok.</span>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {captionsQ.data.captions.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-neutral-200 text-xs"
                      >
                        <span className="flex-1 truncate">
                          <span className="font-mono text-neutral-700">{c.language}</span>{" "}
                          {c.name && <span className="text-neutral-600">· {c.name}</span>}{" "}
                          {c.is_auto && (
                            <span className="text-neutral-500">(otomatik)</span>
                          )}
                          {c.is_draft && (
                            <span className="text-warning-600">(taslak)</span>
                          )}
                        </span>
                        {!c.is_auto && (
                          <button
                            type="button"
                            onClick={() => handleCaptionDelete(c.id)}
                            disabled={captionDeleteMut.isPending}
                            className="text-danger-600 hover:text-danger-800 text-xs font-medium"
                            data-testid={`yt-vm-caption-delete-${c.id}`}
                          >
                            Sil
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </SectionShell>
        </div>
      )}
    </Sheet>
  );
}
