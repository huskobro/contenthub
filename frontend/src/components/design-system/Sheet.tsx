/**
 * Sheet — Wave 2 Premium (Tailwind migration)
 *
 * Right-sliding detail panel with premium frosted-glass overlay backdrop.
 * Used for viewing item details without leaving the page context.
 *
 * Features:
 * - Slide-in animation from right
 * - Frosted glass backdrop (blur + dark overlay, click to close)
 * - ESC to close (via dismiss stack)
 * - Full focus trap (Tab/Shift+Tab cycle within panel)
 * - Focus restore on close
 * - Keyboard scope management
 * - Body scroll lock
 * - Brand accent header strip
 * - Premium panel shadow & radius
 */

import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "../../lib/cn";
import { useDismissStack } from "../../hooks/useDismissStack";
import { useFocusRestore } from "../../hooks/useFocusRestore";
import { useKeyboardStore } from "../../stores/keyboardStore";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  testId?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onClose, title, children, width = "420px", testId }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scopeId = "sheet-panel";

  // ESC dismiss — highest priority when open
  useDismissStack(scopeId, open, onClose);

  // Focus restore
  useFocusRestore(open);

  // Keyboard scope
  const pushScope = useKeyboardStore((s) => s.pushScope);
  const popScope = useKeyboardStore((s) => s.popScope);

  useEffect(() => {
    if (open) {
      pushScope({ id: scopeId, label: "Sheet Panel" });
      requestAnimationFrame(() => panelRef.current?.focus());
    } else {
      popScope(scopeId);
    }
    return () => popScope(scopeId);
  }, [open, pushScope, popScope]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Focus trap: Tab/Shift+Tab cycle within panel
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || active === panel) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — frosted glass */}
      <div
        className="fixed inset-0 z-[299] bg-[rgba(15,17,26,0.5)] backdrop-blur-[6px] animate-sheet-fade-in"
        onClick={onClose}
        data-testid={testId ? `${testId}-backdrop` : "sheet-backdrop"}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Detail panel"}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed top-4 right-0 z-modal max-w-[90vw] bg-surface-card rounded-l-xl flex flex-col outline-none overflow-hidden animate-sheet-slide-in"
        style={{
          width,
          maxHeight: "calc(100vh - 2rem)",
          boxShadow: "0 0 40px rgba(0,0,0,0.15), -8px 0 24px rgba(0,0,0,0.10)",
        }}
        data-testid={testId || "sheet-panel"}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <h2 className="m-0 text-lg font-semibold text-neutral-900 font-heading">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Kapat"
              className="inline-flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer p-0 rounded-full text-neutral-500 text-lg leading-none transition-all duration-fast hover:text-brand-700 hover:bg-brand-50"
              data-testid={testId ? `${testId}-close` : "sheet-close"}
            >
              ✕
            </button>
          </div>
        )}

        {/* Brand accent gradient strip below header */}
        {title && (
          <div
            className="h-[2px] shrink-0 bg-gradient-to-r from-brand-500 to-brand-700"
            aria-hidden="true"
          />
        )}

        {/* Content — grows with content, scrolls if exceeds max-height */}
        <div className="overflow-y-auto px-5 py-3">
          {children}
        </div>
      </div>
    </>
  );
}
