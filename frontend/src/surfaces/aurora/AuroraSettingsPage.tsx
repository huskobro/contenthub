/**
 * Aurora Settings — settings registry görüntüleme + inline düzenleme.
 *
 * Tasarım:
 *   - Sol nav: settings group'lar (boyutu sayaç ile)
 *   - Sağ panel: aktif gruptaki ayarların listesi
 *   - Her satır: key + tür + scope rozetleri + efektif değer + "Düzenle" aksiyonu
 *   - Inline edit: scalar (boolean/number/string/prompt) için doğrudan kontrol;
 *     karmaşık JSON için textarea + parse validasyonu.
 *   - Save: PUT /api/v1/settings/effective/{key} (admin_value_json yazılır,
 *     audit log otomatik)
 *   - Toplu re-fetch: invalidateQueries(["settings"])
 *
 * Token / a11y:
 *   - Kontroller AuroraButton + native input'larla
 *   - Inline mesajlar (kaydedildi / hata) kısa-yaşam toast yerine satır içi
 *     statu chip ile (hızlı geri bildirim, focus kaybı yok)
 *
 * Yazma yolu (effective settings PUT) ile prompt editor (AuroraPromptsPage)
 * aynı endpoint'i kullanır → aynı kaynak-tek-doğru.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSettingsList } from "../../hooks/useSettingsList";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStructuredJsonEditor,
  AuroraField,
  AuroraSegmented,
} from "./primitives";
import { Icon } from "./icons";
import { useEffectiveSettingMutation } from "../../hooks/useEffectiveSettingMutation";
import type { SettingResponse } from "../../api/settingsApi";
import {
  useVersionedLocalStorage,
  type VersionedStorageDescriptor,
} from "../../hooks/useVersionedLocalStorage";

/**
 * Pass-6: Aktif sekme localStorage'ta kalir; refresh sonrasi kullanici en son
 * actigi grupta acilir. Versiyonlu key paterni bozuk degerlere karsi guvenli.
 */
const ACTIVE_GROUP_DESC: VersionedStorageDescriptor<string> = {
  key: "aurora.adminSettings.activeGroup.v1",
  defaultValue: "",
  validate: (raw) => (typeof raw === "string" ? raw : null),
};

// --- helpers ---------------------------------------------------------------

function tryParse(json: string | null | undefined): unknown {
  if (json == null) return null;
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

function fmtValue(v: unknown, settingType?: string): string {
  if (v == null) return "—";
  // Secret tipi ayarlarda UI hicbir zaman acik deger gostermez. Backend
  // zaten son 4 karakter maskeli donuyor; guvenlik derinligi icin burada
  // da "doldu/bos" gostergesine indirgeniyor.
  if ((settingType || "").toLowerCase() === "secret") {
    if (typeof v === "string" && v.length > 0) return "●●●● (set)";
    return "—";
  }
  if (typeof v === "boolean") return v ? "açık" : "kapalı";
  if (typeof v === "number" || typeof v === "string") return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 77) + "…" : s;
  } catch {
    return String(v);
  }
}

function isScalarType(t: string): "bool" | "number" | "string" | "json" {
  const k = (t || "").toLowerCase();
  if (k === "bool" || k === "boolean") return "bool";
  if (k === "int" || k === "integer" || k === "number" || k === "float") return "number";
  if (k === "string" || k === "text" || k === "prompt" || k === "secret") return "string";
  return "json";
}

function groupLabel(group: string): string {
  const map: Record<string, string> = {
    general: "Genel",
    tts: "TTS",
    render: "Render",
    publish: "Yayın",
    users: "Kullanıcılar",
    api: "API",
    workspace: "Workspace",
    ai: "AI / Sağlayıcı",
    prompts: "Prompt",
    news_bulletin: "Haber Bülteni",
    standard_video: "Standart Video",
    product_review: "Ürün İncelemesi",
    educational_video: "Eğitim Videosu",
    howto_video: "How-to",
    youtube: "YouTube",
    notifications: "Bildirimler",
  };
  return map[group] || group;
}

// --- validation rule parsing ----------------------------------------------
//
// Settings registry supports {required, type, min, max, enum, regex} server-side
// (backend/app/settings/validation.py). Aurora UI mirrors these so that invalid
// input can be caught before the network round-trip and the picker can auto-
// upgrade to a constrained control (enum → segmented picker).
//
// Source of truth is still the backend; this is "fail fast + honest UI".

interface SettingValidation {
  required?: boolean;
  type?: string;
  min?: number;
  max?: number;
  enum?: unknown[];
  regex?: string;
}

function parseValidation(rulesJson: string | null | undefined): SettingValidation {
  if (!rulesJson) return {};
  try {
    const parsed = JSON.parse(rulesJson);
    return parsed && typeof parsed === "object" ? (parsed as SettingValidation) : {};
  } catch {
    return {};
  }
}

function validateDraftValue(
  value: unknown,
  rules: SettingValidation,
): string | null {
  if (rules.required && (value === null || value === undefined || value === "")) {
    return "Bu ayar zorunlu, boş bırakılamaz.";
  }
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (rules.min !== undefined && value < rules.min) {
      return `En az ${rules.min} olmalı.`;
    }
    if (rules.max !== undefined && value > rules.max) {
      return `En fazla ${rules.max} olmalı.`;
    }
  }
  if (rules.enum && Array.isArray(rules.enum) && !rules.enum.includes(value as never)) {
    return `Geçerli seçenekler: ${rules.enum.map((x) => String(x)).join(", ")}`;
  }
  if (rules.regex && typeof value === "string") {
    try {
      if (!new RegExp(rules.regex).test(value)) {
        return `Desen uyumsuz: ${rules.regex}`;
      }
    } catch {
      /* invalid regex in rules — skip client check, backend is authoritative */
    }
  }
  return null;
}

// --- inline editor row ----------------------------------------------------

interface RowEditorProps {
  setting: SettingResponse;
  current: unknown;
  onSaved: () => void;
}

function RowEditor({ setting, current, onSaved }: RowEditorProps) {
  const kind = isScalarType(setting.type);
  const rules = useMemo(
    () => parseValidation(setting.validation_rules_json),
    [setting.validation_rules_json],
  );
  // Enum metadata → select/segmented auto-upgrade. String-tipinde, enum daha
  // kısıtlı bir picker sunar; "MANUAL-OK" alanlar enum'a sahip değildir.
  const enumOptions: string[] | null = useMemo(() => {
    if (!rules.enum || !Array.isArray(rules.enum)) return null;
    if (!rules.enum.every((v) => typeof v === "string" || typeof v === "number")) {
      return null;
    }
    return rules.enum.map((v) => String(v));
  }, [rules.enum]);

  const initialString = useMemo(() => {
    // Secret tipi ayarlarda editor her zaman bos acilir. Backend ciphertext
    // veya sentinel donduguyle baslamak kullaniciyi yaniltir; bos alan =
    // "yeni deger gir, aksi halde kaydetme" semantigi.
    if ((setting.type || "").toLowerCase() === "secret") return "";
    if (current == null) return "";
    if (typeof current === "string") return current;
    if (typeof current === "number" || typeof current === "boolean")
      return String(current);
    try {
      return JSON.stringify(current, null, 2);
    } catch {
      return "";
    }
  }, [current, setting.type]);

  const [draft, setDraft] = useState(initialString);
  const [boolDraft, setBoolDraft] = useState<boolean>(
    typeof current === "boolean" ? current : false,
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);

  // Save mutation — paylasimli hook. Secret bos-deger reddi, cache invalidation,
  // toast'lar hook icinde. Kind-spesifik value parse burada kalir.
  const save = useEffectiveSettingMutation({ onSuccess: () => onSaved() });

  function buildValueAndMutate() {
    let value: unknown;
    if (kind === "bool") {
      value = boolDraft;
    } else if (kind === "number") {
      const n = Number(draft.trim());
      if (Number.isNaN(n)) {
        setParseError("Sayı değil");
        return;
      }
      value = n;
    } else if (kind === "string") {
      value = draft;
    } else {
      try {
        value = JSON.parse(draft);
        setParseError(null);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "JSON parse hatası");
        return;
      }
    }
    // Client-side rule check (mirrors backend validation.py). Backend remains
    // authoritative; this is fail-fast UX.
    const ruleViolation = validateDraftValue(value, rules);
    if (ruleViolation) {
      setRuleError(ruleViolation);
      return;
    }
    setRuleError(null);
    save.mutate({ key: setting.key, value, settingType: setting.type });
  }

  // Human-readable constraint summary (required / min / max / regex / enum).
  // Rendered as a small chip row at the top of the editor so operators see
  // validation rules without opening the raw JSON registry metadata.
  const constraintChips: string[] = [];
  if (rules.required) constraintChips.push("zorunlu");
  if (rules.min !== undefined) constraintChips.push(`min ${rules.min}`);
  if (rules.max !== undefined) constraintChips.push(`max ${rules.max}`);
  if (rules.regex) constraintChips.push(`desen ${rules.regex}`);
  if (enumOptions) constraintChips.push(`enum · ${enumOptions.length} seçenek`);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        marginTop: 8,
        background: "var(--bg-inset)",
        borderRadius: 6,
        border: "1px solid var(--border-subtle)",
      }}
    >
      {constraintChips.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            fontSize: 10,
            color: "var(--text-muted)",
          }}
          data-testid={`aurora-setting-constraints-${setting.key}`}
        >
          {constraintChips.map((c) => (
            <span
              key={c}
              style={{
                padding: "2px 6px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 4,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
      {kind === "bool" && (
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
          <input
            type="checkbox"
            checked={boolDraft}
            onChange={(e) => setBoolDraft(e.target.checked)}
          />
          {boolDraft ? "açık" : "kapalı"}
        </label>
      )}
      {kind === "number" && (
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          min={rules.min}
          max={rules.max}
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 4,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        />
      )}
      {/* String enum → AuroraSegmented (≤4 options) / native select (5+). */}
      {kind === "string" &&
        setting.type !== "secret" &&
        enumOptions &&
        (enumOptions.length <= 4 ? (
          <AuroraSegmented
            options={enumOptions.map((v) => ({ value: v, label: v }))}
            value={draft as string}
            onChange={(v) => setDraft(v)}
            data-testid={`aurora-setting-enum-${setting.key}`}
          />
        ) : (
          <select
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: 4,
              color: "var(--text-primary)",
              fontSize: 12,
            }}
            data-testid={`aurora-setting-enum-${setting.key}`}
          >
            {enumOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ))}
      {kind === "string" && setting.type === "secret" && (
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
          placeholder="Yeni secret değerini girin (boş bırakırsanız kaydedilmez)"
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 4,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        />
      )}
      {kind === "string" && setting.type !== "secret" && !enumOptions && (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={setting.type === "prompt" ? 8 : 3}
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 4,
            color: "var(--text-primary)",
            fontFamily:
              setting.type === "prompt" ? "var(--font-mono)" : "inherit",
            fontSize: 12,
            resize: "vertical",
          }}
        />
      )}
      {kind === "json" && (
        <AuroraField
          help="Form modunda anahtar/değer editörü; Raw JSON sekmesi gelişmiş yapılar için."
          error={parseError ? `JSON: ${parseError}` : null}
        >
          <AuroraStructuredJsonEditor
            value={(() => {
              try {
                return draft.trim() === "" ? {} : JSON.parse(draft);
              } catch {
                return draft;
              }
            })()}
            onChange={(next) => {
              setParseError(null);
              try {
                setDraft(JSON.stringify(next, null, 2));
              } catch (e) {
                setParseError(e instanceof Error ? e.message : "JSON serialize hatası");
              }
            }}
            kind={draft.trim().startsWith("[") ? "array" : "object"}
          />
        </AuroraField>
      )}
      {ruleError && (
        <div
          style={{
            fontSize: 11,
            color: "var(--state-danger-fg)",
            background: "var(--state-danger-bg)",
            padding: "4px 8px",
            borderRadius: 4,
            border: "1px solid var(--state-danger-border)",
          }}
          data-testid={`aurora-setting-rule-error-${setting.key}`}
        >
          {ruleError}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <AuroraButton
          variant="primary"
          size="sm"
          disabled={save.isPending}
          onClick={buildValueAndMutate}
          iconLeft={<Icon name="check" size={11} />}
        >
          {save.isPending ? "Kaydediliyor…" : "Kaydet"}
        </AuroraButton>
        <AuroraButton
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(initialString);
            setBoolDraft(typeof current === "boolean" ? current : false);
            setParseError(null);
            setRuleError(null);
          }}
          disabled={save.isPending}
        >
          Sıfırla
        </AuroraButton>
      </div>
    </div>
  );
}

// --- page ------------------------------------------------------------------

export function AuroraSettingsPage() {
  const { data: settings, isLoading } = useSettingsList();
  const qc = useQueryClient();
  const { value: activeGroup, set: setActiveGroup } =
    useVersionedLocalStorage(ACTIVE_GROUP_DESC);
  const [editing, setEditing] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, SettingResponse[]>();
    for (const s of settings ?? []) {
      const g = s.group_name || "diğer";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(s);
    }
    return Array.from(map.entries())
      .map(([id, items]) => ({ id, items }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [settings]);

  const current = useMemo(() => {
    if (!groups.length) return null;
    const target = activeGroup || groups[0].id;
    return groups.find((g) => g.id === target) ?? groups[0];
  }, [groups, activeGroup]);

  const totalCount = settings?.length ?? 0;
  const groupCount = groups.length;

  const inspector = (
    <AuroraInspector title="Ayar durumu">
      <AuroraInspectorSection title="Sistem">
        <AuroraInspectorRow label="toplam" value={String(totalCount)} />
        <AuroraInspectorRow label="grup" value={String(groupCount)} />
        {current && <AuroraInspectorRow label="aktif" value={groupLabel(current.id)} />}
      </AuroraInspectorSection>
      {current && (
        <AuroraInspectorSection title="Grup özeti">
          <AuroraInspectorRow label="kayıt" value={String(current.items.length)} />
          <AuroraInspectorRow
            label="user override"
            value={String(current.items.filter((s) => s.user_override_allowed).length)}
          />
          <AuroraInspectorRow
            label="kullanıcı görür"
            value={String(current.items.filter((s) => s.visible_to_user).length)}
          />
        </AuroraInspectorSection>
      )}
      <AuroraInspectorSection title="Yazma yolu">
        <AuroraInspectorRow label="endpoint" value="PUT /settings/effective/{key}" />
        <AuroraInspectorRow label="audit" value="otomatik" />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-settings">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Ayarlar</h1>
            <div className="sub">
              Sistem yapılandırması · settings registry ·{" "}
              {isLoading ? "yükleniyor…" : `${totalCount} kayıt`}
            </div>
          </div>
        </div>

        <div className="settings-layout">
          <div className="settings-nav">
            <div className="snav-section">Yapılandırma</div>
            {groups.map((g) => (
              <button
                key={g.id}
                className={"snav-item" + (current?.id === g.id ? " active" : "")}
                onClick={() => {
                  setActiveGroup(g.id);
                  setEditing(null);
                }}
              >
                <span>{groupLabel(g.id)}</span>
                <span className="count">{g.items.length}</span>
              </button>
            ))}
            {!groups.length && !isLoading && (
              <div
                style={{
                  padding: "16px 12px",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Henüz grup yok.
              </div>
            )}
          </div>

          <div>
            {current && (
              <div className="setting-group">
                <div className="setting-group-title">{groupLabel(current.id)}</div>
                <div className="setting-group-sub">
                  {current.items.length} kayıt · grup id <code>{current.id}</code>
                </div>
                <div className="setting-card">
                  {current.items.map((s) => {
                    const eff =
                      tryParse(s.admin_value_json) ?? tryParse(s.default_value_json);
                    const isEditing = editing === s.key;
                    return (
                      <div key={s.id}>
                        <div className="setting-row">
                          <div>
                            <div className="setting-label">{s.key}</div>
                            {s.help_text && (
                              <div className="setting-desc">{s.help_text}</div>
                            )}
                            <div className="setting-key">
                              <span className="setting-badge">{s.type}</span>
                              {s.user_override_allowed && (
                                <span className="setting-badge">user override</span>
                              )}
                              {s.read_only_for_user && (
                                <span
                                  className="setting-badge"
                                  title="Bu ayar kullanıcı override'a kapalı; user paneli read-only görür."
                                  style={{ cursor: "help" }}
                                >
                                  user read-only
                                </span>
                              )}
                              {s.visible_in_wizard && (
                                <span className="setting-badge">wizard</span>
                              )}
                              {s.module_scope && (
                                <span className="setting-badge">{s.module_scope}</span>
                              )}
                            </div>
                          </div>
                          <div
                            className="setting-control"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              minWidth: 0,
                            }}
                          >
                            <code
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: 11,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 200,
                              }}
                              title={fmtValue(eff, s.type)}
                            >
                              {fmtValue(eff, s.type)}
                            </code>
                            <AuroraButton
                              variant={isEditing ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() =>
                                setEditing(isEditing ? null : s.key)
                              }
                              iconLeft={
                                <Icon
                                  name={isEditing ? "x" : "edit"}
                                  size={11}
                                />
                              }
                            >
                              {isEditing ? "Kapat" : "Düzenle"}
                            </AuroraButton>
                          </div>
                        </div>
                        {isEditing && (
                          <RowEditor
                            setting={s}
                            current={eff}
                            onSaved={() => {
                              setEditing(null);
                              qc.invalidateQueries({ queryKey: ["settings"] });
                              qc.invalidateQueries({
                                queryKey: ["effective-settings"],
                              });
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                  {!current.items.length && (
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      Bu grupta kayıtlı ayar yok.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
