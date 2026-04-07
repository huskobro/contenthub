import { useState } from "react";
import { useSaveCredential } from "../../hooks/useCredentials";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "../../lib/cn";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingProviderSetupScreen({ onBack, onComplete }: Props) {
  const saveMutation = useSaveCredential();
  const queryClient = useQueryClient();

  const [kieAiKey, setKieAiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [pexelsKey, setPexelsKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setSubmitError(null);

    if (!kieAiKey.trim() && !openaiKey.trim() && !pexelsKey.trim()) {
      setValidationError("En az bir provider API anahtari girin.");
      return;
    }

    setSaving(true);

    const credentialsToSave: { key: string; value: string }[] = [];

    if (kieAiKey.trim()) {
      credentialsToSave.push({ key: "credential.kie_ai_api_key", value: kieAiKey.trim() });
    }
    if (openaiKey.trim()) {
      credentialsToSave.push({ key: "credential.openai_api_key", value: openaiKey.trim() });
    }
    if (pexelsKey.trim()) {
      credentialsToSave.push({ key: "credential.pexels_api_key", value: pexelsKey.trim() });
    }

    try {
      for (const cred of credentialsToSave) {
        await saveMutation.mutateAsync(cred);
      }
      queryClient.invalidateQueries({ queryKey: ["setup-requirements"] });
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
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
        <h2 className="mb-1.5 text-2xl font-bold text-neutral-900 text-center">Provider / API Yapilandirmasi</h2>
        <p className="mb-7 text-lg text-neutral-700 leading-relaxed text-center">
          Icerik uretim hattinin calisabilmesi icin gerekli API anahtarlarini
          girin. Simdilik kullanmadiginiz alanlari bos birakabilirsiniz.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="text-base font-semibold text-neutral-800 mb-2 pb-1.5 border-b border-neutral-100">LLM (Dil Modeli)</div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Kie.ai API Anahtari (Gemini)</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              type="password"
              value={kieAiKey}
              onChange={(e) => setKieAiKey(e.target.value)}
              placeholder="AIza..."
              autoComplete="off"
            />
            <div className="text-xs text-neutral-500 mt-0.5">Kie.ai uzerinden Gemini LLM erisimi icin API anahtari</div>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">OpenAI API Anahtari (Fallback)</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
            <div className="text-xs text-neutral-500 mt-0.5">OpenAI uyumlu LLM fallback icin API anahtari. Bos birakilirsa fallback devre disi kalir.</div>
          </div>

          <div className="text-base font-semibold text-neutral-800 mb-2 pb-1.5 border-b border-neutral-100">Gorsel Servisler</div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-600 mb-1">Pexels API Anahtari</label>
            <input
              className="w-full py-1.5 px-2 border border-border rounded-sm text-md box-border"
              type="password"
              value={pexelsKey}
              onChange={(e) => setPexelsKey(e.target.value)}
              placeholder="..."
              autoComplete="off"
            />
            <div className="text-xs text-neutral-500 mt-0.5">Pexels gorsel arama ve indirme API anahtari</div>
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
            <button
              type="button"
              onClick={onComplete}
              className="py-1.5 px-4 bg-transparent text-neutral-400 border border-dashed border-neutral-300 rounded-sm cursor-pointer text-md ml-auto"
              title="API anahtarı girmeden geç — admin panel üzerinden sonradan ayarlanabilir"
            >
              Simdilik Atla →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
