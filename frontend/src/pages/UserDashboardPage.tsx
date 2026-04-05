import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";
import { DashboardActionHub } from "../components/dashboard/DashboardActionHub";
import { colors, typography } from "../components/design-system/tokens";

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.5rem",
  fontSize: typography.size.lg,
  color: colors.neutral[700],
  lineHeight: 1.6,
  maxWidth: "720px",
};

export function UserDashboardPage() {
  const { data: onboardingStatus } = useOnboardingStatus();

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  return (
    <div>
      <h2 data-testid="dashboard-heading">Anasayfa</h2>
      {onboardingCompleted ? (
        <>
          <p style={SUBTITLE} data-testid="dashboard-context-note">
            Baslangic ve takip merkezi. Icerik akisinizi baslatabilir, yayin
            durumunu takip edebilir ve detayli islemler icin yonetim paneline
            gecebilirsiniz.
          </p>
          <PostOnboardingHandoff />
          <DashboardActionHub />
        </>
      ) : (
        <p
          style={{ color: colors.neutral[700], fontSize: typography.size.lg, lineHeight: 1.6, maxWidth: "720px" }}
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
