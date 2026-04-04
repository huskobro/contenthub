import { useYouTubeStatus, useYouTubeChannelInfo } from "../../hooks/useCredentials";

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

export function YouTubeAnalyticsPage() {
  const { data: ytStatus, isLoading: statusLoading } = useYouTubeStatus();
  const { data: channelInfo, isLoading: channelLoading } = useYouTubeChannelInfo();

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
        Bagli YouTube kanalinin temel bilgileri ve yayin durumu.
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
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>&#x1F6AA;</div>
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
                    : "—"}
                </div>
                <div style={STAT_LABEL}>Abone</div>
              </div>
              <div style={STAT_CARD}>
                <div style={STAT_VALUE}>
                  {channelInfo?.video_count
                    ? Number(channelInfo.video_count).toLocaleString("tr-TR")
                    : "—"}
                </div>
                <div style={STAT_LABEL}>Video</div>
              </div>
            </div>
          </div>

          {/* Future: Published videos from ContentHub */}
          <div style={CARD}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
              ContentHub Yayinlari
            </div>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
              Bu bolum, ContentHub uzerinden yayinlanan videolarin YouTube performans
              metriklerini gosterecektir. Surekli bu yetkilendirmede YouTube Analytics API
              scope'u eklendikten sonra aktif olacaktir.
            </p>
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.5rem 0.75rem",
                background: "#fffbeb",
                borderRadius: "4px",
                border: "1px solid #fef08a",
                fontSize: "0.6875rem",
                color: "#854d0e",
              }}
            >
              YouTube Analytics API entegrasyonu henuz tamamlanmadi.
              Mevcut OAuth yetkisi yalnizca video yukleme (youtube.upload) scope'u ile sinirlidir.
              Analytics icin youtube.readonly scope'u gerekecektir.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
