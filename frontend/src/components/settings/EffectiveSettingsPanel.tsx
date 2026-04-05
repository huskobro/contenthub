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
 * Wave 1 Final: design-system tokens, useAutoSave, useSearchFocus integrated.
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
import { colors, typography, spacing, radius } from "../../components/design-system/tokens";
import type { EffectiveSetting, GroupSummary } from "../../api/effectiveSettingsApi";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const GROUP_SECTION: React.CSSProperties = {
  marginBottom: spacing[6],
};

const GROUP_HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[3],
  fontSize: typography.size.base,
  fontWeight: typography.weight.semibold,
  color: colors.neutral[700],
  marginBottom: spacing[3],
  paddingBottom: spacing[2],
  borderBottom: `1px solid ${colors.border.default}`,
};

const CARD: React.CSSProperties = {
  border: `1px solid ${colors.border.default}`,
  borderRadius: radius.lg,
  padding: `${spacing[3]} ${spacing[4]}`,
  marginBottom: spacing[2],
  background: colors.surface.card,
};

const KEY_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[2],
  flexWrap: "wrap",
};

const KEY_LABEL: React.CSSProperties = {
  fontSize: typography.size.base,
  fontWeight: typography.weight.semibold,
  color: colors.neutral[900],
};

const HELP_TEXT: React.CSSProperties = {
  fontSize: typography.size.xs,
  color: colors.neutral[500],
  marginTop: spacing[1],
  lineHeight: typography.lineHeight.tight,
};

const VALUE_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[2],
  marginTop: spacing[2],
  flexWrap: "wrap",
};

const VALUE_DISPLAY: React.CSSProperties = {
  fontSize: typography.size.base,
  color: colors.neutral[700],
  fontFamily: typography.monoFamily,
  background: colors.neutral[25],
  padding: `${spacing[1]} ${spacing[2]}`,
  borderRadius: radius.sm,
  border: `1px solid ${colors.border.default}`,
};

const INPUT: React.CSSProperties = {
  flex: 1,
  minWidth: "180px",
  padding: `${spacing[1]} ${spacing[2]}`,
  border: `1px solid ${colors.neutral[400]}`,
  borderRadius: radius.sm,
  fontSize: typography.size.base,
  boxSizing: "border-box" as const,
};

const BTN_SM: React.CSSProperties = {
  padding: `${spacing[1]} ${spacing[2]}`,
  fontSize: typography.size.xs,
  borderRadius: radius.sm,
  cursor: "pointer",
  fontWeight: typography.weight.medium,
};

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
      <span style={{ fontSize: typography.size.xs, color: colors.error.dark }}>
        Hata
      </span>
    );
  }
  if (isSaving) {
    return (
      <span style={{ fontSize: typography.size.xs, color: colors.warning.text }}>
        Kaydediliyor...
      </span>
    );
  }
  if (isDirty) {
    return (
      <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>
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
  const badgeColors: Record<string, { bg: string; fg: string }> = {
    admin: { bg: colors.info.light, fg: colors.brand[800] },
    default: { bg: colors.neutral[100], fg: colors.neutral[700] },
    env: { bg: colors.warning.light, fg: colors.warning.text },
    builtin: { bg: "#f3e8ff", fg: colors.brand[700] },
    missing: { bg: colors.error.light, fg: colors.error.text },
  };
  const c = badgeColors[source] ?? badgeColors.missing;

  return (
    <span
      style={{
        display: "inline-block",
        padding: `${spacing[1]} ${spacing[2]}`,
        borderRadius: radius.full,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        background: c.bg,
        color: c.fg,
      }}
      data-testid={`source-badge-${source}`}
    >
      {source.toUpperCase()}
    </span>
  );
}

function WiredBadge({ wired }: { wired: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: `${spacing[1]} ${spacing[2]}`,
        borderRadius: radius.sm,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        background: wired ? colors.success.light : colors.warning.light,
        color: wired ? colors.success.text : colors.warning.text,
      }}
      data-testid={wired ? "badge-wired" : "badge-deferred"}
    >
      {wired ? "WIRED" : "DEFERRED"}
    </span>
  );
}

function GroupCountBadge({ count, color }: { count: number; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: `${spacing[1]} ${spacing[2]}`,
        borderRadius: radius.full,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        background: colors.neutral[100],
        color,
      }}
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
    <div style={CARD} data-testid={`setting-row-${setting.key}`}>
      <div style={KEY_ROW}>
        <span style={KEY_LABEL}>{setting.label}</span>
        <SourceBadge source={setting.source} />
        <WiredBadge wired={setting.wired} />
        {setting.module_scope && (
          <span style={{ fontSize: typography.size.xs, color: colors.neutral[600], fontStyle: "italic" }}>
            [{setting.module_scope}]
          </span>
        )}
      </div>

      {setting.help_text && <div style={HELP_TEXT}>{setting.help_text}</div>}

      {setting.wired && setting.wired_to && (
        <div style={{ fontSize: typography.size.xs, color: colors.brand[700], marginTop: spacing[1] }}>
          → {setting.wired_to}
        </div>
      )}

      <div style={VALUE_ROW}>
        {!editing && (
          <>
            <span style={VALUE_DISPLAY} data-testid={`setting-value-${setting.key}`}>
              {setting.is_secret && setting.source !== "missing" ? "●●●●" : displayValue}
            </span>
            {setting.source === "builtin" && (
              <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>(varsayilan)</span>
            )}
            {!isCredential && (
              <button
                style={{
                  ...BTN_SM,
                  background: "transparent",
                  color: colors.neutral[600],
                  border: `1px solid ${colors.neutral[400]}`,
                  opacity: readOnly ? 0.5 : 1,
                  cursor: readOnly ? "not-allowed" : "pointer",
                }}
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
              <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>
                (Kimlik Bilgileri sekmesinden yonetilir)
              </span>
            )}
          </>
        )}

        {editing && (
          <>
            <input
              style={INPUT}
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
              style={{ ...BTN_SM, background: colors.brand[800], color: colors.surface.card, border: "none" }}
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "..." : "Kaydet"}
            </button>
            <button
              style={{ ...BTN_SM, background: "transparent", color: colors.neutral[600], border: `1px solid ${colors.neutral[400]}` }}
              onClick={() => { setEditing(false); setInputValue(""); setFeedback(null); }}
            >
              Iptal
            </button>
          </>
        )}
      </div>

      {feedback && (
        <div style={{ marginTop: spacing[1], fontSize: typography.size.xs, color: feedback.includes("hata") ? colors.error.dark : colors.success.text }}>
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
    <div style={GROUP_SECTION} data-testid={`settings-group-${group.group}`}>
      <div style={GROUP_HEADER}>
        <span>{GROUP_LABELS_MAP[group.group] ?? group.label}</span>
        <GroupCountBadge count={group.total} color={colors.neutral[700]} />
        {group.wired > 0 && (
          <span style={{ fontSize: typography.size.xs, color: colors.success.text }}>
            {group.wired} wired
          </span>
        )}
        {group.missing > 0 && (
          <span style={{ fontSize: typography.size.xs, color: colors.error.text }}>
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
    return <p style={{ color: colors.neutral[600], fontSize: typography.size.base }}>Yukleniyor...</p>;
  }
  if (isError) {
    return (
      <p style={{ color: colors.error.dark, fontSize: typography.size.base }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }
  if (!settings || settings.length === 0) {
    return <p style={{ color: colors.neutral[600], fontSize: typography.size.base }}>Tanimli ayar bulunamadi.</p>;
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
      <div
        style={{
          display: "flex",
          gap: spacing[3],
          marginBottom: spacing[4],
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          ref={searchRef}
          style={{ ...INPUT, flex: "none", width: "240px" }}
          type="text"
          placeholder="Ayar ara... ( / )"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="settings-search"
        />
        <select
          style={{ ...INPUT, flex: "none", width: "180px" }}
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
        <label style={{ fontSize: typography.size.sm, color: colors.neutral[600], display: "flex", alignItems: "center", gap: spacing[1] }}>
          <input
            type="checkbox"
            checked={wiredOnly}
            onChange={(e) => setWiredOnly(e.target.checked)}
            data-testid="settings-wired-only"
          />
          Sadece Wired
        </label>
        <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>
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
