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

const errorStyle: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "0.8rem",
  marginTop: "0.25rem",
};

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
    <div style={CONTAINER}>
      <div style={CARD}>
        <h2 style={TITLE}>Sistem Ayari Ekle</h2>
        <p style={SUBTITLE}>
          Sisteminize en az bir yapilandirilmis ayar ekleyin. Temel bir ayar
          tanimlamak kurulumu tamamlamak icin yeterlidir.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Ayar Anahtari *</label>
            <input
              style={inputStyle}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="ornek: site_name, default_language"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Grup</label>
            <select
              style={inputStyle}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            >
              <option value="general">general</option>
              <option value="video">video</option>
              <option value="publish">publish</option>
              <option value="news">news</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Tur</label>
            <select
              style={inputStyle}
              value={settingType}
              onChange={(e) => setSettingType(e.target.value)}
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="json">json</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Admin Degeri *</label>
            <input
              style={inputStyle}
              value={adminValue}
              onChange={(e) => setAdminValue(e.target.value)}
              placeholder="Ayar degeri"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Aciklama</label>
            <input
              style={inputStyle}
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="Opsiyonel aciklama"
            />
          </div>

          {validationError && <p style={errorStyle}>{validationError}</p>}
          {submitError && <p style={errorStyle}>{submitError}</p>}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                padding: "0.375rem 1rem",
                background: createMutation.isPending ? "#94a3b8" : "#1e40af",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: createMutation.isPending ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
              }}
            >
              {createMutation.isPending ? "Kaydediliyor..." : "Ayari Kaydet"}
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
