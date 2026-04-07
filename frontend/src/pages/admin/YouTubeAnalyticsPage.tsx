import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useYouTubeStatus,
  useYouTubeChannelInfo,
  useYouTubeVideoStats,
  useVideoStatsTrend,
} from "../../hooks/useCredentials";
import { PageShell } from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";
import { formatDateShort } from "../../lib/formatDate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("tr-TR");
}

function fmtNumFull(n: number): string {
  return n.toLocaleString("tr-TR");
}

function engagementRate(views: number, likes: number, comments: number): string {
  if (views === 0) return "—";
  return (((likes + comments) / views) * 100).toFixed(2) + "%";
}

function topVideoByViews(videos: { view_count: number; title: string; video_id: string }[]) {
  if (!videos.length) return null;
  return videos.reduce((a, b) => (a.view_count > b.view_count ? a : b));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  accent = false,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  icon?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-1 transition-shadow duration-normal",
        accent
          ? "bg-brand-50 border-brand-200"
          : "bg-surface-card border-border-subtle hover:shadow-md hover:border-border",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium uppercase tracking-wider">
        {icon && <span className="text-sm">{icon}</span>}
        {label}
      </div>
      <div className={cn("text-2xl font-bold", accent ? "text-brand-700" : "text-neutral-900")}>
        {value}
      </div>
      {sub && <div className="text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

function TrendSparkline({
  snapshots,
}: {
  snapshots: { view_count: number; snapshot_at: string }[];
}) {
  if (snapshots.length < 2) return null;
  const counts = snapshots.map((s) => s.view_count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const range = max - min || 1;
  const W = 80;
  const H = 28;
  const pts = counts
    .map((v, i) => {
      const x = (i / (counts.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const trend = counts[counts.length - 1] - counts[0];

  return (
    <div className="flex items-center gap-2">
      <svg width={W} height={H} className="overflow-visible">
        <polyline
          points={pts}
          fill="none"
          stroke={trend >= 0 ? "var(--ch-success, #2f9e44)" : "var(--ch-error, #e03131)"}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={cn(
          "text-xs font-semibold",
          trend >= 0 ? "text-success-text" : "text-error-text",
        )}
      >
        {trend >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(trend))}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not connected
// ---------------------------------------------------------------------------

function NotConnectedState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-5xl">📺</div>
      <p className="text-lg font-semibold text-neutral-700 m-0">YouTube hesabı bağlı değil</p>
      <p className="text-sm text-neutral-500 m-0 text-center max-w-sm">
        Analytics görüntülemek için önce{" "}
        <Link to="/admin/settings" className="text-brand-700 underline">
          Ayarlar → Kimlik Bilgileri
        </Link>{" "}
        sayfasından YouTube OAuth bağlantısını tamamlayın.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scope warning
// ---------------------------------------------------------------------------

function ScopeWarningState() {
  return (
    <div className="rounded-xl border border-warning bg-warning-light p-6 flex gap-4 items-start">
      <span className="text-2xl">⚠️</span>
      <div>
        <p className="m-0 font-semibold text-warning-text text-base">
          Token yetersiz izinlerle alınmış
        </p>
        <p className="m-0 text-sm text-neutral-600 mt-1">
          Kanal bilgileri ve video istatistikleri için güncel izinler gerekli.{" "}
          <Link to="/admin/settings" className="text-brand-700 underline">
            Ayarlar → Kimlik Bilgileri
          </Link>{" "}
          sayfasından bağlantıyı kesip yeniden bağlanın.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video row
// ---------------------------------------------------------------------------

function VideoRow({
  video,
  isSelected,
  onSelect,
}: {
  video: {
    video_id: string;
    title: string;
    published_at?: string | null;
    view_count: number;
    like_count: number;
    comment_count: number;
  };
  isSelected: boolean;
  onSelect: () => void;
}) {
  const eng = engagementRate(video.view_count, video.like_count, video.comment_count);

  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer transition-colors duration-fast",
        isSelected ? "bg-brand-50" : "hover:bg-neutral-50",
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <a
            href={`https://www.youtube.com/watch?v=${video.video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-brand-700 font-medium text-sm leading-snug hover:underline line-clamp-2"
          >
            {video.title || video.video_id}
          </a>
        </div>
        {video.published_at && (
          <div className="text-xs text-neutral-400 mt-0.5 pl-0">
            {formatDateShort(video.published_at)}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-neutral-700 font-medium">
        {fmtNum(video.view_count)}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-neutral-600">
        {fmtNum(video.like_count)}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-neutral-600">
        {fmtNum(video.comment_count)}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-neutral-500">
        {eng}
      </td>
      <td className="px-4 py-3 text-center">
        {isSelected ? (
          <span className="text-xs text-brand-600 font-medium">▼ trend</span>
        ) : (
          <span className="text-xs text-neutral-300">trend</span>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Trend panel
// ---------------------------------------------------------------------------

function TrendPanel({ videoId }: { videoId: string }) {
  const { data, isLoading } = useVideoStatsTrend(videoId);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-3 text-sm text-neutral-400">
          Trend verisi yükleniyor...
        </td>
      </tr>
    );
  }

  if (!data || data.snapshots.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-3 text-sm text-neutral-400 italic">
          Henüz snapshot verisi yok — her sorgulamada otomatik kaydedilir.
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td
        colSpan={6}
        className="px-4 py-3 bg-brand-50 border-t border-brand-100"
      >
        <div className="text-xs font-semibold text-brand-700 mb-2 uppercase tracking-wider">
          Zaman Serisi — {data.title}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-500">
                <th className="text-left py-1 pr-4 font-medium">Tarih</th>
                <th className="text-right py-1 pr-4 font-medium">Görüntülenme</th>
                <th className="text-right py-1 pr-4 font-medium">Beğeni</th>
                <th className="text-right py-1 font-medium">Yorum</th>
              </tr>
            </thead>
            <tbody>
              {data.snapshots.map((s, i) => (
                <tr key={i} className="border-t border-brand-100/60">
                  <td className="py-1 pr-4 text-neutral-600">
                    {formatDateShort(s.snapshot_at, "—")}
                  </td>
                  <td className="py-1 pr-4 text-right tabular-nums text-neutral-700 font-medium">
                    {fmtNumFull(s.view_count)}
                  </td>
                  <td className="py-1 pr-4 text-right tabular-nums text-neutral-600">
                    {fmtNumFull(s.like_count)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-neutral-600">
                    {fmtNumFull(s.comment_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <TrendSparkline snapshots={data.snapshots} />
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function YouTubeAnalyticsPage() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const { data: ytStatus, isLoading: statusLoading } = useYouTubeStatus();
  const { data: channelInfo, isLoading: channelLoading } = useYouTubeChannelInfo();
  const {
    data: videoStats,
    isLoading: statsLoading,
    error: statsError,
  } = useYouTubeVideoStats();

  const isLoading = statusLoading || channelLoading;
  const isConnected = ytStatus?.has_credentials === true;
  const scopeOk = ytStatus?.scope_ok !== false;

  // Derived stats
  const top = videoStats ? topVideoByViews(videoStats.videos) : null;
  const avgViews =
    videoStats && videoStats.video_count > 0
      ? Math.round(videoStats.total_views / videoStats.video_count)
      : 0;

  return (
    <PageShell
      title="YouTube Analytics"
      subtitle="Kanal performansı ve ContentHub yayınlarının istatistikleri"
    >
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-neutral-500 py-8">
          <span className="animate-spin text-base">⏳</span> Yükleniyor...
        </div>
      )}

      {/* Not connected */}
      {!isLoading && !isConnected && <NotConnectedState />}

      {/* Scope warning */}
      {!isLoading && isConnected && !scopeOk && <ScopeWarningState />}

      {/* Connected + scope OK */}
      {!isLoading && isConnected && scopeOk && (
        <div className="space-y-5">

          {/* ---- Channel header ---- */}
          <div className="rounded-xl border border-border-subtle bg-surface-card p-5 flex items-center gap-4">
            {channelInfo?.thumbnail_url && (
              <img
                src={channelInfo.thumbnail_url}
                alt={channelInfo.channel_title ?? "Kanal"}
                className="w-14 h-14 rounded-full border-2 border-border-subtle shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold text-neutral-900 truncate">
                {channelLoading
                  ? "Yükleniyor..."
                  : channelInfo?.channel_title ?? "Kanal bilgisi alınamadı"}
              </div>
              {channelInfo?.channel_id && (
                <div className="text-xs text-neutral-400 font-mono mt-0.5">
                  {channelInfo.channel_id}
                </div>
              )}
              {channelInfo?.message && !channelInfo.connected && (
                <div className="text-xs text-error-text mt-1">{channelInfo.message}</div>
              )}
            </div>
            <div className="flex gap-6 shrink-0">
              {channelInfo?.subscriber_count && (
                <div className="text-center">
                  <div className="text-xl font-bold text-neutral-900">
                    {fmtNum(Number(channelInfo.subscriber_count))}
                  </div>
                  <div className="text-xs text-neutral-500">Abone</div>
                </div>
              )}
              {channelInfo?.video_count && (
                <div className="text-center">
                  <div className="text-xl font-bold text-neutral-900">
                    {fmtNum(Number(channelInfo.video_count))}
                  </div>
                  <div className="text-xs text-neutral-500">Video</div>
                </div>
              )}
            </div>
          </div>

          {/* ---- Summary stats ---- */}
          {statsLoading && (
            <div className="text-sm text-neutral-400 py-2">İstatistikler yükleniyor...</div>
          )}

          {statsError && (
            <div className="rounded-xl border border-error bg-error-light p-4 text-sm text-error-text flex gap-2 items-start">
              <span>⚠️</span>
              <span>
                {statsError instanceof Error ? statsError.message : "Bilinmeyen API hatası"}
              </span>
            </div>
          )}

          {!statsLoading && !statsError && videoStats && videoStats.video_count > 0 && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  icon="👁"
                  label="Toplam Görüntülenme"
                  value={fmtNum(videoStats.total_views)}
                  sub={fmtNumFull(videoStats.total_views) + " toplam"}
                  accent
                />
                <StatCard
                  icon="👍"
                  label="Toplam Beğeni"
                  value={fmtNum(videoStats.total_likes)}
                  sub={engagementRate(videoStats.total_views, videoStats.total_likes, videoStats.total_comments) + " etkileşim"}
                />
                <StatCard
                  icon="💬"
                  label="Toplam Yorum"
                  value={fmtNum(videoStats.total_comments)}
                />
                <StatCard
                  icon="🎬"
                  label="Yayınlanan Video"
                  value={videoStats.video_count}
                  sub={avgViews > 0 ? `Ort. ${fmtNum(avgViews)} görüntülenme` : undefined}
                />
              </div>

              {/* Top video highlight */}
              {top && (
                <div className="rounded-xl border border-success-light bg-success-light p-4 flex items-center gap-4">
                  <span className="text-2xl shrink-0">🏆</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-success-text font-semibold uppercase tracking-wider mb-0.5">
                      En Çok İzlenen Video
                    </div>
                    <a
                      href={`https://www.youtube.com/watch?v=${top.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-neutral-900 hover:underline line-clamp-1"
                    >
                      {top.title || top.video_id}
                    </a>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-neutral-900">
                      {fmtNum(top.view_count)}
                    </div>
                    <div className="text-xs text-neutral-500">görüntülenme</div>
                  </div>
                </div>
              )}

              {/* Videos table */}
              <div className="rounded-xl border border-border-subtle bg-surface-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-800">
                    ContentHub Yayınları
                  </span>
                  <span className="text-xs text-neutral-400">
                    {videoStats.video_count} video · Trend için satıra tıkla
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle bg-neutral-50/60">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          Video
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          Görüntülenme
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          Beğeni
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          Yorum
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          Etkileşim
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider w-16">
                          Trend
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {videoStats.videos.map((v) => (
                        <>
                          <VideoRow
                            key={v.video_id}
                            video={v}
                            isSelected={selectedVideoId === v.video_id}
                            onSelect={() =>
                              setSelectedVideoId(
                                selectedVideoId === v.video_id ? null : v.video_id,
                              )
                            }
                          />
                          {selectedVideoId === v.video_id && (
                            <TrendPanel key={`trend-${v.video_id}`} videoId={v.video_id} />
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* No videos yet */}
          {!statsLoading && !statsError && videoStats && videoStats.video_count === 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-card p-10 text-center">
              <div className="text-3xl mb-3">📭</div>
              <p className="text-sm font-medium text-neutral-700 m-0">
                Henüz YouTube'a yayınlanmış video yok
              </p>
              <p className="text-xs text-neutral-400 m-0 mt-1">
                ContentHub üzerinden bir video yayınlandığında burada görünecek.
              </p>
            </div>
          )}

          {/* Scope info note */}
          <div className="rounded-xl border border-border-subtle bg-neutral-50 px-4 py-3 text-xs text-neutral-500 leading-relaxed">
            <span className="font-medium text-neutral-600">ℹ️ Not:</span>{" "}
            Zaman serisi verileri ContentHub'ın yerel snapshot'larından oluşturulur. Demografik
            veriler, izlenme süresi ve elde tutma oranı için YouTube Analytics API ek OAuth scope
            gerektirir — bu kapsam şu an aktif değil.
          </div>
        </div>
      )}
    </PageShell>
  );
}
