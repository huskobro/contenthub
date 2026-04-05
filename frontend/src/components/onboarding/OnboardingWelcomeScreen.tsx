import { useNavigate } from "react-router-dom";
import { useCompleteOnboarding } from "../../hooks/useCompleteOnboarding";
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
  padding: "3rem 2.5rem",
  textAlign: "center",
};

const TITLE: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: typography.size["3xl"],
  fontWeight: 700,
  color: colors.neutral[900],
  letterSpacing: "-0.01em",
};

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 2rem",
  fontSize: typography.size.lg,
  color: colors.neutral[700],
  lineHeight: 1.6,
};

const FEATURES: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  margin: "0 0 2rem",
  textAlign: "left",
};

const FEATURE_CARD: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.75rem",
  padding: "0.875rem 1rem",
  background: colors.neutral[50],
  borderRadius: radius.lg,
  border: `1px solid ${colors.border.subtle}`,
};

const FEATURE_ICON: React.CSSProperties = {
  flexShrink: 0,
  width: "32px",
  height: "32px",
  borderRadius: radius.md,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: typography.size.md,
  fontWeight: 700,
  color: colors.neutral[0],
};

const FEATURE_TEXT: React.CSSProperties = {
  flex: 1,
};

const FEATURE_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: typography.size.md,
  fontWeight: 600,
  color: colors.neutral[900],
};

const FEATURE_DESC: React.CSSProperties = {
  margin: "0.125rem 0 0",
  fontSize: typography.size.base,
  color: colors.neutral[600],
  lineHeight: 1.5,
};

const PRIMARY_BTN: React.CSSProperties = {
  display: "inline-block",
  padding: "0.75rem 2rem",
  fontSize: typography.size.lg,
  fontWeight: 600,
  color: colors.neutral[0],
  background: colors.brand[600],
  border: "none",
  borderRadius: radius.lg,
  cursor: "pointer",
  transition: "background 0.15s",
};

const SECONDARY_BTN: React.CSSProperties = {
  display: "inline-block",
  padding: "0.5rem 1.25rem",
  fontSize: typography.size.base,
  fontWeight: 500,
  color: colors.neutral[600],
  background: "transparent",
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.md,
  cursor: "pointer",
  marginTop: "0.75rem",
};

const FEATURES_DATA = [
  {
    bg: colors.brand[600],
    label: "1",
    title: "Modular Icerik Uretimi",
    desc: "Standart video, haber bulteni ve daha fazlasini adim adim rehberli akislarla olusturun.",
  },
  {
    bg: colors.brand[700],
    label: "2",
    title: "Tam Operasyon Gorunurlugu",
    desc: "Her isi, adimi ve artefakti gercek zamanli zaman cizelgeleri ve ETA ile takip edin.",
  },
  {
    bg: colors.success.dark,
    label: "3",
    title: "Yayin ve Analiz",
    desc: "Platformlara yayinlayin, analizleri inceleyin ve icerik hattinizi optimize edin.",
  },
];

interface WelcomeProps {
  onNext?: () => void;
}

export function OnboardingWelcomeScreen({ onNext }: WelcomeProps = {}) {
  const navigate = useNavigate();
  const completeMutation = useCompleteOnboarding();

  function handleStart() {
    if (onNext) {
      onNext();
    } else {
      completeMutation.mutate(undefined, {
        onSuccess: () => navigate("/user"),
      });
    }
  }

  function handleSkip() {
    navigate("/user");
  }

  return (
    <div style={CONTAINER}>
      <div style={CARD}>
        <h1 style={TITLE}>ContentHub'a Hosgeldiniz</h1>
        <p style={SUBTITLE}>
          Icerik uretiminden yayinlamaya kadar tum sureci tek bir platformdan yonetin.
          Birka&#231; adimda sisteminizi kurun ve uretmeye baslayin.
        </p>

        <div style={FEATURES}>
          {FEATURES_DATA.map((f) => (
            <div key={f.label} style={FEATURE_CARD}>
              <div style={{ ...FEATURE_ICON, background: f.bg }}>{f.label}</div>
              <div style={FEATURE_TEXT}>
                <p style={FEATURE_TITLE}>{f.title}</p>
                <p style={FEATURE_DESC}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          style={PRIMARY_BTN}
          onClick={handleStart}
          disabled={completeMutation.isPending}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = colors.info.dark;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = colors.brand[600];
          }}
        >
          {completeMutation.isPending ? "Hazirlaniyor..." : "Kurulumu Baslat"}
        </button>

        <br />

        <button
          style={SECONDARY_BTN}
          onClick={handleSkip}
        >
          Sonra Tamamla
        </button>
      </div>
    </div>
  );
}
