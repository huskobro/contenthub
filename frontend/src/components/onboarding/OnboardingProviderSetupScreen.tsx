import { useState } from "react";
import { useSaveCredential } from "../../hooks/useCredentials";
import { useQueryClient } from "@tanstack/react-query";
import { colors, radius, typography } from "../design-system/tokens";

const CONTAINER: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: `linear-gradient(135deg, ${colors.neutral[50]} 0%, ${colors.border.subtle} 100%)`,
  padding: "2rem",
};

const CARD: React.CSSProperties = {
  maxWidth: "560px",
  width: "100%",
  background: colors.neutral[0],
  borderRadius: radius.xl,
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
  padding: "2.5rem",
};

const TITLE: React.CSSProperties = {
  margin: "0 0 0.375rem",
  fontSize: "1.5rem",
  fontWeight: 700,
  color: colors.neutral[900],
  textAlign: "center",
};

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.75rem",
  fontSize: typography.size.lg,
  color: colors.neutral[700],
  lineHeight: 1.6,
  textAlign: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.375rem 0.5rem",
  border: `1px solid ${colors.border.default}`,
  borderRadius: radius.sm,
  fontSize: typography.size.md,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: typography.size.sm,
  fontWeight: 600,
  color: colors.neutral[600],
  marginBottom: "0.25rem",
};

const fieldStyle: React.CSSProperties = { marginBottom: "0.75rem" };

const helpStyle: React.CSSProperties = {
  fontSize: typography.size.xs,
  color: colors.neutral[500],
  marginTop: "0.125rem",
};

const errorStyle: React.CSSProperties = {
  color: colors.error.base,
  fontSize: typography.size.base,
  marginTop: "0.25rem",
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: typography.size.base,
  fontWeight: 600,
  color: colors.neutral[800],
  marginBottom: "0.5rem",
  paddingBottom: "0.375rem",
  borderBottom: `1px solid ${colors.neutral[100]}`,
};

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
    <div style={CONTAINER}>
      <div style={CARD}>
        <h2 style={TITLE}>Provider / API Yapilandirmasi</h2>
        <p style={SUBTITLE}>
          Icerik uretim hattinin calisabilmesi icin gerekli API anahtarlarini
          girin. Simdilik kullanmadiginiz alanlari bos birakabilirsiniz.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={SECTION_LABEL}>LLM (Dil Modeli)</div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Kie.ai API Anahtari (Gemini)</label>
            <input
              style={inputStyle}
              type="password"
              value={kieAiKey}
              onChange={(e) => setKieAiKey(e.target.value)}
              placeholder="AIza..."
              autoComplete="off"
            />
            <div style={helpStyle}>Kie.ai uzerinden Gemini LLM erisimi icin API anahtari</div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>OpenAI API Anahtari (Fallback)</label>
            <input
              style={inputStyle}
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
            <div style={helpStyle}>OpenAI uyumlu LLM fallback icin API anahtari. Bos birakilirsa fallback devre disi kalir.</div>
          </div>

          <div style={SECTION_LABEL}>Gorsel Servisler</div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Pexels API Anahtari</label>
            <input
              style={inputStyle}
              type="password"
              value={pexelsKey}
              onChange={(e) => setPexelsKey(e.target.value)}
              placeholder="..."
              autoComplete="off"
            />
            <div style={helpStyle}>Pexels gorsel arama ve indirme API anahtari</div>
          </div>

          {validationError && <p style={errorStyle}>{validationError}</p>}
          {submitError && <p style={errorStyle}>{submitError}</p>}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.375rem 1rem",
                background: saving ? colors.neutral[500] : colors.brand[700],
                color: colors.neutral[0],
                border: "none",
                borderRadius: radius.sm,
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: typography.size.md,
              }}
            >
              {saving ? "Kaydediliyor..." : "Ayarlari Kaydet"}
            </button>
            <button
              type="button"
              onClick={onBack}
              style={{
                padding: "0.375rem 1rem",
                background: "transparent",
                color: colors.neutral[600],
                border: `1px solid ${colors.border.default}`,
                borderRadius: radius.sm,
                cursor: "pointer",
                fontSize: typography.size.md,
              }}
            >
              Geri Don
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
