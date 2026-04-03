import { useSetupRequirements } from "../../hooks/useSetupRequirements";
import { useSettingsList } from "../../hooks/useSettingsList";

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

const ROW: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.625rem 0",
  borderBottom: "1px solid #f1f5f9",
};

const ROW_LABEL: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#334155",
};

const ROW_VALUE: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#64748b",
  textAlign: "right" as const,
};

const STATUS_OK: React.CSSProperties = {
  color: "#16a34a",
  fontWeight: 600,
};

const STATUS_MISSING: React.CSSProperties = {
  color: "#94a3b8",
  fontWeight: 500,
};

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingReviewSummaryScreen({ onBack, onComplete }: Props) {
  const { data: requirements, isLoading: reqLoading } = useSetupRequirements();
  const { data: settings, isLoading: setLoading } = useSettingsList();

  const isLoading = reqLoading || setLoading;

  function getRequirementDetail(key: string): { status: string; detail: string } {
    if (!requirements?.requirements) return { status: "unknown", detail: "Bilinmiyor" };
    const req = requirements.requirements.find((r: { key: string }) => r.key === key);
    if (!req) return { status: "unknown", detail: "Bilinmiyor" };
    if (req.status === "completed" && req.detail) return { status: "ok", detail: req.detail };
    if (req.status === "completed") return { status: "ok", detail: "Tamamlandi" };
    return { status: "missing", detail: "Henuz yapilandirilmadi" };
  }

  function getProviderSummary(): { status: string; detail: string } {
    if (!settings) return { status: "unknown", detail: "Bilinmiyor" };
    const providerKeys = settings.filter(
      (s) => s.group_name === "providers" && s.status === "active" && s.admin_value_json !== "null"
    );
    if (providerKeys.length === 0) return { status: "missing", detail: "Henuz yapilandirilmadi" };
    const names = providerKeys.map((s) => s.key.replace(/_api_key$/, "").toUpperCase());
    return { status: "ok", detail: `${providerKeys.length} provider (${names.join(", ")})` };
  }

  function getWorkspaceSummary(): { status: string; detail: string } {
    if (!settings) return { status: "unknown", detail: "Bilinmiyor" };
    const wsSettings = settings.filter(
      (s) => s.group_name === "workspace" && s.status === "active" && s.admin_value_json !== "null"
    );
    if (wsSettings.length === 0) return { status: "missing", detail: "Henuz yapilandirilmadi" };
    const paths = wsSettings.map((s) => {
      try {
        return JSON.parse(s.admin_value_json);
      } catch {
        return s.admin_value_json;
      }
    });
    return { status: "ok", detail: paths.join(", ") };
  }

  const sources = getRequirementDetail("sources");
  const templates = getRequirementDetail("templates");
  const sysSettings = getRequirementDetail("settings");
  const providers = getProviderSummary();
  const workspace = getWorkspaceSummary();

  const summaryRows = [
    { label: "Haber Kaynaklari", ...sources },
    { label: "Sablonlar", ...templates },
    { label: "Sistem Ayarlari", ...sysSettings },
    { label: "Provider / API", ...providers },
    { label: "Calisma Alani", ...workspace },
  ];

  if (isLoading) {
    return (
      <div style={CONTAINER}>
        <div style={CARD}>
          <p style={{ textAlign: "center", color: "#64748b" }}>Yukleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={CONTAINER}>
      <div style={CARD}>
        <h2 style={TITLE}>Kurulum Ozeti</h2>
        <p style={SUBTITLE}>
          Onboarding sirasinda yaptiginiz yapilandirmalarin ozetini asagida
          gorebilirsiniz. Her sey hazirsa kurulumu tamamlayabilirsiniz.
        </p>

        <div style={{ marginBottom: "1.25rem" }}>
          {summaryRows.map((row) => (
            <div key={row.label} style={ROW}>
              <span style={ROW_LABEL}>{row.label}</span>
              <span style={{ ...ROW_VALUE, ...(row.status === "ok" ? STATUS_OK : STATUS_MISSING) }}>
                {row.detail}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={onComplete}
            style={{
              padding: "0.375rem 1rem",
              background: "#1e40af",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Kurulumu Tamamla
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
            Geri Don
          </button>
        </div>
      </div>
    </div>
  );
}
