/**
 * Aurora User Connections — user.connections.list override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/connections.html
 * Veri: useMyConnections (Connection Center API). Hardcoded platform listesi yok;
 * platformlar gerçek bağlı OAuth sonuçlarından gruplanır.
 *
 * Deep-link: `/user/connections?channel=<channel_profile_id>` desteklenir.
 * Bu URL ile gelindiğinde ilgili kanala ait platform kartı highlight edilip
 * scroll-into-view yapılır; bağlantı yoksa banner kullanıcıya kanalın hâlâ
 * bağlanmamış olduğunu söyler.
 */
import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMyConnections } from "../../hooks/useConnections";
import type { ConnectionWithHealth } from "../../api/platformConnectionsApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

const HEALTH_TONE: Record<string, { color: string; label: string }> = {
  healthy: { color: "var(--state-success-fg)", label: "sağlıklı" },
  partial: { color: "var(--state-warning-fg)", label: "kısmi" },
  disconnected: { color: "var(--state-danger-fg)", label: "kopuk" },
  reauth_required: { color: "var(--state-warning-fg)", label: "tekrar yetki" },
};

const PLATFORM_ICON: Record<string, string> = {
  youtube: "▶",
  twitter: "X",
  x: "X",
  facebook: "f",
  instagram: "◎",
  linkedin: "in",
  tiktok: "T",
  google: "G",
};

function platformIcon(p: string): string {
  return PLATFORM_ICON[p.toLowerCase()] ?? p.slice(0, 1).toUpperCase();
}

function fmtUpdated(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

interface PlatformGroup {
  platform: string;
  items: ConnectionWithHealth[];
  connected: number;
  reauth: number;
}

function groupByPlatform(items: ConnectionWithHealth[]): PlatformGroup[] {
  const map = new Map<string, PlatformGroup>();
  for (const c of items) {
    const key = c.platform;
    let g = map.get(key);
    if (!g) {
      g = { platform: key, items: [], connected: 0, reauth: 0 };
      map.set(key, g);
    }
    g.items.push(c);
    if (c.health.health_level === "healthy") g.connected += 1;
    if (c.requires_reauth) g.reauth += 1;
  }
  return Array.from(map.values());
}

export function AuroraUserConnectionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const conQ = useMyConnections({ limit: 100 });
  const items = conQ.data?.items ?? [];
  const kpis = conQ.data?.kpis;

  const groups = useMemo(() => groupByPlatform(items), [items]);

  /**
   * Deep-link: `/user/connections?channel=<channel_profile_id>` ile gelinince
   * o kanala ait herhangi bir platform grubunu bul ve scroll-into-view yap.
   * Hiçbir bağlantı yoksa banner ile kullanıcıya kanalın hâlâ bağlanmamış
   * olduğunu söyle. URL temizlenir ki history navigate'inde yeniden
   * tetiklenmesin.
   */
  const channelHint = searchParams.get("channel");
  const hintedPlatform = useMemo(() => {
    if (!channelHint) return null;
    const conn = items.find((c) => c.channel_profile_id === channelHint);
    return conn?.platform ?? null;
  }, [channelHint, items]);
  const channelHasConnection = channelHint != null && hintedPlatform != null;
  const channelMissing = channelHint != null && hintedPlatform == null;

  const platformRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!channelHint || items.length === 0) return;
    if (hintedPlatform) {
      const node = platformRefs.current.get(hintedPlatform);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    // URL temizliği: bayrağı bir kez işledikten sonra ?channel= kaybolur.
    const next = new URLSearchParams(searchParams);
    next.delete("channel");
    setSearchParams(next, { replace: true });
  }, [channelHint, hintedPlatform, items.length, searchParams, setSearchParams]);

  const inspector = (
    <AuroraInspector title="Bağlantı sağlığı">
      <AuroraInspectorSection title="Genel">
        <AuroraInspectorRow label="toplam" value={String(kpis?.total ?? items.length)} />
        <AuroraInspectorRow label="sağlıklı" value={String(kpis?.healthy ?? 0)} />
        <AuroraInspectorRow label="kısmi" value={String(kpis?.partial ?? 0)} />
        <AuroraInspectorRow label="kopuk" value={String(kpis?.disconnected ?? 0)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Yetenek">
        <AuroraInspectorRow label="yayın" value={String(kpis?.can_publish_ok ?? 0)} />
        <AuroraInspectorRow label="yorum" value={String(kpis?.can_read_comments_ok ?? 0)} />
        <AuroraInspectorRow label="analitik" value={String(kpis?.can_read_analytics_ok ?? 0)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="İpucu">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Yeni hesap bağlamak için aşağıdaki listede platformun "Bağla" düğmesini kullanın.
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <div>
            <h1>Platform bağlantıları</h1>
            <div className="sub">OAuth ve API bağlantılarınız · {items.length} kayıt</div>
          </div>
          <AuroraButton
            variant="secondary"
            size="sm"
            onClick={() => navigate("/user/channels")}
            iconLeft={<Icon name="tv" size={11} />}
          >
            Kanallar
          </AuroraButton>
        </div>

        {channelHint && !conQ.isLoading && channelMissing && (
          <div
            className="card card-pad"
            style={{
              marginBottom: 12,
              borderLeft: "3px solid var(--state-warning-fg)",
              background: "var(--state-warning-bg, var(--bg-inset))",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Bu kanal için henüz platform bağlantısı yok
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              channel_profile_id={channelHint.slice(0, 8)}… · Aşağıdan ilgili
              platformu seçip "Bağla" akışını başlatabilirsiniz.
            </div>
          </div>
        )}
        {channelHint && !conQ.isLoading && channelHasConnection && (
          <div
            className="card card-pad"
            style={{
              marginBottom: 12,
              borderLeft: "3px solid var(--accent-primary)",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Kanal bağlantısı bulundu:{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  textTransform: "capitalize",
                  color: "var(--text-primary)",
                }}
              >
                {hintedPlatform}
              </span>{" "}
              · aşağıda vurgulandı.
            </div>
          </div>
        )}
        {conQ.isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Yükleniyor…
          </div>
        ) : groups.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
            Henüz bağlı bir platform yok. Önce bir kanal ekleyin.
          </div>
        ) : (
          groups.map((g) => {
            const primary = g.items[0];
            const primaryConnected = primary.health.health_level === "healthy";
            const isHighlighted = hintedPlatform === g.platform;
            return (
              <div
                key={g.platform}
                className="card card-pad"
                ref={(el) => {
                  if (el) platformRefs.current.set(g.platform, el);
                  else platformRefs.current.delete(g.platform);
                }}
                style={{
                  marginBottom: 12,
                  outline: isHighlighted
                    ? "2px solid var(--accent-primary)"
                    : undefined,
                  boxShadow: isHighlighted
                    ? "0 0 0 4px var(--accent-primary-muted, transparent)"
                    : undefined,
                  transition: "outline 200ms, box-shadow 200ms",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: primaryConnected ? "var(--gradient-brand)" : "var(--bg-inset)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 16,
                      fontWeight: 700,
                      color: primaryConnected ? "#fff" : "var(--text-muted)",
                      border: primaryConnected ? "none" : "1px solid var(--border-default)",
                    }}
                  >
                    {platformIcon(g.platform)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, textTransform: "capitalize" }}>
                      {g.platform}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                      {g.items.length} hesap · {g.connected} sağlıklı{g.reauth > 0 ? ` · ${g.reauth} yetki gerekli` : ""}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      son senkron {fmtUpdated(primary.last_sync_at)}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color:
                        HEALTH_TONE[primary.health.health_level]?.color ?? "var(--text-muted)",
                    }}
                  >
                    ● {HEALTH_TONE[primary.health.health_level]?.label ?? primary.health.health_level}
                  </span>
                </div>
                {g.items.length > 1 && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid var(--border-subtle)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {g.items.map((c) => (
                      <span
                        key={c.id}
                        className="chip"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: HEALTH_TONE[c.health.health_level]?.color ?? "var(--text-muted)",
                        }}
                      >
                        ● {c.external_account_name ?? c.channel_profile_name ?? c.id.slice(0, 6)}
                      </span>
                    ))}
                  </div>
                )}
                {primary.health.issues && primary.health.issues.length > 0 && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 10px",
                      background: "var(--state-warning-bg, var(--bg-inset))",
                      borderRadius: 8,
                      fontSize: 11,
                      color: "var(--state-warning-fg)",
                    }}
                  >
                    {primary.health.issues[0]}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
