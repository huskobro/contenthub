/**
 * Surface Telemetry — lightweight, future-proof
 *
 * Faz 1 — Infrastructure only.
 *
 * The resolver calls `emitSurfaceEvent` when it picks a surface (and
 * particularly when it falls back). Faz 1 keeps the implementation deliberately
 * dumb: it writes to the in-memory ring buffer and optionally logs to the
 * console in development.
 *
 * Faz 2+ can replace the sink with a real transport (SSE event, HTTP POST,
 * or a backend audit log entry) without changing any call site.
 */

import type { ResolvedSurface, SurfaceResolutionReason, SurfaceId } from "./contract";

export interface SurfaceTelemetryEvent {
  type: "surface.resolved" | "surface.fallback" | "surface.error";
  timestamp: number;
  scope: "admin" | "user";
  requestedId: SurfaceId | null;
  resolvedId: SurfaceId;
  reason: SurfaceResolutionReason;
  didFallback: boolean;
  message?: string;
}

const RING_BUFFER_SIZE = 50;
const buffer: SurfaceTelemetryEvent[] = [];

type Sink = (event: SurfaceTelemetryEvent) => void;
let customSink: Sink | null = null;

/**
 * Install a custom telemetry sink. Passing null removes the sink.
 * Returns the previously installed sink (or null).
 */
export function setSurfaceTelemetrySink(sink: Sink | null): Sink | null {
  const prev = customSink;
  customSink = sink;
  return prev;
}

/**
 * Emit a surface telemetry event.
 *
 * Safe to call at any time — never throws.
 */
export function emitSurfaceEvent(event: Omit<SurfaceTelemetryEvent, "timestamp">): void {
  const full: SurfaceTelemetryEvent = { ...event, timestamp: Date.now() };

  // Ring buffer
  buffer.push(full);
  if (buffer.length > RING_BUFFER_SIZE) {
    buffer.shift();
  }

  // Custom sink (guarded)
  if (customSink) {
    try {
      customSink(full);
    } catch {
      // Sinks must never break callers.
    }
  }

  // Dev console output — guarded via import.meta.env so we don't depend on
  // @types/node.
  try {
    const meta = import.meta as unknown as { env?: { DEV?: boolean; MODE?: string } };
    if (meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug(
        `[surface.${event.type}] scope=${event.scope} requested=${event.requestedId ?? "-"} resolved=${event.resolvedId} reason=${event.reason}`,
      );
    }
  } catch {
    /* ignore */
  }
}

/**
 * Helper: convert a ResolvedSurface into a telemetry event and emit it.
 */
export function emitResolution(
  resolved: ResolvedSurface,
  message?: string,
): void {
  emitSurfaceEvent({
    type: resolved.didFallback ? "surface.fallback" : "surface.resolved",
    scope: resolved.scope,
    requestedId: resolved.requestedId,
    resolvedId: resolved.surface.manifest.id,
    reason: resolved.reason,
    didFallback: resolved.didFallback,
    message,
  });
}

/** Test helper — returns a copy of the current buffer. */
export function __getSurfaceTelemetryBuffer(): SurfaceTelemetryEvent[] {
  return [...buffer];
}

/** Test helper — clears the buffer. */
export function __clearSurfaceTelemetryBuffer(): void {
  buffer.length = 0;
}
