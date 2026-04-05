/**
 * Contextual Commands — route-specific commands for the command palette.
 *
 * These commands only appear when the user is on the matching route.
 * They dispatch actions via the pub/sub system so pages can handle them.
 */

import type { Command } from "../stores/commandPaletteStore";
import { dispatchAction } from "../hooks/useContextualActions";

// ---------------------------------------------------------------------------
// Action IDs — shared between commands and page listeners
// ---------------------------------------------------------------------------

export const ContextualActionIds = {
  // Jobs page
  JOBS_FILTER_FAILED: "jobs:filter-failed",
  JOBS_FILTER_COMPLETED: "jobs:filter-completed",
  JOBS_FILTER_QUEUED: "jobs:filter-queued",

  // Library page
  LIBRARY_FILTER_STANDARD_VIDEO: "library:filter-standard-video",
  LIBRARY_FILTER_NEWS_BULLETIN: "library:filter-news-bulletin",
  LIBRARY_CLEAR_FILTERS: "library:clear-filters",

  // Settings page
  SETTINGS_FOCUS_SEARCH: "settings:focus-search",

  // Sources page
  SOURCES_FILTER_RSS: "sources:filter-rss",
  SOURCES_FILTER_ACTIVE: "sources:filter-active",
} as const;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildContextualCommands(
  navigate: (path: string) => void
): Command[] {
  return [
    // -- Jobs page commands --
    {
      id: "ctx:jobs-filter-failed",
      label: "Hatali isleri goster",
      category: "action",
      icon: "❌",
      description: "Is listesini hatali duruma filtrele",
      keywords: ["failed", "hatali", "hata", "basarisiz"],
      contextRoutes: ["/admin/jobs"],
      action: () => dispatchAction(ContextualActionIds.JOBS_FILTER_FAILED),
    },
    {
      id: "ctx:jobs-filter-completed",
      label: "Tamamlanan isleri goster",
      category: "action",
      icon: "✅",
      description: "Is listesini tamamlanan duruma filtrele",
      keywords: ["completed", "tamamlanan", "biten", "basarili"],
      contextRoutes: ["/admin/jobs"],
      action: () => dispatchAction(ContextualActionIds.JOBS_FILTER_COMPLETED),
    },
    {
      id: "ctx:jobs-filter-queued",
      label: "Kuyrukta bekleyenleri goster",
      category: "action",
      icon: "⏳",
      description: "Is listesini kuyrukta bekleyen duruma filtrele",
      keywords: ["queued", "kuyruk", "bekleyen", "sirada"],
      contextRoutes: ["/admin/jobs"],
      action: () => dispatchAction(ContextualActionIds.JOBS_FILTER_QUEUED),
    },

    // -- Library page commands --
    {
      id: "ctx:library-filter-standard-video",
      label: "Sadece Standard Video",
      category: "action",
      icon: "🎬",
      description: "Icerik turunu standart video olarak filtrele",
      keywords: ["standard", "video", "standart", "filtre"],
      contextRoutes: ["/admin/library"],
      action: () =>
        dispatchAction(ContextualActionIds.LIBRARY_FILTER_STANDARD_VIDEO),
    },
    {
      id: "ctx:library-filter-news-bulletin",
      label: "Sadece News Bulletin",
      category: "action",
      icon: "📰",
      description: "Icerik turunu haber bulteni olarak filtrele",
      keywords: ["news", "bulletin", "haber", "bulten", "filtre"],
      contextRoutes: ["/admin/library"],
      action: () =>
        dispatchAction(ContextualActionIds.LIBRARY_FILTER_NEWS_BULLETIN),
    },
    {
      id: "ctx:library-clear-filters",
      label: "Filtreleri temizle",
      category: "action",
      icon: "🧹",
      description: "Tum icerik filtrelerini sifirla",
      keywords: ["clear", "temizle", "sifirla", "filtre", "reset"],
      contextRoutes: ["/admin/library"],
      action: () => dispatchAction(ContextualActionIds.LIBRARY_CLEAR_FILTERS),
    },

    // -- Settings page commands --
    {
      id: "ctx:settings-focus-search",
      label: "Arama alanina odaklan",
      category: "action",
      icon: "🔍",
      description: "Ayarlar arama kutusuna odaklan",
      keywords: ["search", "arama", "odak", "focus", "bul"],
      contextRoutes: ["/admin/settings"],
      action: () => dispatchAction(ContextualActionIds.SETTINGS_FOCUS_SEARCH),
    },
    {
      id: "ctx:settings-goto-themes",
      label: "Tema Yonetimine git",
      category: "navigation",
      icon: "🎨",
      description: "Tema yonetim sayfasina git",
      keywords: ["theme", "tema", "gorunum"],
      contextRoutes: ["/admin/settings"],
      action: () => navigate("/admin/themes"),
    },

    // -- Sources page commands --
    {
      id: "ctx:sources-filter-rss",
      label: "Sadece RSS kaynaklari",
      category: "action",
      icon: "📡",
      description: "Kaynak listesini RSS turune filtrele",
      keywords: ["rss", "kaynak", "filtre", "tur"],
      contextRoutes: ["/admin/sources"],
      action: () => dispatchAction(ContextualActionIds.SOURCES_FILTER_RSS),
    },
    {
      id: "ctx:sources-filter-active",
      label: "Sadece aktif kaynaklar",
      category: "action",
      icon: "🟢",
      description: "Kaynak listesini aktif duruma filtrele",
      keywords: ["active", "aktif", "kaynak", "filtre", "durum"],
      contextRoutes: ["/admin/sources"],
      action: () => dispatchAction(ContextualActionIds.SOURCES_FILTER_ACTIVE),
    },
  ];
}
