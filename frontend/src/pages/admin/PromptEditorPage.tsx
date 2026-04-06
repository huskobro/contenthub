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
                className="text-xs font-medium text-info-600 bg-info-50 px-2 py-0.5 rounded-full border border-info-200"
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

export function PromptEditorPage() {
  const [searchParams] = useSearchParams();
  const moduleFilter = searchParams.get("module") ?? "";
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: allSettings, isLoading, isError } = useQuery({
    queryKey: ["effectiveSettings"],
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
        <p className="text-neutral-500 text-base p-4" data-testid="prompt-editor-loading">
          Yükleniyor...
        </p>
      )}
      {isError && (
        <p className="text-error text-base p-4" data-testid="prompt-editor-error">
          Ayarlar yüklenemedi. Lütfen tekrar deneyin.
        </p>
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
            <div className="mb-4 py-2 px-3 bg-info-50 border border-info-200 rounded-md text-sm text-info-700 flex items-center gap-2">
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

          {/* Info banner — standard_video hardcoded prompt notice */}
          <div
            className="mb-5 py-3 px-4 bg-warning-50 border-l-[3px] border-warning-400 rounded-md text-sm text-warning-800 max-w-[720px]"
            data-testid="prompt-editor-notice"
          >
            <strong>Not:</strong> <code className="font-mono">standard_video</code> modülünün
            script ve metadata promptları şu an{" "}
            <code className="font-mono">prompt_builder.py</code> içinde kodlanmıştır ve
            bu ekranda düzenlenemez. İleride Settings kayıtlarına taşınması planlanmaktadır.
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
    </PageShell>
  );
}
