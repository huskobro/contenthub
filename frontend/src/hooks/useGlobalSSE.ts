/**
 * useGlobalSSE — Global SSE hook for app-wide notifications — Faz 16 upgrade
 *
 * Connects to the global SSE endpoint and maps events to notifications.
 * Now handles:
 *   - job:status_changed → job completion/failure notifications
 *   - job:step_changed → step failure notifications
 *   - notification:created → backend-created notifications (inbox events)
 *
 * Also invalidates React Query caches on relevant events.
 */

import { useSSE } from "./useSSE";
import type { SSEEvent } from "./useSSE";
import {
  useNotificationStore,
  severityToType,
  notificationTypeToCategory,
} from "../stores/notificationStore";
import { useAuthStore } from "../stores/authStore";
import { useSSEStatusStore } from "../stores/sseStatusStore";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

interface JobStatusPayload {
  job_id: string;
  status: string;
  step_key: string | null;
  emitted_at: string;
}

interface StepStatusPayload {
  job_id: string;
  step_key: string;
  status: string;
  emitted_at: string;
}

interface NotificationCreatedPayload {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  severity: string;
  scope_type: string;
  owner_user_id: string | null;
  action_url: string | null;
  related_inbox_item_id: string | null;
}

function jobStatusLabel(status: string): string {
  switch (status) {
    case "completed": return "Tamamlandi";
    case "failed": return "Basarisiz";
    case "running": return "Baslatildi";
    case "cancelled": return "Iptal Edildi";
    default: return status;
  }
}

function jobStatusType(status: string): "success" | "error" | "info" | "warning" {
  switch (status) {
    case "completed": return "success";
    case "failed": return "error";
    case "cancelled": return "warning";
    default: return "info";
  }
}

export function useGlobalSSE() {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const qc = useQueryClient();
  // PHASE AD: role-aware job detail link — admin → /admin/jobs, user → /user/jobs
  const role = useAuthStore((s) => s.user?.role);
  const jobDetailPath = (jobId: string) =>
    role === "admin" ? `/admin/jobs/${jobId}` : `/user/jobs/${jobId}`;

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      // --- Job status changes (existing Faz 8 behavior) ---
      if (event.type === "job:status_changed") {
        const data = event.data as JobStatusPayload;
        // Only notify on terminal or significant states
        if (["completed", "failed", "cancelled"].includes(data.status)) {
          addNotification({
            type: jobStatusType(data.status),
            title: `Is ${jobStatusLabel(data.status)}`,
            message: `Job ${data.job_id.slice(0, 8)}... → ${jobStatusLabel(data.status)}`,
            link: jobDetailPath(data.job_id),
            category: "job",
          });
        }
        // Invalidate jobs list for any status change
        qc.invalidateQueries({ queryKey: ["jobs"] });
      }

      // --- Step failures (existing) ---
      if (event.type === "job:step_changed") {
        const data = event.data as StepStatusPayload;
        if (data.status === "failed") {
          addNotification({
            type: "error",
            title: "Adim Basarisiz",
            message: `${data.step_key} adimi basarisiz — Job ${data.job_id.slice(0, 8)}...`,
            link: jobDetailPath(data.job_id),
            category: "job",
          });
        }
      }

      // --- Faz 16: Backend-created notifications (from event hooks) ---
      if (event.type === "notification:created") {
        const data = event.data as NotificationCreatedPayload;
        addNotification({
          type: severityToType(data.severity),
          title: data.title,
          message: data.body || "",
          link: data.action_url || undefined,
          category: notificationTypeToCategory(data.notification_type),
          backendId: data.id,
          relatedInboxItemId: data.related_inbox_item_id || undefined,
        });
        // Invalidate notification queries for fresh count
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["notification-count"] });
        // Also invalidate inbox since they're related
        qc.invalidateQueries({ queryKey: ["operations-inbox"] });
      }
    },
    [addNotification, qc, role],
  );

  const sse = useSSE({
    url: "/api/v1/sse/events",
    enabled: true,
    eventTypes: [
      "job:status_changed",
      "job:step_changed",
      "notification:created",
    ],
    onEvent: handleEvent,
  });

  // Cockpit Statusbar tüketimi için SSE durumunu store'a yayınla.
  // Aurora Final Polish: yeni `offline` field'ı 8 sn grace window
  // dolduktan sonra true olur. Grace içindeyken "reconnecting" görünür
  // ve banner çıkmaz; transient kopmalarda kullanıcı sessiz kalır.
  const setSSEStatus = useSSEStatusStore((s) => s.setStatus);
  useEffect(() => {
    if (sse.connected) setSSEStatus("live");
    else if (sse.offline) setSSEStatus("offline");
    else if (sse.reconnecting) setSSEStatus("reconnecting");
    else setSSEStatus("offline");
  }, [sse.connected, sse.reconnecting, sse.offline, setSSEStatus]);

  return sse;
}
