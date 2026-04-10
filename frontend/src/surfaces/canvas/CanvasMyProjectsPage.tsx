/**
 * CanvasMyProjectsPage — Faz 3.
 *
 * Canvas override for `user.projects.list`. Re-presents the user's content
 * projects as a workspace grid instead of a dense data table. The filter
 * surface stays (channel / module / status), but selection is now via
 * preview-style cards so the "workspace" feel carries through.
 *
 * Data contract:
 *   - Uses the same `useContentProjects({ user_id, module_type, ... })`
 *     React Query hook the legacy table uses, so scoping / filters behave
 *     identically.
 *   - No fake preview images — preview slot is an explicit placeholder.
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
  { value: "", label: "Tüm Modüller" },
  { value: "standard_video", label: "Standart Video" },
  { value: "news_bulletin", label: "Haber Bülteni" },
];

const CONTENT_STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "Tüm Durumlar" },
  { value: "draft", label: "Taslak" },
  { value: "in_progress", label: "Devam Ediyor" },
  { value: "completed", label: "Tamamlandı" },
  { value: "archived", label: "Arşivlendi" },
];

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
};

export function CanvasMyProjectsPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id;

  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const { data: channels } = useChannelProfiles(userId);
  const { data: projects, isLoading, isError } = useContentProjects({
    user_id: userId,
    module_type: moduleFilter || undefined,
    content_status: statusFilter || undefined,
    channel_profile_id: channelFilter || undefined,
  });

  const rows = useMemo(() => projects ?? [], [projects]);

  return (
    <div
      className="flex flex-col gap-4 max-w-[1280px]"
      data-testid="canvas-my-projects"
    >
      {/* Page header -------------------------------------------------------- */}
      <header
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
          "px-5 py-4 flex items-start gap-4",
        )}
        data-testid="canvas-projects-header"
      >
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Workspace
          </p>
          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">
            Projelerim
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-500">
            Tüm içerik projelerin bir yaratıcı atölyesi gibi. Filtrelemek için
            üstteki seçenekleri kullan, bir projeye girmek için karta tıkla.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/user/create/video")}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-semibold shrink-0",
            "bg-brand-600 text-white hover:bg-brand-700 transition-colors",
          )}
          data-testid="canvas-projects-new-cta"
        >
          + Yeni Proje
        </button>
      </header>

      {/* Filters ------------------------------------------------------------ */}
      <div
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card",
          "flex flex-wrap items-center gap-2 px-4 py-3",
        )}
        data-testid="canvas-projects-filters"
      >
        <FilterSelect
          testId="canvas-filter-channel"
          value={channelFilter}
          onChange={setChannelFilter}
        >
          <option value="">Tüm Kanallar</option>
          {(channels ?? []).map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.profile_name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          testId="canvas-filter-module"
          value={moduleFilter}
          onChange={setModuleFilter}
        >
          {MODULE_TYPES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          testId="canvas-filter-status"
          value={statusFilter}
          onChange={setStatusFilter}
        >
          {CONTENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </FilterSelect>
        <div className="flex-1" />
        <div
          className="text-xs text-neutral-500 font-mono"
          data-testid="canvas-projects-count"
        >
          {rows.length} proje
        </div>
      </div>

      {/* Grid --------------------------------------------------------------- */}
      {isLoading ? (
        <div
          className="rounded-xl border border-border-subtle bg-surface-card p-8 text-center text-sm text-neutral-500"
          data-testid="canvas-projects-loading"
        >
          Projeler yükleniyor...
        </div>
      ) : isError ? (
        <div
          className="rounded-xl border border-error-base/30 bg-error-light/40 p-6 text-center text-sm text-error-dark"
          data-testid="canvas-projects-error"
        >
          Projeler yüklenemedi.
        </div>
      ) : rows.length === 0 ? (
        <div
          className="rounded-xl border border-border-subtle bg-surface-card p-10 text-center"
          data-testid="canvas-projects-empty"
        >
          <p className="m-0 text-sm font-semibold text-neutral-700">
            Hiç proje bulunamadı
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-500">
            Filtreleri gevşetmeyi dene, ya da yeni bir proje başlat.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          data-testid="canvas-projects-grid"
        >
          {rows.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => navigate(`/user/projects/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

function FilterSelect({
  value,
  onChange,
  children,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      className={cn(
        "px-3 py-1.5 text-xs border border-border-subtle rounded-md",
        "bg-surface-card text-neutral-700",
        "focus:outline-none focus:border-brand-400",
      )}
    >
      {children}
    </select>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: ContentProjectResponse;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group text-left rounded-xl border border-border-subtle bg-surface-card",
        "hover:border-brand-400 hover:shadow-md transition-all duration-fast",
        "overflow-hidden cursor-pointer",
      )}
      data-testid={`canvas-project-card-${project.id}`}
    >
      {/* Preview slot — labeled placeholder, never a fake render */}
      <div
        className={cn(
          "h-[108px] flex items-center justify-center",
          "bg-gradient-to-br from-brand-50 via-neutral-50 to-neutral-100",
          "border-b border-border-subtle",
        )}
      >
        <span className="text-[10px] font-mono uppercase text-neutral-400">
          ön izleme &middot; pending
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="m-0 text-sm font-semibold text-neutral-800 truncate">
            {project.title}
          </p>
          <StatusBadge status={project.content_status} size="sm" />
        </div>
        <p className="m-0 mt-1 text-xs text-neutral-500">
          {MODULE_LABELS[project.module_type] ?? project.module_type} &middot;{" "}
          {new Date(project.created_at).toLocaleDateString("tr-TR")}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <StatusBadge status={project.publish_status} size="sm" />
          {project.active_job_id ? (
            <span className="text-[9px] font-mono uppercase text-brand-600 border border-brand-200 rounded px-1 py-[1px]">
              aktif job
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
