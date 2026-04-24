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
  useDeleteChannelProfile,
  useUpdateChannelProfile,
} from "../../hooks/useChannelProfiles";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraConfirmDialog,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraSegmented,
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
  const allChannels = channelsQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Filter state. Backend returns active + archived together; this gates only
  // what the list renders. "Tümü" stays the default so an archive does not
  // visually disappear unless the user explicitly hides archived rows.
  type StatusFilter = "all" | "active" | "archived";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const channels = useMemo(() => {
    if (statusFilter === "all") return allChannels;
    return allChannels.filter((c) => c.status === statusFilter);
  }, [allChannels, statusFilter]);
  const activeCount = allChannels.filter((c) => c.status === "active").length;
  const archivedCount = allChannels.filter((c) => c.status === "archived").length;

  // Soft-delete (archive) flow. Backend `DELETE /channel-profiles/{id}` sets
  // status='archived'; rows stay in the list with the existing status chip.
  const deleteMutation = useDeleteChannelProfile();
  const updateMutation = useUpdateChannelProfile();
  const toast = useToast();
  const [archiveTarget, setArchiveTarget] = useState<ChannelProfileResponse | null>(null);
  const [unarchiveTarget, setUnarchiveTarget] = useState<ChannelProfileResponse | null>(null);

  const handleArchiveConfirm = () => {
    if (!archiveTarget) return;
    const target = archiveTarget;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success(`"${target.title ?? target.profile_name}" arşivlendi.`);
        setArchiveTarget(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Kanal arşivlenemedi.");
      },
    });
  };

  const handleUnarchiveConfirm = () => {
    if (!unarchiveTarget) return;
    const target = unarchiveTarget;
    updateMutation.mutate(
      { profileId: target.id, payload: { status: "active" } },
      {
        onSuccess: () => {
          toast.success(`"${target.title ?? target.profile_name}" yeniden aktif.`);
          setUnarchiveTarget(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Kanal aktifleştirilemedi.");
        },
      },
    );
  };

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
              style={{ width: "100%", marginBottom: 6 }}
              iconLeft={<Icon name="plus" size={11} />}
            >
              Yeni içerik
            </AuroraButton>
            {selected.status === "archived" ? (
              <AuroraButton
                variant="secondary"
                size="sm"
                onClick={() => setUnarchiveTarget(selected)}
                style={{ width: "100%" }}
                data-testid="my-channels-unarchive"
              >
                Arşivden çıkar
              </AuroraButton>
            ) : (
              <AuroraButton
                variant="danger"
                size="sm"
                onClick={() => setArchiveTarget(selected)}
                style={{ width: "100%" }}
                data-testid="my-channels-archive"
              >
                Arşivle
              </AuroraButton>
            )}
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
            <div className="sub">
              {allChannels.length} kanal · {activeCount} aktif · {archivedCount} arşiv
            </div>
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
        <div style={{ marginBottom: 16 }}>
          <AuroraSegmented<StatusFilter>
            options={[
              { value: "all", label: `Tümü (${allChannels.length})` },
              { value: "active", label: `Aktif (${activeCount})` },
              { value: "archived", label: `Arşiv (${archivedCount})` },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            data-testid="my-channels-filter"
          />
        </div>

        {channelsQ.isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>Yükleniyor…</div>
        ) : channels.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
            {allChannels.length === 0
              ? "Henüz kanal eklenmedi."
              : statusFilter === "active"
                ? "Aktif kanal yok."
                : statusFilter === "archived"
                  ? "Arşivde kanal yok."
                  : "Bu filtrede kanal yok."}
          </div>
        ) : (
          channels.map((ch) => {
            const isSel = (selected?.id ?? null) === ch.id;
            return (
              <div
                key={ch.id}
                data-testid="my-channels-card"
                data-channel-id={ch.id}
                data-channel-status={ch.status}
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
      <AuroraConfirmDialog
        open={archiveTarget !== null}
        tone="danger"
        title="Kanalı arşivle?"
        description={
          archiveTarget ? (
            <>
              <strong>{archiveTarget.title ?? archiveTarget.profile_name}</strong>{" "}
              kanalı arşivlenecek. Kanal listede kalır ve durumu{" "}
              <code>archived</code> olur. Geçmiş işler ve yayın kayıtları
              korunur; kalıcı silme yapılmaz.
            </>
          ) : null
        }
        confirmLabel={deleteMutation.isPending ? "Arşivleniyor…" : "Arşivle"}
        cancelLabel="Vazgeç"
        busy={deleteMutation.isPending}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
        data-testid="my-channels-archive-confirm"
      />
      <AuroraConfirmDialog
        open={unarchiveTarget !== null}
        tone="neutral"
        title="Kanalı arşivden çıkar?"
        description={
          unarchiveTarget ? (
            <>
              <strong>{unarchiveTarget.title ?? unarchiveTarget.profile_name}</strong>{" "}
              kanalı yeniden <code>active</code> duruma alınacak. Geçmiş işler ve
              yayın kayıtları zaten korunmuştu; yeni içerik üretimi için tekrar
              kullanılabilir olur.
            </>
          ) : null
        }
        confirmLabel={updateMutation.isPending ? "Aktifleştiriliyor…" : "Arşivden çıkar"}
        cancelLabel="Vazgeç"
        busy={updateMutation.isPending}
        onConfirm={handleUnarchiveConfirm}
        onCancel={() => setUnarchiveTarget(null)}
        data-testid="my-channels-unarchive-confirm"
      />
    </div>
  );
}
