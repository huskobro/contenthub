import { useNavigate } from "react-router-dom";

const STRIP: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.375rem 1.25rem",
  background: "#f0f9ff",
  borderBottom: "1px solid #bae6fd",
  fontSize: "0.75rem",
  color: "#0369a1",
  lineHeight: 1.4,
};

const BACK_LINK: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#0369a1",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  textDecoration: "underline",
};

export function AdminContinuityStrip() {
  const navigate = useNavigate();

  return (
    <div style={STRIP} data-testid="admin-continuity-strip">
      <span>Uretim ve yonetim islemleri icin yonetim panelindeysiniz.</span>
      <button
        style={BACK_LINK}
        onClick={() => navigate("/user")}
        data-testid="continuity-back-to-user"
      >
        Kullanici Paneline Don
      </button>
    </div>
  );
}
