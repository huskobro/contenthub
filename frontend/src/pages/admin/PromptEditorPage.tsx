/**
 * PromptEditorPage — Master Prompt Editor (Faz C)
 *
 * Sistemdeki tüm prompt tipi ayarları gruplu olarak düzenler.
 * Her modül için prompt'lar ve ilişkili wired kurallar gösterilir.
 *
 * URL param: ?module=X → ilgili modül grubunu öne getirir.
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEffectiveSettings,
  updateSettingAdminValue,
  type EffectiveSetting,
} from "../../api/effectiveSettingsApi";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";
import { useToast } from "../../hooks/useToast";
import { PromptBlockList } from "../../components/prompt-assembly/PromptBlockList";
import { RelatedRulesSection } from "../../components/prompt-assembly/RelatedRulesSection";
import { PromptPreviewSection } from "../../components/prompt-assembly/PromptPreviewSection";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatModuleScope(scope: string): string {
  return scope
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromptState {
  value: string;
  dirty: boolean;
  saving: boolean;
}

// ---------------------------------------------------------------------------
// PromptField — single editable prompt
// ---------------------------------------------------------------------------

interface PromptFieldProps {
  setting: EffectiveSetting;
  state: PromptState;
  onChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
}

function PromptField({ setting, state, onChange, onSave, onReset }: PromptFieldProps) {
  const charCount = state.value.length;
  const hasAdminOverride = setting.has_admin_override;
  const builtinDefault = typeof setting.builtin_default === "string" ? setting.builtin_default : "";

  return (
    <div
      className="border border-border-subtle rounded-lg bg-surface-card p-4"
      data-testid={`prompt-field-${setting.key}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-neutral-900">
              {setting.label}
            </span>
            {hasAdminOverride && (
              <span
                className="text-xs font-medium text-info-text bg-info-light px-2 py-0.5 rounded-full border border-info"
                data-testid={`prompt-override-badge-${setting.key}`}
              >
                Admin Değeri Aktif
              </span>
            )}
          </div>
          <code
            className="text-xs font-mono text-neutral-400 mt-0.5 block"
            data-testid={`prompt-key-${setting.key}`}
          >
            {setting.key}
          </code>
          {setting.help_text && (
            <p className="mt-1 text-sm text-neutral-500 leading-normal">
              {setting.help_text}
            </p>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={state.value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full min-h-[120px] py-2 px-3 border border-border-subtle rounded-md text-sm font-mono bg-surface-inset text-neutral-800 outline-none resize-y transition-all duration-fast focus:border-brand-400 focus:ring-[3px] focus:ring-brand-100"
        placeholder="Prompt metni giriniz..."
        data-testid={`prompt-textarea-${setting.key}`}
        disabled={state.saving}
      />

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 gap-3">
        <span
          className="text-xs text-neutral-400 tabular-nums"
          data-testid={`prompt-char-count-${setting.key}`}
        >
          {charCount} karakter
        </span>
        <div className="flex gap-2">
          {builtinDefault && (
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={state.saving || state.value === builtinDefault}
              data-testid={`prompt-reset-${setting.key}`}
            >
              Varsayılana Dön
            </ActionButton>
          )}
          <ActionButton
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={!state.dirty || state.saving}
            loading={state.saving}
            data-testid={`prompt-save-${setting.key}`}
          >
            Kaydet
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RelatedRulesPanel — wired non-prompt settings from the same module
// ---------------------------------------------------------------------------

interface RelatedRulesPanelProps {
  settings: EffectiveSetting[];
}

function RelatedRulesPanel({ settings }: RelatedRulesPanelProps) {
  if (settings.length === 0) return null;

  return (
    <div className="mt-2">
      <h4 className="text-sm font-semibold text-neutral-600 mb-2 tracking-wide uppercase">
        İlişkili Kurallar
      </h4>
      <div className="grid gap-2">
        {settings.map((s) => {
          const val =
            s.effective_value !== null && s.effective_value !== undefined
              ? String(s.effective_value)
              : "—";
          return (
            <div
              key={s.key}
              className="flex items-start gap-3 py-2 px-3 bg-surface-inset rounded-md border border-border-subtle"
              data-testid={`related-rule-${s.key}`}
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-neutral-700">{s.label}</span>
                <code className="text-xs font-mono text-neutral-400 ml-2">{s.key}</code>
                {s.help_text && (
                  <p className="text-xs text-neutral-500 mt-0.5">{s.help_text}</p>
                )}
              </div>
              <code
                className="text-xs font-mono text-neutral-500 shrink-0 max-w-[200px] truncate"
                title={val}
                data-testid={`related-rule-value-${s.key}`}
              >
                {val}
              </code>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModuleGroup — prompts + related rules for one module scope
// ---------------------------------------------------------------------------

interface ModuleGroupProps {
  moduleName: string;
  prompts: EffectiveSetting[];
  relatedRules: EffectiveSetting[];
  promptStates: Record<string, PromptState>;
  onChange: (key: string, value: string) => void;
  onSave: (key: string) => void;
  onReset: (key: string) => void;
}

function ModuleGroup({
  moduleName,
  prompts,
  relatedRules,
  promptStates,
  onChange,
  onSave,
  onReset,
}: ModuleGroupProps) {
  return (
    <SectionShell
      title={formatModuleScope(moduleName)}
      testId={`module-group-${moduleName}`}
    >
      <div className="grid gap-4">
        {prompts.map((prompt) => {
          const state = promptStates[prompt.key];
          if (!state) return null;
          return (
            <PromptField
              key={prompt.key}
              setting={prompt}
              state={state}
              onChange={(v) => onChange(prompt.key, v)}
              onSave={() => onSave(prompt.key)}
              onReset={() => onReset(prompt.key)}
            />
          );
        })}
        <RelatedRulesPanel settings={relatedRules} />
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

// Module scope options for the block section tabs
const BLOCK_MODULE_TABS = [
  { value: undefined as string | undefined, label: "Tümü" },
  { value: "news_bulletin", label: "News Bulletin" },
  { value: "standard_video", label: "Standard Video" },
];

export function PromptEditorPage() {
  const [searchParams] = useSearchParams();
  const moduleFilter = searchParams.get("module") ?? "";
  const toast = useToast();
  const queryClient = useQueryClient();

  // Active module scope tab for the Prompt Blocks section
  const [activeBlockModule, setActiveBlockModule] = useState<string | undefined>(undefined);

  // Phase AM-5: mark this as the admin-scope effective settings view so
  // the cache cannot accidentally be shared with the user-facing settings
  // panel (`EffectiveSettingsPanel` in the user surface uses its own
  // key; this marker makes the separation explicit on both sides).
  const { data: allSettings, isLoading, isError } = useQuery({
    queryKey: ["effectiveSettings", "admin-scope"],
    queryFn: () => fetchEffectiveSettings(),
  });

  // promptStates: tracks current text value + dirty + saving per key
  const [promptStates, setPromptStates] = useState<Record<string, PromptState>>({});

  // Initialise promptStates once data arrives (or re-arrives)
  useEffect(() => {
    if (!allSettings) return;
    const prompts = allSettings.filter((s) => s.type === "prompt");
    setPromptStates((prev) => {
      const next: Record<string, PromptState> = {};
      for (const p of prompts) {
        if (prev[p.key] && !prev[p.key].saving) {
          // Keep current edited state if not mid-save
          next[p.key] = prev[p.key];
        } else {
          const effectiveStr =
            p.effective_value !== null && p.effective_value !== undefined
              ? String(p.effective_value)
              : "";
          next[p.key] = { value: effectiveStr, dirty: false, saving: false };
        }
      }
      return next;
    });
  }, [allSettings]);

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      updateSettingAdminValue(key, value),
    onSuccess: (_, { key }) => {
      setPromptStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], dirty: false, saving: false },
      }));
      queryClient.invalidateQueries({ queryKey: ["effectiveSettings"] });
      toast.success("Prompt kaydedildi.");
    },
    onError: (_, { key }) => {
      setPromptStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], saving: false },
      }));
      toast.error("Kaydetme başarısız.");
    },
  });

  function handleChange(key: string, value: string) {
    setPromptStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], value, dirty: true },
    }));
  }

  function handleSave(key: string) {
    const state = promptStates[key];
    if (!state || !state.dirty) return;
    setPromptStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], saving: true },
    }));
    updateMutation.mutate({ key, value: state.value });
  }

  function handleReset(key: string) {
    const setting = allSettings?.find((s) => s.key === key);
    if (!setting) return;
    const builtinStr =
      typeof setting.builtin_default === "string" ? setting.builtin_default : "";
    setPromptStates((prev) => ({
      ...prev,
      [key]: { value: builtinStr, dirty: true, saving: false },
    }));
  }

  // ---------------------------------------------------------------------------
  // Grouping
  // ---------------------------------------------------------------------------

  const promptSettings = (allSettings ?? []).filter((s) => s.type === "prompt");
  const wiredNonPromptSettings = (allSettings ?? []).filter(
    (s) => s.wired && s.type !== "prompt"
  );

  // Collect all unique module scopes from prompts
  const moduleScopes = Array.from(
    new Set(
      promptSettings
        .map((s) => s.module_scope ?? "global")
        .filter((m) => !moduleFilter || m === moduleFilter)
    )
  ).sort();

  // Group prompts by module_scope
  const promptsByModule: Record<string, EffectiveSetting[]> = {};
  for (const p of promptSettings) {
    const scope = p.module_scope ?? "global";
    if (moduleFilter && scope !== moduleFilter) continue;
    if (!promptsByModule[scope]) promptsByModule[scope] = [];
    promptsByModule[scope].push(p);
  }

  // Related rules by module_scope (wired, non-prompt, same module)
  const relatedByModule: Record<string, EffectiveSetting[]> = {};
  for (const scope of moduleScopes) {
    relatedByModule[scope] = wiredNonPromptSettings.filter(
      (s) => (s.module_scope ?? "global") === scope
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const subtitle = moduleFilter
    ? `Modül filtresi aktif: ${formatModuleScope(moduleFilter)}`
    : "Tüm modüllerin prompt ayarlarını tek ekrandan yönetin. Değişiklikler yeni işlerden itibaren geçerli olur.";

  return (
    <PageShell
      title="Prompt Editörü"
      subtitle={subtitle}
      testId="prompt-editor"
    >
      {isLoading && (
        <div className="flex items-center gap-2 py-8 justify-center text-neutral-500" data-testid="prompt-editor-loading">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-neutral-300 border-t-brand-500 rounded-full" />
          <span>Yükleniyor...</span>
        </div>
      )}
      {isError && (
        <div className="flex flex-col items-center py-8 gap-2" data-testid="prompt-editor-error">
          <span className="text-error-base text-2xl">⚠</span>
          <p className="text-error-base text-base m-0">Ayarlar yüklenemedi. Lütfen tekrar deneyin.</p>
        </div>
      )}

      {!isLoading && !isError && moduleScopes.length === 0 && (
        <div
          className="text-center py-10 text-neutral-500"
          data-testid="prompt-editor-empty"
        >
          <p className="m-0 text-base">Prompt tipi ayar bulunamadı.</p>
        </div>
      )}

      {!isLoading && !isError && moduleScopes.length > 0 && (
        <>
          {/* Module filter hint */}
          {moduleFilter && (
            <div className="mb-4 py-2 px-3 bg-info-light border border-info rounded-md text-sm text-info-text flex items-center gap-2">
              <span>Modül filtresi aktif:</span>
              <code className="font-mono font-semibold">{moduleFilter}</code>
              <a
                href="/admin/prompt-editor"
                className="ml-auto text-xs text-neutral-500 hover:text-neutral-700 no-underline"
              >
                Tümünü Göster
              </a>
            </div>
          )}

          {/* Info banner — prompt editor usage note */}
          <div
            className="mb-5 py-3 px-4 bg-info-light border-l-[3px] border-info rounded-md text-sm text-info-text max-w-[720px]"
            data-testid="prompt-editor-notice"
          >
            <strong>Bilgi:</strong> Burada d&uuml;zenlenen promptlar yeni olu&#351;turulan
            job&apos;lara snapshot olarak uygulanır. Halihaz&#305;rda &ccedil;al&#305;&#351;an
            job&apos;lar etkilenmez.
          </div>

          {/* Section label for legacy editor */}
          <div className="mb-1 mt-1">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Eski Prompt Editörü (Settings Tabanlı)
            </span>
          </div>

          {moduleScopes.map((scope) => (
            <ModuleGroup
              key={scope}
              moduleName={scope}
              prompts={promptsByModule[scope] ?? []}
              relatedRules={relatedByModule[scope] ?? []}
              promptStates={promptStates}
              onChange={handleChange}
              onSave={handleSave}
              onReset={handleReset}
            />
          ))}
        </>
      )}

      {/* ── NEW SECTION: Prompt Blocks ── */}
      <SectionShell
        title="Prompt Blokları"
        description="Assembly engine'deki tüm prompt bloklarını görüntüleyin ve admin override ekleyin."
        testId="prompt-blocks-section"
      >
        {/* Module filter tabs */}
        <div className="flex gap-1 mb-4 border-b border-border-subtle pb-2">
          {BLOCK_MODULE_TABS.map((tab) => (
            <ActionButton
              key={tab.label}
              variant={activeBlockModule === tab.value ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveBlockModule(tab.value)}
              data-testid={`block-module-tab-${tab.label}`}
            >
              {tab.label}
            </ActionButton>
          ))}
        </div>

        <PromptBlockList moduleScope={activeBlockModule} />
      </SectionShell>

      {/* ── NEW SECTION: Related Rules ── */}
      {activeBlockModule && (
        <SectionShell
          title="İlişkili Kurallar"
          description={`${activeBlockModule} modülüne ait konfigürasyon ayarları.`}
          testId="related-rules-section"
        >
          <RelatedRulesSection moduleScope={activeBlockModule} />
        </SectionShell>
      )}

      {/* ── NEW SECTION: Preview ── */}
      <SectionShell
        title="Assembly Preview"
        description="Gerçek verilerle prompt assembly'yi test edin. Çalışan job'ları etkilemez."
        testId="assembly-preview-section"
      >
        <PromptPreviewSection />
      </SectionShell>
    </PageShell>
  );
}
