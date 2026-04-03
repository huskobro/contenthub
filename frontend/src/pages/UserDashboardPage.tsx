import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";
import { DashboardActionHub } from "../components/dashboard/DashboardActionHub";

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.25rem",
  fontSize: "0.8125rem",
  color: "#64748b",
  lineHeight: 1.5,
  maxWidth: "720px",
};

export function UserDashboardPage() {
  const { data: onboardingStatus } = useOnboardingStatus();

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  return (
    <div>
      <h2>Anasayfa</h2>
      {onboardingCompleted ? (
        <>
          <p style={SUBTITLE} data-testid="dashboard-context-note">
            Kullanici panelindesiniz. Icerik olusturma, yayin takibi ve yonetim
            paneline gecis islemlerinizi buradan yonetebilirsiniz.
          </p>
          <PostOnboardingHandoff />
          <DashboardActionHub />
        </>
      ) : (
        <p style={{ color: "#475569", fontSize: "0.9375rem", lineHeight: 1.6 }}>
          ContentHub'a hosgeldiniz. Kurulumu tamamladiktan sonra buradan icerik
          uretmeye ve yayinlamaya baslayabilirsiniz.
        </p>
      )}
    </div>
  );
}
