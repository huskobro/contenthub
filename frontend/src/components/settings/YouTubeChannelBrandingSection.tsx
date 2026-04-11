/**
 * YouTubeChannelBrandingSection — Sprint 3 / Faz YT-EA1.
 *
 * Lets admins edit the connected YouTube channel's brandingSettings
 * (title, description, keywords, featured channels, unsubscribed trailer).
 *
 * Backed by:
 *   - PUT /api/v1/publish/youtube/channel/branding   (engagement_advanced_router)
 *
 * The hook `useYouTubeStatus()` provides the active `connection_id`.
 */

import { useEffect, useState } from "react";
import { useYouTubeStatus, useYouTubeChannelInfo } from "../../hooks/useCredentials";
import { useUpdateYtChannelBranding } from "../../hooks/useYoutubeEngagementAdvanced";
import type { ChannelBrandingRequest } from "../../api/youtubeEngagementAdvancedApi";
import {
  SectionShell,
  ActionButton,
  FeedbackBanner,
} from "../design-system/primitives";

export function YouTubeChannelBrandingSection() {
  const { data: status } = useYouTubeStatus();
  const { data: channelInfo } = useYouTubeChannelInfo();
  const connectionId = status?.connection_id ?? undefined;
  const connected = Boolean(status?.has_credentials && status?.scope_ok && connectionId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [featuredChannelsText, setFeaturedChannelsText] = useState("");
  const [unsubscribedTrailer, setUnsubscribedTrailer] = useState("");
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; msg: string } | null
  >(null);

  const mut = useUpdateYtChannelBranding(connectionId);

  // Pre-fill title / description from the existing channel info where
  // possible. (The /channel-info endpoint only exposes a subset of the
  // branding block, so other fields start empty — backend merges the
  // current snippet so empty means "don't touch".)
  useEffect(() => {
    if (channelInfo?.channel_title && !title) {
      setTitle(channelInfo.channel_title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelInfo?.channel_title]);

  async function handleSave() {
    if (!connectionId) return;
    const patch: ChannelBrandingRequest = {};
    if (title.trim()) patch.title = title.trim();
    if (description.trim()) patch.description = description;
    if (keywords.trim()) patch.keywords = keywords.trim();
    const featured = featuredChannelsText
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (featured.length > 0) patch.featured_channels = featured;
    if (unsubscribedTrailer.trim()) patch.unsubscribed_trailer_video_id = unsubscribedTrailer.trim();

    if (Object.keys(patch).length === 0) {
      setFeedback({ type: "error", msg: "En az bir alan doldurun." });
      return;
    }
    try {
      const res = await mut.mutateAsync(patch);
      setFeedback({
        type: "success",
        msg: `Kanal marka ayarlari guncellendi: ${res.updated_fields.join(", ") || "(yok)"}`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        msg: `Guncelleme hatasi: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  if (!connected) {
    return (
      <SectionShell
        title="YouTube Kanal Marka Ayarlari"
        description="Kanal baglandiktan sonra duzenlenebilir."
        testId="yt-channel-branding-section"
      >
        <FeedbackBanner
          type="error"
          message="Bu bolum icin once YouTube OAuth baglantisini tamamlayin."
        />
      </SectionShell>
    );
  }

  return (
    <SectionShell
      title="YouTube Kanal Marka Ayarlari"
      description="Baslik, aciklama, anahtar kelimeler, one cikan kanallar ve tanitim videosu."
      testId="yt-channel-branding-section"
    >
      {feedback && <FeedbackBanner type={feedback.type} message={feedback.msg} />}
      <div className="flex flex-col gap-3 mt-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Kanal Basligi</span>
          <input
            type="text"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 rounded-md border border-border-default bg-surface-page"
            data-testid="yt-branding-title"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Kanal Aciklamasi</span>
          <textarea
            value={description}
            maxLength={1000}
            rows={4}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 rounded-md border border-border-default bg-surface-page font-mono text-xs"
            data-testid="yt-branding-description"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Anahtar Kelimeler</span>
          <input
            type="text"
            value={keywords}
            maxLength={500}
            placeholder="bosluk veya virgul ile ayirin"
            onChange={(e) => setKeywords(e.target.value)}
            className="px-3 py-2 rounded-md border border-border-default bg-surface-page"
            data-testid="yt-branding-keywords"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">One Cikan Kanallar (kanal ID listesi)</span>
          <textarea
            value={featuredChannelsText}
            placeholder="UCabc123,UCxyz456"
            rows={2}
            onChange={(e) => setFeaturedChannelsText(e.target.value)}
            className="px-3 py-2 rounded-md border border-border-default bg-surface-page font-mono text-xs"
            data-testid="yt-branding-featured-channels"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">
            Abone Olmayanlara Gosterilecek Tanitim Videosu (video ID)
          </span>
          <input
            type="text"
            value={unsubscribedTrailer}
            placeholder="orn. dQw4w9WgXcQ"
            onChange={(e) => setUnsubscribedTrailer(e.target.value)}
            className="px-3 py-2 rounded-md border border-border-default bg-surface-page"
            data-testid="yt-branding-trailer"
          />
        </label>
        <div className="flex justify-end">
          <ActionButton
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={mut.isPending}
            data-testid="yt-branding-save"
          >
            Kaydet
          </ActionButton>
        </div>
      </div>
    </SectionShell>
  );
}
