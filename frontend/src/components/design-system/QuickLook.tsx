/**
 * QuickLook — Wave 2 Premium (Tailwind migration)
 *
 * Space-triggered minimal preview modal with premium frosted-glass overlay.
 * Shows a quick preview of a selected item without navigating away.
 *
 * Features:
 * - Space bar toggles (capture phase prevents inner button triggers)
 * - ESC to close (via dismiss stack, higher priority than Sheet)
 * - Focus restore on close
 * - Frosted glass backdrop (blur + dark overlay)
 * - Premium floating shadow
 * - Brand accent header strip
 * - Styled close hint badge
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
import { cn } from "../../lib/cn";
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
      {/* Backdrop — frosted glass */}
      <div
        className="fixed inset-0 z-[310] bg-[rgba(15,17,26,0.55)] backdrop-blur-[8px] animate-sheet-fade-in"
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
        className="fixed top-1/2 left-1/2 w-[560px] max-w-[90vw] max-h-[80vh] z-[311] bg-surface-card rounded-xl flex flex-col outline-none overflow-hidden animate-quicklook-scale-in"
        style={{
          transform: "translate(-50%, -50%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.12)",
        }}
        data-testid={testId || "quicklook-modal"}
      >
        {/* Brand accent strip */}
        <div
          className="h-[2px] shrink-0 bg-gradient-to-r from-brand-500 to-brand-700"
          aria-hidden="true"
        />

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle shrink-0">
            <h3 className="m-0 text-md font-semibold text-neutral-900">
              {title}
            </h3>
            <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md shadow-xs tracking-[0.01em]">
              Space ile kapat
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
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
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (scopeId && !isActiveScope(scopeId)) return;

      e.preventDefault();
      onToggle();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, onToggle, scopeId, isActiveScope]);
}
