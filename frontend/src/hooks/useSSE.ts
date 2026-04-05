/**
 * useSSE — Wave 1
 *
 * EventSource wrapper that integrates with React Query invalidation.
 * Connects to a server-sent events endpoint, parses events, and
 * optionally invalidates React Query keys or calls custom handlers.
 *
 * Usage:
 *   useSSE({
 *     url: "/api/v1/jobs/123/events",
 *     enabled: true,
 *     onEvent: (event) => { ... },
 *     invalidateKeys: [["job", "123"]],
 *   });
 */

import { useEffect, useRef, useCallback } from "react";
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
  /** Reconnect delay in ms after connection loss. Default 3000. */
  reconnectDelay?: number;
}

export function useSSE({
  url,
  enabled = true,
  onEvent,
  invalidateKeys,
  eventTypes,
  reconnectDelay = 3000,
}: UseSSEOptions): void {
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

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

      // Call user handler
      onEventRef.current?.(sseEvent);

      // Invalidate React Query keys
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
      return;
    }

    // Guard: EventSource not available in test environments (jsdom)
    if (typeof EventSource === "undefined") {
      return;
    }

    function connect() {
      const source = new EventSource(url);
      sourceRef.current = source;

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

        // Auto-reconnect
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connect, reconnectDelay);
      };
    }

    connect();

    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [url, enabled, handleMessage, eventTypes, reconnectDelay]);
}
