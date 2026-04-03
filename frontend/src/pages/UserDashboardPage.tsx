import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";

export function UserDashboardPage() {
  const { data: onboardingStatus } = useOnboardingStatus();

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  return (
    <div>
      <h2>Anasayfa</h2>
      {onboardingCompleted ? (
        <PostOnboardingHandoff />
      ) : (
        <p style={{ color: "#475569", fontSize: "0.9375rem", lineHeight: 1.6 }}>
          ContentHub'a hosgeldiniz. Kurulumu tamamladiktan sonra buradan icerik
          uretmeye ve yayinlamaya baslayabilirsiniz.
        </p>
      )}
    </div>
  );
}
