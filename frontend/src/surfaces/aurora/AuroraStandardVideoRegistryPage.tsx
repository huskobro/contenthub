/**
 * AuroraStandardVideoRegistryPage — Aurora Dusk Cockpit / Standart Video Kayıtları (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/standard-video-registry.html`.
 *
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık + "Yeni standard video" aksiyonu)
 *   - reg-tbl: Checkbox / ID / Başlık / Template / Style blueprint / Süre /
 *     Durum (chip + dot) / Job durumu (progress bar varsa) / Güncellendi
 *   - Inspector: Toplam, status dağılımı (draft/in_progress/completed/published),
 *     bu hafta üretilen, ortalama süre.
 *
 * Veri kaynakları:
 *   - useStandardVideosList()       → StandardVideoResponse[]
 *   - useTemplatesList(...)         → template_id → name çözümü için chip etiketi
 *   - useStyleBlueprintsList(...)   → style_blueprint_id → name çözümü
 *   - useJobsList()                 → job_id → ilerleme/step yüzdesi
 *
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.standard-video.registry` slot'una bağlanır.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStandardVideosList } from "../../hooks/useStandardVideosList";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { useStyleBlueprintsList } from "../../hooks/useStyleBlueprintsList";
import { useJobsList } from "../../hooks/useJobsList";
import type { StandardVideoResponse } from "../../api/standardVideoApi";
import type { JobResponse } from "../../api/jobsApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraProgressBar,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Status taxonomy — UI tarafında 4 ana grup gösteriyoruz; backend birden fazla
// alt-status üretebilir (script_ready, metadata_ready, ready, ...). Bunları
// "in_progress" altında topluyoruz; published, completed, draft, failed ise
// ayrı tonlarla işaretlenir.
// ---------------------------------------------------------------------------

type StatusGroup = "draft" | "in_progress" | "completed" | "published" | "failed";

interface StatusToneSpec {
  color: string;
  label: string;
}

const STATUS_TONE: Record<StatusGroup, StatusToneSpec> = {
  draft: { color: "var(--text-muted)", label: "Taslak" },
  in_progress: { color: "var(--state-info-fg)", label: "Üretimde" },
  completed: { color: "var(--state-success-fg)", label: "Tamamlandı" },
  published: { color: "var(--state-success-fg)", label: "Yayında" },
  failed: { color: "var(--state-danger-fg)", label: "Başarısız" },
};

function groupStatus(raw: string | null | undefined): StatusGroup {
  const s = (raw ?? "").toLowerCase();
  if (!s) return "draft";
  if (s === "draft") return "draft";
  if (s === "published") return "published";
  if (s === "completed" || s === "ready") return "completed";
  if (s === "failed" || s === "error") return "failed";
  return "in_progress";
}

function statusLabelRaw(raw: string | null | undefined): string {
  if (!raw) return STATUS_TONE.draft.label;
  return STATUS_TONE[groupStatus(raw)].label;
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

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const d = Math.floor(hr / 24);
  return `${d}g`;
}

function jobProgressPct(job: JobResponse | undefined): number | null {
  if (!job) return null;
  if (job.status === "completed") return 100;
  if (job.status === "failed") return 0;
  if (job.status === "queued" || job.status === "pending") return 0;
  if (!job.steps || job.steps.length === 0) return 0;
  const total = job.steps.length;
  const done = job.steps.filter((s) => s.status === "completed").length;
  return Math.round((done / total) * 100);
}

function isThisWeek(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  return now - t <= 7 * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraStandardVideoRegistryPage() {
  const navigate = useNavigate();

  const { data: videos, isLoading, isError, error } = useStandardVideosList();
  const list: StandardVideoResponse[] = videos ?? [];

  // Lookup tablolarını besleyen veriler. Boş listeyle başlatıp adlandırma için
  // map çıkarıyoruz; eksik referans halinde "—" gösteriyoruz.
  const { data: templates } = useTemplatesList({ module_scope: "standard_video" });
  const { data: blueprints } = useStyleBlueprintsList({ module_scope: "standard_video" });
  const { data: jobs } = useJobsList(false);

  const templateById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of templates ?? []) m.set(t.id, t.name);
    return m;
  }, [templates]);

  const blueprintById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of blueprints ?? []) m.set(b.id, b.name);
    return m;
  }, [blueprints]);

  const jobById = useMemo(() => {
    const m = new Map<string, JobResponse>();
    for (const j of jobs ?? []) m.set(j.id, j);
    return m;
  }, [jobs]);

  // Inspector KPI hesapları — tek geçişte status sayımı + this-week + ortalama
  // süre. Liste değişmedikçe yeniden hesaplanmaz.
  const stats = useMemo(() => {
    const counts: Record<StatusGroup, number> = {
      draft: 0,
      in_progress: 0,
      completed: 0,
      published: 0,
      failed: 0,
    };
    let weekCount = 0;
    let durSum = 0;
    let durCount = 0;
    for (const v of list) {
      counts[groupStatus(v.status)] += 1;
      if (isThisWeek(v.created_at)) weekCount += 1;
      if (v.target_duration_seconds && v.target_duration_seconds > 0) {
        durSum += v.target_duration_seconds;
        durCount += 1;
      }
    }
    const avgDur = durCount > 0 ? Math.round(durSum / durCount) : 0;
    return { counts, weekCount, avgDur };
  }, [list]);

  const inspector = (
    <AuroraInspector title="Standart Videolar">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam" value={String(list.length)} />
        <AuroraInspectorRow label="bu hafta" value={String(stats.weekCount)} />
        <AuroraInspectorRow
          label="ort. süre"
          value={stats.avgDur > 0 ? fmtDuration(stats.avgDur) : "—"}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Durum dağılımı">
        <AuroraInspectorRow label="taslak" value={String(stats.counts.draft)} />
        <AuroraInspectorRow label="üretimde" value={String(stats.counts.in_progress)} />
        <AuroraInspectorRow label="tamamlandı" value={String(stats.counts.completed)} />
        <AuroraInspectorRow label="yayında" value={String(stats.counts.published)} />
        {stats.counts.failed > 0 && (
          <AuroraInspectorRow label="başarısız" value={String(stats.counts.failed)} />
        )}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Standart videolar</h1>
            <div className="sub">
              {list.length} video · standard_video modülü
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/standard-videos/new")}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni standard video
            </AuroraButton>
          </div>
        </div>

        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        )}

        {isError && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
          >
            Henüz standart video yok.{" "}
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/standard-videos/new")}
            >
              İlkini oluştur →
            </AuroraButton>
          </div>
        )}

        {!isLoading && !isError && list.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    {/* Tek seçim sütunu için header checkbox şu an aktif değil:
                        toplu aksiyonlar bu yüzeyde pilot dışı. Yapısı korunur. */}
                    <input type="checkbox" disabled aria-label="Tümü (devre dışı)" />
                  </th>
                  <th>ID</th>
                  <th>Başlık</th>
                  <th>Template</th>
                  <th>Style blueprint</th>
                  <th style={{ textAlign: "right" }}>Süre</th>
                  <th>Durum</th>
                  <th>Job durumu</th>
                  <th>Güncellendi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((v) => {
                  const group = groupStatus(v.status);
                  const tone = STATUS_TONE[group];
                  const templateName = v.template_id
                    ? templateById.get(v.template_id) ?? "—"
                    : "—";
                  const blueprintName = v.style_blueprint_id
                    ? blueprintById.get(v.style_blueprint_id) ?? "—"
                    : "—";
                  const job = v.job_id ? jobById.get(v.job_id) : undefined;
                  const pct = jobProgressPct(job);
                  return (
                    <tr
                      key={v.id}
                      onDoubleClick={() => navigate(`/admin/standard-videos/${v.id}`)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`${v.title ?? v.topic ?? v.id} seç`}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {shortId(v.id)}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/standard-videos/${v.id}`)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "inherit",
                            font: "inherit",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                          title={v.title ?? v.topic ?? ""}
                        >
                          {v.title || v.topic || "—"}
                        </button>
                      </td>
                      <td>
                        <span className="chip" style={{ fontSize: 10 }}>
                          {templateName}
                        </span>
                      </td>
                      <td>
                        <span className="chip" style={{ fontSize: 10 }}>
                          {blueprintName}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                        }}
                      >
                        {fmtDuration(v.target_duration_seconds)}
                      </td>
                      <td>
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
                          {statusLabelRaw(v.status)}
                        </span>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        {pct == null ? (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: "var(--text-muted)",
                            }}
                          >
                            —
                          </span>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 80 }}>
                              <AuroraProgressBar value={pct} done={pct >= 100} />
                            </div>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                color: "var(--text-muted)",
                                minWidth: 32,
                                textAlign: "right",
                              }}
                            >
                              %{pct}
                            </span>
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(v.updated_at)} önce
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
