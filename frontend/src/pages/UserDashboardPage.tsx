import { useNavigate } from "react-router-dom";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";
import { DashboardActionHub } from "../components/dashboard/DashboardActionHub";
import { UserJobTracker } from "../components/dashboard/UserJobTracker";
import { PageShell } from "../components/design-system/primitives";

export function UserDashboardPage() {
  const navigate = useNavigate();
  const { data: onboardingStatus } = useOnboardingStatus();

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  return (
    <PageShell
      title="Anasayfa"
      subtitle="Kullanıcı kontrol paneli"
      testId="dashboard"
    >
      {onboardingCompleted ? (
        <div className="space-y-5">
          {/* 1 — Hızlı Erişim (en üstte) */}
          <DashboardActionHub />

          {/* 2 — İş Takibi (iki sütunlu) */}
          <div>
            <p className="m-0 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              İş Takibi
            </p>
            <UserJobTracker />
          </div>

          {/* 3 — İlk içerik oluşturma (en altta, sadece gerekirse) */}
          <PostOnboardingHandoff />
        </div>
      ) : (
        <div className="mt-4">
          <div
            className="bg-gradient-to-r from-warning-light via-warning-light/50 to-surface-page rounded-xl p-6 border border-warning-base/20 flex items-start gap-4 max-w-[640px]"
            data-testid="dashboard-onboarding-pending-note"
          >
            <div className="w-10 h-10 rounded-full bg-warning-base flex items-center justify-center text-white text-lg shrink-0">
              &#x26A0;
            </div>
            <div>
              <p className="m-0 text-md font-semibold text-neutral-900">
                Kurulum Tamamlanmadı
              </p>
              <p className="m-0 mt-1 text-sm text-neutral-600 leading-relaxed">
                ContentHub'a hoşgeldiniz. Sistemi kullanmaya başlamak için önce
                kurulum adımlarını tamamlayın.
              </p>
              <button
                onClick={() => navigate("/onboarding")}
                className="mt-3 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 border-none rounded-lg cursor-pointer hover:from-brand-700 hover:to-brand-800 shadow-sm transition-all duration-fast"
              >
                Kuruluma Başla →
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
