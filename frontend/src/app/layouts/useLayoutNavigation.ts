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
  /** If set, item is hidden when the module is disabled. */
  moduleId?: string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Genel Bakis", to: "/admin" },
  { label: "Sistem", section: true },
  { label: "Ayarlar", to: "/admin/settings", visibilityKey: "panel:settings" },
  { label: "Gorunurluk", to: "/admin/visibility", visibilityKey: "panel:visibility" },
  { label: "Wizard Ayarlari", to: "/admin/wizard-settings" },
  { label: "Isler", to: "/admin/jobs" },
  { label: "Audit Log", to: "/admin/audit-logs" },
  { label: "Moduller", to: "/admin/modules" },
  { label: "Saglayicilar", to: "/admin/providers" },
  { label: "Prompt Yonetimi", to: "/admin/prompts" },
  { label: "Icerik Uretimi", section: true },
  { label: "Icerik Kutuphanesi", to: "/admin/library" },
  { label: "Varlik Kutuphanesi", to: "/admin/assets" },
  { label: "Standart Video", to: "/admin/standard-videos", moduleId: "standard_video" },
  { label: "Video Wizard", to: "/admin/standard-videos/wizard", moduleId: "standard_video" },
  { label: "Sablonlar", to: "/admin/templates", visibilityKey: "panel:templates" },
  { label: "Stil Sablonlari", to: "/admin/style-blueprints" },
  { label: "Sablon-Stil Baglantilari", to: "/admin/template-style-links" },
  { label: "Yayin", section: true },
  { label: "Yayin Merkezi", to: "/admin/publish", visibilityKey: "panel:publish" },
  { label: "Etkilesim", section: true },
  { label: "Yorum Izleme", to: "/admin/comments" },
  { label: "Playlist Izleme", to: "/admin/playlists" },
  { label: "Gonderi Izleme", to: "/admin/posts" },
  { label: "Analytics", section: true },
  { label: "Analytics", to: "/admin/analytics", visibilityKey: "panel:analytics" },
  { label: "YouTube Analytics", to: "/admin/analytics/youtube" },
  { label: "Kanal Performansi", to: "/admin/analytics/channel-performance" },
  { label: "Haber", section: true },
  { label: "Kaynaklar", to: "/admin/sources", visibilityKey: "panel:sources" },
  { label: "Kaynak Taramalari", to: "/admin/source-scans" },
  { label: "Haber Bultenleri", to: "/admin/news-bulletins", moduleId: "news_bulletin" },
  { label: "Haber Ogeler", to: "/admin/news-items", moduleId: "news_bulletin" },
  { label: "Kullanilan Haberler", to: "/admin/used-news", moduleId: "news_bulletin" },
  { label: "Kullanicilar", section: true },
  { label: "Kullanici Yonetimi", to: "/admin/users" },
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
  { label: "Kanallarim", to: "/user/channels" },
  { label: "Projelerim", to: "/user/projects" },
  { label: "Video Olustur", to: "/user/create/video" },
  { label: "Bulten Olustur", to: "/user/create/bulletin" },
  { label: "Icerik", to: "/user/content" },
  { label: "Yayin", to: "/user/publish" },
  { label: "Yorumlar", to: "/user/comments" },
  { label: "Playlist'lerim", to: "/user/playlists" },
  { label: "Gonderilerim", to: "/user/posts" },
  { label: "Kanal Performansim", to: "/user/analytics/channels" },
  { label: "Ayarlarim", to: "/user/settings" },
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
      { label: "Wizard Ayarlari", to: "/admin/wizard-settings" },
      { label: "Isler", to: "/admin/jobs" },
      { label: "Audit Log", to: "/admin/audit-logs" },
      { label: "Moduller", to: "/admin/modules" },
      { label: "Saglayicilar", to: "/admin/providers" },
      { label: "Prompt Yonetimi", to: "/admin/prompts" },
      { label: "Kullanicilar", to: "/admin/users" },
    ],
  },
  {
    id: "content",
    label: "Icerik Uretimi",
    icon: "\u270E",
    items: [
      { label: "Icerik Kutuphanesi", to: "/admin/library" },
      { label: "Varlik Kutuphanesi", to: "/admin/assets" },
      { label: "Standart Video", to: "/admin/standard-videos", moduleId: "standard_video" },
      { label: "Video Wizard", to: "/admin/standard-videos/wizard", moduleId: "standard_video" },
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
    id: "engagement",
    label: "Etkilesim",
    icon: "\u2709",
    items: [
      { label: "Yorum Izleme", to: "/admin/comments" },
      { label: "Playlist Izleme", to: "/admin/playlists" },
      { label: "Gonderi Izleme", to: "/admin/posts" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "\u2261",
    items: [
      { label: "Analytics", to: "/admin/analytics" },
      { label: "YouTube Analytics", to: "/admin/analytics/youtube" },
      { label: "Kanal Performansi", to: "/admin/analytics/channel-performance" },
    ],
  },
  {
    id: "news",
    label: "Haber",
    icon: "\u2139",
    items: [
      { label: "Kaynaklar", to: "/admin/sources" },
      { label: "Kaynak Taramalari", to: "/admin/source-scans" },
      { label: "Haber Bultenleri", to: "/admin/news-bulletins", moduleId: "news_bulletin" },
      { label: "Haber Ogeler", to: "/admin/news-items", moduleId: "news_bulletin" },
      { label: "Kullanilan Haberler", to: "/admin/used-news", moduleId: "news_bulletin" },
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
    id: "channels",
    label: "Kanallarim",
    icon: "\u2261",
    items: [
      { label: "Kanallarim", to: "/user/channels" },
    ],
  },
  {
    id: "projects",
    label: "Projelerim",
    icon: "\u270E",
    items: [
      { label: "Projelerim", to: "/user/projects" },
    ],
  },
  {
    id: "create",
    label: "Olustur",
    icon: "\u2795",
    items: [
      { label: "Video Olustur", to: "/user/create/video" },
      { label: "Bulten Olustur", to: "/user/create/bulletin" },
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
  {
    id: "engagement",
    label: "Etkilesim",
    icon: "\u2709",
    items: [
      { label: "Yorumlar", to: "/user/comments" },
      { label: "Playlist'lerim", to: "/user/playlists" },
      { label: "Gonderilerim", to: "/user/posts" },
      { label: "Kanal Performansim", to: "/user/analytics/channels" },
    ],
  },
  {
    id: "settings",
    label: "Ayarlarim",
    icon: "\u2699",
    items: [
      { label: "Ayarlarim", to: "/user/settings" },
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
 * Filter classic admin nav items using the visibility map and module enabled map.
 * Items without a visibilityKey or moduleId are always included.
 */
export function filterAdminNav(
  visibilityMap: AdminVisibilityMap,
  moduleEnabledMap?: Record<string, boolean>,
): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => {
    if (item.visibilityKey && visibilityMap[item.visibilityKey as AdminVisibilityKey] === false) {
      return false;
    }
    if (item.moduleId && moduleEnabledMap && moduleEnabledMap[item.moduleId] === false) {
      return false;
    }
    return true;
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
  "/admin/analytics/channel-performance": "panel:analytics",
  "/admin/sources": "panel:sources",
  "/admin/publish": "panel:publish",
};

/**
 * Filter Horizon admin groups using the visibility map and module enabled map.
 * Removes individual items whose route is guarded or module is disabled,
 * then removes empty groups.
 */
export function filterHorizonAdminGroups(
  visibilityMap: AdminVisibilityMap,
  moduleEnabledMap?: Record<string, boolean>,
): HorizonNavGroup[] {
  return HORIZON_ADMIN_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const key = ROUTE_VISIBILITY[item.to];
      if (key && visibilityMap[key] === false) return false;
      if (item.moduleId && moduleEnabledMap && moduleEnabledMap[item.moduleId] === false) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);
}
