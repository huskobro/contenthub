/**
 * Toast — Wave 1 (Tailwind migration)
 *
 * Toast notification system rendered at layout level.
 * Reads from uiStore.toasts and auto-dismisses after 4 seconds.
 *
 * Features:
 * - 4 types: success, error, warning, info
 * - 4s auto-dismiss
 * - FIFO queue (max 5 visible)
 * - Spam prevention (via uiStore dedup)
 * - Slide-in animation from top-right
 *
 * Usage (in layout):
 *   <ToastContainer />
 */

import React, { useEffect } from "react";
import { useUIStore } from "../../stores/uiStore";
import type { Toast as ToastData, ToastType } from "../../stores/uiStore";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Toast item
// ---------------------------------------------------------------------------

const iconMap: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

/** Tailwind classes per toast type */
const typeClasses: Record<ToastType, { container: string; icon: string }> = {
  success: {
    container: "bg-success-light border-success/20 text-success-text",
    icon: "text-success",
  },
  error: {
    container: "bg-error-light border-error/20 text-error-text",
    icon: "text-error",
  },
  warning: {
    container: "bg-warning-light border-warning/20 text-warning-text",
    icon: "text-warning-dark",
  },
  info: {
    container: "bg-info-light border-info/20 text-info-text",
    icon: "text-info",
  },
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const scheme = typeClasses[toast.type];

  // Auto-dismiss after 4s
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 px-4 py-3 border rounded-md shadow-md text-base max-w-[380px] animate-toast-slide-in pointer-events-auto",
        scheme.container
      )}
      data-testid={`toast-${toast.type}`}
    >
      <span
        className={cn("font-bold text-md shrink-0 mt-px", scheme.icon)}
        aria-hidden="true"
      >
        {iconMap[toast.type]}
      </span>
      <span className="flex-1 leading-normal">
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Kapat"
        className="bg-transparent border-none cursor-pointer opacity-60 p-0 text-sm shrink-0 leading-none transition-opacity duration-fast hover:opacity-100"
        style={{ color: "inherit" }}
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast container — mount in layout
// ---------------------------------------------------------------------------

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-toast flex flex-col gap-2 pointer-events-none"
      data-testid="toast-container"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}
