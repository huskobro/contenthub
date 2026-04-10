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
  { label: "Genel Bakış", to: "/admin" },
  { label: "Sistem", section: true },
  { label: "Ayarlar", to: "/admin/settings", visibilityKey: "panel:settings" },
  { label: "Görünürlük", to: "/admin/visibility", visibilityKey: "panel:visibility" },
  { label: "Wizard Ayarları", to: "/admin/wizard-settings" },
  { label: "İşler", to: "/admin/jobs" },
  { label: "Audit Log", to: "/admin/audit-logs" },
  { label: "Modüller", to: "/admin/modules" },
  { label: "Sağlayıcılar", to: "/admin/providers" },
  { label: "Prompt Yönetimi", to: "/admin/prompts" },
  { label: "İçerik Üretimi", section: true },
  { label: "İçerik Kütüphanesi", to: "/admin/library" },
  { label: "Varlık Kütüphanesi", to: "/admin/assets" },
  { label: "Standart Video", to: "/admin/standard-videos", moduleId: "standard_video" },
  { label: "Video Wizard", to: "/admin/standard-videos/wizard", moduleId: "standard_video" },
  { label: "Şablonlar", to: "/admin/templates", visibilityKey: "panel:templates" },
  { label: "Stil Şablonları", to: "/admin/style-blueprints" },
  { label: "Şablon-Stil Bağlantıları", to: "/admin/template-style-links" },
  { label: "Yayın", section: true },
  { label: "Yayın Merkezi", to: "/admin/publish", visibilityKey: "panel:publish" },
  { label: "Etkileşim", section: true },
  { label: "Yorum İzleme", to: "/admin/comments" },
  { label: "Playlist İzleme", to: "/admin/playlists" },
  { label: "Gönderi İzleme", to: "/admin/posts" },
  { label: "Analytics", section: true },
  { label: "Analytics", to: "/admin/analytics", visibilityKey: "panel:analytics" },
  { label: "YouTube Analytics", to: "/admin/analytics/youtube" },
  { label: "Kanal Performansı", to: "/admin/analytics/channel-performance" },
  { label: "Haber", section: true },
  { label: "Kaynaklar", to: "/admin/sources", visibilityKey: "panel:sources" },
  { label: "Kaynak Taramaları", to: "/admin/source-scans" },
  { label: "Haber Bültenleri", to: "/admin/news-bulletins", moduleId: "news_bulletin" },
  { label: "Haber Öğeleri", to: "/admin/news-items", moduleId: "news_bulletin" },
  { label: "Kullanılan Haberler", to: "/admin/used-news", moduleId: "news_bulletin" },
  { label: "Kullanıcılar", section: true },
  { label: "Kullanıcı Yönetimi", to: "/admin/users" },
  { label: "Görünüm", section: true },
  { label: "Tema Yönetimi", to: "/admin/themes" },
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
  { label: "Kanallarım", to: "/user/channels" },
  { label: "Projelerim", to: "/user/projects" },
  { label: "Video Oluştur", to: "/user/create/video" },
  { label: "Bülten Oluştur", to: "/user/create/bulletin" },
  { label: "İçerik", to: "/user/content" },
  { label: "Yayın", to: "/user/publish" },
  { label: "Yorumlar", to: "/user/comments" },
  { label: "Playlist'lerim", to: "/user/playlists" },
  { label: "Gönderilerim", to: "/user/posts" },
  { label: "Kanal Performansım", to: "/user/analytics/channels" },
  { label: "Ayarlarım", to: "/user/settings" },
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
      { label: "Genel Bakış", to: "/admin" },
    ],
  },
  {
    id: "system",
    label: "Sistem",
    icon: "\u2699",
    items: [
      { label: "Ayarlar", to: "/admin/settings" },
      { label: "Görünürlük", to: "/admin/visibility" },
      { label: "Wizard Ayarları", to: "/admin/wizard-settings" },
      { label: "İşler", to: "/admin/jobs" },
      { label: "Audit Log", to: "/admin/audit-logs" },
      { label: "Modüller", to: "/admin/modules" },
      { label: "Sağlayıcılar", to: "/admin/providers" },
      { label: "Prompt Yönetimi", to: "/admin/prompts" },
      { label: "Kullanıcılar", to: "/admin/users" },
    ],
  },
  {
    id: "content",
    label: "İçerik Üretimi",
    icon: "\u270E",
    items: [
      { label: "İçerik Kütüphanesi", to: "/admin/library" },
      { label: "Varlık Kütüphanesi", to: "/admin/assets" },
      { label: "Standart Video", to: "/admin/standard-videos", moduleId: "standard_video" },
      { label: "Video Wizard", to: "/admin/standard-videos/wizard", moduleId: "standard_video" },
      { label: "Şablonlar", to: "/admin/templates" },
      { label: "Stil Şablonları", to: "/admin/style-blueprints" },
      { label: "Şablon-Stil Bağlantıları", to: "/admin/template-style-links" },
    ],
  },
  {
    id: "publish",
    label: "Yayın",
    icon: "\u25B6",
    items: [
      { label: "Yayın Merkezi", to: "/admin/publish" },
    ],
  },
  {
    id: "engagement",
    label: "Etkileşim",
    icon: "\u2709",
    items: [
      { label: "Yorum İzleme", to: "/admin/comments" },
      { label: "Playlist İzleme", to: "/admin/playlists" },
      { label: "Gönderi İzleme", to: "/admin/posts" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "\u2261",
    items: [
      { label: "Analytics", to: "/admin/analytics" },
      { label: "YouTube Analytics", to: "/admin/analytics/youtube" },
      { label: "Kanal Performansı", to: "/admin/analytics/channel-performance" },
    ],
  },
  {
    id: "news",
    label: "Haber",
    icon: "\u2139",
    items: [
      { label: "Kaynaklar", to: "/admin/sources" },
      { label: "Kaynak Taramaları", to: "/admin/source-scans" },
      { label: "Haber Bültenleri", to: "/admin/news-bulletins", moduleId: "news_bulletin" },
      { label: "Haber Öğeleri", to: "/admin/news-items", moduleId: "news_bulletin" },
      { label: "Kullanılan Haberler", to: "/admin/used-news", moduleId: "news_bulletin" },
    ],
  },
  {
    id: "appearance",
    label: "Görünüm",
    icon: "\u25D0",
    items: [
      { label: "Tema Yönetimi", to: "/admin/themes" },
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
    label: "Kanallarım",
    icon: "\u2261",
    items: [
      { label: "Kanallarım", to: "/user/channels" },
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
    label: "Oluştur",
    icon: "\u2795",
    items: [
      { label: "Video Oluştur", to: "/user/create/video" },
      { label: "Bülten Oluştur", to: "/user/create/bulletin" },
    ],
  },
  {
    id: "content",
    label: "İçerik",
    icon: "\u270E",
    items: [
      { label: "İçerik", to: "/user/content" },
    ],
  },
  {
    id: "publish",
    label: "Yayın",
    icon: "\u25B6",
    items: [
      { label: "Yayın", to: "/user/publish" },
    ],
  },
  {
    id: "engagement",
    label: "Etkileşim",
    icon: "\u2709",
    items: [
      { label: "Yorumlar", to: "/user/comments" },
      { label: "Playlist'lerim", to: "/user/playlists" },
      { label: "Gönderilerim", to: "/user/posts" },
      { label: "Kanal Performansım", to: "/user/analytics/channels" },
    ],
  },
  {
    id: "settings",
    label: "Ayarlarım",
    icon: "\u2699",
    items: [
      { label: "Ayarlarım", to: "/user/settings" },
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
