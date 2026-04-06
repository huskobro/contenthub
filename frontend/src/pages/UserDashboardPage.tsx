import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";
import { DashboardActionHub } from "../components/dashboard/DashboardActionHub";

export function UserDashboardPage() {
  const { data: onboardingStatus } = useOnboardingStatus();

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  return (
    <div>
      <h2 data-testid="dashboard-heading">Anasayfa</h2>
      {onboardingCompleted ? (
        <>
          <p className="m-0 mb-6 text-lg text-neutral-700 leading-relaxed max-w-[720px]" data-testid="dashboard-context-note">
            Baslangic ve takip merkezi. Icerik akisinizi baslatabilir, yayin
            durumunu takip edebilir ve detayli islemler icin yonetim paneline
            gecebilirsiniz.
          </p>
          <PostOnboardingHandoff />
          <DashboardActionHub />
        </>
      ) : (
        <p
          className="text-neutral-700 text-lg leading-relaxed max-w-[720px]"
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
