import { useNavigate } from "react-router-dom";
import { useCompleteOnboarding } from "../../hooks/useCompleteOnboarding";

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
  padding: "3rem 2.5rem",
  textAlign: "center",
};

const TITLE: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "1.75rem",
  fontWeight: 700,
  color: "#0f172a",
  letterSpacing: "-0.01em",
};

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 2rem",
  fontSize: "1rem",
  color: "#475569",
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
  background: "#f8fafc",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const FEATURE_ICON: React.CSSProperties = {
  flexShrink: 0,
  width: "32px",
  height: "32px",
  borderRadius: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "#fff",
};

const FEATURE_TEXT: React.CSSProperties = {
  flex: 1,
};

const FEATURE_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#1e293b",
};

const FEATURE_DESC: React.CSSProperties = {
  margin: "0.125rem 0 0",
  fontSize: "0.8125rem",
  color: "#64748b",
  lineHeight: 1.5,
};

const PRIMARY_BTN: React.CSSProperties = {
  display: "inline-block",
  padding: "0.75rem 2rem",
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "#fff",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "background 0.15s",
};

const SECONDARY_BTN: React.CSSProperties = {
  display: "inline-block",
  padding: "0.5rem 1.25rem",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "#64748b",
  background: "transparent",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  cursor: "pointer",
  marginTop: "0.75rem",
};

const FEATURES_DATA = [
  {
    bg: "#2563eb",
    label: "1",
    title: "Modular Content Production",
    desc: "Create standard videos, news bulletins, and more with guided wizard workflows.",
  },
  {
    bg: "#7c3aed",
    label: "2",
    title: "Full Operations Visibility",
    desc: "Track every job, step, and artifact with real-time timelines and ETA.",
  },
  {
    bg: "#059669",
    label: "3",
    title: "Publish & Analyze",
    desc: "Publish to platforms, review analytics, and optimize your content pipeline.",
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
    completeMutation.mutate(undefined, {
      onSuccess: () => navigate("/user"),
    });
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
            (e.target as HTMLButtonElement).style.background = "#1d4ed8";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = "#2563eb";
          }}
        >
          {completeMutation.isPending ? "Hazirlaniyor..." : "Kurulumu Baslat"}
        </button>

        <br />

        <button
          style={SECONDARY_BTN}
          onClick={handleSkip}
          disabled={completeMutation.isPending}
        >
          Simdilik Atla
        </button>
      </div>
    </div>
  );
}
