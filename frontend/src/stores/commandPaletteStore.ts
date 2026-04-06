/**
 * Command Palette Store — Wave 2 / M25
 *
 * Zustand store for command palette (Cmd+K / Ctrl+K) state.
 * Manages: open/close, search query, filtered commands, selection index.
 *
 * Commands are registered declaratively and filtered by:
 * - search query match (label + keywords)
 * - visibility (server-side visibility rules)
 * - context (current route / active panel)
 */

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Command types
// ---------------------------------------------------------------------------

export type CommandCategory =
  | "navigation"
  | "action"
  | "search"
  | "settings"
  | "theme";

export interface Command {
  /** Unique stable id, e.g. "nav:admin-settings" */
  id: string;
  /** User-facing label, e.g. "Ayarlar" */
  label: string;
  /** Category for grouping */
  category: CommandCategory;
  /** Optional keywords for search matching (not displayed) */
  keywords?: string[];
  /** Optional icon hint (emoji or short text) */
  icon?: string;
  /** Optional description shown below the label */
  description?: string;
  /** If set, command is only visible when this visibility key allows it */
  visibilityKey?: string;
  /** If set, command is hidden when the module is disabled */
  moduleId?: string;
  /** If set, command only appears when currentRoute matches one of these routes */
  contextRoutes?: string[];
  /** Execute the command */
  action: () => void;
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export interface CommandPaletteContext {
  currentRoute: string;
}

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

interface CommandPaletteState {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** Currently highlighted command index */
  selectedIndex: number;
  /** Registered commands (source of truth) */
  commands: Command[];
  /** Current context (route, etc.) for contextual filtering */
  context: CommandPaletteContext;

  // -- Actions --
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (q: string) => void;
  setSelectedIndex: (i: number) => void;
  setContext: (ctx: CommandPaletteContext) => void;
  registerCommands: (cmds: Command[]) => void;
  unregisterCommands: (ids: string[]) => void;
  /** Execute the currently selected command and close */
  executeSelected: () => void;
  /** Execute a specific command by id */
  executeCommand: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Search / filter helpers
// ---------------------------------------------------------------------------

function normalizeForSearch(text: string): string {
  // Replace Turkish special chars BEFORE toLowerCase to avoid İ→i̇ issues
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o");
}

export function filterCommands(
  commands: Command[],
  query: string,
  context?: CommandPaletteContext
): Command[] {
  // First filter by context routes
  let filtered = commands;
  if (context) {
    filtered = commands.filter((cmd) => {
      if (!cmd.contextRoutes || cmd.contextRoutes.length === 0) return true;
      return cmd.contextRoutes.some((route) => context.currentRoute.startsWith(route));
    });
  }

  if (!query.trim()) return filtered;

  const normalized = normalizeForSearch(query);
  const terms = normalized.split(/\s+/).filter(Boolean);

  return filtered.filter((cmd) => {
    const searchable = normalizeForSearch(
      [cmd.label, cmd.description, ...(cmd.keywords || [])].filter(Boolean).join(" ")
    );
    return terms.every((term) => searchable.includes(term));
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  isOpen: false,
  query: "",
  selectedIndex: 0,
  commands: [],
  context: { currentRoute: "/" },

  open: () => set({ isOpen: true, query: "", selectedIndex: 0 }),
  close: () => set({ isOpen: false, query: "", selectedIndex: 0 }),
  toggle: () => {
    const current = get().isOpen;
    if (current) {
      set({ isOpen: false, query: "", selectedIndex: 0 });
    } else {
      set({ isOpen: true, query: "", selectedIndex: 0 });
    }
  },

  setQuery: (q) => set({ query: q, selectedIndex: 0 }),
  setSelectedIndex: (i) => set({ selectedIndex: i }),
  setContext: (ctx) => set({ context: ctx }),

  registerCommands: (cmds) =>
    set((state) => {
      const existingIds = new Set(state.commands.map((c) => c.id));
      const newCmds = cmds.filter((c) => !existingIds.has(c.id));
      const updatedCmds = state.commands.map((existing) => {
        const replacement = cmds.find((c) => c.id === existing.id);
        return replacement || existing;
      });
      return { commands: [...updatedCmds, ...newCmds] };
    }),

  unregisterCommands: (ids) =>
    set((state) => ({
      commands: state.commands.filter((c) => !ids.includes(c.id)),
    })),

  executeSelected: () => {
    const { commands, query, selectedIndex, context } = get();
    const filtered = filterCommands(commands, query, context);
    const cmd = filtered[selectedIndex];
    if (cmd) {
      cmd.action();
      set({ isOpen: false, query: "", selectedIndex: 0 });
    }
  },

  executeCommand: (id) => {
    const cmd = get().commands.find((c) => c.id === id);
    if (cmd) {
      cmd.action();
      set({ isOpen: false, query: "", selectedIndex: 0 });
    }
  },
}));
