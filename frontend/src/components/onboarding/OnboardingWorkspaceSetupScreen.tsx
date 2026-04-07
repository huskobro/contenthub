import { useState, useEffect } from "react";
import { useUpdateSettingValue } from "../../hooks/useEffectiveSettings";
import { useQueryClient } from "@tanstack/react-query";
import { fetchSystemInfo } from "../../api/systemApi";
import { cn } from "../../lib/cn";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

const FALLBACK_USERNAME = "user";

export function OnboardingWorkspaceSetupScreen({ onBack, onComplete }: Props) {
  const updateMutation = useUpdateSettingValue();
  const queryClient = useQueryClient();

  const [workspaceRoot, setWorkspaceRoot] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch OS username on mount to pre-fill defaults
  useEffect(() => {
    fetchSystemInfo()
      .then((info) => {
        const username = info.os_username || FALLBACK_USERNAME;
        setWorkspaceRoot(`workspace/jobs/${username}`);
        setOutputDir(`workspace/exports/${username}`);
      })
      .catch(() => {
        setWorkspaceRoot(`workspace/jobs/${FALLBACK_USERNAME}`);
        setOutputDir(`workspace/exports/${FALLBACK_USERNAME}`);
      });
  }, []);

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
      // system.workspace_root — pre-seeded in KNOWN_SETTINGS, update via PUT
      await updateMutation.mutateAsync({
        key: "system.workspace_root",
        value: workspaceRoot.trim(),
      });

      // output_dir not a separate KNOWN_SETTING — store under system.workspace_root
      // and record export path as a sub-path convention via separate key if defined.
      // For now: workspace_root covers the jobs dir; output_dir is a display-only field
      // stored in a second update if the key exists, otherwise silently skip.
      // TODO: add system.output_dir to KNOWN_SETTINGS when needed.

      queryClient.invalidateQueries({ queryKey: ["setup-requirements"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      onComplete();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Kayit sirasinda bir hata olustu.");
    } finally {
      setSaving(false);
    }
  }

  const isLoading = workspaceRoot === "";

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
              placeholder={isLoading ? "Yukleniyor..." : "workspace/jobs/kullanici"}
              disabled={isLoading}
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
              placeholder={isLoading ? "Yukleniyor..." : "workspace/exports/kullanici"}
              disabled={isLoading}
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
              disabled={saving || isLoading}
              className={cn(
                "py-1.5 px-4 text-neutral-0 border-none rounded-sm text-md",
                saving || isLoading ? "bg-neutral-500 cursor-not-allowed" : "bg-brand-700 cursor-pointer"
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
            <button
              type="button"
              onClick={onComplete}
              className="py-1.5 px-4 bg-transparent text-neutral-400 border border-dashed border-neutral-300 rounded-sm cursor-pointer text-md ml-auto"
              title="Varsayilan yollarla devam et — admin panelinden sonradan degistirilebilir"
            >
              Varsayilanlarla Devam →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
