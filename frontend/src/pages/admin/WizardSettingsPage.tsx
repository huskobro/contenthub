import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWizardConfigsList } from "../../hooks/useWizardConfig";
import {
  updateWizardConfig,
  type WizardConfigResponse,
  type WizardStepConfig,
  type WizardStepFieldConfig,
} from "../../api/wizardConfigApi";
import { PageShell, SectionShell } from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// WizardSettingsPage — Admin page for managing wizard governance configs
// ---------------------------------------------------------------------------

export function WizardSettingsPage() {
  const { data: configs, isLoading, isError, error } = useWizardConfigsList();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <PageShell title="Wizard Ayarlari" testId="wizard-settings">
      <p className="mt-0 mb-4 text-xs text-neutral-400">
        Wizard yapilandirmalarini yonetin. Adim ve alan gorunurlugunu, zorunluluk ve onizleme ayarlarini buradan kontrol edebilirsiniz.
      </p>

      <SectionShell testId="wizard-configs-section">
        {isLoading && <p className="text-neutral-500 text-sm p-4">Yukleniyor...</p>}
        {isError && (
          <p className="text-red-600 text-sm p-4">
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </p>
        )}
        {!isLoading && !isError && configs && configs.length === 0 && (
          <div className="text-center py-8 px-4 text-neutral-500">
            <p className="m-0 text-sm">Henuz kayitli wizard yapilandirmasi yok.</p>
          </div>
        )}
        {configs && configs.length > 0 && (
          <div className="divide-y divide-border">
            {configs.map((cfg) => (
              <WizardConfigRow
                key={cfg.id}
                config={cfg}
                isExpanded={expandedId === cfg.id}
                onToggle={() => setExpandedId(expandedId === cfg.id ? null : cfg.id)}
              />
            ))}
          </div>
        )}
      </SectionShell>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// WizardConfigRow — Summary row + expandable detail editor
// ---------------------------------------------------------------------------

interface WizardConfigRowProps {
  config: WizardConfigResponse;
  isExpanded: boolean;
  onToggle: () => void;
}

function WizardConfigRow({ config, isExpanded, onToggle }: WizardConfigRowProps) {
  return (
    <div data-testid={`wizard-config-${config.wizard_type}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-neutral-900">{config.display_name}</span>
          <span className="text-xs text-neutral-400 font-mono">{config.wizard_type}</span>
          <span
            className={cn(
              "inline-block px-2 py-0.5 rounded-sm text-xs font-medium",
              config.enabled
                ? "bg-green-100 text-green-700"
                : "bg-neutral-100 text-neutral-500",
            )}
          >
            {config.enabled ? "Aktif" : "Pasif"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <span>{config.steps_config.length} adim</span>
          <span>v{config.version}</span>
          <span className="text-neutral-300">{isExpanded ? "\u25B2" : "\u25BC"}</span>
        </div>
      </button>

      {isExpanded && <WizardConfigEditor config={config} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WizardConfigEditor — Detail editor panel
// ---------------------------------------------------------------------------

interface WizardConfigEditorProps {
  config: WizardConfigResponse;
}

function WizardConfigEditor({ config }: WizardConfigEditorProps) {
  const queryClient = useQueryClient();
  const [localSteps, setLocalSteps] = useState<WizardStepConfig[]>(
    () => structuredClone(config.steps_config),
  );
  const [wizardEnabled, setWizardEnabled] = useState(config.enabled);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      updateWizardConfig(config.id, {
        enabled: wizardEnabled,
        steps_config: localSteps,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wizard-configs"] });
      setSaveMsg("Kaydedildi");
      setTimeout(() => setSaveMsg(null), 2000);
    },
    onError: (err: Error) => {
      setSaveMsg(`Hata: ${err.message}`);
      setTimeout(() => setSaveMsg(null), 4000);
    },
  });

  const handleStepToggle = useCallback((stepKey: string, enabled: boolean) => {
    setLocalSteps((prev) =>
      prev.map((s) => (s.step_key === stepKey ? { ...s, enabled } : s)),
    );
  }, []);

  const handleFieldChange = useCallback(
    (stepKey: string, fieldKey: string, patch: Partial<WizardStepFieldConfig>) => {
      setLocalSteps((prev) =>
        prev.map((s) => {
          if (s.step_key !== stepKey) return s;
          return {
            ...s,
            fields: s.fields.map((f) =>
              f.field_key === fieldKey ? { ...f, ...patch } : f,
            ),
          };
        }),
      );
    },
    [],
  );

  return (
    <div className="px-4 pb-4 border-t border-border bg-neutral-50/50">
      {/* Wizard enabled toggle */}
      <div className="flex items-center gap-3 py-3">
        <label className="text-sm text-neutral-700 font-medium">Wizard Aktif:</label>
        <ToggleSwitch
          checked={wizardEnabled}
          onChange={setWizardEnabled}
          testId={`wizard-enabled-${config.wizard_type}`}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {localSteps
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <StepSection
              key={step.step_key}
              step={step}
              isExpanded={expandedStep === step.step_key}
              onToggle={() =>
                setExpandedStep(expandedStep === step.step_key ? null : step.step_key)
              }
              onStepToggle={handleStepToggle}
              onFieldChange={handleFieldChange}
            />
          ))}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          className="px-4 py-1.5 text-sm font-medium rounded-sm bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>
        {saveMsg && (
          <span
            className={cn(
              "text-xs",
              saveMsg.startsWith("Hata") ? "text-red-600" : "text-green-600",
            )}
          >
            {saveMsg}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepSection — Expandable step with fields
// ---------------------------------------------------------------------------

interface StepSectionProps {
  step: WizardStepConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onStepToggle: (stepKey: string, enabled: boolean) => void;
  onFieldChange: (stepKey: string, fieldKey: string, patch: Partial<WizardStepFieldConfig>) => void;
}

function StepSection({ step, isExpanded, onToggle, onStepToggle, onFieldChange }: StepSectionProps) {
  return (
    <div className="border border-border rounded-sm bg-white">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-2 text-left flex-1"
          onClick={onToggle}
        >
          <span className="text-xs text-neutral-300">{isExpanded ? "\u25B2" : "\u25BC"}</span>
          <span className="text-sm font-medium text-neutral-800">{step.label}</span>
          <span className="text-xs text-neutral-400 font-mono">({step.step_key})</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Aktif:</span>
          <ToggleSwitch
            checked={step.enabled}
            onChange={(v) => onStepToggle(step.step_key, v)}
            testId={`step-enabled-${step.step_key}`}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500">
                <th className="text-left px-3 py-1.5 font-medium">Alan</th>
                <th className="text-left px-3 py-1.5 font-medium">Tip</th>
                <th className="text-center px-2 py-1.5 font-medium">Gorunur</th>
                <th className="text-center px-2 py-1.5 font-medium">Zorunlu</th>
                <th className="text-center px-2 py-1.5 font-medium">Onizleme</th>
                <th className="text-left px-3 py-1.5 font-medium">Varsayilan</th>
                <th className="text-left px-3 py-1.5 font-medium">Yardim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {step.fields.map((field) => (
                <FieldRow
                  key={field.field_key}
                  stepKey={step.step_key}
                  field={field}
                  onFieldChange={onFieldChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldRow — Single field config row
// ---------------------------------------------------------------------------

interface FieldRowProps {
  stepKey: string;
  field: WizardStepFieldConfig;
  onFieldChange: (stepKey: string, fieldKey: string, patch: Partial<WizardStepFieldConfig>) => void;
}

function FieldRow({ stepKey, field, onFieldChange }: FieldRowProps) {
  const isLocked = !field.admin_hideable;

  return (
    <tr className="hover:bg-neutral-50/50">
      <td className="px-3 py-1.5">
        <div className="flex flex-col">
          <span className="text-neutral-800 font-medium">{field.label}</span>
          <span className="text-neutral-400 font-mono text-[10px]">{field.field_key}</span>
        </div>
      </td>
      <td className="px-3 py-1.5 text-neutral-500 font-mono">{field.field_type}</td>
      <td className="text-center px-2 py-1.5">
        {isLocked ? (
          <span className="text-neutral-300" title="admin_hideable=false, kilitli">
            {field.visible ? "Evet" : "Hayir"}
          </span>
        ) : (
          <ToggleSwitch
            checked={field.visible}
            onChange={(v) => onFieldChange(stepKey, field.field_key, { visible: v })}
            testId={`field-visible-${field.field_key}`}
          />
        )}
      </td>
      <td className="text-center px-2 py-1.5">
        <ToggleSwitch
          checked={field.required}
          onChange={(v) => onFieldChange(stepKey, field.field_key, { required: v })}
          testId={`field-required-${field.field_key}`}
        />
      </td>
      <td className="text-center px-2 py-1.5">
        <ToggleSwitch
          checked={field.preview_enabled}
          onChange={(v) => onFieldChange(stepKey, field.field_key, { preview_enabled: v })}
          testId={`field-preview-${field.field_key}`}
        />
      </td>
      <td className="px-3 py-1.5 text-neutral-500 max-w-[120px] truncate">
        {field.default_value !== null && field.default_value !== undefined
          ? String(field.default_value)
          : "-"}
      </td>
      <td className="px-3 py-1.5 text-neutral-400 max-w-[160px] truncate">
        {field.help_text ?? "-"}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// ToggleSwitch — Minimal toggle component
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  testId?: string;
}

function ToggleSwitch({ checked, onChange, testId }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-testid={testId}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer",
        checked ? "bg-brand-600" : "bg-neutral-300",
      )}
      onClick={() => onChange(!checked)}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}
