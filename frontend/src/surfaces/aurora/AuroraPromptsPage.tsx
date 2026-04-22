/**
 * Aurora Prompts — admin master prompt editor (Aurora yüzeyi).
 *
 * Tab modları:
 *   - "settings"  → effective settings tipindeki prompt'lar (kart grid + textarea editör)
 *   - "blocks"    → PromptBlockList (assembly engine blokları)  + RelatedRulesSection
 *   - "preview"   → PromptPreviewSection (canlı assembly önizleme)
 *
 * Yazma: updateSettingAdminValue(key, value) → PUT /settings/effective/{key}.
 * Snapshot kuralı (CLAUDE.md): değişiklik yalnızca yeni job'lara uygulanır.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchEffectiveSettings,
  type EffectiveSetting,
} from "../../api/effectiveSettingsApi";
import { useEffectiveSettingMutation } from "../../hooks/useEffectiveSettingMutation";
import {
  AuroraField,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
} from "./primitives";
import { PromptBlockList } from "../../components/prompt-assembly/PromptBlockList";
import { RelatedRulesSection } from "../../components/prompt-assembly/RelatedRulesSection";
import { PromptPreviewSection } from "../../components/prompt-assembly/PromptPreviewSection";

// --- helpers ---------------------------------------------------------------

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function extractVars(text: string): string[] {
  const out = new Set<string>();
  const re = /\{\{?\s*([a-zA-Z0-9_.]+)\s*\}?\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return Array.from(out).slice(0, 6);
}

function extractAllVars(text: string): string[] {
  const out = new Set<string>();
  const re = /\{\{?\s*([a-zA-Z0-9_.]+)\s*\}?\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return Array.from(out);
}

/**
 * Suggested variables per module_scope. Keeps editor preset-first instead of
 * forcing operators to remember templating keys. Scope fallbacks to "global".
 */
const SUGGESTED_VARS: Record<string, string[]> = {
  global: ["topic", "title", "language", "tone"],
  news_bulletin: [
    "news_items",
    "language",
    "tone",
    "max_duration_seconds",
    "channel_name",
  ],
  standard_video: [
    "topic",
    "language",
    "tone",
    "target_duration_seconds",
    "audience",
  ],
  product_review: ["product_name", "key_features", "language", "tone"],
  educational_video: ["topic", "audience", "language", "learning_objectives"],
  howto_video: ["topic", "steps", "language", "difficulty"],
};

function suggestedVarsFor(scope: string | null | undefined): string[] {
  return SUGGESTED_VARS[scope ?? "global"] ?? SUGGESTED_VARS.global;
}

/** Parse lightweight section headings (`## HEADING` on its own line). */
function extractSections(text: string): { line: number; title: string }[] {
  const out: { line: number; title: string }[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("## ")) {
      out.push({ line: i, title: trimmed.slice(3).trim() });
    }
  }
  return out;
}

function shorten(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function moduleLabel(scope: string | null | undefined): string {
  if (!scope) return "global";
  return scope;
}

type TabId = "settings" | "blocks" | "preview";

const TABS: { id: TabId; label: string; desc: string }[] = [
  { id: "settings", label: "Prompt'lar", desc: "Effective settings (type=prompt)" },
  { id: "blocks", label: "Bloklar", desc: "Assembly engine block kayıtları" },
  { id: "preview", label: "Önizleme", desc: "Canlı assembly preview" },
];

const BLOCK_MODULE_TABS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: "Tümü" },
  { value: "news_bulletin", label: "News Bulletin" },
  { value: "standard_video", label: "Standard Video" },
  { value: "product_review", label: "Product Review" },
];

const TAB_STRIP: CSSProperties = {
  display: "flex",
  gap: 6,
  borderBottom: "1px solid var(--border-subtle)",
  marginBottom: 16,
  paddingBottom: 0,
};

const TAB_BTN_BASE: CSSProperties = {
  padding: "8px 14px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-muted)",
  borderBottom: "2px solid transparent",
  marginBottom: -1,
  letterSpacing: "0.02em",
};

// --- page ------------------------------------------------------------------

export function AuroraPromptsPage() {
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ["effectiveSettings", "admin-scope"],
    queryFn: () => fetchEffectiveSettings(),
  });

  const prompts = useMemo<EffectiveSetting[]>(
    () => (settings ?? []).filter((s) => s.type === "prompt"),
    [settings],
  );

  const [tab, setTab] = useState<TabId>("settings");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [dirty, setDirty] = useState<boolean>(false);
  const [activeBlockModule, setActiveBlockModule] = useState<string | undefined>(
    undefined,
  );
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const active = useMemo(
    () => prompts.find((p) => p.key === activeKey) ?? null,
    [prompts, activeKey],
  );

  // Active değişince editör değerini senkronla
  useEffect(() => {
    if (!active) return;
    setDraft(asString(active.effective_value));
    setDirty(false);
  }, [active]);

  // Sekme değişince detay görünümünden çık
  useEffect(() => {
    if (tab !== "settings") setActiveKey(null);
  }, [tab]);

  // Paylasimli effective setting save hook'u — invalidation + toast + secret
  // bos-deger reddi orada. Burada sadece prompt-spesifik dirty flag'i sifirliyoruz.
  const saveMutation = useEffectiveSettingMutation({
    onSuccess: () => setDirty(false),
  });

  const moduleCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of prompts) {
      const k = moduleLabel(p.module_scope);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [prompts]);

  // Variable chip set = used ∪ suggested. We dedupe but preserve "used first"
  // order so operators see what's already present at the top.
  const chipVars = useMemo<string[]>(() => {
    if (!active) return [];
    const used = extractAllVars(draft);
    const sugg = suggestedVarsFor(active.module_scope);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of [...used, ...sugg]) {
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out.slice(0, 12);
  }, [active, draft]);

  const sections = useMemo(() => extractSections(draft), [draft]);
  const usedVars = useMemo(() => extractAllVars(draft), [draft]);

  /** Insert `{name}` at current caret; preserves dirty flag and focus. */
  const insertVariable = (name: string) => {
    const el = editorRef.current;
    const token = `{${name}}`;
    if (!el) {
      setDraft((prev) => prev + token);
      setDirty(true);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? start;
    const next = draft.slice(0, start) + token + draft.slice(end);
    setDraft(next);
    setDirty(true);
    // Restore caret after insertion
    requestAnimationFrame(() => {
      const node = editorRef.current;
      if (!node) return;
      node.focus();
      const pos = start + token.length;
      node.setSelectionRange(pos, pos);
    });
  };

  /** Jump editor caret to the start of a section heading line. */
  const jumpToSection = (lineIndex: number) => {
    const el = editorRef.current;
    if (!el) return;
    const lines = draft.split("\n");
    let offset = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i += 1) {
      offset += lines[i].length + 1; // +1 for \n
    }
    el.focus();
    el.setSelectionRange(offset, offset);
    // scrollTop rough estimate (monospaced ~ 18px/line)
    el.scrollTop = Math.max(0, lineIndex * 18 - 40);
  };

  // --- inspector ---------------------------------------------------------

  const inspector =
    tab === "settings" && active ? (
      <AuroraInspector title="Prompt detayı">
        <AuroraInspectorSection title="Tanım">
          <AuroraInspectorRow label="key" value={active.key} />
          <AuroraInspectorRow label="modül" value={moduleLabel(active.module_scope)} />
          <AuroraInspectorRow label="kaynak" value={active.source} />
          <AuroraInspectorRow
            label="admin override"
            value={
              <AuroraStatusChip tone={active.has_admin_override ? "info" : "neutral"}>
                {active.has_admin_override ? "evet" : "hayır"}
              </AuroraStatusChip>
            }
          />
        </AuroraInspectorSection>
        <AuroraInspectorSection title="Editör">
          <AuroraInspectorRow label="karakter" value={String(draft.length)} />
          <AuroraInspectorRow label="satır" value={String(draft.split("\n").length)} />
          <AuroraInspectorRow
            label="dirty"
            value={
              <AuroraStatusChip tone={dirty ? "warning" : "neutral"}>
                {dirty ? "evet" : "hayır"}
              </AuroraStatusChip>
            }
          />
          {saveMutation.isPending && (
            <AuroraInspectorRow label="durum" value="kaydediliyor…" />
          )}
          {saveMutation.isError && (
            <AuroraInspectorRow
              label="durum"
              value={<AuroraStatusChip tone="danger">hata</AuroraStatusChip>}
            />
          )}
        </AuroraInspectorSection>
        <AuroraInspectorSection title="Değişkenler">
          <AuroraInspectorRow
            label="kullanılan"
            value={String(usedVars.length)}
          />
          {usedVars.slice(0, 8).map((v) => (
            <AuroraInspectorRow
              key={v}
              label={`{${v}}`}
              value={
                <AuroraStatusChip tone="info">kullanılıyor</AuroraStatusChip>
              }
            />
          ))}
          {usedVars.length === 0 && (
            <AuroraInspectorRow
              label="ipucu"
              value="chip'e tıklayarak ekle"
            />
          )}
        </AuroraInspectorSection>
        {sections.length > 0 && (
          <AuroraInspectorSection title="Bölümler">
            {sections.slice(0, 12).map((s) => (
              <AuroraInspectorRow key={s.line} label={`L${s.line + 1}`} value={s.title} />
            ))}
          </AuroraInspectorSection>
        )}
      </AuroraInspector>
    ) : (
      <AuroraInspector title="Prompt envanteri">
        <AuroraInspectorSection title="Sistem">
          <AuroraInspectorRow label="toplam" value={String(prompts.length)} />
          <AuroraInspectorRow label="modül" value={String(moduleCounts.length)} />
          <AuroraInspectorRow
            label="aktif sekme"
            value={
              <AuroraStatusChip tone="info">
                {TABS.find((t) => t.id === tab)?.label ?? tab}
              </AuroraStatusChip>
            }
          />
        </AuroraInspectorSection>
        {moduleCounts.length > 0 && (
          <AuroraInspectorSection title="Modül dağılımı">
            {moduleCounts.slice(0, 6).map(([m, c]) => (
              <AuroraInspectorRow key={m} label={m} value={String(c)} />
            ))}
          </AuroraInspectorSection>
        )}
        {tab === "blocks" && (
          <AuroraInspectorSection title="Blok filtre">
            <AuroraInspectorRow
              label="kapsam"
              value={activeBlockModule ?? "tümü"}
            />
          </AuroraInspectorSection>
        )}
      </AuroraInspector>
    );

  // --- tab content -------------------------------------------------------

  function renderSettingsTab() {
    if (isError) {
      return (
        <div
          style={{
            padding: 24,
            fontSize: 12,
            color: "var(--text-muted)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
          }}
        >
          Promptlar yüklenemedi.
        </div>
      );
    }

    if (!active) {
      return (
        <div className="prompt-grid">
          {prompts.map((p) => {
            const text = asString(p.effective_value);
            const vars = extractVars(text);
            return (
              <div
                key={p.key}
                className="prompt-card"
                onClick={() => setActiveKey(p.key)}
              >
                <div className="p-name">{p.label || p.key}</div>
                {p.help_text && (
                  <div className="p-desc">{shorten(p.help_text, 140)}</div>
                )}
                <div className="p-preview">
                  {text ? shorten(text, 220) : "— boş prompt —"}
                </div>
                <div className="p-meta">
                  <span className="p-key">{p.key}</span>
                  <span className="p-chip">{moduleLabel(p.module_scope)}</span>
                  {vars.slice(0, 3).map((v) => (
                    <span key={v} className="p-chip">
                      {`{${v}}`}
                    </span>
                  ))}
                  {p.has_admin_override && <span className="p-chip">override</span>}
                </div>
              </div>
            );
          })}
          {!isLoading && prompts.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 32,
                textAlign: "center",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Henüz prompt tanımı yok.
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="prompt-back-btn"
            onClick={() => setActiveKey(null)}
          >
            ← Geri
          </button>
          {active.help_text && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              {active.help_text}
            </span>
          )}
        </div>

        {chipVars.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
              padding: "6px 8px",
              border: "1px solid var(--border-subtle)",
              borderBottom: "none",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              background: "var(--bg-elevated)",
            }}
            data-testid="aurora-prompt-var-chips"
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginRight: 4,
              }}
            >
              Değişken ekle
            </span>
            {chipVars.map((v) => {
              const isUsed = usedVars.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  title={
                    isUsed
                      ? `Prompt içinde {${v}} zaten kullanılıyor — tekrar eklemek için tıklayın`
                      : `İmleç konumuna {${v}} değişkenini ekle`
                  }
                  onClick={() => insertVariable(v)}
                  disabled={saveMutation.isPending}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontFamily: "var(--font-mono, ui-monospace, monospace)",
                    cursor: saveMutation.isPending ? "not-allowed" : "pointer",
                    border: isUsed
                      ? "1px solid var(--accent-primary, var(--border-strong))"
                      : "1px solid var(--border-default)",
                    background: isUsed
                      ? "var(--accent-bg, var(--bg-surface))"
                      : "var(--bg-surface)",
                    color: isUsed
                      ? "var(--accent-primary, var(--text-primary))"
                      : "var(--text-secondary)",
                  }}
                  data-testid={`aurora-prompt-var-chip-${v}`}
                >
                  {`{${v}}`}
                </button>
              );
            })}
          </div>
        )}

        {sections.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
              padding: "6px 8px",
              border: "1px solid var(--border-subtle)",
              borderTop: chipVars.length > 0 ? "none" : "1px solid var(--border-subtle)",
              borderBottom: "none",
              background: "var(--bg-surface)",
            }}
            data-testid="aurora-prompt-section-nav"
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginRight: 4,
              }}
            >
              Bölüme atla
            </span>
            {sections.map((s) => (
              <button
                key={s.line}
                type="button"
                onClick={() => jumpToSection(s.line)}
                disabled={saveMutation.isPending}
                style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: saveMutation.isPending ? "not-allowed" : "pointer",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                }}
                title={`Satır ${s.line + 1}: ${s.title}`}
              >
                §{" "}{shorten(s.title, 24)}
              </button>
            ))}
          </div>
        )}

        <AuroraField
          help={
            chipVars.length > 0
              ? "Chip'e tıklayarak imleç konumuna değişken ekleyin. “## Başlık” satırları bölüm olarak algılanır."
              : "Promptu serbest metin olarak düzenleyin. Değişkenler {isim} formatındadır."
          }
        >
          <textarea
            ref={editorRef}
            className="prompt-editor"
            value={draft}
            disabled={saveMutation.isPending}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            style={
              chipVars.length > 0 || sections.length > 0
                ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 }
                : undefined
            }
          />
        </AuroraField>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {draft.length} karakter ·{" "}
            {dirty ? "kaydedilmemiş değişiklik" : "değişiklik yok"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="prompt-back-btn"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    "Kaydedilmemiş değişiklikler silinecek. Devam edilsin mi?",
                  )
                ) {
                  return;
                }
                setDraft(asString(active.effective_value));
                setDirty(false);
              }}
            >
              Sıfırla
            </button>
            <button
              type="button"
              className="prompt-save-btn"
              disabled={!dirty || saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  key: active.key,
                  value: draft,
                  settingType: active.type,
                })
              }
            >
              {saveMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>

        {saveMutation.isError && (
          <div
            style={{
              padding: "8px 10px",
              fontSize: 11,
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
            }}
          >
            Kaydetme başarısız. Lütfen tekrar deneyin.
          </div>
        )}
      </div>
    );
  }

  function renderBlocksTab() {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            background: "var(--state-info-bg, rgba(99,102,241,0.08))",
            border: "1px solid var(--state-info-border, rgba(99,102,241,0.25))",
            borderLeft: "3px solid var(--state-info-fg, #6366f1)",
            color: "var(--state-info-fg, #6366f1)",
            padding: "10px 12px",
            borderRadius: 6,
            fontSize: 12,
            maxWidth: 720,
          }}
          data-testid="aurora-prompt-blocks-notice"
        >
          <strong>Bilgi:</strong> Burada düzenlenen promptlar yeni oluşturulan
          job'lara snapshot olarak uygulanır. Halihazırda çalışan job'lar
          etkilenmez.
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {BLOCK_MODULE_TABS.map((bm) => {
            const active = activeBlockModule === bm.value;
            return (
              <button
                key={bm.label}
                type="button"
                onClick={() => setActiveBlockModule(bm.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: active
                    ? "1px solid var(--accent-primary, var(--border-strong, #6366f1))"
                    : "1px solid var(--border-default)",
                  background: active
                    ? "var(--accent-bg, var(--bg-elevated))"
                    : "var(--bg-surface)",
                  color: active
                    ? "var(--accent-primary, var(--text-primary))"
                    : "var(--text-secondary)",
                }}
                data-testid={`aurora-prompt-block-tab-${bm.label}`}
              >
                {bm.label}
              </button>
            );
          })}
        </div>
        <PromptBlockList moduleScope={activeBlockModule} />
        {activeBlockModule && (
          <div>
            <h3
              style={{
                margin: "16px 0 8px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              İlişkili Kurallar — {activeBlockModule}
            </h3>
            <RelatedRulesSection moduleScope={activeBlockModule} />
          </div>
        )}
      </div>
    );
  }

  function renderPreviewTab() {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            background: "var(--state-info-bg, rgba(99,102,241,0.08))",
            border: "1px solid var(--state-info-border, rgba(99,102,241,0.25))",
            borderLeft: "3px solid var(--state-info-fg, #6366f1)",
            color: "var(--state-info-fg, #6366f1)",
            padding: "10px 12px",
            borderRadius: 6,
            fontSize: 12,
            maxWidth: 720,
          }}
          data-testid="aurora-prompt-preview-notice"
        >
          Gerçek verilerle prompt assembly'yi test edin. Çalışan job'ları
          etkilemez.
        </div>
        <PromptPreviewSection />
      </div>
    );
  }

  // --- render ------------------------------------------------------------

  return (
    <div className="aurora-prompts">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>{active ? active.label : "Prompt Editörü"}</h1>
            <div className="sub">
              {active
                ? `key · ${active.key}`
                : `Sistem prompt'ları · ${
                    isLoading ? "yükleniyor…" : `${prompts.length} kayıt`
                  }`}
            </div>
          </div>
          <a
            href="/admin/prompts"
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Tam editörü aç →
          </a>
        </div>

        <div style={TAB_STRIP} data-testid="aurora-prompts-tabstrip">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                title={t.desc}
                data-testid={`aurora-prompts-tab-${t.id}`}
                style={{
                  ...TAB_BTN_BASE,
                  color: isActive
                    ? "var(--accent-primary, var(--text-primary))"
                    : "var(--text-muted)",
                  borderBottom: isActive
                    ? "2px solid var(--accent-primary, var(--border-strong, #6366f1))"
                    : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "settings" && renderSettingsTab()}
        {tab === "blocks" && renderBlocksTab()}
        {tab === "preview" && renderPreviewTab()}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
