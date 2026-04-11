/**
 * AdminCommentMonitoringPage — Faz 7G.
 *
 * Admin view for all platform comments across all users/channels.
 * Filters: user, channel profile, platform, reply status.
 * Shows: comment list, reply status visibility, error tracking.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useComments, useSyncStatus } from "../../hooks/useComments";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { fetchUsers, type UserResponse } from "../../api/usersApi";
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
  ActionButton,
  FeedbackBanner,
} from "../../components/design-system/primitives";
import type { SyncedComment, CommentListParams } from "../../api/commentsApi";
import {
  useMarkYtCommentsAsSpam,
  useModerateYtComments,
} from "../../hooks/useYoutubeEngagementAdvanced";
import type { CommentModerationStatus } from "../../api/youtubeEngagementAdvancedApi";

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

export function AdminCommentMonitoringPage() {
  // Filters
  const [userFilter, setUserFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [replyStatusFilter, setReplyStatusFilter] = useState<string>("");

  // Fetch users and channels for filter dropdowns
  const { data: users } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => fetchUsers(),
    staleTime: 60_000,
  });

  const { data: channels } = useQuery({
    queryKey: ["channel-profiles", userFilter || "all"],
    queryFn: () => fetchChannelProfiles(userFilter || undefined),
    staleTime: 60_000,
  });

  // Sync status overview
  const { data: syncStatus } = useSyncStatus();

  // Comment list params
  const listParams: CommentListParams = useMemo(() => {
    const p: CommentListParams = { limit: 200 };
    if (channelFilter) p.channel_profile_id = channelFilter;
    if (platformFilter) p.platform = platformFilter;
    if (replyStatusFilter) p.reply_status = replyStatusFilter;
    return p;
  }, [channelFilter, platformFilter, replyStatusFilter]);

  const { data: comments, isLoading, isError } = useComments(listParams);

  // --- Sprint 3: bulk YouTube moderation state ----------------------------
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moderationFeedback, setModerationFeedback] = useState<
    { type: "success" | "error"; msg: string } | null
  >(null);

  // All currently-selected comments (derived from visible comment list)
  const selectedComments = useMemo<SyncedComment[]>(() => {
    if (!comments) return [];
    return comments.filter((c) => selectedIds.has(c.id));
  }, [comments, selectedIds]);

  // Every selected comment must share the same platform_connection_id for
  // a single YouTube API batch call. We derive it here and disable the
  // moderation bar if the selection is empty or mixed.
  const batchConnectionId = useMemo<string | null>(() => {
    if (selectedComments.length === 0) return null;
    const first = selectedComments[0].platform_connection_id;
    if (!first) return null;
    return selectedComments.every((c) => c.platform_connection_id === first)
      ? first
      : null;
  }, [selectedComments]);

  const onlyYoutubeSelected = useMemo(
    () => selectedComments.length > 0 && selectedComments.every((c) => c.platform === "youtube"),
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

  const toggleAllVisible = () => {
    if (!comments) return;
    setSelectedIds((prev) => {
      // If every visible row is already selected, clear. Otherwise select all.
      const allSelected = comments.every((c) => prev.has(c.id));
      if (allSelected) return new Set();
      const next = new Set(prev);
      comments.forEach((c) => next.add(c.id));
      return next;
    });
  };

  async function runModeration(status: CommentModerationStatus, banAuthor = false) {
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
        msg: `${res.moderated_count} yorum '${res.moderation_status}' olarak isaretlendi.`,
      });
      setSelectedIds(new Set());
    } catch (err: unknown) {
      setModerationFeedback({
        type: "error",
        msg: `Moderasyon hatasi: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function runMarkAsSpam() {
    if (!batchConnectionId || selectedComments.length === 0) return;
    if (!window.confirm(`${selectedComments.length} yorum spam olarak isaretlensin mi?`)) return;
    const externalIds = selectedComments.map((c) => c.external_comment_id);
    try {
      const res = await spamMut.mutateAsync({ external_comment_ids: externalIds });
      setModerationFeedback({
        type: "success",
        msg: `${res.marked_count} yorum spam olarak isaretlendi.`,
      });
      setSelectedIds(new Set());
    } catch (err: unknown) {
      setModerationFeedback({
        type: "error",
        msg: `Spam isaretleme hatasi: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // KPI calculations
  const kpis = useMemo(() => {
    if (!comments) return { total: 0, replied: 0, failed: 0, pending: 0, unreplied: 0 };
    return {
      total: comments.length,
      replied: comments.filter((c) => c.reply_status === "replied").length,
      failed: comments.filter((c) => c.reply_status === "failed").length,
      pending: comments.filter((c) => c.reply_status === "pending").length,
      unreplied: comments.filter((c) => c.reply_status === "none").length,
    };
  }, [comments]);

  // When user filter changes, clear channel filter
  const handleUserChange = (val: string) => {
    setUserFilter(val);
    setChannelFilter("");
  };

  return (
    <PageShell
      title="Yorum Izleme"
      subtitle="Tum kullanici ve kanal yorumlarini izleyin."
      testId="admin-comment-monitoring"
    >
      {/* Faz 17a: Connection context link */}
      <div className="flex items-center gap-2 mb-3 text-xs text-neutral-500" data-testid="admin-comment-connection-link">
        <span>Yorum senkronizasyon sorunlari icin:</span>
        <Link to="/admin/connections" className="text-brand-600 hover:text-brand-700 underline">
          Baglanti Durumu
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4" data-testid="admin-comment-filters">
        {/* User filter */}
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={userFilter}
          onChange={(e) => handleUserChange(e.target.value)}
          data-testid="admin-comment-filter-user"
        >
          <option value="">Tum Kullanicilar</option>
          {users?.map((u: UserResponse) => (
            <option key={u.id} value={u.id}>
              {u.display_name || u.email}
            </option>
          ))}
        </select>

        {/* Channel filter */}
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          data-testid="admin-comment-filter-channel"
        >
          <option value="">Tum Kanallar</option>
          {channels?.map((ch: ChannelProfileResponse) => (
            <option key={ch.id} value={ch.id}>
              {ch.profile_name}
            </option>
          ))}
        </select>

        {/* Platform */}
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          data-testid="admin-comment-filter-platform"
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Reply status */}
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={replyStatusFilter}
          onChange={(e) => setReplyStatusFilter(e.target.value)}
          data-testid="admin-comment-filter-reply-status"
        >
          {REPLY_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* KPI summary */}
      <SectionShell title="Yorum Ozeti" testId="comment-kpi">
        <MetricGrid>
          <MetricTile label="Toplam Yorum" value={String(kpis.total)} testId="metric-total-comments" loading={isLoading} />
          <MetricTile label="Cevaplanmis" value={String(kpis.replied)} testId="metric-replied" loading={isLoading} accentColor="var(--ch-success-base)" />
          <MetricTile label="Cevaplanmamis" value={String(kpis.unreplied)} testId="metric-unreplied" loading={isLoading} />
          <MetricTile label="Basarisiz" value={String(kpis.failed)} testId="metric-failed-replies" loading={isLoading} accentColor="var(--ch-error-base)" />
        </MetricGrid>
      </SectionShell>

      {/* Sync Status */}
      {syncStatus && syncStatus.length > 0 && (
        <SectionShell title="Sync Durumu" testId="sync-status-section">
          <div className="flex flex-wrap gap-3">
            {syncStatus.map((s) => (
              <div
                key={s.external_video_id}
                className="p-2 bg-surface-card border border-border-subtle rounded-md text-xs min-w-[160px]"
              >
                <p className="m-0 font-medium text-neutral-700 truncate">{s.external_video_id}</p>
                <p className="m-0 text-neutral-500">{s.comment_count} yorum</p>
                <p className="m-0 text-neutral-400">
                  Son sync: {s.last_synced_at ? timeAgo(s.last_synced_at) : "bilinmiyor"}
                </p>
              </div>
            ))}
          </div>
        </SectionShell>
      )}

      {/* Loading / Error */}
      {isLoading && (
        <p className="text-sm text-neutral-500 text-center py-8">Yorumlar yukleniyor...</p>
      )}
      {isError && (
        <p className="text-sm text-error-base text-center py-8">Yorumlar yuklenirken hata olustu.</p>
      )}

      {/* Bulk moderation bar (Sprint 3) */}
      {selectedComments.length > 0 && (
        <SectionShell
          title={`Toplu Moderasyon (${selectedComments.length} secili)`}
          description="YouTube yorumlari icin moderasyon durumu, spam ve ban islemleri."
          testId="admin-comment-moderation-bar"
        >
          {!onlyYoutubeSelected && (
            <FeedbackBanner
              type="error"
              message="Toplu moderasyon yalniz YouTube yorumlari icin destekleniyor. Secimi daraltin."
            />
          )}
          {onlyYoutubeSelected && !batchConnectionId && (
            <FeedbackBanner
              type="error"
              message="Secili yorumlar farkli YouTube baglantilarina ait. Ayni baglantiya ait yorumlari secin."
            />
          )}
          {moderationFeedback && (
            <FeedbackBanner type={moderationFeedback.type} message={moderationFeedback.msg} />
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => runModeration("heldForReview")}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={moderateMut.isPending}
              data-testid="admin-comment-mod-hold"
            >
              Incelemeye Al
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => runModeration("published")}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={moderateMut.isPending}
              data-testid="admin-comment-mod-publish"
            >
              Yayinla
            </ActionButton>
            <ActionButton
              variant="danger"
              size="sm"
              onClick={() => runModeration("rejected")}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={moderateMut.isPending}
              data-testid="admin-comment-mod-reject"
            >
              Reddet
            </ActionButton>
            <ActionButton
              variant="danger"
              size="sm"
              onClick={() => runModeration("rejected", true)}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={moderateMut.isPending}
              data-testid="admin-comment-mod-reject-ban"
            >
              Reddet + Yazari Engelle
            </ActionButton>
            <ActionButton
              variant="danger"
              size="sm"
              onClick={runMarkAsSpam}
              disabled={!batchConnectionId || !onlyYoutubeSelected || moderationBusy}
              loading={spamMut.isPending}
              data-testid="admin-comment-mod-spam"
            >
              Spam Isaretle
            </ActionButton>
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={moderationBusy}
              data-testid="admin-comment-mod-clear"
            >
              Secimi Temizle
            </ActionButton>
          </div>
        </SectionShell>
      )}

      {/* Comment table */}
      <SectionShell title="Yorum Listesi" testId="admin-comment-list">
        {comments && comments.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-4">Secilen filtrelerde yorum bulunamadi.</p>
        )}
        {comments && comments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="comment-table">
              <thead>
                <tr className="border-b border-border-subtle text-left">
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500 w-8">
                    <input
                      type="checkbox"
                      aria-label="Tum goruntulenenleri sec"
                      checked={comments.length > 0 && comments.every((c) => selectedIds.has(c.id))}
                      onChange={toggleAllVisible}
                      data-testid="admin-comment-select-all"
                    />
                  </th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Yazar</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Yorum</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Video</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Platform</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Durum</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Begeni</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c: SyncedComment) => {
                  const badge = replyStatusBadge(c.reply_status);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                      data-testid={`admin-comment-row-${c.id}`}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          aria-label={`Yorum ${c.id} sec`}
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleRow(c.id)}
                          data-testid={`admin-comment-select-${c.id}`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {c.author_avatar_url ? (
                            <img src={c.author_avatar_url} alt="" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs">
                              {(c.author_name || "?")[0]}
                            </div>
                          )}
                          <span className="text-neutral-800 truncate max-w-[120px]">
                            {c.author_name || "Bilinmeyen"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <p className="text-neutral-700 m-0 line-clamp-2 max-w-[300px]">{c.text}</p>
                      </td>
                      <td className="py-2 px-3 text-xs text-neutral-500 truncate max-w-[100px]">
                        {c.external_video_id}
                      </td>
                      <td className="py-2 px-3 text-xs text-neutral-500">{c.platform}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-neutral-500">{c.like_count}</td>
                      <td className="py-2 px-3 text-xs text-neutral-400">{timeAgo(c.published_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>
    </PageShell>
  );
}
