/**
 * User Command Registry — Command palette commands for the user panel.
 *
 * Navigation and action commands scoped to user-facing routes.
 */

import type { Command } from "../stores/commandPaletteStore";

/**
 * Build user navigation commands.
 */
export function buildUserNavigationCommands(navigate: (path: string) => void): Command[] {
  return [
    {
      id: "nav:user-dashboard",
      label: "Anasayfa",
      category: "navigation",
      icon: "🏠",
      description: "Kullanici ana sayfasi",
      keywords: ["dashboard", "home", "anasayfa"],
      action: () => navigate("/user"),
    },
    {
      id: "nav:user-channels",
      label: "Kanallarim",
      category: "navigation",
      icon: "📺",
      description: "Kanal profilleri",
      keywords: ["channel", "kanal", "profil"],
      action: () => navigate("/user/channels"),
    },
    {
      id: "nav:user-projects",
      label: "Projelerim",
      category: "navigation",
      icon: "📁",
      description: "Icerik projeleri",
      keywords: ["project", "proje", "icerik"],
      action: () => navigate("/user/projects"),
    },
    {
      id: "nav:user-content",
      label: "Icerik Olustur",
      category: "navigation",
      icon: "✏️",
      description: "Yeni icerik olusturma",
      keywords: ["content", "create", "icerik", "olustur"],
      action: () => navigate("/user/content"),
    },
    {
      id: "nav:user-publish",
      label: "Yayinlama",
      category: "navigation",
      icon: "🚀",
      description: "Yayinlama merkezi",
      keywords: ["publish", "yayinla", "yayin"],
      action: () => navigate("/user/publish"),
    },
    {
      id: "nav:user-comments",
      label: "Yorumlar",
      category: "navigation",
      icon: "💬",
      description: "Kanal yorumlari",
      keywords: ["comment", "yorum", "yanit"],
      action: () => navigate("/user/comments"),
    },
    {
      id: "nav:user-playlists",
      label: "Playlist'ler",
      category: "navigation",
      icon: "📋",
      description: "YouTube playlist yonetimi",
      keywords: ["playlist", "liste", "video"],
      action: () => navigate("/user/playlists"),
    },
    {
      id: "nav:user-posts",
      label: "Postlar",
      category: "navigation",
      icon: "📝",
      description: "Topluluk postlari",
      keywords: ["post", "community", "topluluk"],
      action: () => navigate("/user/posts"),
    },
    {
      id: "nav:user-analytics",
      label: "Analytics",
      category: "navigation",
      icon: "📊",
      description: "Icerik istatistikleri",
      keywords: ["analytics", "istatistik", "rapor"],
      action: () => navigate("/user/analytics"),
    },
    {
      id: "nav:user-channel-analytics",
      label: "Kanal Analytics",
      category: "navigation",
      icon: "📈",
      description: "Kanal bazli istatistikler",
      keywords: ["channel", "analytics", "kanal", "istatistik"],
      action: () => navigate("/user/analytics/channels"),
    },
    {
      id: "nav:user-automation",
      label: "Otomasyon",
      category: "navigation",
      icon: "⚡",
      description: "Otomasyon kurallari",
      keywords: ["automation", "otomasyon", "kural", "otomatik"],
      action: () => navigate("/user/automation"),
    },
    {
      id: "nav:user-inbox",
      label: "Gelen Kutusu",
      category: "navigation",
      icon: "📥",
      description: "Operasyon bildirimleri",
      keywords: ["inbox", "gelen", "kutu", "bildirim"],
      action: () => navigate("/user/inbox"),
    },
    {
      id: "nav:user-calendar",
      label: "Takvim",
      category: "navigation",
      icon: "📅",
      description: "Icerik takvimi",
      keywords: ["calendar", "takvim", "plan", "zamanlama"],
      action: () => navigate("/user/calendar"),
    },
    {
      id: "nav:user-connections",
      label: "Baglantilar",
      category: "navigation",
      icon: "🔗",
      description: "Platform baglantilari",
      keywords: ["connection", "baglanti", "platform", "youtube"],
      action: () => navigate("/user/connections"),
    },
    {
      id: "nav:user-settings",
      label: "Ayarlar",
      category: "navigation",
      icon: "⚙️",
      description: "Kullanici ayarlari",
      keywords: ["settings", "ayar", "tercih"],
      action: () => navigate("/user/settings"),
    },
  ];
}

/**
 * Build user quick-action commands.
 */
export function buildUserActionCommands(navigate: (path: string) => void): Command[] {
  return [
    {
      id: "action:create-video-wizard",
      label: "Yeni Video Olustur",
      category: "action",
      icon: "🎬",
      description: "Wizard ile yeni video olustur",
      keywords: ["create", "new", "yeni", "video", "olustur", "wizard"],
      moduleId: "standard_video",
      action: () => navigate("/user/create/video"),
    },
    {
      id: "action:create-bulletin-wizard",
      label: "Yeni Haber Bulteni",
      category: "action",
      icon: "📰",
      description: "Wizard ile yeni haber bulteni olustur",
      keywords: ["create", "new", "yeni", "bulten", "bulletin", "haber", "olustur"],
      moduleId: "news_bulletin",
      action: () => navigate("/user/create/bulletin"),
    },
    {
      id: "action:goto-admin",
      label: "Yonetim Paneline Gec",
      category: "action",
      icon: "🔧",
      description: "Admin paneline gecis yap",
      keywords: ["admin", "yonetim", "panel", "gec", "switch"],
      action: () => navigate("/admin"),
    },
  ];
}
