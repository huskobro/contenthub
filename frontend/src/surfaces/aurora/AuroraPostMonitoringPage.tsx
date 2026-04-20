/**
 * AuroraPostMonitoringPage — Aurora Dusk Cockpit / Gönderi İzleme (admin).
 *
 * Surface override slot: `admin.posts.monitoring`
 * Route: `/admin/posts`
 *
 * Tasarım:
 *   - Sol/üst: kullanıcı + kanal + platform + status filtreleri,
 *     ardından AuroraTable: Başlık, Kanal, Platform, Tür, Durum, Teslimat,
 *     Tarih, Dış ID (YouTube community post derin linki).
 *   - Sağ: AuroraInspector — toplam post, bu hafta yayın, en performanslı kanal,
 *     status dağılımı.
 *
 * Veri kaynakları (legacy ile aynı, hardcoded liste yok):
 *   - usePosts(...)         → PlatformPost[]
 *   - usePostStats()        → toplam/draft/queued/posted/failed sayımları
 *   - usePostCapability()   → platform yetenek notu (uyarı kutusu)
 *   - fetchUsers / fetchChannelProfiles → filtre dropdown verisi
 *
 * Hiçbir legacy sayfa veya register.tsx değiştirilmez; entegrasyon legacy
 * sayfasına eklenen `useSurfacePageOverride("admin.posts.monitoring")`
 * trampolini üzerinden yapılır.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  usePosts,
  usePostStats,
  usePostCapability,
} from "../../hooks/usePosts";
import {
  fetchChannelProfiles,
  type ChannelProfileResponse,
} from "../../api/channelProfilesApi";
import { fetchUsers, type UserResponse } from "../../api/usersApi";
import { useActiveScope } from "../../hooks/useActiveScope";
import type { PlatformPost, PostListParams } from "../../api/postsApi";
import {
  AuroraButton,
  AuroraCard,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraPageShell,
  AuroraStatusChip,
  AuroraTable,
  type AuroraColumn,
  type AuroraStatusTone,
} from "./primitives";

// ---------------------------------------------------------------------------
// Filter option taxonomy
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tüm Platformlar" },
  { value: "youtube", label: "YouTube" },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tüm Durumlar" },
  { value: "draft", label: "Taslak" },
  { value: "queued", label: "Kuyrukta" },
  { value: "posted", label: "Gönderildi" },
  { value: "failed", label: "Başarısız" },
];

// ---------------------------------------------------------------------------
// Status helpers — chip tone + label çevirisi
// ---------------------------------------------------------------------------

function statusChip(status: PlatformPost["status"]): {
  tone: AuroraStatusTone;
  label: string;
} {
  switch (status) {
    case "draft":
      return { tone: "neutral", label: "Taslak" };
    case "queued":
      return { tone: "warning", label: "Kuyrukta" };
    case "posted":
      return { tone: "success", label: "Gönderildi" };
    case "failed":
      return { tone: "danger", label: "Başarısız" };
    default:
      return { tone: "neutral", label: status };
  }
}

function deliveryChip(delivery: string): {
  tone: AuroraStatusTone;
  label: string;
} {
  switch (delivery) {
    case "delivered":
      return { tone: "success", label: "Teslim Edildi" };
    case "not_available":
      return { tone: "warning", label: "API Yok" };
    case "failed":
      return { tone: "danger", label: "Başarısız" };
    default:
      return { tone: "neutral", label: "Bekliyor" };
  }
}

function postTypeLabel(t: string): string {
  switch (t) {
    case "community_post":
      return "Topluluk";
    case "share_post":
      return "Paylaşım";
    case "announcement":
      return "Duyuru";
    default:
      return t;
  }
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const d = Math.floor(hr / 24);
  return `${d}g`;
}

function isThisWeek(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= 7 * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Reusable select control — Aurora görünümü için minimal style
// ---------------------------------------------------------------------------

function AuroraSelect({
  value,
  onChange,
  children,
  testId,
  ariaLabel,
}: {
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
  testId?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      aria-label={ariaLabel}
      style={{
        height: 28,
        padding: "0 10px",
        borderRadius: 7,
        fontSize: 11,
        fontFamily: "inherit",
        color: "var(--text-primary)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        cursor: "pointer",
      }}
    >
      {children}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraPostMonitoringPage() {
  // Admin scope: focused-user varsa user filter default'u o user; manuel
  // override her zaman kazanır. Scope "all" ise filter boş.
  const scope = useActiveScope();
  const scopedDefaultUser =
    scope.role === "admin" && scope.ownerUserId ? scope.ownerUserId : "";

  const [userFilter, setUserFilter] = useState<string>(scopedDefaultUser);
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    setUserFilter((prev) =>
      prev === "" || prev === scopedDefaultUser ? scopedDefaultUser : prev,
    );
  }, [scopedDefaultUser]);

  // Lookup data ----------------------------------------------------------
  const { data: users } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const { data: channels } = useQuery({
    queryKey: [
      "channel-profiles",
      userFilter || "all",
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () => fetchChannelProfiles(userFilter || undefined),
    staleTime: 60_000,
  });

  const channelById = useMemo(() => {
    const m = new Map<string, ChannelProfileResponse>();
    for (const c of channels ?? []) m.set(c.id, c);
    return m;
  }, [channels]);

  // Posts + stats --------------------------------------------------------
  const { data: stats } = usePostStats();
  const { data: capability } = usePostCapability();

  const listParams: PostListParams = useMemo(() => {
    const p: PostListParams = { limit: 200 };
    if (channelFilter) p.channel_profile_id = channelFilter;
    if (platformFilter) p.platform = platformFilter;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [channelFilter, platformFilter, statusFilter]);

  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = usePosts(listParams);
  const items: PlatformPost[] = posts ?? [];

  // Inspector hesapları --------------------------------------------------
  // Toplam, bu hafta yayın, en performanslı kanal (en çok "posted" kanal),
  // ve status dağılımı. Liste değişmedikçe yeniden hesaplanmaz.
  const summary = useMemo(() => {
    let weekPosted = 0;
    const channelPostedCount = new Map<string, number>();
    for (const p of items) {
      if (p.status === "posted" && isThisWeek(p.posted_at ?? p.created_at)) {
        weekPosted += 1;
      }
      if (p.status === "posted" && p.channel_profile_id) {
        channelPostedCount.set(
          p.channel_profile_id,
          (channelPostedCount.get(p.channel_profile_id) ?? 0) + 1,
        );
      }
    }
    let topChannelId: string | null = null;
    let topChannelCount = 0;
    for (const [cid, cnt] of channelPostedCount.entries()) {
      if (cnt > topChannelCount) {
        topChannelId = cid;
        topChannelCount = cnt;
      }
    }
    const topChannel = topChannelId ? channelById.get(topChannelId) : null;
    const topChannelLabel = topChannel
      ? topChannel.handle ?? topChannel.profile_name
      : "—";
    return { weekPosted, topChannelLabel, topChannelCount };
  }, [items, channelById]);

  // Filtre değişince channel reset
  const handleUserChange = (val: string) => {
    setUserFilter(val);
    setChannelFilter("");
  };

  // ---------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------
  const columns: AuroraColumn<PlatformPost>[] = [
    {
      key: "title",
      header: "Başlık / İçerik",
      render: (p) => (
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 320,
            }}
            title={p.title ?? p.body}
          >
            {p.title || p.body.slice(0, 60) || "—"}
          </div>
          {p.delivery_error && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--state-danger-fg)",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 320,
              }}
              title={p.delivery_error}
            >
              {p.delivery_error}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "channel",
      header: "Kanal",
      render: (p) => {
        const ch = p.channel_profile_id
          ? channelById.get(p.channel_profile_id)
          : null;
        return (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--accent-primary-hover)",
            }}
          >
            {ch?.handle ?? ch?.profile_name ?? "—"}
          </span>
        );
      },
    },
    {
      key: "platform",
      header: "Platform",
      mono: true,
      render: (p) => p.platform,
    },
    {
      key: "type",
      header: "Tür",
      render: (p) => (
        <span
          style={{ fontSize: 11, color: "var(--text-secondary)" }}
        >
          {postTypeLabel(p.post_type)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: (p) => {
        const s = statusChip(p.status);
        return <AuroraStatusChip tone={s.tone}>{s.label}</AuroraStatusChip>;
      },
    },
    {
      key: "delivery",
      header: "Teslimat",
      render: (p) => {
        const d = deliveryChip(p.delivery_status);
        return <AuroraStatusChip tone={d.tone}>{d.label}</AuroraStatusChip>;
      },
    },
    {
      key: "date",
      header: "Tarih",
      mono: true,
      align: "right",
      render: (p) => (
        <span style={{ color: "var(--text-muted)" }}>
          {timeAgo(p.posted_at ?? p.created_at)} önce
        </span>
      ),
    },
    {
      key: "external",
      header: "Dış ID",
      mono: true,
      align: "right",
      render: (p) => {
        if (!p.external_post_id) {
          return <span style={{ color: "var(--text-muted)" }}>—</span>;
        }
        // YouTube community post URL'i: /post/<id>
        const url =
          p.platform === "youtube"
            ? `https://www.youtube.com/post/${encodeURIComponent(p.external_post_id)}`
            : null;
        if (url) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                color: "var(--accent-primary-hover)",
                textDecoration: "none",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
              title="Platformda aç"
            >
              {p.external_post_id.slice(0, 10)}…
            </a>
          );
        }
        return (
          <span
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
            title={p.external_post_id}
          >
            {p.external_post_id.slice(0, 10)}…
          </span>
        );
      },
    },
  ];

  // ---------------------------------------------------------------------
  // Inspector
  // ---------------------------------------------------------------------
  const inspector = (
    <AuroraInspector title="Gönderi Özeti">
      <AuroraInspectorSection title="Genel">
        <AuroraInspectorRow
          label="toplam post"
          value={String(stats?.total ?? items.length)}
        />
        <AuroraInspectorRow
          label="bu hafta yayın"
          value={String(summary.weekPosted)}
        />
        <AuroraInspectorRow
          label="en performanslı kanal"
          value={
            summary.topChannelCount > 0
              ? `${summary.topChannelLabel} (${summary.topChannelCount})`
              : "—"
          }
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Durum dağılımı">
        <AuroraInspectorRow label="taslak" value={String(stats?.draft ?? 0)} />
        <AuroraInspectorRow label="kuyrukta" value={String(stats?.queued ?? 0)} />
        <AuroraInspectorRow
          label="gönderildi"
          value={String(stats?.posted ?? 0)}
        />
        <AuroraInspectorRow
          label="başarısız"
          value={String(stats?.failed ?? 0)}
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <div className="aurora-dashboard">
      <AuroraPageShell
        title="Gönderi İzleme"
        description="Tüm kullanıcı ve kanal gönderilerini izleyin."
        data-testid="admin-post-monitoring"
        actions={
          <Link
            to="/admin/connections"
            style={{
              fontSize: 11,
              color: "var(--accent-primary-hover)",
              textDecoration: "none",
              fontFamily: "var(--font-mono)",
            }}
            data-testid="admin-post-connection-link"
          >
            Bağlantı Durumu →
          </Link>
        }
      >
        {capability && (
          <AuroraCard
            pad="default"
            data-testid="admin-post-capability-notice"
            style={{
              marginBottom: 14,
              borderLeft: "3px solid var(--state-warning-fg)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              <strong style={{ color: "var(--state-warning-fg)" }}>
                Platform Bilgisi:
              </strong>{" "}
              {capability.note}
            </div>
          </AuroraCard>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
            flexWrap: "wrap",
            alignItems: "center",
          }}
          data-testid="admin-post-filters"
        >
          <AuroraSelect
            value={userFilter}
            onChange={handleUserChange}
            testId="admin-post-filter-user"
            ariaLabel="Kullanıcı filtresi"
          >
            <option value="">Tüm Kullanıcılar</option>
            {users?.map((u: UserResponse) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.email}
              </option>
            ))}
          </AuroraSelect>

          <AuroraSelect
            value={channelFilter}
            onChange={setChannelFilter}
            testId="admin-post-filter-channel"
            ariaLabel="Kanal filtresi"
          >
            <option value="">Tüm Kanallar</option>
            {channels?.map((ch: ChannelProfileResponse) => (
              <option key={ch.id} value={ch.id}>
                {ch.profile_name}
              </option>
            ))}
          </AuroraSelect>

          <AuroraSelect
            value={platformFilter}
            onChange={setPlatformFilter}
            testId="admin-post-filter-platform"
            ariaLabel="Platform filtresi"
          >
            {PLATFORM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </AuroraSelect>

          <AuroraSelect
            value={statusFilter}
            onChange={setStatusFilter}
            testId="admin-post-filter-status"
            ariaLabel="Durum filtresi"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </AuroraSelect>

          {(userFilter || channelFilter || platformFilter || statusFilter) && (
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setUserFilter("");
                setChannelFilter("");
                setPlatformFilter("");
                setStatusFilter("");
              }}
            >
              Temizle
            </AuroraButton>
          )}
        </div>

        {isError && (
          <AuroraCard
            pad="default"
            style={{
              marginBottom: 14,
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </AuroraCard>
        )}

        <AuroraTable<PlatformPost>
          columns={columns}
          rows={items}
          rowKey={(p) => p.id}
          loading={isLoading}
          empty={
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Seçilen filtrelerde gönderi bulunamadı.
            </span>
          }
          data-testid="post-table"
        />
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
