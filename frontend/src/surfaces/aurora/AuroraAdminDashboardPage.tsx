/**
 * AuroraAdminDashboardPage — Aurora Dusk Cockpit / admin root.
 *
 * Direct port of `ContentHub_Design _System/contenthub/pages/admin/dashboard.html`:
 *   - Hero card (3-stat KPI snapshot + actions)
 *   - System health grid (DB / SSE / TTS / Render)
 *   - Performance KPI strip (4 metric tiles + sparklines)
 *   - Active renders table (left col)
 *   - Module distribution donut + Activity feed (right col)
 *   - Quick actions strip (4 cards with kbd shortcut)
 *   - Inspector slot: alerts + active renders + workspace + shortcuts
 *
 * Veri kaynagi:
 *   - useDashboardSummary  → KPIs, daily_trend, module_distribution,
 *                             recent_errors, queue_size, avg_duration.
 *   - useJobsList(true)    → include_test_data:true ile aurora seed +
 *                             gercek jobs (active renders panel'i icin).
 *
 * Hicbir legacy code degistirilmez. Surface override sistemi tarafindan
 * `admin.dashboard` slot'u icin kayitli.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AnalyticsWindow } from "../../api/analyticsApi";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { useJobsList } from "../../hooks/useJobsList";
import { useSystemHealth } from "../../hooks/useSystemHealth";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import type { JobResponse } from "../../api/jobsApi";
import { Icon } from "./icons";
import {
  AuroraButton,
  AuroraSpark,
  AuroraDonut,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraProgressBar,
  AuroraStatusChip,
} from "./primitives";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("tr-TR");
}

function fmtPct(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

function fmtDurationMMSS(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then) / 1000;
  if (diff < 60) return "şimdi";
  if (diff < 3600) return `${Math.round(diff / 60)}d`;
  if (diff < 86400) return `${Math.round(diff / 3600)}s`;
  return `${Math.round(diff / 86400)}g`;
}

/**
 * Modül renkleri tokens.css'te `--module-*` olarak tanımlı. Yeni Aurora teması
 * eklendiğinde sadece o tokenlar override edilir, bu fonksiyon değişmez.
 */
function moduleColor(module: string): string {
  switch (module) {
    case "news_bulletin":
      return "var(--module-news-bulletin)";
    case "product_review":
      return "var(--module-product-review)";
    case "standard_video":
      return "var(--module-standard-video)";
    case "educational_video":
      return "var(--module-educational)";
    case "howto_video":
      return "var(--module-howto)";
    default:
      return "var(--module-default)";
  }
}

function moduleThumbClass(module: string): string {
  switch (module) {
    case "news_bulletin":
      return "t-news";
    case "product_review":
      return "t-review";
    case "standard_video":
      return "t-doc";
    default:
      return "";
  }
}

function jobLabel(job: JobResponse): string {
  // Aurora seed jobs carry `id_label` in input_data_json
  if (job.source_context_json) {
    try {
      const data = JSON.parse(job.source_context_json);
      if (typeof data.title === "string") return data.title;
    } catch {
      // ignore
    }
  }
  return job.id.split("-").slice(0, 3).join("-").toUpperCase();
}

function jobDisplayTitle(job: JobResponse): string {
  // Aurora seed marker uses input_data_json.display_title; fallback to id
  // We don't have direct access to input_data_json on the response; use
  // module_type + short id as a fallback.
  return `${job.module_type.replace(/_/g, " ")} · ${job.id.slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const WINDOW_OPTIONS: Array<{ value: AnalyticsWindow; label: string; tone: string }> = [
  { value: "last_7d", label: "7g", tone: "son 7 gün" },
  { value: "last_30d", label: "30g", tone: "son 30 gün" },
  { value: "last_90d", label: "3a", tone: "son 90 gün" },
];

export function AuroraAdminDashboardPage() {
  const navigate = useNavigate();
  const [windowFilter, setWindowFilter] = useState<AnalyticsWindow>("last_7d");
  const { data: summary, isLoading } = useDashboardSummary({ window: windowFilter });
  const { data: jobs = [] } = useJobsList(true);
  const { data: health } = useSystemHealth();
  const authUser = useAuthStore((s) => s.user);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);

  // ---------------- Active renders ----------------
  // Running first (sorted by ETA asc), then queued, then most recent finished.
  const activeRenders = useMemo(() => {
    const running = jobs
      .filter((j) => j.status === "running")
      .sort(
        (a, b) =>
          (a.estimated_remaining_seconds ?? a.eta_seconds ?? 1e9) -
          (b.estimated_remaining_seconds ?? b.eta_seconds ?? 1e9),
      );
    const queued = jobs.filter((j) => j.status === "queued");
    const recentlyDone = jobs
      .filter((j) => j.status === "completed" || j.status === "failed")
      .sort(
        (a, b) =>
          new Date(b.finished_at ?? b.updated_at).getTime() -
          new Date(a.finished_at ?? a.updated_at).getTime(),
      );
    return [...running, ...queued, ...recentlyDone].slice(0, 4);
  }, [jobs]);

  // Faz 4.1 — single source of truth for queued/running/failed counts.
  // Statusbar (footer) already uses live jobs list; dashboard cards and
  // "İşler" hh-tile previously used summary.active_jobs (aggregate, may lag).
  // Now both draw from the same live jobs snapshot so "0 aktif iş" vs
  // "4 aktif render" paradox cannot occur.
  const liveJobCounts = useMemo(() => {
    let queued = 0;
    let running = 0;
    let failed = 0;
    for (const j of jobs) {
      const s = j.status;
      if (s === "queued" || s === "pending" || s === "waiting_review") queued += 1;
      else if (s === "running" || s === "scheduled" || s === "waiting") running += 1;
      else if (s === "failed" || s === "error") failed += 1;
    }
    return { queued, running, failed };
  }, [jobs]);

  // ---------------- KPI strip ----------------
  const kpis = useMemo(() => {
    const dailyVals = (summary?.daily_trend ?? []).slice(-12).map((d) => d.publish_count);
    const safe = dailyVals.length >= 2 ? dailyVals : [0, 0, 0, 0, 0, 0, 0];
    const queueVals = (summary?.daily_trend ?? []).slice(-12).map((d) => d.job_count);
    const queueSafe = queueVals.length >= 2 ? queueVals : [0, 0, 0, 0, 0, 0, 0];
    const avgSec = summary?.avg_production_duration_seconds ?? 0;
    return [
      {
        k: "Bu hafta yayınlanan",
        v: fmtCount(summary?.total_publish),
        d:
          summary?.publish_success_rate != null
            ? `success ${fmtPct(summary.publish_success_rate, 1)}`
            : "—",
        trend: "pos" as const,
        spark: safe,
      },
      {
        // Faz 4.1 — live jobs snapshot (aynı veri statusbar ile)
        k: "Kuyruk",
        v: fmtCount(liveJobCounts.queued),
        d: `${fmtCount(liveJobCounts.running)} aktif`,
        trend: liveJobCounts.queued > 5 ? ("warn" as const) : ("mute" as const),
        spark: queueSafe,
      },
      {
        k: "Ortalama render",
        v: fmtDurationMMSS(avgSec),
        d:
          summary?.retry_rate != null
            ? `retry ${fmtPct(summary.retry_rate, 1)}`
            : "—",
        trend: avgSec > 300 ? ("warn" as const) : ("pos" as const),
        spark: queueSafe,
      },
      {
        k: "Başarı oranı",
        v: fmtPct(summary?.publish_success_rate, 1),
        // Faz 4.1 — failed count live jobs'dan; summary.failed_job_count
        // analitik pencere filtreli olduğu için footer ile uyumsuz kalıyordu.
        d: `${liveJobCounts.failed} hata`,
        trend: (summary?.publish_success_rate ?? 0) >= 0.95 ? ("pos" as const) : ("warn" as const),
        spark: safe,
      },
    ];
  }, [summary, liveJobCounts]);

  const heroStats = kpis.slice(0, 3);

  // ---------------- Module distribution ----------------
  const modules = useMemo(() => {
    const dist = summary?.module_distribution ?? [];
    return dist.map((m) => ({
      n: m.module_type,
      v: m.total_jobs,
      color: moduleColor(m.module_type),
    }));
  }, [summary]);
  const modTotal = modules.reduce((s, m) => s + m.v, 0);

  // ---------------- Activity (recent errors + completed) ----------------
  const activity = useMemo(() => {
    const items: Array<{
      kind: "pub" | "app" | "rej" | "drf" | "set";
      msg: React.ReactNode;
      t: string;
      jobId?: string;
    }> = [];
    (summary?.recent_errors ?? []).slice(0, 3).forEach((e) => {
      items.push({
        kind: "rej",
        msg: (
          <>
            Hata: <span className="id">{e.job_id.slice(0, 12)}</span> ({e.module_type})
          </>
        ),
        t: fmtRelative(e.created_at),
        jobId: e.job_id,
      });
    });
    jobs
      .filter((j) => j.status === "completed")
      .slice(0, 4)
      .forEach((j) => {
        items.push({
          kind: "pub",
          msg: (
            <>
              Tamamlandı: <span className="id">{j.id.slice(0, 12)}</span>
            </>
          ),
          t: fmtRelative(j.finished_at ?? j.updated_at),
          jobId: j.id,
        });
      });
    return items.slice(0, 6);
  }, [summary, jobs]);

  // ---------------- Inspector slot ----------------
  const queueWaitMessage =
    (summary?.queue_size ?? 0) > 0
      ? `Kuyrukta ${summary?.queue_size} iş var. Aktif ${summary?.active_jobs ?? 0}.`
      : `Tüm kuyruklar boş. Sistem boşta.`;

  const inspector = (
    <AuroraInspector title="Ayrıntılar">
      <AuroraInspectorSection title="Bu anki durum">
        <div className="i-alert">
          <div className="d">!</div>
          <div className="msg">{queueWaitMessage}</div>
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Aktif renderlar">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeRenders
            .filter((r) => r.status === "running")
            .slice(0, 4)
            .map((r) => {
              const eta = r.estimated_remaining_seconds ?? r.eta_seconds ?? 0;
              const total = (r.elapsed_seconds ?? 0) + eta;
              const pct = total > 0 ? Math.round(((r.elapsed_seconds ?? 0) / total) * 100) : 0;
              return (
                <div
                  key={r.id}
                  style={{
                    padding: "8px 10px",
                    background: "var(--bg-inset)",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                      }}
                    >
                      {r.id.slice(0, 16)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {fmtDurationMMSS(eta)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-primary)",
                      marginBottom: 5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {jobDisplayTitle(r)}
                  </div>
                  <AuroraProgressBar value={pct} />
                </div>
              );
            })}
          {activeRenders.filter((r) => r.status === "running").length === 0 && (
            <span className="caption">Şu an aktif render yok.</span>
          )}
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Workspace">
        <div>
          <AuroraInspectorRow
            label="kullanıcı"
            value={authUser?.display_name ?? authUser?.email ?? "—"}
          />
          <AuroraInspectorRow label="rol" value={authUser?.role ?? "—"} />
          <AuroraInspectorRow label="tema" value={activeThemeId} />
          <AuroraInspectorRow
            label="backend"
            value={health?.app ?? "—"}
          />
          <AuroraInspectorRow
            label="db"
            value={
              health?.db_connected
                ? health.db_wal_mode
                  ? "WAL"
                  : "journal"
                : "kopuk"
            }
          />
          <AuroraInspectorRow
            label="durum"
            value={
              <span
                style={{
                  color:
                    health?.status === "ok"
                      ? "var(--state-success-fg)"
                      : "var(--state-warning-fg)",
                }}
              >
                ● {health?.status ?? "—"}
              </span>
            }
          />
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Kısayollar">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            ["⌘K", "Komut paleti"],
            ["N", "Yeni içerik sihirbazı"],
            ["G → J", "İş kayıtlarına git"],
            ["?", "Tüm kısayollar"],
          ].map(([k, l]) => (
            <div
              key={k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              <span className="kbd">{k}</span>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  // ---------------- Page body ----------------
  return (
    <div className="aurora-dashboard">
      {/* Inspector mounted in body — surface chrome already provides space */}
      <div className="page">
        {/* Hero — snapshot + health */}
        <div className="hero">
          <div className="hero-card">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div>
                <h1 className="hero-title">Gösterge paneli</h1>
                <p className="hero-sub">
                  Haftalık üretim, yayın durumu ve sistem sağlığı · snapshot-locked
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <AuroraButton
                  variant="secondary"
                  size="sm"
                  iconLeft={<Icon name="eye" size={12} />}
                  onClick={() => navigate("/admin/jobs")}
                >
                  Render izle
                </AuroraButton>
                <AuroraButton
                  variant="primary"
                  size="sm"
                  iconLeft={<Icon name="plus" size={12} />}
                  onClick={() => navigate("/admin/wizard?module=news_bulletin")}
                >
                  Yeni içerik
                </AuroraButton>
              </div>
            </div>
            <div className="hero-stats">
              {heroStats.map((k, i) => (
                <div key={i} className="hs">
                  <div className="k">{k.k}</div>
                  <div className="v">{isLoading ? "—" : k.v}</div>
                  <div className={`d ${k.trend}`}>{k.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="health">
            <div className="health-head">
              <div className="t">Sistem sağlığı</div>
              <div className="sub">
                {health
                  ? health.status === "ok"
                    ? "tüm servisler"
                    : `durum: ${health.status}`
                  : "ölçülüyor…"}
              </div>
            </div>
            <div className="health-grid">
              <div
                className={`hh ${health?.db_connected ? "ok" : "warn"}`}
                role="note"
                aria-label={
                  health?.db_connected ? "Veritabanı bağlı" : "Veritabanı kopuk"
                }
              >
                <div className="hk">
                  <span className="d"></span>
                  <span>DB</span>
                </div>
                <div className="hv">
                  {health
                    ? health.db_connected
                      ? "Bağlı"
                      : "Kopuk"
                    : "—"}
                </div>
                <div className="hm">
                  sqlite · {health?.db_wal_mode ? "WAL" : "journal"}
                </div>
              </div>
              <button
                type="button"
                // Faz 4.1 — live jobs snapshot (statusbar ile aynı kaynak)
                className={`hh ${liveJobCounts.running > 0 ? "warn" : "ok"} hh-click`}
                onClick={() => navigate("/admin/jobs?status=running")}
                aria-label={`${liveJobCounts.running} aktif iş, çalışan iş listesine git`}
              >
                <div className="hk">
                  <span className="d"></span>
                  <span>İşler</span>
                </div>
                <div className="hv">{fmtCount(liveJobCounts.running)} aktif</div>
                <div className="hm">{fmtCount(liveJobCounts.queued)} kuyrukta</div>
              </button>
              <div
                className="hh ok"
                role="note"
                aria-label="Python ortamı"
              >
                <div className="hk">
                  <span className="d"></span>
                  <span>Python</span>
                </div>
                <div className="hv">
                  {health?.python_version ? `v${health.python_version}` : "—"}
                </div>
                <div className="hm">
                  {health?.venv_active ? "venv aktif" : "venv yok"}
                </div>
              </div>
              <button
                type="button"
                // Faz 4.1 — live snapshot. Önceden summary.failed_job_count
                // (7-gün penceresi) kullanılıyordu, footer "Hata 9" ise canlı
                // listeden geliyordu; rakamlar çakışıyordu.
                className={`hh ${liveJobCounts.failed > 0 ? "warn" : "ok"} hh-click`}
                onClick={() => navigate("/admin/jobs?status=failed")}
                aria-label={`${liveJobCounts.failed} başarısız iş, hata listesine git`}
              >
                <div className="hk">
                  <span className="d"></span>
                  <span>Hatalar</span>
                </div>
                <div className="hv">{fmtCount(liveJobCounts.failed)}</div>
                <div className="hm">canlı</div>
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>
                {health?.app ? (
                  <>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{health.app}</span>
                    {" · "}
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      durum: {health.status}
                    </span>
                  </>
                ) : (
                  "ContentHub backend"
                )}
              </div>
              <AuroraButton
                variant="ghost"
                size="sm"
                iconLeft={<Icon name="activity" size={11} />}
                onClick={() => navigate("/admin/analytics")}
              >
                Detay
              </AuroraButton>
            </div>
          </div>
        </div>

        {/* KPI strip with sparklines */}
        <div className="section">
          <div className="section-head">
            <div className="title">Performans</div>
            <div className="hstack" style={{ gap: 8 }}>
              <div className="tog" data-testid="aurora-dashboard-window-toggle">
                {WINDOW_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={windowFilter === opt.value ? "on" : ""}
                    onClick={() => setWindowFilter(opt.value)}
                    data-testid={`aurora-dashboard-window-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="meta">
                {WINDOW_OPTIONS.find((o) => o.value === windowFilter)?.tone ?? ""}
              </span>
            </div>
          </div>
          <div className="grid g-4">
            {kpis.map((k, i) => (
              <div key={i} className="metric">
                <div className="accent" />
                <div className="lbl">{k.k}</div>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <span className="val">{k.v}</span>
                  <span className={`delta ${k.trend}`}>{k.d}</span>
                </div>
                <div className="spark-wrap">
                  <AuroraSpark
                    data={k.spark}
                    color={
                      k.trend === "warn"
                        ? "var(--state-warning-fg)"
                        : k.trend === "mute"
                        ? "var(--text-muted)"
                        : "var(--accent-primary)"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content grid */}
        <div className="dash-grid">
          {/* Active renders */}
          <div className="card renders">
            <div className="renders-head">
              <div>
                <div className="title">Aktif renderlar</div>
                <div className="meta">
                  {activeRenders.length} job · gerçek zamanlı
                </div>
              </div>
              <a className="btn ghost sm" href="/admin/jobs">
                Tümü <Icon name="arrow-right" size={11} />
              </a>
            </div>
            {activeRenders.length === 0 && (
              <div style={{ padding: "24px 18px" }}>
                <span className="caption">Şu an render yok.</span>
              </div>
            )}
            {activeRenders.map((r) => {
              const eta = r.estimated_remaining_seconds ?? r.eta_seconds ?? 0;
              const elapsed = r.elapsed_seconds ?? r.elapsed_total_seconds ?? 0;
              const total = elapsed + eta;
              const pct =
                r.status === "completed"
                  ? 100
                  : total > 0
                  ? Math.min(99, Math.round((elapsed / total) * 100))
                  : 0;
              const done = r.status === "completed";
              const failed = r.status === "failed";
              return (
                <div
                  key={r.id}
                  className="render-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/jobs/${r.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/admin/jobs/${r.id}`);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                  data-testid={`aurora-dashboard-render-${r.id.slice(0, 8)}`}
                >
                  <div className={`rr-thumb ${moduleThumbClass(r.module_type)}`}>
                    <span className="dur">{fmtDurationMMSS(elapsed)}</span>
                  </div>
                  <div className="rr-main">
                    <div className="title">{jobDisplayTitle(r)}</div>
                    <div className="meta">
                      <span>{r.id.slice(0, 16)}</span>
                      <span style={{ color: "var(--border-strong)" }}>·</span>
                      <span className="mod">{r.module_type}</span>
                    </div>
                  </div>
                  <div className="rr-step">
                    {done ? (
                      <AuroraStatusChip tone="success" pulse>
                        published
                      </AuroraStatusChip>
                    ) : failed ? (
                      <AuroraStatusChip tone="danger">failed</AuroraStatusChip>
                    ) : (
                      <span>
                        step:{" "}
                        <span className="cur">
                          {r.current_step_key ?? r.status}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="rr-progress">
                    <AuroraProgressBar value={pct} done={done} />
                    <span className="pct">{pct}%</span>
                  </div>
                  <div className="rr-eta">
                    {done ? (
                      <span style={{ color: "var(--state-success-fg)", fontSize: 11 }}>
                        ● tamam
                      </span>
                    ) : failed ? (
                      <span style={{ color: "var(--state-danger-fg)", fontSize: 11 }}>
                        ● hata
                      </span>
                    ) : (
                      <>
                        eta <span className="v">{fmtDurationMMSS(eta)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right column: donut + activity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card donut-card">
              <div className="t">Modül dağılımı</div>
              <div className="s">son 7 gün</div>
              <div className="donut-wrap">
                <AuroraDonut
                  segments={modules.map((m) => ({ color: m.color, value: m.v }))}
                  total={modTotal || 1}
                  centerValue={modTotal}
                  centerLabel="toplam"
                />
                <div className="legend">
                  {modules.map((m) => (
                    <div key={m.n} className="row">
                      <span className="sw" style={{ background: m.color }} />
                      <span className="n">{m.n}</span>
                      <span className="v">{m.v}</span>
                    </div>
                  ))}
                  {modules.length === 0 && (
                    <span className="caption">Veri yok.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="card activity">
              <div className="head">
                <div className="t">Son etkinlik</div>
                <div className="s">audit log</div>
              </div>
              {activity.map((a, i) =>
                a.jobId ? (
                  <button
                    key={i}
                    type="button"
                    className={`act-item ${a.kind}`}
                    onClick={() => navigate(`/admin/jobs/${a.jobId}`)}
                    style={{
                      background: "transparent",
                      border: "none",
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "inherit",
                      font: "inherit",
                    }}
                    data-testid={`aurora-dashboard-activity-${i}`}
                  >
                    <span className="d"></span>
                    <span className="msg">{a.msg}</span>
                    <span className="t">{a.t}</span>
                  </button>
                ) : (
                  <div key={i} className={`act-item ${a.kind}`}>
                    <span className="d"></span>
                    <span className="msg">{a.msg}</span>
                    <span className="t">{a.t}</span>
                  </div>
                ),
              )}
              {activity.length === 0 && (
                <span className="caption">Henüz etkinlik yok.</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="section">
          <div className="section-head">
            <div className="title">Hızlı eylem</div>
            <div className="meta">her eylemde kısayol</div>
          </div>
          <div className="qa-strip">
            <button className="qa" onClick={() => navigate("/admin/wizard?module=news_bulletin")}>
              <div className="ic">
                <Icon name="sparkles" size={16} />
              </div>
              <div className="bd">
                <div className="tt">Yeni içerik</div>
                <div className="st">sihirbaz · 3 adım</div>
              </div>
              <span className="kbd">N</span>
            </button>
            <button className="qa" onClick={() => navigate("/admin/publish")}>
              <div className="ic">
                <Icon name="send" size={16} />
              </div>
              <div className="bd">
                <div className="tt">Yayına gönder</div>
                <div className="st">
                  onay kuyruğu · {fmtCount(summary?.queue_size ?? 0)}
                </div>
              </div>
              <span className="kbd">P</span>
            </button>
            <button className="qa" onClick={() => navigate("/admin/jobs")}>
              <div className="ic">
                <Icon name="list" size={16} />
              </div>
              <div className="bd">
                <div className="tt">İş kayıtları</div>
                <div className="st">
                  {fmtCount(summary?.total_jobs ?? 0)} toplam ·{" "}
                  {fmtCount(summary?.active_jobs ?? 0)} aktif
                </div>
              </div>
              <span className="kbd">J</span>
            </button>
            <button className="qa" onClick={() => navigate("/admin/analytics")}>
              <div className="ic">
                <Icon name="bar-chart" size={16} />
              </div>
              <div className="bd">
                <div className="tt">Analitik</div>
                <div className="st">7g görüntülenme</div>
              </div>
              <span className="kbd">A</span>
            </button>
          </div>
        </div>
      </div>
      {/* Inspector slot — rendered as sibling of .page; CockpitShell wires it */}
      <div className="aurora-inspector-slot">{inspector}</div>
    </div>
  );
}
