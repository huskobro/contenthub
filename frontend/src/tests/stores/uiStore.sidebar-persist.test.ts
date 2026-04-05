import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../../stores/uiStore";

describe("uiStore sidebar persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store
    useUIStore.setState({ sidebarCollapsed: false });
  });

  it("defaults to not collapsed", () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("persists sidebar state to localStorage on toggle", () => {
    useUIStore.getState().toggleSidebar();
    expect(localStorage.getItem("contenthub:sidebar-collapsed")).toBe("true");
  });

  it("persists sidebar state on setSidebarCollapsed", () => {
    useUIStore.getState().setSidebarCollapsed(true);
    expect(localStorage.getItem("contenthub:sidebar-collapsed")).toBe("true");

    useUIStore.getState().setSidebarCollapsed(false);
    expect(localStorage.getItem("contenthub:sidebar-collapsed")).toBe("false");
  });

  it("toggles correctly and persists", () => {
    useUIStore.getState().toggleSidebar(); // false -> true
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    expect(localStorage.getItem("contenthub:sidebar-collapsed")).toBe("true");

    useUIStore.getState().toggleSidebar(); // true -> false
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    expect(localStorage.getItem("contenthub:sidebar-collapsed")).toBe("false");
  });
});
