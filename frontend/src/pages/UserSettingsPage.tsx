/**
 * UserSettingsPage — user's own settings page (M40).
 *
 * Shows only settings where visible_to_user=true.
 * Editable settings (user_override_allowed && !read_only_for_user) show inline edit.
 * Users can reset their overrides to admin defaults.
 */

import { useState } from "react";
import { useActiveUser, useUserOverrides, useSetUserOverride, useDeleteUserOverride } from "../hooks/useUsers";
import { useEffectiveSettings } from "../hooks/useEffectiveSettings";
import type { EffectiveSetting } from "../api/effectiveSettingsApi";
import { cn } from "../lib/cn";

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
    <div className="px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-800">{label}</span>
            {source === "user_override" && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-medium">
                ozellestirildi
              </span>
            )}
            {source !== "user_override" && (
              <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-400 text-[10px] rounded font-medium">
                varsayilan
              </span>
            )}
          </div>
          {helpText && (
            <div className="text-xs text-neutral-400 mt-0.5">{helpText}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              {type === "boolean" ? (
                <select
                  className="px-2 py-1 border border-neutral-300 rounded text-sm"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                >
                  <option value="true">Evet</option>
                  <option value="false">Hayir</option>
                </select>
              ) : (
                <input
                  className="px-2 py-1 border border-neutral-300 rounded text-sm w-48"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                />
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-2 py-1 bg-brand-600 text-white text-xs rounded cursor-pointer hover:bg-brand-700"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-2 py-1 text-neutral-500 text-xs cursor-pointer hover:text-neutral-700"
              >
                Iptal
              </button>
            </>
          ) : (
            <>
              <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">
                {String(effectiveValue ?? "—")}
              </code>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(String(effectiveValue ?? ""));
                    setEditing(true);
                  }}
                  className="px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded cursor-pointer"
                >
                  Duzenle
                </button>
              )}
              {hasOverride && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 text-xs text-neutral-400 hover:text-red-600 cursor-pointer"
                  title="Varsayilana don"
                >
                  Sifirla
                </button>
              )}
              {!canEdit && (
                <span className="text-[10px] text-neutral-300 italic">salt okunur</span>
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
      <div className="p-6 text-center text-neutral-400">
        Ayarlarinizi gorebilmek icin bir kullanici secin
      </div>
    );
  }

  const overrideKeys = new Set((overrides ?? []).map((o) => o.setting_key));

  // Filter to visible_to_user settings
  const visibleSettings = (settings ?? []).filter(
    (s) => s.visible_to_user === true,
  );

  // Group by group
  const groups = new Map<string, EffectiveSetting[]>();
  for (const s of visibleSettings) {
    const g = s.group || "general";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Ayarlarim</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {activeUser.display_name} — kisisel ayarlari goruntule ve duzenle
      </p>

      {settingsLoading ? (
        <div className="text-center py-12 text-neutral-400">Yukleniyor...</div>
      ) : visibleSettings.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          Goruntulenebilir ayar bulunmuyor
        </div>
      ) : (
        Array.from(groups.entries()).map(([group, items]) => (
          <div key={group} className="mb-6">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-4 mb-2">
              {group}
            </h2>
            <div className="bg-white rounded-lg border border-neutral-200">
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
            </div>
          </div>
        ))
      )}
    </div>
  );
}
