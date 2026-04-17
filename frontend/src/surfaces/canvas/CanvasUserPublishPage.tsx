/**
 * CanvasUserPublishPage — Faz 3A.
 *
 * Canvas override for `user.publish`. Re-frames the legacy "3 numbered
 * sections in a flat list" publish flow as a project-centric workspace
 * experience, so publishing feels like continuing work inside a project
 * rather than filling out a standalone form.
 *
 * Information architecture
 * ------------------------
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Hero: "Yayin Atolyesi" + secilen projeye gore dinamik ozet   │
 *   ├────────────────────┬─────────────────────────────────────────┤
 *   │ Sol sutun:         │ Sag sutun:                              │
 *   │  - hazir projeler  │  - proje detay + aktif yayin kayitlari  │
 *   │    (card list)     │  - baglanti seciminin preview'u         │
 *   │                    │  - yayin bilgileri (inline form)        │
 *   └────────────────────┴─────────────────────────────────────────┘
 *
 * Data contract preservation
 * --------------------------
 * This component uses EXACTLY the same API surface as the legacy
 * `UserPublishPage`:
 *   - fetchContentProjects({ content_status }) for candidate projects
 *   - fetchChannelProfiles() for channel name lookup
 *   - fetchConnectionsForPublish(channelProfileId) for connections
 *   - createPublishRecordFromJob + updatePublishIntent + submitForReview
 *     for the mutation chain
 *   - fetchPublishRecordsByProject for existing publishes
 *
 * No new backend endpoints are invented. No preview is faked. Publish
 * invariants (review gate) remain enforced server-side; Canvas just changes
 * how the operator sees and drives the flow.
 *
 * Fallback
 * --------
 * Mounted only when Canvas is the active user surface. Legacy
 * `UserPublishPage` trampolines through `useSurfacePageOverride` when
 * Canvas is off.
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchContentProjects,
  type ContentProjectResponse,
} from "../../api/contentProjectsApi";
import {
  fetchChannelProfiles,
  type ChannelProfileResponse,
} from "../../api/channelProfilesApi";
import {
  fetchConnectionsForPublish,
  type ConnectionForPublish,
} from "../../api/platformConnectionsApi";
import {
  createPublishRecordFromJob,
  fetchPublishRecordsByProject,
  submitForReview,
  updatePublishIntent,
  type PublishRecordSummary,
  type PublishIntentData,
} from "../../api/publishApi";
import { StatusBadge } from "../../components/design-system/primitives";
import { VideoPlayer } from "../../components/shared/VideoPlayer";
import { useJobDetail } from "../../hooks/useJobDetail";
import {
  buildJobArtifactUrl,
  findFirstVideoArtifact,
} from "../../lib/jobArtifacts";
import { cn } from "../../lib/cn";
import { useAuthStore } from "../../stores/authStore";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function CanvasUserPublishPage() {
  const queryClient = useQueryClient();

  // Phase AM-5: bind user-scope query caches to the authenticated user id
  // so a different identity sharing the same browser session cannot reuse
  // a stale project/channel list. Backend already scopes non-admin callers
  // — this is frontend cache hygiene.
  const userId = useAuthStore((s) => s.user?.id ?? "anonymous");

  // Selection state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");

  // Intent form
  const [intentTitle, setIntentTitle] = useState("");
  const [intentDescription, setIntentDescription] = useState("");
  const [intentTags, setIntentTags] = useState("");
  const [intentPrivacy, setIntentPrivacy] = useState("public");

  // UI state
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Candidate projects — same two-query merge the legacy page uses.
  const {
    data: completedProjects,
    isError: completedError,
  } = useQuery({
    queryKey: ["canvas-publish-projects-completed", userId],
    queryFn: () => fetchContentProjects({ content_status: "completed" }),
    staleTime: 30_000,
  });
  const {
    data: productionProjects,
    isError: productionError,
  } = useQuery({
    queryKey: ["canvas-publish-projects-production", userId],
    queryFn: () => fetchContentProjects({ content_status: "in_production" }),
    staleTime: 30_000,
  });
  const projectsLoadError = completedError || productionError;

  const projects = useMemo<ContentProjectResponse[]>(() => {
    const completed = completedProjects ?? [];
    const production = (productionProjects ?? []).filter((p) => p.active_job_id);
    const seen = new Set<string>();
    const merged: ContentProjectResponse[] = [];
    for (const p of [...completed, ...production]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
    return merged;
  }, [completedProjects, productionProjects]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  // Channels for channel-name lookup
  const { data: channels } = useQuery({
    queryKey: ["canvas-publish-channels", userId],
    queryFn: () => fetchChannelProfiles(),
    staleTime: 60_000,
  });

  const channelProfileId = selectedProject?.channel_profile_id ?? "";
  const { data: connections } = useQuery({
    queryKey: ["canvas-publish-connections", channelProfileId],
    queryFn: () => fetchConnectionsForPublish(channelProfileId),
    enabled: !!channelProfileId,
    staleTime: 30_000,
  });

  const selectedConnection = useMemo(
    () =>
      (connections ?? []).find((c) => c.id === selectedConnectionId) ?? null,
    [connections, selectedConnectionId],
  );

  // Preview of the selected project's active render. Operators asked
  // for real playback before submitting publish, not a "coming soon"
  // placeholder — if the project has a finished video artifact we show
  // it inline with full keyboard controls (space/K, J/L, arrows, M, F,
  // 0-9, Home/End) via the shared VideoPlayer. When no artifact exists
  // yet we fall back to a gentle placeholder so the card layout stays
  // stable across selections.
  const selectedJobId = selectedProject?.active_job_id ?? null;
  const { data: selectedJob } = useJobDetail(selectedJobId);
  const previewArtifactPath = useMemo(
    () => findFirstVideoArtifact(selectedJob?.steps),
    [selectedJob?.steps],
  );
  const previewVideoUrl = useMemo(
    () => buildJobArtifactUrl(selectedJobId, previewArtifactPath),
    [selectedJobId, previewArtifactPath],
  );
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // Whenever the user switches project the thumbnail should reset —
  // no stale "paused player" bleeding across selections.
  const resetPreview = useCallback(() => setPreviewPlaying(false), []);

  // Existing publish records for the selected project
  const { data: existingRecords } = useQuery({
    queryKey: ["canvas-publish-existing", selectedProjectId],
    queryFn: () => fetchPublishRecordsByProject(selectedProjectId),
    enabled: !!selectedProjectId,
    staleTime: 15_000,
  });

  const channelName = useMemo(() => {
    if (!channelProfileId || !channels) return null;
    return (
      channels.find(
        (ch: ChannelProfileResponse) => ch.id === channelProfileId,
      )?.profile_name ?? null
    );
  }, [channelProfileId, channels]);

  // Pre-fill intent when project changes
  const handleProjectSelect = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      setSelectedConnectionId("");
      setSuccessMsg("");
      setErrorMsg("");
      resetPreview();
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        setIntentTitle(proj.title ?? "");
        setIntentDescription(proj.description ?? "");
        setIntentTags("");
        setIntentPrivacy("public");
      }
    },
    [projects, resetPreview],
  );

  // Mutation: same chain as legacy
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject || !selectedProject.active_job_id) {
        throw new Error("Proje seçilmedi veya aktif job yok.");
      }
      const record = await createPublishRecordFromJob(
        selectedProject.active_job_id,
        {
          platform:
            selectedConnection?.platform ??
            selectedProject.primary_platform ??
            "youtube",
          // PHASE AG: karma projelerde module_type NULL -> "mixed".
          content_ref_type: selectedProject.module_type ?? "mixed",
          content_ref_id: selectedProject.id,
          content_project_id: selectedProject.id,
          platform_connection_id: selectedConnectionId || undefined,
        },
      );
      const intent: PublishIntentData = {};
      if (intentTitle) intent.title = intentTitle;
      if (intentDescription) intent.description = intentDescription;
      if (intentTags) {
        intent.tags = intentTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
      if (intentPrivacy) intent.privacy_status = intentPrivacy;
      if (Object.keys(intent).length > 0) {
        await updatePublishIntent(record.id, intent);
      }
      await submitForReview(record.id);
      return record;
    },
    onSuccess: () => {
      setSuccessMsg("Yayın kaydı oluşturuldu ve onaya gönderildi.");
      setErrorMsg("");
      queryClient.invalidateQueries({
        queryKey: ["canvas-publish-existing", selectedProjectId],
      });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Yayın kaydı oluşturulamadı.");
      setSuccessMsg("");
    },
  });

  const canSubmit =
    !!selectedProject &&
    !!selectedProject.active_job_id &&
    intentTitle.trim().length > 0 &&
    !submitMutation.isPending;

  return (
    <div
      className="flex flex-col gap-5 max-w-[1280px]"
      data-testid="canvas-user-publish"
    >
      {projectsLoadError && (
        <div
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
          data-testid="canvas-publish-projects-load-error"
          role="alert"
        >
          Yayına hazır projeler yüklenemedi. Bağlantınızı kontrol edip sayfayı
          yenileyin.
        </div>
      )}

      {/* Hero -------------------------------------------------------------- */}
      <section
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
          "px-6 py-5 flex items-start gap-5",
        )}
        data-testid="canvas-publish-hero"
      >
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Canvas Workspace &middot; Dağıtım
          </p>
          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">
            Yayın Atölyesi
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-500">
            Hazır projelerini seç, bağlantı ve yayın bilgilerini düzenle,
            onaya gönder. Yayın operatör onayından sonra kuyruğa girer.
          </p>
        </div>
        <div
          className="shrink-0 text-xs text-neutral-500 text-right"
          data-testid="canvas-publish-hero-summary"
        >
          <div>{projects.length} hazır proje</div>
          {selectedProject ? (
            <div className="mt-1 text-brand-600 font-semibold">
              seçilen: {selectedProject.title}
            </div>
          ) : (
            <div className="mt-1 text-neutral-400">proje seçilmedi</div>
          )}
        </div>
      </section>

      {/* Two-column workspace -------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-5 items-start">
        {/* Left column: ready-to-publish projects ------------------------ */}
        <aside
          className={cn(
            "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
            "overflow-hidden",
          )}
          data-testid="canvas-publish-project-list"
        >
          <header className="px-4 py-3 border-b border-border-subtle bg-neutral-50/50">
            <p className="m-0 text-xs font-semibold text-neutral-800">
              Hazır Projeler
            </p>
            <p className="m-0 mt-0.5 text-[10px] text-neutral-500">
              Aktif job'ı olan veya tamamlanmış projeler
            </p>
          </header>
          {projects.length === 0 ? (
            <div
              className="p-6 text-center"
              data-testid="canvas-publish-projects-empty"
            >
              <p className="m-0 text-sm text-neutral-600">
                Yayın için uygun proje yok
              </p>
              <p className="m-0 mt-1 text-xs text-neutral-500">
                Önce bir projeyi tamamlayıp üretimi bitir.
              </p>
            </div>
          ) : (
            <ul className="list-none m-0 p-0 max-h-[540px] overflow-y-auto">
              {projects.map((p) => {
                const active = p.id === selectedProjectId;
                return (
                  <li
                    key={p.id}
                    className="border-b border-border-subtle last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleProjectSelect(p.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-start gap-3",
                        "transition-colors duration-fast",
                        active
                          ? "bg-brand-50 border-l-2 border-l-brand-600"
                          : "border-l-2 border-l-transparent hover:bg-neutral-50",
                      )}
                      data-testid={`canvas-publish-project-${p.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="m-0 text-sm font-semibold text-neutral-800 truncate">
                          {p.title}
                        </p>
                        <p className="m-0 mt-0.5 text-[11px] text-neutral-500">
                          {!p.module_type || p.module_type === "mixed"
                            ? "Karma"
                            : (MODULE_LABELS[p.module_type] ?? p.module_type)}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <StatusBadge status={p.content_status} size="sm" />
                          {p.active_job_id ? (
                            <span className="text-[9px] font-mono uppercase text-brand-600 border border-brand-200 rounded px-1">
                              aktif job
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Right column: project detail + connection + form -------------- */}
        <div className="flex flex-col gap-4 min-w-0">
          {!selectedProject ? (
            <div
              className={cn(
                "rounded-xl border border-dashed border-border-subtle",
                "bg-gradient-to-br from-brand-50/40 via-neutral-50 to-neutral-100",
                "p-10 text-center",
              )}
              data-testid="canvas-publish-placeholder"
            >
              <p className="m-0 text-sm font-semibold text-neutral-700">
                Sol sütundan bir proje seç
              </p>
              <p className="m-0 mt-1 text-xs text-neutral-500">
                Seçilen proje için yayın atölyesi burada açılacak.
              </p>
            </div>
          ) : (
            <>
              {/* Project summary card ----------------------------------- */}
              <section
                className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
                data-testid="canvas-publish-project-summary"
              >
                <header className="flex items-start gap-4 px-5 py-4 border-b border-border-subtle bg-neutral-50/50">
                  {previewVideoUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewPlaying(true)}
                      className={cn(
                        "w-[96px] h-[54px] shrink-0 rounded-md border border-border-subtle",
                        "relative overflow-hidden bg-black",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500",
                      )}
                      data-testid="canvas-publish-preview-slot"
                      aria-label="Ön izlemeyi aç"
                      title="Ön izlemeyi aç"
                    >
                      <video
                        src={previewVideoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        data-testid="canvas-publish-preview-thumbnail"
                      />
                      <span
                        className={cn(
                          "absolute inset-0 flex items-center justify-center",
                          "bg-black/30 text-white text-lg",
                        )}
                      >
                        ▶
                      </span>
                    </button>
                  ) : (
                    <div
                      className={cn(
                        "w-[96px] h-[54px] shrink-0 rounded-md border border-dashed border-border-subtle",
                        "bg-gradient-to-br from-brand-50 to-neutral-50",
                        "flex items-center justify-center",
                      )}
                      data-testid="canvas-publish-preview-slot"
                    >
                      <span className="text-[9px] font-mono uppercase text-neutral-400">
                        ön izleme
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-sm font-semibold text-neutral-900 truncate">
                      {selectedProject.title}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-neutral-500">
                      {!selectedProject.module_type ||
                      selectedProject.module_type === "mixed"
                        ? "Karma"
                        : (MODULE_LABELS[selectedProject.module_type] ??
                          selectedProject.module_type)}
                      {" · "}
                      kanal: {channelName ?? "-"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusBadge
                        status={selectedProject.content_status}
                        size="sm"
                      />
                      <StatusBadge
                        status={selectedProject.publish_status}
                        size="sm"
                      />
                    </div>
                  </div>
                </header>

                {/* Inline full preview — appears on thumbnail click */}
                {previewPlaying && previewVideoUrl ? (
                  <div
                    className="px-5 py-4 border-b border-border-subtle bg-neutral-50/40"
                    data-testid="canvas-publish-preview-player"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="m-0 text-[10px] uppercase font-semibold tracking-wider text-neutral-500">
                        Aktif Render Ön İzleme
                      </p>
                      <button
                        type="button"
                        onClick={() => setPreviewPlaying(false)}
                        className="text-[11px] text-neutral-500 hover:text-neutral-800"
                        data-testid="canvas-publish-preview-close"
                      >
                        Kapat
                      </button>
                    </div>
                    <VideoPlayer
                      src={previewVideoUrl}
                      title={selectedProject.title}
                      className="w-full"
                      keyboardControls
                      testId="canvas-publish-preview-video"
                    />
                    <p className="m-0 mt-2 text-[10px] text-neutral-500">
                      Space/K oynat-duraklat · ←→ ±5s · ↑↓ ses · M sessiz · F
                      tam ekran · 0-9 yüzde atla
                    </p>
                  </div>
                ) : null}

                {/* Existing records */}
                {existingRecords && existingRecords.length > 0 ? (
                  <div
                    className="px-5 py-3 text-xs"
                    data-testid="canvas-publish-existing-records"
                  >
                    <p className="m-0 mb-2 text-[10px] uppercase font-semibold tracking-wider text-neutral-500">
                      Mevcut Yayın Kayıtları
                    </p>
                    <ul className="list-none m-0 p-0 flex flex-col gap-1">
                      {existingRecords.map((rec: PublishRecordSummary) => (
                        <li
                          key={rec.id}
                          className="flex items-center gap-2 text-neutral-600"
                        >
                          <StatusBadge status={rec.status} size="sm" />
                          <span className="text-neutral-500">
                            {rec.platform}
                          </span>
                          <span className="text-neutral-400">
                            {rec.created_at?.slice(0, 16)}
                          </span>
                          {rec.platform_url ? (
                            <a
                              href={rec.platform_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 hover:text-brand-700 ml-auto"
                            >
                              Görüntüle
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              {/* Connection picker ------------------------------------- */}
              <section
                className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
                data-testid="canvas-publish-connection-picker"
              >
                <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
                  <p className="m-0 text-sm font-semibold text-neutral-800">
                    Platform Bağlantısı
                  </p>
                  <p className="m-0 mt-0.5 text-xs text-neutral-500">
                    Bu yayın hangi bağlantı üzerinden yapılacak?
                  </p>
                </header>
                <div className="px-5 py-4">
                  {connections && connections.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {connections.map((conn: ConnectionForPublish) => {
                        const active = selectedConnectionId === conn.id;
                        return (
                          <label
                            key={conn.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-md border cursor-pointer",
                              "transition-colors duration-fast",
                              active
                                ? "border-brand-500 bg-brand-50"
                                : "border-border-subtle hover:border-brand-300",
                              !conn.can_publish
                                ? "opacity-60 cursor-not-allowed"
                                : "",
                            )}
                            data-testid={`canvas-publish-connection-${conn.id}`}
                          >
                            <input
                              type="radio"
                              name="canvas-publish-connection"
                              value={conn.id}
                              checked={active}
                              onChange={() =>
                                conn.can_publish &&
                                setSelectedConnectionId(conn.id)
                              }
                              disabled={!conn.can_publish}
                              className="accent-brand-600"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="m-0 text-sm font-semibold text-neutral-800 truncate">
                                {conn.external_account_name ?? conn.platform}
                              </p>
                              <p className="m-0 mt-0.5 text-[11px] text-neutral-500">
                                {conn.platform}
                                {conn.is_primary ? " · birincil" : ""}
                                {" · "}
                                {conn.can_publish
                                  ? "yayınlanabilir"
                                  : "yetersiz bağlantı"}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : channelProfileId ? (
                    <p
                      className="m-0 text-xs text-neutral-500"
                      data-testid="canvas-publish-no-connections"
                    >
                      Bu kanal için platform bağlantısı bulunamadı.
                    </p>
                  ) : (
                    <p className="m-0 text-xs text-neutral-500">
                      Bağlantı listesi yükleniyor...
                    </p>
                  )}
                </div>
              </section>

              {/* Intent form ----------------------------------------- */}
              <section
                className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
                data-testid="canvas-publish-form"
              >
                <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
                  <p className="m-0 text-sm font-semibold text-neutral-800">
                    Yayın Bilgileri
                  </p>
                  <p className="m-0 mt-0.5 text-xs text-neutral-500">
                    Platforma gidecek meta veriyi düzenle.
                  </p>
                </header>
                <div className="px-5 py-4 flex flex-col gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                      Başlık
                    </label>
                    <input
                      type="text"
                      value={intentTitle}
                      onChange={(e) => setIntentTitle(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-md",
                        "border border-border-subtle bg-surface-card",
                        "focus:outline-none focus:border-brand-400",
                      )}
                      placeholder="Video başlığı..."
                      maxLength={100}
                      data-testid="canvas-publish-title-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                      Açıklama
                    </label>
                    <textarea
                      value={intentDescription}
                      onChange={(e) => setIntentDescription(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-md",
                        "border border-border-subtle bg-surface-card",
                        "focus:outline-none focus:border-brand-400",
                        "min-h-[96px] resize-y",
                      )}
                      placeholder="Video açıklaması..."
                      maxLength={5000}
                      data-testid="canvas-publish-desc-input"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                        Etiketler (virgül ile)
                      </label>
                      <input
                        type="text"
                        value={intentTags}
                        onChange={(e) => setIntentTags(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 text-sm rounded-md",
                          "border border-border-subtle bg-surface-card",
                          "focus:outline-none focus:border-brand-400",
                        )}
                        placeholder="etiket1, etiket2"
                        data-testid="canvas-publish-tags-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                        Gizlilik
                      </label>
                      <select
                        value={intentPrivacy}
                        onChange={(e) => setIntentPrivacy(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 text-sm rounded-md",
                          "border border-border-subtle bg-surface-card",
                          "focus:outline-none focus:border-brand-400",
                        )}
                        data-testid="canvas-publish-privacy-select"
                      >
                        <option value="public">Herkese Açık</option>
                        <option value="unlisted">Listede Yok</option>
                        <option value="private">Gizli</option>
                      </select>
                    </div>
                  </div>

                  {/* Error / success */}
                  {errorMsg ? (
                    <div
                      className="rounded-md border border-error-base/30 bg-error-light/30 px-3 py-2 text-xs text-error-dark"
                      data-testid="canvas-publish-error"
                    >
                      {errorMsg}
                    </div>
                  ) : null}
                  {successMsg ? (
                    <div
                      className="rounded-md border border-success-base/30 bg-success-light/30 px-3 py-2 text-xs text-success-dark"
                      data-testid="canvas-publish-success"
                    >
                      {successMsg}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => submitMutation.mutate()}
                      disabled={!canSubmit}
                      className={cn(
                        "px-4 py-2 rounded-md text-sm font-semibold",
                        canSubmit
                          ? "bg-brand-600 text-white hover:bg-brand-700"
                          : "bg-neutral-200 text-neutral-500 cursor-not-allowed",
                      )}
                      data-testid="canvas-publish-submit"
                    >
                      {submitMutation.isPending
                        ? "Gönderiliyor..."
                        : "Oluştur ve Onaya Gönder"}
                    </button>
                    {!selectedProject.active_job_id ? (
                      <span className="text-[11px] text-warning-base">
                        Bu projenin aktif bir işi yok — önce üretimi tamamla.
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
