/**
 * Aurora User/Admin Job Detail — user.jobs.detail / admin.jobs.detail override.
 *
 * Derinlik parite: legacy JobDetailBody ile birebir iş yapar ama Aurora dili
 * içinde kalır. Kapsam:
 *   - Overview (meta alanları, last_error)
 *   - Pipeline (adımlar, ilerleme bar, step-level skip aksiyonu)
 *   - Logs (adım log metinleri)
 *   - Outputs (artifact_refs_json'dan çıkarılan video + görsel dosyaları)
 *   - Publish linkage (mevcut publish record'a link veya "Yayına hazırla" CTA)
 *   - Actions (inspector: cancel / retry / clone — allowed-actions driven)
 *   - Canlı SSE bağlantısı (queued/running/processing/retrying durumlarında)
 *
 * Veri: useJobDetail → /api/v1/jobs/{id}. Adım listesi backend'den gelir,
 * hardcoded pipeline yok. Skip-step ve clone işlemleri jobsApi üzerinden
 * gerçek backend endpoint'lerine bağlıdır. Publish bağlantısı
 * usePublishRecordForJob + useCreatePublishRecordFromJob hook'larını kullanır.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJobDetail } from "../../hooks/useJobDetail";
import { useSSE } from "../../hooks/useSSE";
import {
  usePublishRecordForJob,
  useCreatePublishRecordFromJob,
} from "../../hooks/usePublish";
import { useToast } from "../../hooks/useToast";
import {
  cancelJob,
  cloneJob,
  fetchAllowedActions,
  retryJob,
  skipStep,
  type AllowedActions,
  type JobStepResponse,
} from "../../api/jobsApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraStatusChip,
} from "./primitives";
import { VideoPlayer } from "../../components/shared/VideoPlayer";
import { Icon } from "./icons";

type Tab = "overview" | "pipeline" | "logs" | "outputs" | "publish";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Özet" },
  { value: "pipeline", label: "Adımlar" },
  { value: "outputs", label: "Çıktılar" },
  { value: "publish", label: "Yayın" },
  { value: "logs", label: "Log" },
];

const STEP_LABEL: Record<string, string> = {
  initialize: "Başlatma",
  source_select: "Kaynak seçimi",
  script_generate: "Script üretimi",
  tts_synthesize: "TTS sentezi",
  visual_generate: "Görsel üretimi",
  composition: "Kompozisyon",
  render: "Render",
  publish: "Yayın",
};

const VIDEO_EXTS = ["mp4", "webm", "mov"];
const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp"];
const ACTIVE_STATUSES = ["queued", "running", "processing", "retrying"];

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtDuration(s: number | null): string {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const ss = String(Math.round(s % 60)).padStart(2, "0");
  return `${String(m).padStart(2, "0")}:${ss}`;
}

function stepProgress(step: JobStepResponse): number | null {
  if (step.status === "completed" || step.status === "succeeded") return 100;
  if (step.status === "failed" || step.status === "cancelled") return null;
  if (step.status !== "running" && step.status !== "in_progress") return null;
  if (step.elapsed_seconds_live == null || step.eta_seconds == null) return null;
  const total = step.elapsed_seconds_live + step.eta_seconds;
  if (total <= 0) return null;
  return Math.min(99, Math.round((step.elapsed_seconds_live / total) * 100));
}

function jobProgress(job: { steps: JobStepResponse[] }): number {
  if (job.steps.length === 0) return 0;
  let total = 0;
  for (const s of job.steps) {
    if (s.status === "completed" || s.status === "succeeded") total += 100;
    else if (s.status === "running" || s.status === "in_progress") {
      const p = stepProgress(s);
      total += p ?? 0;
    }
  }
  return Math.round(total / job.steps.length);
}

function artifactUrl(jobId: string, path: string): string {
  const filename = path.split("/").pop() ?? path;
  return `/api/v1/jobs/${jobId}/artifacts/${encodeURIComponent(filename)}`;
}

function extractOutputArtifacts(steps: JobStepResponse[]): {
  videos: string[];
  images: string[];
  others: string[];
} {
  const videos: string[] = [];
  const images: string[] = [];
  const others: string[] = [];

  const classify = (p: unknown) => {
    if (typeof p !== "string") return;
    const ext = p.split(".").pop()?.toLowerCase() ?? "";
    if (VIDEO_EXTS.includes(ext)) videos.push(p);
    else if (IMAGE_EXTS.includes(ext)) images.push(p);
    else others.push(p);
  };

  for (const step of steps) {
    if (!step.artifact_refs_json) continue;
    try {
      const parsed = JSON.parse(step.artifact_refs_json);
      if (!parsed || typeof parsed !== "object") continue;
      const obj = parsed as Record<string, unknown>;
      for (const key of ["output_path", "exported_path", "artifact_path"]) {
        classify(obj[key]);
      }
      const arr = obj.output_paths;
      if (Array.isArray(arr)) {
        for (const p of arr) classify(p);
      }
      for (const [k, v] of Object.entries(obj)) {
        if (
          k === "output_path" ||
          k === "exported_path" ||
          k === "artifact_path" ||
          k === "output_paths"
        )
          continue;
        classify(v);
      }
    } catch {
      /* skip malformed JSON */
    }
  }

  return { videos, images, others };
}

function publishChipTone(status: string): "success" | "info" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "published":
      return "success";
    case "approved":
    case "scheduled":
    case "publishing":
      return "info";
    case "pending_review":
      return "warning";
    case "failed":
    case "cancelled":
    case "review_rejected":
      return "danger";
    default:
      return "neutral";
  }
}

export function AuroraUserJobDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const toast = useToast();
  const jobId = params.jobId ?? null;
  const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/user";

  const [tab, setTab] = useState<Tab>("overview");
  const jobQ = useJobDetail(jobId);
  const job = jobQ.data;

  const isActiveJob = !!job && ACTIVE_STATUSES.includes(job.status);

  // Canlı bağlantı — sadece aktif job'larda
  const { connected: sseConnected, reconnecting: sseReconnecting } = useSSE({
    url: `/api/v1/sse/jobs/${jobId ?? ""}`,
    enabled: !!jobId && isActiveJob,
    invalidateKeys: [["jobs", jobId ?? ""]],
    eventTypes: ["job:status_changed", "job:step_changed"],
  });

  // Allowed actions — backend lokomotif: can_cancel/retry/clone + skippable_steps
  const allowedQ = useQuery<AllowedActions>({
    queryKey: ["jobs", jobId, "allowed-actions"],
    queryFn: () => fetchAllowedActions(jobId!),
    enabled: !!jobId,
    // Aktif job'ta adımlar hızlı değişebilir; SSE olmasa bile
    // her 20sn tazele (overhead düşük, endpoint ucuz).
    refetchInterval: isActiveJob ? 20_000 : false,
  });

  const cancelM = useMutation({
    mutationFn: () => cancelJob(jobId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs", jobId, "allowed-actions"] });
      toast.success("Job iptal edildi.");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "İptal başarısız."),
  });
  const retryM = useMutation({
    mutationFn: () => retryJob(jobId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs", jobId, "allowed-actions"] });
      toast.success("Yeniden denemeye alındı.");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Yeniden başlatma başarısız."),
  });
  const cloneM = useMutation({
    mutationFn: () => cloneJob(jobId!),
    onSuccess: (clone) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job klonlandı.");
      navigate(`${basePath}/jobs/${clone.id}`);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Klonlama başarısız."),
  });
  const skipM = useMutation({
    mutationFn: (stepKey: string) => skipStep(jobId!, stepKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs", jobId, "allowed-actions"] });
      toast.success("Adım atlandı.");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Adım atlama başarısız."),
  });

  const progress = job ? jobProgress(job) : 0;
  const currentStep = useMemo(
    () => job?.steps.find((s) => s.step_key === job.current_step_key) ?? null,
    [job],
  );

  const outputs = useMemo(
    () => (job ? extractOutputArtifacts(job.steps) : { videos: [], images: [], others: [] }),
    [job],
  );

  // Publish linkage
  const publishQ = usePublishRecordForJob(jobId ?? undefined);
  const publishRecords = publishQ.data ?? [];
  const createPublishM = useCreatePublishRecordFromJob();

  const allowed = allowedQ.data;
  const skippableSet = useMemo(
    () => new Set(allowed?.skippable_steps ?? []),
    [allowed],
  );

  // Çıktı varsa ve kullanıcı hâlâ özet tab'indeyken, arkada hazır bilgi olduğunu göstermek için
  // çıktı tab'ine nokta rozet bırakalım — kararı aşağıdaki TAB render'ında kullanıyoruz.
  const outputsCount = outputs.videos.length + outputs.images.length;
  const publishCount = publishRecords.length;

  // URL'den tab query okuma: legacy linklerde "?tab=logs" gibi gelirse saygı göster.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const raw = q.get("tab");
    if (raw && TABS.some((t) => t.value === raw)) {
      setTab(raw as Tab);
    }
  }, [location.search]);

  const inspector = (
    <AuroraInspector title={jobId ? jobId.slice(0, 8) : "Job"}>
      <AuroraInspectorSection title="Meta">
        <AuroraInspectorRow label="modül" value={job?.module_type ?? "—"} />
        <AuroraInspectorRow label="durum" value={job?.status ?? "—"} />
        <AuroraInspectorRow
          label="eta"
          value={fmtDuration(job?.eta_seconds ?? job?.estimated_remaining_seconds ?? null)}
        />
        <AuroraInspectorRow
          label="geçen"
          value={fmtDuration(job?.elapsed_total_seconds ?? null)}
        />
        <AuroraInspectorRow label="retry" value={String(job?.retry_count ?? 0)} />
        <AuroraInspectorRow
          label="canlı"
          value={
            !job
              ? "—"
              : isActiveJob
                ? sseConnected
                  ? "bağlı"
                  : sseReconnecting
                    ? "yeniden bağlanıyor"
                    : "kesildi"
                : "pasif"
          }
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Eylem">
        <AuroraButton
          variant="secondary"
          size="sm"
          disabled={
            !job ||
            cancelM.isPending ||
            (allowed ? !allowed.can_cancel : job.status === "completed" || job.status === "cancelled" || job.status === "failed")
          }
          onClick={() => cancelM.mutate()}
          style={{ width: "100%", marginBottom: 6 }}
        >
          {cancelM.isPending ? "İptal ediliyor…" : "İptal et"}
        </AuroraButton>
        <AuroraButton
          variant="primary"
          size="sm"
          disabled={
            !job ||
            retryM.isPending ||
            (allowed ? !allowed.can_retry : job.status !== "failed" && job.status !== "cancelled")
          }
          onClick={() => retryM.mutate()}
          style={{ width: "100%", marginBottom: 6 }}
        >
          {retryM.isPending ? "Yeniden başlatılıyor…" : "Yeniden başlat"}
        </AuroraButton>
        <AuroraButton
          variant="ghost"
          size="sm"
          disabled={!job || cloneM.isPending || (allowed ? !allowed.can_clone : false)}
          onClick={() => cloneM.mutate()}
          style={{ width: "100%" }}
        >
          {cloneM.isPending ? "Klonlanıyor…" : "Klonla"}
        </AuroraButton>
      </AuroraInspectorSection>
      {skippableSet.size > 0 && (
        <AuroraInspectorSection title="Atlanabilir adımlar">
          <div style={{ display: "grid", gap: 4 }}>
            {Array.from(skippableSet).map((sk) => (
              <AuroraButton
                key={sk}
                variant="ghost"
                size="sm"
                disabled={skipM.isPending}
                onClick={() => skipM.mutate(sk)}
              >
                {(STEP_LABEL[sk] ?? sk) + " — atla"}
              </AuroraButton>
            ))}
          </div>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  if (jobQ.isLoading) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        </div>
        <aside className="aurora-inspector-slot">{inspector}</aside>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div className="card card-pad" style={{ textAlign: "center", padding: 32 }}>
            <Icon name="alert-triangle" size={28} />
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              Job bulunamadı.
            </div>
            <div style={{ marginTop: 12 }}>
              <AuroraButton
                variant="ghost"
                size="sm"
                onClick={() => navigate(`${basePath}/projects`)}
              >
                Projelere dön
              </AuroraButton>
            </div>
          </div>
        </div>
        <aside className="aurora-inspector-slot">{inspector}</aside>
      </div>
    );
  }

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>{job.module_type}</h1>
            <div
              className="sub"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
            >
              {job.id.slice(0, 8)} · {job.status} · {progress}%
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            {job.content_project_id && (
              <AuroraButton
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate(`${basePath}/projects/${job.content_project_id}`)
                }
              >
                Projeye git
              </AuroraButton>
            )}
          </div>
        </div>

        {/* Canlı bağlantı uyarı şeridi */}
        {isActiveJob && !sseConnected && (
          <div
            data-testid="aurora-job-sse-banner"
            style={{
              marginBottom: 12,
              padding: "8px 12px",
              borderRadius: 8,
              background: "var(--state-warning-bg, rgba(218,165,32,0.10))",
              color: "var(--state-warning-fg, #c08a1f)",
              border: "1px solid var(--state-warning-fg, #c08a1f)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "currentColor",
                display: "inline-block",
                opacity: sseReconnecting ? 0.55 : 1,
              }}
            />
            {sseReconnecting
              ? "Canlı bağlantı yeniden kuruluyor…"
              : "Canlı bağlantı kesildi."}
          </div>
        )}

        <div className="card card-pad" style={{ marginBottom: 14 }}>
          <div
            style={{
              height: 5,
              borderRadius: 3,
              background: "var(--bg-inset)",
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "var(--gradient-brand)",
                boxShadow: "var(--glow-accent)",
                transition: "width .3s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <span>
              {currentStep
                ? `${STEP_LABEL[currentStep.step_key] ?? currentStep.step_key} — ${stepProgress(currentStep) ?? 0}%`
                : `${job.status}`}
            </span>
            <span>
              eta{" "}
              {fmtDuration(
                job.eta_seconds ?? job.estimated_remaining_seconds ?? null,
              )}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 2,
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: 16,
          }}
        >
          {TABS.map((t) => {
            const badgeCount =
              t.value === "outputs"
                ? outputsCount
                : t.value === "publish"
                  ? publishCount
                  : 0;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                style={{
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  marginBottom: -1,
                  color:
                    tab === t.value
                      ? "var(--accent-primary-hover)"
                      : "var(--text-muted)",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${tab === t.value ? "var(--accent-primary)" : "transparent"}`,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {t.label}
                {badgeCount > 0 && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--accent-primary-hover)",
                      background: "var(--accent-primary-muted)",
                      borderRadius: 999,
                      padding: "1px 6px",
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "overview" && (
          <div className="card card-pad">
            {[
              ["Modül", job.module_type],
              ["Durum", job.status],
              ["Başlangıç", fmtTime(job.started_at)],
              ["Güncellendi", fmtTime(job.updated_at)],
              ["Geçen süre", fmtDuration(job.elapsed_total_seconds)],
              [
                "Tahmini kalan",
                fmtDuration(
                  job.eta_seconds ?? job.estimated_remaining_seconds ?? null,
                ),
              ],
              ["Retry", String(job.retry_count)],
              ["İlerleme", `${progress}%`],
            ].map(([k, v]) => (
              <div
                key={k as string}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "7px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    flex: 1,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
            {job.last_error && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "rgba(231,76,60,0.08)",
                  borderLeft: "2px solid var(--state-danger-fg)",
                  fontSize: 11,
                  color: "var(--state-danger-fg)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {job.last_error}
              </div>
            )}
          </div>
        )}

        {tab === "pipeline" && (
          <div className="card card-pad">
            {job.steps.map((s, i) => {
              const isDone =
                s.status === "completed" || s.status === "succeeded";
              const isActive =
                s.status === "running" || s.status === "in_progress";
              const isFailed = s.status === "failed";
              const pct = stepProgress(s);
              const canSkip = skippableSet.has(s.step_key);
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: "8px 0",
                    borderBottom:
                      i < job.steps.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      flexShrink: 0,
                      background: isDone
                        ? "var(--state-success-fg)"
                        : isActive
                          ? "var(--gradient-brand)"
                          : isFailed
                            ? "var(--state-danger-fg)"
                            : "var(--bg-inset)",
                      border:
                        !isDone && !isActive && !isFailed
                          ? "1px solid var(--border-default)"
                          : "none",
                      color:
                        !isDone && !isActive && !isFailed
                          ? "var(--text-muted)"
                          : "#fff",
                      marginTop: 2,
                    }}
                  >
                    {isDone ? (
                      <Icon name="check" size={11} />
                    ) : isFailed ? (
                      "!"
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>{STEP_LABEL[s.step_key] ?? s.step_key}</span>
                      {canSkip && (
                        <button
                          type="button"
                          onClick={() => skipM.mutate(s.step_key)}
                          disabled={skipM.isPending}
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "var(--bg-inset)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-default)",
                            cursor: skipM.isPending ? "wait" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {skipM.isPending && skipM.variables === s.step_key
                            ? "atlanıyor…"
                            : "atla"}
                        </button>
                      )}
                    </div>
                    {pct != null && isActive && (
                      <div
                        style={{
                          height: 3,
                          borderRadius: 2,
                          background: "var(--bg-inset)",
                          marginTop: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: "var(--gradient-brand)",
                          }}
                        />
                      </div>
                    )}
                    {s.last_error && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          color: "var(--state-danger-fg)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {s.last_error}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--text-muted)",
                    }}
                  >
                    {fmtTime(s.finished_at ?? s.started_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {tab === "outputs" && (
          <div className="card card-pad">
            {outputs.videos.length === 0 && outputs.images.length === 0 ? (
              <div
                style={{
                  padding: "18px 0",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                {job.status === "completed"
                  ? "Adımlardan çıktı referansı gelmedi."
                  : "Job tamamlandığında çıktılar burada görünür."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {outputs.videos.map((v, i) => (
                  <div key={v}>
                    {outputs.videos.length > 1 && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          marginBottom: 4,
                        }}
                      >
                        video {i + 1}
                      </div>
                    )}
                    <VideoPlayer
                      src={artifactUrl(job.id, v)}
                      title={v.split("/").pop()}
                      showDownload
                      testId={`aurora-job-output-video-${i}`}
                    />
                  </div>
                ))}
                {outputs.images.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        outputs.images.length === 1 ? "1fr" : "repeat(2, 1fr)",
                      gap: 10,
                    }}
                  >
                    {outputs.images.map((img, i) => (
                      <div key={img} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <img
                          src={artifactUrl(job.id, img)}
                          alt={`Çıktı ${i + 1}`}
                          style={{
                            width: "100%",
                            borderRadius: 8,
                            objectFit: "contain",
                            background: "var(--bg-inset)",
                            border: "1px solid var(--border-subtle)",
                            maxHeight: 320,
                          }}
                          data-testid={`aurora-job-output-image-${i}`}
                        />
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={img}
                        >
                          {img.split("/").pop()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {outputs.others.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        marginBottom: 6,
                      }}
                    >
                      diğer dosyalar
                    </div>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      {outputs.others.map((p) => (
                        <li key={p}>
                          <a
                            href={artifactUrl(job.id, p)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 11,
                              fontFamily: "var(--font-mono)",
                              color: "var(--accent-primary-hover)",
                              wordBreak: "break-all",
                            }}
                          >
                            {p}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "publish" && (
          <div className="card card-pad">
            {publishQ.isLoading ? (
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Yayın kayıtları yükleniyor…
              </div>
            ) : publishRecords.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {publishRecords.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <AuroraStatusChip tone={publishChipTone(rec.status)}>
                        {rec.status}
                      </AuroraStatusChip>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-primary)",
                            textTransform: "capitalize",
                          }}
                        >
                          {rec.platform}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {rec.id}
                        </div>
                      </div>
                    </div>
                    <AuroraButton
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`${basePath}/publish/${rec.id}`)}
                    >
                      Detay →
                    </AuroraButton>
                  </div>
                ))}
              </div>
            ) : job.status === "completed" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "4px 0",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Bu job için henüz yayın kaydı yok.
                </span>
                <AuroraButton
                  variant="primary"
                  size="sm"
                  disabled={createPublishM.isPending}
                  onClick={async () => {
                    try {
                      const record = await createPublishM.mutateAsync({
                        jobId: job.id,
                        body: {
                          platform: "youtube",
                          content_ref_type: job.module_type,
                        },
                      });
                      toast.success("Yayın kaydı oluşturuldu.");
                      navigate(`${basePath}/publish/${record.id}`);
                    } catch (err: unknown) {
                      toast.error(
                        err instanceof Error ? err.message : "Yayın kaydı oluşturulamadı.",
                      );
                    }
                  }}
                  data-testid="aurora-job-create-publish"
                >
                  {createPublishM.isPending ? "Hazırlanıyor…" : "Yayına hazırla"}
                </AuroraButton>
              </div>
            ) : (
              <div
                style={{
                  padding: "18px 0",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                Job tamamlandığında yayın kaydı oluşturulabilir.
              </div>
            )}
          </div>
        )}

        {tab === "logs" && (
          <div
            className="card card-pad"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-secondary)",
              lineHeight: 1.8,
            }}
          >
            {job.steps.length === 0 && (
              <div style={{ color: "var(--text-muted)" }}>Log kaydı yok.</div>
            )}
            {job.steps.map((s) => (
              <div key={s.id}>
                <span style={{ color: "var(--text-muted)" }}>
                  [{fmtTime(s.started_at)}]
                </span>{" "}
                <span
                  style={{
                    color:
                      s.status === "failed"
                        ? "var(--state-danger-fg)"
                        : s.status === "running" || s.status === "in_progress"
                          ? "var(--state-info-fg)"
                          : "var(--state-success-fg)",
                  }}
                >
                  {s.status}
                </span>{" "}
                {STEP_LABEL[s.step_key] ?? s.step_key}
                {s.log_text && (
                  <div
                    style={{
                      paddingLeft: 60,
                      color: "var(--text-muted)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {s.log_text.slice(0, 500)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
