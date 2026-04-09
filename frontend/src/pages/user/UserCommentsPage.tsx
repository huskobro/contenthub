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
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { useAuthStore } from "../../stores/authStore";
import { AssistedComposer } from "../../components/engagement/AssistedComposer";
import { ConnectionCapabilityWarning, useCapabilityStatus } from "../../components/connections/ConnectionCapabilityWarning";
import { useChannelConnection } from "../../hooks/useChannelConnection";
import {
  PageShell,
  SectionShell,
} from "../../components/design-system/primitives";
import type { SyncedComment, CommentListParams } from "../../api/commentsApi";

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const REPLY_STATUS_OPTIONS = [
  { value: "", label: "Tum Durumlar" },
  { value: "none", label: "Cevaplanmamis" },
  { value: "pending", label: "Bekliyor" },
  { value: "replied", label: "Cevaplanmis" },
  { value: "failed", label: "Basarisiz" },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "Tum Platformlar" },
  { value: "youtube", label: "YouTube" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "az once";
  if (mins < 60) return `${mins}dk once`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa once`;
  const days = Math.floor(hours / 24);
  return `${days}g once`;
}

function replyStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "replied":
      return { label: "Cevaplanmis", className: "bg-success-50 text-success-700 border-success-200" };
    case "pending":
      return { label: "Bekliyor", className: "bg-warning-50 text-warning-700 border-warning-200" };
    case "failed":
      return { label: "Basarisiz", className: "bg-error-50 text-error-700 border-error-200" };
    default:
      return { label: "Cevaplanmamis", className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
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
      subtitle="Kanallariniza gelen yorumlari yonetin ve cevap verin."
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
          <option value="">Tum Kanallar</option>
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

      {/* Loading / Error */}
      {isLoading && (
        <p className="text-sm text-neutral-500 text-center py-8">Yorumlar yukleniyor...</p>
      )}
      {isError && (
        <p className="text-sm text-error-base text-center py-8">Yorumlar yuklenirken hata olustu.</p>
      )}

      {/* Content area: list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Comment list — 3 columns on large */}
        <div className="lg:col-span-3">
          <SectionShell title={`Yorumlar${comments ? ` (${comments.length})` : ""}`} testId="comment-list-section">
            {comments && comments.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">
                Secilen filtrelerde yorum bulunamadi.
              </p>
            )}
            <div className="flex flex-col gap-1 max-h-[600px] overflow-y-auto">
              {comments?.map((c: SyncedComment) => {
                const badge = replyStatusBadge(c.reply_status);
                const isSelected = selectedCommentId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      isSelected
                        ? "border-brand-400 bg-brand-50"
                        : "border-border-subtle bg-surface-card hover:bg-surface-hover"
                    }`}
                    onClick={() => setSelectedCommentId(c.id)}
                    data-testid={`comment-item-${c.id}`}
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
                            <span className="text-xs text-neutral-400 flex-shrink-0">yanit</span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-700 m-0 line-clamp-2">{c.text}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-neutral-400">{c.like_count} begeni</span>
                          {c.reply_count > 0 && (
                            <span className="text-xs text-neutral-400">{c.reply_count} yanit</span>
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
                );
              })}
            </div>
          </SectionShell>
        </div>

        {/* Detail + Reply panel — 2 columns on large */}
        <div className="lg:col-span-2">
          {selectedComment ? (
            <SectionShell title="Yorum Detayi" testId="comment-detail-panel">
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
                <span>Begeni: {selectedComment.like_count}</span>
                <span>Yanit: {selectedComment.reply_count}</span>
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
                  <p className="text-xs font-medium text-brand-600 m-0 mb-1">Bizim Yanitimiz</p>
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
                    {syncMutation.data.new_comments} yeni, {syncMutation.data.updated_comments} guncellendi
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
                        placeholder="Yanit yazin..."
                        submitLabel="YouTube'a Gonder"
                        maxLength={10000}
                        loading={replyMutation.isPending}
                        contextLabel="Yorum Yaniti"
                        testId="comment-reply-composer"
                      />
                      {replyMutation.isError && (
                        <p className="text-xs text-error-base mt-1 m-0">Yanit gonderilemedi.</p>
                      )}
                      {replyMutation.isSuccess && replyMutation.data?.success && (
                        <p className="text-xs text-success-600 mt-1 m-0">Yanit basariyla gonderildi.</p>
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
            <SectionShell title="Yorum Detayi" testId="comment-detail-empty">
              <p className="text-sm text-neutral-500 text-center py-8">
                Detayini gormek icin bir yorum secin.
              </p>
            </SectionShell>
          )}
        </div>
      </div>
    </PageShell>
  );
}
