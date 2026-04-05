/**
 * ConfirmAction — Wave 1 (Tailwind migration)
 *
 * Two-stage delete/destructive action confirmation.
 * First click shows "Emin misiniz?" state, second click executes.
 * Auto-resets to initial state after 3 seconds if no second click.
 *
 * Usage:
 *   <ConfirmAction
 *     label="Sil"
 *     confirmLabel="Evet, Sil"
 *     onConfirm={() => deleteSource(id)}
 *     variant="danger"
 *   />
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../../lib/cn";

interface ConfirmActionProps {
  /** Initial button label */
  label: string;
  /** Confirmation state label */
  confirmLabel?: string;
  /** Called on confirmed (second) click */
  onConfirm: () => void;
  /** Visual variant */
  variant?: "danger" | "warning";
  /** Button size */
  size?: "sm" | "md";
  /** Whether button is disabled */
  disabled?: boolean;
  /** Auto-reset timeout in ms. Default 3000. */
  resetTimeout?: number;
  testId?: string;
}

const variantNormal: Record<string, string> = {
  danger: "bg-error-light text-error-dark border-error/20",
  warning: "bg-warning-light text-warning-dark border-warning/20",
};

const variantConfirm: Record<string, string> = {
  danger: "bg-error text-white border-error-dark font-semibold",
  warning: "bg-warning text-white border-warning-dark font-semibold",
};

export function ConfirmAction({
  label,
  confirmLabel = "Emin misiniz?",
  onConfirm,
  variant = "danger",
  size = "sm",
  disabled = false,
  resetTimeout = 3000,
  testId,
}: ConfirmActionProps) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;

    if (!confirming) {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), resetTimeout);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirming(false);
      onConfirm();
    }
  }, [confirming, disabled, onConfirm, resetTimeout]);

  const isSmall = size === "sm";

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-md border transition-all duration-fast leading-normal whitespace-nowrap",
        isSmall ? "px-3 py-1 text-sm" : "px-4 py-2 text-base",
        "font-medium",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer",
        confirming ? variantConfirm[variant] : variantNormal[variant]
      )}
      data-testid={testId}
      aria-label={confirming ? confirmLabel : label}
    >
      {confirming ? confirmLabel : label}
    </button>
  );
}
