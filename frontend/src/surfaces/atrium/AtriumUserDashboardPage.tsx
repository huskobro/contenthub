/**
 * AtriumUserDashboardPage — Faz 4.
 *
 * Atrium override for `user.dashboard`. Re-presents the user home as an
 * editorial cover / showcase page, not a task list:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Cover hero (large) — headline project + primary CTA              │
 *   ├──────────────────────────────┬───────────────────────────────────┤
 *   │ Editorial column             │ Attention pane                    │
 *   │  - lineup (next 4 projects)  │  - dikkat isteyen durumlar        │
 *   │  - in-production (live jobs) │  - recent channel activity        │
 *   └──────────────────────────────┴───────────────────────────────────┘
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Vital stats bar — tabular-num, editorial footer                  │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Data contract:
 *   - Uses REAL hooks only: useAuthStore, useOnboardingStatus,
 *     useContentProjects, useChannelProfiles, useQuery(fetchJobs).
 *   - No invented backend endpoints.
 *   - No fake previews / fake metrics — the cover preview is explicitly a
 *     "pending render" slot when no thumbnail output exists. All counts
 *     come from real API responses.
 *
 * Fallback:
 *   - Mounted only when Atrium is the resolved user surface. The legacy
 *     UserDashboardPage and the canvas override still exist; the trampoline
 *     in pages/UserDashboardPage.tsx will simply return whichever surface
 *     the resolver picks.
 */

import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";
import { useContentProjects } from "../../hooks/useContentProjects";
import { useChannelProfiles } from "../../hooks/useChannelProfiles";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import type { ContentProjectResponse } from "../../api/contentProjectsApi";
import { StatusBadge } from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bulteni",
  product_review: "Urun Degerlendirme",
  educational_video: "Egitim Videosu",
  howto_video: "Nasil Yapilir",
};

const IN_FLIGHT_STATUSES = new Set([
  "queued",
  "running",
  "pending",
  "scheduled",
  "waiting",
  "waiting_review",
]);

const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// ---------------------------------------------------------------------------
// Local editorial primitives
// ---------------------------------------------------------------------------

function EditorialBlock({
  kicker,
  title,
  action,
  children,
  testId,
}: {
  kicker: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section
      className="flex flex-col gap-3"
      data-testid={testId}
    >
      <header className="flex items-end justify-between gap-3 border-b border-neutral-200 pb-2">
        <div>
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
            {kicker}
          </p>
          <h2 className="m-0 mt-0.5 text-lg font-semibold text-neutral-900">
            {title}
          </h2>
        </div>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}

function LineupCard({
  project,
  onOpen,
}: {
  project: ContentProjectResponse;
  onOpen: () => void;
}) {
  const moduleLabel = MODULE_LABELS[project.module_type] ?? project.module_type;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group text-left w-full rounded-xl overflow-hidden",
        "bg-white border border-neutral-200",
        "hover:border-indigo-400 hover:shadow-lg transition-all duration-fast",
        "flex flex-col cursor-pointer",
      )}
      data-testid={`atrium-lineup-card-${project.id}`}
    >
      {/* Editorial preview band — labeled placeholder, not a fake render. */}
      <div
        className={cn(
          "relative h-[140px] overflow-hidden",
          "bg-gradient-to-br from-indigo-500/80 via-fuchsia-500/60 to-amber-300/50",
        )}
        data-testid={`atrium-lineup-preview-${project.id}`}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_60%)]"
        />
        <div className="absolute inset-x-0 bottom-0 px-3 py-2 flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase text-white/80">
            on izleme &middot; pending render
          </span>
          <span className="text-[9px] font-mono uppercase text-white/80">
            {moduleLabel}
          </span>
        </div>
      </div>
      <div className="flex-1 px-4 py-3 flex flex-col gap-2">
        <p className="m-0 text-sm font-semibold text-neutral-900 truncate">
          {project.title}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={project.content_status} size="sm" />
          <StatusBadge status={project.publish_status} size="sm" />
          {project.active_job_id ? (
            <span className="text-[9px] font-mono uppercase text-indigo-600 border border-indigo-200 rounded px-1">
              live job
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function InProductionRow({
  job,
  onOpen,
}: {
  job: JobResponse;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left",
        "border-b border-neutral-200 last:border-b-0",
        "hover:bg-neutral-50 transition-colors duration-fast",
      )}
      data-testid={`atrium-in-production-${job.id}`}
    >
      <StatusBadge status={job.status} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="m-0 text-sm font-medium text-neutral-800 truncate">
          {MODULE_LABELS[job.module_type] ?? job.module_type}
        </p>
        <p className="m-0 text-[10px] font-mono text-neutral-500 truncate">
          {job.current_step_key ?? "—"} &middot; {job.id.slice(0, 8)}
        </p>
      </div>
    </button>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 px-4 py-3",
        "rounded-xl border border-neutral-200 bg-white",
      )}
      data-testid={`atrium-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
      <span className="text-2xl font-semibold text-neutral-900 tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AtriumUserDashboardPage() {
  const navigate = useNavigate();
  const { data: onboardingStatus } = useOnboardingStatus();
  const authUser = useAuthStore((s) => s.user);

  const userId = authUser?.id;
  const displayName = authUser?.display_name ?? "Editor";

  const { data: projects, isLoading: projectsLoading } = useContentProjects(
    userId ? { user_id: userId, limit: 25 } : undefined,
  );
  const { data: channels } = useChannelProfiles(userId);
  const { data: allJobs } = useQuery({
    queryKey: ["jobs", { atriumDashboard: true }],
    queryFn: () => fetchJobs(),
  });

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  // "Headline" project: the one we elevate into the cover hero. We pick the
  // highest-priority non-completed project, with a stable tiebreaker on
  // updated_at. All real data — no invention.
  const headline = useMemo<ContentProjectResponse | null>(() => {
    const rows = projects ?? [];
    if (rows.length === 0) return null;
    const live = rows.filter((p) => p.content_status !== "archived");
    if (live.length === 0) return rows[0] ?? null;
    const sorted = [...live].sort((a, b) => {
      const pa = PRIORITY_WEIGHT[a.priority] ?? 9;
      const pb = PRIORITY_WEIGHT[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      const ua = new Date(a.updated_at).getTime();
      const ub = new Date(b.updated_at).getTime();
      return ub - ua;
    });
    return sorted[0] ?? null;
  }, [projects]);

  // "Lineup" — next four non-headline, non-archived projects for the
  // editorial column.
  const lineup = useMemo<ContentProjectResponse[]>(() => {
    const rows = projects ?? [];
    const withoutHeadline = rows.filter(
      (p) => !headline || p.id !== headline.id,
    );
    const live = withoutHeadline.filter((p) => p.content_status !== "archived");
    return live.slice(0, 4);
  }, [projects, headline]);

  // In-production jobs (live pane). Same filter logic as canvas.
  const inProduction = useMemo(() => {
    const rows = allJobs ?? [];
    return rows.filter((j) => IN_FLIGHT_STATUSES.has(j.status)).slice(0, 5);
  }, [allJobs]);

  // Attention items: projects that need review or have failed publishes.
  const attention = useMemo(() => {
    const rows = projects ?? [];
    return rows
      .filter(
        (p) =>
          p.review_status === "pending" ||
          p.review_status === "needs_changes" ||
          p.publish_status === "failed",
      )
      .slice(0, 4);
  }, [projects]);

  const stats = useMemo(() => {
    const rows = projects ?? [];
    return {
      total: rows.length,
      inProgress: rows.filter((p) => p.content_status === "in_progress").length,
      published: rows.filter((p) => p.publish_status === "published").length,
      channels: (channels ?? []).length,
      inFlight: (allJobs ?? []).filter((j) => IN_FLIGHT_STATUSES.has(j.status))
        .length,
    };
  }, [projects, channels, allJobs]);

  // Headline CTA target — if it's a standard video, offer start-production
  // via the project detail page (canvas detail owns that action); otherwise
  // just open the project detail.
  const openHeadline = () => {
    if (headline) navigate(`/user/projects/${headline.id}`);
  };

  return (
    <div
      className="flex flex-col gap-10"
      data-testid="atrium-user-dashboard"
    >
      {/* Cover hero ------------------------------------------------------- */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl",
          "border border-neutral-200 shadow-xl",
          "min-h-[320px]",
          "bg-gradient-to-br from-neutral-900 via-indigo-950 to-neutral-900",
          "text-neutral-50",
        )}
        data-testid="atrium-dashboard-hero"
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 pointer-events-none",
            "bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.25),transparent_60%)]",
          )}
        />
        <div className="relative flex flex-col md:flex-row gap-6 md:gap-10 p-8 md:p-12">
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-300">
                Bu Hafta On Planda
              </p>
              <h1 className="m-0 mt-3 text-3xl md:text-4xl font-bold leading-tight text-white">
                Hosgeldin, {displayName}.
              </h1>
              <p className="m-0 mt-3 text-sm md:text-base text-neutral-300 max-w-xl">
                Atrium editorial studyona. Bugun yayinlanmaya hazir yapimlarin,
                dikkat bekleyen projeler ve dagitim akisin — hepsi tek bir
                editorial cerceveden.
              </p>
            </div>

            {headline ? (
              <div
                className={cn(
                  "mt-8 flex flex-col gap-3",
                  "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm",
                  "p-5",
                )}
                data-testid="atrium-dashboard-headline"
              >
                <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                  Headline Yapim
                </p>
                <h2 className="m-0 text-xl md:text-2xl font-semibold text-white truncate">
                  {headline.title}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase text-neutral-300">
                    {MODULE_LABELS[headline.module_type] ?? headline.module_type}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-neutral-500">
                    &middot;
                  </span>
                  <span className="text-[10px] font-mono uppercase text-indigo-200">
                    oncelik: {headline.priority}
                  </span>
                  {headline.active_job_id ? (
                    <>
                      <span className="text-[10px] font-mono uppercase text-neutral-500">
                        &middot;
                      </span>
                      <span className="text-[10px] font-mono uppercase text-amber-300">
                        live job
                      </span>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={openHeadline}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-semibold",
                      "bg-white text-neutral-900 hover:bg-neutral-200 transition-colors",
                    )}
                    data-testid="atrium-dashboard-headline-open"
                  >
                    Stuyoya Goz At →
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/user/projects")}
                    className={cn(
                      "px-3 py-2 rounded-full text-xs font-semibold",
                      "border border-white/30 text-white hover:bg-white/10 transition-colors",
                    )}
                  >
                    Tum Yapimlar
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "mt-8 rounded-2xl border border-white/10 bg-white/5 p-6",
                )}
                data-testid="atrium-dashboard-headline-empty"
              >
                <p className="m-0 text-sm text-neutral-200">
                  Henuz yapim yok.
                </p>
                <p className="m-0 mt-1 text-xs text-neutral-400">
                  Yukaridaki + Video / + Bulten butonlari ile ilk yapimini
                  baslatabilirsin.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/user/create/video")}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-200 transition-colors"
                    data-testid="atrium-dashboard-empty-create-video"
                  >
                    + Video
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/user/create/bulletin")}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
                    data-testid="atrium-dashboard-empty-create-bulletin"
                  >
                    + Bulten
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side stats column */}
          <div
            className="md:w-[280px] shrink-0 flex flex-col gap-3"
            data-testid="atrium-dashboard-hero-stats"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Studyo Ozeti
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-neutral-500">
                    Toplam yapim
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-white">
                    {stats.total}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-neutral-500">
                    Devam eden
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-white">
                    {stats.inProgress}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-neutral-500">
                    Yayinlanan
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-white">
                    {stats.published}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-neutral-500">
                    Canli is
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-white">
                    {stats.inFlight}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Yayin Kimlikleri
              </p>
              <p className="m-0 mt-2 text-sm text-neutral-100">
                {stats.channels} kanal baglanmis
              </p>
              <button
                type="button"
                onClick={() => navigate("/user/channels")}
                className="mt-2 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
              >
                Kanallara goz at →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding notice ------------------------------------------------ */}
      {!onboardingCompleted ? (
        <div
          className="rounded-2xl border border-amber-300/50 bg-amber-50 px-5 py-4 flex items-start gap-4"
          data-testid="atrium-onboarding-pending"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-300 text-neutral-900 flex items-center justify-center font-bold">
            !
          </div>
          <div className="flex-1">
            <p className="m-0 text-sm font-semibold text-neutral-900">
              Stuyo kurulumu tamamlanmadi
            </p>
            <p className="m-0 mt-0.5 text-xs text-neutral-700">
              Atrium editorial deneyimini sorunsuz kullanabilmek icin kurulumu
              tamamlayip kanallarini bagla.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-900 text-white"
          >
            Kuruluma Basla
          </button>
        </div>
      ) : null}

      {/* Editorial grid --------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-10">
        {/* Lineup column */}
        <EditorialBlock
          kicker="LINEUP"
          title="Sonraki yapimlar"
          testId="atrium-dashboard-lineup"
          action={
            <Link
              to="/user/projects"
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 no-underline"
            >
              Tum yapimlar →
            </Link>
          }
        >
          {projectsLoading ? (
            <div className="text-sm text-neutral-500 py-6">Yukleniyor...</div>
          ) : lineup.length === 0 ? (
            <div
              className="text-sm text-neutral-600 border border-dashed border-neutral-300 rounded-xl p-6 text-center"
              data-testid="atrium-dashboard-lineup-empty"
            >
              Sıradaki yapim yok. Bugun yeni bir senaryo baslat.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lineup.map((project) => (
                <LineupCard
                  key={project.id}
                  project={project}
                  onOpen={() => navigate(`/user/projects/${project.id}`)}
                />
              ))}
            </div>
          )}
        </EditorialBlock>

        {/* Attention + in-production pane */}
        <div className="flex flex-col gap-10">
          <EditorialBlock
            kicker="IN PRODUCTION"
            title="Canli stuyo"
            testId="atrium-dashboard-in-production"
          >
            {inProduction.length === 0 ? (
              <div
                className="text-sm text-neutral-600 border border-dashed border-neutral-300 rounded-xl p-6 text-center"
                data-testid="atrium-dashboard-in-production-empty"
              >
                Suanda calisan bir is yok.
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                {inProduction.map((job) => (
                  <InProductionRow
                    key={job.id}
                    job={job}
                    onOpen={() => navigate(`/admin/jobs/${job.id}`)}
                  />
                ))}
              </div>
            )}
          </EditorialBlock>

          <EditorialBlock
            kicker="ATTENTION"
            title="Elini bekleyenler"
            testId="atrium-dashboard-attention"
          >
            {attention.length === 0 ? (
              <div
                className="text-sm text-neutral-600 border border-dashed border-neutral-300 rounded-xl p-6 text-center"
                data-testid="atrium-dashboard-attention-empty"
              >
                Dikkat isteyen bir proje yok. Editorial stuyo sakin.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {attention.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/user/projects/${p.id}`)}
                    className={cn(
                      "w-full text-left rounded-xl border border-amber-200 bg-amber-50",
                      "hover:border-amber-400 hover:shadow-md transition-all",
                      "px-4 py-3",
                    )}
                    data-testid={`atrium-attention-item-${p.id}`}
                  >
                    <p className="m-0 text-sm font-semibold text-neutral-900 truncate">
                      {p.title}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={p.review_status} size="sm" />
                      <StatusBadge status={p.publish_status} size="sm" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </EditorialBlock>
        </div>
      </div>

      {/* Vital stats strip ----------------------------------------------- */}
      <section
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3"
        data-testid="atrium-dashboard-stats"
      >
        <StatPill label="Yapim" value={stats.total} />
        <StatPill label="Devam" value={stats.inProgress} />
        <StatPill label="Yayinlanan" value={stats.published} />
        <StatPill label="Canli Is" value={stats.inFlight} />
        <StatPill label="Kanal" value={stats.channels} />
      </section>
    </div>
  );
}
