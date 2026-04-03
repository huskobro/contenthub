import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";
import { DashboardActionHub } from "../components/dashboard/DashboardActionHub";

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.25rem",
  fontSize: "0.9375rem",
  color: "#475569",
  lineHeight: 1.6,
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
            Baslangic merkezi. Icerik olusturma, yayin takibi ve yonetim
            paneline gecis islemlerinizi buradan yonetebilirsiniz.
          </p>
          <PostOnboardingHandoff />
          <DashboardActionHub />
        </>
      ) : (
        <p
          style={{ color: "#475569", fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: "720px" }}
          data-testid="dashboard-onboarding-pending-note"
        >
          ContentHub'a hosgeldiniz. Sistemi kullanmaya baslamak icin once
          kurulum adimlarini tamamlayin. Kurulum tamamlandiktan sonra bu
          ekrandan icerik olusturma, yayin takibi ve yonetim paneline
          erisim islemlerinizi yonetebilirsiniz.
        </p>
      )}
    </div>
  );
}
