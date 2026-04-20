/**
 * AuroraPublishAnalyticsPage — Aurora Dusk Cockpit / Yayın Analitiği (admin).
 *
 * Surface override key: `admin.publish.analytics`.
 * Legacy karşılığı `pages/admin/PublishAnalyticsPage.tsx`'tir; trampoline orada
 * `useSurfacePageOverride("admin.publish.analytics")` ile bu sayfaya devreder.
 *
 * Yapı:
 *   - AuroraPageShell (breadcrumb: Publish → Analytics)
 *   - Sol/üst: KPI strip (toplam yayın, başarı oranı, son 24s) + günlük yayın
 *     bar grafiği + son yayın listesi (durum ve platform kırılımı)
 *   - Sağ: AuroraInspector — kanal/platform dağılımı, en başarılı kanal,
 *     retry / başarısız oranı
 *
 * Veri: usePublishAnalytics + useAnalyticsFilters (gerçek backend agregeleri).
 * Hardcoded grafik/sayı yok — boş veri durumlarında "Veri yok" göstergeleri.
 *
 * register.tsx — bu PR'da DOKUNULMAZ.
 */

import { useMemo, useState } from "react";
import { useAnalyticsFilters } from "../../hooks/useAnalyticsFilters";
import { usePublishAnalytics } from "../../hooks/usePublishAnalytics";
import type { AnalyticsWindow } from "../../api/analyticsApi";
import {
  AuroraPageShell,
  AuroraCard,
  AuroraButton,
  AuroraStatusChip,
  AuroraMeterTile,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraSpark,
} from "./primitives";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function fmtRate(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtSeconds(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v < 60) return `${Math.round(v)}s`;
  if (v < 3600) {
    const m = Math.floor(v / 60);
    const s = Math.round(v % 60);
    return `${m}d ${s}s`;
  }
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  return `${h}sa ${m}d`;
}

function platformLabel(p: string): string {
  if (!p) return "—";
  if (p === "youtube") return "YouTube";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "7g" },
  { value: "last_30d", label: "30g" },
  { value: "last_90d", label: "3a" },
  { value: "all_time", label: "Tümü" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuroraPublishAnalyticsPage() {
  const filtersHook = useAnalyticsFilters("all_time");
  const { data, isLoading, isError, refetch, isFetching } = usePublishAnalytics(
    filtersHook.apiParams,
  );

  const [tab] = useState<"overview">("overview");
  void tab;

  // Daily trend for bar chart
  const dailyTrend = data?.daily_publish_trend ?? [];
  const dailyBars = useMemo(
    () =>
      dailyTrend.slice(-14).map((d) => ({
        date: d.date.slice(5), // MM-DD
        publish: d.publish_count ?? 0,
        success: d.publish_success_count ?? 0,
      })),
    [dailyTrend],
  );
  const dailyMax = dailyBars.length
    ? Math.max(1, ...dailyBars.map((b) => b.publish))
    : 1;

  const sparkSeries = useMemo(
    () =>
      dailyTrend.length >= 2
        ? dailyTrend.map((d) => d.publish_count ?? 0)
        : [0, 0],
    [dailyTrend],
  );

  // Last-24h (approximate) using the trailing daily trend bucket.
  const last24h = useMemo(() => {
    if (!dailyTrend.length) return null;
    const tail = dailyTrend[dailyTrend.length - 1];
    return tail?.publish_count ?? null;
  }, [dailyTrend]);

  // Platform breakdown
  const platforms = useMemo(
    () =>
      (data?.platform_breakdown ?? [])
        .slice()
        .sort((a, b) => b.published - a.published),
    [data],
  );
  const platformTotal = platforms.reduce((s, p) => s + p.count, 0) || 1;
  const topPlatform = platforms[0];

  // Status distribution for the right inspector
  const statusBreakdown = useMemo(() => {
    if (!data) return [] as Array<{ key: string; label: string; value: number; tone: "success" | "warning" | "danger" | "info" | "neutral" }>;
    return [
      { key: "published", label: "Yayınlandı", value: data.published_count, tone: "success" as const },
      { key: "failed", label: "Başarısız", value: data.failed_count, tone: "danger" as const },
      { key: "in_review", label: "İncelemede", value: data.in_review_count, tone: "warning" as const },
      { key: "scheduled", label: "Planlı", value: data.scheduled_count, tone: "info" as const },
      { key: "draft", label: "Taslak", value: data.draft_count, tone: "neutral" as const },
    ].filter((s) => s.value > 0);
  }, [data]);

  // Recent publishes — derive a small list from daily trend (no recent endpoint).
  const recentList = useMemo(
    () =>
      dailyTrend
        .slice(-7)
        .reverse()
        .map((d) => ({
          date: d.date,
          publish: d.publish_count ?? 0,
          success: d.publish_success_count ?? 0,
          fail: Math.max(0, (d.publish_count ?? 0) - (d.publish_success_count ?? 0)),
        })),
    [dailyTrend],
  );

  // Failure ratio (retry/fail health indicator).
  const failureRate = useMemo(() => {
    if (!data) return null;
    const tot = data.total_publish_count;
    if (!tot) return null;
    return data.failed_count / tot;
  }, [data]);

  const inspector = (
    <AuroraInspector title="Yayın paneli">
      <AuroraInspectorSection title="Bu pencere">
        <AuroraInspectorRow
          label="toplam yayın"
          value={fmtCount(data?.total_publish_count)}
        />
        <AuroraInspectorRow
          label="başarı oranı"
          value={fmtRate(data?.publish_success_rate)}
        />
        <AuroraInspectorRow
          label="ort. yayına kadar"
          value={fmtSeconds(data?.avg_time_to_publish_seconds)}
        />
        <AuroraInspectorRow
          label="başarısız oran"
          value={fmtRate(failureRate)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Kanal / Platform dağılımı">
        {platforms.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {isLoading ? "Yükleniyor…" : "Veri yok."}
          </div>
        ) : (
          platforms.slice(0, 5).map((p) => {
            const pct = Math.round((p.count / platformTotal) * 100);
            return (
              <div key={p.platform} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {platformLabel(p.platform)}
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {p.published}/{p.count} · {pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "var(--bg-inset)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: "var(--gradient-brand)",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="En başarılı kanal">
        {!topPlatform ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {isLoading ? "Yükleniyor…" : "Veri yok."}
          </div>
        ) : (
          <>
            <AuroraInspectorRow
              label="platform"
              value={platformLabel(topPlatform.platform)}
            />
            <AuroraInspectorRow
              label="yayınlanan"
              value={String(topPlatform.published)}
            />
            <AuroraInspectorRow
              label="başarısız"
              value={String(topPlatform.failed)}
            />
            <AuroraInspectorRow
              label="başarı"
              value={
                topPlatform.count > 0
                  ? `${Math.round((topPlatform.published / topPlatform.count) * 100)}%`
                  : "—"
              }
            />
          </>
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Sağlık">
        <AuroraInspectorRow
          label="başarısız iş"
          value={fmtCount(data?.failed_count)}
        />
        <AuroraInspectorRow
          label="başarısız oran"
          value={fmtRate(failureRate)}
        />
        <AuroraInspectorRow
          label="incelemede"
          value={fmtCount(data?.in_review_count)}
        />
        <AuroraInspectorRow
          label="planlı"
          value={fmtCount(data?.scheduled_count)}
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-publish-analytics">
      <AuroraPageShell
        title="Yayın analitiği"
        breadcrumbs={[
          { label: "Publish", href: "/admin/publish" },
          { label: "Analytics" },
        ]}
        description="Yayın hacmi, başarı oranı ve platform kırılımı."
        data-testid="aurora-publish-analytics"
        actions={
          <div className="hstack" style={{ gap: 8 }}>
            <div className="tog">
              {WINDOW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={filtersHook.filters.window === opt.value ? "on" : ""}
                  onClick={() => filtersHook.setWindow(opt.value)}
                  data-testid={`aurora-publish-analytics-window-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Yenileniyor…" : "Yenile"}
            </AuroraButton>
          </div>
        }
      >
        {isError && (
          <AuroraCard
            pad="default"
            data-testid="aurora-publish-analytics-error"
            style={{
              marginBottom: 14,
              borderColor: "var(--state-danger-border, var(--border-default))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  Yayın metrikleri yüklenemedi.
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--text-muted)" }}
                >
                  Bağlantıyı kontrol edip tekrar deneyin.
                </div>
              </div>
              <AuroraButton
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
              >
                Tekrar dene
              </AuroraButton>
            </div>
          </AuroraCard>
        )}

        {/* KPI strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 18,
          }}
          data-testid="aurora-publish-analytics-kpi"
        >
          <AuroraMeterTile
            label="Toplam yayın"
            value={fmtCount(data?.total_publish_count)}
            footer="Tüm yayın kayıtları"
            loading={isLoading}
            data-testid="aurora-pub-kpi-total"
            spark={
              sparkSeries.length >= 2 ? (
                <AuroraSpark data={sparkSeries.slice(-12)} height={28} />
              ) : null
            }
          />
          <AuroraMeterTile
            label="Başarı oranı"
            value={fmtRate(data?.publish_success_rate)}
            footer="Yayınlanan / toplam"
            tone="success"
            loading={isLoading}
            data-testid="aurora-pub-kpi-rate"
          />
          <AuroraMeterTile
            label="Son 24s"
            value={fmtCount(last24h)}
            footer="Son günkü yayın"
            loading={isLoading}
            data-testid="aurora-pub-kpi-24h"
          />
          <AuroraMeterTile
            label="Ort. süre"
            value={fmtSeconds(data?.avg_time_to_publish_seconds)}
            footer="İş → yayın süresi"
            loading={isLoading}
            data-testid="aurora-pub-kpi-duration"
          />
        </div>

        {/* Bar chart + status row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <AuroraCard
            pad="default"
            data-testid="aurora-publish-analytics-bar"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Günlük yayın hacmi
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  son {dailyBars.length || 0} gün · publish_count
                </div>
              </div>
              {dailyBars.length > 0 && (
                <AuroraStatusChip tone="info">
                  max {dailyMax}
                </AuroraStatusChip>
              )}
            </div>
            {dailyBars.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  padding: "32px 0",
                  textAlign: "center",
                }}
              >
                {isLoading ? "Yükleniyor…" : "Bu dönemde yayın yok."}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${dailyBars.length}, 1fr)`,
                  alignItems: "end",
                  gap: 6,
                  height: 180,
                  padding: "8px 0",
                }}
              >
                {dailyBars.map((b) => {
                  const h = Math.max(2, Math.round((b.publish / dailyMax) * 160));
                  const successH = b.publish
                    ? Math.round((b.success / b.publish) * h)
                    : 0;
                  return (
                    <div
                      key={b.date}
                      title={`${b.date} · ${b.publish} yayın · ${b.success} başarılı`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--text-muted)",
                        }}
                      >
                        {b.publish}
                      </div>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 28,
                          height: h,
                          borderRadius: 4,
                          background: "var(--bg-inset)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: successH,
                            background: "var(--gradient-brand)",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--text-muted)",
                        }}
                      >
                        {b.date}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AuroraCard>

          <AuroraCard
            pad="default"
            data-testid="aurora-publish-analytics-status"
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Durum dağılımı
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
                marginBottom: 14,
              }}
            >
              {data ? `${data.total_publish_count} kayıt` : "—"}
            </div>
            {statusBreakdown.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  padding: "12px 0",
                }}
              >
                {isLoading ? "Yükleniyor…" : "Veri yok."}
              </div>
            ) : (
              statusBreakdown.map((s) => {
                const tot = data?.total_publish_count || 1;
                const pct = Math.round((s.value / tot) * 100);
                return (
                  <div
                    key={s.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <AuroraStatusChip tone={s.tone}>{s.label}</AuroraStatusChip>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: "var(--bg-inset)",
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
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        minWidth: 56,
                        textAlign: "right",
                      }}
                    >
                      {s.value} · {pct}%
                    </div>
                  </div>
                );
              })
            )}
          </AuroraCard>
        </div>

        {/* Recent publishes list */}
        <AuroraCard
          pad="none"
          data-testid="aurora-publish-analytics-recent"
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              padding: "14px 18px 8px",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Son yayın günleri
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Trend kuyruğundan en son 7 gün
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 90px 90px 90px",
              gap: 10,
              padding: "10px 18px",
              background: "var(--bg-inset)",
              borderTop: "1px solid var(--border-default)",
              borderBottom: "1px solid var(--border-default)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <span>Tarih</span>
            <span style={{ textAlign: "right" }}>Yayın</span>
            <span style={{ textAlign: "right" }}>Başarılı</span>
            <span style={{ textAlign: "right" }}>Başarısız</span>
            <span style={{ textAlign: "right" }}>Başarı</span>
          </div>
          {recentList.length === 0 ? (
            <div
              style={{
                padding: 22,
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              {isLoading ? "Yükleniyor…" : "Bu dönemde yayın günü yok."}
            </div>
          ) : (
            recentList.map((row, i, arr) => {
              const success = row.publish > 0
                ? Math.round((row.success / row.publish) * 100)
                : 0;
              return (
                <div
                  key={row.date}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 90px 90px 90px 90px",
                    gap: 10,
                    padding: "11px 18px",
                    borderBottom:
                      i < arr.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    fontSize: 12,
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {row.date}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      textAlign: "right",
                    }}
                  >
                    {row.publish}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      textAlign: "right",
                      color: "var(--state-success-fg)",
                    }}
                  >
                    {row.success}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      textAlign: "right",
                      color:
                        row.fail > 0
                          ? "var(--state-danger-fg, var(--text-secondary))"
                          : "var(--text-muted)",
                    }}
                  >
                    {row.fail}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      textAlign: "right",
                      color:
                        success >= 80
                          ? "var(--state-success-fg)"
                          : "var(--text-muted)",
                    }}
                  >
                    {row.publish > 0 ? `${success}%` : "—"}
                  </span>
                </div>
              );
            })
          )}
        </AuroraCard>
      </AuroraPageShell>

      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
