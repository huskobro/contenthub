/**
 * UserSettingsPage — user's own settings page (M40).
 *
 * Shows only settings where visible_to_user=true.
 * Editable settings (user_override_allowed && !read_only_for_user) show inline edit.
 * Users can reset their overrides to admin defaults.
 *
 * Horizon design system: PageShell, SectionShell, ActionButton, StatusBadge, FilterInput.
 */

import { useState } from "react";
import { useActiveUser, useUserOverrides, useSetUserOverride, useDeleteUserOverride } from "../hooks/useUsers";
import { useEffectiveSettings } from "../hooks/useEffectiveSettings";
import type { EffectiveSetting } from "../api/effectiveSettingsApi";
import {
  PageShell,
  SectionShell,
  ActionButton,
  StatusBadge,
  FilterInput,
  FilterSelect,
} from "../components/design-system/primitives";
import { EmptyState } from "../components/design-system/EmptyState";
import { SkeletonTable } from "../components/design-system/Skeleton";
import { SurfacePickerSection } from "../components/surfaces/SurfacePickerSection";

function SettingEditor({
  settingKey,
  label,
  helpText,
  effectiveValue,
  source,
  type,
  hasOverride,
  overrideAllowed,
  readOnly,
  userId,
}: {
  settingKey: string;
  label: string;
  helpText: string;
  effectiveValue: unknown;
  source: string;
  type: string;
  hasOverride: boolean;
  overrideAllowed: boolean;
  readOnly: boolean;
  userId: string;
}) {
  const setOverride = useSetUserOverride();
  const deleteOverride = useDeleteUserOverride();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(effectiveValue ?? ""));

  const canEdit = overrideAllowed && !readOnly;

  function handleSave() {
    let value: unknown = draft;
    if (type === "integer") value = parseInt(draft, 10);
    else if (type === "float") value = parseFloat(draft);
    else if (type === "boolean") value = draft === "true";

    setOverride.mutate({ userId, settingKey, value });
    setEditing(false);
  }

  function handleReset() {
    deleteOverride.mutate({ userId, settingKey });
    setEditing(false);
  }

  return (
    <div className="px-4 py-3 border-b border-border-subtle last:border-b-0 hover:bg-brand-50 transition-colors duration-fast">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-neutral-800">{label}</span>
            {source === "user_override" ? (
              <StatusBadge status="warning" label="ozellestirildi" size="sm" />
            ) : (
              <StatusBadge status="neutral" label="varsayilan" size="sm" />
            )}
          </div>
          {helpText && (
            <div className="text-sm text-neutral-500 mt-0.5">{helpText}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              {type === "boolean" ? (
                <FilterSelect
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="py-1 px-2 text-sm"
                >
                  <option value="true">Evet</option>
                  <option value="false">Hayir</option>
                </FilterSelect>
              ) : (
                <FilterInput
                  className="py-1 px-2 text-sm w-48"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                />
              )}
              <ActionButton variant="primary" size="sm" onClick={handleSave}>
                Kaydet
              </ActionButton>
              <ActionButton variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Iptal
              </ActionButton>
            </>
          ) : (
            <>
              <code className="text-sm bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800">
                {String(effectiveValue ?? "\u2014")}
              </code>
              {canEdit && (
                <ActionButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft(String(effectiveValue ?? ""));
                    setEditing(true);
                  }}
                >
                  Duzenle
                </ActionButton>
              )}
              {hasOverride && (
                <ActionButton
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  title="Varsayilana don"
                >
                  Sifirla
                </ActionButton>
              )}
              {!canEdit && (
                <span className="text-xs text-neutral-400 italic">salt okunur</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function UserSettingsPage() {
  const { activeUser, activeUserId } = useActiveUser();
  const { data: settings, isLoading: settingsLoading } = useEffectiveSettings();
  const { data: overrides } = useUserOverrides(activeUserId ?? "");

  if (!activeUser) {
    return (
      <PageShell title="Ayarlarim" testId="user-settings">
        <EmptyState
          illustration="no-data"
          title="Kullanici secilmedi"
          description="Ayarlarinizi gorebilmek icin sidebar'dan bir kullanici secin"
        />
      </PageShell>
    );
  }

  const overrideKeys = new Set((overrides ?? []).map((o) => o.setting_key));

  // Groups that must never appear in the user panel even if backend
  // `visible_to_user` flags accidentally allow them. These are admin-only
  // technical concerns (workspace paths, exports directory, pipeline
  // timeouts) that leak in M22/M23 migrations.
  //
  // F45 (critical UX fix pack): Kullanıcı ayarlar sayfasında
  // "Çıktı Klasörü" gibi sunucu tarafı path ayarları görünüyordu.
  // CLAUDE.md: "User panel must stay simple. Do not expose unnecessary
  // technical detail by default." — burası son kapı.
  const USER_SETTINGS_DENYLIST_GROUPS = new Set<string>([
    "execution",
  ]);

  // Filter to visible_to_user settings AND drop admin-only groups.
  const visibleSettings = (settings ?? []).filter((s) => {
    if (s.visible_to_user !== true) return false;
    const group = (s.group as string | undefined) ?? "";
    if (USER_SETTINGS_DENYLIST_GROUPS.has(group.toLowerCase())) return false;
    return true;
  });

  // Group by group
  const groups = new Map<string, EffectiveSetting[]>();
  for (const s of visibleSettings) {
    const g = s.group || "general";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }

  return (
    <PageShell
      title="Ayarlarim"
      subtitle={`${activeUser.display_name} — kisisel ayarlari goruntule ve duzenle`}
      testId="user-settings"
    >
      {/* Surface picker — Faz 4A. Kullanici kendi paneli icin yuzey secer. */}
      <SurfacePickerSection scope="user" />

      {settingsLoading ? (
        <SectionShell flush>
          <SkeletonTable columns={3} rows={4} />
        </SectionShell>
      ) : visibleSettings.length === 0 ? (
        <EmptyState
          illustration="no-data"
          title="Goruntulenebilir ayar bulunmuyor"
          description="Admin tarafindan kullaniciya gorunen ayar tanimlanmamis."
        />
      ) : (
        Array.from(groups.entries()).map(([group, items]) => (
          <SectionShell
            key={group}
            title={group.charAt(0).toUpperCase() + group.slice(1)}
            flush
            testId={`user-settings-group-${group}`}
          >
            {items.map((s) => (
              <SettingEditor
                key={s.key as string}
                settingKey={s.key as string}
                label={s.label as string}
                helpText={(s.help_text as string) || ""}
                effectiveValue={s.effective_value}
                source={s.source as string}
                type={s.type as string}
                hasOverride={overrideKeys.has(s.key as string)}
                overrideAllowed={s.user_override_allowed === true}
                readOnly={s.read_only_for_user === true}
                userId={activeUser.id}
              />
            ))}
          </SectionShell>
        ))
      )}
    </PageShell>
  );
}
