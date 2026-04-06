import { useState } from "react";
import { useCreateSetting } from "../../hooks/useCreateSetting";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "../../lib/cn";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingWorkspaceSetupScreen({ onBack, onComplete }: Props) {
  const createMutation = useCreateSetting();
  const queryClient = useQueryClient();

  const [workspaceRoot, setWorkspaceRoot] = useState("workspace/jobs");
  const [outputDir, setOutputDir] = useState("workspace/exports");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setSubmitError(null);

    if (!workspaceRoot.trim() || !outputDir.trim()) {
      setValidationError("Her iki klasor yolu da zorunludur.");
      return;
    }

    setSaving(true);

    try {
      await createMutation.mutateAsync({
        key: "workspace_root",
        group_name: "workspace",
        type: "string",
        admin_value_json: JSON.stringify(workspaceRoot.trim()),
        status: "active",
        help_text: "Is artefaktlarinin saklanacagi ana klasor yolu",
        visible_to_user: true,
        read_only_for_user: true,
      });

      await createMutation.mutateAsync({
        key: "output_dir",
        group_name: "workspace",
        type: "string",
        admin_value_json: JSON.stringify(outputDir.trim()),
        status: "active",
        help_text: "Tamamlanan ciktilarin (video, ses vb.) yazilacagi klasor yolu",
        visible_to_user: true,
        read_only_for_user: true,
      });

      queryClient.invalidateQueries({ queryKey: ["setup-requirements"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      onComplete();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Kayit sirasinda bir hata olustu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
      <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
        <h2 className="mb-1.5 text-2xl font-bold text-neutral-900 text-center">Calisma Alani Yapilandirmasi</h2>
        <p className="mb-7 text-lg text-neutral-700 leading-relaxed text-center">
          Icerik uretim hattinin ciktilarini ve is artefaktlarini nereye
          yazacagini belirleyin. Varsayilan degerler cogu kurulum icin uygundur.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="text-base font-semibold text-neutral-800 mb-2 pb-1.5 border-b border-neutral-100">Is Artefaktlari</div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Calisma Klasoru (Workspace Root)</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              type="text"
              value={workspaceRoot}
              onChange={(e) => setWorkspaceRoot(e.target.value)}
              placeholder="workspace/jobs"
            />
            <div className="text-xs text-neutral-500 mt-0.5">
              Her isin gecici ve kalici artefaktlarinin saklanacagi dizin
            </div>
          </div>

          <div className="text-base font-semibold text-neutral-800 mb-2 pb-1.5 border-b border-neutral-100">Cikti Dizini</div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Cikti Klasoru (Output Directory)</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="workspace/exports"
            />
            <div className="text-xs text-neutral-500 mt-0.5">
              Tamamlanan video, ses ve diger ciktilarin yazilacagi dizin
            </div>
          </div>

          {validationError && <p className="text-error text-base mt-1">{validationError}</p>}
          {submitError && <p className="text-error text-base mt-1">{submitError}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "py-1.5 px-4 text-neutral-0 border-none rounded-sm text-md",
                saving ? "bg-neutral-500 cursor-not-allowed" : "bg-brand-700 cursor-pointer"
              )}
            >
              {saving ? "Kaydediliyor..." : "Ayarlari Kaydet"}
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
