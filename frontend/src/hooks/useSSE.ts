/**
 * useSSE — Aurora Final Polish edition
 *
 * EventSource wrapper with React Query invalidation, an honest connection
 * state machine, and an "offline grace window" so transient drops do not
 * trigger an immediate "Çevrimdışı" UI.
 *
 * Behaviour
 *   1. `connected` flips true on the first `onopen`.
 *   2. `onerror` does NOT immediately mark us offline. We close the
 *      EventSource, schedule a reconnect with exponential backoff, and
 *      report `reconnecting` to consumers.
 *   3. Only if reconnects keep failing for `gracePeriodMs` (default 8000)
 *      do we report `offline`. Until then the UI stays calm.
 *   4. Backoff: 3s → 6s → 12s → 24s, capped at 30s. Resets on every
 *      successful `onopen`.
 *   5. Tab visibility: when the tab is hidden, browsers freeze
 *      EventSource and we may falsely think we are offline. We pause
 *      reconnect attempts on `visibilitychange:hidden` and force an
 *      immediate reconnect attempt on `visibilitychange:visible`.
 *
 * Public surface kept backward compatible:
 *   - `connected: boolean`
 *   - `reconnecting: boolean`  (true also during grace period)
 *
 * New (additive):
 *   - `offline: boolean`       (true once grace window has expired)
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface SSEEvent {
  type: string;
  data: unknown;
  /** Raw event data string before parsing */
  raw: string;
}

interface UseSSEOptions {
  /** SSE endpoint URL */
  url: string;
  /** Whether to connect. Default true. */
  enabled?: boolean;
  /** Called for each received event */
  onEvent?: (event: SSEEvent) => void;
  /** React Query keys to invalidate on any event */
  invalidateKeys?: unknown[][];
  /** Specific event types to listen to (default: all) */
  eventTypes?: string[];
  /** Initial reconnect delay in ms. Default 3000 (then 6s/12s/24s/30s). */
  reconnectDelay?: number;
  /**
   * Grace window in ms before flipping to `offline`. During the grace
   * period consumers see `reconnecting` only. Default 8000.
   */
  gracePeriodMs?: number;
}

export interface UseSSEReturn {
  /** EventSource is currently open and a handshake has completed. */
  connected: boolean;
  /** A reconnection attempt is in progress (includes the grace window). */
  reconnecting: boolean;
  /** Grace window has expired without recovery — surface offline UI. */
  offline: boolean;
}

const MAX_BACKOFF_MS = 30_000;

function nextDelay(prev: number): number {
  // 3s → 6s → 12s → 24s → 30s …
  return Math.min(prev * 2, MAX_BACKOFF_MS);
}

export function useSSE({
  url,
  enabled = true,
  onEvent,
  invalidateKeys,
  eventTypes,
  reconnectDelay = 3000,
  gracePeriodMs = 8000,
}: UseSSEOptions): UseSSEReturn {
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDelay = useRef<number>(reconnectDelay);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [offline, setOffline] = useState(false);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      let data: unknown;
      try {
        data = JSON.parse(e.data);
      } catch {
        data = e.data;
      }

      const sseEvent: SSEEvent = {
        type: e.type || "message",
        data,
        raw: e.data,
      };

      onEventRef.current?.(sseEvent);

      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
    },
    [invalidateKeys, queryClient]
  );

  useEffect(() => {
    if (!enabled) {
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnected(false);
      setReconnecting(false);
      setOffline(false);
      return;
    }

    // jsdom etc. — bail out cleanly.
    if (typeof EventSource === "undefined") {
      return;
    }

    function clearTimers() {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (graceTimer.current) {
        clearTimeout(graceTimer.current);
        graceTimer.current = null;
      }
    }

    function startGraceTimer() {
      if (graceTimer.current) return; // already running
      graceTimer.current = setTimeout(() => {
        // If we are still not connected after the grace window, flip
        // to offline. Polling fallback kicks in at the consumer layer.
        setOffline(true);
        graceTimer.current = null;
      }, gracePeriodMs);
    }

    function connect() {
      if (typeof document !== "undefined" && document.hidden) {
        // Don't keep retrying while the tab is in the background;
        // visibilitychange will re-trigger on focus.
        setReconnecting(true);
        return;
      }

      const source = new EventSource(url);
      sourceRef.current = source;

      source.onopen = () => {
        setConnected(true);
        setReconnecting(false);
        setOffline(false);
        currentDelay.current = reconnectDelay;
        if (graceTimer.current) {
          clearTimeout(graceTimer.current);
          graceTimer.current = null;
        }
      };

      if (eventTypes && eventTypes.length > 0) {
        for (const type of eventTypes) {
          source.addEventListener(type, handleMessage as EventListener);
        }
      } else {
        source.onmessage = handleMessage;
      }

      source.onerror = () => {
        source.close();
        sourceRef.current = null;
        setConnected(false);
        setReconnecting(true);
        // Don't surface "offline" yet — grace window decides.
        startGraceTimer();

        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        const delay = currentDelay.current;
        currentDelay.current = nextDelay(delay);
        reconnectTimer.current = setTimeout(connect, delay);
      };
    }

    function onVisibility() {
      if (document.hidden) return;
      // Coming back from background — if we are not connected,
      // try immediately rather than waiting out the backoff.
      if (!sourceRef.current) {
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
        connect();
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    connect();

    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
      clearTimers();
      currentDelay.current = reconnectDelay;
      setConnected(false);
      setReconnecting(false);
      setOffline(false);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, handleMessage, eventTypes?.join("|"), reconnectDelay, gracePeriodMs]);

  return { connected, reconnecting, offline };
}
