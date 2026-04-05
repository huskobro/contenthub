/**
 * Command Palette — Wave 2 / M25 + Contextual & Discovery enhancements
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
import { useDismissStack } from "../../hooks/useDismissStack";
import { useDiscoverySearch } from "../../hooks/useDiscoverySearch";
import {
  colors,
  typography,
  spacing,
  radius,
  shadow,
  transition,
  zIndex,
} from "./tokens";

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
  // Query visibility for each key (unconditional hooks — stable count via useMemo)
  const vis_settings = useVisibility("panel:settings");
  const vis_visibility = useVisibility("panel:visibility");
  const vis_templates = useVisibility("panel:templates");
  const vis_analytics = useVisibility("panel:analytics");
  const vis_sources = useVisibility("panel:sources");

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
        if (!cmd.visibilityKey) return true;
        return visMap[cmd.visibilityKey] !== false;
      }),
    [commands, visMap]
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
        // ESC is handled by useDismissStack
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: zIndex.commandPalette,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "min(20vh, 160px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      data-testid="command-palette-overlay"
    >
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 17, 26, 0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={close}
      />

      {/* Palette panel */}
      <div
        role="dialog"
        aria-label="Komut Paleti"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(560px, 90vw)",
          maxHeight: "min(480px, 70vh)",
          display: "flex",
          flexDirection: "column",
          background: colors.surface.card,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.xl,
          boxShadow: "0 20px 60px rgba(0,0,0,0.20), 0 8px 20px rgba(0,0,0,0.12)",
          overflow: "hidden",
          animation: "palette-enter 120ms ease-out",
        }}
        onKeyDown={handleKeyDown}
        data-testid="command-palette"
      >
        {/* Brand accent strip */}
        <div
          style={{
            height: "2px",
            background: `linear-gradient(90deg, ${colors.brand[400]}, ${colors.brand[600]})`,
            flexShrink: 0,
          }}
        />
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: `${spacing[4]} ${spacing[5]}`,
            borderBottom: `1px solid ${colors.border.subtle}`,
            gap: spacing[3],
          }}
        >
          <span
            style={{
              color: colors.neutral[500],
              fontSize: typography.size.md,
              flexShrink: 0,
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: colors.neutral[100],
              borderRadius: radius.full,
              ...(discoveryLoading
                ? { animation: "palette-pulse 1.2s ease-in-out infinite" }
                : {}),
            }}
          >
            {discoveryLoading ? "\u23F3" : "\u2318"}
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Komut veya sayfa ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: typography.size.md,
              color: colors.neutral[900],
              fontFamily: typography.fontFamily,
              lineHeight: typography.lineHeight.normal,
              padding: `${spacing[1]} 0`,
            }}
            data-testid="command-palette-input"
            aria-label="Komut ara"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd
            style={{
              fontSize: typography.size.xs,
              color: colors.neutral[500],
              background: colors.neutral[100],
              padding: "0.15rem 0.5rem",
              borderRadius: radius.sm,
              border: `1px solid ${colors.neutral[200]}`,
              boxShadow: shadow.xs,
              fontFamily: typography.monoFamily,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: `${spacing[2]} 0`,
          }}
          role="listbox"
          aria-label="Komutlar"
          data-testid="command-palette-list"
        >
          {/* Empty state — only show when no static results AND discovery finished with nothing */}
          {flatList.length === 0 && !discoveryLoading && (
            <div
              style={{
                padding: `${spacing[8]} ${spacing[5]}`,
                textAlign: "center",
                color: colors.neutral[500],
                fontSize: typography.size.sm,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: spacing[2],
              }}
              data-testid="command-palette-empty"
            >
              <span
                style={{
                  fontSize: typography.size["2xl"],
                  color: colors.neutral[300],
                  lineHeight: 1,
                }}
              >
                {"\uD83D\uDD0D"}
              </span>
              {showDiscovery && discoverySearched
                ? "Sonuc bulunamadi."
                : "Sonuc bulunamadi."}
            </div>
          )}

          {/* Discovery loading indicator */}
          {showDiscovery && discoveryLoading && flatList.length === 0 && (
            <div
              style={{
                padding: `${spacing[6]} ${spacing[5]}`,
                textAlign: "center",
                color: colors.neutral[400],
                fontSize: typography.size.sm,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: spacing[2],
              }}
              data-testid="command-palette-discovery-loading"
            >
              <span style={{ animation: "palette-pulse 1.2s ease-in-out infinite" }}>
                {"\u23F3"}
              </span>
              {`Aran\u0131yor...`}
            </div>
          )}

          {allGroups.map((group) => {
            const isDiscoveryGroup = group.category === "discovery";
            return (
            <div key={group.category}>
              <div
                style={{
                  padding: `${spacing[2]} ${spacing[5]} ${spacing[1]}`,
                  fontSize: typography.size.xs,
                  fontWeight: typography.weight.semibold,
                  color: isDiscoveryGroup
                    ? colors.brand[500]
                    : colors.neutral[400],
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                {isDiscoveryGroup && (
                  <span
                    style={{
                      width: "2px",
                      height: "12px",
                      background: colors.brand[500],
                      borderRadius: radius.full,
                      flexShrink: 0,
                    }}
                  />
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
        <div
          style={{
            padding: `${spacing[3]} ${spacing[5]}`,
            borderTop: `1px solid ${colors.border.subtle}`,
            display: "flex",
            gap: spacing[4],
            fontSize: typography.size.sm,
            color: colors.neutral[400],
            background: colors.neutral[25],
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: spacing[1] }}>
            <kbd style={kbdStyle}>{"\u2191\u2193"}</kbd> gezin
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: spacing[1] }}>
            <kbd style={kbdStyle}>{"\u21B5"}</kbd> calistir
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: spacing[1] }}>
            <kbd style={kbdStyle}>esc</kbd> kapat
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[3],
        padding: `${spacing[2]} ${spacing[5]}`,
        cursor: "pointer",
        background: isSelected ? colors.brand[50] : "transparent",
        borderLeft: isSelected
          ? `3px solid ${colors.brand[500]}`
          : "3px solid transparent",
        transition: `background ${transition.fast}, border-color ${transition.fast}`,
      }}
      data-testid={`command-palette-item-${command.id}`}
    >
      {command.icon && (
        <span
          style={{
            fontSize: typography.size.sm,
            flexShrink: 0,
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isSelected ? colors.brand[100] : colors.neutral[100],
            borderRadius: radius.full,
            transition: `background ${transition.fast}`,
          }}
        >
          {command.icon}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: typography.size.base,
            color: isSelected ? colors.brand[800] : colors.neutral[800],
            fontWeight: isSelected
              ? typography.weight.medium
              : typography.weight.normal,
            lineHeight: typography.lineHeight.tight,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            transition: `color ${transition.fast}`,
          }}
        >
          {command.label}
        </div>
        {command.description && (
          <div
            style={{
              fontSize: typography.size.xs,
              color: colors.neutral[500],
              lineHeight: typography.lineHeight.normal,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {command.description}
          </div>
        )}
      </div>
      {/* Status badge for discovery results */}
      {statusBadge && (
        <span
          style={{
            fontSize: typography.size.xs,
            color: colors.neutral[600],
            background: colors.neutral[50],
            padding: "0.1rem 0.4rem",
            borderRadius: radius.full,
            flexShrink: 0,
          }}
        >
          {statusBadge}
        </span>
      )}
      {/* Category badge */}
      <span
        style={{
          fontSize: typography.size.xs,
          color: colors.neutral[400],
          background: colors.neutral[50],
          padding: "0.1rem 0.4rem",
          borderRadius: radius.full,
          flexShrink: 0,
          textTransform: "capitalize",
        }}
      >
        {isDiscovery ? "Sonuc" : CATEGORY_LABELS[command.category]}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared kbd style
// ---------------------------------------------------------------------------

const kbdStyle: React.CSSProperties = {
  fontFamily: typography.monoFamily,
  fontSize: typography.size.xs,
  background: colors.neutral[100],
  padding: "0.15rem 0.4rem",
  borderRadius: radius.sm,
  border: `1px solid ${colors.neutral[200]}`,
  boxShadow: shadow.xs,
  lineHeight: typography.lineHeight.normal,
};
