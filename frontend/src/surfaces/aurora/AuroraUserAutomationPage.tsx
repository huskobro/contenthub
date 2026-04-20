/**
 * Aurora User Automation — user.automation override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/automation.html
 * Veri: fetchAutomationPolicies + updateAutomationPolicy.
 * Toggle butonu gerçek backend mutasyonu çağırır; checkpoint modları gerçek
 * politika alanlarından gösterilir.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAutomationPolicies,
  updateAutomationPolicy,
  type AutomationPolicyResponse,
} from "../../api/automationApi";
import { useAuthStore } from "../../stores/authStore";
import { useMyChannelProfiles } from "../../hooks/useMyChannelProfiles";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

const MODE_LABEL: Record<string, string> = {
  disabled: "kapalı",
  manual_review: "manuel onay",
  automatic: "otomatik",
};

export function AuroraUserAutomationPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const channelsQ = useMyChannelProfiles();
  const channels = channelsQ.data ?? [];

  const policiesQ = useQuery({
    queryKey: ["automation", "policies", "user", user?.id],
    queryFn: () => fetchAutomationPolicies({ owner_user_id: user?.id }),
    enabled: !!user,
    staleTime: 30_000,
  });
  const policies = policiesQ.data ?? [];

  const channelById = useMemo(() => {
    const m = new Map<string, (typeof channels)[number]>();
    for (const c of channels) m.set(c.id, c);
    return m;
  }, [channels]);

  const toggleM = useMutation({
    mutationFn: (p: AutomationPolicyResponse) =>
      updateAutomationPolicy(p.id, { is_enabled: !p.is_enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation"] });
    },
  });

  const active = policies.filter((p) => p.is_enabled).length;

  const inspector = (
    <AuroraInspector title="Otomasyon">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="aktif" value={String(active)} />
        <AuroraInspectorRow label="toplam" value={String(policies.length)} />
        <AuroraInspectorRow label="kanal" value={String(channels.length)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Modlar">
        <AuroraInspectorRow label="otomatik" value={String(policies.filter((p) => p.publish_mode === "automatic").length)} />
        <AuroraInspectorRow label="manuel" value={String(policies.filter((p) => p.publish_mode === "manual_review").length)} />
        <AuroraInspectorRow label="kapalı" value={String(policies.filter((p) => p.publish_mode === "disabled").length)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Otomasyon</h1>
            <div className="sub">Kanal başına yayın politikaları · {policies.length} politika</div>
          </div>
          <AuroraButton
            variant="primary"
            size="sm"
            iconLeft={<Icon name="plus" size={12} />}
            onClick={() => navigate("/user/channels")}
          >
            Kanal seç
          </AuroraButton>
        </div>

        {policiesQ.isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Yükleniyor…
          </div>
        ) : policies.length === 0 ? (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}
          >
            Henüz tanımlı bir politika yok. Bir kanal için otomasyon politikası oluşturun.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {policies.map((p) => {
              const ch = channelById.get(p.channel_profile_id);
              return (
                <div key={p.id} className="card card-pad">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
                        <span className="chip" style={{ fontSize: 10 }}>
                          yayın: {MODE_LABEL[p.publish_mode] ?? p.publish_mode}
                        </span>
                        <span className="chip" style={{ fontSize: 10 }}>
                          taslak: {MODE_LABEL[p.draft_generation_mode] ?? p.draft_generation_mode}
                        </span>
                        <span className="chip" style={{ fontSize: 10 }}>
                          render: {MODE_LABEL[p.render_mode] ?? p.render_mode}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                          {ch?.handle ?? ch?.profile_name ?? p.channel_profile_id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: 12 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>
                        Günlük limit
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: p.is_enabled ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                      >
                        {p.max_daily_posts ?? "—"} post/gün
                      </div>
                    </div>
                    <button
                      onClick={() => toggleM.mutate(p)}
                      disabled={toggleM.isPending}
                      style={{
                        width: 36,
                        height: 20,
                        borderRadius: 10,
                        position: "relative",
                        cursor: "pointer",
                        border: "none",
                        padding: 0,
                        transition: "background .2s",
                        background: p.is_enabled ? "var(--accent-primary)" : "var(--bg-inset)",
                        outline: "none",
                        boxShadow: p.is_enabled ? "0 0 8px rgba(79,104,247,0.4)" : "none",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: p.is_enabled ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "var(--control-knob-bg)",
                          boxShadow: "var(--control-knob-shadow)",
                          transition: "left .2s",
                        }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
