/**
 * UserDashboardPage — Faz 4.
 *
 * Real user dashboard with:
 * - Welcome header with display name
 * - Quick create actions (Video, Bulten)
 * - Recent projects (last 5)
 * - My channels (last 3)
 * - Onboarding notice if not completed
 * - Job tracker
 *
 * Faz 3 (Canvas): this module is now a trampoline. The exported
 * `UserDashboardPage` checks for a surface-level override at render time and
 * delegates to the Canvas dashboard when the active user surface registers
 * one. The legacy body lives below as `LegacyUserDashboardPage` and is
 * returned unchanged whenever no override exists — preserving the fallback
 * contract for kill-switch-off, canvas-disabled, or scope-mismatch cases.
 */

import { useNavigate } from "react-router-dom";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { useAuthStore } from "../stores/authStore";
import { useContentProjects } from "../hooks/useContentProjects";
import { useChannelProfiles } from "../hooks/useChannelProfiles";
// Pasife alındı — import korunuyor ki geri açmak tek satır değişiklik olsun.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";
void PostOnboardingHandoff;
import { UserJobTracker } from "../components/dashboard/UserJobTracker";
import { AutomationDigestWidget } from "../components/dashboard/AutomationDigestWidget";
import {
  PageShell,
  SectionShell,
  StatusBadge,
} from "../components/design-system/primitives";
import { EmptyState } from "../components/design-system/EmptyState";
import { SkeletonTable } from "../components/design-system/Skeleton";
import { cn } from "../lib/cn";
import { useSurfacePageOverride } from "../surfaces";

export function UserDashboardPage() {
  // Canvas (or any future user-scope surface) can replace this page by
  // registering an override under "user.dashboard". Fallback is automatic
  // when the override hook returns null (kill switch off, canvas disabled,
  // wrong scope, etc.) — the legacy body below renders unchanged.
  const Override = useSurfacePageOverride("user.dashboard");
  if (Override) return <Override />;
  return <LegacyUserDashboardPage />;
}

function LegacyUserDashboardPage() {
  const navigate = useNavigate();
  const { data: onboardingStatus } = useOnboardingStatus();
  const authUser = useAuthStore((s) => s.user);

  const userId = authUser?.id;
  const displayName = authUser?.display_name ?? "Kullanıcı";

  const { data: projects, isLoading: projectsLoading } = useContentProjects(
    userId ? { user_id: userId, limit: 5 } : undefined,
  );
  const { data: channels, isLoading: channelsLoading } = useChannelProfiles(userId);

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  const recentProjects = (projects ?? []).slice(0, 5);
  const recentChannels = (channels ?? []).slice(0, 3);

  return (
    <PageShell
      title={`Hoşgeldin, ${displayName}`}
      subtitle="Kullanıcı kontrol paneli"
      testId="dashboard"
    >
      {onboardingCompleted ? (
        <div className="space-y-5">
          {/* Quick Create */}
          <SectionShell title="Hızlı Oluştur" testId="quick-create">
            <div className="flex gap-3 flex-wrap">
              <QuickCreateCard
                label="Video Oluştur"
                description="Standart video projesi başlat"
                icon={"\u25B6"}
                onClick={() => navigate("/user/create/video")}
              />
              <QuickCreateCard
                label="Bülten Oluştur"
                description="Haber bülteni projesi başlat"
                icon={"\u2139"}
                onClick={() => navigate("/user/create/bulletin")}
              />
              <QuickCreateCard
                label="Ürün İncelemesi"
                description="URL ekle, otomatik inceleme üret"
                icon={"\u2605"}
                onClick={() => navigate("/user/create/product-review")}
              />
            </div>
          </SectionShell>

          {/* Recent Projects */}
          <SectionShell
            title="Son Projelerim"
            actions={
              recentProjects.length > 0 ? (
                <button
                  onClick={() => navigate("/user/projects")}
                  className="text-sm text-brand-600 bg-transparent border-none cursor-pointer hover:text-brand-700 transition-colors duration-fast font-medium"
                >
                  Tümünü Gör
                </button>
              ) : undefined
            }
            testId="recent-projects"
          >
            {projectsLoading ? (
              <SkeletonTable columns={4} rows={3} />
            ) : recentProjects.length === 0 ? (
              <EmptyState
                illustration="no-content"
                title="Henüz projeniz yok"
                description="Hızlı oluştur butonlarından ilk projenizi başlatabilirsiniz."
                action={{
                  label: "Video Oluştur",
                  onClick: () => navigate("/user/create/video"),
                  variant: "primary",
                }}
              />
            ) : (
              <div className="divide-y divide-border-subtle">
                {recentProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-brand-50 cursor-pointer transition-colors duration-fast"
                    onClick={() => navigate(`/user/projects/${p.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-base font-medium text-neutral-800 truncate">
                        {p.title}
                      </p>
                      <p className="m-0 mt-0.5 text-sm text-neutral-500">
                        {p.module_type} &middot;{" "}
                        {new Date(p.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <StatusBadge status={p.content_status} size="sm" />
                      <StatusBadge status={p.publish_status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionShell>

          {/* My Channels */}
          <SectionShell
            title="Kanallarım"
            actions={
              recentChannels.length > 0 ? (
                <button
                  onClick={() => navigate("/user/channels")}
                  className="text-sm text-brand-600 bg-transparent border-none cursor-pointer hover:text-brand-700 transition-colors duration-fast font-medium"
                >
                  Tümünü Gör
                </button>
              ) : undefined
            }
            testId="my-channels"
          >
            {channelsLoading ? (
              <SkeletonTable columns={3} rows={2} />
            ) : recentChannels.length === 0 ? (
              <EmptyState
                illustration="no-sources"
                title="Henüz kanalınız yok"
                description="Bir kanal ekleyerek içerik yayınlamaya başlayabilirsiniz."
                action={{
                  label: "Kanal Ekle",
                  onClick: () => navigate("/user/channels"),
                  variant: "primary",
                }}
              />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-4">
                {recentChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className={cn(
                      "border border-border-subtle rounded-lg p-4 bg-surface-card",
                      "hover:shadow-md cursor-pointer transition-all duration-fast",
                    )}
                    onClick={() => navigate(`/user/channels/${ch.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="m-0 text-base font-semibold text-neutral-800 truncate">
                        {ch.profile_name}
                      </p>
                      <StatusBadge status={ch.status} size="sm" />
                    </div>
                    <p className="m-0 text-sm text-neutral-500">
                      {ch.channel_slug} &middot; {ch.default_language}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionShell>

          {/* Otomasyon Özeti (Phase Final F4) — read-only daily digest. */}
          <SectionShell title="Otomasyon Özeti" testId="automation-digest">
            <div className="p-4">
              <AutomationDigestWidget />
            </div>
          </SectionShell>

          {/* Job Tracker */}
          <div>
            <p className="m-0 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              İş Takibi
            </p>
            <UserJobTracker />
          </div>

          {/* Post-onboarding handoff — kullanici isteği üzerine pasife
              alındı (neredeyse kullanılmıyordu). Component ve importu
              silinmedi; geri açmak için aşağıdaki satırı uncomment et. */}
          {/* <PostOnboardingHandoff /> */}
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
                Kuruluma Başla
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// QuickCreateCard — internal component
// ---------------------------------------------------------------------------

function QuickCreateCard({
  label,
  description,
  icon,
  onClick,
}: {
  label: string;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-5 py-4 rounded-xl border border-border-subtle bg-surface-card",
        "hover:border-brand-400 hover:shadow-md cursor-pointer transition-all duration-fast",
        "text-left min-w-[200px]",
      )}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <div>
        <p className="m-0 text-base font-semibold text-neutral-800">{label}</p>
        <p className="m-0 mt-0.5 text-sm text-neutral-500">{description}</p>
      </div>
    </button>
  );
}
