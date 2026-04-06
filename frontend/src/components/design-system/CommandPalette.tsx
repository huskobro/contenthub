/**
 * Command Palette — Wave 2 / M25 + Contextual & Discovery enhancements (Tailwind migration)
 *
 * Cmd+K / Ctrl+K triggered overlay with real search + navigation.
 * - Keyboard-first: arrow keys, enter, escape
 * - Visibility-aware: commands with visibilityKey are filtered
 * - Context-aware: commands with contextRoutes only show on matching routes
 * - Discovery: server-backed search results when query is 2+ chars
 * - Focus trapped inside palette when open
 * - Integrates with keyboard scope stack and dismiss stack
 */

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  useCommandPaletteStore,
  filterCommands,
  type Command,
  type CommandCategory,
} from "../../stores/commandPaletteStore";
import { useKeyboardStore } from "../../stores/keyboardStore";
import { useVisibility } from "../../hooks/useVisibility";
import { useEnabledModules } from "../../hooks/useEnabledModules";
import { useDismissStack } from "../../hooks/useDismissStack";
import { useDiscoverySearch } from "../../hooks/useDiscoverySearch";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Scope ID
// ---------------------------------------------------------------------------

const SCOPE_ID = "command-palette";

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: "Gezinti",
  action: "Eylem",
  search: "Arama",
  settings: "Ayarlar",
  theme: "Tema",
};

const CATEGORY_ORDER: CommandCategory[] = [
  "action",
  "navigation",
  "settings",
  "theme",
  "search",
];

// ---------------------------------------------------------------------------
// Discovery group label (not a CommandCategory)
// ---------------------------------------------------------------------------

const DISCOVERY_GROUP_LABEL = "Bulunan Kayitlar";

// ---------------------------------------------------------------------------
// Visibility-aware command filter hook
// ---------------------------------------------------------------------------

function useVisibilityFilteredCommands(commands: Command[]): Command[] {
  const vis_settings = useVisibility("panel:settings");
  const vis_visibility = useVisibility("panel:visibility");
  const vis_templates = useVisibility("panel:templates");
  const vis_analytics = useVisibility("panel:analytics");
  const vis_sources = useVisibility("panel:sources");
  const { enabledMap } = useEnabledModules();

  const visMap: Record<string, boolean> = useMemo(
    () => ({
      "panel:settings": vis_settings.visible,
      "panel:visibility": vis_visibility.visible,
      "panel:templates": vis_templates.visible,
      "panel:analytics": vis_analytics.visible,
      "panel:sources": vis_sources.visible,
    }),
    [
      vis_settings.visible,
      vis_visibility.visible,
      vis_templates.visible,
      vis_analytics.visible,
      vis_sources.visible,
    ]
  );

  return useMemo(
    () =>
      commands.filter((cmd) => {
        if (cmd.visibilityKey && visMap[cmd.visibilityKey] === false) return false;
        if (cmd.moduleId && enabledMap[cmd.moduleId] === false) return false;
        return true;
      }),
    [commands, visMap, enabledMap]
  );
}

// ---------------------------------------------------------------------------
// Group commands by category
// ---------------------------------------------------------------------------

interface CommandGroup {
  category: CommandCategory | "discovery";
  label: string;
  commands: Command[];
}

function groupCommands(commands: Command[]): CommandGroup[] {
  const groups: Map<CommandCategory, Command[]> = new Map();

  for (const cmd of commands) {
    const existing = groups.get(cmd.category) || [];
    existing.push(cmd);
    groups.set(cmd.category, existing);
  }

  return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    commands: groups.get(cat)!,
  }));
}

// ---------------------------------------------------------------------------
// Command Palette Component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const {
    isOpen,
    query,
    selectedIndex,
    commands,
    context,
    close,
    setQuery,
    setSelectedIndex,
    executeSelected,
  } = useCommandPaletteStore();

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Discovery search (debounced, 2+ chars)
  const { discoveryCommands, isLoading: discoveryLoading, hasSearched: discoverySearched } =
    useDiscoverySearch(query, navigate);

  // Filter by visibility
  const visibleCommands = useVisibilityFilteredCommands(commands);

  // Filter by search query + context
  const filtered = useMemo(
    () => filterCommands(visibleCommands, query, context),
    [visibleCommands, query, context]
  );

  // Group static commands for display
  const staticGroups = useMemo(() => groupCommands(filtered), [filtered]);

  // Build discovery group (only when query >= 2 chars)
  const showDiscovery = query.trim().length >= 2;
  const discoveryGroup: CommandGroup | null = useMemo(() => {
    if (!showDiscovery || discoveryCommands.length === 0) return null;
    return {
      category: "discovery" as const,
      label: DISCOVERY_GROUP_LABEL,
      commands: discoveryCommands,
    };
  }, [showDiscovery, discoveryCommands]);

  // All groups: discovery at top, then static
  const allGroups = useMemo(() => {
    const groups: CommandGroup[] = [];
    if (discoveryGroup) groups.push(discoveryGroup);
    groups.push(...staticGroups);
    return groups;
  }, [discoveryGroup, staticGroups]);

  // Flat list for index tracking
  const flatList = useMemo(
    () => allGroups.flatMap((g) => g.commands),
    [allGroups]
  );

  // Keyboard scope
  useEffect(() => {
    if (isOpen) {
      useKeyboardStore.getState().pushScope({ id: SCOPE_ID, label: "Command Palette" });
    } else {
      useKeyboardStore.getState().popScope(SCOPE_ID);
    }
    return () => {
      useKeyboardStore.getState().popScope(SCOPE_ID);
    };
  }, [isOpen]);

  // Dismiss stack (ESC priority)
  useDismissStack(SCOPE_ID, isOpen, close);

  // Auto-focus input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      `[data-palette-index="${selectedIndex}"]`
    );
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, flatList.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatList.length > 0 && flatList[selectedIndex]) {
            flatList[selectedIndex].action();
            close();
          }
          break;
        case "Tab":
          e.preventDefault();
          break;
      }
    },
    [selectedIndex, flatList, setSelectedIndex, close]
  );

  // Precompute index map: command id -> flat index
  const indexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatList.forEach((cmd, i) => map.set(cmd.id, i));
    return map;
  }, [flatList]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-command-palette flex items-start justify-center pt-[min(20vh,160px)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      data-testid="command-palette-overlay"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[rgba(15,17,26,0.6)] backdrop-blur-[8px]"
        onClick={close}
      />

      {/* Palette panel */}
      <div
        role="dialog"
        aria-label="Komut Paleti"
        aria-modal="true"
        className="relative w-[min(560px,90vw)] max-h-[min(480px,70vh)] flex flex-col bg-surface-card border border-border-subtle rounded-xl overflow-hidden animate-palette-enter"
        style={{
          boxShadow: "0 20px 60px rgba(0,0,0,0.20), 0 8px 20px rgba(0,0,0,0.12)",
        }}
        onKeyDown={handleKeyDown}
        data-testid="command-palette"
      >
        {/* Brand accent strip */}
        <div className="h-[2px] bg-gradient-to-r from-brand-400 to-brand-600 shrink-0" />

        {/* Search input */}
        <div className="flex items-center px-5 py-4 border-b border-border-subtle gap-3">
          <span
            className={cn(
              "text-neutral-500 text-md shrink-0 w-7 h-7 flex items-center justify-center bg-neutral-100 rounded-full",
              discoveryLoading && "animate-palette-pulse"
            )}
          >
            {discoveryLoading ? "⏳" : "⌘"}
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Komut veya sayfa ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-none outline-none bg-transparent text-md text-neutral-900 font-body leading-normal py-1"
            data-testid="command-palette-input"
            aria-label="Komut ara"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="text-xs text-neutral-500 bg-neutral-100 px-2 py-[0.15rem] rounded-sm border border-neutral-200 shadow-xs font-mono leading-normal">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto py-2"
          role="listbox"
          aria-label="Komutlar"
          data-testid="command-palette-list"
        >
          {/* Empty state */}
          {flatList.length === 0 && !discoveryLoading && (
            <div
              className="px-5 py-8 text-center text-neutral-500 text-sm flex flex-col items-center gap-2"
              data-testid="command-palette-empty"
            >
              <span className="text-2xl text-neutral-300 leading-none">
                {"🔍"}
              </span>
              {showDiscovery && discoverySearched
                ? "Sonuc bulunamadi."
                : "Sonuc bulunamadi."}
            </div>
          )}

          {/* Discovery loading indicator */}
          {showDiscovery && discoveryLoading && flatList.length === 0 && (
            <div
              className="px-5 py-6 text-center text-neutral-400 text-sm flex flex-col items-center gap-2"
              data-testid="command-palette-discovery-loading"
            >
              <span className="animate-palette-pulse">
                {"⏳"}
              </span>
              {`Aranıyor...`}
            </div>
          )}

          {allGroups.map((group) => {
            const isDiscoveryGroup = group.category === "discovery";
            return (
            <div key={group.category}>
              <div
                className={cn(
                  "px-5 pt-2 pb-1 text-xs font-semibold uppercase tracking-[0.05em] flex items-center gap-2",
                  isDiscoveryGroup ? "text-brand-500" : "text-neutral-400"
                )}
              >
                {isDiscoveryGroup && (
                  <span className="w-[2px] h-3 bg-brand-500 rounded-full shrink-0" />
                )}
                {group.label}
              </div>
              {group.commands.map((cmd) => {
                const itemIndex = indexMap.get(cmd.id) ?? 0;
                const isSelected = selectedIndex === itemIndex;
                const isDiscovery = group.category === "discovery";
                return (
                  <CommandItem
                    key={cmd.id}
                    command={cmd}
                    isSelected={isSelected}
                    index={itemIndex}
                    isDiscovery={isDiscovery}
                    onSelect={() => {
                      cmd.action();
                      close();
                    }}
                    onHover={() => setSelectedIndex(itemIndex)}
                  />
                );
              })}
            </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-border-subtle flex gap-4 text-sm text-neutral-400 bg-neutral-25">
          <span className="flex items-center gap-1">
            <kbd className="font-mono text-xs bg-neutral-100 px-[0.4rem] py-[0.15rem] rounded-sm border border-neutral-200 shadow-xs leading-normal">{"↑↓"}</kbd> gezin
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono text-xs bg-neutral-100 px-[0.4rem] py-[0.15rem] rounded-sm border border-neutral-200 shadow-xs leading-normal">{"↵"}</kbd> calistir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono text-xs bg-neutral-100 px-[0.4rem] py-[0.15rem] rounded-sm border border-neutral-200 shadow-xs leading-normal">esc</kbd> kapat
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// CommandItem
// ---------------------------------------------------------------------------

interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  index: number;
  isDiscovery?: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function CommandItem({
  command,
  isSelected,
  index,
  isDiscovery,
  onSelect,
  onHover,
}: CommandItemProps) {
  // For discovery items, show status badge if keywords contain a status
  const statusBadge =
    isDiscovery && command.keywords && command.keywords.length > 1
      ? command.keywords[1]
      : null;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-palette-index={index}
      onClick={onSelect}
      onMouseMove={onHover}
      className={cn(
        "flex items-center gap-3 px-5 py-2 cursor-pointer border-l-[3px] transition-all duration-fast",
        isSelected
          ? "bg-brand-50 border-l-brand-500"
          : "bg-transparent border-l-transparent"
      )}
      data-testid={`command-palette-item-${command.id}`}
    >
      {command.icon && (
        <span
          className={cn(
            "text-sm shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors duration-fast",
            isSelected ? "bg-brand-100" : "bg-neutral-100"
          )}
        >
          {command.icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-base leading-tight overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-fast",
            isSelected
              ? "text-brand-800 font-medium"
              : "text-neutral-800 font-normal"
          )}
        >
          {command.label}
        </div>
        {command.description && (
          <div className="text-xs text-neutral-500 leading-normal overflow-hidden text-ellipsis whitespace-nowrap">
            {command.description}
          </div>
        )}
      </div>
      {/* Status badge for discovery results */}
      {statusBadge && (
        <span className="text-xs text-neutral-600 bg-neutral-50 px-[0.4rem] py-[0.1rem] rounded-full shrink-0">
          {statusBadge}
        </span>
      )}
      {/* Category badge */}
      <span className="text-xs text-neutral-400 bg-neutral-50 px-[0.4rem] py-[0.1rem] rounded-full shrink-0 capitalize">
        {isDiscovery ? "Sonuc" : CATEGORY_LABELS[command.category]}
      </span>
    </div>
  );
}
