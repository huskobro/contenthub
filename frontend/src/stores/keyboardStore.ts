/**
 * Keyboard Navigation Store — Wave 1
 *
 * Manages a LIFO scope stack for keyboard navigation.
 * Only the topmost scope receives keyboard events.
 * This prevents conflicts when overlays (Sheet, QuickLook, modals) are nested.
 *
 * Pattern: push scope on open → pop scope on close
 */

import { create } from "zustand";

export interface KeyboardScope {
  /** Unique identifier for this scope (e.g. "jobs-table", "sheet-detail", "quicklook") */
  id: string;
  /** Human-readable label for debugging */
  label?: string;
}

interface KeyboardState {
  /** LIFO stack — last element is the active scope */
  scopeStack: KeyboardScope[];

  /** Push a new scope onto the stack (e.g. when opening a Sheet) */
  pushScope: (scope: KeyboardScope) => void;

  /** Pop the topmost scope (e.g. when closing a Sheet) */
  popScope: (id: string) => void;

  /** Check if a given scope is the active (topmost) one */
  isActiveScope: (id: string) => boolean;

  /** Get the current active scope, or null if stack is empty */
  activeScope: () => KeyboardScope | null;
}

export const useKeyboardStore = create<KeyboardState>((set, get) => ({
  scopeStack: [],

  pushScope: (scope) =>
    set((state) => ({
      scopeStack: [...state.scopeStack.filter((s) => s.id !== scope.id), scope],
    })),

  popScope: (id) =>
    set((state) => ({
      scopeStack: state.scopeStack.filter((s) => s.id !== id),
    })),

  isActiveScope: (id) => {
    const stack = get().scopeStack;
    return stack.length > 0 && stack[stack.length - 1].id === id;
  },

  activeScope: () => {
    const stack = get().scopeStack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },
}));
