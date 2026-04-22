/**
 * Aurora Channel Detail — user.channels.detail override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/channel-detail.html
 * Veri: useChannelProfile + useYouTubeStatusByChannel + useYouTubeChannelInfoByChannel.
 * Hardcoded yok; meta backend'ten, OAuth durumu YouTube status hook'undan gelir.
 */
import { useNavigate, useParams } from "react-router-dom";
import { useChannelProfile } from "../../hooks/useChannelProfiles";
import { useChannelConnection } from "../../hooks/useChannelConnection";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR");
  } catch {
    return "—";
  }
}

export function AuroraChannelDetailPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const channelQ = useChannelProfile(channelId ?? "");
  const conn = useChannelConnection(channelId);

  const channel = channelQ.data;

  if (channelQ.isLoading) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div style={{ padding: 32, color: "var(--text-muted)" }}>Yükleniyor…</div>
        </div>
      </div>
    );
  }
  if (!channel) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div style={{ padding: 32, color: "var(--text-muted)" }}>Kanal bulunamadı.</div>
        </div>
      </div>
    );
  }

  const ytConnected = conn.isConnected;
  const inspector = (
    <AuroraInspector title={channel.handle ?? channel.profile_name}>
      <AuroraInspectorSection title="Kanal">
        <AuroraInspectorRow label="durum" value={channel.status} />
        <AuroraInspectorRow label="dil" value={channel.default_language} />
        <AuroraInspectorRow label="platform" value={channel.platform ?? "—"} />
        <AuroraInspectorRow label="oluşturulma" value={fmtDate(channel.created_at)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Bağlantı">
        <AuroraInspectorRow label="bağlı" value={ytConnected ? "evet" : "hayır"} />
        <AuroraInspectorRow label="token" value={conn.hasValidToken ? "geçerli" : "—"} />
        {conn.connection?.external_account_name && (
          <AuroraInspectorRow label="hesap" value={conn.connection.external_account_name} />
        )}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Eylemler">
        <AuroraButton variant="secondary" size="sm" style={{ width: "100%", marginBottom: 6 }} onClick={() => navigate("/user/channels")}>
          Kanallara dön
        </AuroraButton>
        <AuroraButton
          variant="primary"
          size="sm"
          style={{ width: "100%", marginBottom: 6 }}
          onClick={() => navigate(`/user/channels/${channel.id}/branding-center`)}
          data-testid="channel-detail-go-branding"
        >
          Branding Center
        </AuroraButton>
        <AuroraButton
          variant="secondary"
          size="sm"
          style={{ width: "100%", marginBottom: 6 }}
          onClick={() => navigate(`/user/analytics/channels?channelId=${channel.id}`)}
        >
          Analitik
        </AuroraButton>
        <AuroraButton variant="primary" size="sm" style={{ width: "100%" }} onClick={() => navigate("/admin/wizard")}>
          Yeni içerik
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>{channel.title ?? channel.profile_name}</h1>
            <div className="sub">
              {channel.handle ?? channel.channel_slug} · {channel.status}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            padding: "26px 28px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 14,
            marginBottom: 18,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "var(--gradient-brand)", opacity: 0.05, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            {channel.avatar_url ? (
              <img src={channel.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", boxShadow: "var(--glow-accent)" }} />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "var(--gradient-brand)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 26,
                  color: "var(--text-on-accent)",
                  fontWeight: 600,
                  boxShadow: "var(--glow-accent)",
                }}
              >
                {(channel.handle ?? channel.profile_name)[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{channel.title ?? channel.profile_name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                {channel.handle ?? channel.channel_slug} · {channel.platform ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid g-4" style={{ marginBottom: 18 }}>
          {[
            ["Bağlantı", ytConnected ? "bağlı" : "yok"],
            ["Token", conn.hasValidToken ? "geçerli" : "—"],
            ["Hesap", conn.connection?.external_account_name ?? "—"],
            ["Yenileme", conn.requiresReauth ? "gerekli" : "—"],
          ].map(([k, v]) => (
            <div key={k} className="metric">
              <div className="accent" />
              <div className="lbl">{k}</div>
              <span className="val">{v}</span>
            </div>
          ))}
        </div>

        {channel.notes && (
          <div className="card card-pad" style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {channel.notes}
          </div>
        )}

        {!ytConnected && (
          <div
            className="card card-pad"
            style={{
              marginTop: 14,
              borderColor: "var(--state-warning-fg)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Icon name="alert-triangle" size={16} />
            <div style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>
              YouTube hesabı bağlı değil. Yayın için OAuth bağlantısı gerekli.
            </div>
            <AuroraButton variant="primary" size="sm" onClick={() => navigate(`/user/connections?channel=${channel.id}`)}>
              Bağla
            </AuroraButton>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
