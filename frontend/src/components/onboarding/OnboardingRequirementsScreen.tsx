import { useSetupRequirements } from "../../hooks/useSetupRequirements";
import { useCompleteOnboarding } from "../../hooks/useCompleteOnboarding";
import { useNavigate } from "react-router-dom";
import type { SetupRequirementItem } from "../../api/onboardingApi";

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

const REQ_LIST: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.625rem",
  margin: "0 0 1.75rem",
};

const REQ_CARD: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  padding: "0.875rem 1rem",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const STATUS_ICON: React.CSSProperties = {
  flexShrink: 0,
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.8125rem",
  fontWeight: 700,
};

const REQ_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#1e293b",
};

const REQ_DESC: React.CSSProperties = {
  margin: "0.125rem 0 0",
  fontSize: "0.8125rem",
  color: "#64748b",
  lineHeight: 1.4,
};

const REQ_DETAIL: React.CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: "0.75rem",
  color: "#059669",
  fontWeight: 500,
};

const PRIMARY_BTN: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.75rem",
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "#fff",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "center",
};

const SECONDARY_BTN: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.5rem",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "#64748b",
  background: "transparent",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  cursor: "pointer",
  marginTop: "0.5rem",
  textAlign: "center",
};

const ACTION_BTN: React.CSSProperties = {
  padding: "0.25rem 0.625rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#1e40af",
  background: "#dbeafe",
  border: "1px solid #93c5fd",
  borderRadius: "4px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

function RequirementRow({
  item,
  onAction,
  actionLabel,
}: {
  item: SetupRequirementItem;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const isCompleted = item.status === "completed";
  return (
    <div
      style={{
        ...REQ_CARD,
        background: isCompleted ? "#f0fdf4" : "#fefce8",
        borderColor: isCompleted ? "#bbf7d0" : "#fde68a",
      }}
    >
      <div
        style={{
          ...STATUS_ICON,
          background: isCompleted ? "#dcfce7" : "#fef9c3",
          color: isCompleted ? "#166534" : "#92400e",
        }}
      >
        {isCompleted ? "\u2713" : "!"}
      </div>
      <div style={{ flex: 1 }}>
        <p style={REQ_TITLE}>{item.title}</p>
        <p style={REQ_DESC}>{item.description}</p>
        {isCompleted && item.detail && <p style={REQ_DETAIL}>{item.detail}</p>}
      </div>
      {!isCompleted && onAction && (
        <button style={ACTION_BTN} onClick={onAction}>
          {actionLabel ?? "Ekle"}
        </button>
      )}
    </div>
  );
}

interface Props {
  onBack?: () => void;
  onSourceSetup?: () => void;
  onTemplateSetup?: () => void;
}

export function OnboardingRequirementsScreen({ onBack, onSourceSetup, onTemplateSetup }: Props) {
  const { data, isLoading, isError } = useSetupRequirements();
  const completeMutation = useCompleteOnboarding();
  const navigate = useNavigate();

  function handleContinue() {
    completeMutation.mutate(undefined, {
      onSuccess: () => navigate("/user"),
    });
  }

  if (isLoading) {
    return (
      <div style={CONTAINER}>
        <div style={{ color: "#64748b", fontSize: "0.9375rem" }}>Kontrol ediliyor...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={CONTAINER}>
        <div style={CARD}>
          <h2 style={TITLE}>Bir Sorun Olustu</h2>
          <p style={SUBTITLE}>Kurulum gereksinimleri kontrol edilemedi. Lutfen tekrar deneyin.</p>
          <button style={PRIMARY_BTN} onClick={() => navigate("/user")}>
            Uygulamaya Gec
          </button>
        </div>
      </div>
    );
  }

  const completedCount = data.requirements.filter((r) => r.status === "completed").length;
  const totalCount = data.requirements.length;

  return (
    <div style={CONTAINER}>
      <div style={CARD}>
        <h2 style={TITLE}>Kurulum Durumu</h2>
        <p style={SUBTITLE}>
          Sisteminizin hazir olabilmesi icin asagidaki gereksinimleri kontrol edin.
          {completedCount === totalCount
            ? " Tum gereksinimler karsilandi!"
            : ` ${completedCount}/${totalCount} tamamlandi.`}
        </p>

        <div style={REQ_LIST}>
          {data.requirements.map((req) => {
            let onAction: (() => void) | undefined;
            let actionLabel: string | undefined;
            if (req.key === "sources") {
              onAction = onSourceSetup;
              actionLabel = "Kaynak Ekle";
            } else if (req.key === "templates") {
              onAction = onTemplateSetup;
              actionLabel = "Sablon Ekle";
            }
            return (
              <RequirementRow
                key={req.key}
                item={req}
                onAction={onAction}
                actionLabel={actionLabel}
              />
            );
          })}
        </div>

        {data.all_completed ? (
          <button
            style={PRIMARY_BTN}
            onClick={handleContinue}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? "Hazirlaniyor..." : "Kurulumu Tamamla"}
          </button>
        ) : (
          <button style={PRIMARY_BTN} onClick={() => navigate("/user")}>
            Devam Et
          </button>
        )}

        {onBack && (
          <button style={SECONDARY_BTN} onClick={onBack}>
            Geri Don
          </button>
        )}
      </div>
    </div>
  );
}
