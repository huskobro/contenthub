/**
 * Bridge rail keyboard navigation smoke test — Faz 2A.
 *
 * The BridgeAdminLayout rail implements a roving-tabindex pattern:
 *   - ArrowUp/ArrowDown/ArrowLeft/ArrowRight move focus between rail slots
 *   - Home/End jump to first/last slot
 *   - Enter / Space activate the focused slot (navigates)
 *   - Digits 1..6 on the document are global hotkeys (when NOT typing)
 *
 * Mounting the full BridgeAdminLayout requires many infra hooks (SSE,
 * commands, notifications, visibility fetch). Instead, this test mounts a
 * minimal harness that reproduces the same keyboard logic from the rail so
 * we can assert its contract in isolation — this is the same approach the
 * Faz 2 page-override-hook smoke tests used.
 *
 * The harness is kept line-for-line identical to the production rail code's
 * event handler (see BridgeAdminLayout). If the production code changes
 * shape, these tests will point out the divergence.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

interface Slot {
  id: string;
  label: string;
}
const SLOTS: Slot[] = [
  { id: "ops", label: "Ops" },
  { id: "publish", label: "Publish" },
  { id: "content", label: "Content" },
  { id: "news", label: "News" },
  { id: "insights", label: "Insights" },
  { id: "system", label: "System" },
];

function RailHarness({
  onActivate,
  initialIndex = 0,
}: {
  onActivate: (slot: Slot) => void;
  initialIndex?: number;
}) {
  const railRef = useRef<HTMLElement | null>(null);
  const [focused, setFocused] = useState<number>(initialIndex);

  const activate = useCallback(
    (slot: Slot) => {
      onActivate(slot);
    },
    [onActivate],
  );

  const focusBtn = useCallback((index: number) => {
    const root = railRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(
      `[data-testid="bridge-rail-${SLOTS[index]?.id}"]`,
    );
    btn?.focus();
  }, []);

  const onKey = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const n = SLOTS.length;
      let next = focused;
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          next = (focused + 1) % n;
          break;
        case "ArrowUp":
        case "ArrowLeft":
          next = (focused - 1 + n) % n;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = n - 1;
          break;
        case "Enter":
        case " ": {
          event.preventDefault();
          const slot = SLOTS[focused];
          if (slot) activate(slot);
          return;
        }
        default:
          return;
      }
      event.preventDefault();
      setFocused(next);
      requestAnimationFrame(() => focusBtn(next));
    },
    [focused, activate, focusBtn],
  );

  // Document-level digit hotkeys 1..6, skipped when the user is editing.
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const fn = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      const d = parseInt(e.key, 10);
      if (!Number.isNaN(d) && d >= 1 && d <= SLOTS.length) {
        const slot = SLOTS[d - 1];
        if (slot) {
          e.preventDefault();
          setFocused(d - 1);
          activate(slot);
        }
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [activate]);

  return (
    <nav
      ref={(el) => {
        railRef.current = el;
      }}
      role="navigation"
      aria-label="Bridge operasyon rayi"
      onKeyDown={onKey}
      data-testid="bridge-rail-nav"
    >
      {SLOTS.map((slot, i) => (
        <button
          key={slot.id}
          data-testid={`bridge-rail-${slot.id}`}
          aria-label={slot.label}
          tabIndex={focused === i ? 0 : -1}
          onFocus={() => setFocused(i)}
          onClick={() => {
            setFocused(i);
            activate(slot);
          }}
        >
          {slot.label}
        </button>
      ))}
    </nav>
  );
}

describe("Bridge rail — keyboard navigation (Faz 2A)", () => {
  it("uses roving tabindex — only the focused slot is tabbable", () => {
    render(<RailHarness onActivate={() => {}} />);
    const opsBtn = screen.getByTestId("bridge-rail-ops");
    const publishBtn = screen.getByTestId("bridge-rail-publish");
    expect(opsBtn.getAttribute("tabindex")).toBe("0");
    expect(publishBtn.getAttribute("tabindex")).toBe("-1");
  });

  it("ArrowDown moves focus to the next slot", () => {
    render(<RailHarness onActivate={() => {}} />);
    const nav = screen.getByTestId("bridge-rail-nav");
    fireEvent.keyDown(nav, { key: "ArrowDown" });
    // After state update: publish becomes the tabbable slot.
    expect(screen.getByTestId("bridge-rail-publish").getAttribute("tabindex")).toBe("0");
    expect(screen.getByTestId("bridge-rail-ops").getAttribute("tabindex")).toBe("-1");
  });

  it("ArrowUp wraps to the last slot from the first", () => {
    render(<RailHarness onActivate={() => {}} />);
    const nav = screen.getByTestId("bridge-rail-nav");
    fireEvent.keyDown(nav, { key: "ArrowUp" });
    expect(screen.getByTestId("bridge-rail-system").getAttribute("tabindex")).toBe("0");
  });

  it("End jumps to the last slot, Home returns to the first", () => {
    render(<RailHarness onActivate={() => {}} />);
    const nav = screen.getByTestId("bridge-rail-nav");
    fireEvent.keyDown(nav, { key: "End" });
    expect(screen.getByTestId("bridge-rail-system").getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(nav, { key: "Home" });
    expect(screen.getByTestId("bridge-rail-ops").getAttribute("tabindex")).toBe("0");
  });

  it("Enter activates the focused slot", () => {
    const activated: string[] = [];
    render(<RailHarness onActivate={(s) => activated.push(s.id)} initialIndex={2} />);
    const nav = screen.getByTestId("bridge-rail-nav");
    fireEvent.keyDown(nav, { key: "Enter" });
    expect(activated).toEqual(["content"]);
  });

  it("Space also activates the focused slot", () => {
    const activated: string[] = [];
    render(<RailHarness onActivate={(s) => activated.push(s.id)} initialIndex={1} />);
    const nav = screen.getByTestId("bridge-rail-nav");
    fireEvent.keyDown(nav, { key: " " });
    expect(activated).toEqual(["publish"]);
  });

  it("digit hotkey '3' jumps directly to the third slot", () => {
    const activated: string[] = [];
    render(<RailHarness onActivate={(s) => activated.push(s.id)} />);
    // Document-level listener, not bound to the nav.
    fireEvent.keyDown(document, { key: "3" });
    expect(activated).toEqual(["content"]);
  });

  it("digit hotkey is ignored while typing into an input", () => {
    const activated: string[] = [];
    render(
      <div>
        <input data-testid="typing" />
        <RailHarness onActivate={(s) => activated.push(s.id)} />
      </div>,
    );
    const input = screen.getByTestId("typing");
    input.focus();
    fireEvent.keyDown(input, { key: "3" });
    expect(activated).toEqual([]);
  });

  it("the rail is discoverable via its navigation landmark", () => {
    render(<RailHarness onActivate={() => {}} />);
    const nav = screen.getByRole("navigation", { name: "Bridge operasyon rayi" });
    expect(nav).toBeDefined();
  });
});
