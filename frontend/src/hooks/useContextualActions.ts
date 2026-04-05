/**
 * Contextual Actions — Pub/Sub system for command palette → page communication.
 *
 * Commands in the palette dispatch actions by id; pages subscribe to handle them.
 * This decouples the command registry from page-specific state (filters, focus, etc.).
 *
 * Usage:
 *   // In a command: dispatchAction("jobs:filter-failed")
 *   // In the Jobs page: useContextualActionListener("jobs:filter-failed", () => setFilter("failed"))
 */

import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Event bus (module-scoped, not global window events)
// ---------------------------------------------------------------------------

type ActionHandler = (payload?: unknown) => void;

const listeners = new Map<string, Set<ActionHandler>>();

function subscribe(actionId: string, handler: ActionHandler): () => void {
  if (!listeners.has(actionId)) {
    listeners.set(actionId, new Set());
  }
  listeners.get(actionId)!.add(handler);

  return () => {
    const set = listeners.get(actionId);
    if (set) {
      set.delete(handler);
      if (set.size === 0) listeners.delete(actionId);
    }
  };
}

/**
 * Dispatch a contextual action. Any subscribed page handler will execute.
 */
export function dispatchAction(actionId: string, payload?: unknown): void {
  const handlers = listeners.get(actionId);
  if (handlers) {
    for (const handler of handlers) {
      handler(payload);
    }
  }
}

/**
 * React hook — subscribe to a contextual action on mount, unsubscribe on unmount.
 */
export function useContextualActionListener(
  actionId: string,
  handler: ActionHandler
): void {
  useEffect(() => {
    return subscribe(actionId, handler);
  }, [actionId, handler]);
}
