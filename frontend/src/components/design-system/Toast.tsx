/**
 * Toast — Wave 1
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
import { colors, typography, spacing, radius, shadow, transition, zIndex } from "./tokens";

// ---------------------------------------------------------------------------
// Toast item
// ---------------------------------------------------------------------------

const iconMap: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const colorMap: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: colors.success.light,
    border: colors.success.base,
    text: colors.success.text,
    icon: colors.success.base,
  },
  error: {
    bg: colors.error.light,
    border: colors.error.base,
    text: colors.error.text,
    icon: colors.error.base,
  },
  warning: {
    bg: colors.warning.light,
    border: colors.warning.base,
    text: colors.warning.text,
    icon: colors.warning.dark,
  },
  info: {
    bg: colors.info.light,
    border: colors.info.base,
    text: colors.info.text,
    icon: colors.info.base,
  },
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const scheme = colorMap[toast.type];

  // Auto-dismiss after 4s
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: spacing[3],
        padding: `${spacing[3]} ${spacing[4]}`,
        background: scheme.bg,
        border: `1px solid ${scheme.border}30`,
        borderRadius: radius.md,
        boxShadow: shadow.md,
        fontSize: typography.size.base,
        color: scheme.text,
        maxWidth: "380px",
        animation: "toastSlideIn 220ms ease",
        pointerEvents: "auto",
      }}
      data-testid={`toast-${toast.type}`}
    >
      <span
        style={{
          fontWeight: typography.weight.bold,
          fontSize: typography.size.md,
          color: scheme.icon,
          flexShrink: 0,
          marginTop: "1px",
        }}
        aria-hidden="true"
      >
        {iconMap[toast.type]}
      </span>
      <span style={{ flex: 1, lineHeight: typography.lineHeight.normal }}>
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Kapat"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: scheme.text,
          opacity: 0.6,
          padding: 0,
          fontSize: typography.size.sm,
          flexShrink: 0,
          lineHeight: 1,
          transition: `opacity ${transition.fast}`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
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
      style={{
        position: "fixed",
        top: spacing[4],
        right: spacing[4],
        zIndex: zIndex.toast,
        display: "flex",
        flexDirection: "column",
        gap: spacing[2],
        pointerEvents: "none",
      }}
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
