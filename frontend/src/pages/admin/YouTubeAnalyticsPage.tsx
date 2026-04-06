import { useState } from "react";
import { useYouTubeStatus, useYouTubeChannelInfo, useYouTubeVideoStats, useVideoStatsTrend } from "../../hooks/useCredentials";
import { PageShell } from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

const CARD_CLASS = "border border-border rounded-lg p-5 mb-4 bg-surface-card";
const STAT_ROW_CLASS = "flex gap-4 flex-wrap mt-3";
const STAT_CARD_CLASS = "flex-[1_1_140px] border border-border rounded-md p-3 bg-neutral-50 text-center";
const STAT_VALUE_CLASS = "text-xl font-bold text-neutral-900";
const STAT_LABEL_CLASS = "text-xs text-neutral-500 mt-0.5";
const TABLE_CLASS = "w-full border-collapse text-base";
const TH_CLASS = "text-left py-2 px-3 border-b-2 border-border text-xs font-semibold text-neutral-600 uppercase tracking-wider";
const TD_CLASS = "py-2 px-3 border-b border-neutral-100 text-neutral-700";
const TD_NUM_CLASS = "py-2 px-3 border-b border-neutral-100 text-neutral-700 text-right tabular-nums";

function fmtNum(n: number): string {
  return n.toLocaleString("tr-TR");
}

export function YouTubeAnalyticsPage() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const { data: ytStatus, isLoading: statusLoading } = useYouTubeStatus();
  const { data: channelInfo, isLoading: channelLoading } = useYouTubeChannelInfo();
  const {
    data: videoStats,
    isLoading: statsLoading,
    error: statsError,
  } = useYouTubeVideoStats();
  const {
    data: trendData,
    isLoading: trendLoading,
  } = useVideoStatsTrend(selectedVideoId);

  const isLoading = statusLoading || channelLoading;
  const isConnected = ytStatus?.has_credentials === true;

  return (
    <PageShell
      title="YouTube Analytics"
      subtitle="Bagli YouTube kanalinin temel bilgileri ve yayin istatistikleri."
    >
      {isLoading && (
        <p className="text-neutral-600 text-base">Yükleniyor...</p>
      )}

      {/* Not connected state */}
      {!isLoading && !isConnected && (
        <div className={CARD_CLASS}>
          <div className="text-center py-8 px-4">
            <p className="text-md text-neutral-700 m-0 mb-2">
              YouTube hesabi bagli degil.
            </p>
            <p className="text-sm text-neutral-500 m-0 max-w-[400px] mx-auto">
              YouTube Analytics goruntulemek icin once{" "}
              <a
                href="/admin/settings"
                className="text-brand-800 underline"
              >
                Ayarlar &gt; Kimlik Bilgileri
              </a>{" "}
              sayfasindan YouTube OAuth baglantisinizi tamamlayin.
            </p>
          </div>
        </div>
      )}

      {/* Connected state */}
      {!isLoading && isConnected && (
        <>
          {/* Channel summary */}
          <div className={CARD_CLASS}>
            <div className="flex items-center gap-3">
              {channelInfo?.thumbnail_url && (
                <img
                  src={channelInfo.thumbnail_url}
                  alt={channelInfo.channel_title ?? "Kanal"}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <div className="text-[0.9375rem] font-semibold text-neutral-900">
                  {channelInfo?.channel_title ?? "Kanal bilgisi yukleniyor..."}
                </div>
                {channelInfo?.channel_id && (
                  <div className="text-xs text-neutral-500 font-mono">
                    {channelInfo.channel_id}
                  </div>
                )}
              </div>
            </div>

            <div className={STAT_ROW_CLASS}>
              <div className={STAT_CARD_CLASS}>
                <div className={STAT_VALUE_CLASS}>
                  {channelInfo?.subscriber_count
                    ? Number(channelInfo.subscriber_count).toLocaleString("tr-TR")
                    : "\u2014"}
                </div>
                <div className={STAT_LABEL_CLASS}>Abone</div>
              </div>
              <div className={STAT_CARD_CLASS}>
                <div className={STAT_VALUE_CLASS}>
                  {channelInfo?.video_count
                    ? Number(channelInfo.video_count).toLocaleString("tr-TR")
                    : "\u2014"}
                </div>
                <div className={STAT_LABEL_CLASS}>Video</div>
              </div>
            </div>
          </div>

          {/* Video Stats Summary */}
          <div className={CARD_CLASS}>
            <div className="text-base font-semibold text-neutral-700 mb-2">
              ContentHub Yayinlari — Istatistikler
            </div>

            {statsLoading && (
              <p className="text-sm text-neutral-600">Video istatistikleri yukleniyor...</p>
            )}

            {statsError && (
              <div className="py-2 px-3 bg-error-light rounded-sm border border-error text-sm text-error-text">
                YouTube API hatasi: {statsError instanceof Error ? statsError.message : "Bilinmeyen hata"}
              </div>
            )}

            {!statsLoading && !statsError && videoStats && videoStats.video_count === 0 && (
              <p className="text-sm text-neutral-500 m-0">
                Henüz YouTube'a yayinlanmis video bulunmuyor.
              </p>
            )}

            {!statsLoading && !statsError && videoStats && videoStats.video_count > 0 && (
              <>
                {/* Summary cards */}
                <div className={STAT_ROW_CLASS}>
                  <div className={STAT_CARD_CLASS}>
                    <div className={STAT_VALUE_CLASS}>{fmtNum(videoStats.total_views)}</div>
                    <div className={STAT_LABEL_CLASS}>Toplam Goruntulenme</div>
                  </div>
                  <div className={STAT_CARD_CLASS}>
                    <div className={STAT_VALUE_CLASS}>{fmtNum(videoStats.total_likes)}</div>
                    <div className={STAT_LABEL_CLASS}>Toplam Begeni</div>
                  </div>
                  <div className={STAT_CARD_CLASS}>
                    <div className={STAT_VALUE_CLASS}>{fmtNum(videoStats.total_comments)}</div>
                    <div className={STAT_LABEL_CLASS}>Toplam Yorum</div>
                  </div>
                  <div className={STAT_CARD_CLASS}>
                    <div className={STAT_VALUE_CLASS}>{fmtNum(videoStats.video_count)}</div>
                    <div className={STAT_LABEL_CLASS}>Yayinlanan Video</div>
                  </div>
                </div>

                {/* Video table */}
                <div className="mt-4 overflow-x-auto">
                  <table className={TABLE_CLASS}>
                    <thead>
                      <tr>
                        <th className={TH_CLASS}>Video</th>
                        <th className={cn(TH_CLASS, "text-right")}>Goruntulenme</th>
                        <th className={cn(TH_CLASS, "text-right")}>Begeni</th>
                        <th className={cn(TH_CLASS, "text-right")}>Yorum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videoStats.videos.map((v) => (
                        <tr
                          key={v.video_id}
                          onClick={() => setSelectedVideoId(
                            selectedVideoId === v.video_id ? null : v.video_id
                          )}
                          className={cn(
                            "cursor-pointer",
                            selectedVideoId === v.video_id && "bg-info-light"
                          )}
                        >
                          <td className={TD_CLASS}>
                            <a
                              href={`https://www.youtube.com/watch?v=${v.video_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-800 no-underline"
                            >
                              {v.title || v.video_id}
                            </a>
                            {v.published_at && (
                              <div className="text-[0.625rem] text-neutral-500 mt-0.5">
                                {new Date(v.published_at).toLocaleDateString("tr-TR")}
                              </div>
                            )}
                          </td>
                          <td className={TD_NUM_CLASS}>{fmtNum(v.view_count)}</td>
                          <td className={TD_NUM_CLASS}>{fmtNum(v.like_count)}</td>
                          <td className={TD_NUM_CLASS}>{fmtNum(v.comment_count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Video Trend Section (M14-C) */}
          {selectedVideoId && (
            <div className={CARD_CLASS} data-testid="yt-video-trend-section">
              <div className="text-base font-semibold text-neutral-700 mb-2">
                Zaman Serisi — {trendData?.title ?? selectedVideoId}
              </div>

              {trendLoading && (
                <p className="text-sm text-neutral-600">Trend verisi yukleniyor...</p>
              )}

              {!trendLoading && (!trendData || trendData.snapshots.length === 0) && (
                <p
                  className="text-sm text-neutral-500 m-0"
                  data-testid="yt-trend-empty"
                >
                  Henüz snapshot verisi bulunmuyor. Video istatistikleri her sorgulamada otomatik kaydedilir.
                </p>
              )}

              {!trendLoading && trendData && trendData.snapshots.length > 0 && (
                <div className="overflow-x-auto">
                  <table className={TABLE_CLASS} data-testid="yt-trend-table">
                    <thead>
                      <tr>
                        <th className={TH_CLASS}>Tarih</th>
                        <th className={cn(TH_CLASS, "text-right")}>Goruntulenme</th>
                        <th className={cn(TH_CLASS, "text-right")}>Begeni</th>
                        <th className={cn(TH_CLASS, "text-right")}>Yorum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendData.snapshots.map((s, idx) => (
                        <tr key={idx}>
                          <td className={TD_CLASS}>
                            {s.snapshot_at
                              ? new Date(s.snapshot_at).toLocaleString("tr-TR")
                              : "\u2014"}
                          </td>
                          <td className={TD_NUM_CLASS}>{fmtNum(s.view_count)}</td>
                          <td className={TD_NUM_CLASS}>{fmtNum(s.like_count)}</td>
                          <td className={TD_NUM_CLASS}>{fmtNum(s.comment_count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Scope limitation note (M14-C) */}
          <div
            className="py-3 px-4 bg-warning-light rounded-md border border-warning text-xs text-warning-text leading-relaxed"
            data-testid="yt-scope-note"
          >
            Zaman serisi verileri yerel snapshot'lardan olusturulur. YouTube Analytics API
            (demografik, izlenme suresi, elde tutma orani) icin ek OAuth scope gereklidir ve
            su an aktif degildir.
          </div>
        </>
      )}
    </PageShell>
  );
}
