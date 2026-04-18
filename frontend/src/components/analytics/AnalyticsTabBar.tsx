/**
 * AnalyticsTabBar — Redesign REV-2 / P2.2.
 *
 * Analytics sayfalarının tepesine konan tab şeridi. 5 admin + 3 user varyantı
 * ile "tek Analytics Merkezi, çok sekme" hissini verir. Rotalar değişmiyor —
 * sadece her analytics sayfasının `PageShell` içeriğine bu bar en başa
 * eklenerek bookmark'lanabilir deep-link korunuyor, tab tıklaması
 * `navigate()` ile sayfayı değiştiriyor.
 *
 * Aktif sekme `useLocation().pathname` üzerinden türer — router URL tek
 * gerçek kaynak. Tab state Zustand'a veya query-string'e yazılmıyor (prefix
 * match yeterli; bkz. `activeFromPath`).
 *
 * CLAUDE.md uyumu:
 *   - Hidden behavior yok: tablar testid + aria-selected ile görünür.
 *   - Visibility Engine: `panel:analytics` kontrolü çağıran sayfalarda
 *     (VisibilityGuard) zaten var — bu bileşen gate uygulamaz.
 *   - Parallel pattern yok: mevcut `TabBar` primitive'i üstünde çok ince
 *     router-aware bir adapter; tab state yönetimi duplicate değil.
 */

import { useLocation, useNavigate } from "react-router-dom";

import { TabBar } from "../design-system/primitives";

// ---------------------------------------------------------------------------
// Admin variant
// ---------------------------------------------------------------------------

type AdminAnalyticsTabKey =
  | "overview"
  | "content"
  | "operations"
  | "youtube"
  | "publish";

const ADMIN_TABS: {
  key: AdminAnalyticsTabKey;
  label: string;
  path: string;
}[] = [
  { key: "overview", label: "Genel Bakış", path: "/admin/analytics" },
  { key: "content", label: "İçerik", path: "/admin/analytics/content" },
  { key: "operations", label: "Operasyon", path: "/admin/analytics/operations" },
  { key: "youtube", label: "YouTube", path: "/admin/analytics/youtube" },
  { key: "publish", label: "Yayın", path: "/admin/analytics/publish" },
];

function activeAdminFromPath(path: string): AdminAnalyticsTabKey {
  // En spesifik önce — `/admin/analytics` prefix'i ile çakışmayı önle.
  if (path.startsWith("/admin/analytics/content")) return "content";
  if (path.startsWith("/admin/analytics/operations")) return "operations";
  if (path.startsWith("/admin/analytics/youtube")) return "youtube";
  if (path.startsWith("/admin/analytics/publish")) return "publish";
  return "overview";
}

export function AdminAnalyticsTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = activeAdminFromPath(location.pathname);

  return (
    <div className="mb-3" data-testid="admin-analytics-tab-bar">
      <TabBar<AdminAnalyticsTabKey>
        tabs={ADMIN_TABS.map(({ key, label }) => ({ key, label }))}
        active={active}
        onChange={(key) => {
          const entry = ADMIN_TABS.find((t) => t.key === key);
          if (entry) navigate(entry.path);
        }}
        testId="admin-analytics-tab"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// User variant
// ---------------------------------------------------------------------------

type UserAnalyticsTabKey = "overview" | "youtube" | "channels";

const USER_TABS: {
  key: UserAnalyticsTabKey;
  label: string;
  path: string;
}[] = [
  { key: "overview", label: "Genel", path: "/user/analytics" },
  { key: "youtube", label: "YouTube", path: "/user/analytics/youtube" },
  { key: "channels", label: "Kanal", path: "/user/analytics/channels" },
];

function activeUserFromPath(path: string): UserAnalyticsTabKey {
  if (path.startsWith("/user/analytics/youtube")) return "youtube";
  if (path.startsWith("/user/analytics/channels")) return "channels";
  return "overview";
}

export function UserAnalyticsTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = activeUserFromPath(location.pathname);

  return (
    <div className="mb-3" data-testid="user-analytics-tab-bar">
      <TabBar<UserAnalyticsTabKey>
        tabs={USER_TABS.map(({ key, label }) => ({ key, label }))}
        active={active}
        onChange={(key) => {
          const entry = USER_TABS.find((t) => t.key === key);
          if (entry) navigate(entry.path);
        }}
        testId="user-analytics-tab"
      />
    </div>
  );
}
