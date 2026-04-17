/**
 * useLayoutNavigation — Shared navigation definitions and visibility filtering
 * for Classic and Horizon admin/user layouts.
 *
 * Consolidates repeated useVisibility() calls into a single useVisibilityMap()
 * pattern and exports navigation definitions consumed by both layout variants.
 *
 * Redesign REV-2 / P2.1 (2026-04-18) — nav yeniden gruplandırma:
 *   - Admin: 9 bölüm / 32 → 7 bölüm / 27 görünür giriş.
 *     • "Scope" yeni: "Kullanıcı Yönetimi" AdminScopeSwitcher'ın kaynak
 *        sayfası olarak buraya taşındı.
 *     • "Yayın & Takvim" birleşik bölüm (eski "Yayın" genişletildi,
 *        `/admin/calendar` unified).
 *     • Kaldırılan (sayfa duruyor, sadece nav'dan): "Video Wizard"
 *        (Standart Video içine action button), "Şablon-Stil Bağlantıları"
 *        (template detail tab), "Kullanılan Haberler" (news-items tab),
 *        "YouTube Analytics" (Analytics Merkezi tab).
 *   - User: 12 düz giriş → 6 bölüm / 15 görünür giriş.
 *     • Horizon + Classic aynı gruba oturtuldu (R3 §3 tutarlılık hedefi).
 *     • Yeni: Otomasyonlarım, Bağlantılarım, Gelen Kutusu (Classic'te
 *        yoktu — Horizon ile standardize).
 *     • Kaldırılan nav girişleri (sayfa duruyor): "Kanal Performansım"
 *        (Analitik tab), "YouTube Analitikleri" (Analitik tab),
 *        "Playlist'lerim" (kanal detay tab — R3 §3.2).
 *
 * Kaynak: `docs/redesign/R3_information_architecture.md` §2.1, §3.1.
 */

import { useVisibility } from "../../hooks/useVisibility";

// ---------------------------------------------------------------------------
// Admin navigation definitions (Classic / flat sidebar)
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
  { label: "Bugün", section: true },
  { label: "Genel Bakış", to: "/admin" },

  { label: "Scope", section: true },
  { label: "Kullanıcı Yönetimi", to: "/admin/users" },

  { label: "Sistem", section: true },
  { label: "Ayarlar", to: "/admin/settings", visibilityKey: "panel:settings" },
  { label: "Görünürlük", to: "/admin/visibility", visibilityKey: "panel:visibility" },
  { label: "Wizard Ayarları", to: "/admin/wizard-settings" },
  { label: "İşler", to: "/admin/jobs" },
  { label: "Audit Log", to: "/admin/audit-logs" },
  { label: "Modüller", to: "/admin/modules" },
  { label: "Sağlayıcılar", to: "/admin/providers" },
  { label: "Prompt Yönetimi", to: "/admin/prompts" },

  { label: "Üretim", section: true },
  { label: "İçerik Kütüphanesi", to: "/admin/library" },
  { label: "Varlık Kütüphanesi", to: "/admin/assets" },
  { label: "Standart Video", to: "/admin/standard-videos", moduleId: "standard_video" },
  { label: "Haber Bültenleri", to: "/admin/news-bulletins", moduleId: "news_bulletin" },
  { label: "Şablonlar", to: "/admin/templates", visibilityKey: "panel:templates" },
  { label: "Stil Şablonları", to: "/admin/style-blueprints" },

  { label: "Yayın & Takvim", section: true },
  { label: "Yayın Merkezi", to: "/admin/publish", visibilityKey: "panel:publish" },
  { label: "Takvim", to: "/admin/calendar", visibilityKey: "panel:calendar" },

  { label: "Etkileşim", section: true },
  { label: "Yorum İzleme", to: "/admin/comments" },
  { label: "Playlist İzleme", to: "/admin/playlists" },
  { label: "Gönderi İzleme", to: "/admin/posts" },

  { label: "Analytics", section: true },
  { label: "Analytics Merkezi", to: "/admin/analytics", visibilityKey: "panel:analytics" },
  { label: "Kanal Performansı", to: "/admin/analytics/channel-performance" },

  { label: "Haber", section: true },
  { label: "Kaynaklar", to: "/admin/sources", visibilityKey: "panel:sources" },
  { label: "Kaynak Taramaları", to: "/admin/source-scans" },
  { label: "Haber Öğeleri", to: "/admin/news-items", moduleId: "news_bulletin" },

  { label: "Görünüm", section: true },
  { label: "Tema Yönetimi", to: "/admin/themes" },
];

// ---------------------------------------------------------------------------
// User navigation definitions
// ---------------------------------------------------------------------------

export interface UserNavItem {
  label: string;
  to?: string;
  section?: boolean;
  /** If set, item is hidden when the module is disabled. */
  moduleId?: string;
}

export const USER_NAV: UserNavItem[] = [
  { label: "Bugün", section: true },
  { label: "Anasayfa", to: "/user" },

  { label: "Üretim", section: true },
  { label: "Projelerim", to: "/user/projects" },
  { label: "Video Oluştur", to: "/user/create/video", moduleId: "standard_video" },
  { label: "Bülten Oluştur", to: "/user/create/bulletin", moduleId: "news_bulletin" },

  { label: "Yayın", section: true },
  { label: "Yayın", to: "/user/publish" },
  { label: "Takvim", to: "/user/calendar" },
  { label: "İçerik", to: "/user/content" },

  { label: "Kanallar", section: true },
  { label: "Kanallarım", to: "/user/channels" },
  { label: "Bağlantılarım", to: "/user/connections" },
  { label: "Otomasyonlarım", to: "/user/automation" },

  { label: "Etkileşim", section: true },
  { label: "Gelen Kutusu", to: "/user/inbox" },
  { label: "Yorumlar", to: "/user/comments" },
  { label: "Gönderilerim", to: "/user/posts" },

  { label: "Analitik", section: true },
  { label: "Analizim", to: "/user/analytics" },

  { label: "Ayarlar", section: true },
  { label: "Ayarlarım", to: "/user/settings" },
];

// ---------------------------------------------------------------------------
// Horizon admin navigation groups (structured for icon rail)
// ---------------------------------------------------------------------------

import type { HorizonNavGroup } from "../../components/layout/HorizonSidebar";

export const HORIZON_ADMIN_GROUPS: HorizonNavGroup[] = [
  {
    id: "today",
    label: "Bugün",
    icon: "\u25C9",
    items: [
      { label: "Genel Bakış", to: "/admin" },
    ],
  },
  {
    id: "scope",
    label: "Scope",
    icon: "\u2605",
    items: [
      { label: "Kullanıcı Yönetimi", to: "/admin/users" },
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
    ],
  },
  {
    id: "content",
    label: "Üretim",
    icon: "\u270E",
    items: [
      { label: "İçerik Kütüphanesi", to: "/admin/library" },
      { label: "Varlık Kütüphanesi", to: "/admin/assets" },
      { label: "Standart Video", to: "/admin/standard-videos", moduleId: "standard_video" },
      { label: "Haber Bültenleri", to: "/admin/news-bulletins", moduleId: "news_bulletin" },
      { label: "Şablonlar", to: "/admin/templates" },
      { label: "Stil Şablonları", to: "/admin/style-blueprints" },
    ],
  },
  {
    id: "publish",
    label: "Yayın & Takvim",
    icon: "\u25B6",
    items: [
      { label: "Yayın Merkezi", to: "/admin/publish" },
      { label: "Takvim", to: "/admin/calendar" },
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
      { label: "Analytics Merkezi", to: "/admin/analytics" },
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
      { label: "Haber Öğeleri", to: "/admin/news-items", moduleId: "news_bulletin" },
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
    id: "today",
    label: "Bugün",
    icon: "\u25C9",
    items: [
      { label: "Anasayfa", to: "/user" },
    ],
  },
  {
    id: "production",
    label: "Üretim",
    icon: "\u270E",
    items: [
      { label: "Projelerim", to: "/user/projects" },
      { label: "Video Oluştur", to: "/user/create/video", moduleId: "standard_video" },
      { label: "Bülten Oluştur", to: "/user/create/bulletin", moduleId: "news_bulletin" },
    ],
  },
  {
    id: "publish",
    label: "Yayın",
    icon: "\u25B6",
    items: [
      { label: "Yayın", to: "/user/publish" },
      { label: "Takvim", to: "/user/calendar" },
      { label: "İçerik", to: "/user/content" },
    ],
  },
  {
    id: "channels",
    label: "Kanallar",
    icon: "\u2261",
    items: [
      { label: "Kanallarım", to: "/user/channels" },
      { label: "Bağlantılarım", to: "/user/connections" },
      { label: "Otomasyonlarım", to: "/user/automation" },
    ],
  },
  {
    id: "engagement",
    label: "Etkileşim",
    icon: "\u2709",
    items: [
      { label: "Gelen Kutusu", to: "/user/inbox" },
      { label: "Yorumlar", to: "/user/comments" },
      { label: "Gönderilerim", to: "/user/posts" },
    ],
  },
  {
    id: "analytics",
    label: "Analitik",
    icon: "\u2263",
    items: [
      { label: "Analizim", to: "/user/analytics" },
    ],
  },
  {
    id: "settings",
    label: "Ayarlar",
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
  "panel:calendar",
] as const;

type AdminVisibilityKey = (typeof ADMIN_VISIBILITY_KEYS)[number];

export type AdminVisibilityMap = Record<AdminVisibilityKey, boolean>;

/**
 * Calls useVisibility once per admin visibility key (rules-of-hooks safe,
 * since the key list is static). Returns a map of key -> visible boolean.
 *
 * Note — `panel:calendar` (P2.1): yeni key; visibility registry'de tanımlı
 * değilse `useVisibility` default true dönüyor (mevcut sözleşme). Admin
 * isterse `/admin/visibility` üzerinden kapatabilir. Sayfa rotası her
 * halükârda canlı — sadece nav görünürlüğü gate'li.
 */
export function useAdminVisibilityMap(): AdminVisibilityMap {
  // Each call is unconditional and in stable order — hooks rules satisfied.
  const settings = useVisibility("panel:settings");
  const visibility = useVisibility("panel:visibility");
  const templates = useVisibility("panel:templates");
  const analytics = useVisibility("panel:analytics");
  const sources = useVisibility("panel:sources");
  const publish = useVisibility("panel:publish");
  const calendar = useVisibility("panel:calendar");

  return {
    "panel:settings": settings.visible,
    "panel:visibility": visibility.visible,
    "panel:templates": templates.visible,
    "panel:analytics": analytics.visible,
    "panel:sources": sources.visible,
    "panel:publish": publish.visible,
    "panel:calendar": calendar.visible,
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
 *
 * P2.1: `/admin/calendar` yeni route ile `panel:calendar` eklendi; kaldırılan
 * nav girişlerinin rotaları tabloda tutulmadı (zaten nav'da yoklar).
 */
const ROUTE_VISIBILITY: Record<string, AdminVisibilityKey> = {
  "/admin/settings": "panel:settings",
  "/admin/visibility": "panel:visibility",
  "/admin/templates": "panel:templates",
  "/admin/analytics": "panel:analytics",
  "/admin/analytics/channel-performance": "panel:analytics",
  "/admin/sources": "panel:sources",
  "/admin/publish": "panel:publish",
  "/admin/calendar": "panel:calendar",
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

/**
 * Filter Horizon user groups using the module enabled map.
 * User-side nav has no visibility keys currently, but module toggles
 * (e.g. module.standard_video.enabled) must still prune the "Create video"
 * entry and similar module-gated items. Empty groups are dropped.
 */
export function filterHorizonUserGroups(
  moduleEnabledMap?: Record<string, boolean>,
): HorizonNavGroup[] {
  return HORIZON_USER_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.moduleId && moduleEnabledMap && moduleEnabledMap[item.moduleId] === false) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);
}
