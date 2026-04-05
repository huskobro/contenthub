import { useSetupRequirements } from "../../hooks/useSetupRequirements";
import { useNavigate } from "react-router-dom";
import type { SetupRequirementItem } from "../../api/onboardingApi";
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
  borderRadius: radius.lg,
  border: `1px solid ${colors.border.subtle}`,
};

const STATUS_ICON: React.CSSProperties = {
  flexShrink: 0,
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: typography.size.base,
  fontWeight: 700,
};

const REQ_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: typography.size.md,
  fontWeight: 600,
  color: colors.neutral[900],
};

const REQ_DESC: React.CSSProperties = {
  margin: "0.125rem 0 0",
  fontSize: typography.size.base,
  color: colors.neutral[600],
  lineHeight: 1.4,
};

const REQ_DETAIL: React.CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: typography.size.sm,
  color: colors.success.dark,
  fontWeight: 500,
};

const PRIMARY_BTN: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.75rem",
  fontSize: typography.size.lg,
  fontWeight: 600,
  color: colors.neutral[0],
  background: colors.brand[600],
  border: "none",
  borderRadius: radius.lg,
  cursor: "pointer",
  textAlign: "center",
};

const SECONDARY_BTN: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.5rem",
  fontSize: typography.size.base,
  fontWeight: 500,
  color: colors.neutral[600],
  background: "transparent",
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.md,
  cursor: "pointer",
  marginTop: "0.5rem",
  textAlign: "center",
};

const ACTION_BTN: React.CSSProperties = {
  padding: "0.25rem 0.625rem",
  fontSize: typography.size.sm,
  fontWeight: 600,
  color: colors.brand[700],
  background: colors.info.light,
  border: `1px solid ${colors.info.light}`,
  borderRadius: radius.sm,
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
        background: isCompleted ? colors.success.light : colors.warning.light,
        borderColor: isCompleted ? colors.success.light : colors.warning.light,
      }}
    >
      <div
        style={{
          ...STATUS_ICON,
          background: isCompleted ? colors.success.light : colors.warning.light,
          color: isCompleted ? colors.success.text : colors.warning.text,
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
  onSettingsSetup?: () => void;
  onComplete?: () => void;
}

export function OnboardingRequirementsScreen({ onBack, onSourceSetup, onTemplateSetup, onSettingsSetup, onComplete }: Props) {
  const { data, isLoading, isError } = useSetupRequirements();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div style={CONTAINER}>
        <div style={{ color: colors.neutral[600], fontSize: typography.size.lg }}>Kontrol ediliyor...</div>
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
            } else if (req.key === "settings") {
              onAction = onSettingsSetup;
              actionLabel = "Ayar Ekle";
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
            onClick={onComplete ?? (() => navigate("/user"))}
          >
            Kurulumu Tamamla
          </button>
        ) : (
          <button style={{ ...PRIMARY_BTN, background: colors.neutral[600] }} onClick={() => navigate("/user")}>
            Sonra Tamamla
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
