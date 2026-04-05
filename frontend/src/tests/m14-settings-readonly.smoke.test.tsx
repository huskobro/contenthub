/**
 * M14 Closure Audit: Settings read_only enforcement tests.
 *
 * Verifies that EffectiveSettingsPanel and CredentialsPanel
 * correctly disable edit buttons when ReadOnlyGuard provides readOnly=true.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReadOnlyGuard } from "../components/visibility/ReadOnlyGuard";
import { EffectiveSettingsPanel } from "../components/settings/EffectiveSettingsPanel";
import { CredentialsPanel } from "../components/settings/CredentialsPanel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let originalFetch: typeof window.fetch;

const sampleSettings = [
  {
    key: "providers.default_llm",
    label: "Varsayilan LLM",
    group: "providers",
    type: "string",
    effective_value: "openai",
    source: "admin",
    is_secret: false,
    wired: true,
    wired_to: "openai_provider",
    has_admin_override: true,
    help_text: "LLM secimi",
    module_scope: null,
    builtin_default: "openai",
    env_var: "",
    has_db_row: true,
    db_version: 1,
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const sampleGroups = [
  { group: "providers", label: "Providers", total: 1, wired: 1, secret: 0, missing: 0 },
];

const sampleCredentials = [
  {
    key: "openai_api_key",
    label: "OpenAI API Key",
    group: "ai_providers",
    status: "configured",
    source: "db",
    masked_value: "sk-****abcd",
    updated_at: "2026-01-01T00:00:00Z",
    help_text: "OpenAI API anahtari",
  },
  {
    key: "youtube_client_id",
    label: "YouTube Client ID",
    group: "youtube",
    status: "configured",
    source: "db",
    masked_value: "****1234.apps.googleusercontent.com",
    updated_at: "2026-01-01T00:00:00Z",
    help_text: "YouTube OAuth Client ID",
  },
];

/**
 * Creates a mock fetch that handles all required endpoints.
 *
 * Actual URLs used by components:
 * - /api/v1/visibility-rules/resolve?target_key=...
 * - /api/v1/settings/effective (+ query params)
 * - /api/v1/settings/groups
 * - /api/v1/settings/credentials
 * - /api/v1/publish/youtube/status
 * - /api/v1/publish/youtube/channel-info
 */
function createMockFetch(readOnly: boolean) {
  return vi.fn((url: string | URL | Request) => {
    const urlStr = String(url);

    if (urlStr.includes("/visibility-rules/resolve")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ visible: true, read_only: readOnly, wizard_visible: false }),
      });
    }

    if (urlStr.includes("/settings/groups")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sampleGroups),
      });
    }

    if (urlStr.includes("/settings/effective")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sampleSettings),
      });
    }

    if (urlStr.includes("/settings/credentials")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sampleCredentials),
      });
    }

    if (urlStr.includes("/publish/youtube/channel-info")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ connected: false }),
      });
    }

    if (urlStr.includes("/publish/youtube/status")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ has_credentials: false, message: "No credentials" }),
      });
    }

    // Default
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  }) as unknown as typeof window.fetch;
}

function renderInReadOnlyGuard(component: React.ReactNode, readOnly: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  window.fetch = createMockFetch(readOnly);

  return render(
    <QueryClientProvider client={qc}>
      <ReadOnlyGuard targetKey="panel:settings">
        {component}
      </ReadOnlyGuard>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  originalFetch = window.fetch;
});

afterEach(() => {
  window.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Tests: EffectiveSettingsPanel read_only enforcement
// ---------------------------------------------------------------------------

describe("M14 Audit: EffectiveSettingsPanel read_only enforcement", () => {
  it("edit button is enabled when readOnly=false", async () => {
    renderInReadOnlyGuard(<EffectiveSettingsPanel />, false);

    await waitFor(() => {
      const btn = screen.getByText("Degistir");
      expect(btn).toBeDefined();
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("edit button is disabled when readOnly=true", async () => {
    renderInReadOnlyGuard(<EffectiveSettingsPanel />, true);

    await waitFor(() => {
      const btn = screen.getByText("Degistir");
      expect(btn).toBeDefined();
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: CredentialsPanel read_only enforcement
// ---------------------------------------------------------------------------

describe("M14 Audit: CredentialsPanel read_only enforcement", () => {
  it("credential edit button is enabled when readOnly=false", async () => {
    renderInReadOnlyGuard(<CredentialsPanel />, false);

    await waitFor(() => {
      const btns = screen.getAllByText("Degistir");
      expect(btns.length).toBeGreaterThan(0);
      // All "Degistir" buttons should be enabled
      for (const btn of btns) {
        expect((btn as HTMLButtonElement).disabled).toBe(false);
      }
    });
  });

  it("credential edit button is disabled when readOnly=true", async () => {
    renderInReadOnlyGuard(<CredentialsPanel />, true);

    await waitFor(() => {
      const btns = screen.getAllByText("Degistir");
      expect(btns.length).toBeGreaterThan(0);
      // All "Degistir" buttons should be disabled
      for (const btn of btns) {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      }
    });
  });

  it("YouTube connect button is disabled when readOnly=true", async () => {
    renderInReadOnlyGuard(<CredentialsPanel />, true);

    await waitFor(() => {
      const btn = screen.getByText("YouTube Baglantisi Baslat");
      expect(btn).toBeDefined();
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("YouTube connect button is enabled when readOnly=false", async () => {
    renderInReadOnlyGuard(<CredentialsPanel />, false);

    await waitFor(() => {
      const btn = screen.getByText("YouTube Baglantisi Baslat");
      expect(btn).toBeDefined();
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
