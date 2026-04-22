/**
 * Aurora User Settings — user.settings override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/settings.html
 * Veri: useEffectiveSettings + useUserOverrides + useSetUserOverride +
 * useDeleteUserOverride. Gerçek backend ayar registry'sine bağlı —
 * her toggle/select bir gerçek setting key üzerinde mutation tetikler.
 */
import { useMemo, useState } from "react";
import {
  useActiveUser,
  useUserOverrides,
  useSetUserOverride,
  useDeleteUserOverride,
} from "../../hooks/useUsers";
import { useEffectiveSettings } from "../../hooks/useEffectiveSettings";
import type { EffectiveSetting } from "../../api/effectiveSettingsApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

const DENYLIST_GROUPS = new Set(["execution"]);

/**
 * Pass-6: write-lock görünürlüğü.
 * Bir setting `read_only_for_user=true` ise veya `user_override_allowed=false` ise
 * kullanıcı bu degeri degistiremez. Disabled state buton/input'ta zaten var; kullanici
 * "neden degistiremedim?" sorusuna cevap alsin diye satirin etiketi yaninda kucuk
 * bir kilit ikonu + tooltip gosterilir.
 */
function LockBadge({ setting }: { setting: EffectiveSetting }) {
  const allowed = setting.user_override_allowed === true;
  const lockedForUser = setting.read_only_for_user === true;
  if (allowed && !lockedForUser) return null;
  const reason = !allowed
    ? "Bu ayar kullanıcı override'a kapalı; sadece admin değiştirebilir."
    : "Bu ayar admin tarafından kilitlendi; kullanıcı değeri değiştiremez.";
  return (
    <span
      title={reason}
      aria-label={reason}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginLeft: 6,
        padding: "1px 6px",
        fontSize: 9,
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: "var(--text-muted)",
        background: "var(--bg-inset)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 3,
        cursor: "help",
        verticalAlign: "middle",
      }}
    >
      <Icon name="shield" size={9} />
      kilitli
    </span>
  );
}

function ToggleRow({
  setting,
  hasOverride,
  userId,
}: {
  setting: EffectiveSetting;
  hasOverride: boolean;
  userId: string;
}) {
  const setOv = useSetUserOverride();
  const delOv = useDeleteUserOverride();
  const value = !!setting.effective_value;
  const canEdit = setting.user_override_allowed === true && setting.read_only_for_user !== true;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {setting.label as string}
          <LockBadge setting={setting} />
        </div>
        {setting.help_text && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{setting.help_text as string}</div>
        )}
      </div>
      {hasOverride && (
        <button
          onClick={() => delOv.mutate({ userId, settingKey: setting.key as string })}
          disabled={delOv.isPending}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
          title="Override'ı sıfırla"
        >
          özelleştirildi · sıfırla
        </button>
      )}
      <button
        onClick={() => {
          if (!canEdit) return;
          setOv.mutate({ userId, settingKey: setting.key as string, value: !value });
        }}
        disabled={!canEdit || setOv.isPending}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          position: "relative",
          cursor: canEdit ? "pointer" : "not-allowed",
          border: "none",
          padding: 0,
          transition: "background .2s",
          background: value ? "var(--accent-primary)" : "var(--bg-inset)",
          outline: "none",
          opacity: canEdit ? 1 : 0.5,
          boxShadow: value ? "0 0 8px rgba(var(--accent-primary-rgb), 0.4)" : "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--control-knob-bg)",
            boxShadow: "var(--control-knob-shadow)",
            transition: "left .2s",
          }}
        />
      </button>
    </div>
  );
}

function SelectRow({
  setting,
  hasOverride,
  userId,
}: {
  setting: EffectiveSetting;
  hasOverride: boolean;
  userId: string;
}) {
  const setOv = useSetUserOverride();
  const delOv = useDeleteUserOverride();
  const canEdit = setting.user_override_allowed === true && setting.read_only_for_user !== true;
  const enumOptions = ((setting as unknown as { validation_rules?: { enum?: unknown[] } | null }).validation_rules ?? null)?.enum ?? null;
  const value = String(setting.effective_value ?? "");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {setting.label as string}
          <LockBadge setting={setting} />
        </div>
        {setting.help_text && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{setting.help_text as string}</div>
        )}
      </div>
      {hasOverride && (
        <button
          onClick={() => delOv.mutate({ userId, settingKey: setting.key as string })}
          disabled={delOv.isPending}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
          title="Override'ı sıfırla"
        >
          sıfırla
        </button>
      )}
      {enumOptions && enumOptions.length > 0 ? (
        <select
          value={value}
          disabled={!canEdit || setOv.isPending}
          onChange={(e) =>
            setOv.mutate({ userId, settingKey: setting.key as string, value: e.target.value })
          }
          style={{
            height: 30,
            padding: "0 10px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 7,
            color: "var(--text-primary)",
            fontSize: 12,
            fontFamily: "inherit",
            outline: "none",
            opacity: canEdit ? 1 : 0.6,
          }}
        >
          {enumOptions.map((o) => (
            <option key={String(o)} value={String(o)}>
              {String(o)}
            </option>
          ))}
        </select>
      ) : (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
          {value || "—"}
        </span>
      )}
    </div>
  );
}

function TextRow({
  setting,
  hasOverride,
  userId,
}: {
  setting: EffectiveSetting;
  hasOverride: boolean;
  userId: string;
}) {
  const setOv = useSetUserOverride();
  const delOv = useDeleteUserOverride();
  const canEdit = setting.user_override_allowed === true && setting.read_only_for_user !== true;
  const [draft, setDraft] = useState(String(setting.effective_value ?? ""));
  const [editing, setEditing] = useState(false);

  const display = String(setting.effective_value ?? "");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {setting.label as string}
          <LockBadge setting={setting} />
        </div>
        {setting.help_text && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{setting.help_text as string}</div>
        )}
      </div>
      {hasOverride && (
        <button
          onClick={() => delOv.mutate({ userId, settingKey: setting.key as string })}
          disabled={delOv.isPending}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          sıfırla
        </button>
      )}
      {editing && canEdit ? (
        <>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              height: 30,
              padding: "0 10px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: 7,
              color: "var(--text-primary)",
              fontSize: 12,
              fontFamily: "inherit",
              outline: "none",
              minWidth: 120,
            }}
          />
          <AuroraButton
            variant="primary"
            size="sm"
            onClick={() => {
              let value: unknown = draft;
              if (setting.type === "integer") value = parseInt(draft, 10);
              else if (setting.type === "float") value = parseFloat(draft);
              setOv.mutate(
                { userId, settingKey: setting.key as string, value },
                { onSuccess: () => setEditing(false) },
              );
            }}
          >
            kaydet
          </AuroraButton>
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(display);
              setEditing(false);
            }}
          >
            iptal
          </AuroraButton>
        </>
      ) : (
        <>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
            {display || "—"}
          </span>
          {canEdit && (
            <AuroraButton variant="ghost" size="sm" onClick={() => setEditing(true)}>
              düzenle
            </AuroraButton>
          )}
        </>
      )}
    </div>
  );
}

export function AuroraUserSettingsPage() {
  const { activeUser, activeUserId } = useActiveUser();
  const settingsQ = useEffectiveSettings();
  const overridesQ = useUserOverrides(activeUserId ?? "");

  const settings = settingsQ.data ?? [];
  const overrides = overridesQ.data ?? [];
  const overrideKeys = useMemo(() => new Set(overrides.map((o) => o.setting_key)), [overrides]);

  const visibleSettings = useMemo(
    () =>
      settings.filter((s) => {
        if (s.visible_to_user !== true) return false;
        const group = ((s.group as string | undefined) ?? "").toLowerCase();
        if (DENYLIST_GROUPS.has(group)) return false;
        return true;
      }),
    [settings],
  );

  const groups = useMemo(() => {
    const m = new Map<string, EffectiveSetting[]>();
    for (const s of visibleSettings) {
      const g = (s.group as string) || "general";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(s);
    }
    return m;
  }, [visibleSettings]);

  const inspector = (
    <AuroraInspector title="Ayarlar">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="görünen" value={String(visibleSettings.length)} />
        <AuroraInspectorRow label="özelleştirilen" value={String(overrideKeys.size)} />
        <AuroraInspectorRow label="grup" value={String(groups.size)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  if (!activeUser) {
    return (
      <div className="aurora-dashboard">
        <div className="page" style={{ maxWidth: 560 }}>
          <div className="card card-pad" style={{ textAlign: "center", padding: 32 }}>
            <Icon name="alert-triangle" size={28} />
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-secondary)" }}>
              Kullanıcı seçilmedi.
            </div>
          </div>
        </div>
        <aside className="aurora-inspector-slot">{inspector}</aside>
      </div>
    );
  }

  return (
    <div className="aurora-dashboard">
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <div>
            <h1>Kullanıcı ayarları</h1>
            <div className="sub">
              {activeUser.display_name} — tercihler ve override'lar
            </div>
          </div>
        </div>

        {settingsQ.isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Yükleniyor…
          </div>
        ) : visibleSettings.length === 0 ? (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}
          >
            Görüntülenebilir ayar bulunmuyor.
          </div>
        ) : (
          Array.from(groups.entries()).map(([group, items]) => (
            <div key={group} className="card card-pad" style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                {group}
              </div>
              {items.map((s) => {
                const hasOv = overrideKeys.has(s.key as string);
                if (s.type === "boolean") {
                  return (
                    <ToggleRow key={s.key as string} setting={s} hasOverride={hasOv} userId={activeUser.id} />
                  );
                }
                const enumOptions = ((s as unknown as { validation_rules?: { enum?: unknown[] } | null }).validation_rules ?? null)?.enum ?? null;
                if (s.type === "string" && enumOptions && enumOptions.length > 0) {
                  return (
                    <SelectRow key={s.key as string} setting={s} hasOverride={hasOv} userId={activeUser.id} />
                  );
                }
                return (
                  <TextRow key={s.key as string} setting={s} hasOverride={hasOv} userId={activeUser.id} />
                );
              })}
            </div>
          ))
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
