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
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchEffectiveSettings,
  type EffectiveSetting,
} from "../../api/effectiveSettingsApi";
import { useEffectiveSettingMutation } from "../../hooks/useEffectiveSettingMutation";
import {
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

        <textarea
          className="prompt-editor"
          value={draft}
          disabled={saveMutation.isPending}
          onChange={(e) => {
            setDraft(e.target.value);
            setDirty(true);
          }}
          spellCheck={false}
        />

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
