/**
 * UserSettingsDetailPage — admin view of a user's effective settings (M40).
 *
 * Shows all visible_to_user settings with:
 * - Admin default value
 * - User override value (if any)
 * - Effective value (computed)
 * - Governance badges (override allowed, read-only, etc.)
 * - Admin can clear overrides
 *
 * Horizon design system: PageShell, SectionShell, DataTable, StatusBadge, ActionButton.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useUser, useUserOverrides, useDeleteUserOverride } from "../../hooks/useUsers";
import { useEffectiveSettings } from "../../hooks/useEffectiveSettings";
import {
  PageShell,
  SectionShell,
  DataTable,
  StatusBadge,
  ActionButton,
} from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

interface VisibleSetting {
  key: string;
  label: string;
  effective_value: unknown;
  source: string;
  user_override_allowed?: boolean;
  read_only_for_user?: boolean;
  visible_to_user?: boolean;
}

function UserAvatar({ name, role }: { name: string; role: string }) {
  const letter = (name || "?")[0].toUpperCase();
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0",
        role === "admin" ? "bg-brand-600" : "bg-emerald-600",
      )}
    >
      {letter}
    </div>
  );
}

export function UserSettingsDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useUser(userId ?? "");
  const { data: overrides, isLoading: overridesLoading } = useUserOverrides(userId ?? "");
  const { data: settings, isLoading: settingsLoading } = useEffectiveSettings();
  const deleteOverride = useDeleteUserOverride();

  if (!userId) return null;

  const isLoading = userLoading || overridesLoading || settingsLoading;

  // Build override map for quick lookup
  const overrideMap = new Map(
    (overrides ?? []).map((o) => [o.setting_key, o.value_json]),
  );

  // Filter to visible_to_user settings
  const visibleSettings: VisibleSetting[] = (settings ?? []).filter(
    (s) => s.visible_to_user === true,
  ) as VisibleSetting[];

  const columns = [
    {
      key: "setting",
      header: "Ayar",
      render: (s: VisibleSetting) => (
        <div>
          <div className="font-medium text-neutral-800">{s.label}</div>
          <div className="text-xs text-neutral-500 font-mono mt-0.5">{s.key}</div>
        </div>
      ),
    },
    {
      key: "effective",
      header: "Effective",
      render: (s: VisibleSetting) => (
        <code className="text-sm bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800">
          {String(s.effective_value ?? "\u2014")}
        </code>
      ),
    },
    {
      key: "source",
      header: "Kaynak",
      render: (s: VisibleSetting) => (
        <StatusBadge
          status={
            s.source === "user_override"
              ? "warning"
              : s.source === "admin"
                ? "info"
                : "neutral"
          }
          label={s.source}
        />
      ),
    },
    {
      key: "override",
      header: "Override",
      render: (s: VisibleSetting) => {
        const has = overrideMap.has(s.key);
        return has ? (
          <code className="text-sm bg-warning-light text-warning-text px-1.5 py-0.5 rounded">
            {overrideMap.get(s.key)}
          </code>
        ) : (
          <span className="text-sm text-neutral-400">—</span>
        );
      },
    },
    {
      key: "governance",
      header: "Yetki",
      align: "center" as const,
      render: (s: VisibleSetting) => (
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {s.user_override_allowed && (
            <StatusBadge status="success" label="override" size="sm" />
          )}
          {s.read_only_for_user && (
            <StatusBadge status="neutral" label="readonly" size="sm" />
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Islem",
      align: "right" as const,
      render: (s: VisibleSetting) => {
        const has = overrideMap.has(s.key);
        return has ? (
          <ActionButton
            variant="danger"
            size="sm"
            onClick={() =>
              deleteOverride.mutate({
                userId: userId,
                settingKey: s.key,
              })
            }
          >
            Sifirla
          </ActionButton>
        ) : null;
      },
    },
  ];

  return (
    <PageShell
      title={`${user?.display_name ?? "..."} — Ayarlar`}
      subtitle="Kullanici ayarlarini goruntuleyin, override durumlarini yonetin"
      testId="user-settings-detail"
      breadcrumb={[
        { label: "Kullanicilar", to: "/admin/users" },
        { label: user?.display_name ?? "..." },
      ]}
    >
      {/* User info strip */}
      {user && (
        <SectionShell testId="user-info-strip">
          <div className="flex items-center gap-3 text-base">
            <UserAvatar name={user.display_name} role={user.role} />
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-medium text-neutral-800">{user.display_name}</span>
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-600">{user.email}</span>
              <span className="text-neutral-400">|</span>
              <span className="font-mono text-sm text-neutral-500">{user.slug}</span>
            </div>
            <div className="ml-auto shrink-0">
              <StatusBadge
                status={user.override_count > 0 ? "warning" : "neutral"}
                label={`${user.override_count} override`}
              />
            </div>
          </div>
        </SectionShell>
      )}

      {/* Settings table */}
      <SectionShell flush testId="user-settings-table-section">
        <DataTable<VisibleSetting>
          columns={columns}
          data={visibleSettings}
          keyFn={(s) => s.key}
          loading={isLoading}
          emptyMessage="Kullaniciya gorunur ayar bulunmuyor"
          testId="user-settings-table"
        />
      </SectionShell>
    </PageShell>
  );
}
