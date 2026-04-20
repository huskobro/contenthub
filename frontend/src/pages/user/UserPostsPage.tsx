/**
 * UserPostsPage — Faz 9D+E.
 *
 * User panel post management:
 * - Channel/platform/status filters
 * - Post list with type, status, delivery badge
 * - Detail panel with full text, metadata
 * - Create new post via AssistedComposer
 * - Submit post (with platform capability awareness)
 * - Edit draft posts
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  usePosts,
  useCreatePost,
  useUpdatePost,
  useSubmitPost,
  useDeletePost,
  usePostCapability,
} from "../../hooks/usePosts";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { useAuthStore } from "../../stores/authStore";
import { AssistedComposer } from "../../components/engagement/AssistedComposer";
import { ConnectionCapabilityWarning } from "../../components/connections/ConnectionCapabilityWarning";
import { useChannelConnection } from "../../hooks/useChannelConnection";
import {
  PageShell,
  SectionShell,
} from "../../components/design-system/primitives";
import type { PlatformPost, PostListParams } from "../../api/postsApi";
import { useSurfacePageOverride } from "../../surfaces";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "", label: "Tüm Durumlar" },
  { value: "draft", label: "Taslak" },
  { value: "queued", label: "Kuyrukta" },
  { value: "posted", label: "Gönderildi" },
  { value: "failed", label: "Başarısız" },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "Tüm Platformlar" },
  { value: "youtube", label: "YouTube" },
];

const POST_TYPE_LABELS: Record<string, string> = {
  community_post: "Topluluk Gönderisi",
  share_post: "Paylaşım",
  announcement: "Duyuru",
};

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

function statusBadge(s: string): { label: string; className: string } {
  switch (s) {
    case "posted":
      return { label: "Gönderildi", className: "bg-success-50 text-success-700 border-success-200" };
    case "queued":
      return { label: "Kuyrukta", className: "bg-warning-50 text-warning-700 border-warning-200" };
    case "failed":
      return { label: "Başarısız", className: "bg-error-50 text-error-700 border-error-200" };
    default:
      return { label: "Taslak", className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
  }
}

function deliveryBadge(s: string): { label: string; className: string } {
  switch (s) {
    case "delivered":
      return { label: "İletildi", className: "text-success-600" };
    case "not_available":
      return { label: "Platform desteği yok", className: "text-warning-600" };
    case "failed":
      return { label: "İletim hatası", className: "text-error-600" };
    default:
      return { label: "Bekliyor", className: "text-neutral-500" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserPostsPage() {
  const Override = useSurfacePageOverride("user.posts");
  if (Override) return <Override />;
  return <LegacyUserPostsPage />;
}

function LegacyUserPostsPage() {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  // Filters
  const [channelFilter, setChannelFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Create post state
  const [showCreate, setShowCreate] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editBody, setEditBody] = useState("");

  // Fetch channels
  const { data: channels } = useQuery({
    queryKey: ["channel-profiles", userId],
    queryFn: () => fetchChannelProfiles(userId || undefined),
    enabled: !!userId,
    staleTime: 60_000,
  });

  // Capability
  const { data: capability } = usePostCapability();

  // Faz 17a: Connection lookup for capability awareness
  const { connectionId: activeConnectionId } = useChannelConnection(channelFilter || undefined);

  // Posts list
  const listParams: PostListParams = useMemo(() => {
    const p: PostListParams = { limit: 100 };
    if (channelFilter) p.channel_profile_id = channelFilter;
    if (platformFilter) p.platform = platformFilter;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [channelFilter, platformFilter, statusFilter]);

  const { data: posts, isLoading, isError } = usePosts(listParams);

  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost();
  const submitMutation = useSubmitPost();
  const deleteMutation = useDeletePost();

  const selectedPost = useMemo(() => {
    if (!selectedPostId || !posts) return null;
    return posts.find((p) => p.id === selectedPostId) ?? null;
  }, [selectedPostId, posts]);

  // Handlers
  const handleCreate = () => {
    if (!newBody.trim()) return;
    createMutation.mutate(
      {
        body: newBody.trim(),
        title: newTitle.trim() || undefined,
        platform: "youtube",
        channel_profile_id: channelFilter || undefined,
      },
      {
        onSuccess: () => {
          setNewBody("");
          setNewTitle("");
          setShowCreate(false);
        },
      },
    );
  };

  const handleUpdate = () => {
    if (!selectedPost || !editBody.trim()) return;
    updateMutation.mutate(
      { postId: selectedPost.id, data: { body: editBody.trim() } },
      {
        onSuccess: () => {
          setEditMode(false);
        },
      },
    );
  };

  const handleSubmit = () => {
    if (!selectedPost || !userId) return;
    submitMutation.mutate({ postId: selectedPost.id, userId });
  };

  const handleDelete = () => {
    if (!selectedPost) return;
    deleteMutation.mutate(selectedPost.id, {
      onSuccess: () => setSelectedPostId(null),
    });
  };

  const startEdit = () => {
    if (selectedPost) {
      setEditBody(selectedPost.body);
      setEditMode(true);
    }
  };

  return (
    <PageShell
      title="Gönderilerim"
      subtitle="Topluluk gönderileri oluşturun ve yönetin."
      testId="user-posts"
    >
      <div className="px-3 py-2 bg-info-light rounded text-xs text-info-dark mb-4" data-testid="posts-api-limitation-notice">
        YouTube Community Posts API'si kısıtlıdır. Gönderi oluşturma ve düzenleme işlemleri tam olarak desteklenmeyebilir.
      </div>

      {/* Faz 17a: Connection-aware capability warning */}
      {activeConnectionId ? (
        <div className="mb-3" data-testid="capability-notice">
          <ConnectionCapabilityWarning connectionId={activeConnectionId} requiredCapability="can_create_posts" context="user" />
        </div>
      ) : capability ? (
        <div className="mb-3 p-2 bg-warning-50 border border-warning-200 rounded-md text-xs text-warning-700" data-testid="capability-notice">
          {capability.note}
        </div>
      ) : null}

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4" data-testid="post-filters">
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          data-testid="post-filter-channel"
        >
          <option value="">Tüm Kanallar</option>
          {channels?.map((ch: ChannelProfileResponse) => (
            <option key={ch.id} value={ch.id}>{ch.profile_name}</option>
          ))}
        </select>

        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          data-testid="post-filter-platform"
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="post-filter-status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          type="button"
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700"
          onClick={() => setShowCreate(!showCreate)}
          data-testid="post-create-toggle"
        >
          Yeni Gönderi Oluştur
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <SectionShell title="Yeni Gönderi" testId="create-post-form">
          <div className="max-w-lg">
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm border border-border-default rounded-md mb-2"
              placeholder="Başlık (opsiyonel)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              data-testid="create-post-title"
            />
            <AssistedComposer
              value={newBody}
              onChange={setNewBody}
              onSubmit={handleCreate}
              placeholder="Gönderi metninizi yazın..."
              submitLabel="Taslak Kaydet"
              maxLength={5000}
              loading={createMutation.isPending}
              contextLabel="Topluluk Gönderisi"
              testId="create-post-composer"
            />
            {createMutation.isSuccess && (
              <p className="text-xs text-success-600 mt-1">Taslak başarıyla kaydedildi.</p>
            )}
          </div>
        </SectionShell>
      )}

      {/* Loading / Error */}
      {isLoading && <p className="text-sm text-neutral-500 text-center py-8">Gönderiler yükleniyor...</p>}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-error-light flex items-center justify-center mb-3">
            <span className="text-error-base text-xl">!</span>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-1">Yüklenemedi</h3>
          <p className="text-sm text-neutral-500">Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
        </div>
      )}

      {/* Content: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Post list */}
        <div className="lg:col-span-2">
          <SectionShell title={`Gönderiler${posts ? ` (${posts.length})` : ""}`} testId="post-list-section">
            {posts && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                  <span className="text-neutral-400 text-xl">&empty;</span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-1">Henüz kayıt yok</h3>
                <p className="text-sm text-neutral-500 max-w-xs">Henüz topluluk gönderisi yok.</p>
              </div>
            )}
            <div className="flex flex-col gap-1 max-h-[600px] overflow-y-auto">
              {posts?.map((p: PlatformPost) => {
                const badge = statusBadge(p.status);
                const isSelected = selectedPostId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      isSelected
                        ? "border-brand-400 bg-brand-50"
                        : "border-border-subtle bg-surface-card hover:bg-surface-hover"
                    }`}
                    onClick={() => {
                      setSelectedPostId(p.id);
                      setEditMode(false);
                    }}
                    data-testid={`post-item-${p.id}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-neutral-400">
                        {POST_TYPE_LABELS[p.post_type] || p.post_type}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    {p.title && (
                      <p className="text-sm font-medium text-neutral-800 m-0 truncate">{p.title}</p>
                    )}
                    <p className="text-sm text-neutral-700 m-0 line-clamp-2">{p.body}</p>
                    <span className="text-xs text-neutral-400 mt-1 block">{timeAgo(p.updated_at)}</span>
                  </button>
                );
              })}
            </div>
          </SectionShell>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selectedPost ? (
            <SectionShell title="Gönderi Detayı" testId="post-detail-panel">
              {/* Status + delivery */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded border ${statusBadge(selectedPost.status).className}`}>
                  {statusBadge(selectedPost.status).label}
                </span>
                <span className={`text-xs ${deliveryBadge(selectedPost.delivery_status).className}`}>
                  {deliveryBadge(selectedPost.delivery_status).label}
                </span>
                <span className="text-xs text-neutral-400">
                  {POST_TYPE_LABELS[selectedPost.post_type] || selectedPost.post_type}
                </span>
              </div>

              {/* Title */}
              {selectedPost.title && (
                <p className="text-base font-medium text-neutral-800 m-0 mb-2">{selectedPost.title}</p>
              )}

              {/* Body — view or edit */}
              {editMode ? (
                <div className="mb-3">
                  <AssistedComposer
                    value={editBody}
                    onChange={setEditBody}
                    onSubmit={handleUpdate}
                    placeholder="Gönderi metnini düzenleyin..."
                    submitLabel="Güncelle"
                    maxLength={5000}
                    loading={updateMutation.isPending}
                    contextLabel="Gönderi Düzenleme"
                    testId="edit-post-composer"
                  />
                  <button
                    type="button"
                    className="text-xs text-neutral-500 mt-1 underline"
                    onClick={() => setEditMode(false)}
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-surface-page rounded-md border border-border-subtle mb-3">
                  <p className="text-sm text-neutral-800 m-0 whitespace-pre-wrap" data-testid="post-detail-body">
                    {selectedPost.body}
                  </p>
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-xs text-neutral-500 mb-3">
                <span>Platform: {selectedPost.platform}</span>
                {selectedPost.content_project_id && (
                  <span>Proje: {selectedPost.content_project_id.slice(0, 8)}...</span>
                )}
                {selectedPost.publish_record_id && (
                  <span>Yayın: {selectedPost.publish_record_id.slice(0, 8)}...</span>
                )}
                <span>Oluşturulma: {timeAgo(selectedPost.created_at)}</span>
              </div>

              {/* Delivery error */}
              {selectedPost.delivery_error && (
                <div className="p-2 bg-warning-50 border border-warning-200 rounded-md text-xs text-warning-700 mb-3" data-testid="delivery-error">
                  {selectedPost.delivery_error}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {selectedPost.status === "draft" && (
                  <>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded-md border border-brand-200 text-brand-600 hover:bg-brand-50"
                      onClick={startEdit}
                      data-testid="post-edit-btn"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      data-testid="post-submit-btn"
                    >
                      {submitMutation.isPending ? "Gönderiliyor..." : "Gönder"}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded-md text-error-base hover:text-error-700"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      data-testid="post-delete-btn"
                    >
                      Sil
                    </button>
                  </>
                )}
                {selectedPost.status === "failed" && (
                  <button
                    type="button"
                    className="px-3 py-1 text-xs rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    data-testid="post-retry-btn"
                  >
                    Tekrar Dene
                  </button>
                )}
              </div>

              {/* Submit result */}
              {submitMutation.isSuccess && submitMutation.data && (
                <div className="mt-2">
                  {submitMutation.data.error ? (
                    <p className="text-xs text-warning-600">{submitMutation.data.error}</p>
                  ) : (
                    <p className="text-xs text-success-600">Gönderi başarıyla işlendi.</p>
                  )}
                </div>
              )}
            </SectionShell>
          ) : (
            <SectionShell title="Gönderi Detayı" testId="post-detail-empty">
              <p className="text-sm text-neutral-500 text-center py-8">
                Detayını görmek için bir gönderi seçin.
              </p>
            </SectionShell>
          )}
        </div>
      </div>
    </PageShell>
  );
}
