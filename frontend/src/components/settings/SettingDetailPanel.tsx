/**
 * SettingDetailPanel — admin setting detail with governance toggle editing (M40a).
 *
 * Shows setting identity, values, and governance flags.
 * Admin can toggle governance flags (user_override_allowed, visible_to_user,
 * read_only_for_user, visible_in_wizard) directly.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../lib/cn";
import { useSettingDetail } from "../../hooks/useSettingDetail";
import { patchSetting, type SettingPatchPayload } from "../../api/settingsApi";

const DASH = "\u2014";

function BoolBadge({ value }: { value: boolean | null | undefined }) {
  if (value == null) {
    return (
      <span
        className="inline-block px-2 py-0.5 rounded-sm text-sm font-semibold bg-neutral-50 text-neutral-700 border border-border-subtle"
      >
        {DASH}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded-sm text-sm font-semibold",
        value ? "bg-success-light text-success-text" : "bg-error-light text-error-text",
      )}
    >
      {value ? "evet" : "hay\u0131r"}
    </span>
  );
}

function GovernanceToggle({
  label,
  value,
  field,
  settingId,
  onToggle,
  saving,
}: {
  label: string;
  value: boolean | null | undefined;
  field: keyof SettingPatchPayload;
  settingId: string;
  onToggle: (field: keyof SettingPatchPayload, newValue: boolean) => void;
  saving: boolean;
}) {
  const checked = value === true;
  return (
    <div className="flex py-1.5 border-b border-neutral-100 items-center">
      <span className="w-[180px] shrink-0 text-neutral-600 text-base">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggle(field, !checked)}
          disabled={saving}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-fast cursor-pointer border-none",
            checked ? "bg-brand-600" : "bg-neutral-300",
            saving && "opacity-50 cursor-not-allowed",
          )}
          role="switch"
          aria-checked={checked}
          aria-label={label}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-fast",
              checked ? "translate-x-[18px]" : "translate-x-[3px]",
            )}
          />
        </button>
        <BoolBadge value={value} />
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-neutral-100">
      <span className="w-[180px] shrink-0 text-neutral-600 text-base">
        {label}
      </span>
      <span className="text-md break-words">{children}</span>
    </div>
  );
}

interface SettingDetailPanelProps {
  selectedId: string | null;
}

export function SettingDetailPanel({ selectedId }: SettingDetailPanelProps) {
  const { data, isLoading, isError, error } = useSettingDetail(selectedId);
  const queryClient = useQueryClient();
  const [savingField, setSavingField] = useState<string | null>(null);

  const patchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SettingPatchPayload }) =>
      patchSetting(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["effective-settings"] });
      setSavingField(null);
    },
    onError: () => {
      setSavingField(null);
    },
  });

  function handleToggle(field: keyof SettingPatchPayload, newValue: boolean) {
    if (!data?.id) return;
    setSavingField(field);
    patchMutation.mutate({
      id: data.id,
      payload: { [field]: newValue },
    });
  }

  if (!selectedId) {
    return (
      <div className="text-neutral-500 p-4">
        Detay g\u00f6rmek i\u00e7in bir ayar se\u00e7in.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-neutral-600">Y\u00fckleniyor...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-error">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isSaving = patchMutation.isPending;

  return (
    <div className="p-4">
      <h3 className="m-0 mb-1 text-lg" data-testid="setting-detail-heading">Ayar Detay\u0131</h3>
      <p className="m-0 mb-3 text-xs text-neutral-500" data-testid="setting-detail-note">
        Ayar bilgileri, degerleri ve governance durumu asagida gorunur.
      </p>

      <div className="mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="setting-section-identity">
        Kimlik ve Deger
      </div>
      <Row label="Anahtar">
        <code>{data.key ?? DASH}</code>
      </Row>
      <Row label="Grup">{data.group_name ?? DASH}</Row>
      <Row label="Tur">{data.type ?? DASH}</Row>
      <Row label="Varsayilan Deger">
        <code className="break-all [overflow-wrap:anywhere]">{data.default_value_json ?? DASH}</code>
      </Row>
      <Row label="Admin Degeri">
        <code className="break-all [overflow-wrap:anywhere]">{data.admin_value_json ?? DASH}</code>
      </Row>

      <div className="mt-3 mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="setting-section-governance">
        Governance
      </div>
      <GovernanceToggle
        label="Kullanici Gorunur"
        value={data.visible_to_user}
        field="visible_to_user"
        settingId={data.id}
        onToggle={handleToggle}
        saving={isSaving && savingField === "visible_to_user"}
      />
      <GovernanceToggle
        label="Override Izni"
        value={data.user_override_allowed}
        field="user_override_allowed"
        settingId={data.id}
        onToggle={handleToggle}
        saving={isSaving && savingField === "user_override_allowed"}
      />
      <GovernanceToggle
        label="Wizard Gorunur"
        value={data.visible_in_wizard}
        field="visible_in_wizard"
        settingId={data.id}
        onToggle={handleToggle}
        saving={isSaving && savingField === "visible_in_wizard"}
      />
      <GovernanceToggle
        label="Salt Okunur"
        value={data.read_only_for_user}
        field="read_only_for_user"
        settingId={data.id}
        onToggle={handleToggle}
        saving={isSaving && savingField === "read_only_for_user"}
      />

      <div className="mt-3 mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="setting-section-scope">
        Kapsam ve Durum
      </div>
      <Row label="Modul Kapsami">{data.module_scope ?? <em className="text-neutral-500">{DASH}</em>}</Row>
      <Row label="Aciklama">{data.help_text ?? <em className="text-neutral-500">{DASH}</em>}</Row>
      <Row label="Durum">{data.status ?? DASH}</Row>
      <Row label="Versiyon">{data.version ?? DASH}</Row>
    </div>
  );
}
