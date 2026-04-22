/**
 * AuroraVisibilityRegistryPage — Aurora Dusk Cockpit / Görünürlük Kuralları (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/visibility-registry.html`.
 * Pilot pattern: AuroraSourcesRegistryPage (page-head + reg-tbl + Inspector).
 *
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık + "Kural ekle" aksiyonu)
 *   - reg-tbl: checkbox / ID (mono) / target_key (mono) / scope chip /
 *              action chip / öncelik / durum dot / güncelleme (relative)
 *   - Inspector KPI: toplam kural · scope dağılımı · action dağılımı ·
 *                    en çok hedeflenen anahtar
 *
 * Veri kaynağı: useVisibilityRulesList() — gerçek VisibilityRuleResponse[].
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.visibility.registry` slot'una kayıtlandığında otomatik devreye girer.
 *
 * Aurora Final Polish: "Kural ekle" butonu artık legacy /admin/visibility
 * yönlendirmesi yapmıyor — AuroraDetailDrawer içinde katalog-temelli Aurora
 * formu açıyor. (Bkz. AuroraVisibilityRuleCreateForm aşağıda.)
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibilityRulesList } from "../../hooks/useVisibilityRulesList";
import {
  createVisibilityRule,
  type VisibilityRuleCreate,
  type VisibilityRuleResponse,
} from "../../api/visibilityApi";
import { useToast } from "../../hooks/useToast";
import {
  filterTargetCatalog,
  flattenTargetCatalog,
  type VisibilityTargetOption,
} from "../../components/visibility/visibilityTargetCatalog";
import {
  AuroraButton,
  AuroraDetailDrawer,
  AuroraField,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraSegmented,
} from "./primitives";
import { Icon } from "./icons";

type ScopeKind = "admin" | "user" | "public";
type ActionKind = "read" | "write" | "hidden";

const SCOPE_TONE: Record<ScopeKind, { label: string; color: string }> = {
  admin: { label: "admin", color: "var(--state-info-fg)" },
  user: { label: "user", color: "var(--accent-primary-hover)" },
  public: { label: "public", color: "var(--text-muted)" },
};

const ACTION_TONE: Record<ActionKind, { label: string; color: string }> = {
  read: { label: "read", color: "var(--state-success-fg)" },
  write: { label: "write", color: "var(--state-warning-fg)" },
  hidden: { label: "hidden", color: "var(--state-danger-fg)" },
};

const RULE_TYPE_OPTIONS = [
  { value: "page", label: "Sayfa" },
  { value: "panel", label: "Panel" },
  { value: "widget", label: "Widget" },
  { value: "field", label: "Alan" },
  { value: "wizard_step", label: "Wizard" },
] as const;

const MODULE_OPTIONS = [
  { value: "", label: "Hepsi" },
  { value: "standard_video", label: "Standart Video" },
  { value: "news_bulletin", label: "Haber Bülteni" },
] as const;

const ROLE_OPTIONS = [
  { value: "", label: "Hepsi" },
  { value: "admin", label: "Admin" },
  { value: "user", label: "Kullanıcı" },
] as const;

/**
 * Test fixture'ları (target_key `test:` ile başlayan) varsayılan olarak
 * tablo dışında tutuluyor. Aynı politika legacy sayfa ile birebir.
 */
function isTestFixtureRule(targetKey: string | null | undefined): boolean {
  if (!targetKey) return false;
  return targetKey.startsWith("test:");
}

function deriveScope(rule: VisibilityRuleResponse): ScopeKind {
  const role = (rule.role_scope ?? "").toLowerCase();
  if (role === "admin") return "admin";
  if (role === "user") return "user";
  return "public";
}

function deriveAction(rule: VisibilityRuleResponse): ActionKind {
  if (!rule.visible) return "hidden";
  if (rule.read_only) return "read";
  return "write";
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const d = Math.floor(hr / 24);
  return `${d}g`;
}

// ---------------------------------------------------------------------------
// Aurora-native "Yeni kural" formu
//
// Legacy Tailwind form (VisibilityRuleCreateForm) ekranda hiçbir zaman mount
// edilmiyordu; bu bileşen onun Aurora karşılığı. Token-temelli, catalog-first,
// manuel anahtar fallback destekli.
// ---------------------------------------------------------------------------

interface RuleFormState {
  rule_type: string;
  target_key: string;
  module_scope: string;
  role_scope: string;
  visible: boolean;
  read_only: boolean;
  wizard_visible: boolean;
  priority: number;
  notes: string;
}

const INITIAL_FORM: RuleFormState = {
  rule_type: "page",
  target_key: "",
  module_scope: "",
  role_scope: "",
  visible: true,
  read_only: false,
  wizard_visible: false,
  priority: 100,
  notes: "",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 12px",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const MONO_INPUT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  fontFamily: "var(--font-mono)",
};

const TEXTAREA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  height: "auto",
  padding: "8px 12px",
  resize: "vertical",
  minHeight: 72,
  lineHeight: 1.5,
};

interface AuroraVisibilityRuleCreateFormProps {
  onSuccess: (rule: VisibilityRuleResponse) => void;
  onCancel: () => void;
}

function AuroraVisibilityRuleCreateForm({
  onSuccess,
  onCancel,
}: AuroraVisibilityRuleCreateFormProps) {
  const qc = useQueryClient();
  const toast = useToast();

  const [form, setForm] = useState<RuleFormState>(INITIAL_FORM);
  const [manualMode, setManualMode] = useState(false);
  const [targetQuery, setTargetQuery] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const filteredGroups = useMemo(
    () => filterTargetCatalog(targetQuery),
    [targetQuery],
  );
  const selectedCatalogEntry = useMemo(() => {
    if (!form.target_key) return null;
    return (
      flattenTargetCatalog().find((o) => o.key === form.target_key) ?? null
    );
  }, [form.target_key]);

  function selectCatalogOption(opt: VisibilityTargetOption) {
    setForm((prev) => ({
      ...prev,
      target_key: opt.key,
      rule_type: opt.rule_type,
    }));
    setManualMode(false);
    setValidationError(null);
  }

  const mut = useMutation({
    mutationFn: (payload: VisibilityRuleCreate) => createVisibilityRule(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["visibility-rules"] });
      toast.success(`Kural eklendi: ${data.target_key}`);
      onSuccess(data);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error(`Kural eklenemedi: ${message}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedKey = form.target_key.trim();
    if (!trimmedKey) {
      setValidationError(
        "Hedef anahtar zorunlu. Katalogdan seçin veya manuel girin.",
      );
      return;
    }
    setValidationError(null);
    mut.mutate({
      rule_type: form.rule_type,
      target_key: trimmedKey,
      module_scope: form.module_scope || null,
      role_scope: form.role_scope || null,
      visible: form.visible,
      read_only: form.read_only,
      wizard_visible: form.wizard_visible,
      priority: form.priority,
      notes: form.notes.trim() || null,
      status: "active",
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      // Drawer-body kendisi padding:18px 20px + gap:18px uygulayan bir flex
      // column container'ı. Form'un kendi gap'i onunla ters yönde toplandığında
      // ilk alan başlık + toggle satırı drawer-head'in altına gömülüyor gibi
      // görünüyordu. Form gap'ini drawer-body gap ile aynı (18px) tutarak
      // spacing hiyerarşisini tek kaynağa indiriyoruz; ilk bölüm de
      // AuroraField paternine uyan bir header satırı ile containerized.
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
      data-testid="aurora-visibility-rule-form"
    >
      {/* Hedef seçici başlık + manuel toggle — AuroraField-benzeri header
          yapısı: küçük label + secondary aksiyon. Uncontained flex row yerine
          label satırı olarak açıkça bölümlenmiş. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            minHeight: 18,
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            Hedef anahtar{" "}
            <span style={{ color: "var(--state-danger-fg)" }}>*</span>
          </label>
          <button
            type="button"
            onClick={() => setManualMode((m) => !m)}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--accent-primary-hover)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
            }}
            data-testid="aurora-visibility-manual-toggle"
          >
            {manualMode ? "← Kataloğa dön" : "Manuel anahtar gir"}
          </button>
        </div>

      {manualMode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            value={form.target_key}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, target_key: e.target.value }))
            }
            placeholder="örn: panel:jobs · field:subtitle_style · page:analytics"
            style={MONO_INPUT_STYLE}
            data-testid="aurora-visibility-manual-input"
            required
          />
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            Format: <code>tip:alt_anahtar</code>. Katalogda olmayan yeni
            anahtarlar için kullanın; kural tipini aşağıdan seçin.
          </div>
          <AuroraField label="Kural tipi">
            <AuroraSegmented
              options={RULE_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={form.rule_type}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, rule_type: v }))
              }
              data-testid="aurora-visibility-manual-rule-type"
            />
          </AuroraField>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="search"
            value={targetQuery}
            onChange={(e) => setTargetQuery(e.target.value)}
            placeholder="Ara: jobs · analytics · provider trace…"
            style={INPUT_STYLE}
            data-testid="aurora-visibility-target-search"
          />

          {selectedCatalogEntry && (
            <div
              data-testid="aurora-visibility-target-selected"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--state-info-border)",
                background: "var(--state-info-bg)",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--state-info-fg)",
                }}
              >
                seçili
              </span>
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
              >
                {selectedCatalogEntry.key}
              </code>
              <span
                style={{
                  flex: 1,
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedCatalogEntry.label} — {selectedCatalogEntry.description}
              </span>
            </div>
          )}

          <div
            data-testid="aurora-visibility-target-catalog"
            style={{
              maxHeight: 320,
              overflowY: "auto",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              background: "var(--bg-surface)",
            }}
          >
            {filteredGroups.length === 0 ? (
              <div
                style={{
                  padding: "18px 12px",
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Eşleşen anahtar yok. <em>Manuel anahtar gir</em> seçeneğini
                kullanabilirsiniz.
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div
                  key={group.id}
                  data-testid={`aurora-visibility-group-${group.id}`}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      padding: "6px 10px",
                      background: "var(--bg-inset)",
                      borderBottom: "1px solid var(--border-subtle)",
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--text-primary)",
                      }}
                    >
                      {group.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      {group.summary}
                    </div>
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {group.options.map((opt) => {
                      const isSelected = form.target_key === opt.key;
                      return (
                        <li key={opt.key}>
                          <button
                            type="button"
                            onClick={() => selectCatalogOption(opt)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 10px",
                              border: "none",
                              borderBottom: "1px solid var(--border-subtle)",
                              background: isSelected
                                ? "var(--state-info-bg)"
                                : "transparent",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: 3,
                            }}
                            data-testid={`aurora-visibility-option-${opt.key}`}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <code
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {opt.key}
                              </code>
                              <span
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 9,
                                  textTransform: "uppercase",
                                  color: "var(--text-muted)",
                                  border: "1px solid var(--border-subtle)",
                                  borderRadius: 4,
                                  padding: "0 4px",
                                }}
                              >
                                {opt.rule_type}
                              </span>
                              {isSelected && (
                                <span
                                  style={{
                                    marginLeft: "auto",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    color: "var(--state-info-fg)",
                                  }}
                                >
                                  seçili
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--text-secondary)",
                                lineHeight: 1.4,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {opt.label}
                              </span>{" "}
                              — {opt.description}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      </div>

      {/* Scope alanları */}
      <AuroraField label="Modül kapsamı">
        <AuroraSegmented
          options={MODULE_OPTIONS.map((o) => ({
            value: o.value || "__all__",
            label: o.label,
          }))}
          value={form.module_scope || "__all__"}
          onChange={(v) =>
            setForm((prev) => ({
              ...prev,
              module_scope: v === "__all__" ? "" : v,
            }))
          }
          data-testid="aurora-visibility-module-scope"
        />
      </AuroraField>

      <AuroraField label="Rol kapsamı">
        <AuroraSegmented
          options={ROLE_OPTIONS.map((o) => ({
            value: o.value || "__all__",
            label: o.label,
          }))}
          value={form.role_scope || "__all__"}
          onChange={(v) =>
            setForm((prev) => ({
              ...prev,
              role_scope: v === "__all__" ? "" : v,
            }))
          }
          data-testid="aurora-visibility-role-scope"
        />
      </AuroraField>

      {/* Davranış (görünür / salt-okunur / wizard) */}
      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          padding: 12,
          background: "var(--bg-inset)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          Davranış
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text-primary)",
          }}
        >
          <input
            type="checkbox"
            checked={form.visible}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, visible: e.target.checked }))
            }
            data-testid="aurora-visibility-visible"
          />
          <span>Görünür</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            — hedef bu kapsam için gösterilsin mi?
          </span>
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text-primary)",
          }}
        >
          <input
            type="checkbox"
            checked={form.read_only}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, read_only: e.target.checked }))
            }
            data-testid="aurora-visibility-readonly"
          />
          <span>Salt okunur</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            — düzenleme devre dışı
          </span>
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text-primary)",
          }}
        >
          <input
            type="checkbox"
            checked={form.wizard_visible}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                wizard_visible: e.target.checked,
              }))
            }
            data-testid="aurora-visibility-wizard-visible"
          />
          <span>Wizard'da görünür</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            — wizard akışında gösterilsin mi?
          </span>
        </label>
      </div>

      {/* Öncelik */}
      <AuroraField
        label="Öncelik"
        help="Düşük sayı = yüksek öncelik. 100 varsayılan."
      >
        <input
          type="number"
          value={form.priority}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              priority: Number.parseInt(e.target.value, 10) || 100,
            }))
          }
          min={0}
          max={9999}
          style={INPUT_STYLE}
          data-testid="aurora-visibility-priority"
        />
      </AuroraField>

      {/* Not */}
      <AuroraField label="Not">
        <textarea
          value={form.notes}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Bu kuralın amacı ve kapsamı hakkında açıklama…"
          rows={3}
          style={TEXTAREA_STYLE}
          data-testid="aurora-visibility-notes"
        />
      </AuroraField>

      {(validationError || mut.isError) && (
        <div
          role="alert"
          style={{
            fontSize: 12,
            color: "var(--state-danger-fg)",
            background: "var(--state-danger-bg)",
            border: "1px solid var(--state-danger-border)",
            borderRadius: 6,
            padding: "8px 10px",
          }}
        >
          {validationError ||
            (mut.error instanceof Error
              ? mut.error.message
              : "Kural oluşturulamadı.")}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <AuroraButton
          type="submit"
          variant="primary"
          size="sm"
          disabled={mut.isPending || !form.target_key.trim()}
          data-testid="aurora-visibility-submit"
        >
          {mut.isPending ? "Kaydediliyor…" : "Kural ekle"}
        </AuroraButton>
        <AuroraButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={mut.isPending}
        >
          Vazgeç
        </AuroraButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraVisibilityRegistryPage() {
  const { data: rules, isLoading, isError, error } = useVisibilityRulesList();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFixtures, setShowFixtures] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const all = rules ?? [];
  const fixtureCount = useMemo(
    () => all.filter((r) => isTestFixtureRule(r.target_key)).length,
    [all],
  );
  const list = useMemo(
    () => (showFixtures ? all : all.filter((r) => !isTestFixtureRule(r.target_key))),
    [all, showFixtures],
  );

  const stats = useMemo(() => {
    const scopes = { admin: 0, user: 0, public: 0 };
    const actions = { read: 0, write: 0, hidden: 0 };
    const targetCount = new Map<string, number>();
    for (const r of list) {
      scopes[deriveScope(r)] += 1;
      actions[deriveAction(r)] += 1;
      const k = r.target_key || "—";
      targetCount.set(k, (targetCount.get(k) ?? 0) + 1);
    }
    let topKey: string | null = null;
    let topVal = 0;
    for (const [k, v] of targetCount) {
      if (v > topVal) {
        topVal = v;
        topKey = k;
      }
    }
    return { scopes, actions, topKey, topVal };
  }, [list]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === list.length) return new Set();
      return new Set(list.map((r) => r.id));
    });
  }

  const inspector = (
    <AuroraInspector title="Visibility Engine">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam kural" value={String(list.length)} />
        <AuroraInspectorRow
          label="aktif"
          value={String(list.filter((r) => r.status === "active").length)}
        />
        {fixtureCount > 0 && (
          <AuroraInspectorRow label="test fixture" value={String(fixtureCount)} />
        )}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Scope">
        <AuroraInspectorRow label="admin" value={String(stats.scopes.admin)} />
        <AuroraInspectorRow label="user" value={String(stats.scopes.user)} />
        <AuroraInspectorRow label="public" value={String(stats.scopes.public)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Action">
        <AuroraInspectorRow label="read" value={String(stats.actions.read)} />
        <AuroraInspectorRow label="write" value={String(stats.actions.write)} />
        <AuroraInspectorRow label="hidden" value={String(stats.actions.hidden)} />
      </AuroraInspectorSection>
      {stats.topKey && (
        <AuroraInspectorSection title="En çok hedeflenen">
          <AuroraInspectorRow label="anahtar" value={stats.topKey} />
          <AuroraInspectorRow label="kural" value={String(stats.topVal)} />
        </AuroraInspectorSection>
      )}
      {selected.size > 0 && (
        <AuroraInspectorSection title="Seçim">
          <AuroraInspectorRow label="seçili" value={String(selected.size)} />
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Görünürlük kuralları</h1>
            <div className="sub">
              {list.length} kural · UI visibility engine
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            {fixtureCount > 0 && (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={showFixtures}
                  onChange={(e) => setShowFixtures(e.target.checked)}
                />
                Test fixture göster ({fixtureCount})
              </label>
            )}
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => setCreateOpen(true)}
              iconLeft={<Icon name="plus" size={11} />}
              data-testid="aurora-visibility-create-open"
            >
              Kural ekle
            </AuroraButton>
          </div>
        </div>

        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        )}

        {isError && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
          >
            {fixtureCount > 0 && !showFixtures
              ? "Henüz ürün kuralı yok (test fixture'lar gizli)."
              : "Henüz görünürlük kuralı yok."}
          </div>
        )}

        {!isLoading && !isError && list.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === list.length && list.length > 0}
                      onChange={toggleAll}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th>ID</th>
                  <th>Hedef</th>
                  <th>Scope</th>
                  <th>Action</th>
                  <th style={{ textAlign: "right" }}>Öncelik</th>
                  <th>Durum</th>
                  <th>Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const scope = deriveScope(r);
                  const action = deriveAction(r);
                  const scopeTone = SCOPE_TONE[scope];
                  const actionTone = ACTION_TONE[action];
                  const isSel = selected.has(r.id);
                  const isActive = r.status === "active";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => toggleRow(r.id)}
                      style={isSel ? { background: "var(--bg-inset)" } : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(r.id)}
                          aria-label={`${r.target_key} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(r.id)}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                        }}
                      >
                        {r.target_key}
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{ fontSize: 10, color: scopeTone.color }}
                        >
                          {scopeTone.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{ fontSize: 10, color: actionTone.color }}
                        >
                          {actionTone.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                          color: "var(--text-muted)",
                        }}
                      >
                        {r.priority}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: isActive
                              ? "var(--state-success-fg)"
                              : "var(--text-muted)",
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: isActive
                                ? "var(--state-success-fg)"
                                : "var(--text-muted)",
                              boxShadow: isActive
                                ? "0 0 6px var(--state-success-fg)"
                                : "none",
                            }}
                          />
                          {isActive ? "aktif" : r.status || "pasif"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(r.updated_at)} önce
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>

      <AuroraDetailDrawer
        item={
          createOpen
            ? {
                breadcrumb: "Visibility · Kural",
                title: "Yeni görünürlük kuralı",
                children: (
                  <AuroraVisibilityRuleCreateForm
                    onSuccess={() => setCreateOpen(false)}
                    onCancel={() => setCreateOpen(false)}
                  />
                ),
              }
            : null
        }
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
