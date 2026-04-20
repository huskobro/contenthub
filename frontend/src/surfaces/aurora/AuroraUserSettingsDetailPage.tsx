/**
 * AuroraUserSettingsDetailPage — Aurora Dusk Cockpit / Kullanıcı Ayarları (admin).
 *
 * `admin.users.detail` slot'u için Aurora yüzeyi. Bir kullanıcının visible
 * ayarlarını ve admin override durumlarını listeler.
 *
 * Backend bağlantıları (legacy ile birebir):
 *   - useUser(userId)
 *   - useUserOverrides(userId)
 *   - useEffectiveSettings()
 *   - useDeleteUserOverride() — admin'in override'ı sıfırlama mutation'ı
 *
 * Sağ inspector: oluşturma, son login (proxy: updated_at), override sayısı.
 */

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useDeleteUserOverride,
  useUser,
  useUserOverrides,
} from "../../hooks/useUsers";
import { useEffectiveSettings } from "../../hooks/useEffectiveSettings";
import {
  AuroraButton,
  AuroraCard,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraStatusChip,
  AuroraTable,
  type AuroraColumn,
  type AuroraStatusTone,
} from "./primitives";

// ---------------------------------------------------------------------------
// Tone maps
// ---------------------------------------------------------------------------

const ROLE_TONE: Record<string, AuroraStatusTone> = {
  admin: "info",
  operator: "warning",
  viewer: "neutral",
  user: "success",
};

const STATUS_TONE: Record<string, AuroraStatusTone> = {
  active: "success",
  disabled: "neutral",
  locked: "danger",
};

interface VisibleSetting {
  key: string;
  label: string;
  effective_value: unknown;
  source: string;
  user_override_allowed?: boolean;
  read_only_for_user?: boolean;
  visible_to_user?: boolean;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s önce`;
  const day = Math.floor(hr / 24);
  return `${day}g önce`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraUserSettingsDetailPage() {
  const navigate = useNavigate();
  // Router param adı `userId`. Aurora yüzeyi de aynı param'i kullanır.
  const { userId } = useParams<{ userId: string }>();

  const { data: user, isLoading: userLoading } = useUser(userId ?? "");
  const { data: overrides, isLoading: overridesLoading } = useUserOverrides(
    userId ?? "",
  );
  const { data: settings, isLoading: settingsLoading } = useEffectiveSettings();
  const deleteOverride = useDeleteUserOverride();

  const overrideMap = useMemo(
    () => new Map((overrides ?? []).map((o) => [o.setting_key, o.value_json])),
    [overrides],
  );

  const visibleSettings: VisibleSetting[] = useMemo(
    () =>
      ((settings ?? []) as VisibleSetting[]).filter(
        (s) => s.visible_to_user === true,
      ),
    [settings],
  );

  if (!userId) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div className="card card-pad">Kullanıcı id eksik.</div>
        </div>
      </div>
    );
  }

  const isLoading = userLoading || overridesLoading || settingsLoading;

  // Inspector
  const inspector = (
    <AuroraInspector title="Kullanıcı bilgisi">
      <AuroraInspectorSection title="Genel">
        <AuroraInspectorRow
          label="oluşturma"
          value={fmtDate(user?.created_at)}
        />
        <AuroraInspectorRow
          label="son aktivite"
          value={timeAgo(user?.updated_at)}
        />
        <AuroraInspectorRow
          label="override"
          value={String(user?.override_count ?? 0)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Erişim">
        <AuroraInspectorRow
          label="rol"
          value={
            user ? (
              <AuroraStatusChip tone={ROLE_TONE[user.role] ?? "neutral"}>
                {user.role}
              </AuroraStatusChip>
            ) : (
              "—"
            )
          }
        />
        <AuroraInspectorRow
          label="durum"
          value={
            user ? (
              <AuroraStatusChip tone={STATUS_TONE[user.status] ?? "neutral"}>
                {user.status}
              </AuroraStatusChip>
            ) : (
              "—"
            )
          }
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Hızlı erişim">
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={() => navigate("/admin/users")}
          style={{ width: "100%" }}
        >
          ← Kullanıcı listesi
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  // Tablo kolonları
  const columns: AuroraColumn<VisibleSetting>[] = [
    {
      key: "setting",
      header: "Ayar",
      render: (s) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              marginTop: 2,
            }}
          >
            {s.key}
          </div>
        </div>
      ),
    },
    {
      key: "effective",
      header: "Effective",
      render: (s) => (
        <code
          style={{
            background: "var(--bg-inset)",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
        >
          {String(s.effective_value ?? "—")}
        </code>
      ),
    },
    {
      key: "source",
      header: "Kaynak",
      render: (s) => {
        const tone: AuroraStatusTone =
          s.source === "user_override"
            ? "warning"
            : s.source === "admin"
            ? "info"
            : "neutral";
        return <AuroraStatusChip tone={tone}>{s.source}</AuroraStatusChip>;
      },
    },
    {
      key: "override",
      header: "Override",
      render: (s) => {
        const has = overrideMap.has(s.key);
        return has ? (
          <code
            style={{
              background: "rgba(217, 165, 89, 0.15)",
              color: "var(--state-warning-fg)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          >
            {String(overrideMap.get(s.key))}
          </code>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
        );
      },
    },
    {
      key: "governance",
      header: "Yetki",
      align: "center",
      render: (s) => (
        <div
          style={{
            display: "flex",
            gap: 4,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {s.user_override_allowed && (
            <AuroraStatusChip tone="success">override</AuroraStatusChip>
          )}
          {s.read_only_for_user && (
            <AuroraStatusChip tone="neutral">readonly</AuroraStatusChip>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "İşlem",
      align: "right",
      render: (s) => {
        const has = overrideMap.has(s.key);
        return has ? (
          <AuroraButton
            variant="danger"
            size="sm"
            disabled={deleteOverride.isPending}
            onClick={() =>
              deleteOverride.mutate({ userId, settingKey: s.key })
            }
          >
            Sıfırla
          </AuroraButton>
        ) : null;
      },
    },
  ];

  return (
    <div className="aurora-dashboard" data-testid="aurora-user-settings-detail">
      <div className="page">
        {/* Breadcrumb */}
        <nav className="breadcrumbs caption" aria-label="Konum">
          <span>
            <a href="/admin/users">Kullanıcılar</a>
            <span className="sep"> / </span>
          </span>
          <span>{user?.display_name ?? "…"}</span>
        </nav>

        {/* Header */}
        <div className="page-head">
          <div>
            <h1>{user?.display_name ?? "…"} — Ayarlar</h1>
            <div className="sub">
              {user
                ? `${user.email} · ${visibleSettings.length} görünür ayar`
                : "Yükleniyor…"}
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            {user && (
              <>
                <AuroraStatusChip tone={ROLE_TONE[user.role] ?? "neutral"}>
                  {user.role}
                </AuroraStatusChip>
                <AuroraStatusChip tone={STATUS_TONE[user.status] ?? "neutral"}>
                  {user.status}
                </AuroraStatusChip>
                <AuroraStatusChip
                  tone={user.override_count > 0 ? "warning" : "neutral"}
                >
                  {user.override_count} override
                </AuroraStatusChip>
              </>
            )}
          </div>
        </div>

        {/* User info card */}
        {user && (
          <AuroraCard pad="default">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background:
                    user.role === "admin"
                      ? "var(--accent-primary)"
                      : "var(--state-success-fg)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {(user.display_name || "?")[0]?.toUpperCase()}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  fontSize: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {user.display_name}
                </span>
                <span style={{ color: "var(--text-muted)" }}>|</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {user.email}
                </span>
                <span style={{ color: "var(--text-muted)" }}>|</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                  }}
                >
                  {user.slug}
                </span>
              </div>
            </div>
          </AuroraCard>
        )}

        {/* Override panel — settings table */}
        <div className="section" style={{ marginTop: 16 }}>
          <header className="section-head">
            <div>
              <h3>Ayar override paneli</h3>
              <div className="caption">
                Kullanıcıya görünür ayarlar; admin override sıfırlayabilir
              </div>
            </div>
          </header>
          <AuroraTable<VisibleSetting>
            columns={columns}
            rows={visibleSettings}
            rowKey={(s) => s.key}
            loading={isLoading}
            empty={
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Kullanıcıya görünür ayar bulunmuyor.
              </span>
            }
          />
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
