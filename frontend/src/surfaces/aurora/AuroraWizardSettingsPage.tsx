/**
 * Aurora Wizard Governance — admin.wizard.settings override.
 *
 * Module x wizard kart düzeni; her kart için entry_mode (wizard / form)
 * toggle'ı + adım görünürlük chip listesi + step toggle'ları. Sağ
 * inspector'da KPI özetleri (genel kullanım, aktif wizard sayısı,
 * pasif modüller).
 *
 * Yazma akışı: legacy WizardSettingsPage ile aynı API çağrılarını
 * kullanır → useEffectiveSetting + useUpdateSettingValue (entry_mode)
 * ve updateWizardConfig (step enable/disable). Snapshot ya da
 * persistence path'i değiştirilmedi.
 */

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AuroraPageShell,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraButton,
  AuroraStatusChip,
  AuroraCard,
  AuroraSection,
} from "./primitives";
import { useWizardConfigsList } from "../../hooks/useWizardConfig";
import {
  useEffectiveSetting,
  useUpdateSettingValue,
} from "../../hooks/useEffectiveSettings";
import {
  updateWizardConfig,
  type WizardConfigResponse,
  type WizardStepConfig,
} from "../../api/wizardConfigApi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENTRY_MODE_KEYS: Array<{ wizardType: string; settingKey: string; label: string }> = [
  {
    wizardType: "standard_video",
    settingKey: "wizard.standard_video.entry_mode",
    label: "Standart Video",
  },
  {
    wizardType: "news_bulletin",
    settingKey: "wizard.news_bulletin.entry_mode",
    label: "Haber Bülteni",
  },
];

function entryModeLabel(value: string): string {
  return value === "form" ? "Form" : "Wizard";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraWizardSettingsPage() {
  const { data: configs, isLoading, isError, error } = useWizardConfigsList();

  // Entry-mode setting hooks (parallel calls — order is stable so the rules of
  // hooks are respected).
  const stdEntry = useEffectiveSetting(ENTRY_MODE_KEYS[0].settingKey);
  const newsEntry = useEffectiveSetting(ENTRY_MODE_KEYS[1].settingKey);

  const entryModes: Record<string, string> = {
    [ENTRY_MODE_KEYS[0].wizardType]: (stdEntry.data?.effective_value ?? "wizard") as string,
    [ENTRY_MODE_KEYS[1].wizardType]: (newsEntry.data?.effective_value ?? "wizard") as string,
  };

  const summary = useMemo(() => {
    const list = configs ?? [];
    const total = list.length;
    const active = list.filter((c) => c.enabled).length;
    const inactive = total - active;
    const wizardMode = Object.values(entryModes).filter((v) => v === "wizard").length;
    const formMode = Object.values(entryModes).filter((v) => v === "form").length;
    const inactiveModules = list.filter((c) => !c.enabled).map((c) => c.display_name);
    return { total, active, inactive, wizardMode, formMode, inactiveModules };
  }, [configs, entryModes]);

  const inspector = (
    <AuroraInspector title="Wizard governance">
      <AuroraInspectorSection title="Genel kullanım">
        <AuroraInspectorRow
          label="entry · wizard"
          value={String(summary.wizardMode)}
        />
        <AuroraInspectorRow
          label="entry · form"
          value={String(summary.formMode)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Wizard durumu">
        <AuroraInspectorRow label="toplam" value={String(summary.total)} />
        <AuroraInspectorRow label="aktif" value={String(summary.active)} />
        <AuroraInspectorRow label="pasif" value={String(summary.inactive)} />
      </AuroraInspectorSection>
      {summary.inactiveModules.length > 0 && (
        <AuroraInspectorSection title="Pasif modüller">
          {summary.inactiveModules.map((name) => (
            <AuroraInspectorRow key={name} label="·" value={name} />
          ))}
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div className="aurora-wizard-settings">
      <AuroraPageShell
        title="Wizard Governance"
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Wizard Governance" },
        ]}
        description="Modül bazlı wizard akışlarını ve giriş modlarını yönetin. Adım görünürlüğü ve aktif/pasif durumu buradan kontrol edilir."
        data-testid="aurora-wizard-settings"
      >
        {isLoading && (
          <AuroraCard pad="default">
            <span className="caption">Yükleniyor…</span>
          </AuroraCard>
        )}
        {isError && (
          <AuroraCard pad="default">
            <span className="caption" style={{ color: "var(--state-danger-fg)" }}>
              Hata: {error instanceof Error ? error.message : "Bilinmeyen"}
            </span>
          </AuroraCard>
        )}
        {!isLoading && !isError && configs && configs.length === 0 && (
          <AuroraCard pad="default">
            <span className="caption">Henüz kayıtlı wizard yapılandırması yok.</span>
          </AuroraCard>
        )}

        {configs && configs.length > 0 && (
          <div
            className="aurora-wizard-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 16,
            }}
          >
            {configs.map((cfg) => (
              <WizardCard
                key={cfg.id}
                config={cfg}
                entryMode={entryModes[cfg.wizard_type] ?? null}
                entrySettingKey={
                  ENTRY_MODE_KEYS.find((e) => e.wizardType === cfg.wizard_type)?.settingKey ??
                  null
                }
              />
            ))}
          </div>
        )}
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WizardCard — module x wizard
// ---------------------------------------------------------------------------

interface WizardCardProps {
  config: WizardConfigResponse;
  entryMode: string | null;
  entrySettingKey: string | null;
}

function WizardCard({ config, entryMode, entrySettingKey }: WizardCardProps) {
  const queryClient = useQueryClient();
  const updateEntry = useUpdateSettingValue();
  const [localSteps, setLocalSteps] = useState<WizardStepConfig[]>(
    () => structuredClone(config.steps_config),
  );
  const [wizardEnabled, setWizardEnabled] = useState(config.enabled);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const dirty =
    wizardEnabled !== config.enabled ||
    JSON.stringify(localSteps) !== JSON.stringify(config.steps_config);

  const mutation = useMutation({
    mutationFn: () =>
      updateWizardConfig(config.id, {
        enabled: wizardEnabled,
        steps_config: localSteps,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wizard-configs"] });
      setSaveMsg("Kaydedildi");
      window.setTimeout(() => setSaveMsg(null), 2000);
    },
    onError: (err: Error) => {
      setSaveMsg(`Hata: ${err.message}`);
      window.setTimeout(() => setSaveMsg(null), 4000);
    },
  });

  function toggleStep(stepKey: string) {
    setLocalSteps((prev) =>
      prev.map((s) => (s.step_key === stepKey ? { ...s, enabled: !s.enabled } : s)),
    );
  }

  function handleEntryChange(value: string) {
    if (!entrySettingKey) return;
    updateEntry.mutate({ key: entrySettingKey, value });
  }

  const sortedSteps = useMemo(
    () => [...localSteps].sort((a, b) => a.order - b.order),
    [localSteps],
  );
  const enabledStepCount = sortedSteps.filter((s) => s.enabled).length;

  const meta = (
    <span>
      {config.wizard_type} · v{config.version} · {enabledStepCount}/{sortedSteps.length} adım
    </span>
  );

  const actions = (
    <>
      <AuroraStatusChip tone={wizardEnabled ? "success" : "neutral"}>
        {wizardEnabled ? "Aktif" : "Pasif"}
      </AuroraStatusChip>
      <AuroraButton
        size="sm"
        variant="ghost"
        onClick={() => setWizardEnabled((v) => !v)}
        data-testid={`aurora-wizard-enabled-${config.wizard_type}`}
      >
        {wizardEnabled ? "Pasifleştir" : "Aktifleştir"}
      </AuroraButton>
    </>
  );

  return (
    <AuroraSection
      title={config.display_name}
      meta={meta}
      actions={actions}
      data-testid={`aurora-wizard-card-${config.wizard_type}`}
    >
      <AuroraCard pad="default">
        {/* Entry mode */}
        {entrySettingKey && (
          <div
            className="aurora-wizard-entry"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <div className="overline">Giriş modu</div>
              <div className="caption" style={{ marginTop: 2 }}>
                {entryMode === "form"
                  ? "Kullanıcı tek sayfa forma yönlendirilir."
                  : "Kullanıcı adım adım wizard akışına yönlendirilir."}
              </div>
            </div>
            <div style={{ display: "inline-flex", gap: 6 }}>
              <AuroraButton
                size="sm"
                variant={entryMode === "wizard" ? "primary" : "ghost"}
                onClick={() => handleEntryChange("wizard")}
                disabled={updateEntry.isPending}
                data-testid={`aurora-entry-wizard-${config.wizard_type}`}
              >
                {entryModeLabel("wizard")}
              </AuroraButton>
              <AuroraButton
                size="sm"
                variant={entryMode === "form" ? "primary" : "ghost"}
                onClick={() => handleEntryChange("form")}
                disabled={updateEntry.isPending}
                data-testid={`aurora-entry-form-${config.wizard_type}`}
              >
                {entryModeLabel("form")}
              </AuroraButton>
            </div>
          </div>
        )}

        {/* Step chips */}
        <div className="overline" style={{ marginBottom: 6 }}>
          Adımlar
        </div>
        <div
          className="aurora-step-chips"
          style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
        >
          {sortedSteps.map((step) => (
            <button
              key={step.step_key}
              type="button"
              onClick={() => toggleStep(step.step_key)}
              data-testid={`aurora-step-chip-${step.step_key}`}
              style={{
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: 0,
              }}
              title={step.enabled ? "Görünür — kapatmak için tıkla" : "Gizli — açmak için tıkla"}
            >
              <AuroraStatusChip tone={step.enabled ? "success" : "neutral"}>
                {step.label}
              </AuroraStatusChip>
            </button>
          ))}
          {sortedSteps.length === 0 && (
            <span className="caption">Adım tanımlanmadı.</span>
          )}
        </div>

        {/* Save row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 14,
            justifyContent: "flex-end",
          }}
        >
          {saveMsg && (
            <span
              className="caption"
              style={{
                color: saveMsg.startsWith("Hata")
                  ? "var(--state-danger-fg)"
                  : "var(--state-success-fg)",
              }}
            >
              {saveMsg}
            </span>
          )}
          <AuroraButton
            size="sm"
            variant="primary"
            disabled={!dirty || mutation.isPending}
            onClick={() => mutation.mutate()}
            data-testid={`aurora-wizard-save-${config.wizard_type}`}
          >
            {mutation.isPending ? "Kaydediliyor…" : "Kaydet"}
          </AuroraButton>
        </div>
      </AuroraCard>
    </AuroraSection>
  );
}
