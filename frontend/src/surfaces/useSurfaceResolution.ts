/**
 * useSurfaceResolution — shared hook for resolving the active surface(s).
 *
 * Faz 1 — Infrastructure only.
 *
 * This hook is the single source of truth for turning "theme store state +
 * effective settings" into a `ResolvedSurface`. Both the top-level
 * DynamicAdminLayout/DynamicUserLayout (which run BEFORE ThemeProvider has
 * mounted its SurfaceProvider) AND the SurfaceProvider itself (which runs
 * INSIDE the already-rendered layout tree) use this hook. They cannot share
 * a React context reliably because of that ordering constraint, so the hook
 * is designed to be called in both places with consistent outputs.
 *
 * Settings are cached in a module-level snapshot so repeated mounts do not
 * re-fetch. The snapshot is refreshed lazily on first use, and every instance
 * of the hook subscribes to a lightweight listener set so an admin settings
 * update propagates to all consumers.
 */

import { useEffect, useMemo, useState } from "react";
import { useThemeStore } from "../stores/themeStore";
import { fetchEffectiveSetting } from "../api/effectiveSettingsApi";
import type { ResolvedSurface, SurfaceId } from "./contract";
import { resolveActiveSurface } from "./resolveActiveSurface";
import { emitResolution } from "./telemetry";
// Side-effect import: registers the built-in surfaces. Safe to import here
// because register.ts uses lazy forwarders for layout bindings, so there is
// no circular-import crash even if AdminLayout is still mid-evaluation.
import "./manifests/register";

// ---------------------------------------------------------------------------
// Module-level settings snapshot
// ---------------------------------------------------------------------------

export interface SurfaceSettingsSnapshot {
  infrastructureEnabled: boolean;
  defaultAdmin: SurfaceId | null;
  defaultUser: SurfaceId | null;
  atriumEnabled: boolean;
  bridgeEnabled: boolean;
  canvasEnabled: boolean;
  auroraEnabled: boolean;
  loaded: boolean;
}

const DEFAULT_SNAPSHOT: SurfaceSettingsSnapshot = {
  infrastructureEnabled: false,
  defaultAdmin: null,
  defaultUser: null,
  atriumEnabled: false,
  bridgeEnabled: false,
  canvasEnabled: false,
  auroraEnabled: false,
  loaded: false,
};

// LocalStorage cache: eliminates the first-paint flash on reload. On module
// load we synchronously read the last known server snapshot and seed the
// in-memory one with it, marked as `loaded: true` (optimistic). The real
// fetch still runs and overrides this cache when it returns. Staleness is
// bounded because the admin settings API is called on every page mount —
// within one request the cache is refreshed.
const CACHE_KEY = "contenthub:surface-settings-snapshot-v1";

function readCachedSnapshot(): SurfaceSettingsSnapshot | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SurfaceSettingsSnapshot> & { v?: number };
    if (parsed?.v !== 1) return null;
    return {
      infrastructureEnabled: Boolean(parsed.infrastructureEnabled),
      defaultAdmin: (parsed.defaultAdmin ?? null) as SurfaceId | null,
      defaultUser: (parsed.defaultUser ?? null) as SurfaceId | null,
      atriumEnabled: Boolean(parsed.atriumEnabled),
      bridgeEnabled: Boolean(parsed.bridgeEnabled),
      canvasEnabled: Boolean(parsed.canvasEnabled),
      auroraEnabled: Boolean(parsed.auroraEnabled),
      loaded: true,
    };
  } catch {
    return null;
  }
}

function writeCachedSnapshot(s: SurfaceSettingsSnapshot): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ v: 1, ...s })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

// Seed the in-memory snapshot synchronously from cache at module load time.
// If no cache exists, stays at DEFAULT_SNAPSHOT (loaded:false) and the first
// paint falls back to legacy — same behavior as before for first-time users.
const cachedSeed = readCachedSnapshot();
let snapshot: SurfaceSettingsSnapshot = cachedSeed ?? DEFAULT_SNAPSHOT;
let pendingLoad: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

async function loadSnapshot(): Promise<void> {
  try {
    const [infra, defAdmin, defUser, atrium, bridge, canvas, aurora] = await Promise.all([
      fetchEffectiveSetting("ui.surface.infrastructure.enabled").catch(() => null),
      fetchEffectiveSetting("ui.surface.default.admin").catch(() => null),
      fetchEffectiveSetting("ui.surface.default.user").catch(() => null),
      fetchEffectiveSetting("ui.surface.atrium.enabled").catch(() => null),
      fetchEffectiveSetting("ui.surface.bridge.enabled").catch(() => null),
      fetchEffectiveSetting("ui.surface.canvas.enabled").catch(() => null),
      fetchEffectiveSetting("ui.surface.aurora.enabled").catch(() => null),
    ]);
    snapshot = {
      infrastructureEnabled: Boolean(infra?.effective_value),
      defaultAdmin:
        typeof defAdmin?.effective_value === "string" ? (defAdmin.effective_value as SurfaceId) : null,
      defaultUser:
        typeof defUser?.effective_value === "string" ? (defUser.effective_value as SurfaceId) : null,
      atriumEnabled: Boolean(atrium?.effective_value),
      bridgeEnabled: Boolean(bridge?.effective_value),
      canvasEnabled: Boolean(canvas?.effective_value),
      auroraEnabled: Boolean(aurora?.effective_value),
      loaded: true,
    };
  } catch {
    snapshot = { ...DEFAULT_SNAPSHOT, loaded: true };
  }
  writeCachedSnapshot(snapshot);
  notifyListeners();
}

function ensureLoaded() {
  if (snapshot.loaded) return;
  if (!pendingLoad) {
    pendingLoad = loadSnapshot().finally(() => {
      pendingLoad = null;
    });
  }
}

/**
 * Test hook: force a snapshot (bypassing the fetch). Used by unit tests.
 */
export function __setSurfaceSettingsSnapshot(next: SurfaceSettingsSnapshot): void {
  snapshot = { ...next };
  notifyListeners();
}

/** Test hook: clear the snapshot back to defaults. */
export function __resetSurfaceSettingsSnapshot(): void {
  snapshot = DEFAULT_SNAPSHOT;
  notifyListeners();
}

/** Test hook: read the raw snapshot (does not trigger a fetch). */
export function __getSurfaceSettingsSnapshot(): SurfaceSettingsSnapshot {
  return snapshot;
}

// ---------------------------------------------------------------------------
// Forced surface id helper (dev / env override)
// ---------------------------------------------------------------------------

function readForcedSurfaceId(): SurfaceId | null {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    const value = meta.env?.["VITE_FORCE_SURFACE_ID"];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

// ---------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------

export interface UseSurfaceResolutionResult {
  admin: ResolvedSurface;
  user: ResolvedSurface;
  settings: SurfaceSettingsSnapshot;
  infrastructureEnabled: boolean;
}

export function useSurfaceResolution(): UseSurfaceResolutionResult {
  const activeSurfaceId = useThemeStore((s) => s.activeSurfaceId);
  const activeTheme = useThemeStore((s) => s.activeTheme);

  const [tick, setTick] = useState(0);

  // Subscribe to snapshot changes.
  useEffect(() => {
    ensureLoaded();
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // tick is intentionally part of the deps (implicitly) via state update.
  // Referencing it in the memo keys the memo to each snapshot change.
  const currentSnapshot = snapshot;
  void tick;

  const enabledSurfaceIds = useMemo<ReadonlySet<SurfaceId>>(() => {
    const set = new Set<SurfaceId>();
    set.add("legacy");
    set.add("horizon");
    if (currentSnapshot.atriumEnabled) set.add("atrium");
    if (currentSnapshot.bridgeEnabled) set.add("bridge");
    if (currentSnapshot.canvasEnabled) set.add("canvas");
    if (currentSnapshot.auroraEnabled) set.add("aurora");
    return set;
  }, [
    currentSnapshot.atriumEnabled,
    currentSnapshot.bridgeEnabled,
    currentSnapshot.canvasEnabled,
    currentSnapshot.auroraEnabled,
  ]);

  const legacyLayoutMode = useMemo(() => {
    const t = activeTheme();
    return t.layoutMode ?? "classic";
  }, [activeTheme]);

  const forcedSurfaceId = useMemo(() => readForcedSurfaceId(), []);

  const admin = useMemo<ResolvedSurface>(
    () =>
      resolveActiveSurface({
        scope: "admin",
        infrastructureEnabled: currentSnapshot.infrastructureEnabled,
        forcedSurfaceId,
        userSurfaceId: activeSurfaceId ?? null,
        roleDefaultId: currentSnapshot.defaultAdmin,
        globalDefaultId: null,
        enabledSurfaceIds,
        legacyLayoutMode,
      }),
    [
      currentSnapshot.infrastructureEnabled,
      currentSnapshot.defaultAdmin,
      forcedSurfaceId,
      activeSurfaceId,
      enabledSurfaceIds,
      legacyLayoutMode,
    ],
  );

  const user = useMemo<ResolvedSurface>(
    () =>
      resolveActiveSurface({
        scope: "user",
        infrastructureEnabled: currentSnapshot.infrastructureEnabled,
        forcedSurfaceId,
        userSurfaceId: activeSurfaceId ?? null,
        roleDefaultId: currentSnapshot.defaultUser,
        globalDefaultId: null,
        enabledSurfaceIds,
        legacyLayoutMode,
      }),
    [
      currentSnapshot.infrastructureEnabled,
      currentSnapshot.defaultUser,
      forcedSurfaceId,
      activeSurfaceId,
      enabledSurfaceIds,
      legacyLayoutMode,
    ],
  );

  useEffect(() => {
    emitResolution(admin);
  }, [admin]);
  useEffect(() => {
    emitResolution(user);
  }, [user]);

  return {
    admin,
    user,
    settings: currentSnapshot,
    infrastructureEnabled: currentSnapshot.infrastructureEnabled,
  };
}
