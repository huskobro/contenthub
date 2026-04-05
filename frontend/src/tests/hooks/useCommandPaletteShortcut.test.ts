import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCommandPaletteShortcut } from "../../hooks/useCommandPaletteShortcut";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";

describe("useCommandPaletteShortcut", () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ isOpen: false, query: "", selectedIndex: 0 });
  });

  it("opens palette on Ctrl+K", () => {
    renderHook(() => useCommandPaletteShortcut());
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });

  it("opens palette on Meta+K (Cmd+K)", () => {
    renderHook(() => useCommandPaletteShortcut());
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });

  it("toggles palette on repeated Ctrl+K", () => {
    renderHook(() => useCommandPaletteShortcut());
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });

  it("does not open on plain K key", () => {
    renderHook(() => useCommandPaletteShortcut());
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", bubbles: true }));
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });
});
