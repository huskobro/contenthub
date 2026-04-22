/**
 * AuroraAutomationPoliciesPage — Aurora Dusk Cockpit / Otomasyon Politikaları
 * (admin override slot: `admin.automation.policies`).
 *
 * Tasarım hedefi:
 *   - Page-head (başlık + alt başlık + politika sayısı)
 *   - reg-tbl: Politika · Kanal (mono kısaltılmış) · Durum chip ·
 *              5 checkpoint dot (Tarama · Taslak · Render · Yayın · Sonrası) ·
 *              Maks/gün · Güncelleme (relative)
 *   - Inspector KPI: toplam · aktif · pasif · son tetiklenen ·
 *                    publish modu dağılımı
 *
 * Veri kaynağı: fetchAutomationPolicies (gerçek backend, scope-aware).
 * Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 * `admin.automation.policies` slot'una bağlandığında otomatik devreye girer.
 *
 * Pattern reference: AuroraVisibilityRegistryPage.tsx
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAutomationPolicies,
  type AutomationPolicyResponse,
  type CheckpointMode,
} from "../../api/automationApi";
import { useActiveScope } from "../../hooks/useActiveScope";
import {
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraButton,
} from "./primitives";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHECKPOINTS: Array<{
  key: keyof Pick<
    AutomationPolicyResponse,
    | "source_scan_mode"
    | "draft_generation_mode"
    | "render_mode"
    | "publish_mode"
    | "post_publish_mode"
  >;
  label: string;
}> = [
  { key: "source_scan_mode", label: "Tarama" },
  { key: "draft_generation_mode", label: "Taslak" },
  { key: "render_mode", label: "Render" },
  { key: "publish_mode", label: "Yayın" },
  { key: "post_publish_mode", label: "Sonrası" },
];

const MODE_LABEL: Record<CheckpointMode, string> = {
  disabled: "devre dışı",
  manual_review: "manuel onay",
  automatic: "otomatik",
};

const MODE_COLOR: Record<CheckpointMode, string> = {
  disabled: "var(--text-muted)",
  manual_review: "var(--state-warning-fg)",
  automatic: "var(--state-success-fg)",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortChannel(id: string): string {
  if (!id) return "—";
  return id.length > 8 ? `…${id.slice(-8)}` : id;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const d = Math.floor(hr / 24);
  return `${d}g`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraAutomationPoliciesPage() {
  const scope = useActiveScope();
  const ownerUserIdFilter =
    scope.role === "admin" && scope.ownerUserId
      ? scope.ownerUserId
      : scope.role === "user" && scope.ownerUserId
        ? scope.ownerUserId
        : undefined;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "automation-policies",
      {
        ownerUserId: scope.ownerUserId,
        isAllUsers: scope.isAllUsers,
        role: scope.role,
      },
    ],
    queryFn: () =>
      fetchAutomationPolicies(
        ownerUserIdFilter ? { owner_user_id: ownerUserIdFilter } : undefined,
      ),
  });

  const [selected, setSelected] = useState<string | null>(null);

  const policies = data ?? [];

  const stats = useMemo(() => {
    const enabled = policies.filter((p) => p.is_enabled).length;
    const disabled = policies.length - enabled;
    const publishModes = { disabled: 0, manual_review: 0, automatic: 0 };
    let lastUpdatedIso: string | null = null;
    let lastUpdatedTs = 0;
    for (const p of policies) {
      publishModes[p.publish_mode] += 1;
      const t = new Date(p.updated_at).getTime();
      if (Number.isFinite(t) && t > lastUpdatedTs) {
        lastUpdatedTs = t;
        lastUpdatedIso = p.updated_at;
      }
    }
    return { enabled, disabled, publishModes, lastUpdatedIso };
  }, [policies]);

  const inspector = (
    <AuroraInspector title="Otomasyon Politikaları">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam" value={String(policies.length)} />
        <AuroraInspectorRow label="aktif" value={String(stats.enabled)} />
        <AuroraInspectorRow label="pasif" value={String(stats.disabled)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Yayın modu dağılımı">
        <AuroraInspectorRow
          label="otomatik"
          value={String(stats.publishModes.automatic)}
        />
        <AuroraInspectorRow
          label="manuel"
          value={String(stats.publishModes.manual_review)}
        />
        <AuroraInspectorRow
          label="kapalı"
          value={String(stats.publishModes.disabled)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Son tetiklenen">
        <AuroraInspectorRow
          label="güncelleme"
          value={
            stats.lastUpdatedIso ? `${timeAgo(stats.lastUpdatedIso)} önce` : "—"
          }
        />
      </AuroraInspectorSection>
      {selected && (
        <AuroraInspectorSection title="Seçim">
          <AuroraInspectorRow label="politika" value={selected.slice(0, 8)} />
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  return (
    <div
      className="aurora-dashboard"
      data-testid="aurora-admin-automation-policies-page"
    >
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Otomasyon politikaları</h1>
            <div className="sub">
              {policies.length} politika · checkpoint kontrol matrisi
            </div>
          </div>
        </div>

        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Otomasyon politikaları yükleniyor…
          </div>
        )}

        {isError && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                color: "var(--state-danger-fg)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            >
              Politikalar yüklenemedi:{" "}
              {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </span>
            <AuroraButton size="sm" onClick={() => refetch()}>
              Tekrar dene
            </AuroraButton>
          </div>
        )}

        {!isLoading && !isError && policies.length === 0 && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--text-muted)",
            }}
          >
            Henüz otomasyon politikası tanımlanmamış.
          </div>
        )}

        {!isLoading && !isError && policies.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl">
              <thead>
                <tr>
                  <th>Politika</th>
                  <th>Kanal</th>
                  <th>Durum</th>
                  {CHECKPOINTS.map((cp) => (
                    <th
                      key={cp.key}
                      style={{ textAlign: "center", fontSize: 10 }}
                    >
                      {cp.label}
                    </th>
                  ))}
                  <th style={{ textAlign: "right" }}>Maks/gün</th>
                  <th>Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => {
                  const isSel = selected === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() =>
                        setSelected((prev) => (prev === p.id ? null : p.id))
                      }
                      style={isSel ? { background: "var(--bg-inset)" } : undefined}
                    >
                      <td
                        style={{
                          color: "var(--text-strong)",
                          fontWeight: 500,
                          maxWidth: 180,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={p.name}
                      >
                        {p.name}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {shortChannel(p.channel_profile_id)}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: p.is_enabled
                              ? "var(--state-success-fg)"
                              : "var(--text-muted)",
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: p.is_enabled
                                ? "var(--state-success-fg)"
                                : "var(--text-muted)",
                              boxShadow: p.is_enabled
                                ? "0 0 6px var(--state-success-fg)"
                                : "none",
                            }}
                          />
                          {p.is_enabled ? "aktif" : "pasif"}
                        </span>
                      </td>
                      {CHECKPOINTS.map((cp) => {
                        const mode = p[cp.key];
                        return (
                          <td
                            key={cp.key}
                            style={{ textAlign: "center" }}
                            title={`${cp.label}: ${MODE_LABEL[mode]}`}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                width: 9,
                                height: 9,
                                borderRadius: "50%",
                                background: MODE_COLOR[mode],
                                boxShadow:
                                  mode === "automatic"
                                    ? "0 0 6px var(--state-success-fg)"
                                    : "none",
                              }}
                            />
                          </td>
                        );
                      })}
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                          color: "var(--text-muted)",
                        }}
                      >
                        {p.max_daily_posts ?? "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(p.updated_at)} önce
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && policies.length > 0 && (
          <div
            className="hstack"
            style={{
              gap: 14,
              marginTop: 8,
              fontSize: 10,
              color: "var(--text-muted)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: MODE_COLOR.disabled,
                }}
              />
              devre dışı
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: MODE_COLOR.manual_review,
                }}
              />
              manuel onay
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: MODE_COLOR.automatic,
                }}
              />
              otomatik
            </span>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
