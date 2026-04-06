/**
 * Shared status and enum constants used across form components.
 * Single source of truth — form components import from here instead of
 * hardcoding option arrays locally.
 */

// --- Source ---
export const SOURCE_STATUSES = ["active", "paused", "archived"] as const;
export const SOURCE_TYPES = ["rss", "manual_url", "api"] as const;
export const TRUST_LEVELS = ["", "low", "medium", "high"] as const;
export const SCAN_MODES = ["", "manual", "auto", "curated"] as const;
/** Scan modes without the empty option (for required fields) */
export const SCAN_MODES_REQUIRED = ["manual", "auto", "curated"] as const;

// --- Source Scan ---
export const SCAN_STATUSES = ["queued", "running", "done", "failed", "cancelled"] as const;

// --- Template ---
export const TEMPLATE_TYPES = ["style", "content", "publish"] as const;
export const OWNER_SCOPES = ["system", "admin", "user"] as const;
export const TEMPLATE_STATUSES = ["draft", "active", "archived"] as const;

// --- Style Blueprint ---
export const BLUEPRINT_STATUSES = ["draft", "active", "archived"] as const;

// --- Template-Style Link ---
export const LINK_ROLES = ["primary", "fallback", "experimental"] as const;
export const LINK_STATUSES = ["active", "inactive", "archived"] as const;
