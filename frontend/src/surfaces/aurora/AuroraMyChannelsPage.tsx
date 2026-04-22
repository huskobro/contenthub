/**
 * Aurora My Channels — user.channels.list override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/channels.html
 * Veri: useMyChannelProfiles (gerçek backend kanal listesi).
 * Hardcoded yok; abone/video sayıları henüz YouTube senkronundan gelmediyse
 * "—" gösterilir, yalan istatistik üretilmez.
 */
import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMyChannelProfiles } from "../../hooks/useMyChannelProfiles";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";
import type { ChannelProfileResponse } from "../../api/channelProfilesApi";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function avatarChar(c: ChannelProfileResponse): string {
  const src = c.handle ?? c.profile_name ?? "?";
  const trimmed = src.replace(/^@/, "");
  return (trimmed[0] ?? "?").toUpperCase();
}

export function AuroraMyChannelsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  // Shell Branching Rule (CLAUDE.md): shell is decided by URL, not role.
  // newContentRoute is still role-gated because it points to a role-specific
  // destination module (admin wizard vs. user content hub), not a shell.
  const baseRoute = location.pathname.startsWith("/admin") ? "/admin" : "/user";
  const isAdmin = user?.role === "admin";
  const newContentRoute = isAdmin ? "/admin/wizard" : "/user/content";
  const channelsQ = useMyChannelProfiles();
  const channels = channelsQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo<ChannelProfileResponse | null>(() => {
    if (channels.length === 0) return null;
    if (selectedId) {
      const hit = channels.find((c) => c.id === selectedId);
      if (hit) return hit;
    }
    return channels[0] ?? null;
  }, [channels, selectedId]);

  const inspector = (
    <AuroraInspector title="Kanal özeti">
      {selected ? (
        <>
          <AuroraInspectorSection title={selected.handle ?? selected.profile_name}>
            <AuroraInspectorRow label="durum" value={selected.status} />
            <AuroraInspectorRow label="dil" value={selected.default_language} />
            <AuroraInspectorRow label="platform" value={selected.platform ?? "—"} />
            <AuroraInspectorRow label="oluşturulma" value={fmtDate(selected.created_at)} />
          </AuroraInspectorSection>
          <AuroraInspectorSection title="Hızlı işlemler">
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={() => navigate(`${baseRoute}/channels/${selected.id}`)}
              style={{ width: "100%", marginBottom: 6 }}
            >
              Kanal detayı
            </AuroraButton>
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={() => navigate(newContentRoute)}
              style={{ width: "100%" }}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni içerik
            </AuroraButton>
          </AuroraInspectorSection>
        </>
      ) : (
        <AuroraInspectorSection title="Kanal yok">
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Önce bir kanal ekleyin.</div>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Kanallarım</h1>
            <div className="sub">{channels.length} kanal · {channels.filter((c) => c.status === "active").length} aktif</div>
          </div>
          <AuroraButton
            variant="primary"
            size="sm"
            iconLeft={<Icon name="plus" size={12} />}
            onClick={() => navigate(`${baseRoute}/channels/new`)}
            data-testid="my-channels-add"
          >
            Kanal ekle
          </AuroraButton>
        </div>

        {channelsQ.isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>Yükleniyor…</div>
        ) : channels.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
            Henüz kanal eklenmedi.
          </div>
        ) : (
          channels.map((ch) => {
            const isSel = (selected?.id ?? null) === ch.id;
            return (
              <div
                key={ch.id}
                onClick={() => setSelectedId(ch.id)}
                style={{
                  position: "relative",
                  padding: "20px 22px",
                  background: "var(--bg-surface)",
                  border: "1px solid " + (isSel ? "var(--accent-primary)" : "var(--border-default)"),
                  borderRadius: 14,
                  marginBottom: 16,
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--gradient-brand)",
                    opacity: 0.04,
                    pointerEvents: "none",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, position: "relative" }}>
                  {ch.avatar_url ? (
                    <img
                      src={ch.avatar_url}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", boxShadow: "var(--glow-accent)" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "var(--gradient-brand)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 20,
                        color: "var(--text-on-accent)",
                        fontWeight: 600,
                        boxShadow: "var(--glow-accent)",
                      }}
                    >
                      {avatarChar(ch)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                      {ch.title ?? ch.profile_name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                      {ch.handle ?? ch.channel_slug}
                    </div>
                  </div>
                  <span
                    className="chip"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: ch.status === "active" ? "var(--state-success-fg)" : "var(--text-muted)",
                    }}
                  >
                    ● {ch.status}
                  </span>
                  <AuroraButton
                    variant="secondary"
                    size="sm"
                    iconLeft={<Icon name="edit" size={11} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`${baseRoute}/channels/${ch.id}`);
                    }}
                  >
                    Düzenle
                  </AuroraButton>
                </div>
                {ch.notes && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5, position: "relative" }}>
                    {ch.notes}
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 1,
                    background: "var(--border-subtle)",
                    borderRadius: 8,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {[
                    ["Platform", ch.platform ?? "—"],
                    ["Dil", ch.default_language],
                    ["Mod", ch.default_content_mode ?? "—"],
                    ["Import", ch.import_status ?? "—"],
                  ].map(([k, v]) => (
                    <div
                      key={k as string}
                      style={{ background: "var(--bg-surface)", padding: "11px 8px", textAlign: "center" }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 14,
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          color: "var(--text-primary)",
                        }}
                      >
                        {v}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {k}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
