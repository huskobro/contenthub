import { useCompleteOnboarding } from "../../hooks/useCompleteOnboarding";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

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
  maxWidth: "520px",
  width: "100%",
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
  padding: "2.5rem",
  textAlign: "center",
};

const CHECK_CIRCLE: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  background: "#dcfce7",
  color: "#166534",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.5rem",
  fontWeight: 700,
  margin: "0 auto 1rem",
};

const TITLE: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#0f172a",
};

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: "0.9375rem",
  color: "#475569",
  lineHeight: 1.6,
};

const CHECKLIST: React.CSSProperties = {
  textAlign: "left",
  margin: "0 0 1.75rem",
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const CHECK_ITEM: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  fontSize: "0.875rem",
  color: "#334155",
};

const CHECK_ICON: React.CSSProperties = {
  color: "#16a34a",
  fontWeight: 700,
  fontSize: "0.875rem",
  flexShrink: 0,
};

const PRIMARY_BTN: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.75rem",
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "#fff",
  background: "#16a34a",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
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
};

interface Props {
  onBack?: () => void;
}

export function OnboardingCompletionScreen({ onBack }: Props) {
  const completeMutation = useCompleteOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (!completeMutation.isSuccess && !completeMutation.isPending && !completeMutation.isError) {
      completeMutation.mutate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinue() {
    navigate("/user");
  }

  return (
    <div style={CONTAINER}>
      <div style={CARD}>
        <div style={CHECK_CIRCLE}>{"\u2713"}</div>
        <h2 style={TITLE}>Kurulum Tamamlandi</h2>
        <p style={SUBTITLE}>
          Sisteminiz kullanima hazir. Artik icerik uretmeye ve yayinlamaya baslayabilirsiniz.
        </p>

        <ul style={CHECKLIST}>
          <li style={CHECK_ITEM}>
            <span style={CHECK_ICON}>{"\u2713"}</span>
            Haber kaynaklari yapilandirildi
          </li>
          <li style={CHECK_ITEM}>
            <span style={CHECK_ICON}>{"\u2713"}</span>
            Sablonlar olusturuldu
          </li>
          <li style={CHECK_ITEM}>
            <span style={CHECK_ICON}>{"\u2713"}</span>
            Sistem ayarlari tanimlandi
          </li>
          <li style={CHECK_ITEM}>
            <span style={CHECK_ICON}>{"\u2713"}</span>
            Provider / API ayarlari yapilandirildi
          </li>
          <li style={CHECK_ITEM}>
            <span style={CHECK_ICON}>{"\u2713"}</span>
            Calisma alani tanimlandi
          </li>
        </ul>

        <button style={PRIMARY_BTN} onClick={handleContinue}>
          Uygulamaya Basla
        </button>

        {onBack && (
          <button style={SECONDARY_BTN} onClick={onBack}>
            Gereksinimleri Gozden Gecir
          </button>
        )}
      </div>
    </div>
  );
}
