/**
 * AdminPostMonitoringPage — Faz 9.
 *
 * Admin view for all platform posts across all users/channels.
 * Filters: user, channel profile, platform, status.
 * Shows: KPI cards, post table with type/status/delivery badges.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePosts, usePostStats, usePostCapability } from "../../hooks/usePosts";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { fetchUsers, type UserResponse } from "../../api/usersApi";
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
} from "../../components/design-system/primitives";
import type { PlatformPost, PostListParams } from "../../api/postsApi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { value: "", label: "Tum Platformlar" },
  { value: "youtube", label: "YouTube" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tum Durumlar" },
  { value: "draft", label: "Taslak" },
  { value: "queued", label: "Kuyrukta" },
  { value: "posted", label: "Gonderildi" },
  { value: "failed", label: "Basarisiz" },
];

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

function statusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "draft":
      return { label: "Taslak", className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
    case "queued":
      return { label: "Kuyrukta", className: "bg-warning-50 text-warning-700 border-warning-200" };
    case "posted":
      return { label: "Gonderildi", className: "bg-success-50 text-success-700 border-success-200" };
    case "failed":
      return { label: "Basarisiz", className: "bg-error-50 text-error-700 border-error-200" };
    default:
      return { label: status, className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
  }
}

function deliveryBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "delivered":
      return { label: "Teslim Edildi", className: "bg-success-50 text-success-700 border-success-200" };
    case "not_available":
      return { label: "API Yok", className: "bg-warning-50 text-warning-700 border-warning-200" };
    case "failed":
      return { label: "Basarisiz", className: "bg-error-50 text-error-700 border-error-200" };
    default:
      return { label: "Bekliyor", className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
  }
}

function postTypeLabel(type: string): string {
  switch (type) {
    case "community_post": return "Topluluk";
    case "share_post": return "Paylasim";
    case "announcement": return "Duyuru";
    default: return type;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminPostMonitoringPage() {
  const [userFilter, setUserFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Fetch users and channels
  const { data: users } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const { data: channels } = useQuery({
    queryKey: ["channel-profiles", userFilter || "all"],
    queryFn: () => fetchChannelProfiles(userFilter || undefined),
    staleTime: 60_000,
  });

  // Stats and capability
  const { data: stats, isLoading: statsLoading } = usePostStats();
  const { data: capability } = usePostCapability();

  // Post list
  const listParams: PostListParams = useMemo(() => {
    const p: PostListParams = { limit: 200 };
    if (channelFilter) p.channel_profile_id = channelFilter;
    if (platformFilter) p.platform = platformFilter;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [channelFilter, platformFilter, statusFilter]);

  const { data: posts, isLoading, isError } = usePosts(listParams);

  const handleUserChange = (val: string) => {
    setUserFilter(val);
    setChannelFilter("");
  };

  return (
    <PageShell
      title="Gonderi Izleme"
      subtitle="Tum kullanici ve kanal gonderilerini izleyin."
      testId="admin-post-monitoring"
    >
      {/* Faz 17a: Connection context link */}
      <div className="flex items-center gap-2 mb-3 text-xs text-neutral-500" data-testid="admin-post-connection-link">
        <span>Gonderi sorunlari icin:</span>
        <Link to="/admin/connections" className="text-brand-600 hover:text-brand-700 underline">
          Baglanti Durumu
        </Link>
      </div>

      {/* Capability notice */}
      {capability && (
        <div
          className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-md text-xs text-warning-700"
          data-testid="admin-post-capability-notice"
        >
          <strong>Platform Bilgisi:</strong> {capability.note}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4" data-testid="admin-post-filters">
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={userFilter}
          onChange={(e) => handleUserChange(e.target.value)}
          data-testid="admin-post-filter-user"
        >
          <option value="">Tum Kullanicilar</option>
          {users?.map((u: UserResponse) => (
            <option key={u.id} value={u.id}>{u.display_name || u.email}</option>
          ))}
        </select>

        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          data-testid="admin-post-filter-channel"
        >
          <option value="">Tum Kanallar</option>
          {channels?.map((ch: ChannelProfileResponse) => (
            <option key={ch.id} value={ch.id}>{ch.profile_name}</option>
          ))}
        </select>

        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          data-testid="admin-post-filter-platform"
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="admin-post-filter-status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <SectionShell title="Gonderi Ozeti" testId="post-kpi">
        <MetricGrid>
          <MetricTile label="Toplam Gonderi" value={String(stats?.total ?? 0)} testId="metric-total-posts" loading={statsLoading} />
          <MetricTile label="Taslak" value={String(stats?.draft ?? 0)} testId="metric-draft" loading={statsLoading} />
          <MetricTile label="Kuyrukta" value={String(stats?.queued ?? 0)} testId="metric-queued" loading={statsLoading} accentColor="var(--ch-warning-base)" />
          <MetricTile label="Gonderildi" value={String(stats?.posted ?? 0)} testId="metric-posted" loading={statsLoading} accentColor="var(--ch-success-base)" />
          <MetricTile label="Basarisiz" value={String(stats?.failed ?? 0)} testId="metric-failed" loading={statsLoading} accentColor="var(--ch-error-base)" />
        </MetricGrid>
      </SectionShell>

      {/* Loading / Error */}
      {isLoading && <p className="text-sm text-neutral-500 text-center py-8">Gonderiler yukleniyor...</p>}
      {isError && <p className="text-sm text-error-base text-center py-8">Gonderiler yuklenirken hata olustu.</p>}

      {/* Post table */}
      <SectionShell title="Gonderi Listesi" testId="admin-post-list">
        {posts && posts.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-4">Secilen filtrelerde gonderi bulunamadi.</p>
        )}
        {posts && posts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="post-table">
              <thead>
                <tr className="border-b border-border-subtle text-left">
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Baslik / Icerik</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Tur</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Platform</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Durum</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Teslimat</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p: PlatformPost) => {
                  const sBadge = statusBadge(p.status);
                  const dBadge = deliveryBadge(p.delivery_status);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                      data-testid={`admin-post-row-${p.id}`}
                    >
                      <td className="py-2 px-3">
                        <p className="m-0 text-neutral-800 truncate max-w-[280px]">
                          {p.title || p.body.slice(0, 60)}
                        </p>
                        {p.delivery_error && (
                          <p className="m-0 text-xs text-error-base truncate max-w-[280px]">{p.delivery_error}</p>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-neutral-500">{postTypeLabel(p.post_type)}</td>
                      <td className="py-2 px-3 text-xs text-neutral-500">{p.platform}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${sBadge.className}`}>{sBadge.label}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${dBadge.className}`}>{dBadge.label}</span>
                      </td>
                      <td className="py-2 px-3 text-xs text-neutral-400">{timeAgo(p.created_at)}</td>
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
