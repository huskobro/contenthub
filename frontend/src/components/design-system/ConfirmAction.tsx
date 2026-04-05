/**
 * ConfirmAction — Wave 1
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
import { colors, typography, spacing, radius, transition } from "./tokens";

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
      // First click — enter confirmation state
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), resetTimeout);
    } else {
      // Second click — execute
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirming(false);
      onConfirm();
    }
  }, [confirming, disabled, onConfirm, resetTimeout]);

  const isSmall = size === "sm";
  const isDanger = variant === "danger";

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
    padding: isSmall ? `${spacing[1]} ${spacing[3]}` : `${spacing[2]} ${spacing[4]}`,
    fontSize: isSmall ? typography.size.sm : typography.size.base,
    fontWeight: typography.weight.medium,
    borderRadius: radius.md,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: `all ${transition.fast}`,
    lineHeight: 1.5,
    whiteSpace: "nowrap",
    border: "1px solid transparent",
  };

  const normalStyle: React.CSSProperties = {
    ...baseStyle,
    background: isDanger ? colors.error.light : colors.warning.light,
    color: isDanger ? colors.error.dark : colors.warning.dark,
    borderColor: isDanger ? `${colors.error.base}20` : `${colors.warning.base}20`,
  };

  const confirmingStyle: React.CSSProperties = {
    ...baseStyle,
    background: isDanger ? colors.error.base : colors.warning.base,
    color: "#ffffff",
    borderColor: isDanger ? colors.error.dark : colors.warning.dark,
    fontWeight: typography.weight.semibold,
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={confirming ? confirmingStyle : normalStyle}
      data-testid={testId}
      aria-label={confirming ? confirmLabel : label}
    >
      {confirming ? confirmLabel : label}
    </button>
  );
}
