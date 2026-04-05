/**
 * uiStore tests — Wave 1
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../../stores/uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    useUIStore.setState({ sidebarCollapsed: false, toasts: [] });
  });

  // -- Sidebar --

  describe("sidebar", () => {
    it("starts expanded", () => {
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it("toggleSidebar flips collapsed state", () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it("setSidebarCollapsed sets directly", () => {
      useUIStore.getState().setSidebarCollapsed(true);
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });
  });

  // -- Toast --

  describe("toast", () => {
    it("addToast adds a toast", () => {
      useUIStore.getState().addToast("success", "Saved");
      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0].type).toBe("success");
      expect(useUIStore.getState().toasts[0].message).toBe("Saved");
    });

    it("removeToast removes by id", () => {
      useUIStore.getState().addToast("info", "A");
      const id = useUIStore.getState().toasts[0].id;
      useUIStore.getState().removeToast(id);
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it("clearToasts removes all", () => {
      useUIStore.getState().addToast("success", "A");
      useUIStore.getState().addToast("error", "B");
      useUIStore.getState().clearToasts();
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it("max 5 toasts — oldest removed", () => {
      for (let i = 0; i < 7; i++) {
        useUIStore.getState().addToast("info", `msg-${i}`);
      }
      const toasts = useUIStore.getState().toasts;
      expect(toasts.length).toBeLessThanOrEqual(5);
    });

    it("deduplicates same message within 2s", () => {
      useUIStore.getState().addToast("success", "Dup");
      useUIStore.getState().addToast("success", "Dup");
      expect(useUIStore.getState().toasts).toHaveLength(1);
    });

    it("allows same message with different type", () => {
      useUIStore.getState().addToast("success", "Same");
      useUIStore.getState().addToast("error", "Same");
      expect(useUIStore.getState().toasts).toHaveLength(2);
    });
  });
});
