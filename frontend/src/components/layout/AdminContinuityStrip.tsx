import { useNavigate } from "react-router-dom";
import { colors, typography, spacing, transition } from "../../components/design-system/tokens";

export function AdminContinuityStrip() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${spacing[1]} ${spacing[6]}`,
        background: colors.brand[50],
        borderBottom: `1px solid ${colors.brand[100]}`,
        fontSize: typography.size.sm,
        fontFamily: typography.fontFamily,
        color: colors.brand[700],
        lineHeight: typography.lineHeight.normal,
        flexShrink: 0,
      }}
      data-testid="admin-continuity-strip"
    >
      <span>Uretim ve yonetim islemleri icin yonetim panelindeysiniz.</span>
      <button
        style={{
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
          fontFamily: typography.fontFamily,
          color: colors.brand[700],
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
          transition: `color ${transition.fast}`,
        }}
        onClick={() => navigate("/user")}
        data-testid="continuity-back-to-user"
      >
        Kullanici Paneline Don
      </button>
    </div>
  );
}
