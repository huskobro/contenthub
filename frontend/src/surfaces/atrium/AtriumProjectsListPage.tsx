/**
 * AtriumProjectsListPage — Faz 4.
 *
 * Atrium override for `user.projects.list`. Re-presents the user's content
 * project list as an editorial portfolio:
 *
 *   - Large page hero with portfolio title + active filter chips summary.
 *   - Filter bar (module / status / channel) — same filters as canvas /
 *     legacy, so scoping behavior is preserved.
 *   - Card grid — taller editorial cards with a cinematic preview band,
 *     metadata block, and status row. Card layout is notably different from
 *     canvas' dense workspace grid.
 *
 * Data contract:
 *   - Uses `useContentProjects({ user_id, module_type, content_status,
 *     channel_profile_id })` — identical to legacy + canvas. No invented
 *     backend endpoints.
 *   - Uses `useChannelProfiles(userId)` to populate the channel filter.
 *   - Preview band is an explicit placeholder. No fake thumbnails.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useContentProjects } from "../../hooks/useContentProjects";
import { useChannelProfiles } from "../../hooks/useChannelProfiles";
import type { ContentProjectResponse } from "../../api/contentProjectsApi";
import { StatusBadge } from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

const MODULE_TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "Tüm modüller" },
  { value: "standard_video", label: "Standart Video" },
  { value: "news_bulletin", label: "Haber Bülteni" },
];

const CONTENT_STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "Tüm durumlar" },
  { value: "draft", label: "Taslak" },
  { value: "in_progress", label: "Devam Ediyor" },
  { value: "completed", label: "Tamamlandı" },
  { value: "archived", label: "Arşivlendi" },
];

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün Değerlendirme",
  educational_video: "Eğitim Videosu",
  howto_video: "Nasıl Yapılır",
};

function PortfolioCard({
  project,
  channelName,
  onOpen,
}: {
  project: ContentProjectResponse;
  channelName: string | null;
  onOpen: () => void;
}) {
  const moduleLabel = MODULE_LABELS[project.module_type] ?? project.module_type;
  const createdDate = new Date(project.created_at).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group text-left flex flex-col rounded-2xl overflow-hidden",
        "bg-white border border-neutral-200",
        "hover:border-indigo-400 hover:shadow-xl transition-all duration-fast",
        "cursor-pointer",
      )}
      data-testid={`atrium-portfolio-card-${project.id}`}
    >
      {/* Editorial preview band — labeled placeholder */}
      <div
        className={cn(
          "relative h-[180px] overflow-hidden",
          "bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-400",
        )}
        data-testid={`atrium-portfolio-preview-${project.id}`}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]"
        />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <span className="text-[9px] font-mono uppercase text-white/80 tracking-wider">
            {moduleLabel}
          </span>
          {project.active_job_id ? (
            <span className="text-[9px] font-mono uppercase text-white bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
              ⚡ live
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <h3 className="m-0 text-base md:text-lg font-semibold text-white drop-shadow-lg line-clamp-2">
            {project.title}
          </h3>
        </div>
      </div>

      {/* Editorial body */}
      <div className="flex-1 px-5 py-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={project.content_status} size="sm" />
          <StatusBadge status={project.publish_status} size="sm" />
          {project.review_status === "pending" ? (
            <span className="text-[9px] font-mono uppercase text-amber-700 border border-amber-300 rounded px-1.5 py-[1px]">
              review bekliyor
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500">
          <span className="truncate">
            {channelName ?? "Kanal belirsiz"}
          </span>
          <span className="font-mono shrink-0">{createdDate}</span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-400">
          <span>öncelik: {project.priority}</span>
          <span className="text-indigo-600 font-semibold group-hover:text-indigo-700">
            stüdyoya git →
          </span>
        </div>
      </div>
    </button>
  );
}

export function AtriumProjectsListPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id;

  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const { data: channels } = useChannelProfiles(userId);
  const {
    data: projects,
    isLoading,
    isError,
  } = useContentProjects({
    user_id: userId,
    module_type: moduleFilter || undefined,
    content_status: statusFilter || undefined,
    channel_profile_id: channelFilter || undefined,
  });

  // Build a channel-id → name map for cards.
  const channelNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of channels ?? []) map.set(c.id, c.profile_name);
    return map;
  }, [channels]);

  // Filter chip summary (how many filters are active).
  const activeFilterCount = [moduleFilter, statusFilter, channelFilter].filter(
    Boolean,
  ).length;

  const rows = projects ?? [];

  return (
    <div
      className="flex flex-col gap-8"
      data-testid="atrium-projects-list"
    >
      {/* Portfolio hero --------------------------------------------------- */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl",
          "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900",
          "text-neutral-50 border border-neutral-200 shadow-xl",
          "p-8 md:p-10",
        )}
        data-testid="atrium-projects-hero"
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.25),transparent_55%),radial-gradient(circle_at_20%_100%,rgba(99,102,241,0.35),transparent_60%)]"
        />
        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-300">
              Portfolio
            </p>
            <h1 className="m-0 mt-2 text-3xl md:text-4xl font-bold text-white">
              Tüm yapımlarım
            </h1>
            <p className="m-0 mt-2 text-sm text-neutral-300 max-w-xl">
              Editoryal bir bakışla bütün yapımların. Modül, durum ve kanal
              filtreleriyle daralt, kartlardan direkt stüdyoya dal.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate("/user/create/video")}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-200 transition-colors"
              data-testid="atrium-projects-create-video"
            >
              + Video
            </button>
            <button
              type="button"
              onClick={() => navigate("/user/create/bulletin")}
              className="px-4 py-2 rounded-full text-xs font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors"
              data-testid="atrium-projects-create-bulletin"
            >
              + Bülten
            </button>
          </div>
        </div>

        <div className="relative mt-6 flex items-center gap-4 text-[11px] text-neutral-400 font-mono">
          <span>
            <span className="text-neutral-200 text-sm font-semibold">
              {rows.length}
            </span>{" "}
            yapım gösteriliyor
          </span>
          <span>·</span>
          <span>
            {activeFilterCount} aktif filtre
          </span>
        </div>
      </section>

      {/* Filter strip ----------------------------------------------------- */}
      <section
        className="flex flex-wrap gap-3"
        data-testid="atrium-projects-filters"
      >
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className={cn(
            "rounded-full border border-neutral-300 bg-white px-4 py-2",
            "text-sm text-neutral-800 cursor-pointer",
            "hover:border-indigo-400 transition-colors",
          )}
          data-testid="atrium-projects-filter-module"
        >
          {MODULE_TYPES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn(
            "rounded-full border border-neutral-300 bg-white px-4 py-2",
            "text-sm text-neutral-800 cursor-pointer",
            "hover:border-indigo-400 transition-colors",
          )}
          data-testid="atrium-projects-filter-status"
        >
          {CONTENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className={cn(
            "rounded-full border border-neutral-300 bg-white px-4 py-2",
            "text-sm text-neutral-800 cursor-pointer",
            "hover:border-indigo-400 transition-colors",
          )}
          data-testid="atrium-projects-filter-channel"
        >
          <option value="">Tüm kanallar</option>
          {(channels ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.profile_name}
            </option>
          ))}
        </select>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              setModuleFilter("");
              setStatusFilter("");
              setChannelFilter("");
            }}
            className={cn(
              "rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-600",
              "hover:bg-neutral-100 transition-colors",
            )}
            data-testid="atrium-projects-clear-filters"
          >
            Filtreleri temizle
          </button>
        ) : null}
      </section>

      {/* Grid ------------------------------------------------------------- */}
      {isLoading ? (
        <div
          className="rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-sm text-neutral-500 text-center"
          data-testid="atrium-projects-loading"
        >
          Yapımlar yükleniyor...
        </div>
      ) : isError ? (
        <div
          className="rounded-2xl border border-red-300 bg-red-50 px-6 py-10 text-sm text-red-700 text-center"
          data-testid="atrium-projects-error"
        >
          Yapımlar yüklenemedi. Lütfen birazdan tekrar dene.
        </div>
      ) : rows.length === 0 ? (
        <div
          className={cn(
            "rounded-2xl border border-dashed border-neutral-300 bg-white",
            "px-6 py-14 text-center",
          )}
          data-testid="atrium-projects-empty"
        >
          <p className="m-0 text-base font-semibold text-neutral-800">
            {activeFilterCount > 0
              ? "Filtrelerle eşleşen yapım yok."
              : "Henüz portföyünde yapım yok."}
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-500">
            {activeFilterCount > 0
              ? "Filtreleri temizle veya yeni bir yapım başlat."
              : "İlk yapımını başlatmak için yukarıdaki butonları kullan."}
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
          data-testid="atrium-projects-grid"
        >
          {rows.map((project) => (
            <PortfolioCard
              key={project.id}
              project={project}
              channelName={channelNameById.get(project.channel_profile_id) ?? null}
              onOpen={() => navigate(`/user/projects/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
