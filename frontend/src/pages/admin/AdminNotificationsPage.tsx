/**
 * AdminNotificationsPage — Faz 16: Full notification management page
 *
 * Admin-facing notification list with filtering, severity indicators,
 * inbox cross-references, and bulk actions.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchNotificationCount,
  markNotificationRead,
  markNotificationDismissed,
  markAllNotificationsRead,
} from "../../api/notificationApi";
import type { NotificationItem } from "../../api/notificationApi";
import { cn } from "../../lib/cn";
import { formatDateShort } from "../../lib/formatDate";
import { useActiveScope } from "../../hooks/useActiveScope";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  error: { label: "Hata", color: "text-error-text", bg: "bg-error-light" },
  warning: { label: "Uyari", color: "text-warning-text", bg: "bg-warning-light" },
  info: { label: "Bilgi", color: "text-info-text", bg: "bg-info-light" },
  success: { label: "Basari", color: "text-success-text", bg: "bg-success-light" },
};

const TYPE_LABELS: Record<string, string> = {
  publish_review: "Yayin Onay",
  publish_failure: "Yayin Hatasi",
  render_failure: "Render Hatasi",
  source_scan_error: "Tarama Hatasi",
  overdue_publish: "Geciken Yayin",
  policy_review_required: "Policy Inceleme",
  job_completed: "Is Tamamlandi",
  job_failed: "Is Basarisiz",
  system_info: "Sistem",
};

const STATUS_LABELS: Record<string, string> = {
  unread: "Okunmamis",
  read: "Okunmus",
  dismissed: "Kapatilmis",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Redesign REV-2 / P0.3c:
  //   Admin scope focused-user ise notifications listesi ve count o user'a
  //   filtrelenir. Scope "all" ise admin tüm kapsamı görür (mevcut davranış).
  //   Query key scope parmak izini taşır — cache çapraz kirlenme olmaz.
  const scope = useActiveScope();
  const scopedOwnerId =
    scope.role === "admin" && scope.ownerUserId ? scope.ownerUserId : undefined;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Fetch
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: [
      "notifications",
      "admin-page",
      statusFilter,
      severityFilter,
      typeFilter,
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () => fetchNotifications({
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
    queryFn: () => fetchNotificationCount(
      scopedOwnerId ? { owner_user_id: scopedOwnerId } : undefined,
    ),
  });

  // Mutations
  const markReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  const dismissMut = useMutation({
    mutationFn: markNotificationDismissed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
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
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 font-heading">
            Bildirim Merkezi
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {counts ? `${counts.unread} okunmamis / ${counts.total} toplam` : "Yukleniyor..."}
          </p>
        </div>
        {(counts?.unread ?? 0) > 0 && (
          <button
            onClick={() => markAllMut.mutate()}
            className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg border-none cursor-pointer hover:bg-brand-600 transition-colors duration-fast"
          >
            Tumunu Okundu Isaretle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border-subtle rounded-lg bg-surface-card text-neutral-700"
        >
          <option value="">Tum Durumlar</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border-subtle rounded-lg bg-surface-card text-neutral-700"
        >
          <option value="">Tum Seviyeler</option>
          {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border-subtle rounded-lg bg-surface-card text-neutral-700"
        >
          <option value="">Tum Tipler</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-500 text-sm">Yukleniyor...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-sm">Bildirim bulunamadi.</div>
        ) : (
          notifications.map((n) => (
            <NotificationRow
              key={n.id}
              item={n}
              onRead={() => markReadMut.mutate(n.id)}
              onDismiss={() => dismissMut.mutate(n.id)}
              onNavigate={(url) => navigate(url)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotificationRow
// ---------------------------------------------------------------------------

function NotificationRow({
  item,
  onRead,
  onDismiss,
  onNavigate,
}: {
  item: NotificationItem;
  onRead: () => void;
  onDismiss: () => void;
  onNavigate: (url: string) => void;
}) {
  const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info;
  const typeLabel = TYPE_LABELS[item.notification_type] || item.notification_type;

  return (
    <div
      className={cn(
        "flex items-start gap-4 px-5 py-4 border-b border-border-subtle group transition-colors duration-fast",
        item.status === "unread" ? "bg-surface-card" : "bg-surface-page opacity-75",
      )}
    >
      {/* Severity dot */}
      <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", sev.bg)} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={cn(
            "m-0 text-sm leading-tight",
            item.status === "unread" ? "font-semibold text-neutral-900" : "font-normal text-neutral-600",
          )}>
            {item.title}
          </p>
          {item.status === "unread" && (
            <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
          )}
        </div>

        {item.body && (
          <p className="m-0 text-xs text-neutral-500 leading-normal line-clamp-2 mb-1">
            {item.body}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", sev.bg, sev.color)}>
            {sev.label}
          </span>
          <span className="text-[10px] text-neutral-400 px-1.5 py-0.5 bg-surface-inset rounded-sm">
            {typeLabel}
          </span>
          <span className="text-[10px] text-neutral-400">
            {formatDateShort(item.created_at)}
          </span>
          {item.related_inbox_item_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("/admin/operations-inbox");
              }}
              className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-sm border-none cursor-pointer hover:bg-brand-100"
            >
              Inbox →
            </button>
          )}
          {item.action_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(item.action_url!);
              }}
              className="text-[10px] text-brand-600 bg-transparent border-none cursor-pointer hover:underline"
            >
              Detay →
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
        {item.status === "unread" && (
          <button
            onClick={onRead}
            className="px-2 py-1 text-[10px] text-brand-600 bg-transparent border border-brand-200 rounded-md cursor-pointer hover:bg-brand-50"
            title="Okundu isaretle"
          >
            Oku
          </button>
        )}
        {item.status !== "dismissed" && (
          <button
            onClick={onDismiss}
            className="px-2 py-1 text-[10px] text-neutral-500 bg-transparent border border-border-subtle rounded-md cursor-pointer hover:bg-neutral-100"
            title="Kapat"
          >
            Kapat
          </button>
        )}
      </div>
    </div>
  );
}
