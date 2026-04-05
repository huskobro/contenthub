/**
 * EffectiveSettingsPanel — M10-E.
 *
 * Tum bilinen ayarlari grup bazli gosterir. Her ayar icin:
 *   - Effective deger (coerced, maskelenmis)
 *   - Kaynak (admin / default / env / builtin / missing)
 *   - Wired/Deferred durumu
 *   - wired_to bilgisi
 *   - Admin degeri girme/degistirme
 */

import { useState } from "react";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import {
  useEffectiveSettings,
  useSettingsGroups,
  useUpdateSettingValue,
} from "../../hooks/useEffectiveSettings";
import { useToast } from "../../hooks/useToast";
import type { EffectiveSetting, GroupSummary } from "../../api/effectiveSettingsApi";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const GROUP_SECTION: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const GROUP_HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "0.75rem",
  paddingBottom: "0.375rem",
  borderBottom: "1px solid #e2e8f0",
};

const CARD: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "0.75rem 1rem",
  marginBottom: "0.5rem",
  background: "#fff",
};

const KEY_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  flexWrap: "wrap",
};

const KEY_LABEL: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#1e293b",
};

const HELP_TEXT: React.CSSProperties = {
  fontSize: "0.6875rem",
  color: "#94a3b8",
  marginTop: "0.125rem",
  lineHeight: 1.4,
};

const VALUE_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginTop: "0.375rem",
  flexWrap: "wrap",
};

const VALUE_DISPLAY: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#475569",
  fontFamily: "monospace",
  background: "#f8fafc",
  padding: "0.125rem 0.375rem",
  borderRadius: "3px",
  border: "1px solid #e2e8f0",
};

const INPUT: React.CSSProperties = {
  flex: 1,
  minWidth: "180px",
  padding: "0.3rem 0.5rem",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  boxSizing: "border-box" as const,
};

const BTN_SM: React.CSSProperties = {
  padding: "0.2rem 0.5rem",
  fontSize: "0.6875rem",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: 500,
};

// ---------------------------------------------------------------------------
// Badge components
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    admin: { bg: "#dbeafe", fg: "#1e40af" },
    default: { bg: "#f1f5f9", fg: "#475569" },
    env: { bg: "#fef9c3", fg: "#854d0e" },
    builtin: { bg: "#f3e8ff", fg: "#7c3aed" },
    missing: { bg: "#fef2f2", fg: "#991b1b" },
  };
  const c = colors[source] ?? colors.missing;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.375rem",
        borderRadius: "9999px",
        fontSize: "0.625rem",
        fontWeight: 600,
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
        padding: "0.1rem 0.375rem",
        borderRadius: "4px",
        fontSize: "0.625rem",
        fontWeight: 600,
        background: wired ? "#dcfce7" : "#fef9c3",
        color: wired ? "#166534" : "#854d0e",
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
        padding: "0.1rem 0.375rem",
        borderRadius: "9999px",
        fontSize: "0.625rem",
        fontWeight: 500,
        background: "#f1f5f9",
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
          <span style={{ fontSize: "0.625rem", color: "#64748b", fontStyle: "italic" }}>
            [{setting.module_scope}]
          </span>
        )}
      </div>

      {setting.help_text && <div style={HELP_TEXT}>{setting.help_text}</div>}

      {setting.wired && setting.wired_to && (
        <div style={{ fontSize: "0.625rem", color: "#7c3aed", marginTop: "0.125rem" }}>
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
              <span style={{ fontSize: "0.625rem", color: "#94a3b8" }}>(varsayilan)</span>
            )}
            {!isCredential && (
              <button
                style={{ ...BTN_SM, background: "transparent", color: "#64748b", border: "1px solid #cbd5e1", opacity: readOnly ? 0.5 : 1, cursor: readOnly ? "not-allowed" : "pointer" }}
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
              <span style={{ fontSize: "0.625rem", color: "#94a3b8" }}>
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
              placeholder={`${setting.type} deger girin...`}
              autoComplete="off"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            <button
              style={{ ...BTN_SM, background: "#1e40af", color: "#fff", border: "none" }}
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "..." : "Kaydet"}
            </button>
            <button
              style={{ ...BTN_SM, background: "transparent", color: "#64748b", border: "1px solid #cbd5e1" }}
              onClick={() => { setEditing(false); setInputValue(""); setFeedback(null); }}
            >
              Iptal
            </button>
          </>
        )}
      </div>

      {feedback && (
        <div style={{ marginTop: "0.25rem", fontSize: "0.6875rem", color: feedback.includes("hata") ? "#dc2626" : "#166534" }}>
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
        <GroupCountBadge count={group.total} color="#475569" />
        {group.wired > 0 && (
          <span style={{ fontSize: "0.625rem", color: "#166534" }}>
            {group.wired} wired
          </span>
        )}
        {group.missing > 0 && (
          <span style={{ fontSize: "0.625rem", color: "#991b1b" }}>
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

  const { data: groups, isLoading: groupsLoading } = useSettingsGroups();
  const { data: settings, isLoading: settingsLoading, isError, error } =
    useEffectiveSettings({ group: filterGroup, wired_only: wiredOnly });

  const isLoading = groupsLoading || settingsLoading;

  if (isLoading) {
    return <p style={{ color: "#64748b", fontSize: "0.8125rem" }}>Yukleniyor...</p>;
  }
  if (isError) {
    return (
      <p style={{ color: "#dc2626", fontSize: "0.8125rem" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }
  if (!settings || settings.length === 0) {
    return <p style={{ color: "#64748b", fontSize: "0.8125rem" }}>Tanimli ayar bulunamadi.</p>;
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
          gap: "0.75rem",
          marginBottom: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          style={{ ...INPUT, flex: "none", width: "240px" }}
          type="text"
          placeholder="Ayar ara..."
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
        <label style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input
            type="checkbox"
            checked={wiredOnly}
            onChange={(e) => setWiredOnly(e.target.checked)}
            data-testid="settings-wired-only"
          />
          Sadece Wired
        </label>
        <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>
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
