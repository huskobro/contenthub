import { useState } from "react";
import { useCreateSetting } from "../../hooks/useCreateSetting";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "../../lib/cn";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingSettingsSetupScreen({ onBack, onComplete }: Props) {
  const createMutation = useCreateSetting();
  const queryClient = useQueryClient();

  const [key, setKey] = useState("");
  const [groupName, setGroupName] = useState("general");
  const [settingType, setSettingType] = useState("string");
  const [adminValue, setAdminValue] = useState("");
  const [helpText, setHelpText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!key.trim()) {
      setValidationError("Ayar anahtari zorunludur.");
      return;
    }
    if (!adminValue.trim()) {
      setValidationError("Admin degeri zorunludur.");
      return;
    }

    createMutation.mutate(
      {
        key: key.trim(),
        group_name: groupName,
        type: settingType,
        admin_value_json: JSON.stringify(adminValue.trim()),
        status: "active",
        help_text: helpText.trim() || null,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["setup-requirements"] });
          onComplete();
        },
      }
    );
  }

  const submitError = createMutation.isError
    ? (createMutation.error as Error).message
    : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
      <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
        <h2 className="mb-1.5 text-2xl font-bold text-neutral-900 text-center">Sistem Ayari Ekle</h2>
        <p className="mb-7 text-lg text-neutral-700 leading-relaxed text-center">
          Sisteminize en az bir yapilandirilmis ayar ekleyin. Temel bir ayar
          tanimlamak kurulumu tamamlamak icin yeterlidir.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Ayar Anahtari *</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="ornek: site_name, default_language"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Grup</label>
            <select
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            >
              <option value="general">general</option>
              <option value="video">video</option>
              <option value="publish">publish</option>
              <option value="news">news</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Tur</label>
            <select
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              value={settingType}
              onChange={(e) => setSettingType(e.target.value)}
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="json">json</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Admin Degeri *</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              value={adminValue}
              onChange={(e) => setAdminValue(e.target.value)}
              placeholder="Ayar degeri"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Aciklama</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="Opsiyonel aciklama"
            />
          </div>

          {validationError && <p className="text-error text-base mt-1">{validationError}</p>}
          {submitError && <p className="text-error text-base mt-1">{submitError}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className={cn(
                "py-1.5 px-4 text-neutral-0 border-none rounded-sm text-md",
                createMutation.isPending ? "bg-neutral-500 cursor-not-allowed" : "bg-brand-700 cursor-pointer"
              )}
            >
              {createMutation.isPending ? "Kaydediliyor..." : "Ayari Kaydet"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="py-1.5 px-4 bg-transparent text-neutral-600 border border-border rounded-sm cursor-pointer text-md"
            >
              Geri Don
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
