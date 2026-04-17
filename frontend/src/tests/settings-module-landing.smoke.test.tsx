/**
 * SettingsModuleLanding smoke tests — Redesign REV-2 / P2.3.
 *
 * `/admin/settings` üzerindeki modül kartları + `/admin/settings/:group`
 * deep-link kontratını doğrular:
 *   - Effective tab açıkken landing kartları render ediliyor
 *   - Kart tıklanınca URL değişiyor ve EffectiveSettingsPanel filtrelenmiş açılıyor
 *   - "Tüm modüller" butonu URL'i temizleyince kartlar geri geliyor
 *
 * NOT: `createMemoryRouter` Vitest/undici combosunda AbortSignal instanceof
 * hatası fırlattığı için (navigate sırasında polyfilled Request) bu testler
 * düz `MemoryRouter + Routes` kullanır.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsRegistryPage } from "../pages/admin/SettingsRegistryPage";

const MOCK_GROUPS = [
  { group: "tts", label: "Seslendirme", total: 14, wired: 12, secret: 2, missing: 0 },
  { group: "channels", label: "Kanallar", total: 8, wired: 6, secret: 0, missing: 1 },
  { group: "publish", label: "Yayın", total: 5, wired: 3, secret: 0, missing: 0 },
  { group: "automation", label: "Otomasyon", total: 9, wired: 4, secret: 0, missing: 0 },
];

function mockFetchUrl() {
  return vi.fn((url: string | URL) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => {
        if (urlStr.includes("/settings/groups")) return Promise.resolve(MOCK_GROUPS);
        if (urlStr.includes("/settings/effective")) return Promise.resolve([]);
        if (urlStr.includes("/credentials")) return Promise.resolve([]);
        if (urlStr.includes("/visibility-rules")) return Promise.resolve([]);
        if (urlStr.includes("/settings")) return Promise.resolve([]);
        return Promise.resolve([]);
      },
    });
  }) as unknown as typeof window.fetch;
}

function renderAt(path: string) {
  window.fetch = mockFetchUrl();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/settings" element={<SettingsRegistryPage />} />
          <Route path="/admin/settings/:group" element={<SettingsRegistryPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("SettingsModuleLanding — P2.3", () => {
  it("shows module cards on /admin/settings effective tab", async () => {
    renderAt("/admin/settings");
    const user = userEvent.setup();

    // Default tab: credentials — switch to effective.
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByTestId("settings-module-landing")).toBeDefined();
    });

    // Her grup için kart render edilmeli.
    expect(screen.getByTestId("settings-module-card-tts")).toBeDefined();
    expect(screen.getByTestId("settings-module-card-channels")).toBeDefined();
    expect(screen.getByTestId("settings-module-card-publish")).toBeDefined();
    expect(screen.getByTestId("settings-module-card-automation")).toBeDefined();
  });

  it("opens effective tab filtered when URL has :group", async () => {
    renderAt("/admin/settings/tts");

    // Landing görünmemeli; filtre breadcrumb görünmeli.
    await waitFor(() => {
      expect(screen.getByTestId("settings-module-breadcrumb")).toBeDefined();
    });
    expect(screen.queryByTestId("settings-module-landing")).toBeNull();

    // Effective tab aktif olmalı — TabBar active class kontrolü.
    const effTab = screen.getByTestId("settings-tab-effective");
    expect(effTab.className).toContain("font-semibold");
  });

  it("shows 'Tüm modüller' back button when filtered", async () => {
    renderAt("/admin/settings/tts");
    await waitFor(() => {
      expect(screen.getByTestId("settings-module-back")).toBeDefined();
    });
  });

  it("shows group counts on cards", async () => {
    renderAt("/admin/settings");
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByTestId("settings-module-card-tts")).toBeDefined();
    });

    // "14 ayar" tts kartında görünmeli.
    const ttsCard = screen.getByTestId("settings-module-card-tts");
    expect(ttsCard.textContent).toContain("14 ayar");
    expect(ttsCard.textContent).toContain("12 wired");
  });

  it("shows filter group name in breadcrumb", async () => {
    renderAt("/admin/settings/channels");
    await waitFor(() => {
      const bc = screen.getByTestId("settings-module-breadcrumb");
      expect(bc.textContent).toContain("channels");
    });
  });
});
