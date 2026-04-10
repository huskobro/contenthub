/**
 * CanvasUserAnalyticsPage — Faz 3A.
 *
 * Canvas override for `user.analytics.overview`. Re-frames the user analytics
 * entry point as a workspace-style "Performance Studio" so it feels native
 * to the Canvas workspace rather than an isolated stats dashboard.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Hero: "Performans Studyom" + window selector                  │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ KPI ribbon (projelerim / islerim / yayin basari / ort. sure) │
 *   ├────────────────────────────────┬─────────────────────────────┤
 *   │ Uretim trendi (line chart)     │ Modul dagilimi (donut)      │
 *   └────────────────────────────────┴─────────────────────────────┘
 *
 * Data contract
 * -------------
 *   - Uses `fetchDashboardSummary({ window, user_id })` — identical to
 *     legacy UserAnalyticsPage. No new endpoints.
 *   - Reuses the shared `TrendChart` and `DistributionDonut` components so
 *     no chart library is forked per surface.
 *   - All numbers come from the backend; nothing is fabricated.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardSummary,
  type AnalyticsFilterParams,
  type AnalyticsWindow,
} from "../../api/analyticsApi";
import { useAuthStore } from "../../stores/authStore";
import { TrendChart } from "../../components/shared/charts/TrendChart";
import { DistributionDonut } from "../../components/shared/charts/DistributionDonut";
import { cn } from "../../lib/cn";

const WINDOW_OPTIONS: Array<{ value: AnalyticsWindow; label: string }> = [
  { value: "last_7d", label: "Son 7 Gün" },
  { value: "last_30d", label: "Son 30 Gün" },
  { value: "last_90d", label: "Son 90 Gün" },
  { value: "all_time", label: "Tüm Zamanlar" },
];

function fmtRate(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtCount(v: number | null | undefined): string {
  if (v == null) return "—";
  return String(v);
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}sn`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}dk`;
  return `${Math.floor(seconds / 3600)}sa`;
}

export function CanvasUserAnalyticsPage() {
  const [window, setWindow] = useState<AnalyticsWindow>("last_30d");
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const filters: AnalyticsFilterParams = {
    window,
    user_id: userId ?? undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["canvas-user-analytics", filters],
    queryFn: () => fetchDashboardSummary(filters),
    staleTime: 30_000,
    enabled: !!userId,
  });

  const trendData = useMemo(
    () =>
      (data?.daily_trend ?? []).map((d) => ({
        ...d,
        dateLabel: d.date.slice(5),
      })),
    [data?.daily_trend],
  );

  const moduleDonutData = useMemo(
    () =>
      (data?.module_distribution ?? []).map((m) => ({
        name:
          m.module_type === "standard_video"
            ? "Standart Video"
            : m.module_type === "news_bulletin"
            ? "Haber Bülteni"
            : m.module_type,
        value: m.total_jobs,
      })),
    [data?.module_distribution],
  );

  return (
    <div
      className="flex flex-col gap-5 max-w-[1280px]"
      data-testid="canvas-user-analytics"
    >
      {/* Hero ------------------------------------------------------------- */}
      <section
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
          "px-6 py-5 flex items-start gap-5",
        )}
        data-testid="canvas-analytics-hero"
      >
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Canvas Workspace &middot; Analiz
          </p>
          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">
            Performans Stüdyom
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-500">
            Kendi içerik üretim ve yayın performansın. Dönemi değiştirerek
            trendleri karşılaştırabilirsin.
          </p>
        </div>
        <div
          className="shrink-0 flex flex-wrap gap-1"
          data-testid="canvas-analytics-window-selector"
          role="group"
          aria-label="Analitik zaman aralığı"
        >
          {WINDOW_OPTIONS.map((opt) => {
            const active = opt.value === window;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWindow(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold",
                  "border transition-colors duration-fast",
                  active
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-surface-card border-border-subtle text-neutral-700 hover:border-brand-300",
                )}
                data-testid={`canvas-analytics-window-${opt.value}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {!userId ? (
        <div
          className="rounded-xl border border-warning-base/30 bg-warning-light/30 px-4 py-3 text-sm text-warning-dark"
          data-testid="canvas-analytics-no-user"
        >
          Kullanıcı bilgisi bulunamadı.
        </div>
      ) : null}

      {isError ? (
        <div
          className="rounded-xl border border-error-base/30 bg-error-light/30 px-4 py-3 text-sm text-error-dark"
          data-testid="canvas-analytics-error"
        >
          Veriler yüklenemedi.
        </div>
      ) : null}

      {/* KPI ribbon ------------------------------------------------------ */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        data-testid="canvas-analytics-kpis"
      >
        <KpiTile
          label="Projelerim"
          value={fmtCount(data?.total_projects)}
          note="Toplam proje"
          loading={isLoading}
          testId="canvas-analytics-kpi-projects"
        />
        <KpiTile
          label="İşlerim"
          value={fmtCount(data?.total_jobs)}
          note="Toplam iş"
          loading={isLoading}
          testId="canvas-analytics-kpi-jobs"
        />
        <KpiTile
          label="Yayın Başarı"
          value={fmtRate(data?.publish_success_rate)}
          note="Başarılı yayın"
          loading={isLoading}
          testId="canvas-analytics-kpi-publish"
          tone="success"
        />
        <KpiTile
          label="Ort. Üretim"
          value={fmtDuration(data?.avg_production_duration_seconds)}
          note="İş başı ortalama"
          loading={isLoading}
          testId="canvas-analytics-kpi-duration"
        />
      </div>

      {/* Charts --------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section
          className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
          data-testid="canvas-analytics-trend-card"
        >
          <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
            <p className="m-0 text-sm font-semibold text-neutral-800">
              Üretim Trendi
            </p>
            <p className="m-0 mt-0.5 text-xs text-neutral-500">
              Günlük iş sayısı
            </p>
          </header>
          <div className="p-4 min-h-[220px]">
            {isLoading ? (
              <p className="text-sm text-neutral-500 py-8 text-center">
                Yükleniyor...
              </p>
            ) : trendData.length > 0 ? (
              <TrendChart
                data={trendData}
                xKey="dateLabel"
                yKey="job_count"
                yLabel="İş Sayısı"
                height={200}
                showArea
                testId="canvas-analytics-trend-chart"
              />
            ) : (
              <p
                className="text-sm text-neutral-500 py-8 text-center"
                data-testid="canvas-analytics-trend-empty"
              >
                Seçilen dönemde veri yok.
              </p>
            )}
          </div>
        </section>

        <section
          className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
          data-testid="canvas-analytics-distribution-card"
        >
          <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
            <p className="m-0 text-sm font-semibold text-neutral-800">
              Modül Dağılımı
            </p>
            <p className="m-0 mt-0.5 text-xs text-neutral-500">
              Projelerinin modül çeşitliliği
            </p>
          </header>
          <div className="p-4 min-h-[220px]">
            {isLoading ? (
              <p className="text-sm text-neutral-500 py-8 text-center">
                Yükleniyor...
              </p>
            ) : moduleDonutData.length > 0 ? (
              <DistributionDonut data={moduleDonutData} height={200} />
            ) : (
              <p
                className="text-sm text-neutral-500 py-8 text-center"
                data-testid="canvas-analytics-distribution-empty"
              >
                Modül verisi yok.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function KpiTile({
  label,
  value,
  note,
  loading,
  testId,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  loading?: boolean;
  testId?: string;
  tone?: "success" | "neutral";
}) {
  const toneCls =
    tone === "success"
      ? "text-success-dark"
      : "text-neutral-900";
  return (
    <div
      className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2"
      data-testid={testId}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div
        className={cn("mt-0.5 text-lg font-semibold tabular-nums", toneCls)}
      >
        {loading ? "…" : value}
      </div>
      {note ? (
        <div className="text-[10px] text-neutral-400">{note}</div>
      ) : null}
    </div>
  );
}
