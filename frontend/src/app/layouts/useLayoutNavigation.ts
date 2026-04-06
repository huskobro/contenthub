/**
 * useLayoutNavigation — Shared navigation definitions and visibility filtering
 * for Classic and Horizon admin/user layouts.
 *
 * Consolidates repeated useVisibility() calls into a single useVisibilityMap()
 * pattern and exports navigation definitions consumed by both layout variants.
 */

import { useVisibility } from "../../hooks/useVisibility";

// ---------------------------------------------------------------------------
// Admin navigation definitions
// ---------------------------------------------------------------------------

export interface AdminNavItem {
  label: string;
  to?: string;
  section?: boolean;
  visibilityKey?: string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Genel Bakis", to: "/admin" },
  { label: "Sistem", section: true },
  { label: "Ayarlar", to: "/admin/settings", visibilityKey: "panel:settings" },
  { label: "Gorunurluk", to: "/admin/visibility", visibilityKey: "panel:visibility" },
  { label: "Isler", to: "/admin/jobs" },
  { label: "Audit Log", to: "/admin/audit-logs" },
  { label: "Icerik Uretimi", section: true },
  { label: "Icerik Kutuphanesi", to: "/admin/library" },
  { label: "Varlik Kutuphanesi", to: "/admin/assets" },
  { label: "Standart Video", to: "/admin/standard-videos" },
  { label: "Video Wizard", to: "/admin/standard-videos/wizard" },
  { label: "Sablonlar", to: "/admin/templates", visibilityKey: "panel:templates" },
  { label: "Stil Sablonlari", to: "/admin/style-blueprints" },
  { label: "Sablon-Stil Baglantilari", to: "/admin/template-style-links" },
  { label: "Yayin", section: true },
  { label: "Yayin Merkezi", to: "/admin/publish", visibilityKey: "panel:publish" },
  { label: "Analytics", section: true },
  { label: "Analytics", to: "/admin/analytics", visibilityKey: "panel:analytics" },
  { label: "YouTube Analytics", to: "/admin/analytics/youtube" },
  { label: "Haber", section: true },
  { label: "Kaynaklar", to: "/admin/sources", visibilityKey: "panel:sources" },
  { label: "Kaynak Taramalari", to: "/admin/source-scans" },
  { label: "Haber Bultenleri", to: "/admin/news-bulletins" },
  { label: "Haber Ogeler", to: "/admin/news-items" },
  { label: "Kullanilan Haberler", to: "/admin/used-news" },
  { label: "Gorunum", section: true },
  { label: "Tema Yonetimi", to: "/admin/themes" },
];

// ---------------------------------------------------------------------------
// User navigation definitions
// ---------------------------------------------------------------------------

export interface UserNavItem {
  label: string;
  to: string;
}

export const USER_NAV: UserNavItem[] = [
  { label: "Anasayfa", to: "/user" },
  { label: "Icerik", to: "/user/content" },
  { label: "Yayin", to: "/user/publish" },
];

// ---------------------------------------------------------------------------
// Horizon admin navigation groups (structured for icon rail)
// ---------------------------------------------------------------------------

import type { HorizonNavGroup } from "../../components/layout/HorizonSidebar";

export const HORIZON_ADMIN_GROUPS: HorizonNavGroup[] = [
  {
    id: "overview",
    label: "Genel",
    icon: "\u25C9",
    items: [
      { label: "Genel Bakis", to: "/admin" },
    ],
  },
  {
    id: "system",
    label: "Sistem",
    icon: "\u2699",
    items: [
      { label: "Ayarlar", to: "/admin/settings" },
      { label: "Gorunurluk", to: "/admin/visibility" },
      { label: "Isler", to: "/admin/jobs" },
      { label: "Audit Log", to: "/admin/audit-logs" },
    ],
  },
  {
    id: "content",
    label: "Icerik Uretimi",
    icon: "\u270E",
    items: [
      { label: "Icerik Kutuphanesi", to: "/admin/library" },
      { label: "Varlik Kutuphanesi", to: "/admin/assets" },
      { label: "Standart Video", to: "/admin/standard-videos" },
      { label: "Video Wizard", to: "/admin/standard-videos/wizard" },
      { label: "Sablonlar", to: "/admin/templates" },
      { label: "Stil Sablonlari", to: "/admin/style-blueprints" },
      { label: "Sablon-Stil Baglantilari", to: "/admin/template-style-links" },
    ],
  },
  {
    id: "publish",
    label: "Yayin",
    icon: "\u25B6",
    items: [
      { label: "Yayin Merkezi", to: "/admin/publish" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "\u2261",
    items: [
      { label: "Analytics", to: "/admin/analytics" },
      { label: "YouTube Analytics", to: "/admin/analytics/youtube" },
    ],
  },
  {
    id: "news",
    label: "Haber",
    icon: "\u2139",
    items: [
      { label: "Kaynaklar", to: "/admin/sources" },
      { label: "Kaynak Taramalari", to: "/admin/source-scans" },
      { label: "Haber Bultenleri", to: "/admin/news-bulletins" },
      { label: "Haber Ogeler", to: "/admin/news-items" },
      { label: "Kullanilan Haberler", to: "/admin/used-news" },
    ],
  },
  {
    id: "appearance",
    label: "Gorunum",
    icon: "\u25D0",
    items: [
      { label: "Tema Yonetimi", to: "/admin/themes" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Horizon user navigation groups
// ---------------------------------------------------------------------------

export const HORIZON_USER_GROUPS: HorizonNavGroup[] = [
  {
    id: "home",
    label: "Anasayfa",
    icon: "\u25C9",
    items: [
      { label: "Anasayfa", to: "/user" },
    ],
  },
  {
    id: "content",
    label: "Icerik",
    icon: "\u270E",
    items: [
      { label: "Icerik", to: "/user/content" },
    ],
  },
  {
    id: "publish",
    label: "Yayin",
    icon: "\u25B6",
    items: [
      { label: "Yayin", to: "/user/publish" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Shared visibility map hook
// ---------------------------------------------------------------------------

/** All admin visibility keys used across layouts. */
const ADMIN_VISIBILITY_KEYS = [
  "panel:settings",
  "panel:visibility",
  "panel:templates",
  "panel:analytics",
  "panel:sources",
  "panel:publish",
] as const;

type AdminVisibilityKey = (typeof ADMIN_VISIBILITY_KEYS)[number];

export type AdminVisibilityMap = Record<AdminVisibilityKey, boolean>;

/**
 * Calls useVisibility once per admin visibility key (rules-of-hooks safe,
 * since the key list is static). Returns a map of key -> visible boolean.
 */
export function useAdminVisibilityMap(): AdminVisibilityMap {
  // Each call is unconditional and in stable order — hooks rules satisfied.
  const settings = useVisibility("panel:settings");
  const visibility = useVisibility("panel:visibility");
  const templates = useVisibility("panel:templates");
  const analytics = useVisibility("panel:analytics");
  const sources = useVisibility("panel:sources");
  const publish = useVisibility("panel:publish");

  return {
    "panel:settings": settings.visible,
    "panel:visibility": visibility.visible,
    "panel:templates": templates.visible,
    "panel:analytics": analytics.visible,
    "panel:sources": sources.visible,
    "panel:publish": publish.visible,
  };
}

// ---------------------------------------------------------------------------
// Filtered nav helpers (consume the visibility map)
// ---------------------------------------------------------------------------

/**
 * Filter classic admin nav items using the visibility map.
 * Items without a visibilityKey are always included.
 */
export function filterAdminNav(
  visibilityMap: AdminVisibilityMap,
): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => {
    if (!item.visibilityKey) return true;
    return visibilityMap[item.visibilityKey as AdminVisibilityKey] !== false;
  });
}

/**
 * Route-to-visibility-key mapping for Horizon admin groups.
 * Used to filter individual nav items within groups by route path.
 */
const ROUTE_VISIBILITY: Record<string, AdminVisibilityKey> = {
  "/admin/settings": "panel:settings",
  "/admin/visibility": "panel:visibility",
  "/admin/templates": "panel:templates",
  "/admin/analytics": "panel:analytics",
  "/admin/analytics/youtube": "panel:analytics",
  "/admin/sources": "panel:sources",
  "/admin/publish": "panel:publish",
};

/**
 * Filter Horizon admin groups using the visibility map.
 * Removes individual items whose route is guarded, then removes empty groups.
 */
export function filterHorizonAdminGroups(
  visibilityMap: AdminVisibilityMap,
): HorizonNavGroup[] {
  return HORIZON_ADMIN_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const key = ROUTE_VISIBILITY[item.to];
      if (!key) return true;
      return visibilityMap[key] !== false;
    }),
  })).filter((group) => group.items.length > 0);
}
