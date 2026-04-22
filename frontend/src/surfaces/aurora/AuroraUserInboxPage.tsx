/**
 * Aurora User Inbox — user.inbox override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/inbox.html
 * Veri: useNotifications (gerçek kullanıcı notifications API'si).
 * Okunmamış / dismiss butonları backend'e gerçek mutasyon gönderir.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

const TYPE_COLOR: Record<string, string> = {
  success: "var(--state-success-fg)",
  info: "var(--state-info-fg)",
  warning: "var(--state-warning-fg)",
  error: "var(--state-danger-fg)",
};

function fmtSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "şimdi";
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s`;
  const day = Math.floor(hr / 24);
  return `${day}g`;
}

export function AuroraUserInboxPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, totalCount, isLoading, markRead, dismiss, markAllRead } = useNotifications({
    mode: "user",
  });

  const items = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [notifications],
  );

  const inspector = (
    <AuroraInspector title="Gelen kutusu">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="okunmamış" value={String(unreadCount)} />
        <AuroraInspectorRow label="toplam" value={String(totalCount || items.length)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Eylemler">
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={() => markAllRead()}
          disabled={unreadCount === 0}
          style={{ width: "100%" }}
        >
          Tümünü okundu işaretle
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <div>
            <h1>Gelen kutusu</h1>
            <div className="sub">{unreadCount} okunmamış · {totalCount || items.length} toplam</div>
          </div>
        </div>

        {isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Yükleniyor…
          </div>
        ) : items.length === 0 ? (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}
          >
            Gelen kutusu boş.
          </div>
        ) : (
          <div className="card">
            {items.map((n, i) => {
              const unread = n.status === "unread";
              const link = n.action_url ?? null;
              return (
              <div
                key={n.id}
                onClick={() => {
                  if (unread) markRead(n.id);
                  if (link) navigate(link);
                }}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  cursor: "pointer",
                  background: unread ? "rgba(var(--accent-primary-rgb), 0.06)" : "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-inset)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = unread ? "rgba(var(--accent-primary-rgb), 0.06)" : "transparent")
                }
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: unread ? TYPE_COLOR[n.severity] ?? "var(--state-info-fg)" : "transparent",
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, gap: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: unread ? 600 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n.title}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {fmtSince(n.created_at)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.notification_type ?? "bildirim"} · {n.body ?? ""}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(n.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: 2,
                  }}
                  title="Gizle"
                >
                  <Icon name="x" size={12} />
                </button>
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
