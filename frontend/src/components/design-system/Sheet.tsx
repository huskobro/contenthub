/**
 * Sheet — Wave 2 Premium
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
import { colors, typography, spacing, radius, shadow, transition, zIndex } from "./tokens";
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
      // Focus the panel for keyboard accessibility
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
      // Shift+Tab: if at first, wrap to last
      if (active === first || active === panel) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if at last, wrap to first
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
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 17, 26, 0.5)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: zIndex.modal - 1,
          animation: "sheetFadeIn 180ms ease",
        }}
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
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width,
          maxWidth: "90vw",
          background: colors.surface.card,
          boxShadow: "0 0 40px rgba(0,0,0,0.15), -8px 0 24px rgba(0,0,0,0.10)",
          borderRadius: `${radius.xl} 0 0 ${radius.xl}`,
          zIndex: zIndex.modal,
          display: "flex",
          flexDirection: "column",
          outline: "none",
          overflow: "hidden",
          animation: "sheetSlideIn 220ms ease",
        }}
        data-testid={testId || "sheet-panel"}
      >
        {/* Header — with brand accent gradient strip */}
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: `${spacing[4]} ${spacing[5]}`,
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: typography.size.lg,
                fontWeight: typography.weight.semibold,
                color: colors.neutral[900],
                fontFamily: typography.headingFamily,
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Kapat"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                borderRadius: radius.full,
                color: colors.neutral[500],
                fontSize: typography.size.lg,
                lineHeight: 1,
                transition: `all ${transition.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.brand[700];
                e.currentTarget.style.background = colors.brand[50];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.neutral[500];
                e.currentTarget.style.background = "transparent";
              }}
              data-testid={testId ? `${testId}-close` : "sheet-close"}
            >
              ✕
            </button>
          </div>
        )}

        {/* Brand accent gradient strip below header */}
        {title && (
          <div
            style={{
              height: "2px",
              flexShrink: 0,
              background: `linear-gradient(90deg, ${colors.brand[500]}, ${colors.brand[700]})`,
            }}
            aria-hidden="true"
          />
        )}

        {/* Scrollable content — good padding via tokens */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: `${spacing[5]} ${spacing[6]}`,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
