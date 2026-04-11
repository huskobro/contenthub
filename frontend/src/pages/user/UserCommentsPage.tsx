/**
 * UserCommentsPage — Faz 7D+E.
 *
 * User panel comment management:
 * - Channel/platform/status filters
 * - Comment list with author info, text, like count, reply status
 * - Side panel for detail + manual reply via AssistedComposer
 * - Auto-scoped to authenticated user's channel profiles
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useComments, useReplyToComment, useSyncComments } from "../../hooks/useComments";
import {
  useMarkYtCommentsAsSpam,
  useModerateYtComments,
} from "../../hooks/useYoutubeEngagementAdvanced";
import type { CommentModerationStatus } from "../../api/youtubeEngagementAdvancedApi";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { useAuthStore } from "../../stores/authStore";
import { AssistedComposer } from "../../components/engagement/AssistedComposer";
import { ConnectionCapabilityWarning, useCapabilityStatus } from "../../components/connections/ConnectionCapabilityWarning";
import { useChannelConnection } from "../../hooks/useChannelConnection";
import {
  PageShell,
  SectionShell,
  ActionButton,
  FeedbackBanner,
} from "../../components/design-system/primitives";
import type { SyncedComment, CommentListParams } from "../../api/commentsApi";

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const REPLY_STATUS_OPTIONS = [
  { value: "", label: "Tüm Durumlar" },
  { value: "none", label: "Cevaplanmamış" },
  { value: "pending", label: "Bekliyor" },
  { value: "replied", label: "Cevaplanmış" },
  { value: "failed", label: "Başarısız" },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "Tüm Platformlar" },
  { value: "youtube", label: "YouTube" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa önce`;
  const days = Math.floor(hours / 24);
  return `${days}g önce`;
}

function replyStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "replied":
      return { label: "Cevaplanmış", className: "bg-success-50 text-success-700 border-success-200" };
    case "pending":
      return { label: "Bekliyor", className: "bg-warning-50 text-warning-700 border-warning-200" };
    case "failed":
      return { label: "Başarısız", className: "bg-error-50 text-error-700 border-error-200" };
    default:
      return { label: "Cevaplanmamış", className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserCommentsPage() {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  // Filters
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [replyStatusFilter, setReplyStatusFilter] = useState<string>("");
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

  // Reply state
  const [replyText, setReplyText] = useState("");

  // Fetch user's channel profiles
  const { data: channels } = useQuery({
    queryKey: ["channel-profiles", userId],
    queryFn: () => fetchChannelProfiles(userId || undefined),
    enabled: !!userId,
    staleTime: 60_000,
  });

  // Build comment list params
  const listParams: CommentListParams = useMemo(() => {
    const p: CommentListParams = { limit: 100 };
    if (channelFilter) p.channel_profile_id = channelFilter;
    if (platformFilter) p.platform = platformFilter;
    if (replyStatusFilter) p.reply_status = replyStatusFilter;
    return p;
  }, [channelFilter, platformFilter, replyStatusFilter]);

  const { data: comments, isLoading, isError } = useComments(listParams);
  const replyMutation = useReplyToComment();
  const syncMutation = useSyncComments();

  // --- User parity: bulk YouTube moderation (Sprint 3 parity) -------------
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moderationFeedback, setModerationFeedback] = useState<
    { type: "success" | "error"; msg: string } | null
  >(null);

  const selectedComments = useMemo<SyncedComment[]>(() => {
    if (!comments) return [];
    return comments.filter((c) => selectedIds.has(c.id));
  }, [comments, selectedIds]);

  // All selected comments must share the same platform_connection_id.
  const batchConnectionId = useMemo<string | null>(() => {
    if (selectedComments.length === 0) return null;
    const first = selectedComments[0].platform_connection_id;
    if (!first) return null;
    return selectedComments.every((c) => c.platform_connection_id === first)
      ? first
      : null;
  }, [selectedComments]);

  const onlyYoutubeSelected = useMemo(
    () =>
      selectedComments.length > 0 &&
      selectedComments.every((c) => c.platform === "youtube"),
    [selectedComments],
  );

  const moderateMut = useModerateYtComments(batchConnectionId ?? undefined);
  const spamMut = useMarkYtCommentsAsSpam(batchConnectionId ?? undefined);
  const moderationBusy = moderateMut.isPending || spamMut.isPending;

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function runModeration(
    status: CommentModerationStatus,
    banAuthor = false,
  ) {
    if (!batchConnectionId || selectedComments.length === 0) return;
    const externalIds = selectedComments.map((c) => c.external_comment_id);
    try {
      const res = await moderateMut.mutateAsync({
        external_comment_ids: externalIds,
        moderation_status: status,
        ban_author: banAuthor,
      });
      setModerationFeedback({
        type: "success",
        msg: `${res.moderated_count} yorum '${res.moderation_status}' olarak işaretlendi.`,
      });
      setSelectedIds(new Set());
    } catch (err: unknown) {
      setModerationFeedback({
        type: "error",
        msg: `Moderasyon hatası: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function runMarkAsSpam() {
    if (!batchConnectionId || selectedComments.length === 0) return;
    if (
      !window.confirm(
        `${selectedComments.length} yorum spam olarak işaretlensin mi?`,
      )
    ) {
      return;
    }
    const externalIds = selectedComments.map((c) => c.external_comment_id);
    try {
      const res = await spamMut.mutateAsync({
        external_comment_ids: externalIds,
      });
      setModerationFeedback({
        type: "success",
        msg: `${res.marked_count} yorum spam olarak işaretlendi.`,
      });
      setSelectedIds(new Set());
    } catch (err: unknown) {
      setModerationFeedback({
        type: "error",
        msg: `Spam işaretleme hatası: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Faz 17a: Connection lookup for capability awareness
  const { connectionId: activeConnectionId } = useChannelConnection(channelFilter || undefined);
  const { isBlocked: readBlocked } = useCapabilityStatus(activeConnectionId, "can_read_comments");
  const { isBlocked: replyBlocked } = useCapabilityStatus(activeConnectionId, "can_reply_comments");

  // Selected comment
  const selectedComment = useMemo(() => {
    if (!selectedCommentId || !comments) return null;
    return comments.find((c) => c.id === selectedCommentId) ?? null;
  }, [selectedCommentId, comments]);

  // Handlers
  const handleReply = () => {
    if (!selectedComment || !replyText.trim() || !userId) return;
    replyMutation.mutate(
      { commentId: selectedComment.id, replyText: replyText.trim(), userId },
      {
        onSuccess: (result) => {
          if (result.success) {
            setReplyText("");
          }
        },
      },
    );
  };

  const handleSync = (videoId: string) => {
    syncMutation.mutate({ videoId });
  };

  return (
    <PageShell
      title="Yorumlar"
      subtitle="Kanallarınıza gelen yorumları yönetin ve cevap verin."
      testId="user-comments"
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4" data-testid="comment-filters">
        {/* Channel filter */}
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          data-testid="comment-filter-channel"
        >
          <option value="">Tüm Kanallar</option>
          {channels?.map((ch: ChannelProfileResponse) => (
            <option key={ch.id} value={ch.id}>
              {ch.profile_name}
            </option>
          ))}
        </select>

        {/* Platform filter */}
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          data-testid="comment-filter-platform"
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Reply status filter */}
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={replyStatusFilter}
          onChange={(e) => setReplyStatusFilter(e.target.value)}
          data-testid="comment-filter-reply-status"
        >
          {REPLY_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Faz 17a: Capability warnings */}
      {channelFilter && activeConnectionId && (
        <div className="flex flex-col gap-2 mb-4">
          <ConnectionCapabilityWarning connectionId={activeConnectionId} requiredCapability="can_read_comments" context="user" />
          <ConnectionCapabilityWarning connectionId={activeConnectionId} requiredCapability="can_reply_comments" context="user" />
        </div>
      )}

      {/* User parity: bulk moderation bar (own comments only) */}
      {selectedComments.length > 0 && (
        <SectionShell
          title={`Toplu Moderasyon (${selectedComments.length} seçili)`}
          description="Kendi kanallarınızdaki YouTube yorumlarını toplu olarak moderasyon durumu, spam veya ban aksiyonlarıyla yönetin."
          testId="user-comment-moderation-bar"
        >
          {!onlyYoutubeSelected && (
            <FeedbackBanner
              type="error"
              message="Toplu moderasyon yalnızca YouTube yorumları için destekleniyor. Seçimi daraltın."
            />
          )}
          {onlyYoutubeSelected && !batchConnectionId && (
            <FeedbackBanner
              type="error"
              message="Seçili yorumlar farklı YouTube bağlantılarına ait. Aynı bağlantıya ait yorumları seçin."
            />
          )}
          {moderationFeedback && (
            <FeedbackBanner
              type={moderationFeedback.type}
              message={moderationFeedback.msg}
            />
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => runModeration("heldForReview")}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={moderateMut.isPending}
              data-testid="user-comment-mod-hold"
            >
              İncelemeye Al
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => runModeration("published")}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={moderateMut.isPending}
              data-testid="user-comment-mod-publish"
            >
              Yayınla
            </ActionButton>
            <ActionButton
              variant="danger"
              size="sm"
              onClick={() => runModeration("rejected")}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={moderateMut.isPending}
              data-testid="user-comment-mod-reject"
            >
              Reddet
            </ActionButton>
            <ActionButton
              variant="danger"
              size="sm"
              onClick={() => runModeration("rejected", true)}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={moderateMut.isPending}
              data-testid="user-comment-mod-reject-ban"
            >
              Reddet + Yazarı Engelle
            </ActionButton>
            <ActionButton
              variant="danger"
              size="sm"
              onClick={runMarkAsSpam}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={spamMut.isPending}
              data-testid="user-comment-mod-spam"
            >
              Spam İşaretle
            </ActionButton>
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={moderationBusy}
              data-testid="user-comment-mod-clear"
            >
              Seçimi Temizle
            </ActionButton>
          </div>
        </SectionShell>
      )}

      {/* Loading / Error */}
      {isLoading && (
        <p className="text-sm text-neutral-500 text-center py-8">Yorumlar yükleniyor...</p>
      )}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-error-light flex items-center justify-center mb-3">
            <span className="text-error-base text-xl">!</span>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-1">Yüklenemedi</h3>
          <p className="text-sm text-neutral-500">Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
        </div>
      )}

      {/* Content area: list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Comment list — 3 columns on large */}
        <div className="lg:col-span-3">
          <SectionShell title={`Yorumlar${comments ? ` (${comments.length})` : ""}`} testId="comment-list-section">
            {comments && comments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                  <span className="text-neutral-400 text-xl">&empty;</span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-1">Henüz kayıt yok</h3>
                <p className="text-sm text-neutral-500 max-w-xs">Henüz yorum bulunamadı.</p>
              </div>
            )}
            <div className="flex flex-col gap-1 max-h-[600px] overflow-y-auto">
              {comments?.map((c: SyncedComment) => {
                const badge = replyStatusBadge(c.reply_status);
                const isSelected = selectedCommentId === c.id;
                const isChecked = selectedIds.has(c.id);
                return (
                  <div
                    key={c.id}
                    className={`w-full flex items-start gap-2 p-3 rounded-md border transition-colors ${
                      isSelected
                        ? "border-brand-400 bg-brand-50"
                        : "border-border-subtle bg-surface-card hover:bg-surface-hover"
                    }`}
                    data-testid={`comment-item-${c.id}`}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Yorum ${c.id} seç`}
                      checked={isChecked}
                      onChange={() => toggleRow(c.id)}
                      className="mt-1 shrink-0"
                      data-testid={`user-comment-select-${c.id}`}
                    />
                    <button
                      type="button"
                      className="flex-1 text-left min-w-0"
                      onClick={() => setSelectedCommentId(c.id)}
                      data-testid={`comment-item-button-${c.id}`}
                    >
                    <div className="flex items-start gap-2">
                      {/* Avatar */}
                      {c.author_avatar_url ? (
                        <img
                          src={c.author_avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 flex items-center justify-center text-xs text-neutral-500">
                          {(c.author_name || "?")[0]}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-neutral-800 truncate">
                            {c.author_name || "Bilinmeyen"}
                          </span>
                          <span className="text-xs text-neutral-400 flex-shrink-0">
                            {timeAgo(c.published_at)}
                          </span>
                          {c.is_reply && (
                            <span className="text-xs text-neutral-400 flex-shrink-0">yanıt</span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-700 m-0 line-clamp-2">{c.text}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-neutral-400">{c.like_count} beğeni</span>
                          {c.reply_count > 0 && (
                            <span className="text-xs text-neutral-400">{c.reply_count} yanıt</span>
                          )}
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </SectionShell>
        </div>

        {/* Detail + Reply panel — 2 columns on large */}
        <div className="lg:col-span-2">
          {selectedComment ? (
            <SectionShell title="Yorum Detayı" testId="comment-detail-panel">
              {/* Author */}
              <div className="flex items-center gap-2 mb-3">
                {selectedComment.author_avatar_url ? (
                  <img
                    src={selectedComment.author_avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-sm text-neutral-500">
                    {(selectedComment.author_name || "?")[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-neutral-800 m-0">
                    {selectedComment.author_name || "Bilinmeyen"}
                  </p>
                  <p className="text-xs text-neutral-400 m-0">
                    {selectedComment.published_at
                      ? new Date(selectedComment.published_at).toLocaleString("tr-TR")
                      : "\u2014"}
                  </p>
                </div>
              </div>

              {/* Full text */}
              <div className="p-3 bg-surface-page rounded-md border border-border-subtle mb-3">
                <p className="text-sm text-neutral-800 m-0 whitespace-pre-wrap" data-testid="comment-detail-text">
                  {selectedComment.text}
                </p>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-xs text-neutral-500 mb-3">
                <span>Platform: {selectedComment.platform}</span>
                <span>Video: {selectedComment.external_video_id}</span>
                <span>Beğeni: {selectedComment.like_count}</span>
                <span>Yanıt: {selectedComment.reply_count}</span>
              </div>

              {/* Reply status badge */}
              {(() => {
                const badge = replyStatusBadge(selectedComment.reply_status);
                return (
                  <div className="mb-3">
                    <span className={`text-xs px-2 py-1 rounded border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })()}

              {/* Previous reply (if any) */}
              {selectedComment.our_reply_text && (
                <div className="p-3 bg-brand-50 rounded-md border border-brand-200 mb-3" data-testid="comment-our-reply">
                  <p className="text-xs font-medium text-brand-600 m-0 mb-1">Bizim Yanıtımız</p>
                  <p className="text-sm text-neutral-700 m-0 whitespace-pre-wrap">
                    {selectedComment.our_reply_text}
                  </p>
                  <p className="text-xs text-neutral-400 m-0 mt-1">
                    {selectedComment.our_reply_at
                      ? new Date(selectedComment.our_reply_at).toLocaleString("tr-TR")
                      : ""}
                  </p>
                </div>
              )}

              {/* Sync button */}
              <div className="mb-3">
                <button
                  type="button"
                  className="text-xs text-brand-600 hover:text-brand-700 underline"
                  onClick={() => handleSync(selectedComment.external_video_id)}
                  disabled={syncMutation.isPending}
                  data-testid="comment-sync-btn"
                >
                  {syncMutation.isPending ? "Sync ediliyor..." : "Bu videoyu tekrar sync et"}
                </button>
                {syncMutation.isSuccess && syncMutation.data && (
                  <p className="text-xs text-success-600 mt-1 m-0">
                    {syncMutation.data.new_comments} yeni, {syncMutation.data.updated_comments} güncellendi
                  </p>
                )}
              </div>

              {/* Reply composer */}
              {selectedComment.reply_status !== "replied" && (
                <div className="border-t border-border-subtle pt-3">
                  {replyBlocked ? (
                    <ConnectionCapabilityWarning connectionId={activeConnectionId} requiredCapability="can_reply_comments" mode="guard" context="user" />
                  ) : (
                    <>
                      <AssistedComposer
                        value={replyText}
                        onChange={setReplyText}
                        onSubmit={handleReply}
                        placeholder="Yanıt yazın..."
                        submitLabel="YouTube'a Gönder"
                        maxLength={10000}
                        loading={replyMutation.isPending}
                        contextLabel="Yorum Yanıtı"
                        testId="comment-reply-composer"
                      />
                      {replyMutation.isError && (
                        <p className="text-xs text-error-base mt-1 m-0">Yanıt gönderilemedi.</p>
                      )}
                      {replyMutation.isSuccess && replyMutation.data?.success && (
                        <p className="text-xs text-success-600 mt-1 m-0">Yanıt başarıyla gönderildi.</p>
                      )}
                      {replyMutation.isSuccess && !replyMutation.data?.success && (
                        <p className="text-xs text-error-base mt-1 m-0">
                          {replyMutation.data?.error || "Bilinmeyen hata."}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </SectionShell>
          ) : (
            <SectionShell title="Yorum Detayı" testId="comment-detail-empty">
              <p className="text-sm text-neutral-500 text-center py-8">
                Detayını görmek için bir yorum seçin.
              </p>
            </SectionShell>
          )}
        </div>
      </div>
    </PageShell>
  );
}
