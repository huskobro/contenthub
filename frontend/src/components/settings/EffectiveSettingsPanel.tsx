/**
 * EffectiveSettingsPanel — M10-E.
 *
 * Tum bilinen ayarlari grup bazli gosterir. Her ayar icin:
 *   - Effective deger (coerced, maskelenmis)
 *   - Kaynak (admin / default / env / builtin / missing)
 *   - Wired/Deferred durumu
 *   - wired_to bilgisi
 *   - Admin degeri girme/degistirme
 *
 * Wave 1 Final: Tailwind classes, useAutoSave, useSearchFocus integrated.
 */

import { useState, useRef } from "react";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import {
  useEffectiveSettings,
  useSettingsGroups,
  useUpdateSettingValue,
} from "../../hooks/useEffectiveSettings";
import { useToast } from "../../hooks/useToast";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useSearchFocus } from "../../hooks/useSearchFocus";
import { cn } from "../../lib/cn";
import type { EffectiveSetting, GroupSummary } from "../../api/effectiveSettingsApi";

// ---------------------------------------------------------------------------
// Auto-save status indicator
// ---------------------------------------------------------------------------

function AutoSaveStatus({
  isDirty,
  isSaving,
  error,
}: {
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <span className="text-xs text-error-dark">
        Hata
      </span>
    );
  }
  if (isSaving) {
    return (
      <span className="text-xs text-warning-text">
        Kaydediliyor...
      </span>
    );
  }
  if (isDirty) {
    return (
      <span className="text-xs text-neutral-500">
        Kaydedilmedi
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Badge components
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  const badgeClasses: Record<string, string> = {
    admin: "bg-info-light text-brand-800",
    default: "bg-neutral-100 text-neutral-700",
    env: "bg-warning-light text-warning-text",
    builtin: "bg-brand-100 text-brand-700",
    missing: "bg-error-light text-error-text",
  };
  const c = badgeClasses[source] ?? badgeClasses.missing;

  return (
    <span
      className={cn("inline-block px-2 py-1 rounded-full text-xs font-semibold", c)}
      data-testid={`source-badge-${source}`}
    >
      {source.toUpperCase()}
    </span>
  );
}

function WiredBadge({ wired }: { wired: boolean }) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-1 rounded-sm text-xs font-semibold",
        wired ? "bg-success-light text-success-text" : "bg-warning-light text-warning-text",
      )}
      data-testid={wired ? "badge-wired" : "badge-deferred"}
    >
      {wired ? "WIRED" : "DEFERRED"}
    </span>
  );
}

function GroupCountBadge({ count, color }: { count: number; color: string }) {
  return (
    <span
      className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-neutral-100"
      style={{ color }}
    >
      {count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single setting row
// ---------------------------------------------------------------------------

function SettingRow({ setting }: { setting: EffectiveSetting }) {
  const readOnly = useReadOnly();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const updateMutation = useUpdateSettingValue();
  const toast = useToast();

  // Credential key'leri icin bu panelden duzenleme yapilmaz
  const isCredential = setting.key.startsWith("credential.");
  const isSecret = setting.is_secret;

  // Auto-save for non-credential, non-secret settings
  const autoSaveEnabled = editing && !isCredential && !isSecret;
  const fieldType = setting.type === "integer" || setting.type === "float" ? "number" : "text";

  const autoSave = useAutoSave<string>({
    fieldType: fieldType as "text" | "number",
    value: inputValue,
    onSave: async (val: string) => {
      if (val.trim() === "") return;

      let value: unknown = val.trim();
      if (setting.type === "integer") value = parseInt(val, 10);
      else if (setting.type === "float") value = parseFloat(val);
      else if (setting.type === "boolean") value = val.toLowerCase() === "true";
      else if (setting.type === "json") {
        try { value = JSON.parse(val); } catch { /* keep as string */ }
      }

      return new Promise<void>((resolve, reject) => {
        updateMutation.mutate(
          { key: setting.key, value },
          {
            onSuccess: () => {
              setFeedback("Kaydedildi.");
              toast.success(`${setting.label} kaydedildi.`);
              resolve();
            },
            onError: (err) => {
              const msg = err instanceof Error ? err.message : "Kayit hatasi.";
              setFeedback(msg);
              toast.error(`${setting.label}: ${msg}`);
              reject(new Error(msg));
            },
          },
        );
      });
    },
    enabled: autoSaveEnabled,
  });

  function handleSave() {
    if (inputValue.trim() === "") return;
    setFeedback(null);

    // Type-aware value conversion
    let value: unknown = inputValue.trim();
    if (setting.type === "integer") value = parseInt(inputValue, 10);
    else if (setting.type === "float") value = parseFloat(inputValue);
    else if (setting.type === "boolean") value = inputValue.toLowerCase() === "true";
    else if (setting.type === "json") {
      try { value = JSON.parse(inputValue); } catch { /* keep as string */ }
    }

    updateMutation.mutate(
      { key: setting.key, value },
      {
        onSuccess: () => {
          setEditing(false);
          setInputValue("");
          setFeedback("Kaydedildi.");
          toast.success(`${setting.label} kaydedildi.`);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Kayit hatasi.";
          setFeedback(msg);
          toast.error(`${setting.label}: ${msg}`);
        },
      },
    );
  }

  const displayValue = setting.effective_value !== null && setting.effective_value !== undefined
    ? String(setting.effective_value)
    : "—";

  return (
    <div className="border border-border rounded-lg px-4 py-3 mb-2 bg-surface-card" data-testid={`setting-row-${setting.key}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base font-semibold text-neutral-900">{setting.label}</span>
        <SourceBadge source={setting.source} />
        <WiredBadge wired={setting.wired} />
        {setting.module_scope && (
          <span className="text-xs text-neutral-600 italic">
            [{setting.module_scope}]
          </span>
        )}
      </div>

      {setting.help_text && <div className="text-xs text-neutral-500 mt-1 leading-tight">{setting.help_text}</div>}

      {setting.wired && setting.wired_to && (
        <div className="text-xs text-brand-700 mt-1">
          → {setting.wired_to}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {!editing && (
          <>
            <span className="text-base text-neutral-700 font-mono bg-neutral-25 px-2 py-1 rounded-sm border border-border" data-testid={`setting-value-${setting.key}`}>
              {setting.is_secret && setting.source !== "missing" ? "●●●●" : displayValue}
            </span>
            {setting.source === "builtin" && (
              <span className="text-xs text-neutral-500">(varsayilan)</span>
            )}
            {!isCredential && (
              <button
                className={cn(
                  "px-2 py-1 text-xs rounded-sm font-medium bg-transparent text-neutral-600 border border-neutral-400",
                  readOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                )}
                disabled={readOnly}
                onClick={() => {
                  setEditing(true);
                  // Pre-fill with current value if not secret
                  if (!setting.is_secret && setting.effective_value != null) {
                    setInputValue(String(setting.effective_value));
                  }
                }}
              >
                {setting.has_admin_override ? "Degistir" : "Ayarla"}
              </button>
            )}
            {isCredential && (
              <span className="text-xs text-neutral-500">
                (Kimlik Bilgileri sekmesinden yonetilir)
              </span>
            )}
          </>
        )}

        {editing && (
          <>
            <input
              className="flex-1 min-w-[180px] px-2 py-1 border border-neutral-400 rounded-sm text-base box-border outline-none focus:border-focus"
              type={setting.is_secret ? "password" : "text"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={autoSaveEnabled ? autoSave.triggerSave : undefined}
              placeholder={`${setting.type} deger girin...`}
              autoComplete="off"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            {autoSaveEnabled && (
              <AutoSaveStatus
                isDirty={autoSave.isDirty}
                isSaving={autoSave.isSaving}
                error={autoSave.error}
              />
            )}
            <button
              className="px-2 py-1 text-xs rounded-sm font-medium bg-brand-800 text-surface-card border-none cursor-pointer"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "..." : "Kaydet"}
            </button>
            <button
              className="px-2 py-1 text-xs rounded-sm font-medium bg-transparent text-neutral-600 border border-neutral-400 cursor-pointer"
              onClick={() => { setEditing(false); setInputValue(""); setFeedback(null); }}
            >
              Iptal
            </button>
          </>
        )}
      </div>

      {feedback && (
        <div className={cn("mt-1 text-xs", feedback.includes("hata") ? "text-error-dark" : "text-success-text")}>
          {feedback}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group section
// ---------------------------------------------------------------------------

const GROUP_LABELS_MAP: Record<string, string> = {
  credentials: "Kimlik Bilgileri",
  providers: "Provider Ayarlari",
  execution: "Calisma Ortami",
  source_scans: "Kaynak Tarama",
  publish: "Yayin Ayarlari",
};

function GroupSection({
  group,
  settings,
}: {
  group: GroupSummary;
  settings: EffectiveSetting[];
}) {
  return (
    <div className="mb-6" data-testid={`settings-group-${group.group}`}>
      <div className="flex items-center gap-3 text-base font-semibold text-neutral-700 mb-3 pb-2 border-b border-border">
        <span>{GROUP_LABELS_MAP[group.group] ?? group.label}</span>
        <GroupCountBadge count={group.total} color="var(--ch-neutral-700)" />
        {group.wired > 0 && (
          <span className="text-xs text-success-text">
            {group.wired} wired
          </span>
        )}
        {group.missing > 0 && (
          <span className="text-xs text-error-text">
            {group.missing} eksik
          </span>
        )}
      </div>
      {settings.map((s) => (
        <SettingRow key={s.key} setting={s} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function EffectiveSettingsPanel() {
  const [filterGroup, setFilterGroup] = useState<string | undefined>(undefined);
  const [wiredOnly, setWiredOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);
  useSearchFocus(searchRef);

  const { data: groups, isLoading: groupsLoading } = useSettingsGroups();
  const { data: settings, isLoading: settingsLoading, isError, error } =
    useEffectiveSettings({ group: filterGroup, wired_only: wiredOnly });

  const isLoading = groupsLoading || settingsLoading;

  if (isLoading) {
    return <p className="text-neutral-600 text-base">Yükleniyor...</p>;
  }
  if (isError) {
    return (
      <p className="text-error-dark text-base">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }
  if (!settings || settings.length === 0) {
    return <p className="text-neutral-600 text-base">Tanimli ayar bulunamadi.</p>;
  }

  // Filter by search term
  const filtered = searchTerm.trim()
    ? settings.filter(
        (s) =>
          s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.wired_to && s.wired_to.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    : settings;

  // Group filtered settings
  const groupOrder = ["credentials", "providers", "execution", "source_scans", "publish"];
  const grouped: Record<string, EffectiveSetting[]> = {};
  for (const s of filtered) {
    const g = s.group || "general";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(s);
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <input
          ref={searchRef}
          className="w-[240px] px-2 py-1 border border-neutral-400 rounded-sm text-base box-border outline-none focus:border-focus"
          type="text"
          placeholder="Ayar ara... ( / )"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="settings-search"
        />
        <select
          className="w-[180px] px-2 py-1 border border-neutral-400 rounded-sm text-base box-border outline-none focus:border-focus"
          value={filterGroup ?? ""}
          onChange={(e) => setFilterGroup(e.target.value || undefined)}
          data-testid="settings-group-filter"
        >
          <option value="">Tum Gruplar</option>
          {(groups ?? []).map((g) => (
            <option key={g.group} value={g.group}>
              {GROUP_LABELS_MAP[g.group] ?? g.label} ({g.total})
            </option>
          ))}
        </select>
        <label className="text-sm text-neutral-600 flex items-center gap-1">
          <input
            type="checkbox"
            checked={wiredOnly}
            onChange={(e) => setWiredOnly(e.target.checked)}
            data-testid="settings-wired-only"
          />
          Sadece Wired
        </label>
        <span className="text-xs text-neutral-500">
          {filtered.length} / {settings.length} ayar
        </span>
      </div>

      {/* Group sections */}
      {groupOrder.map((gKey) => {
        const items = grouped[gKey];
        if (!items || items.length === 0) return null;
        const groupInfo = (groups ?? []).find((g) => g.group === gKey) ?? {
          group: gKey,
          label: gKey,
          total: items.length,
          wired: 0,
          secret: 0,
          missing: 0,
        };
        return <GroupSection key={gKey} group={groupInfo} settings={items} />;
      })}

      {/* Unlisted groups */}
      {Object.keys(grouped)
        .filter((k) => !groupOrder.includes(k))
        .map((gKey) => {
          const items = grouped[gKey]!;
          return (
            <GroupSection
              key={gKey}
              group={{ group: gKey, label: gKey, total: items.length, wired: 0, secret: 0, missing: 0 }}
              settings={items}
            />
          );
        })}
    </div>
  );
}
