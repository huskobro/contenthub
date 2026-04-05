import { colors, radius, typography } from "../design-system/tokens";
import { useNavigate } from "react-router-dom";

const CARD: React.CSSProperties = {
  background: colors.neutral[0],
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.xl,
  padding: "2rem",
  maxWidth: "560px",
};

const STATUS_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "0.75rem",
};

const STATUS_DOT: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: colors.success.base,
  flexShrink: 0,
};

const STATUS_TEXT: React.CSSProperties = {
  fontSize: typography.size.base,
  fontWeight: 600,
  color: colors.success.base,
};

const HEADING: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: typography.size["2xl"],
  fontWeight: 700,
  color: colors.neutral[900],
};

const DESC: React.CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: typography.size.md,
  color: colors.neutral[700],
  lineHeight: 1.6,
};

const PRIMARY_BTN: React.CSSProperties = {
  display: "inline-block",
  padding: "0.625rem 1.25rem",
  fontSize: typography.size.md,
  fontWeight: 600,
  color: colors.neutral[0],
  background: colors.brand[600],
  border: "none",
  borderRadius: radius.lg,
  cursor: "pointer",
};

const SECONDARY_BTN: React.CSSProperties = {
  display: "inline-block",
  padding: "0.625rem 1.25rem",
  fontSize: typography.size.md,
  fontWeight: 500,
  color: colors.neutral[700],
  background: "transparent",
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.lg,
  cursor: "pointer",
  marginLeft: "0.5rem",
};

const ACTIONS: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

export function PostOnboardingHandoff() {
  const navigate = useNavigate();

  return (
    <div style={CARD} data-testid="post-onboarding-handoff">
      <div style={STATUS_ROW}>
        <span style={STATUS_DOT} />
        <span style={STATUS_TEXT}>Sistem Hazir</span>
      </div>

      <h3 style={HEADING}>Ilk Iceriginizi Olusturun</h3>
      <p style={DESC}>
        Kurulumunuz tamamlandi. Video uretimi ana icerik akisinizdir.
        Haber bulteni ikinci uretim akisinizdir.
        Asagidaki seceneklerle ilk iceriginizi olusturabilir
        veya yonetim paneline giderek kaynak, sablon ve diger ayarlari
        yonetebilirsiniz.
      </p>

      <div style={ACTIONS}>
        <button
          style={PRIMARY_BTN}
          onClick={() => navigate("/admin/standard-videos/new")}
          data-testid="handoff-create-content"
        >
          Yeni Video Olustur
        </button>
        <button
          style={SECONDARY_BTN}
          onClick={() => navigate("/admin")}
          data-testid="handoff-go-admin"
        >
          Yonetim Paneline Git
        </button>
      </div>
    </div>
  );
}
