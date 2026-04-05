import { useState } from "react";
import { useCreateSetting } from "../../hooks/useCreateSetting";
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
    <div style={CONTAINER}>
      <div style={CARD}>
        <h2 style={TITLE}>Calisma Alani Yapilandirmasi</h2>
        <p style={SUBTITLE}>
          Icerik uretim hattinin ciktilarini ve is artefaktlarini nereye
          yazacagini belirleyin. Varsayilan degerler cogu kurulum icin uygundur.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={SECTION_LABEL}>Is Artefaktlari</div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Calisma Klasoru (Workspace Root)</label>
            <input
              style={inputStyle}
              type="text"
              value={workspaceRoot}
              onChange={(e) => setWorkspaceRoot(e.target.value)}
              placeholder="workspace/jobs"
            />
            <div style={helpStyle}>
              Her isin gecici ve kalici artefaktlarinin saklanacagi dizin
            </div>
          </div>

          <div style={SECTION_LABEL}>Cikti Dizini</div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Cikti Klasoru (Output Directory)</label>
            <input
              style={inputStyle}
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="workspace/exports"
            />
            <div style={helpStyle}>
              Tamamlanan video, ses ve diger ciktilarin yazilacagi dizin
            </div>
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
