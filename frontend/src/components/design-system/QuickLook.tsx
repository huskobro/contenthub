/**
 * QuickLook — Wave 1
 *
 * Space-triggered minimal preview modal.
 * Shows a quick preview of a selected item without navigating away.
 *
 * Features:
 * - Space bar toggles (capture phase prevents inner button triggers)
 * - ESC to close (via dismiss stack, higher priority than Sheet)
 * - Focus restore on close
 * - Centered modal with backdrop
 *
 * Usage:
 *   <QuickLook
 *     open={isQuickLookOpen}
 *     onClose={() => setQuickLookOpen(false)}
 *     title="Ön İzleme"
 *   >
 *     <QuickPreviewContent />
 *   </QuickLook>
 *
 * To bind Space:
 *   useQuickLookTrigger({ enabled, onToggle });
 */

import React, { useEffect, useRef } from "react";
import { colors, typography, spacing, radius, shadow, zIndex } from "./tokens";
import { useDismissStack } from "../../hooks/useDismissStack";
import { useFocusRestore } from "../../hooks/useFocusRestore";
import { useKeyboardStore } from "../../stores/keyboardStore";

interface QuickLookProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testId?: string;
}

export function QuickLook({ open, onClose, title, children, testId }: QuickLookProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scopeId = "quicklook-modal";

  // ESC dismiss — above sheet priority
  useDismissStack(scopeId, open, onClose);

  // Focus restore
  useFocusRestore(open);

  // Keyboard scope
  const pushScope = useKeyboardStore((s) => s.pushScope);
  const popScope = useKeyboardStore((s) => s.popScope);

  useEffect(() => {
    if (open) {
      pushScope({ id: scopeId, label: "QuickLook Modal" });
      requestAnimationFrame(() => modalRef.current?.focus());
    } else {
      popScope(scopeId);
    }
    return () => popScope(scopeId);
  }, [open, pushScope, popScope]);

  // Capture-phase Space isolation — prevent inner buttons from firing
  useEffect(() => {
    if (!open) return;
    const handleSpace = (e: KeyboardEvent) => {
      if (e.key === " " && e.target === modalRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleSpace, true);
    return () => document.removeEventListener("keydown", handleSpace, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          zIndex: zIndex.modal + 10,
          animation: "sheetFadeIn 150ms ease",
        }}
        onClick={onClose}
        data-testid={testId ? `${testId}-backdrop` : "quicklook-backdrop"}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Quick preview"}
        tabIndex={-1}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "560px",
          maxWidth: "90vw",
          maxHeight: "80vh",
          background: colors.surface.card,
          borderRadius: radius.xl,
          boxShadow: shadow.lg,
          zIndex: zIndex.modal + 11,
          display: "flex",
          flexDirection: "column",
          outline: "none",
          animation: "quicklookScaleIn 180ms ease",
        }}
        data-testid={testId || "quicklook-modal"}
      >
        {/* Header */}
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: `${spacing[3]} ${spacing[5]}`,
              borderBottom: `1px solid ${colors.border.subtle}`,
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: typography.size.md,
                fontWeight: typography.weight.semibold,
                color: colors.neutral[900],
              }}
            >
              {title}
            </h3>
            <span
              style={{
                fontSize: typography.size.xs,
                color: colors.neutral[500],
                background: colors.neutral[100],
                padding: `${spacing[1]} ${spacing[2]}`,
                borderRadius: radius.sm,
              }}
            >
              Space ile kapat
            </span>
          </div>
        )}

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: spacing[5],
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// useQuickLookTrigger — Space key binding for QuickLook
// ---------------------------------------------------------------------------

interface UseQuickLookTriggerOptions {
  /** Whether Space should toggle QuickLook */
  enabled: boolean;
  /** Called when Space is pressed to toggle */
  onToggle: () => void;
  /** Keyboard scope to check — only triggers when this scope is active */
  scopeId?: string;
}

export function useQuickLookTrigger({ enabled, onToggle, scopeId }: UseQuickLookTriggerOptions): void {
  const isActiveScope = useKeyboardStore((s) => s.isActiveScope);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      // Don't trigger if typing in an input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      // Check scope
      if (scopeId && !isActiveScope(scopeId)) return;

      e.preventDefault();
      onToggle();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, onToggle, scopeId, isActiveScope]);
}
