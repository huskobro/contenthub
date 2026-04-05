/**
 * Utility for merging Tailwind CSS class names.
 * Combines clsx (conditional joining) with tailwind-merge (deduplication).
 *
 * Usage:
 *   cn("px-4 py-2", isActive && "bg-brand-100", className)
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
