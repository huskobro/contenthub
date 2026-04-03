import { useNavigate } from "react-router-dom";

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
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
  background: "#16a34a",
  flexShrink: 0,
};

const STATUS_TEXT: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#16a34a",
};

const HEADING: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#0f172a",
};

const DESC: React.CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: "0.875rem",
  color: "#475569",
  lineHeight: 1.6,
};

const PRIMARY_BTN: React.CSSProperties = {
  display: "inline-block",
  padding: "0.625rem 1.25rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#fff",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const SECONDARY_BTN: React.CSSProperties = {
  display: "inline-block",
  padding: "0.625rem 1.25rem",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#475569",
  background: "transparent",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
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
        Kurulumunuz tamamlandi. Asagidaki seceneklerle ilk video iceriginizi
        olusturabilir veya yonetim paneline giderek kaynak, sablon ve
        diger ayarlari yonetebilirsiniz.
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
