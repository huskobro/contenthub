/**
 * AuroraAdminConnectionsPage — Aurora Dusk Cockpit / Admin Connections.
 *
 * `/admin/connections` rotası için Aurora override.
 * Slot key: `admin.connections` (register.tsx içinde bağlanır; bu dosya
 * sadece sayfa bileşenini sağlar — register.tsx'e dokunulmaz).
 *
 * Tasarım:
 *   - PageShell: breadcrumb (Settings → Connections), başlık + alt başlık
 *   - Sol/üst: connection kartları — platform avatar/icon, kanal adı,
 *     status chip, expires (token), refresh + disconnect butonları
 *   - Sağ: AuroraInspector — toplam bağlantı, sağlıklı/kısmi/kopuk/reauth
 *     sayımları, yetenek özeti ve "en eski refresh" göstergesi
 *   - Tablo görünümü: AuroraTable ile tüm bağlantıların liste özetı
 *
 * Veri kaynağı: useAdminConnections() — Connection Center API.
 * Hiçbir legacy code değiştirilmez; admin.connections slot'una
 * `useSurfacePageOverride("admin.connections")` ile devredilir.
 */
import { useMemo, useState } from "react";
import { useAdminConnections } from "../../hooks/useConnections";
import { useDeletePlatformConnection } from "../../hooks/useDeletePlatformConnection";
import { useToast } from "../../hooks/useToast";
import type {
  ConnectionWithHealth,
  ConnectionHealthKPIs,
} from "../../api/platformConnectionsApi";
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
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Tone maps
// ---------------------------------------------------------------------------

const HEALTH_TONE: Record<
  string,
  { tone: AuroraStatusTone; label: string }
> = {
  healthy: { tone: "success", label: "sağlıklı" },
  partial: { tone: "warning", label: "kısmi" },
  disconnected: { tone: "neutral", label: "kopuk" },
  reauth_required: { tone: "danger", label: "tekrar yetki" },
  token_issue: { tone: "danger", label: "token sorunu" },
};

function healthToneOf(level: string): { tone: AuroraStatusTone; label: string } {
  return (
    HEALTH_TONE[level] ?? { tone: "neutral", label: level || "—" }
  );
}

const PLATFORM_ICON: Record<string, string> = {
  youtube: "▶",
  twitter: "X",
  x: "X",
  facebook: "f",
  instagram: "◎",
  linkedin: "in",
  tiktok: "T",
  google: "G",
};

function platformGlyph(p: string): string {
  return PLATFORM_ICON[p?.toLowerCase()] ?? (p?.slice(0, 1)?.toUpperCase() || "?");
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 0) return "şimdi";
  const sec = Math.max(1, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const d = Math.floor(hr / 24);
  return `${d}g`;
}

// ---------------------------------------------------------------------------
// Connection card (sol/üst)
// ---------------------------------------------------------------------------

interface ConnectionCardProps {
  conn: ConnectionWithHealth;
  selected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
  /** Disconnect mutation in flight for this connection — disable button. */
  disconnectPending?: boolean;
  /** List refetch in flight — disable refresh button + show pending label. */
  refreshPending?: boolean;
}

function ConnectionCard({
  conn,
  selected,
  onSelect,
  onRefresh,
  onDisconnect,
  disconnectPending,
  refreshPending,
}: ConnectionCardProps) {
  const tone = healthToneOf(conn.health.health_level);
  const healthy = conn.health.health_level === "healthy";

  return (
    <AuroraCard
      pad="default"
      onClick={onSelect}
      style={{
        marginBottom: 12,
        cursor: "pointer",
        outline: selected ? "1px solid var(--accent-primary)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {conn.external_avatar_url ? (
          <img
            src={conn.external_avatar_url}
            alt=""
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              objectFit: "cover",
              border: "1px solid var(--border-default)",
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: healthy ? "var(--gradient-brand)" : "var(--bg-inset)",
              display: "grid",
              placeItems: "center",
              fontSize: 16,
              fontWeight: 700,
              color: healthy ? "#fff" : "var(--text-muted)",
              border: healthy ? "none" : "1px solid var(--border-default)",
            }}
          >
            {platformGlyph(conn.platform)}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {conn.external_account_name || conn.external_account_id || "—"}
            {conn.is_primary && (
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--accent-primary)",
                }}
              >
                birincil
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            {conn.platform} · {conn.channel_profile_name || "—"} ·{" "}
            {conn.user_display_name || conn.user_id?.slice(0, 8) || "—"}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            son senkron {timeAgo(conn.last_sync_at)} · token {conn.token_state}
          </div>
        </div>

        <AuroraStatusChip tone={tone.tone}>● {tone.label}</AuroraStatusChip>
      </div>

      {conn.health.issues && conn.health.issues.length > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            background: "var(--state-warning-bg, var(--bg-inset))",
            borderRadius: 8,
            fontSize: 11,
            color: "var(--state-warning-fg)",
          }}
        >
          {conn.health.issues[0]}
          {conn.health.issues.length > 1
            ? ` (+${conn.health.issues.length - 1} daha)`
            : ""}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid var(--border-subtle)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
            marginRight: "auto",
          }}
        >
          son başarı {timeAgo(conn.last_success_at)}
        </span>
        <AuroraButton
          variant="secondary"
          size="sm"
          disabled={refreshPending}
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          iconLeft={<Icon name="refresh" size={11} />}
        >
          {refreshPending ? "Yenileniyor…" : "Yenile"}
        </AuroraButton>
        <AuroraButton
          variant="danger"
          size="sm"
          disabled={disconnectPending}
          onClick={(e) => {
            e.stopPropagation();
            onDisconnect();
          }}
          iconLeft={<Icon name="link" size={11} />}
        >
          {disconnectPending ? "Kesiliyor…" : "Bağlantıyı kes"}
        </AuroraButton>
      </div>
    </AuroraCard>
  );
}

// ---------------------------------------------------------------------------
// Inspector (sağ)
// ---------------------------------------------------------------------------

interface InspectorProps {
  kpis: ConnectionHealthKPIs | null;
  total: number;
  oldestRefresh: string | null;
  selected: ConnectionWithHealth | null;
}

function Inspector({ kpis, total, oldestRefresh, selected }: InspectorProps) {
  const expired = (kpis?.reauth_required ?? 0) + (kpis?.token_issue ?? 0);
  const active = kpis?.healthy ?? 0;
  return (
    <AuroraInspector title="Bağlantı sağlığı">
      <AuroraInspectorSection title="Genel">
        <AuroraInspectorRow label="toplam" value={String(kpis?.total ?? total)} />
        <AuroraInspectorRow label="aktif" value={String(active)} />
        <AuroraInspectorRow label="kısmi" value={String(kpis?.partial ?? 0)} />
        <AuroraInspectorRow label="kopuk" value={String(kpis?.disconnected ?? 0)} />
        <AuroraInspectorRow label="expired / reauth" value={String(expired)} />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="En eski refresh">
        <AuroraInspectorRow label="tarih" value={fmtDateTime(oldestRefresh)} />
        <AuroraInspectorRow label="yaş" value={timeAgo(oldestRefresh)} />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Yetenek">
        <AuroraInspectorRow
          label="yayın"
          value={`${kpis?.can_publish_ok ?? 0}/${kpis?.total ?? total}`}
        />
        <AuroraInspectorRow
          label="yorum"
          value={`${kpis?.can_read_comments_ok ?? 0}/${kpis?.total ?? total}`}
        />
        <AuroraInspectorRow
          label="analitik"
          value={`${kpis?.can_read_analytics_ok ?? 0}/${kpis?.total ?? total}`}
        />
        <AuroraInspectorRow
          label="senkron"
          value={`${kpis?.can_sync_channel_info_ok ?? 0}/${kpis?.total ?? total}`}
        />
      </AuroraInspectorSection>

      {selected && (
        <AuroraInspectorSection title="Seçili bağlantı">
          <AuroraInspectorRow
            label="hesap"
            value={selected.external_account_name || "—"}
          />
          <AuroraInspectorRow label="platform" value={selected.platform} />
          <AuroraInspectorRow
            label="kanal"
            value={selected.channel_profile_name || "—"}
          />
          <AuroraInspectorRow label="auth" value={selected.auth_state} />
          <AuroraInspectorRow label="token" value={selected.token_state} />
          <AuroraInspectorRow label="scope" value={selected.scope_status} />
          <AuroraInspectorRow
            label="durum"
            value={healthToneOf(selected.health.health_level).label}
          />
          <AuroraInspectorRow
            label="son sync"
            value={fmtDateTime(selected.last_sync_at)}
          />
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraAdminConnectionsPage() {
  const toast = useToast();
  const deleteMutation = useDeletePlatformConnection();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [pendingDisconnectId, setPendingDisconnectId] = useState<string | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);

  const conQ = useAdminConnections({ limit: 100 });
  const items = conQ.data?.items ?? [];
  const kpis = conQ.data?.kpis ?? null;
  const total = conQ.data?.total ?? items.length;

  const oldestRefresh = useMemo(() => {
    let oldest: string | null = null;
    for (const c of items) {
      const t = c.last_sync_at;
      if (!t) continue;
      if (oldest === null || new Date(t).getTime() < new Date(oldest).getTime()) {
        oldest = t;
      }
    }
    return oldest;
  }, [items]);

  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) ?? null,
    [items, selectedId],
  );

  /**
   * Refresh handler — yalnızca listeyi yeniden çeker.
   *
   * Backend tarafında per-connection token refresh endpoint'i (`POST
   * /platform-connections/{id}/refresh-token` gibi) henüz yok; bu yüzden
   * "Yenile" butonu sadece listeyi (sağlık ve token state dahil) yeniden
   * çeker. Yanıltıcı bir yere navigate etmez. Reauth gerekiyorsa kullanıcı
   * panelinde `/user/connections` üzerinden OAuth akışı tetiklenir.
   *
   * Pass-6 closure (manual-QA report): kullanıcı eski "anında refetch + tek
   * toast" davranışını "hiçbir şey olmadı" diye raporladı çünkü visible
   * feedback tek toast'a bağlıydı. Şimdi: pending state (button disabled +
   * "Yenileniyor..." metni) + await refetch + dürüst toast (ok/err) + üst
   * sağda "Son güncelleme: X sn önce" chip'i (bkz. lastRefreshAt state).
   */
  const handleRefresh = async (_conn?: ConnectionWithHealth) => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const result = await conQ.refetch();
      if (result.isError) {
        toast.error("Liste yenilenemedi");
      } else {
        setLastRefreshAt(Date.now());
        toast.success("Bağlantı listesi güncellendi");
      }
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Disconnect handler — gerçek DELETE mutation, confirm sonrası.
   *
   * Backend: `DELETE /api/v1/platform-connections/{id}` (204).
   * Audit log otomatik olarak server tarafında atılır (audit_log servisi
   * connection silme olayını yakalar). Token revoke da backend tarafında
   * elden geldiğince yapılır.
   */
  const handleDisconnect = (conn: ConnectionWithHealth) => {
    const label =
      conn.external_account_name ||
      conn.external_account_id ||
      conn.platform ||
      "bu bağlantı";
    const confirmed = window.confirm(
      `${label} bağlantısı silinecek. OAuth token revoke edilecek ve ` +
        `denetim kaydı oluşturulacak. Emin misiniz?`,
    );
    if (!confirmed) return;
    setPendingDisconnectId(conn.id);
    deleteMutation.mutate(conn.id, {
      onSuccess: () => {
        toast.success(`${label} bağlantısı kesildi`);
        if (selectedId === conn.id) setSelectedId(null);
        setPendingDisconnectId(null);
      },
      onError: () => {
        // useApiError zaten toast atıyor; sadece pending state'i temizliyoruz
        setPendingDisconnectId(null);
      },
    });
  };

  const tableColumns: AuroraColumn<ConnectionWithHealth>[] = [
    {
      key: "account",
      header: "Hesap",
      render: (c) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>
            {c.external_account_name || "—"}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
            }}
          >
            {c.platform} · {c.channel_profile_name || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "user",
      header: "Kullanıcı",
      render: (c) => c.user_display_name || c.user_id?.slice(0, 8) || "—",
    },
    {
      key: "status",
      header: "Durum",
      render: (c) => {
        const t = healthToneOf(c.health.health_level);
        return <AuroraStatusChip tone={t.tone}>● {t.label}</AuroraStatusChip>;
      },
    },
    {
      key: "token",
      header: "Token",
      mono: true,
      render: (c) => c.token_state,
    },
    {
      key: "sync",
      header: "Son sync",
      mono: true,
      render: (c) => timeAgo(c.last_sync_at),
    },
    {
      key: "actions",
      header: "Aksiyonlar",
      align: "right",
      render: (c) => (
        <div
          style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}
          onClick={(e) => e.stopPropagation()}
        >
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={() => handleRefresh(c)}
            iconLeft={<Icon name="refresh" size={11} />}
          >
            Yenile
          </AuroraButton>
          <AuroraButton
            variant="danger"
            size="sm"
            disabled={pendingDisconnectId === c.id}
            onClick={() => handleDisconnect(c)}
          >
            {pendingDisconnectId === c.id ? "Kesiliyor…" : "Kes"}
          </AuroraButton>
        </div>
      ),
    },
  ];

  const breadcrumbs = [
    { label: "Settings", href: "/admin/settings" },
    { label: "Connections" },
  ];

  return (
    <div className="aurora-dashboard">
      <AuroraPageShell
        title="Bağlantı izleme"
        breadcrumbs={breadcrumbs}
        description={`Tüm platform bağlantılarının sağlık ve token durumu · ${total} kayıt`}
        actions={
          <>
            <AuroraButton
              variant={view === "cards" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setView("cards")}
            >
              Kart
            </AuroraButton>
            <AuroraButton
              variant={view === "table" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setView("table")}
            >
              Tablo
            </AuroraButton>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={() => void handleRefresh()}
              iconLeft={<Icon name="refresh" size={11} />}
              disabled={refreshing}
            >
              {refreshing ? "Yenileniyor…" : "Yenile"}
            </AuroraButton>
            {lastRefreshAt !== null && !refreshing && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  alignSelf: "center",
                  marginLeft: 4,
                }}
                title={new Date(lastRefreshAt).toLocaleString()}
              >
                ✓ {Math.max(1, Math.round((Date.now() - lastRefreshAt) / 1000))} sn
                önce
              </span>
            )}
          </>
        }
        data-testid="aurora-admin-connections"
      >
        {conQ.isLoading ? (
          <AuroraCard pad="default" style={{ textAlign: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Yükleniyor…</span>
          </AuroraCard>
        ) : conQ.isError ? (
          <AuroraCard pad="default" style={{ textAlign: "center" }}>
            <span style={{ color: "var(--state-danger-fg)" }}>
              Bağlantılar yüklenemedi.
            </span>
          </AuroraCard>
        ) : items.length === 0 ? (
          <AuroraCard pad="default" style={{ textAlign: "center", padding: 32 }}>
            <span style={{ color: "var(--text-muted)" }}>
              Henüz bağlı bir platform yok.
            </span>
          </AuroraCard>
        ) : view === "cards" ? (
          <div>
            {items.map((c) => (
              <ConnectionCard
                key={c.id}
                conn={c}
                selected={c.id === selectedId}
                onSelect={() => setSelectedId(c.id)}
                onRefresh={() => handleRefresh(c)}
                onDisconnect={() => handleDisconnect(c)}
                disconnectPending={pendingDisconnectId === c.id}
                refreshPending={refreshing}
              />
            ))}
          </div>
        ) : (
          <AuroraTable
            columns={tableColumns}
            rows={items}
            rowKey={(c) => c.id}
            selectedKey={selectedId}
            onRowClick={(c) => setSelectedId(c.id)}
          />
        )}
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">
        <Inspector
          kpis={kpis}
          total={total}
          oldestRefresh={oldestRefresh}
          selected={selected}
        />
      </aside>
    </div>
  );
}

export default AuroraAdminConnectionsPage;
