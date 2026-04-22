/**
 * AuroraAdminNotificationsPage — Aurora Dusk Cockpit / Bildirim Merkezi (admin).
 *
 * `admin.notifications` slot'u için Aurora yüzeyi.
 *
 * Backend bağlantıları (legacy ile birebir):
 *   - useQuery(["notifications","admin-page",...], fetchNotifications)
 *   - useQuery(["notification-count","admin-page",...], fetchNotificationCount)
 *   - mutations: markNotificationRead / markNotificationDismissed /
 *                markAllNotificationsRead
 *
 * Sağ inspector: toplam, okunmamış, severity dağılımı, "tümünü okundu" eylemi.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchNotificationCount,
  markAllNotificationsRead,
  markNotificationDismissed,
  markNotificationRead,
  type NotificationItem,
} from "../../api/notificationApi";
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
// Static maps
// ---------------------------------------------------------------------------

const SEVERITY_TONE: Record<string, AuroraStatusTone> = {
  error: "danger",
  warning: "warning",
  info: "info",
  success: "success",
};

const SEVERITY_LABELS: Record<string, string> = {
  error: "Hata",
  warning: "Uyarı",
  info: "Bilgi",
  success: "Başarı",
};

const TYPE_LABELS: Record<string, string> = {
  publish_review: "Yayın Onay",
  publish_failure: "Yayın Hatası",
  render_failure: "Render Hatası",
  source_scan_error: "Tarama Hatası",
  overdue_publish: "Geciken Yayın",
  policy_review_required: "Policy İnceleme",
  job_completed: "İş Tamamlandı",
  job_failed: "İş Başarısız",
  system_info: "Sistem",
};

const STATUS_LABELS: Record<string, string> = {
  unread: "Okunmamış",
  read: "Okunmuş",
  dismissed: "Kapatılmış",
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraAdminNotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const scope = useActiveScope();
  const scopedOwnerId =
    scope.role === "admin" && scope.ownerUserId ? scope.ownerUserId : undefined;

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Data — legacy ile birebir aynı queryKey + params
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: [
      "notifications",
      "admin-page",
      statusFilter,
      severityFilter,
      typeFilter,
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () =>
      fetchNotifications({
        owner_user_id: scopedOwnerId,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        notification_type: typeFilter || undefined,
        limit: 200,
      }),
  });

  const { data: counts } = useQuery({
    queryKey: [
      "notification-count",
      "admin-page",
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () =>
      fetchNotificationCount(
        scopedOwnerId ? { owner_user_id: scopedOwnerId } : undefined,
      ),
  });

  const markReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
    onError: (err) => {
      // Faz 4: read failures used to vanish — surface them.
      toast.error(toastMessageFromError(err));
    },
  });

  const dismissMut = useMutation({
    mutationFn: markNotificationDismissed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
    onError: (err) => {
      toast.error(toastMessageFromError(err));
    },
  });

  const markAllMut = useMutation({
    mutationFn: () =>
      markAllNotificationsRead(
        scopedOwnerId ? { owner_user_id: scopedOwnerId } : undefined,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
    onError: (err) => {
      toast.error(toastMessageFromError(err));
    },
  });

  // Severity dağılımı (filtresiz akıştan değil, mevcut görünümden)
  const severityCounts = useMemo(() => {
    const acc: Record<string, number> = {
      error: 0,
      warning: 0,
      info: 0,
      success: 0,
    };
    notifications.forEach((n) => {
      acc[n.severity] = (acc[n.severity] ?? 0) + 1;
    });
    return acc;
  }, [notifications]);

  const inspector = (
    <AuroraInspector title="Bildirimler">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow
          label="okunmamış"
          value={String(counts?.unread ?? "—")}
        />
        <AuroraInspectorRow
          label="toplam"
          value={String(counts?.total ?? notifications.length)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Severity dağılımı">
        {(["error", "warning", "info", "success"] as const).map((sev) => (
          <AuroraInspectorRow
            key={sev}
            label={
              <AuroraStatusChip tone={SEVERITY_TONE[sev]}>
                {SEVERITY_LABELS[sev]}
              </AuroraStatusChip>
            }
            value={String(severityCounts[sev] ?? 0)}
          />
        ))}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Eylemler">
        <AuroraButton
          variant="secondary"
          size="sm"
          disabled={(counts?.unread ?? 0) === 0 || markAllMut.isPending}
          onClick={() => markAllMut.mutate()}
          style={{ width: "100%" }}
        >
          Tümünü okundu işaretle
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-admin-notifications">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Bildirim Merkezi</h1>
            <div className="sub">
              {counts
                ? `${counts.unread} okunmamış · ${counts.total} toplam`
                : "Yükleniyor…"}
            </div>
          </div>
        </div>

        {/* Filtre çubuğu */}
        <div className="filter-bar" style={{ flexWrap: "wrap", gap: 8 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="aurora-select"
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              color: "var(--text-secondary)",
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              color: "var(--text-secondary)",
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            <option value="">Tüm Seviyeler</option>
            {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              color: "var(--text-secondary)",
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            <option value="">Tüm Tipler</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Akış */}
        {isLoading ? (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        ) : notifications.length === 0 ? (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--text-muted)",
            }}
          >
            Bildirim bulunamadı.
          </div>
        ) : (
          <div className="card">
            {notifications.map((n, i) => (
              <NotificationRow
                key={n.id}
                item={n}
                last={i === notifications.length - 1}
                onRead={() => markReadMut.mutate(n.id)}
                onDismiss={() => dismissMut.mutate(n.id)}
                onNavigate={(url) => navigate(url)}
              />
            ))}
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function NotificationRow({
  item,
  last,
  onRead,
  onDismiss,
  onNavigate,
}: {
  item: NotificationItem;
  last: boolean;
  onRead: () => void;
  onDismiss: () => void;
  onNavigate: (url: string) => void;
}) {
  const sevTone = SEVERITY_TONE[item.severity] ?? "info";
  const sevLabel = SEVERITY_LABELS[item.severity] ?? item.severity;
  const typeLabel = TYPE_LABELS[item.notification_type] ?? item.notification_type;
  const unread = item.status === "unread";

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 16px",
        borderBottom: last ? "none" : "1px solid var(--border-subtle)",
        background: unread ? "rgba(var(--accent-primary-rgb), 0.06)" : "transparent",
        alignItems: "flex-start",
      }}
    >
      {/* Severity dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background:
            sevTone === "danger"
              ? "var(--state-danger-fg)"
              : sevTone === "warning"
              ? "var(--state-warning-fg)"
              : sevTone === "success"
              ? "var(--state-success-fg)"
              : "var(--state-info-fg)",
          marginTop: 6,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: unread ? 600 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.title}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            {fmtSince(item.created_at)}
          </span>
        </div>
        {item.body && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: 4,
            }}
          >
            {item.body}
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <AuroraStatusChip tone={sevTone}>{sevLabel}</AuroraStatusChip>
          <AuroraStatusChip tone="neutral">{typeLabel}</AuroraStatusChip>
          {item.related_inbox_item_id && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("/admin/operations-inbox");
              }}
              style={{
                background: "rgba(var(--accent-primary-rgb), 0.12)",
                color: "var(--accent-primary-hover)",
                border: "none",
                borderRadius: 4,
                fontSize: 10,
                padding: "2px 6px",
                cursor: "pointer",
              }}
            >
              Inbox →
            </button>
          )}
          {item.action_url && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(item.action_url!);
              }}
              style={{
                background: "transparent",
                color: "var(--accent-primary-hover)",
                border: "none",
                fontSize: 10,
                padding: "2px 6px",
                cursor: "pointer",
              }}
            >
              Detay →
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {unread && (
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
            title="Okundu işaretle"
          >
            Oku
          </AuroraButton>
        )}
        {item.status !== "dismissed" && (
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            title="Kapat"
          >
            <Icon name="x" size={11} />
          </AuroraButton>
        )}
      </div>
    </div>
  );
}
