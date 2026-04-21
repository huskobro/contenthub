/**
 * AuroraAdminInboxPage — Aurora Dusk Cockpit / Operations Inbox (admin).
 *
 * `admin.inbox` slot'u için Aurora yüzeyi. Admin scope odaklıysa
 * (focused-user) o kullanıcıya filtrelenir; "all" iken tüm kapsam görünür.
 *
 * Backend bağlantıları:
 *   - useQuery(["operations-inbox", ...], fetchInboxItems)
 *   - useMutation(updateInboxItem) — status: "resolved" / "dismissed"
 *
 * Legacy davranışı korunur: open/acknowledged listesi üstte, resolved/dismissed
 * altta toplanır. Inspector sağda: okunmamış sayım, kategori dağılımı, eylem.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchInboxItems,
  updateInboxItem,
  type InboxItemResponse,
} from "../../api/automationApi";
import { useActiveScope } from "../../hooks/useActiveScope";
import { useToast } from "../../hooks/useToast";
import { toastMessageFromError } from "../../lib/errorUtils";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraStatusChip,
  type AuroraStatusTone,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Static labels / tone maps
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  publish_review: "Yayın Onay",
  comment_reply: "Yorum Cevabı",
  playlist_action: "Playlist İşlemi",
  post_action: "Post İşlemi",
  render_failure: "Render Hatası",
  publish_failure: "Yayın Hatası",
  source_scan_error: "Kaynak Tarama Hatası",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  acknowledged: "Görüldü",
  resolved: "Çözüldü",
  dismissed: "Reddedildi",
};

const PRIORITY_TONE: Record<string, AuroraStatusTone> = {
  urgent: "danger",
  high: "warning",
  normal: "info",
  low: "neutral",
};

const TYPE_TONE: Record<string, AuroraStatusTone> = {
  publish_review: "info",
  comment_reply: "info",
  playlist_action: "info",
  post_action: "success",
  render_failure: "danger",
  publish_failure: "danger",
  source_scan_error: "warning",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraAdminInboxPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  // Aynı scope hesaplaması legacy AdminInboxPage → UserInboxPage(isAdmin) ile
  // tutarlı: admin scope focused-user ise inbox o user'a filtrelenir.
  const scope = useActiveScope();
  const ownerUserId =
    scope.role === "admin" && scope.ownerUserId ? scope.ownerUserId : undefined;

  const { data: items = [], isLoading } = useQuery({
    queryKey: [
      "operations-inbox",
      { owner_user_id: ownerUserId, isAllUsers: scope.isAllUsers, role: scope.role },
    ],
    queryFn: () =>
      fetchInboxItems(ownerUserId ? { owner_user_id: ownerUserId } : {}),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateInboxItem(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations-inbox"] });
      toast.success("Inbox öğesi güncellendi");
    },
    onError: (err) => {
      // Faz 4: status changes used to fail silently — surface them.
      toast.error(toastMessageFromError(err));
    },
  });

  const openItems = useMemo(
    () =>
      items.filter(
        (i: InboxItemResponse) => i.status === "open" || i.status === "acknowledged",
      ),
    [items],
  );
  const resolvedItems = useMemo(
    () =>
      items.filter(
        (i: InboxItemResponse) => i.status === "resolved" || i.status === "dismissed",
      ),
    [items],
  );

  const unreadCount = openItems.length;
  const totalCount = items.length;

  // Kategori dağılımı (item_type bazlı)
  const typeCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    items.forEach((it) => {
      acc[it.item_type] = (acc[it.item_type] ?? 0) + 1;
    });
    return acc;
  }, [items]);

  const inspector = (
    <AuroraInspector title="Operasyon kutusu">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="açık" value={String(unreadCount)} />
        <AuroraInspectorRow label="toplam" value={String(totalCount)} />
        <AuroraInspectorRow
          label="çözülmüş"
          value={String(resolvedItems.length)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Kategori dağılımı">
        {Object.keys(typeCounts).length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              padding: "4px 0",
            }}
          >
            Veri yok
          </div>
        ) : (
          Object.entries(typeCounts).map(([key, count]) => (
            <AuroraInspectorRow
              key={key}
              label={TYPE_LABELS[key] ?? key}
              value={String(count)}
            />
          ))
        )}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Kapsam">
        <AuroraInspectorRow
          label="rol"
          value={scope.role ?? "—"}
        />
        <AuroraInspectorRow
          label="hedef"
          value={ownerUserId ? ownerUserId.slice(0, 8) : "tüm kullanıcılar"}
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-admin-inbox">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Operations Inbox</h1>
            <div className="sub">
              {isLoading
                ? "Yükleniyor…"
                : `${unreadCount} açık · ${totalCount} toplam`}
            </div>
          </div>
        </div>

        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        )}

        {!isLoading && openItems.length === 0 && resolvedItems.length === 0 && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            Bekleyen işlem yok.
          </div>
        )}

        {/* Açık öğeler */}
        {openItems.length > 0 && (
          <div className="section">
            <header className="section-head">
              <div>
                <h3>Bekleyen ({openItems.length})</h3>
                <div className="caption">Çözüm veya inceleme bekliyor</div>
              </div>
            </header>
            <div className="card">
              {openItems.map((item, i) => {
                const typeLabel = TYPE_LABELS[item.item_type] ?? item.item_type;
                const tone = TYPE_TONE[item.item_type] ?? "neutral";
                const priorityTone = PRIORITY_TONE[item.priority] ?? "neutral";
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom:
                        i < openItems.length - 1
                          ? "1px solid var(--border-subtle)"
                          : "none",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <AuroraStatusChip tone={tone}>{typeLabel}</AuroraStatusChip>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </div>
                      {item.reason && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.reason}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          marginTop: 6,
                          fontSize: 10,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          alignItems: "center",
                        }}
                      >
                        <AuroraStatusChip tone={priorityTone}>
                          {item.priority}
                        </AuroraStatusChip>
                        <span>{fmtDate(item.created_at)}</span>
                        {item.related_entity_type && (
                          <span>{item.related_entity_type}</span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexShrink: 0,
                        alignItems: "center",
                      }}
                    >
                      {item.action_url && (
                        <AuroraButton
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(item.action_url!)}
                        >
                          Git
                        </AuroraButton>
                      )}
                      <AuroraButton
                        variant="primary"
                        size="sm"
                        disabled={updateMut.isPending}
                        onClick={() =>
                          updateMut.mutate({ id: item.id, status: "resolved" })
                        }
                      >
                        Çöz
                      </AuroraButton>
                      <AuroraButton
                        variant="ghost"
                        size="sm"
                        disabled={updateMut.isPending}
                        onClick={() =>
                          updateMut.mutate({ id: item.id, status: "dismissed" })
                        }
                        title="Kapat"
                      >
                        <Icon name="x" size={11} />
                      </AuroraButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Çözülen / kapatılan */}
        {resolvedItems.length > 0 && (
          <details className="section" style={{ marginTop: 16 }}>
            <summary
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "8px 4px",
              }}
            >
              Çözülmüş / kapatılmış ({resolvedItems.length})
            </summary>
            <div className="card" style={{ marginTop: 8 }}>
              {resolvedItems.slice(0, 20).map((item, i, arr) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 16px",
                    borderBottom:
                      i < arr.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    alignItems: "center",
                    opacity: 0.6,
                  }}
                >
                  <AuroraStatusChip tone="neutral">
                    {TYPE_LABELS[item.item_type] ?? item.item_type}
                  </AuroraStatusChip>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                      {item.resolved_at
                        ? ` · ${fmtDate(item.resolved_at)}`
                        : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
