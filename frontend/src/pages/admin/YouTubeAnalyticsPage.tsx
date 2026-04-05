import { useYouTubeStatus, useYouTubeChannelInfo, useYouTubeVideoStats } from "../../hooks/useCredentials";

const CONTAINER: React.CSSProperties = {
  maxWidth: "800px",
};

const CARD: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "1.25rem",
  marginBottom: "1rem",
  background: "#fff",
};

const STAT_ROW: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  flexWrap: "wrap",
  marginTop: "0.75rem",
};

const STAT_CARD: React.CSSProperties = {
  flex: "1 1 140px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  padding: "0.75rem",
  background: "#fafbfc",
  textAlign: "center",
};

const STAT_VALUE: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#1e293b",
};

const STAT_LABEL: React.CSSProperties = {
  fontSize: "0.6875rem",
  color: "#94a3b8",
  marginTop: "0.125rem",
};

const TABLE_STYLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.8125rem",
};

const TH_STYLE: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  borderBottom: "2px solid #e2e8f0",
  fontSize: "0.6875rem",
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const TD_STYLE: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
};

const TD_NUM: React.CSSProperties = {
  ...TD_STYLE,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

function fmtNum(n: number): string {
  return n.toLocaleString("tr-TR");
}

export function YouTubeAnalyticsPage() {
  const { data: ytStatus, isLoading: statusLoading } = useYouTubeStatus();
  const { data: channelInfo, isLoading: channelLoading } = useYouTubeChannelInfo();
  const {
    data: videoStats,
    isLoading: statsLoading,
    error: statsError,
  } = useYouTubeVideoStats();

  const isLoading = statusLoading || channelLoading;
  const isConnected = ytStatus?.has_credentials === true;

  return (
    <div style={CONTAINER}>
      <h2
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
      >
        YouTube Analytics
      </h2>
      <p
        style={{
          margin: "0.25rem 0 1rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
        }}
      >
        Bagli YouTube kanalinin temel bilgileri ve yayin istatistikleri.
      </p>

      {isLoading && (
        <p style={{ color: "#64748b", fontSize: "0.8125rem" }}>Yukleniyor...</p>
      )}

      {/* Not connected state */}
      {!isLoading && !isConnected && (
        <div style={CARD}>
          <div
            style={{
              textAlign: "center",
              padding: "2rem 1rem",
            }}
          >
            <p style={{ fontSize: "0.875rem", color: "#475569", margin: "0 0 0.5rem" }}>
              YouTube hesabi bagli degil.
            </p>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0, maxWidth: "400px", marginInline: "auto" }}>
              YouTube Analytics goruntulemek icin once{" "}
              <a
                href="/admin/settings"
                style={{ color: "#1e40af", textDecoration: "underline" }}
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
          <div style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {channelInfo?.thumbnail_url && (
                <img
                  src={channelInfo.thumbnail_url}
                  alt={channelInfo.channel_title ?? "Kanal"}
                  style={{ width: 48, height: 48, borderRadius: "50%" }}
                />
              )}
              <div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#1e293b" }}>
                  {channelInfo?.channel_title ?? "Kanal bilgisi yukleniyor..."}
                </div>
                {channelInfo?.channel_id && (
                  <div style={{ fontSize: "0.6875rem", color: "#94a3b8", fontFamily: "monospace" }}>
                    {channelInfo.channel_id}
                  </div>
                )}
              </div>
            </div>

            <div style={STAT_ROW}>
              <div style={STAT_CARD}>
                <div style={STAT_VALUE}>
                  {channelInfo?.subscriber_count
                    ? Number(channelInfo.subscriber_count).toLocaleString("tr-TR")
                    : "\u2014"}
                </div>
                <div style={STAT_LABEL}>Abone</div>
              </div>
              <div style={STAT_CARD}>
                <div style={STAT_VALUE}>
                  {channelInfo?.video_count
                    ? Number(channelInfo.video_count).toLocaleString("tr-TR")
                    : "\u2014"}
                </div>
                <div style={STAT_LABEL}>Video</div>
              </div>
            </div>
          </div>

          {/* Video Stats Summary */}
          <div style={CARD}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
              ContentHub Yayinlari — Istatistikler
            </div>

            {statsLoading && (
              <p style={{ fontSize: "0.75rem", color: "#64748b" }}>Video istatistikleri yukleniyor...</p>
            )}

            {statsError && (
              <div
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "#fef2f2",
                  borderRadius: "4px",
                  border: "1px solid #fecaca",
                  fontSize: "0.75rem",
                  color: "#991b1b",
                }}
              >
                YouTube API hatasi: {statsError instanceof Error ? statsError.message : "Bilinmeyen hata"}
              </div>
            )}

            {!statsLoading && !statsError && videoStats && videoStats.video_count === 0 && (
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                Henuz YouTube'a yayinlanmis video bulunmuyor.
              </p>
            )}

            {!statsLoading && !statsError && videoStats && videoStats.video_count > 0 && (
              <>
                {/* Summary cards */}
                <div style={STAT_ROW}>
                  <div style={STAT_CARD}>
                    <div style={STAT_VALUE}>{fmtNum(videoStats.total_views)}</div>
                    <div style={STAT_LABEL}>Toplam Goruntulenme</div>
                  </div>
                  <div style={STAT_CARD}>
                    <div style={STAT_VALUE}>{fmtNum(videoStats.total_likes)}</div>
                    <div style={STAT_LABEL}>Toplam Begeni</div>
                  </div>
                  <div style={STAT_CARD}>
                    <div style={STAT_VALUE}>{fmtNum(videoStats.total_comments)}</div>
                    <div style={STAT_LABEL}>Toplam Yorum</div>
                  </div>
                  <div style={STAT_CARD}>
                    <div style={STAT_VALUE}>{fmtNum(videoStats.video_count)}</div>
                    <div style={STAT_LABEL}>Yayinlanan Video</div>
                  </div>
                </div>

                {/* Video table */}
                <div style={{ marginTop: "1rem", overflowX: "auto" }}>
                  <table style={TABLE_STYLE}>
                    <thead>
                      <tr>
                        <th style={TH_STYLE}>Video</th>
                        <th style={{ ...TH_STYLE, textAlign: "right" }}>Goruntulenme</th>
                        <th style={{ ...TH_STYLE, textAlign: "right" }}>Begeni</th>
                        <th style={{ ...TH_STYLE, textAlign: "right" }}>Yorum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videoStats.videos.map((v) => (
                        <tr key={v.video_id}>
                          <td style={TD_STYLE}>
                            <a
                              href={`https://www.youtube.com/watch?v=${v.video_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#1e40af", textDecoration: "none" }}
                            >
                              {v.title || v.video_id}
                            </a>
                            {v.published_at && (
                              <div style={{ fontSize: "0.625rem", color: "#94a3b8", marginTop: "0.125rem" }}>
                                {new Date(v.published_at).toLocaleDateString("tr-TR")}
                              </div>
                            )}
                          </td>
                          <td style={TD_NUM}>{fmtNum(v.view_count)}</td>
                          <td style={TD_NUM}>{fmtNum(v.like_count)}</td>
                          <td style={TD_NUM}>{fmtNum(v.comment_count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
