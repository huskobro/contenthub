/**
 * Surface panel switch — Faz 4D smoke test.
 *
 * Kullanicinin canvas / atrium / bridge surface'lerindeyken admin/user panel
 * arasinda rahat gecis yapabilmesini garanti altina alir. Faz 4C'den onceki
 * durumda canvas ve atrium layout'larinda panel switch butonu yoktu; bu test
 * o regresyonun yeniden gelmesini engeller.
 *
 * Kapsam:
 *   1. CanvasUserLayout `canvas-panel-switch` butonuna sahip, admin'e yonlenir
 *   2. AtriumUserLayout `atrium-panel-switch` butonuna sahip, admin'e yonlenir
 *   3. BridgeAdminLayout `bridge-scope-switch` butonu net tooltip/aria-label ile
 *      USR pill'ini korur, user'a yonlenir
 *
 * jsdom icinde layout'lar agir hook'lar (query, visibility, SSE) yukluyor;
 * bu yuzden QueryClientProvider sariyoruz + network'a giden tum hook'lari
 * minimal no-op'lara mock'liyoruz.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
    Outlet: () => null,
    NavLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLocation: () => ({ pathname: "/user", search: "", hash: "", state: null }),
  };
});

vi.mock("../hooks/useCommandPaletteShortcut", () => ({
  useCommandPaletteShortcut: () => {},
}));
vi.mock("../hooks/useGlobalSSE", () => ({
  useGlobalSSE: () => {},
}));
vi.mock("../hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAllRead: () => {},
    markRead: () => {},
    dismiss: () => {},
    clearAll: () => {},
  }),
}));
vi.mock("../hooks/useOnboardingStatus", () => ({
  useOnboardingStatus: () => ({
    data: { onboarding_required: false, completed_at: "2026-04-01" },
    isLoading: false,
  }),
}));
vi.mock("../hooks/useEnabledModules", () => ({
  useEnabledModules: () => ({
    enabledMap: {
      standard_video: true,
      news_bulletin: true,
      product_review: true,
      educational_video: true,
      howto_video: true,
    },
  }),
}));
vi.mock("../hooks/useVisibility", () => ({
  useVisibility: () => ({ data: { visible: true, editable: true } }),
  useAdminVisibilityMap: () => ({ data: {}, isLoading: false }),
  useUserVisibilityMap: () => ({ data: {}, isLoading: false }),
}));
vi.mock("../hooks/useContentProjects", () => ({
  useContentProjects: () => ({ data: [], isLoading: false }),
}));
vi.mock("../api/projectsApi", () => ({
  listProjects: async () => [],
  fetchContentProjects: async () => [],
}));
vi.mock("../stores/authStore", () => {
  const state = {
    user: { id: 1, role: "admin", username: "tester" },
    isAuthenticated: true,
  };
  const useAuthStore = Object.assign(
    (selector: (s: typeof state) => unknown) => selector(state),
    { getState: () => state },
  );
  return { useAuthStore };
});

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  navigateMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("Faz 4D — panel switch presence across surfaces", () => {
  describe("CanvasUserLayout", () => {
    it("renders a visible, labelled admin panel switch button", async () => {
      const { CanvasUserLayout } = await import(
        "../surfaces/canvas/CanvasUserLayout"
      );
      wrap(<CanvasUserLayout />);
      const btn = screen.getByTestId("canvas-panel-switch");
      expect(btn).toBeDefined();
      expect(btn.textContent).toMatch(/yonetim/i);
      expect(btn.getAttribute("title")).toMatch(/yonetim/i);
      expect(btn.getAttribute("aria-label")).toMatch(/yonetim/i);
    });

    it("clicking canvas panel switch navigates to /admin", async () => {
      const { CanvasUserLayout } = await import(
        "../surfaces/canvas/CanvasUserLayout"
      );
      wrap(<CanvasUserLayout />);
      fireEvent.click(screen.getByTestId("canvas-panel-switch"));
      expect(navigateMock).toHaveBeenCalledWith("/admin");
    });
  });

  describe("AtriumUserLayout", () => {
    it("renders a visible, labelled admin panel switch button", async () => {
      const { AtriumUserLayout } = await import(
        "../surfaces/atrium/AtriumUserLayout"
      );
      wrap(<AtriumUserLayout />);
      const btn = screen.getByTestId("atrium-panel-switch");
      expect(btn).toBeDefined();
      expect(btn.textContent).toMatch(/yonetim/i);
      expect(btn.getAttribute("title")).toMatch(/yonetim/i);
      expect(btn.getAttribute("aria-label")).toMatch(/yonetim/i);
    });

    it("clicking atrium panel switch navigates to /admin", async () => {
      const { AtriumUserLayout } = await import(
        "../surfaces/atrium/AtriumUserLayout"
      );
      wrap(<AtriumUserLayout />);
      fireEvent.click(screen.getByTestId("atrium-panel-switch"));
      expect(navigateMock).toHaveBeenCalledWith("/admin");
    });
  });

  describe("BridgeAdminLayout", () => {
    it("enriched bridge scope switch keeps legacy testid + adds clear labels", async () => {
      const { BridgeAdminLayout } = await import(
        "../surfaces/bridge/BridgeAdminLayout"
      );
      wrap(<BridgeAdminLayout />);
      const btn = screen.getByTestId("bridge-scope-switch");
      expect(btn).toBeDefined();
      expect(btn.getAttribute("title")).toMatch(/kullanici/i);
      expect(btn.getAttribute("aria-label")).toMatch(/kullanici/i);
      expect(btn.getAttribute("data-panel-switch")).toBe("bridge");
    });

    it("clicking bridge scope switch navigates to /user", async () => {
      const { BridgeAdminLayout } = await import(
        "../surfaces/bridge/BridgeAdminLayout"
      );
      wrap(<BridgeAdminLayout />);
      fireEvent.click(screen.getByTestId("bridge-scope-switch"));
      expect(navigateMock).toHaveBeenCalledWith("/user");
    });
  });
});
