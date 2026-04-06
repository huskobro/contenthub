/**
 * Module Management Page (Phase 2 — Faz A).
 *
 * Kayıtlı içerik modüllerini listeler, etkin/devre dışı durumlarını gösterir
 * ve admin'in modülü açıp kapatmasına izin verir.
 *
 * Her modül kartı:
 *   - Modül adı, ID ve adım sayısı
 *   - Etkin/Devre dışı toggle
 *   - Devre dışıysa uyarı kutusu (etkilenen yerler listesi)
 *   - Pipeline adımları numaralı liste
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchModules, setModuleEnabled, type ModuleInfo } from "../../api/modulesApi";
import { PageShell, SectionShell } from "../../components/design-system/primitives";
import { useToast } from "../../hooks/useToast";

// ---------------------------------------------------------------------------
// Yardımcı bileşenler
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  testId?: string;
}

function ToggleSwitch({ checked, onChange, disabled, testId }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        checked ? "bg-success" : "bg-neutral-300",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-neutral-0 shadow",
          "transform transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Devre dışı uyarı kutusu
// ---------------------------------------------------------------------------

function DisabledWarningBox() {
  return (
    <div className="mt-3 rounded-md bg-warning-light px-4 py-3 text-sm text-warning-text">
      <p className="m-0 font-medium mb-1">Bu modül devre dışı. Etkilenen yerler:</p>
      <ul className="m-0 pl-4 list-disc space-y-0.5">
        <li>Yan menüde gizlenir</li>
        <li>Komut paletinden filtrelenir</li>
        <li>Wizard akışında gösterilmez</li>
        <li>Yeni üretim başlatılamaz (HTTP 403)</li>
        <li>Mevcut kayıtlar ve işler etkilenmez</li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modül adım listesi
// ---------------------------------------------------------------------------

interface StepListProps {
  steps: ModuleInfo["steps"];
}

function StepList({ steps }: StepListProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-neutral-500 mt-3">Bu modül için adım tanımı yok.</p>
    );
  }

  return (
    <ol className="mt-3 space-y-1.5 list-none p-0 m-0">
      {steps.map((step) => (
        <li key={step.step_key} className="flex items-start gap-3">
          <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-neutral-100 text-neutral-500 text-xs font-mono font-semibold">
            {step.step_order}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-neutral-800">{step.display_name}</span>
            {step.description && (
              <span className="ml-2 text-xs text-neutral-500">{step.description}</span>
            )}
            <span className="ml-2 font-mono text-xs text-neutral-400">[{step.idempotency_type}]</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Modül kartı
// ---------------------------------------------------------------------------

interface ModuleCardProps {
  mod: ModuleInfo;
  onToggle: (moduleId: string, next: boolean) => void;
  isToggling: boolean;
}

function ModuleCard({ mod, onToggle, isToggling }: ModuleCardProps) {
  const settingsLink = `/admin/settings?group=modules`;
  const promptsLink = `/admin/settings?group=${mod.module_id}`;

  return (
    <SectionShell
      testId={`module-card-${mod.module_id}`}
    >
      {/* Kart başlık satırı */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="m-0 text-base font-semibold text-neutral-900 font-heading leading-tight">
            {mod.display_name}
          </h3>
          <p className="m-0 mt-0.5 font-mono text-xs text-neutral-400">{mod.module_id}</p>
          <p className="m-0 mt-1 text-xs text-neutral-500">
            {mod.steps.length} adım
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium ${mod.enabled ? "text-success" : "text-neutral-500"}`}>
            {mod.enabled ? "Etkin" : "Devre dışı"}
          </span>
          <ToggleSwitch
            checked={mod.enabled}
            onChange={(next) => onToggle(mod.module_id, next)}
            disabled={isToggling}
            testId={`module-toggle-${mod.module_id}`}
          />
        </div>
      </div>

      {/* Devre dışı uyarı */}
      {!mod.enabled && <DisabledWarningBox />}

      {/* Pipeline adımları */}
      <div className="mt-4">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">
          Pipeline Adımları
        </p>
        <StepList steps={mod.steps} />
      </div>

      {/* İlgili linkler */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex gap-4 text-xs">
        <a
          href={settingsLink}
          className="text-brand-600 hover:text-brand-700 no-underline"
        >
          Modül ayarları →
        </a>
        <a
          href={promptsLink}
          className="text-brand-600 hover:text-brand-700 no-underline"
        >
          Prompt ayarları →
        </a>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Ana sayfa bileşeni
// ---------------------------------------------------------------------------

export function ModuleManagementPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: modules, isLoading, isError, error } = useQuery({
    queryKey: ["modules"],
    queryFn: fetchModules,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ moduleId, enabled }: { moduleId: string; enabled: boolean }) =>
      setModuleEnabled(moduleId, enabled),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success(
        variables.enabled
          ? `Modül etkinleştirildi: ${variables.moduleId}`
          : `Modül devre dışı bırakıldı: ${variables.moduleId}`
      );
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error(`Modül durumu güncellenemedi: ${message}`);
    },
  });

  const handleToggle = (moduleId: string, enabled: boolean) => {
    toggleMutation.mutate({ moduleId, enabled });
  };

  return (
    <PageShell
      title="Modül Yönetimi"
      subtitle="Kayıtlı içerik modüllerini etkinleştirin veya devre dışı bırakın. Devre dışı modüller menüde gizlenir ve yeni iş başlatılamaz."
      testId="module-management-page"
    >
      {isLoading && (
        <p className="text-neutral-500 text-base p-4" data-testid="module-loading">
          Yükleniyor...
        </p>
      )}

      {isError && (
        <p className="text-error text-base p-4" data-testid="module-error">
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      )}

      {!isLoading && !isError && modules && modules.length === 0 && (
        <div className="text-center py-8 px-4 text-neutral-500" data-testid="module-empty">
          <p className="m-0 text-md">Kayıtlı modül bulunamadı.</p>
        </div>
      )}

      {modules && modules.length > 0 && (
        <div className="flex flex-col gap-0" data-testid="module-list">
          {modules.map((mod) => (
            <ModuleCard
              key={mod.module_id}
              mod={mod}
              onToggle={handleToggle}
              isToggling={toggleMutation.isPending}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
