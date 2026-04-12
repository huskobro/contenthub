// @ts-nocheck — structural guard test that reads source files via Node fs
/**
 * Sprint 4 — Pre-Launch Polish Smoke Tests
 *
 * Covers:
 *   A) useApiError adoption — all mutation hooks include onError
 *   B) Accessibility — table rows have keyboard attrs, notification dismiss is focusable
 *   C) Error/Empty state rendering — key pages have proper states
 *   D) Link/route cleanup — no <a href> where <Link> should be used
 *   E) TypeScript cleanup — no as-any in critical files
 *   F) Operational clarity — info banners present on limited-capability pages
 *   G) Raw fetch elimination — critical pages use api client
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(SRC, relativePath));
}

// ===========================================================================
// A) useApiError ADOPTION
// ===========================================================================

describe("Sprint 4 — useApiError adoption", () => {
  const MUTATION_HOOKS = [
    "hooks/useCreateSource.ts",
    "hooks/useUpdateSource.ts",
    "hooks/useCreateTemplate.ts",
    "hooks/useUpdateTemplate.ts",
    "hooks/useCreateStyleBlueprint.ts",
    "hooks/useUpdateStyleBlueprint.ts",
    "hooks/useCreateNewsItem.ts",
    "hooks/useUpdateNewsItem.ts",
    "hooks/useCreateNewsBulletin.ts",
    "hooks/useUpdateNewsBulletin.ts",
    "hooks/useCreateStandardVideo.ts",
    "hooks/useUpdateStandardVideo.ts",
    "hooks/useCreateSourceScan.ts",
    "hooks/useUpdateSourceScan.ts",
    "hooks/useCreateUsedNews.ts",
    "hooks/useUpdateUsedNews.ts",
    "hooks/useCreateSetting.ts",
    "hooks/usePosts.ts",
    "hooks/usePlaylists.ts",
    "hooks/useComments.ts",
    "hooks/usePublish.ts",
    "hooks/useUsers.ts",
    "hooks/useCredentials.ts",
    "hooks/useNotifications.ts",
  ];

  it.each(MUTATION_HOOKS)("%s imports and uses useApiError", (hookPath) => {
    const content = readFile(hookPath);
    expect(content).toContain('import { useApiError }');
    expect(content).toContain("useApiError()");
    expect(content).toContain("onError");
  });
});

// ===========================================================================
// B) ACCESSIBILITY — TABLE KEYBOARD NAVIGATION
// ===========================================================================

describe("Sprint 4 — Table keyboard accessibility", () => {
  const TABLE_FILES = [
    "components/source-scans/SourceScansTable.tsx",
    "components/news-bulletin/NewsBulletinsTable.tsx",
    "components/settings/SettingsTable.tsx",
    "components/news-items/NewsItemsTable.tsx",
    "components/template-style-links/TemplateStyleLinksTable.tsx",
    "components/style-blueprints/StyleBlueprintsTable.tsx",
    "components/visibility/VisibilityRulesTable.tsx",
    "components/used-news/UsedNewsTable.tsx",
  ];

  it.each(TABLE_FILES)("%s has keyboard-accessible rows", (tablePath) => {
    const content = readFile(tablePath);
    // Clickable rows must have tabIndex, role, and onKeyDown
    expect(content).toContain("tabIndex={0}");
    expect(content).toContain('role="button"');
    expect(content).toContain("onKeyDown");
    // Focus visible outline for keyboard users
    expect(content).toContain("focus-visible:outline");
  });

  it("NotificationCenter dismiss button is keyboard-focusable", () => {
    const content = readFile("components/design-system/NotificationCenter.tsx");
    // The dismiss button must be visible on focus, not just hover
    expect(content).toContain("focus:opacity-100");
  });

  it("ColumnSelector has ARIA attributes", () => {
    const content = readFile("components/design-system/ColumnSelector.tsx");
    expect(content).toContain('aria-haspopup');
    expect(content).toContain('aria-expanded');
    expect(content).toContain('role="listbox"');
  });
});

// ===========================================================================
// C) ERROR / EMPTY STATE RENDERING
// ===========================================================================

describe("Sprint 4 — Error/Empty state coverage", () => {
  const PAGES_WITH_STATES = [
    { file: "pages/user/UserAutomationPage.tsx", errorText: "Yüklenemedi", emptyText: "kayıt yok" },
    { file: "pages/user/UserPostsPage.tsx", errorText: "Yüklenemedi", emptyText: "yok" },
    { file: "pages/user/UserCommentsPage.tsx", errorText: "Yüklenemedi", emptyText: "bulunamadı" },
    { file: "pages/user/UserPlaylistsPage.tsx", errorText: "Yüklenemedi", emptyText: "bulunamadı" },
    { file: "pages/user/UserConnectionsPage.tsx", errorText: "Yüklenemedi", emptyText: "kurulmamış" },
  ];

  it.each(PAGES_WITH_STATES)(
    "$file has error and empty states",
    ({ file, errorText, emptyText }) => {
      const content = readFile(file);
      expect(content).toContain("isError");
      expect(content).toContain(errorText);
      expect(content).toContain(emptyText);
    },
  );
});

// ===========================================================================
// D) LINK / ROUTE CLEANUP
// ===========================================================================

describe("Sprint 4 — Link/route cleanup", () => {
  it("StandardVideoDetailPage uses Link instead of <a> for navigation", () => {
    const content = readFile("pages/admin/StandardVideoDetailPage.tsx");
    // Should use <Link to= not <a href= for internal navigation
    expect(content).not.toMatch(/<a\s+href="\/admin\/library"/);
    expect(content).toContain("<Link");
  });

  it("AnalyticsOperationsPage uses Link instead of <a>", () => {
    const content = readFile("pages/admin/AnalyticsOperationsPage.tsx");
    expect(content).not.toMatch(/<a\s+href="\/admin\/analytics"/);
  });

  it("UserCalendarPage uses Link for internal navigation", () => {
    const content = readFile("pages/user/UserCalendarPage.tsx");
    // Should import Link
    expect(content).toContain("Link");
    // Should not have <a href="/user/inbox" or similar internal links
    expect(content).not.toMatch(/<a\s+href="\/user\/posts"/);
  });

  it("Channel detail route mounts the real ChannelDetailPage (no stub)", () => {
    const content = readFile("app/router.tsx");
    expect(content).not.toContain("Kanal detayi yakinda eklenecek.");
    expect(content).not.toContain("Bu sayfa henuz tamamlanmadi");
    expect(content).toContain("ChannelDetailPage");
    expect(content).toMatch(/channels\/:channelId[\s\S]*ChannelDetailPage/);
  });
});

// ===========================================================================
// E) TYPESCRIPT CLEANUP
// ===========================================================================

describe("Sprint 4 — TypeScript cleanup", () => {
  it("SourceDetailPanel has no as-any casts", () => {
    const content = readFile("components/sources/SourceDetailPanel.tsx");
    expect(content).not.toContain("as any");
  });

  it("AdminOverviewPage has no as-any casts", () => {
    const content = readFile("pages/AdminOverviewPage.tsx");
    expect(content).not.toContain("as any");
  });

  it("errorUtils.ts exists and exports classifyError", () => {
    const content = readFile("lib/errorUtils.ts");
    expect(content).toContain("export function classifyError");
    expect(content).toContain("export function errorToToastType");
  });
});

// ===========================================================================
// F) RAW FETCH ELIMINATION
// ===========================================================================

describe("Sprint 4 — Raw fetch elimination", () => {
  const FILES_SHOULD_USE_API_CLIENT = [
    "pages/user/CreateVideoWizardPage.tsx",
    "pages/user/UserAutomationPage.tsx",
    "pages/admin/YouTubeCallbackPage.tsx",
    "pages/admin/StandardVideoWizardPage.tsx",
    "hooks/useDiscoverySearch.ts",
    "hooks/useSubtitlePresets.ts",
  ];

  it.each(FILES_SHOULD_USE_API_CLIENT)(
    "%s does not use raw fetch() for API calls",
    (filePath) => {
      const content = readFile(filePath);
      // Should not have raw fetch("/api/...) patterns
      expect(content).not.toMatch(/\bfetch\s*\(\s*["'`]\/api\//);
      // Should import api client
      expect(content).toContain("api");
    },
  );
});

// ===========================================================================
// G) OPERATIONAL CLARITY BANNERS
// ===========================================================================

describe("Sprint 4 — Operational clarity", () => {
  it("UserPostsPage has API limitation notice", () => {
    const content = readFile("pages/user/UserPostsPage.tsx");
    expect(content).toContain("Community Posts API");
  });

  it("UserPlaylistsPage has sync level notice", () => {
    const content = readFile("pages/user/UserPlaylistsPage.tsx");
    expect(content).toContain("temel CRUD");
  });

  it("UserAutomationPage has executor status notice", () => {
    const content = readFile("pages/user/UserAutomationPage.tsx");
    expect(content).toContain("otomatik calistirma");
  });

  it("SettingDetailPanel has restart notice for system settings", () => {
    if (fileExists("components/settings/SettingDetailPanel.tsx")) {
      const content = readFile("components/settings/SettingDetailPanel.tsx");
      expect(content).toContain("yeniden baslatil");
    }
  });
});
