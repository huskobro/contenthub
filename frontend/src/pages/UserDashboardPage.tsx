import { useNavigate } from "react-router-dom";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";
import { DashboardActionHub } from "../components/dashboard/DashboardActionHub";
import { PageShell } from "../components/design-system/primitives";

export function UserDashboardPage() {
  const navigate = useNavigate();
  const { data: onboardingStatus } = useOnboardingStatus();

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  return (
    <PageShell
      title="Anasayfa"
      subtitle="Kullanici kontrol paneli"
      testId="dashboard"
    >
      {onboardingCompleted ? (
        <>
          <p className="m-0 mb-6 text-base text-neutral-600 leading-relaxed max-w-[720px]" data-testid="dashboard-context-note">
            Baslangic ve takip merkezi. Icerik akisinizi baslatabilir, yayin durumunu takip edebilir ve
            detayli islemler icin yonetim paneline gecebilirsiniz.
          </p>

          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-brand-50 via-brand-100/50 to-surface-page rounded-xl p-5 mb-6 border border-brand-200 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white text-lg shrink-0">
              &#x1F44B;
            </div>
            <div className="flex-1 min-w-0">
              <p className="m-0 text-md font-semibold text-brand-800">
                Hosgeldiniz!
              </p>
              <p className="m-0 text-sm text-brand-600 mt-0.5">
                Yeni icerik olusturmak veya mevcut yayin durumunu kontrol etmek icin asagidaki panelleri kullanin.
              </p>
            </div>
            <button
              onClick={() => navigate("/admin")}
              className="px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg cursor-pointer hover:bg-brand-100 transition-colors duration-fast shrink-0"
            >
              Yonetim Paneli &rarr;
            </button>
          </div>

          <PostOnboardingHandoff />
          <DashboardActionHub />
        </>
      ) : (
        <div className="mt-4">
          {/* Onboarding needed banner */}
          <div
            className="bg-gradient-to-r from-warning-light via-warning-light/50 to-surface-page rounded-xl p-6 border border-warning-base/20 flex items-start gap-4 max-w-[640px]"
            data-testid="dashboard-onboarding-pending-note"
          >
            <div className="w-10 h-10 rounded-full bg-warning-base flex items-center justify-center text-white text-lg shrink-0">
              &#x26A0;
            </div>
            <div>
              <p className="m-0 text-md font-semibold text-neutral-900">
                Kurulum Tamamlanmadi
              </p>
              <p className="m-0 mt-1 text-sm text-neutral-600 leading-relaxed">
                ContentHub'a hosgeldiniz. Sistemi kullanmaya baslamak icin once
                kurulum adimlarini tamamlayin. Kurulum tamamlandiktan sonra bu
                ekrandan icerik olusturma, yayin takibi ve yonetim paneline
                erisim islemlerinizi yonetebilirsiniz.
              </p>
              <button
                onClick={() => navigate("/onboarding")}
                className="mt-3 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 border-none rounded-lg cursor-pointer hover:from-brand-700 hover:to-brand-800 shadow-sm transition-all duration-fast"
              >
                Kuruluma Basla &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
