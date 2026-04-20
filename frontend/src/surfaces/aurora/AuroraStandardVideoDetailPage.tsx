/**
 * AuroraStandardVideoDetailPage — Aurora Dusk Cockpit / Standart Video Detayı (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/standard-video-detail.html`.
 *
 * Tasarım hedefi:
 *   - Page-head: başlık + alt başlık (mono ID + status), aksiyonlar (oluştur, düzenle, geri)
 *   - Sol ana içerik:
 *       · Genel bakış kartı (preview alanı + meta liste)
 *       · Script kartı (içerik özeti)
 *       · Metadata kartı (başlık, açıklama, tags)
 *   - Sağ Inspector:
 *       · Meta (modül, durum, dil, süre, format)
 *       · Job (state, progress bar, current step, retry, ETA)
 *       · Step timeline (özet, ilk 6 adım)
 *       · Zaman bilgisi (oluşturuldu / güncellendi)
 *
 * Veri kaynakları (hepsi gerçek backend, hiçbir mock yok):
 *   - useStandardVideoDetail(id) — StandardVideoResponse
 *   - useStandardVideoScript(id) — StandardVideoScriptResponse | null
 *   - useStandardVideoMetadata(id) — StandardVideoMetadataResponse | null
 *   - useJobsList() — job_id ile eşleşen JobResponse (step ilerleme + retry)
 *
 * Aksiyonlar:
 *   - "Oluştur" — startStandardVideoProduction (job tetikler)
 *   - "Düzenle" — legacy /admin/standard-videos/:id rotasına edit modunda dön
 *     (Aurora yüzeyi salt-okuma + aksiyon yönlendirme; form düzenleme legacy'de kalır)
 *
 * Hiçbir legacy code değiştirilmez; surface override sistemi `register.tsx`
 * tarafından `admin.standard-video.detail` slot'una bağlandığında devreye girer.
 */

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useStandardVideoDetail,
  useStandardVideoScript,
  useStandardVideoMetadata,
} from "../../hooks/useStandardVideoDetail";
import { useJobsList } from "../../hooks/useJobsList";
import {
  startStandardVideoProduction,
  type StandardVideoResponse,
} from "../../api/standardVideoApi";
import type { JobResponse, JobStepResponse } from "../../api/jobsApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraProgressBar,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Status taxonomy — registry sayfasındaki yorumlama ile uyumlu kalır.
// ---------------------------------------------------------------------------

type StatusGroup = "draft" | "in_progress" | "completed" | "published" | "failed";

const STATUS_TONE: Record<StatusGroup, { color: string; label: string }> = {
  draft: { color: "var(--text-muted)", label: "Taslak" },
  in_progress: { color: "var(--state-info-fg)", label: "Üretimde" },
  completed: { color: "var(--state-success-fg)", label: "Tamamlandı" },
  published: { color: "var(--state-success-fg)", label: "Yayında" },
  failed: { color: "var(--state-danger-fg)", label: "Başarısız" },
};

function groupStatus(raw: string | null | undefined): StatusGroup {
  const s = (raw ?? "").toLowerCase();
  if (!s || s === "draft") return "draft";
  if (s === "published") return "published";
  if (s === "completed" || s === "ready") return "completed";
  if (s === "failed" || s === "error") return "failed";
  return "in_progress";
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return "—";
  return t.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function jobProgressPct(job: JobResponse | undefined | null): number {
  if (!job) return 0;
  if (job.status === "completed") return 100;
  if (job.status === "failed" || job.status === "cancelled") return 0;
  if (!job.steps || job.steps.length === 0) return 0;
  const total = job.steps.length;
  const done = job.steps.filter(
    (s) => s.status === "completed" || s.status === "succeeded",
  ).length;
  return Math.round((done / total) * 100);
}

function stepDot(step: JobStepResponse): string {
  const s = step.status.toLowerCase();
  if (s === "completed" || s === "succeeded") return "var(--state-success-fg)";
  if (s === "running" || s === "in_progress") return "var(--state-info-fg)";
  if (s === "failed" || s === "error" || s === "cancelled") return "var(--state-danger-fg)";
  return "var(--text-muted)";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraStandardVideoDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const id = itemId ?? null;
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: video, isLoading, isError, error } = useStandardVideoDetail(id);
  const { data: script } = useStandardVideoScript(id);
  const { data: metadata } = useStandardVideoMetadata(id);
  const { data: jobs } = useJobsList(false);

  const job = useMemo<JobResponse | null>(() => {
    if (!video?.job_id || !jobs) return null;
    return jobs.find((j) => j.id === video.job_id) ?? null;
  }, [video, jobs]);

  const startMutation = useMutation({
    mutationFn: () => startStandardVideoProduction(id ?? ""),
    onSuccess: () => {
      toast.success("Üretim başlatıldı");
      queryClient.invalidateQueries({ queryKey: ["standard-videos"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Üretim başlatılamadı"),
  });

  // -------------------------------------------------------------------------
  // Loading / error / empty
  // -------------------------------------------------------------------------

  if (isLoading) {
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
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            {isError
              ? `Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`
              : "Kayıt bulunamadı."}
          </div>
        </div>
      </div>
    );
  }

  const v: StandardVideoResponse = video;
  const group = groupStatus(v.status);
  const tone = STATUS_TONE[group];
  const pct = jobProgressPct(job);
  const currentStep = job?.steps.find((s) => s.step_key === job.current_step_key) ?? null;
  const titleText = v.title || v.topic || "—";

  // Üretim aksiyonu sadece pipeline başlamamışsa veya başarısızsa anlamlı.
  const canStart =
    !v.job_id || group === "draft" || group === "failed";

  // -------------------------------------------------------------------------
  // Inspector
  // -------------------------------------------------------------------------

  const inspector = (
    <AuroraInspector title={shortId(v.id)}>
      <AuroraInspectorSection title="Meta">
        <AuroraInspectorRow label="modül" value="standard_video" />
        <AuroraInspectorRow
          label="durum"
          value={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: tone.color,
                  boxShadow: `0 0 6px ${tone.color}`,
                }}
              />
              {tone.label}
            </span>
          }
        />
        <AuroraInspectorRow label="dil" value={v.language ?? "—"} />
        <AuroraInspectorRow label="ton" value={v.tone ?? "—"} />
        <AuroraInspectorRow label="süre" value={fmtDuration(v.target_duration_seconds)} />
        <AuroraInspectorRow label="format" value={v.render_format ?? "—"} />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Job">
        {job ? (
          <>
            <AuroraInspectorRow
              label="state"
              value={
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {job.status}
                </span>
              }
            />
            <AuroraInspectorRow label="ilerleme" value={`%${pct}`} />
            <AuroraInspectorRow
              label="adım"
              value={
                currentStep
                  ? currentStep.step_key
                  : job.current_step_key ?? "—"
              }
            />
            <AuroraInspectorRow label="retry" value={String(job.retry_count ?? 0)} />
            <AuroraInspectorRow
              label="ETA"
              value={
                job.estimated_remaining_seconds != null
                  ? `${Math.max(0, Math.round(job.estimated_remaining_seconds))}sn`
                  : "—"
              }
            />
            <div style={{ marginTop: 8 }}>
              <AuroraProgressBar value={pct} done={pct >= 100} />
            </div>
          </>
        ) : (
          <AuroraInspectorRow label="job" value="başlatılmadı" />
        )}
      </AuroraInspectorSection>

      {job && job.steps.length > 0 && (
        <AuroraInspectorSection title="Adım zaman çizelgesi">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {job.steps.slice(0, 6).map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: stepDot(s),
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, color: "var(--text-secondary)" }}>
                  {s.step_key}
                </span>
                <span style={{ color: "var(--text-muted)" }}>{s.status}</span>
              </div>
            ))}
            {job.steps.length > 6 && (
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                +{job.steps.length - 6} adım daha
              </div>
            )}
          </div>
        </AuroraInspectorSection>
      )}

      <AuroraInspectorSection title="Zaman">
        <AuroraInspectorRow label="oluşturuldu" value={fmtDate(v.created_at)} />
        <AuroraInspectorRow label="güncellendi" value={fmtDate(v.updated_at)} />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="İlişkiler">
        <AuroraInspectorRow
          label="template"
          value={
            v.template_id ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                {shortId(v.template_id)}
              </span>
            ) : (
              "—"
            )
          }
        />
        <AuroraInspectorRow
          label="blueprint"
          value={
            v.style_blueprint_id ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                {shortId(v.style_blueprint_id)}
              </span>
            ) : (
              "—"
            )
          }
        />
        {v.channel_profile_id && (
          <AuroraInspectorRow
            label="kanal"
            value={
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                {shortId(v.channel_profile_id)}
              </span>
            }
          />
        )}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1 style={{ marginBottom: 4 }}>{titleText}</h1>
            <div
              className="sub"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
            >
              {shortId(v.id)} · {tone.label}
              {job ? ` · %${pct}` : ""}
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/standard-videos")}
              iconLeft={<Icon name="arrow-left" size={11} />}
            >
              Listeye dön
            </AuroraButton>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={() =>
                navigate(`/admin/standard-videos/${v.id}?edit=1`)
              }
              iconLeft={<Icon name="edit" size={11} />}
            >
              Düzenle
            </AuroraButton>
            <AuroraButton
              variant="primary"
              size="sm"
              disabled={!canStart || startMutation.isPending}
              onClick={() => startMutation.mutate()}
              iconLeft={<Icon name="play" size={11} />}
            >
              {startMutation.isPending ? "Başlatılıyor…" : "Üretimi başlat"}
            </AuroraButton>
          </div>
        </div>

        {/* --- Genel bakış: preview + meta --------------------------------- */}
        <div className="grid g-2" style={{ marginBottom: 16 }}>
          <div className="card card-pad">
            <div
              style={{
                width: "100%",
                aspectRatio: "16/9",
                background: "linear-gradient(135deg, var(--bg-sidebar-hover), var(--bg-sidebar-active))",
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                color: "var(--accent-primary-hover)",
              }}
            >
              <Icon name="film" size={32} />
            </div>
            {job && (
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: "var(--bg-inset)",
                  marginTop: 10,
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
            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <span>{job ? `job ${shortId(job.id)}` : "job henüz başlamadı"}</span>
              <span>{job ? `%${pct}` : "—"}</span>
            </div>
          </div>

          <div className="card card-pad">
            {[
              ["konu", v.topic || "—"],
              ["başlık", v.title || "—"],
              ["dil", v.language || "—"],
              ["ton", v.tone || "—"],
              ["süre", fmtDuration(v.target_duration_seconds)],
              ["motion", v.motion_level || "—"],
              ["altyazı", v.subtitle_style || "—"],
              ["thumbnail", v.thumbnail_direction || "—"],
            ].map(([k, val]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
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
                    textAlign: "right",
                  }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* --- Brief --------------------------------------------------------- */}
        {v.brief && (
          <div
            className="card card-pad"
            style={{ marginBottom: 16 }}
          >
            <div
              className="overline"
              style={{ marginBottom: 8, color: "var(--text-muted)" }}
            >
              Brief
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
              }}
            >
              {v.brief}
            </div>
          </div>
        )}

        {/* --- Script -------------------------------------------------------- */}
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div className="overline" style={{ color: "var(--text-muted)" }}>
              Script
            </div>
            {script && (
              <span
                className="chip"
                style={{ fontSize: 10 }}
                title={`v${script.version} · ${script.source_type}`}
              >
                v{script.version}
              </span>
            )}
          </div>
          {script ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                maxHeight: 320,
                overflow: "auto",
                background: "var(--bg-inset)",
                padding: 12,
                borderRadius: 6,
              }}
            >
              {script.content}
            </div>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Henüz script yok.
            </div>
          )}
        </div>

        {/* --- Metadata ------------------------------------------------------ */}
        <div className="card card-pad">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div className="overline" style={{ color: "var(--text-muted)" }}>
              Metadata
            </div>
            {metadata && (
              <span className="chip" style={{ fontSize: 10 }}>
                v{metadata.version}
              </span>
            )}
          </div>
          {metadata ? (
            <>
              {[
                ["Başlık", metadata.title],
                ["Açıklama", metadata.description ?? "—"],
                ["Kategori", metadata.category ?? "—"],
                ["Dil", metadata.language ?? "—"],
                ["Tags", metadata.tags_json ?? "—"],
              ].map(([k, val]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      minWidth: 100,
                    }}
                  >
                    {k}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      color: "var(--text-primary)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Henüz metadata yok.
            </div>
          )}
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
