/**
 * NotificationCenter — Persistent notification panel
 *
 * Triggered from the bell icon in header/sidebar.
 * Slides in from the right with notification list.
 * All colors from CSS variables — fully theme-aware.
 */

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from "../../stores/notificationStore";
import { cn } from "../../lib/cn";
import { formatDateShort } from "../../lib/formatDate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "Az once";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk once`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat once`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gun once`;
  return formatDateShort(dateStr);
}

const typeIcons: Record<NotificationType, string> = {
  success: "\u2713",
  error: "\u2717",
  warning: "\u26A0",
  info: "\u2139",
};

const categoryLabels: Record<string, string> = {
  job: "Is",
  publish: "Yayin",
  system: "Sistem",
  content: "Icerik",
  source: "Kaynak",
};

// ---------------------------------------------------------------------------
// NotificationItem
// ---------------------------------------------------------------------------

function NotificationItem({
  notification,
  onRead,
  onRemove,
  onNavigate,
}: {
  notification: Notification;
  onRead: () => void;
  onRemove: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div
      className={cn(
        "px-4 py-3 border-b border-border-subtle transition-colors duration-fast cursor-pointer group",
        notification.read
          ? "bg-surface-card opacity-70"
          : "bg-surface-card hover:bg-brand-50/30",
      )}
      onClick={() => {
        onRead();
        onNavigate?.();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onRead();
          onNavigate?.();
        }
      }}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Type indicator */}
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
            notification.type === "success" && "bg-success-light text-success-text",
            notification.type === "error" && "bg-error-light text-error-text",
            notification.type === "warning" && "bg-warning-light text-warning-text",
            notification.type === "info" && "bg-info-light text-info-text",
          )}
        >
          {typeIcons[notification.type]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={cn(
              "m-0 text-sm leading-tight truncate",
              notification.read ? "text-neutral-600 font-normal" : "text-neutral-900 font-semibold",
            )}>
              {notification.title}
            </p>
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
            )}
          </div>
          <p className="m-0 text-xs text-neutral-500 leading-normal line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-neutral-400">
              {timeAgo(notification.createdAt)}
            </span>
            {notification.category && (
              <span className="text-[10px] text-neutral-400 px-1.5 py-0.5 bg-surface-inset rounded-sm">
                {categoryLabels[notification.category] || notification.category}
              </span>
            )}
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-neutral-700 bg-transparent border-none cursor-pointer transition-opacity duration-fast rounded-md hover:bg-neutral-100 text-sm shrink-0"
          title="Kaldir"
          aria-label="Bildirimi kaldir"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotificationCenter panel
// ---------------------------------------------------------------------------

export function NotificationCenter() {
  const navigate = useNavigate();
  const panelOpen = useNotificationStore((s) => s.panelOpen);
  const notifications = useNotificationStore((s) => s.notifications);
  const closePanel = useNotificationStore((s) => s.closePanel);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!panelOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [panelOpen, closePanel]);

  // Close on Escape
  useEffect(() => {
    if (!panelOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [panelOpen, closePanel]);

  if (!panelOpen) return null;

  const count = unreadCount();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-neutral-900/20 backdrop-blur-[2px] transition-opacity duration-normal"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 w-[380px] max-w-[90vw] z-[999] bg-surface-card border-l border-border-subtle shadow-lg flex flex-col notification-panel-enter"
        role="dialog"
        aria-label="Bildirim Merkezi"
        data-testid="notification-center"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle shrink-0 flex items-center justify-between bg-surface-card">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-md font-bold text-neutral-900 font-heading">
              Bildirimler
            </h2>
            {count > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-brand-500 text-white min-w-[20px] text-center">
                {count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {count > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-2 py-1 text-xs text-brand-600 bg-transparent border-none cursor-pointer hover:text-brand-700 hover:bg-brand-50 rounded-md transition-colors duration-fast"
              >
                Tumunu oku
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="px-2 py-1 text-xs text-neutral-500 bg-transparent border-none cursor-pointer hover:text-error hover:bg-error-light rounded-md transition-colors duration-fast"
              >
                Temizle
              </button>
            )}
            <button
              onClick={closePanel}
              className="w-7 h-7 flex items-center justify-center text-neutral-500 hover:text-neutral-800 bg-transparent border-none cursor-pointer rounded-md hover:bg-neutral-100 transition-colors duration-fast text-lg"
              aria-label="Kapat"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-inset flex items-center justify-center text-neutral-400 text-xl mb-3">
                &#x1F514;
              </div>
              <p className="m-0 text-sm font-medium text-neutral-600">
                Bildirim yok
              </p>
              <p className="mt-1 mb-0 text-xs text-neutral-400">
                Yeni bildirimler burada gorunecek
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={() => markAsRead(n.id)}
                onRemove={() => removeNotification(n.id)}
                onNavigate={
                  n.link
                    ? () => {
                        closePanel();
                        navigate(n.link!);
                      }
                    : undefined
                }
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// NotificationBell — trigger button for header/sidebar
// ---------------------------------------------------------------------------

export function NotificationBell({ className }: { className?: string }) {
  const togglePanel = useNotificationStore((s) => s.togglePanel);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const count = unreadCount();

  return (
    <button
      onClick={togglePanel}
      className={cn(
        "relative w-9 h-9 flex items-center justify-center rounded-lg bg-transparent border border-border-subtle cursor-pointer transition-all duration-fast hover:bg-surface-inset hover:border-brand-400",
        className,
      )}
      title="Bildirimler"
      aria-label={`Bildirimler${count > 0 ? ` (${count} okunmamis)` : ""}`}
      data-testid="notification-bell"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-brand-500 rounded-full leading-none shadow-sm">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
