import { useState } from "react";
import { useCreateSetting } from "../../hooks/useCreateSetting";
import { useQueryClient } from "@tanstack/react-query";

const CONTAINER: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
  padding: "2rem",
};

const CARD: React.CSSProperties = {
  maxWidth: "560px",
  width: "100%",
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
  padding: "2.5rem",
};

const TITLE: React.CSSProperties = {
  margin: "0 0 0.375rem",
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#0f172a",
  textAlign: "center",
};

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.75rem",
  fontSize: "0.9375rem",
  color: "#475569",
  lineHeight: 1.6,
  textAlign: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.375rem 0.5rem",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  fontSize: "0.875rem",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#64748b",
  marginBottom: "0.25rem",
};

const fieldStyle: React.CSSProperties = { marginBottom: "0.75rem" };

const helpStyle: React.CSSProperties = {
  fontSize: "0.6875rem",
  color: "#94a3b8",
  marginTop: "0.125rem",
};

const errorStyle: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "0.8rem",
  marginTop: "0.25rem",
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "0.5rem",
  paddingBottom: "0.375rem",
  borderBottom: "1px solid #f1f5f9",
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
                background: saving ? "#94a3b8" : "#1e40af",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
              }}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={onBack}
              style={{
                padding: "0.375rem 1rem",
                background: "transparent",
                color: "#64748b",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Iptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
